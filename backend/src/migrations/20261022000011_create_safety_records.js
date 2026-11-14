'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'safety_records';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    t.enu('record_type', ENUMS.SAFETY_RECORD_TYPE, { enumName: 'safety_record_type' }).notNullable();
    t.text('description').notNullable();
    t.date('date').notNullable();
    // Free-form per spec (e.g. 'open', 'closed', 'passed', 'failed').
    t.string('status', 50).notNullable().defaultTo('open');
    addTimestamps(knex, t);

    t.index(['project_id', 'record_type']);
    t.index(['date']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
