'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'issues';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    foreignId(t, 'reported_by', 'users', { onDelete: 'RESTRICT' });
    t.text('description').notNullable();
    t.enu('priority', ENUMS.PRIORITY, { enumName: 'issue_priority' }).notNullable().defaultTo('medium');
    t.enu('status', ENUMS.ISSUE_STATUS, { enumName: 'issue_status' }).notNullable().defaultTo('open');
    addTimestamps(knex, t);

    t.index(['project_id', 'status']);
    t.index(['priority']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
