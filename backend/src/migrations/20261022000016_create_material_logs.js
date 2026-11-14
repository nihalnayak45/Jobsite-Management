'use strict';

/**
 * Migration: Create material_logs table
 * Powers historical inventory usage tracking and stock depletion forecasting.
 */

exports.up = async (knex) => {
  await knex.schema.createTable('material_logs', (t) => {
    t.increments('id').primary();
    t.integer('material_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('materials')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('change_amount').notNullable(); // Positive for restock, negative for consumption
    t.integer('previous_quantity').notNullable();
    t.integer('new_quantity').notNullable();
    t.integer('logged_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .onUpdate('CASCADE');
    t.string('reason', 50)
      .notNullable()
      .defaultTo('adjustment');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.check(
      "reason IN ('daily_usage', 'restock', 'damage_loss', 'adjustment')",
      [],
      'check_material_logs_reason'
    );

    t.index(['material_id', 'created_at'], 'idx_material_logs_mat_date');
    t.index(['project_id', 'created_at'], 'idx_material_logs_proj_date');
  });

  // Enable RLS for material_logs
  await knex.raw('ALTER TABLE material_logs ENABLE ROW LEVEL SECURITY;');
  await knex.raw(`
    CREATE POLICY allow_all_material_logs ON material_logs
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('material_logs');
};

