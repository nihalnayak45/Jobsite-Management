'use strict';

/**
 * Supabase exposes the `public` schema through its auto-generated REST/GraphQL
 * Data API. Without RLS, anyone holding the (public) anon key could read/write
 * these tables - including users.password_hash.
 *
 * Enabling RLS with NO policies denies all access to the `anon`/`authenticated`
 * roles, while our backend (connecting as the table owner `postgres`) and the
 * `service_role` key bypass RLS and keep full access.
 * Harmless on non-Supabase PostgreSQL.
 */
const TABLES = [
  'users',
  'projects',
  'tasks',
  'workers',
  'attendance',
  'materials',
  'equipment',
  'daily_reports',
  'issues',
  'documents',
  'safety_records',
  'knex_migrations',
  'knex_migrations_lock',
];

exports.up = async (knex) => {
  for (const table of TABLES) {
    await knex.raw('ALTER TABLE ?? ENABLE ROW LEVEL SECURITY', [table]);
  }
};

exports.down = async (knex) => {
  for (const table of TABLES) {
    await knex.raw('ALTER TABLE ?? DISABLE ROW LEVEL SECURITY', [table]);
  }
};
