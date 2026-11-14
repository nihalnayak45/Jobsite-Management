'use strict';

/**
 * Shared trigger function that keeps `updated_at` current on every UPDATE.
 * Attached to each table in subsequent migrations.
 */
exports.up = (knex) =>
  knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

exports.down = (knex) => knex.raw('DROP FUNCTION IF EXISTS set_updated_at() CASCADE;');
