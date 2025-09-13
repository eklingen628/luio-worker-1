

// Environment variable validation and configuration
const requiredEnvVars = [
  'FITBIT_CLIENT_ID',
  'FITBIT_CLIENT_SECRET',
  'SCOPES_NEEDED',
  'REDIRECT_URI',
  'CRON_IMPORT',
  'CRON_USAGE_VAL',
  'DATABASE_URL',
  // 'LOG_DIR'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  fitbit: {
    clientId: process.env.FITBIT_CLIENT_ID!,
    clientSecret: process.env.FITBIT_CLIENT_SECRET!,
    scopes: process.env.SCOPES_NEEDED!,
    redirectUri: process.env.REDIRECT_URI!
  },
  cron: {
    import: process.env.CRON_IMPORT!,
    usageValidation: process.env.CRON_USAGE_VAL!,
    importDaysPriorToToday: Number(process.env.CRON_IMPORT_DAYS_PRIOR_TO_TODAY ?? 1),  //probably just set to 0 or 1. If set to 0, just look at yesterday's data
    importNumDaysToImport: Number(process.env.CRON_NUM_DAYS_TO_IMPORT ?? 2), // the number of days to import for
  },
  email: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    service: process.env.EMAIL_SERVICE!,
    pi: process.env.EMAIL_PI!
  },
  dbURL: process.env.DATABASE_URL!,
  dataDumpDir: process.env.DATA_DUMP_DIR!,
  logDir: process.env.LOG_DIR!,
  port: 3000
};
 
