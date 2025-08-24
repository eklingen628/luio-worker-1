import crypto from 'crypto';
import { executeQuery } from '../db/connection';

type VerifierResult = {
	code_verifier: string
}

export async function generatePKCE() {
	const verifierString = crypto.randomBytes(48).toString('base64url');

	const challengeString = crypto
		.createHash('sha256')
		.update(verifierString)
		.digest('base64url');

	return {
		code_verifier: verifierString,
		code_challenge: challengeString,
	};
}


export async function insertState(state: string, code_verifier: string) {
	try {
		await executeQuery(
			'insert into oauth_state(state, code_verifier) values ($1,$2)', 
			[state, code_verifier]
		  );
	} catch (error) {
		console.error('Error inserting state:', error);
		throw error;
	}	

}


export async function getVerifierString(state: string): Promise<string | null> {
	try {
		const result = await executeQuery<VerifierResult>(
			`DELETE FROM oauth_state 
			WHERE state = $1 
			AND created_at > NOW() - INTERVAL '10 minutes'
			RETURNING code_verifier`, 
			[state]
		)
		if (result.rowCount === 0) {
			console.log({
				source: 'pool-delete-from-state',
				message: "No state found or state expired",
			});
			return null;
		}
		return result.rows[0]?.code_verifier;
	} catch (error) {
		console.error('Error getting verifier:', error);
		throw error;
	}
}



