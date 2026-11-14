'use strict';

const AppError = require('../utils/AppError');
const { getProjectAlerts } = require('../services/notification.service');

/**
 * GET /api/notifications/project/:projectId
 * Allowed roles: all authenticated roles
 */
async function getNotifications(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const alerts = await getProjectAlerts(projectId);
  if (!alerts) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  res.status(200).json({
    success: true,
    count: alerts.length,
    alerts,
  });
}

module.exports = {
  getNotifications,
};
