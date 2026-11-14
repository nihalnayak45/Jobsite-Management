'use strict';

const ENUMS = require('../constants/enums');
const { isValidDate } = require('./project.validator');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateTask(body) {
  const errors = [];
  const { project_id, title, deadline, priority, assigned_user_id } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(title)) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.trim().length > 255) {
    errors.push({ field: 'title', message: 'Title must not exceed 255 characters' });
  }

  let validDeadline = null;
  if (deadline !== undefined && deadline !== null && deadline !== '') {
    if (!isValidDate(deadline)) {
      errors.push({ field: 'deadline', message: 'Deadline must be in YYYY-MM-DD format' });
    } else {
      validDeadline = deadline;
    }
  }

  let validPriority = 'medium';
  if (priority !== undefined && priority !== null && priority !== '') {
    if (!ENUMS.PRIORITY.includes(priority)) {
      errors.push({ field: 'priority', message: `Priority must be one of: ${ENUMS.PRIORITY.join(', ')}` });
    } else {
      validPriority = priority;
    }
  }

  let validAssignedUserId = null;
  if (assigned_user_id !== undefined && assigned_user_id !== null && assigned_user_id !== '') {
    const parsed = Number(assigned_user_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push({ field: 'assigned_user_id', message: 'Assigned User ID must be a positive integer' });
    } else {
      validAssignedUserId = parsed;
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      title: isNonEmptyString(title) ? title.trim() : title,
      deadline: validDeadline,
      priority: validPriority,
      assigned_user_id: validAssignedUserId,
    },
  };
}

function validateUpdateTaskStatus(body) {
  const errors = [];
  const { status, completion_percentage } = body;
  const value = {};

  if (status === undefined && completion_percentage === undefined) {
    errors.push({
      field: 'status',
      message: 'At least one of status or completion_percentage must be provided',
    });
  }

  if (status !== undefined) {
    if (!ENUMS.TASK_STATUS.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${ENUMS.TASK_STATUS.join(', ')}` });
    } else {
      value.status = status;
    }
  }

  if (completion_percentage !== undefined) {
    const parsedPct = Number(completion_percentage);
    if (!Number.isInteger(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      errors.push({ field: 'completion_percentage', message: 'Completion percentage must be an integer between 0 and 100' });
    } else {
      value.completion_percentage = parsedPct;
      // Requirement: If completion_percentage === 100, automatically update status to 'completed'
      if (parsedPct === 100) {
        value.status = 'completed';
      }
    }
  }

  return { errors, value };
}

module.exports = {
  validateCreateTask,
  validateUpdateTaskStatus,
};
