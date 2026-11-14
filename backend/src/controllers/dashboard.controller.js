'use strict';

const AppError = require('../utils/AppError');
const { getProjectDashboard } = require('../services/dashboard.service');

/**
 * GET /api/dashboard/:projectId
 * Allowed roles: 'admin', 'project_manager', 'site_engineer', 'worker', 'client'
 */
async function getDashboard(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const data = await getProjectDashboard(projectId);
  if (!data) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  res.status(200).json({
    success: true,
    data,
  });
}

module.exports = {
  getDashboard,
};
