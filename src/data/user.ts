import { executeQuery } from '../db/connection';
import { UserToken, FitBitUserIDData } from '../types';
import { PoolClient } from 'pg';
import logger from '../logger/logger';

export async function insertUserData(data: UserToken, client?: PoolClient): Promise<null> {

	const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();

	try {
		if (client) {
			await client.query(			
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
		} else {
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
		}
	} catch (error) {
		console.error('Error inserting user data:', error);
		throw error;
	}	

	return null;

}

export async function getAllUserData(): Promise<FitBitUserIDData[] | null> {
	const result = await executeQuery<FitBitUserIDData>('SELECT * FROM fitbit_users', []);

	if (result.rowCount === 0) {
		logger.info({
			source: 'pool-select',
			message: "No users found",
		});
		return null;
	}

	return result.rows ?? [];
}


export async function getOneUserData(userId: string, client?: PoolClient): Promise<FitBitUserIDData | null> {

	try {
		let result;
		if (client) {
			result = await client.query('SELECT * FROM fitbit_users WHERE user_id = $1', [userId]);
		} else {
			result = await executeQuery('SELECT * FROM fitbit_users WHERE user_id = $1', [userId]);
		}
		
		if (result.rowCount === 0) {
			logger.info({
				source: 'pool-select',
				message: "No user found",
			});
			return null;
		}
		return result.rows[0] as FitBitUserIDData;
	} catch (error) {
		console.error('Error getting user data:', error);
		throw error;
	}
}

