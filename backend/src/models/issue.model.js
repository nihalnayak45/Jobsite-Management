'use strict';

/**
 * Data access layer for `issues`.
 */
const { db } = require('../config/database');

const TABLE = 'issues';

async function findById(id) {
  return db(TABLE)
    .select(
      'issues.*',
      'users.name as reporter_name',
      'users.email as reporter_email'
    )
    .leftJoin('users', 'issues.reported_by', 'users.id')
    .where('issues.id', id)
    .first();
}

async function findByProjectId(projectId, { status, priority } = {}) {
  const query = db(TABLE)
    .select(
      'issues.*',
      'users.name as reporter_name',
      'users.email as reporter_email'
    )
    .leftJoin('users', 'issues.reported_by', 'users.id')
    .where('issues.project_id', projectId)
    .orderBy('issues.created_at', 'desc');

  if (status) query.where('issues.status', status);
  if (priority) query.where('issues.priority', priority);

  return query;
}

async function create(data) {
  const [issue] = await db(TABLE).insert(data).returning('*');
  return findById(issue.id);
}

async function updateStatus(id, status) {
  const [updated] = await db(TABLE)
    .where({ id })
    .update({
      status,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return findById(updated.id);
}

module.exports = {
  findById,
  findByProjectId,
  create,
  updateStatus,
};
