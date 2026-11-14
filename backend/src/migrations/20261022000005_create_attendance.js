'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'attendance';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'worker_id', 'workers', { onDelete: 'CASCADE' });
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    t.date('date').notNullable();
    t.enu('status', ENUMS.ATTENDANCE_STATUS, { enumName: 'attendance_status' }).notNullable();
    addTimestamps(knex, t);

    // One attendance entry per worker, per project, per day.
    t.unique(['worker_id', 'project_id', 'date'], { indexName: 'uq_attendance_worker_project_date' });
    t.index(['project_id', 'date']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
