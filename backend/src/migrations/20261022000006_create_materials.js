'use strict';

const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'materials';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    t.string('name', 150).notNullable();
    t.integer('quantity').notNullable().defaultTo(0);
    t.string('unit', 30).notNullable();
    t.integer('minimum_stock').notNullable().defaultTo(0);
    addTimestamps(knex, t);

    t.unique(['project_id', 'name'], { indexName: 'uq_materials_project_name' });
    t.check('?? >= 0', ['quantity'], 'chk_materials_quantity_non_negative');
    t.check('?? >= 0', ['minimum_stock'], 'chk_materials_min_stock_non_negative');
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
