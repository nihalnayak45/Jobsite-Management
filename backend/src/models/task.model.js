'use strict';

/**
 * Data access layer for `tasks`.
 */
const { db } = require('../config/database');

const TABLE = 'tasks';

const BASE_COLUMNS = [
  'tasks.id',
  'tasks.project_id',
  'tasks.assigned_user_id',
  'tasks.title',
  'tasks.deadline',
  'tasks.priority',
  'tasks.status',
  'tasks.completion_percentage',
  'tasks.created_at',
  'tasks.updated_at',
];

async function findById(id) {
  return db(TABLE)
    .select(
      ...BASE_COLUMNS,
      'users.name as assigned_user_name',
      'users.email as assigned_user_email'
    )
    .leftJoin('users', 'tasks.assigned_user_id', 'users.id')
    .where('tasks.id', id)
    .first();
}

async function findByProjectId(projectId, { status, priority, assigned_user_id } = {}) {
  const query = db(TABLE)
    .select(
      ...BASE_COLUMNS,
      'users.name as assigned_user_name',
      'users.email as assigned_user_email'
    )
    .leftJoin('users', 'tasks.assigned_user_id', 'users.id')
    .where('tasks.project_id', projectId)
    .orderBy('tasks.created_at', 'asc');

  if (status) query.where('tasks.status', status);
  if (priority) query.where('tasks.priority', priority);
  if (assigned_user_id !== undefined && assigned_user_id !== null) {
    query.where('tasks.assigned_user_id', assigned_user_id);
  }

  return query;
}

async function create(data) {
  const [task] = await db(TABLE).insert(data).returning('*');
  return task;
}

async function updateStatus(id, { status, completion_percentage }) {
  const updates = { updated_at: db.fn.now() };
  if (status !== undefined) updates.status = status;
  if (completion_percentage !== undefined) updates.completion_percentage = completion_percentage;

  const [task] = await db(TABLE)
    .where({ id })
    .update(updates)
    .returning('*');
  return task;
}

module.exports = {
  findById,
  findByProjectId,
  create,
  updateStatus,
};
