'use strict';

/**
 * Resolves PostgreSQL connection settings (Supabase or any Postgres) into a
 * Knex config. Shared by the runtime pool (database.js) and the Knex CLI (knexfile.js).
 *
 * Why we parse the URL ourselves instead of passing `connectionString`:
 * node-pg lets query params in the URL (e.g. `?sslmode=require`) override the
 * explicit `ssl` object, which breaks Supabase with
 * "self-signed certificate in certificate chain". Parsing into discrete fields
 * keeps SSL fully under our control and drops non-pg params like `pgbouncer=true`.
 */
const fs = require('fs');
const path = require('path');
const env = require('./env');

const SUPABASE_HOST_RE = /\.supabase\.(co|com)$/i;
const POOLER_HOST_RE = /\.pooler\.supabase\.com$/i;

function parseConnectionString(url) {
  if (/\[[a-z_\- ]+\]/i.test(url)) {
    throw new Error('Database URL still contains placeholders like [password]/[project-ref]. Update your .env.');
  }
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error('Database URL is not a valid connection string (URL-encode special characters in the password).');
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) {
    throw new Error(`Unsupported database URL protocol "${u.protocol}" (expected postgresql://).`);
  }
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    database: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    sslmode: u.searchParams.get('sslmode'),
  };
}

function detectMode(host, port) {
  if (POOLER_HOST_RE.test(host)) {
    return port === 6543 ? 'supabase_transaction_pooler' : 'supabase_session_pooler';
  }
  if (SUPABASE_HOST_RE.test(host)) return 'supabase_direct';
  return 'postgres';
}

function buildSsl(host, sslmode) {
  const enabled =
    env.db.ssl !== undefined
      ? env.db.ssl
      : sslmode
        ? sslmode !== 'disable'
        : SUPABASE_HOST_RE.test(host);

  if (!enabled) return false;
  if (env.db.sslCaPath) {
    // Strict verification using Supabase's CA cert (Dashboard > Database > SSL).
    return { ca: fs.readFileSync(path.resolve(env.db.sslCaPath), 'utf8'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: env.db.sslRejectUnauthorized };
}

/**
 * @param {'runtime'|'migrations'} purpose
 * @returns {{ connection: object, target: object }}
 */
function resolveConnection(purpose = 'runtime') {
  const url = purpose === 'migrations' ? env.db.migrationUrl || env.db.url : env.db.url;

  const base = url
    ? parseConnectionString(url)
    : {
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
        user: env.db.user,
        password: env.db.password,
        sslmode: null,
      };

  const ssl = buildSsl(base.host, base.sslmode);

  const connection = {
    host: base.host,
    port: base.port,
    database: base.database,
    user: base.user,
    password: base.password,
    ssl,
    keepAlive: true, // remote DBs/poolers drop idle TCP connections
    connectionTimeoutMillis: env.db.connectTimeoutMs,
    application_name: 'jms-backend',
  };

  const target = {
    mode: detectMode(base.host, base.port),
    host: base.host,
    port: base.port,
    database: base.database,
    ssl: Boolean(ssl),
    source: url ? 'url' : 'discrete',
  };

  return { connection, target };
}

/** Full Knex config for the given purpose. */
function buildKnexConfig(purpose = 'runtime') {
  const { connection, target } = resolveConnection(purpose);
  return {
    target,
    config: {
      client: 'pg',
      connection,
      pool: {
        min: env.db.pool.min,
        max: env.db.pool.max,
        idleTimeoutMillis: env.db.pool.idleTimeoutMillis,
      },
      acquireConnectionTimeout: env.db.pool.acquireTimeoutMillis,
      migrations: {
        directory: path.join(__dirname, '..', 'migrations'),
        tableName: 'knex_migrations',
      },
      seeds: {
        directory: path.join(__dirname, '..', 'seeds'),
      },
    },
  };
}

module.exports = { buildKnexConfig, resolveConnection, parseConnectionString };
