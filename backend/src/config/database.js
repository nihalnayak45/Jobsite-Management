'use strict';

/**
 * Centralized database connection helper.
 *
 * A single Knex instance (and therefore a single pg connection pool) is
 * created per process and shared by every module that requires this file.
 * Works with Supabase (pooler or direct) and any standard PostgreSQL server.
 */
const knex = require('knex');
const { buildKnexConfig } = require('./dbConnection');

const { config, target } = buildKnexConfig('runtime');

const db = knex(config);

function errorMessage(err) {
  return (
    err.message ||
    (err.errors && err.errors[0] && err.errors[0].message) ||
    err.code ||
    'Unknown database error'
  );
}

/**
 * Verifies the pool can hand out a working connection and run a query.
 * @returns {Promise<{ ok: boolean, latencyMs: number, database?: string, serverVersion?: string, error?: string }>}
 */
async function checkConnection() {
  const started = Date.now();
  try {
    const { rows } = await db.raw(
      "SELECT current_database() AS database, current_setting('server_version') AS version"
    );
    return {
      ok: true,
      latencyMs: Date.now() - started,
      database: rows[0].database,
      serverVersion: rows[0].version,
    };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, error: errorMessage(err) };
  }
}

/** Returns current pool usage stats (useful for health/monitoring). */
function getPoolStats() {
  const pool = db.client && db.client.pool;
  if (!pool) return null;
  return {
    used: pool.numUsed(),
    free: pool.numFree(),
    pendingAcquires: pool.numPendingAcquires(),
    min: config.pool.min,
    max: config.pool.max,
  };
}

/** Non-secret description of where we are connecting (mode, host, ssl...). */
function getConnectionTarget() {
  return { ...target };
}

/** Drains the pool. Call on graceful shutdown. */
async function closeConnection() {
  await db.destroy();
}

module.exports = {
  db,
  checkConnection,
  getPoolStats,
  getConnectionTarget,
  closeConnection,
};
