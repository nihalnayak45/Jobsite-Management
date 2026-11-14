'use strict';

/**
 * Migration: Enforce 4-role model on `users.role` and create `project_site_engineers` junction table.
 *
 * Roles permitted: 'project_manager', 'site_engineer', 'worker', 'client' ('admin' removed).
 */

const TABLE = 'project_site_engineers';

exports.up = async (knex) => {
  // 1. Update any existing users with 'admin' role to 'project_manager' before adding CHECK constraint
  await knex.raw("UPDATE users SET role = 'project_manager' WHERE role::text = 'admin'");

  // 2. Update CHECK constraint on users.role to permit only the 4 roles
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role::text IN ('project_manager', 'site_engineer', 'worker', 'client'))
  `);

  // 3. Create junction table project_site_engineers
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    t.integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('site_engineer_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['project_id', 'site_engineer_id'], { indexName: 'uq_project_site_engineers_project_engineer' });
    t.index(['project_id'], 'idx_project_site_engineers_project_id');
    t.index(['site_engineer_id'], 'idx_project_site_engineers_site_engineer_id');
  });

  // 4. Enable Row Level Security (RLS) consistent with Supabase architecture
  await knex.raw(`ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`);
};

exports.down = async (knex) => {
  // 1. Drop junction table
  await knex.schema.dropTableIfExists(TABLE);

  // 2. Restore previous CHECK constraint on users.role
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role::text IN ('admin', 'project_manager', 'site_engineer', 'worker', 'client'))
  `);
};

