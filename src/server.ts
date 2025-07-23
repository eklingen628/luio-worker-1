import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { generatePKCE } from './auth';
import cookieParser from 'cookie-parser';
import pool from './db';
import cron from 'node-cron';
import { runDailyJob } from './scheduled';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Serve login.html at / and /login.html
app.get(['/', '/index.html'], (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/auth', async (req: Request, res: Response) => {
  const fitbitAuthUrl = new URL('https://www.fitbit.com/oauth2/authorize');

  const { code_verifier, code_challenge } = await generatePKCE();

  fitbitAuthUrl.searchParams.set('client_id', process.env.FITBIT_CLIENT_ID!);
  fitbitAuthUrl.searchParams.set('response_type', 'code');
  fitbitAuthUrl.searchParams.set('scope', process.env.SCOPES_NEEDED!);
  fitbitAuthUrl.searchParams.set('redirect_uri', process.env.REDIRECT_URI!);
  fitbitAuthUrl.searchParams.set('code_challenge', code_challenge);
  fitbitAuthUrl.searchParams.set('code_challenge_method', 'S256');

  // Set the PKCE verifier as a cookie
  res.cookie('verifier', code_verifier, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });

  // Redirect to Fitbit authorization URL
  res.redirect(fitbitAuthUrl.toString());
});

app.get('/callback', async (req: Request, res: Response) => {
  const authcode = req.query.code as string | undefined;
  if (!authcode) {
    return res.status(400).send('Missing code');
  }

  const verifierString = req.cookies.verifier;
  if (!verifierString) {
    return res.status(400).send('Missing verifier');
  }

  const tokenURL = 'https://api.fitbit.com/oauth2/token';
  const body = new URLSearchParams();
  body.set('client_id', process.env.FITBIT_CLIENT_ID!);
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri', process.env.REDIRECT_URI!);
  body.set('code', authcode);
  body.set('code_verifier', verifierString);

  const authString = `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`;
  const encodedAuth = Buffer.from(authString).toString('base64');

  try {
    const fitbitRes = await fetch(tokenURL, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedAuth}`,
      },
    });
    const data = await fitbitRes.json();
    console.log('Fitbit token response:', data);
    if (!fitbitRes.ok) {
      return res.status(400).send('Error in Token Message received');
    }
    // For now, just show a success message
    res.send('Token received and logged. (DB logic not yet implemented)');
  } catch (err) {
    console.error('Error exchanging code for token:', err);
    res.status(500).send('Internal server error');
  }
});

app.get('/db-test', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Schedule to run once per day at 2:00 AM server time
cron.schedule('0 2 * * *', () => {
  runDailyJob().catch(err => console.error('Scheduled job error:', err));
});

// Optionally, run once on server start
runDailyJob().catch(err => console.error('Initial scheduled job error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 