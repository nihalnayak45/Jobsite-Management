'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger, foreignId } = require('../utils/migrationHelpers');

const TABLE = 'equipment';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    foreignId(t, 'project_id', 'projects', { onDelete: 'CASCADE' });
    t.string('name', 150).notNullable();
    t.boolean('availability').notNullable().defaultTo(true);
    t.enu('condition', ENUMS.EQUIPMENT_CONDITION, { enumName: 'equipment_condition' })
      .notNullable()
      .defaultTo('operational');
    addTimestamps(knex, t);

    t.index(['project_id', 'availability']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
