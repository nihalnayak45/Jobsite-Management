'use strict';

/**
 * Data access layer for `attendance`.
 */
const { db } = require('../config/database');

const TABLE = 'attendance';

async function findByProjectId(projectId, { date } = {}) {
  const query = db(TABLE)
    .select(
      'attendance.id',
      'attendance.worker_id',
      'attendance.project_id',
      'attendance.date',
      'attendance.status',
      'attendance.created_at',
      'attendance.updated_at',
      'workers.name as worker_name',
      'workers.contact as worker_contact',
      'workers.contractor_details'
    )
    .join('workers', 'attendance.worker_id', 'workers.id')
    .where('attendance.project_id', projectId)
    .orderBy('attendance.date', 'desc')
    .orderBy('workers.name', 'asc');

  if (date) {
    query.where('attendance.date', date);
  }

  return query;
}

/**
 * Upserts a single or multiple attendance records respecting the unique constraint
 * (worker_id, project_id, date).
 * @param {Array<{ worker_id: number, project_id: number, date: string, status: string }>} records
 */
async function upsertRecords(records) {
  if (!records || records.length === 0) return [];

  // PostgreSQL onConflict upsert
  const query = db(TABLE)
    .insert(records)
    .onConflict(['worker_id', 'project_id', 'date'])
    .merge({
      status: db.raw('EXCLUDED.status'),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return query;
}

module.exports = {
  findByProjectId,
  upsertRecords,
};
