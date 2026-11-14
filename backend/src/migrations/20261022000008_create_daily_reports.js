'use strict';

const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'daily_reports';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    // RESTRICT: preserve report authorship (audit trail).
    foreignId(t, 'created_by', 'users', { onDelete: 'RESTRICT' });
    t.date('report_date').notNullable();
    t.text('work_summary').notNullable();
    addTimestamps(knex, t);

    t.index(['project_id', 'report_date']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
