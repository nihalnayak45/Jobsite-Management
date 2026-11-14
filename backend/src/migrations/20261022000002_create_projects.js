'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'projects';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    t.string('project_name', 200).notNullable();
    t.string('location', 255).notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').nullable();
    // RESTRICT: a manager cannot be deleted while still owning projects (reassign first).
    foreignId(t, 'manager_id', 'users', { onDelete: 'RESTRICT' });
    t.enu('status', ENUMS.PROJECT_STATUS, { enumName: 'project_status' })
      .notNullable()
      .defaultTo('planned');
    addTimestamps(knex, t);

    t.index(['status']);
    t.check('?? IS NULL OR ?? >= ??', ['end_date', 'end_date', 'start_date'], 'chk_projects_date_range');
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
