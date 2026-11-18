'use strict';

/**
 * Data access layer for `projects`.
 */
const { db } = require('../config/database');

const TABLE = 'projects';

const BASE_COLUMNS = [
  'projects.id',
  'projects.project_name',
  'projects.location',
  'projects.start_date',
  'projects.end_date',
  'projects.manager_id',
  'projects.status',
  'projects.created_at',
  'projects.updated_at',
];

async function findById(id) {
  return db(TABLE)
    .select(
      ...BASE_COLUMNS,
      'users.name as manager_name',
      'users.email as manager_email'
    )
    .leftJoin('users', 'projects.manager_id', 'users.id')
    .where('projects.id', id)
    .first();
}

async function findAll({ status, manager_id, site_engineer_id, isClient = false } = {}) {
  const query = db(TABLE)
    .select(
      ...BASE_COLUMNS,
      'users.name as manager_name',
      'users.email as manager_email'
    )
    .leftJoin('users', 'projects.manager_id', 'users.id')
    .orderBy('projects.created_at', 'desc');

  if (status) {
    query.where('projects.status', status);
  } else if (isClient) {
    // If user is client and no explicit status given, show active projects
    query.whereIn('projects.status', ['planned', 'in_progress']);
  }

  if (manager_id) {
    query.where('projects.manager_id', manager_id);
  }

  if (site_engineer_id) {
    query.whereIn('projects.id', function () {
      this.select('project_id')
        .from('project_site_engineers')
        .where('site_engineer_id', site_engineer_id);
    });
  }

  return query;
}

async function create(data) {
  const [project] = await db(TABLE).insert(data).returning('*');
  return project;
}

async function update(id, data) {
  const [project] = await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return project;
}

async function exists(id) {
  const row = await db(TABLE).select('id').where({ id }).first();
  return Boolean(row);
}

module.exports = {
  findById,
  findAll,
  create,
  update,
  exists,
};
