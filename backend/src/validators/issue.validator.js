'use strict';

const ENUMS = require('../constants/enums');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateIssue(body) {
  const errors = [];
  const { project_id, description, priority, status } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(description)) {
    errors.push({ field: 'description', message: 'Issue description is required' });
  }

  let validPriority = 'medium';
  if (priority !== undefined && priority !== null && priority !== '') {
    if (!ENUMS.PRIORITY.includes(priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${ENUMS.PRIORITY.join(', ')}`,
      });
    } else {
      validPriority = priority;
    }
  }

  let validStatus = 'open';
  if (status !== undefined && status !== null && status !== '') {
    if (!ENUMS.ISSUE_STATUS.includes(status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${ENUMS.ISSUE_STATUS.join(', ')}`,
      });
    } else {
      validStatus = status;
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      description: isNonEmptyString(description) ? description.trim() : description,
      priority: validPriority,
      status: validStatus,
    },
  };
}

function validateUpdateIssueStatus(body) {
  const errors = [];
  const { status } = body;

  if (!isNonEmptyString(status)) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else if (!ENUMS.ISSUE_STATUS.includes(status)) {
    errors.push({
      field: 'status',
      message: `Status must be one of: ${ENUMS.ISSUE_STATUS.join(', ')}`,
    });
  }

  return {
    errors,
    value: { status },
  };
}

module.exports = {
  validateCreateIssue,
  validateUpdateIssueStatus,
};
