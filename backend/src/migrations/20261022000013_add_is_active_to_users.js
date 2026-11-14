'use strict';

/**
 * Ensures `is_active` exists on `users` if migrations 1-12 were already run.
 */
exports.up = async (knex) => {
  const exists = await knex.schema.hasColumn('users', 'is_active');
  if (!exists) {
    await knex.schema.alterTable('users', (t) => {
      t.boolean('is_active').notNullable().defaultTo(true);
    });
  }
};

exports.down = async (knex) => {
  const exists = await knex.schema.hasColumn('users', 'is_active');
  if (exists) {
    await knex.schema.alterTable('users', (t) => {
      t.dropColumn('is_active');
    });
  }
};
