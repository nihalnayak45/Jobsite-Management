'use strict';

/**
 * Lazy Supabase API clients (Storage, Auth admin, etc.) for future modules.
 * Database access goes through Knex (src/config/database.js), NOT these clients.
 *
 *   const { getSupabaseClient } = require('../config/supabase');
 *   const storage = getSupabaseClient({ admin: true }).storage;
 */
const env = require('./env');

const clients = {};

function isSupabaseConfigured() {
  return Boolean(env.supabase.url && (env.supabase.anonKey || env.supabase.serviceRoleKey));
}

/**
 * @param {{ admin?: boolean }} opts admin=true uses the service-role key (server-side only!).
 */
function getSupabaseClient({ admin = false } = {}) {
  const key = admin ? env.supabase.serviceRoleKey : env.supabase.anonKey;
  if (!env.supabase.url || !key) {
    throw new Error(
      `Supabase client not configured: set SUPABASE_URL and ${admin ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY'}.`
    );
  }
  const cacheKey = admin ? 'admin' : 'anon';
  if (!clients[cacheKey]) {
    const { createClient } = require('@supabase/supabase-js');
    clients[cacheKey] = createClient(env.supabase.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return clients[cacheKey];
}

module.exports = { getSupabaseClient, isSupabaseConfigured };
