'use strict';

const { addTimestamps, addUpdatedAtTrigger } = require('../utils/migrationHelpers');

const TABLE = 'workers';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    t.string('name', 150).notNullable();
    t.string('contact', 100).nullable();
    t.text('contractor_details').nullable();
    addTimestamps(knex, t);

    t.index(['name']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
