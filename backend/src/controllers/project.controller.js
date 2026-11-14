'use strict';

const AppError = require('../utils/AppError');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const ProjectSiteEngineer = require('../models/projectSiteEngineer.model');

/**
 * POST /api/projects
 * Allowed roles: 'project_manager'
 */
async function createProject(req, res) {
  const { project_name, location, start_date, end_date, status } = req.body;
  let { manager_id } = req.body;

  // Default manager_id to req.user.id if omitted
  if (!manager_id) {
    manager_id = req.user.id;
  } else {
    // Verify specified manager exists
    const manager = await User.findById(manager_id);
    if (!manager) {
      throw new AppError(400, `Assigned manager with ID ${manager_id} does not exist`);
    }
  }

  const project = await Project.create({
    project_name,
    location,
    start_date,
    end_date,
    manager_id,
    status,
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    project,
  });
}

/**
 * GET /api/projects
 * Allowed roles: all authenticated roles
 * Filters: ?status=...&manager_id=...
 */
async function getProjects(req, res) {
  const { status, manager_id } = req.query;
  const isClient = req.user.role === 'client';

  let parsedManagerId = null;
  if (manager_id) {
    const parsed = Number(manager_id);
    if (Number.isInteger(parsed) && parsed > 0) {
      parsedManagerId = parsed;
    }
  }

  const projects = await Project.findAll({
    status,
    manager_id: parsedManagerId,
    isClient,
  });

  res.status(200).json({
    success: true,
    count: projects.length,
    projects,
  });
}

/**
 * GET /api/projects/:id
 * Allowed roles: all authenticated roles
 */
async function getProjectById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const project = await Project.findById(id);
  if (!project) {
    throw new AppError(404, 'Project not found');
  }

  res.status(200).json({
    success: true,
    project,
  });
}

/**
 * PUT/PATCH /api/projects/:id
 * Allowed roles: 'admin', 'project_manager'
 */
async function updateProject(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const existing = await Project.findById(id);
  if (!existing) {
    throw new AppError(404, 'Project not found');
  }

  const updates = { ...req.body };

  // Validate start_date / end_date consistency if only one date is updated
  const newStartDate = updates.start_date || existing.start_date;
  const newEndDate = updates.end_date !== undefined ? updates.end_date : existing.end_date;
  if (newStartDate && newEndDate && new Date(newEndDate) < new Date(newStartDate)) {
    throw new AppError(400, 'End date must be greater than or equal to start date');
  }

  if (updates.manager_id) {
    const manager = await User.findById(updates.manager_id);
    if (!manager) {
      throw new AppError(400, `Assigned manager with ID ${updates.manager_id} does not exist`);
    }
  }

  const project = await Project.update(id, updates);

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    project,
  });
}

/**
 * POST /api/projects/:id/assign-engineer
 * Allowed roles: 'project_manager'
 * Body: { site_engineer_id }
 */
async function assignEngineerToProject(req, res) {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError(404, 'Project not found');
  }

  const rawEngineerId = req.body.site_engineer_id || req.body.siteEngineerId;
  const siteEngineerId = Number(rawEngineerId);
  if (!Number.isInteger(siteEngineerId) || siteEngineerId <= 0) {
    throw new AppError(400, 'Invalid or missing site_engineer_id');
  }

  const targetUser = await User.findById(siteEngineerId);
  if (!targetUser) {
    throw new AppError(404, `User with ID ${siteEngineerId} not found`);
  }

  if (targetUser.role !== 'site_engineer') {
    throw new AppError(400, `Target user must have the role 'site_engineer', found '${targetUser.role}'`);
  }

  if (!targetUser.is_active) {
    throw new AppError(400, 'Target user account is deactivated');
  }

  const assignment = await ProjectSiteEngineer.assignEngineer(projectId, siteEngineerId);

  res.status(201).json({
    success: true,
    message: 'Site engineer assigned successfully',
    assignment,
  });
}

/**
 * DELETE /api/projects/:id/assign-engineer/:engineerId
 * Allowed roles: 'project_manager'
 */
async function removeEngineerFromProject(req, res) {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, 'Project not found');
  }

  const engineerId = Number(req.params.engineerId);
  if (!Number.isInteger(engineerId) || engineerId <= 0) {
    throw new AppError(400, 'Invalid site engineer ID');
  }

  await ProjectSiteEngineer.removeEngineer(projectId, engineerId);

  res.status(200).json({
    success: true,
    message: 'Site engineer removed from project successfully',
  });
}

/**
 * GET /api/projects/:id/engineers
 * Allowed roles: all authenticated roles
 */
async function getProjectEngineers(req, res) {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, 'Project not found');
  }

  const engineers = await ProjectSiteEngineer.getEngineersByProject(projectId);

  res.status(200).json({
    success: true,
    count: engineers.length,
    engineers,
  });
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  assignEngineerToProject,
  removeEngineerFromProject,
  getProjectEngineers,
};
