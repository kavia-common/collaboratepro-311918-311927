const dotenv = require('dotenv');

dotenv.config();

/**
 * PUBLIC_INTERFACE
 * Application configuration derived from environment variables.
 * Keep all environment access centralized here to avoid scattering config logic.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3001),

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL || '',
};

module.exports = config;
