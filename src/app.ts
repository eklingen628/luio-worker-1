import express, { Request, Response } from 'express';
import path from 'path';
import { generatePKCE, getVerifierString, insertState } from './api/auth';
import cron from 'node-cron';
import { UserToken } from './types';
import { insertUserData } from './data/user';
import { runImport, runComprehensiveUsageValidation } from './utils/scheduled';
import { dataDump, sendEmail } from './utils/email';
import crypto from 'crypto';
import { config } from './config';
import { executeQuery } from './db/connection';

const app = express();
const PORTBACK = config.port.portBackend;
const PORTFRONT = config.port.portFrontend;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));


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






// app.get('', async (req: Request, res: Response) => {

//   const {user_id, date} = req.query

//   if (!user_id || !date) {
//     const today = new Date().toLocaleDateString("en-CA")
//     const result = await pool.query(
//       "SELECT user_id FROM users ORDER BY user_id LIMIT 1"
//     );
//     const firstUserId = result.rows[0].user_id;

//     // Redirect browser to the full querystring version
//     return res.redirect(`/summary?user=${firstUserId}&date=${today}`);
//   }

//   const query = await pool.query(`
//     SELECT user_id 
//     FROM fitbit_users    
//     ORDER BY user_id desc
//     LIMIT 1
//     `)


//   res.json(query.rows)


// });






app.get("/api/users", async (req, res) => {
  const { date } = req.query;
  const user_summary = await executeQuery(
    // `SELECT 
    //   u.user_id,
    //   c.date_queried,
    //   r.daily_readiness,
    //   s.efficiency,
    //   s2.stressscore,
    //   a.calories_out
    // FROM fitbit_users u
    // CROSS JOIN calendar c                      
    // LEFT JOIN daily_readiness_view r
    //   ON u.user_id = r.user_id 
    //   AND c.date_queried = r.date_queried
    // LEFT JOIN sleep_log s
    //   ON u.user_id = s.user_id 
    //   AND c.date_queried = s.date_queried
    //   AND is_main_sleep = true
    // LEFT JOIN stress_score s2
    //   ON u.user_id = s2.user_id 
    //   AND c.date_queried = s2.date_queried
    // LEFT JOIN daily_activity_summary a
    //   ON u.user_id = a.user_id 
    //   AND c.date_queried = a.date_queried
    // WHERE c.date_queried = $1
    // ORDER BY u.user_id`
    
    `SELECT 
      u.user_id,
      c.date_queried,
      r.daily_readiness,
      s.efficiency,
      s2.stressscore,
      a.calories_out,
      a.steps,
      h.pct_morning,
      h.pct_afternoon,
      h.pct_evening,
      h.pct_night
    FROM fitbit_users u
    CROSS JOIN calendar c                      
    LEFT JOIN daily_readiness_view r
      ON u.user_id = r.user_id 
      AND c.date_queried = r.date_queried
    LEFT JOIN sleep_log s
      ON u.user_id = s.user_id 
      AND c.date_queried = s.date_queried
      AND is_main_sleep = true
    LEFT JOIN stress_score s2
      ON u.user_id = s2.user_id 
      AND c.date_queried = s2.date_queried
    LEFT JOIN daily_activity_summary a
      ON u.user_id = a.user_id 
      AND c.date_queried = a.date_queried
    LEFT JOIN (
      SELECT 
        user_id,
        date_queried,
        ROUND(
          COUNT(*) FILTER (WHERE time >= '06:00:00' AND time < '12:00:00') / 72.0 * 100,
          0
        ) AS pct_morning,

        ROUND(
          COUNT(*) FILTER (WHERE time >= '12:00:00' AND time < '16:00:00') / 48.0 * 100,
          0
        ) AS pct_afternoon,

        ROUND(
          COUNT(*) FILTER (WHERE time >= '16:00:00' AND time < '22:00:00') / 72.0 * 100,
          0
        ) AS pct_evening,

        ROUND(
          COUNT(*) FILTER (WHERE (time >= '22:00:00' OR time < '06:00:00')) / 96.0 * 100,
          0
        ) AS pct_night
      FROM heart_rate_intraday
      GROUP BY user_id, date_queried
    ) h
      ON u.user_id = h.user_id
      AND c.date_queried = h.date_queried
    WHERE c.date_queried = $1
    ORDER BY u.user_id;
    `    
    ,[date]
  );


  res.json(user_summary.rows);
});




async function getIntraForUser(id: string, date: string, config: string) {



  const table =
  config === "heart_rate_intraday" ? "heart_rate_intraday": 
  config === "activity_steps_intraday"    ? "activity_steps_intraday": null;

  if (!table) throw new Error("Invalid table");


  const result = await executeQuery(
    `
    SELECT time, value
    FROM ${table}
    WHERE user_id = $1
    AND date_queried = $2
    ORDER BY time    
    `
    ,[id, date]
  )

  return result.rows

}




async function getSleepForUser(id: string, date: string) {
  const result = await executeQuery(
    `

    
WITH stage_intervals AS (
  SELECT
    user_id,
    log_id,
    level       AS stage,
    date_time   AS start_time,
    LEAD(date_time) OVER (
      PARTITION BY user_id, log_id
      ORDER BY date_time
    ) AS next_stage_time
  FROM sleep_levels_combined
  WHERE user_id = $1
    AND date_queried = $2
)
SELECT
  s.stage,
  s.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago' AS start_time,
  COALESCE(s.next_stage_time, l.end_time) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago' AS end_time,
  ROUND(
    EXTRACT(EPOCH FROM (COALESCE(s.next_stage_time, l.end_time) - s.start_time)) / 60,
    1
  ) AS duration_minutes
FROM stage_intervals s
JOIN sleep_log l
  ON s.user_id = l.user_id
 AND s.log_id  = l.log_id
WHERE l.is_main_sleep = true
ORDER BY s.start_time;







    `
    ,[id, date]
  )

  return result.rows

}




app.get("/api/user", async (req, res) => {
  const { id, date } = req.query;

  if (id && date) {

    if (typeof id !== "string" || typeof date !== "string") {
      return res.status(400).send("id must be a string");
    }
    const result = {
      user_id: id,
      date_queried: date,
      
      heart: await getIntraForUser(id, date, "heart_rate_intraday"),
      sleep: await getSleepForUser(id, date),
      steps: await getIntraForUser(id, date, "activity_steps_intraday"),

    };

    res.json(result);
  }
  
});







app.listen(PORTBACK, () => {
  console.log(`Server running on port ${PORTBACK}`);
}); 

app.listen(PORTFRONT, "127.0.0.1", () => {
  console.log(`Server running on port ${PORTFRONT}`);
}); 