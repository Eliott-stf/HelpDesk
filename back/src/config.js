require('dotenv').config({ quiet: true });
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017'),
  DB_NAME: z.string().min(1).default('helpdesk'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuration invalide : ${details}`);
  }
  const c = parsed.data;
  return {
    port: c.PORT,
    mongoUri: c.MONGODB_URI,
    dbName: c.DB_NAME,
    corsOrigin: c.CORS_ORIGIN,
  };
}

module.exports = { loadConfig };
