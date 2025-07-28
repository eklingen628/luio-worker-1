import { executeQuery } from './db';
import { UserToken } from './types';
import { FitBitUserIDData } from './types';

export async function insertUserData(data: UserToken): Promise<Response | null> {

	const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();

	await executeQuery(			
		`INSERT INTO fitbit_users (user_id, access_token, refresh_token, expires_at, token_type, scope) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		ON CONFLICT (user_id) 
		DO UPDATE SET 
			access_token = EXCLUDED.access_token, 
			refresh_token = EXCLUDED.refresh_token, 
			expires_at = EXCLUDED.expires_at, 
			token_type = EXCLUDED.token_type, 
			scope = EXCLUDED.scope`,
		[data.user_id, data.access_token, data.refresh_token, expires_at, data.token_type, data.scope])
	

	return null;
}

export async function getAllUserData(): Promise<FitBitUserIDData[] | null> {
	const result = await executeQuery('SELECT * FROM fitbit_users', []);

	if (result.rowCount === 0) {
		console.log({
			source: 'pool-select',
			message: "No users found",
		});
		return null;
	}

	return result.rows ?? [];
}


export async function getOneUserData(userId: string): Promise<FitBitUserIDData | null> {
	const result = await executeQuery('SELECT * FROM fitbit_users WHERE user_id = $1', [userId]);

	if (result.rowCount === 0) {
		console.log({
			source: 'pool-select',
			message: "No user found",
		});
		return null;
	}

	return result.rows[0] as FitBitUserIDData;
}