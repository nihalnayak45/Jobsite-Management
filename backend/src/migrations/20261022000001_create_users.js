'use strict';

const ENUMS = require('../constants/enums');
const { addTimestamps, addUpdatedAtTrigger } = require('../utils/migrationHelpers');

const TABLE = 'users';

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE, (t) => {
    t.increments('id').primary();
    t.string('name', 150).notNullable();
    t.string('email', 255).notNullable().unique({ indexName: 'users_email_unique' });
    t.string('password_hash', 255).notNullable();
    t.enu('role', ENUMS.USER_ROLE, { enumName: 'user_role' }).notNullable().defaultTo('worker');
    t.boolean('is_active').notNullable().defaultTo(true);
    addTimestamps(knex, t);

    t.index(['role']);
  });
  await addUpdatedAtTrigger(knex, TABLE);
};

exports.down = (knex) => knex.schema.dropTableIfExists(TABLE);
