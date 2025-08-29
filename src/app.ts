import express, { Request, Response } from 'express';
import path from 'path';
import { generatePKCE, getVerifierString, insertState } from './api/auth';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { UserToken } from './types';
import { insertUserData } from './data/user';
import { runImport, runComprehensiveUsageValidation } from './utils/scheduled';
import { dataDump, sendEmail } from './utils/email';
import crypto from 'crypto';
import { config } from './config';

const app = express();
const PORT = config.port;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Serve login.html at / and /login.html
app.get(['/', '/index.html'], (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/auth', async (req: Request, res: Response) => {

  try {

    const { code_verifier, code_challenge } = await generatePKCE();

    const state = crypto.randomUUID()

    await insertState(state, code_verifier)

    const fitbitAuthUrl = new URL('https://www.fitbit.com/oauth2/authorize');

    fitbitAuthUrl.searchParams.set('client_id', config.fitbit.clientId);
    fitbitAuthUrl.searchParams.set('response_type', 'code');
    fitbitAuthUrl.searchParams.set('scope', config.fitbit.scopes);
    fitbitAuthUrl.searchParams.set('redirect_uri', config.fitbit.redirectUri);
    fitbitAuthUrl.searchParams.set('code_challenge', code_challenge);
    fitbitAuthUrl.searchParams.set('code_challenge_method', 'S256');
    fitbitAuthUrl.searchParams.set('state', state)

    console.log(fitbitAuthUrl.toString());
    // Redirect to Fitbit authorization URL
    res.redirect(fitbitAuthUrl.toString());

  } catch (error) {
    console.error('Error in auth processing:', error);
    res.status(500).send('Authentication initialization failed.');
  }
});

app.get('/callback', async (req: Request, res: Response) => {
  const {code, state} = req.query as { code?: string; state?: string };
  if (!code || !state) {
    return res.status(400).send('Missing code/state');
  }

  const verifierString = await getVerifierString(state);


  if (!verifierString) {
    return res.status(400).send('Missing verifier');
  }

  const tokenURL = 'https://api.fitbit.com/oauth2/token';
  const body = new URLSearchParams();
  body.set('client_id', config.fitbit.clientId);
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri', config.fitbit.redirectUri);
  body.set('code', code);
  body.set('code_verifier', verifierString);

  const authString = `${config.fitbit.clientId}:${config.fitbit.clientSecret}`;
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
  
    if (!fitbitRes.ok) {
      const errorText = await fitbitRes.text(); // <-- log this
      console.error('Fitbit token endpoint error:', fitbitRes.status, errorText); // <--- log it
      return res.status(400).send('Error in Token Message received');
    }
  
    const data = await fitbitRes.json() as UserToken;
  
    await insertUserData(data);
  
    // Success
    res.sendFile(path.join(__dirname, '../public/login-success.html'));
  
  } catch (err: any) {
    console.error('Error in callback processing:', err);
    
    // Check if it's a DB error vs API error if needed
    if (err.code) {
      console.error('Database error:', err);
      res.status(500).send('Failed to save token to database');
    } else {
      res.status(500).send('Internal server error');
    }
  }
});




// Schedule to run once per day at 2:00 AM server time
cron.schedule(config.cron.import, async () => {
  try {
    await runImport();
  } catch (err) {
    console.error('Scheduled job error:', err);
  }
}, {
  timezone: 'UTC'
});





cron.schedule(config.cron.usageValidation, async () => {
  try {
    await runComprehensiveUsageValidation();
  } catch (err) {
    console.error('Scheduled job error:', err);
  }
}, {
  timezone: 'UTC'
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 