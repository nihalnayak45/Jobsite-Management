'use strict';

/**
 * Reusable helpers for Knex migrations.
 * Lives outside src/migrations so Knex does not try to run it as a migration.
 */

/** Adds created_at / updated_at (timestamptz, NOT NULL, default now()). */
function addTimestamps(knex, table) {
  table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

/** Attaches the shared set_updated_at() trigger to a table. */
function addUpdatedAtTrigger(knex, tableName) {
  return knex.raw(
    `CREATE TRIGGER trg_${tableName}_updated_at
       BEFORE UPDATE ON ??
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    [tableName]
  );
}

/**
 * Standard FK column: unsigned int, references <refTable>.id.
 * @param {object} opts { nullable, onDelete, onUpdate }
 */
function foreignId(table, column, refTable, opts = {}) {
  const { nullable = false, onDelete = 'CASCADE', onUpdate = 'CASCADE' } = opts;
  const col = table.integer(column).unsigned();
  if (nullable) col.nullable();
  else col.notNullable();
  col.references('id').inTable(refTable).onDelete(onDelete).onUpdate(onUpdate);
  // PostgreSQL does not auto-index FK columns; index every FK for join/filter speed.
  table.index([column]);
  return col;
}

module.exports = {
  addTimestamps,
  addUpdatedAtTrigger,
  foreignId,
};
