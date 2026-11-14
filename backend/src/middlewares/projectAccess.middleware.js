'use strict';

const AppError = require('../utils/AppError');
const asyncHandler = require('./asyncHandler');
const Project = require('../models/project.model');
const ProjectSiteEngineer = require('../models/projectSiteEngineer.model');

/**
 * Extracts project ID dynamically from request params or body:
 * Checks req.params.projectId, req.params.id, or req.body.project_id.
 */
function extractProjectId(req) {
  const rawId =
    (req.params && (req.params.projectId || req.params.id)) ||
    (req.body && req.body.project_id);

  if (rawId === undefined || rawId === null || rawId === '') {
    return null;
  }

  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Middleware ensuring the authenticated user has management access to the project:
 * - project_manager: must be the manager of the specified project (project.manager_id === req.user.id)
 * - site_engineer: must be explicitly assigned to the project in project_site_engineers
 *
 * Responds with 403 Forbidden if neither condition is met.
 */
const requireProjectAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized: authentication required');
  }

  const projectId = extractProjectId(req);
  if (!projectId) {
    throw new AppError(400, 'Invalid or missing project ID');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  let hasAccess = false;

  if (req.user.role === 'admin') {
    hasAccess = true;
  } else if (req.user.role === 'project_manager') {
    // Project manager must be the designated manager of this project
    hasAccess = Number(project.manager_id) === Number(req.user.id);
  } else if (req.user.role === 'site_engineer') {
    // Site engineer must be assigned in project_site_engineers
    hasAccess = await ProjectSiteEngineer.isEngineerAssigned(projectId, req.user.id);
  }

  if (!hasAccess) {
    throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
  }

  req.project = project;
  next();
});

module.exports = {
  requireProjectAccess,
  extractProjectId,
};

