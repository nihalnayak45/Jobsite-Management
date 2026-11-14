'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

/** Tri-state boolean: returns `fallback` (default undefined) when unset/empty. */
const toBool = (value, fallback = undefined) => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
};

const str = (value) => (value === undefined || value.trim() === '' ? null : value.trim());

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  db: {
    // Connection string (preferred). SUPABASE_DB_URL wins over the generic DATABASE_URL.
    url: str(process.env.SUPABASE_DB_URL) || str(process.env.DATABASE_URL),
    // Optional separate URL for the Knex CLI (e.g. session pooler / direct :5432).
    migrationUrl: str(process.env.SUPABASE_MIGRATION_DB_URL),

    // Discrete fallback (used only when no URL is set).
    host: str(process.env.DB_HOST) || 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    name: str(process.env.DB_NAME) || 'postgres',
    user: str(process.env.DB_USER) || 'postgres',
    password: process.env.DB_PASSWORD || '',

    // SSL: unset => auto (on for *.supabase.co / *.supabase.com hosts).
    ssl: toBool(process.env.DB_SSL),
    sslRejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
    sslCaPath: str(process.env.DB_SSL_CA_PATH),

    connectTimeoutMs: toInt(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
    pool: {
      min: toInt(process.env.DB_POOL_MIN, 0),
      max: toInt(process.env.DB_POOL_MAX, 10),
      idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
      acquireTimeoutMillis: toInt(process.env.DB_POOL_ACQUIRE_TIMEOUT_MS, 60000),
    },
  },

  supabase: {
    url: str(process.env.SUPABASE_URL),
    anonKey: str(process.env.SUPABASE_ANON_KEY),
    serviceRoleKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  auth: {
    jwtSecret: str(process.env.JWT_SECRET),
    jwtExpiresIn: str(process.env.JWT_EXPIRES_IN) || '1d',
    jwtIssuer: 'jms-backend',
    // Enforce a minimum of 10 rounds regardless of configuration.
    bcryptSaltRounds: Math.max(10, toInt(process.env.BCRYPT_SALT_ROUNDS, 10)),
    // When false, 'admin'/'project_manager' accounts can only be created by an admin
    // (except the very first admin when the users table is empty).
    allowPublicPrivilegedRegistration: toBool(process.env.ALLOW_PUBLIC_PRIVILEGED_REGISTRATION, false),
  },
};

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

// --- JWT secret guard ---
const PLACEHOLDER_SECRETS = ['replace_with_a_long_random_string', 'changeme', 'secret'];
if (!env.auth.jwtSecret || PLACEHOLDER_SECRETS.includes(env.auth.jwtSecret)) {
  if (env.isProduction) {
    throw new Error('JWT_SECRET must be set to a strong random value in production.');
  }
  if (!env.isTest) {
    console.warn('[auth] JWT_SECRET is not set - using an INSECURE development secret.');
  }
  env.auth.jwtSecret = 'jms-dev-only-insecure-jwt-secret-do-not-use-in-production';
} else if (env.isProduction && env.auth.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

module.exports = env;
