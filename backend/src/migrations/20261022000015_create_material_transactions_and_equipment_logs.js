'use strict';

/**
 * Migration: Create material_transactions and equipment_logs tables
 * to power Burn-Rate Analytics and QR Scan-to-Action Workflows.
 */

exports.up = async (knex) => {
  // 1. Material Transactions Ledger
  await knex.schema.createTable('material_transactions', (t) => {
    t.increments('id').primary();
    t.integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('material_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('materials')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('delta').notNullable(); // Negative = consumption, Positive = restock
    t.integer('logged_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    t.string('notes', 255).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['project_id', 'created_at'], 'idx_mat_trans_proj_date');
    t.index(['material_id', 'created_at'], 'idx_mat_trans_mat_date');
  });

  // 2. Equipment Checkout/Check-in Logs
  await knex.schema.createTable('equipment_logs', (t) => {
    t.increments('id').primary();
    t.integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('equipment_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('equipment')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    t.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    t.string('action', 50).notNullable(); // 'check_out' or 'check_in'
    t.string('notes', 255).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['project_id', 'created_at'], 'idx_eq_logs_proj_date');
    t.index(['equipment_id', 'created_at'], 'idx_eq_logs_eq_date');
  });

  // Enable RLS for both tables
  await knex.raw('ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('equipment_logs');
  await knex.schema.dropTableIfExists('material_transactions');
};

