'use strict';

/**
 * Knex CLI configuration (migrate / seed).
 * Uses SUPABASE_MIGRATION_DB_URL when set, otherwise SUPABASE_DB_URL / DATABASE_URL / DB_*.
 * Connection logic lives in src/config/dbConnection.js (shared with the runtime pool).
 */
const { buildKnexConfig } = require('./src/config/dbConnection');

module.exports = buildKnexConfig('migrations').config;
