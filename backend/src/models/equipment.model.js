'use strict';

/**
 * Data access layer for `equipment`.
 */
const { db } = require('../config/database');

const TABLE = 'equipment';

async function findById(id) {
  return db(TABLE).select('*').where({ id }).first();
}

async function findByProjectId(projectId, { condition, availability } = {}) {
  const query = db(TABLE)
    .select('*')
    .where({ project_id: projectId })
    .orderBy('name', 'asc');

  if (condition) {
    query.where({ condition });
  }

  if (availability !== undefined && availability !== null) {
    query.where({ availability });
  }

  return query;
}

async function create(data) {
  const [item] = await db(TABLE).insert(data).returning('*');
  return item;
}

async function update(id, data) {
  const [item] = await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return item;
}

module.exports = {
  findById,
  findByProjectId,
  create,
  update,
};
