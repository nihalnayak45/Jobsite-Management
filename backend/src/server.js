'use strict';

const app = require('./app');
const env = require('./config/env');
const { checkConnection, closeConnection, getConnectionTarget } = require('./config/database');

async function start() {
  const target = getConnectionTarget();
  const label = `${target.mode} ${target.host}:${target.port} (ssl=${target.ssl})`;
  const db = await checkConnection();
  if (db.ok) {
    console.log(`[db] Connected to ${label} - PostgreSQL ${db.serverVersion} (${db.latencyMs}ms)`);
  } else {
    // Keep serving so /api/health can report the problem; fail loudly in logs.
    console.error(`[db] Unable to connect to ${label}: ${db.error}`);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] JMS API listening on http://localhost:${env.port}${env.apiPrefix} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await closeConnection();
      console.log('[server] Closed HTTP server and DB pool.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[process] Unhandled rejection:', reason);
  });
}

start();
