'use strict';

const AppError = require('../utils/AppError');
const Worker = require('../models/worker.model');
const Attendance = require('../models/attendance.model');
const Project = require('../models/project.model');
const { isValidDate } = require('../validators/project.validator');

/**
 * POST /api/workforce
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function registerWorker(req, res) {
  const { name, contact, contractor_details } = req.body;

  const worker = await Worker.create({
    name,
    contact,
    contractor_details,
  });

  res.status(201).json({
    success: true,
    message: 'Worker registered successfully',
    worker,
  });
}

/**
 * GET /api/workforce
 * Allowed roles: all authenticated roles
 * Filters: ?search=...
 */
async function getWorkers(req, res) {
  const { search } = req.query;

  const workers = await Worker.findAll({ search });

  res.status(200).json({
    success: true,
    count: workers.length,
    workers,
  });
}

/**
 * POST /api/workforce/attendance
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 * Upserts single or batch records.
 */
async function recordAttendance(req, res) {
  const { project_id, date, records } = req.body;

  // Verify project exists
  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  if (!records || records.length === 0) {
    throw new AppError(400, 'No attendance records provided');
  }

  // Validate that all referenced workers exist
  for (const rec of records) {
    const workerExists = await Worker.exists(rec.worker_id);
    if (!workerExists) {
      throw new AppError(400, `Worker with ID ${rec.worker_id} not found`);
    }
  }

  // Ensure project_id and date are populated on each record for DB upsert
  const recordsToInsert = records.map((rec) => ({
    project_id: Number(rec.project_id || project_id),
    worker_id: Number(rec.worker_id),
    date: rec.date || date,
    status: rec.status,
  }));

  const results = await Attendance.upsertRecords(recordsToInsert);

  res.status(200).json({
    success: true,
    message: 'Attendance recorded successfully',
    count: results.length,
    attendance: results,
  });
}

/**
 * GET /api/workforce/attendance/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?date=YYYY-MM-DD
 */
async function getProjectAttendance(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { date } = req.query;
  if (date && !isValidDate(date)) {
    throw new AppError(400, 'Date filter must be in YYYY-MM-DD format');
  }

  const attendance = await Attendance.findByProjectId(projectId, { date });

  res.status(200).json({
    success: true,
    count: attendance.length,
    attendance,
  });
}

module.exports = {
  registerWorker,
  getWorkers,
  recordAttendance,
  getProjectAttendance,
};
