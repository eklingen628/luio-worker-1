

// Environment variable validation and configuration
const requiredEnvVars = [
  'FITBIT_CLIENT_ID',
  'FITBIT_CLIENT_SECRET',
  'SCOPES_NEEDED',
  'REDIRECT_URI',
  'CRON_IMPORT',
  'CRON_USAGE_VAL',
  'DATABASE_URL',
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
    usageValidation: process.env.CRON_USAGE_VAL!
  },
  email: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    service: process.env.EMAIL_SERVICE!,
    pi: process.env.EMAIL_PI!
  },
  dbURL: process.env.DATABASE_URL!,
  dataDumpDir: process.env.DATA_DUMP_DIR!,
  port: 3000
};
