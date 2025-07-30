import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const executeQuery = async (text: string, params: any[]) => {
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
