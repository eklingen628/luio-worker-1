import { Pool, QueryResultRow, QueryResult } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.dbURL,
});

export async function executeQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: any[]): Promise<QueryResult<T>> {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Query failed:', { 
      sql: text, 
      params, 
      error: error instanceof Error ? error.message : String(error),
      isAuthError: error instanceof Error ? error.message.includes('authentication') : false
    });
    throw error;
  }
}

