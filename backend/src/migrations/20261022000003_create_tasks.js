'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'tasks';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    // Deleting a project removes its tasks.
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    // Deleting a user un-assigns the task instead of deleting it.
    foreignId(t, 'assigned_user_id', 'users', { nullable: true, onDelete: 'SET NULL' });
    t.string('title', 255).notNullable();
    t.date('deadline').nullable();
    t.enu('priority', ENUMS.PRIORITY, { enumName: 'task_priority' }).notNullable().defaultTo('medium');
    t.enu('status', ENUMS.TASK_STATUS, { enumName: 'task_status' }).notNullable().defaultTo('pending');
    t.integer('completion_percentage').notNullable().defaultTo(0);
    addTimestamps(knex, t);

    t.index(['project_id', 'status']);
    t.index(['deadline']);
    t.check(
      '?? BETWEEN 0 AND 100',
      ['completion_percentage'],
      'chk_tasks_completion_percentage'
    );
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
