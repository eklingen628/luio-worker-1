import crypto from 'crypto';

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
