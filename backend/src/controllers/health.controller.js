'use strict';

const env = require('../config/env');
const { checkConnection, getPoolStats, getConnectionTarget } = require('../config/database');
const { isSupabaseConfigured } = require('../config/supabase');

/**
 * GET /api/health
 * Liveness + DB readiness probe. Runs a real query against the configured
 * database (e.g. remote Supabase). 200 "ok" when reachable, 503 "degraded" otherwise.
 */
async function getHealth(req, res) {
  const result = await checkConnection();
  const healthy = result.ok;
  const target = getConnectionTarget();

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'jms-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      status: healthy ? 'connected' : 'unreachable',
      provider: target.mode.startsWith('supabase') ? 'supabase' : 'postgres',
      mode: target.mode,
      ssl: target.ssl,
      latencyMs: result.latencyMs,
      ...(healthy ? { name: result.database, serverVersion: result.serverVersion } : {}),
      pool: getPoolStats(),
      ...(env.isProduction ? {} : { host: target.host, port: target.port }),
      ...(healthy || env.isProduction ? {} : { error: result.error }),
    },
    supabaseApi: { configured: isSupabaseConfigured() },
  });
}

module.exports = { getHealth };
