const { Pool } = require('pg');
const config = require('../config');

let pool;

/**
 * PUBLIC_INTERFACE
 * Get (and lazily create) a singleton pg Pool.
 * @returns {Pool} PostgreSQL pool instance.
 */
function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      // Fail fast with a clear message to avoid confusing runtime errors later.
      throw new Error(
        'DATABASE_URL is not set. Please configure it in the backend environment.'
      );
    }

    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}

/**
 * PUBLIC_INTERFACE
 * Run a SQL query with parameters.
 * @param {string} text SQL query text
 * @param {any[]} params query parameters
 * @returns {Promise<import("pg").QueryResult>}
 */
async function query(text, params = []) {
  const p = getPool();
  return p.query(text, params);
}

module.exports = {
  getPool,
  query,
};
