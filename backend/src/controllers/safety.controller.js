'use strict';

const AppError = require('../utils/AppError');
const Safety = require('../models/safety.model');
const Project = require('../models/project.model');
const ENUMS = require('../constants/enums');

/**
 * POST /api/safety
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function createSafetyRecord(req, res) {
  const { project_id, record_type, description, date, status } = req.body;

  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  const record = await Safety.create({
    project_id,
    record_type,
    description,
    date,
    status,
  });

  res.status(201).json({
    success: true,
    message: 'Safety record created successfully',
    record,
  });
}

/**
 * GET /api/safety/project/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?record_type=...
 */
async function getSafetyRecordsByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { record_type } = req.query;
  if (record_type && !ENUMS.SAFETY_RECORD_TYPE.includes(record_type)) {
    throw new AppError(
      400,
      `Record type filter must be one of: ${ENUMS.SAFETY_RECORD_TYPE.join(', ')}`
    );
  }

  const records = await Safety.findByProjectId(projectId, { record_type });

  res.status(200).json({
    success: true,
    count: records.length,
    records,
  });
}

module.exports = {
  createSafetyRecord,
  getSafetyRecordsByProject,
};
