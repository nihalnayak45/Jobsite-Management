'use strict';

/**
 * Data access layer for `workers`.
 */
const { db } = require('../config/database');

const TABLE = 'workers';

async function findById(id) {
  return db(TABLE).select('*').where({ id }).first();
}

async function findAll({ search } = {}) {
  const query = db(TABLE).select('*').orderBy('name', 'asc');
  if (search) {
    const term = `%${search.trim()}%`;
    query.where((q) => {
      q.whereILike('name', term)
        .orWhereILike('contact', term)
        .orWhereILike('contractor_details', term);
    });
  }
  return query;
}

async function create(data) {
  const [worker] = await db(TABLE).insert(data).returning('*');
  return worker;
}

async function exists(id) {
  const row = await db(TABLE).select('id').where({ id }).first();
  return Boolean(row);
}

module.exports = {
  findById,
  findAll,
  create,
  exists,
};
