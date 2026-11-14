'use strict';

const AppError = require('../utils/AppError');
const { getClientProgressSummary } = require('../services/clientSummary.service');

/**
 * GET /api/client/summary/:projectId
 * Allowed roles: all authenticated roles (tailored for 'client', 'admin', 'project_manager')
 */
async function getClientSummary(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const summary = await getClientProgressSummary(projectId);
  if (!summary) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  res.status(200).json({
    success: true,
    data: summary,
  });
}

module.exports = {
  getClientSummary,
};
