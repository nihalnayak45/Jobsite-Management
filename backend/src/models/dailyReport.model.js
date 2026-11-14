'use strict';

/**
 * Data access layer for `daily_reports`.
 */
const { db } = require('../config/database');

const TABLE = 'daily_reports';

async function findById(id) {
  return db(TABLE)
    .select(
      'daily_reports.*',
      'users.name as creator_name',
      'users.email as creator_email',
      'users.role as creator_role'
    )
    .leftJoin('users', 'daily_reports.created_by', 'users.id')
    .where('daily_reports.id', id)
    .first();
}

async function findByProjectId(projectId, { date, page, limit } = {}) {
  const query = db(TABLE)
    .select(
      'daily_reports.*',
      'users.name as creator_name',
      'users.email as creator_email',
      'users.role as creator_role'
    )
    .leftJoin('users', 'daily_reports.created_by', 'users.id')
    .where('daily_reports.project_id', projectId)
    .orderBy('daily_reports.report_date', 'desc')
    .orderBy('daily_reports.created_at', 'desc');

  if (date) {
    query.where('daily_reports.report_date', date);
  }

  if (page && limit) {
    const offset = (page - 1) * limit;
    query.limit(limit).offset(offset);
  }

  return query;
}

async function create(data) {
  const [report] = await db(TABLE).insert(data).returning('*');
  return findById(report.id);
}

module.exports = {
  findById,
  findByProjectId,
  create,
};
