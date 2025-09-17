import express, { Request, Response, NextFunction } from 'express';
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
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'

const app = express();
const PORTBACK = config.port.portBackend;
const PORTFRONT = config.port.portFrontend;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());


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





// cron.schedule(config.cron.usageValidation, async () => {
//   try {
//     await runComprehensiveUsageValidation();
//   } catch (err) {
//     console.error('Scheduled job error:', err);
//   }
// }, {
//   timezone: 'UTC'
// });






app.get("/api/users", auth, async (req, res) => {
  const { date } = req.query;
  const user_summary = await executeQuery(
    
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
          COUNT(*) FILTER (WHERE time >= '12:00:00' AND time < '18:00:00') / 72.0 * 100,
          0
        ) AS pct_afternoon,

        ROUND(
          COUNT(*) FILTER (WHERE time >= '18:00:00' AND time <= '23:59:59') / 72.0 * 100,
          0
        ) AS pct_evening,

        ROUND(
          COUNT(*) FILTER (WHERE (time >= '00:00:00' AND time < '06:00:00')) / 72.0 * 100,
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




app.get("/api/user", auth, async (req, res) => {
  const { id, date } = req.query;

  if (id && date) {

    if (typeof id !== "string" || typeof date !== "string") {
      return res.status(400).send("id and date must be a string");
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



app.get("/api/aggregate", auth, async (req, res) => {
  const { id, date } = req.query;

  const result = {
    HRV: await getHRVAgg(),
    sleep: await getSleepAgg(),
    steps: await getStepsAgg(),
    worn: await getWornAgg()

  };

    res.json(result);

  
});






async function getHRVAgg() {
  const result = await executeQuery(
    `
    SELECT 
      c.date_queried,
      u.user_id,
      a.daily_rmssd
    FROM calendar c
    CROSS JOIN fitbit_users u
    LEFT JOIN hrv_summary a
      ON c.date_queried = a.date_queried
    AND u.user_id = a.user_id
    ORDER BY c.date_queried, u.user_id;
    `
    ,[]
  )

  return result.rows

}



async function getSleepAgg() {
  const result = await executeQuery(
    `
    SELECT 
      c.date_queried,
      u.user_id,
      s.efficiency
    FROM calendar c
    CROSS JOIN fitbit_users u
    LEFT JOIN sleep_log s
      ON c.date_queried = s.date_queried
     AND u.user_id = s.user_id
     AND s.is_main_sleep = true
    ORDER BY c.date_queried, u.user_id;
    `,
    []
  );

  return result.rows;
}


async function getStepsAgg() {
  const result = await executeQuery(
    `
    SELECT 
      c.date_queried,
      u.user_id,
      d.steps
    FROM calendar c
    CROSS JOIN fitbit_users u
    LEFT JOIN daily_activity_summary d
      ON c.date_queried = d.date_queried
     AND u.user_id = d.user_id
    ORDER BY c.date_queried, u.user_id;
    `,
    []
  );

  return result.rows;
}


async function getWornAgg() {
  const result = await executeQuery(
    `
    SELECT 
      c.date_queried,
      u.user_id,
      ROUND(
        COUNT(h.*)::numeric / 288 * 100, 
        0
      )::int AS pct_worn
    FROM calendar c
    CROSS JOIN fitbit_users u
    LEFT JOIN heart_rate_intraday h
      ON c.date_queried = h.date_queried
     AND u.user_id = h.user_id
    GROUP BY c.date_queried, u.user_id
    ORDER BY c.date_queried, u.user_id;
    `,
    []
  );

  return result.rows;
}







const SECRET = config.jwtSecret;



// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await executeQuery(
    "SELECT id, username, password_hash FROM auth.users WHERE username = $1",
    [username]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "invalid credentials" });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});



interface AuthRequest extends Request {
  user?: { userId: number };
}




// Middleware
function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, SECRET) as { userId: number };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}





app.post("/api/changepw", auth, async (req: AuthRequest, res: Response) => {
  const { oldpw, newpw1, newpw2 } = req.body;
  const { userId } = req.user!

  const result = await executeQuery(
    "SELECT id, password_hash FROM auth.users WHERE id = $1",
    [userId]
  );
  
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  

  if (newpw1 !== newpw2 ) return res.status(400).json({ error: "new passwords do not match" });

  const matcholdpw = await bcrypt.compare(oldpw, user.password_hash);
  if (!matcholdpw ) return res.status(401).json({ error: "invalid credentials" });

  const sameAsOld = await bcrypt.compare(newpw1, user.password_hash);
  if (sameAsOld) return res.status(400).json({ error: "new password must be different" });


  const newHash = await bcrypt.hash(newpw1, 10)

  await executeQuery(
    `UPDATE auth.users
    SET password_hash = $1
    WHERE id = $2 
    `,
    [newHash, userId]
  );


  res.status(201).send("Password changed successfully");
});



const BASE_DIR = path.resolve(config.dumpFileDIR); 


app.get("/api/files", (req, res) => {
  fs.readdir(BASE_DIR, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.status(500).send("Error reading files");
    }

    // Only return regular files, skip dirs & hidden files
    const files = entries
      .filter(e => e.isFile() && !e.name.startsWith("."))
      .map(e => e.name);

    res.json(files);
  });
});

// Download file securely
app.get("/api/files/:name", (req, res) => {
  try {
    const requested = req.params.name;

    // Disallow path traversal characters outright
    if (requested.includes("..") || requested.includes("/")) {
      return res.status(400).send("Invalid file name");
    }

    // Build absolute path and enforce sandboxing
    const filePath = path.resolve(BASE_DIR, requested);
    if (!filePath.startsWith(BASE_DIR)) {
      return res.status(403).send("Forbidden");
    }

    // Check if file exists before attempting download
    fs.access(filePath, fs.constants.R_OK, err => {
      if (err) {
        return res.status(404).send("File not found or not readable");
      }
      res.download(filePath, requested, err2 => {
        if (err2) {
          console.error("Download error:", err2);
          res.status(500).send("Error sending file");
        }
      });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).send("Server error");
  }
});





// "127.0.0.1",



app.listen(PORTBACK, () => {
  console.log(`Server running on port ${PORTBACK}`);
}); 

app.listen(PORTFRONT, "127.0.0.1", () => {
  console.log(`Server running on port ${PORTFRONT}`);
}); 