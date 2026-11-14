'use strict';

/**
 * Data-access layer for the `users` table.
 * password_hash is only ever selected by findByEmailWithPassword (login).
 */
const { db } = require('../config/database');

const TABLE = 'users';
const PUBLIC_COLUMNS = ['id', 'name', 'email', 'role', 'is_active', 'created_at', 'updated_at'];

/** Emails are stored lower-cased; always normalise before querying. */
const normalizeEmail = (email) => String(email).trim().toLowerCase();

function findById(id) {
  return db(TABLE).select(PUBLIC_COLUMNS).where({ id }).first();
}

function findByEmail(email) {
  return db(TABLE).select(PUBLIC_COLUMNS).where({ email: normalizeEmail(email) }).first();
}

function findByEmailWithPassword(email) {
  return db(TABLE)
    .select([...PUBLIC_COLUMNS, 'password_hash'])
    .where({ email: normalizeEmail(email) })
    .first();
}

async function create({ name, email, passwordHash, role }) {
  const [user] = await db(TABLE)
    .insert({ name, email: normalizeEmail(email), password_hash: passwordHash, role })
    .returning(PUBLIC_COLUMNS);
  return user;
}

async function count() {
  const row = await db(TABLE).count({ total: '*' }).first();
  return Number(row.total);
}

module.exports = {
  findById,
  findByEmail,
  findByEmailWithPassword,
  create,
  count,
  normalizeEmail,
};
