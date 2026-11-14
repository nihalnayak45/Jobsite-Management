'use strict';

const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'documents';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    t.string('file_name', 255).notNullable();
    t.string('category', 100).notNullable();
    foreignId(t, 'uploaded_by', 'users', { onDelete: 'RESTRICT' });
    t.timestamp('upload_date', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    addTimestamps(knex, t);

    t.index(['project_id', 'category']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
