'use strict';

const AppError = require('../utils/AppError');
const Issue = require('../models/issue.model');
const Project = require('../models/project.model');
const ProjectSiteEngineer = require('../models/projectSiteEngineer.model');

/**
 * POST /api/issues
 * Allowed roles: 'project_manager', 'site_engineer', 'worker'
 */
async function createIssue(req, res) {
  const { project_id, description, priority, status } = req.body;

  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  const issue = await Issue.create({
    project_id,
    reported_by: req.user.id,
    description,
    priority,
    status,
  });

  res.status(201).json({
    success: true,
    message: 'Issue reported successfully',
    issue,
  });
}

/**
 * GET /api/issues/project/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?status=...&priority=...
 */
async function getIssuesByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { status, priority } = req.query;

  const issues = await Issue.findByProjectId(projectId, { status, priority });

  res.status(200).json({
    success: true,
    count: issues.length,
    issues,
  });
}

/**
 * PATCH /api/issues/:id/status
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function updateIssueStatus(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid issue ID');
  }

  const existing = await Issue.findById(id);
  if (!existing) {
    throw new AppError(404, 'Issue not found');
  }

  // Verify project-level access for PM or assigned site_engineer
  if (req.user.role === 'project_manager') {
    const project = await Project.findById(existing.project_id);
    if (!project || Number(project.manager_id) !== Number(req.user.id)) {
      throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
    }
  } else if (req.user.role === 'site_engineer') {
    const assigned = await ProjectSiteEngineer.isEngineerAssigned(existing.project_id, req.user.id);
    if (!assigned) {
      throw new AppError(403, 'Forbidden: You are not assigned to manage this project');
    }
  }

  const { status } = req.body;
  const updated = await Issue.updateStatus(id, status);

  res.status(200).json({
    success: true,
    message: 'Issue status updated successfully',
    issue: updated,
  });
}

module.exports = {
  createIssue,
  getIssuesByProject,
  updateIssueStatus,
};
