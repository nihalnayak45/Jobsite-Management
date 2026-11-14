'use strict';

const AppError = require('../utils/AppError');
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');

/**
 * POST /api/tasks
 * Allowed roles: 'admin', 'project_manager'
 */
async function createTask(req, res) {
  const { project_id, title, deadline, priority, assigned_user_id } = req.body;

  // Verify project exists
  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  // Verify assigned user exists if provided
  if (assigned_user_id) {
    const user = await User.findById(assigned_user_id);
    if (!user) {
      throw new AppError(400, `Assigned user with ID ${assigned_user_id} not found`);
    }
  }

  const task = await Task.create({
    project_id,
    title,
    deadline,
    priority,
    assigned_user_id,
    status: 'pending',
    completion_percentage: 0,
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    task,
  });
}

/**
 * GET /api/tasks/project/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?status=...&priority=...&assigned_user_id=...
 */
async function getTasksByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { status, priority, assigned_user_id } = req.query;

  let parsedAssignedId = null;
  if (assigned_user_id !== undefined && assigned_user_id !== null && assigned_user_id !== '') {
    const parsed = Number(assigned_user_id);
    if (Number.isInteger(parsed) && parsed > 0) {
      parsedAssignedId = parsed;
    }
  }

  const tasks = await Task.findByProjectId(projectId, {
    status,
    priority,
    assigned_user_id: parsedAssignedId,
  });

  res.status(200).json({
    success: true,
    count: tasks.length,
    tasks,
  });
}

/**
 * PATCH /api/tasks/:id/status
 * Allowed roles: 'admin', 'project_manager', 'site_engineer', 'worker'
 */
async function updateTaskStatus(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid task ID');
  }

  const task = await Task.findById(id);
  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  // Worker authorization rule: A 'worker' can ONLY update this task if task.assigned_user_id === req.user.id
  if (req.user.role === 'worker') {
    if (task.assigned_user_id !== req.user.id) {
      throw new AppError(403, 'Forbidden: insufficient permissions to update tasks assigned to other users');
    }
  }

  const { status, completion_percentage } = req.body;

  const updatedTask = await Task.updateStatus(id, {
    status,
    completion_percentage,
  });

  res.status(200).json({
    success: true,
    message: 'Task status updated successfully',
    task: updatedTask,
  });
}

module.exports = {
  createTask,
  getTasksByProject,
  updateTaskStatus,
};
