'use strict';

/**
 * Data access layer for `safety_records`.
 */
const { db } = require('../config/database');

const TABLE = 'safety_records';

async function findById(id) {
  return db(TABLE).select('*').where({ id }).first();
}

async function findByProjectId(projectId, { record_type } = {}) {
  const query = db(TABLE)
    .select('*')
    .where({ project_id: projectId })
    .orderBy('date', 'desc')
    .orderBy('created_at', 'desc');

  if (record_type) {
    query.where({ record_type });
  }

  return query;
}

async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

module.exports = {
  findById,
  findByProjectId,
  create,
};
