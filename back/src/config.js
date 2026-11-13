require('dotenv').config({ quiet: true });
const { z } = require('zod');

// Une ligne vide dans .env (JWT_ACCESS_SECRET=) équivaut à « non défini ».
const optionalSecret = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32, '32 caractères minimum').optional());

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017'),
  DB_NAME: z.string().min(1).default('helpdesk'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  JWT_ACCESS_SECRET: optionalSecret(),
  JWT_REFRESH_SECRET: optionalSecret(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
});

// Valeurs réservées au développement et aux tests. Refusées en production.
const DEV_ACCESS_SECRET = 'dev-only-access-secret-change-me-0123456789';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-change-me-9876543210';

function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuration invalide : ${details}`);
  }
  const c = parsed.data;
  const isProd = c.NODE_ENV === 'production';

  if (isProd && (!c.JWT_ACCESS_SECRET || !c.JWT_REFRESH_SECRET)) {
    throw new Error('Configuration invalide : JWT_ACCESS_SECRET et JWT_REFRESH_SECRET sont obligatoires en production');
  }

  return {
    env: c.NODE_ENV,
    port: c.PORT,
    mongoUri: c.MONGODB_URI,
    dbName: c.DB_NAME,
    corsOrigin: c.CORS_ORIGIN,
    cookieSecure: c.COOKIE_SECURE === 'true',
    jwt: {
      accessSecret: c.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET,
      refreshSecret: c.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
      accessTtlSeconds: c.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlSeconds: c.REFRESH_TOKEN_TTL_SECONDS,
    },
  };
}

module.exports = { loadConfig };
