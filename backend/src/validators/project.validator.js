'use strict';

const ENUMS = require('../constants/enums');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}

function validateCreateProject(body) {
  const errors = [];
  const { project_name, location, start_date, end_date, manager_id, status } = body;

  if (!isNonEmptyString(project_name)) {
    errors.push({ field: 'project_name', message: 'Project name is required' });
  } else if (project_name.trim().length > 200) {
    errors.push({ field: 'project_name', message: 'Project name must not exceed 200 characters' });
  }

  if (!isNonEmptyString(location)) {
    errors.push({ field: 'location', message: 'Location is required' });
  } else if (location.trim().length > 255) {
    errors.push({ field: 'location', message: 'Location must not exceed 255 characters' });
  }

  if (!isNonEmptyString(start_date)) {
    errors.push({ field: 'start_date', message: 'Start date is required' });
  } else if (!isValidDate(start_date)) {
    errors.push({ field: 'start_date', message: 'Start date must be a valid date in YYYY-MM-DD format' });
  }

  let validEndDate = null;
  if (end_date !== undefined && end_date !== null && end_date !== '') {
    if (!isValidDate(end_date)) {
      errors.push({ field: 'end_date', message: 'End date must be a valid date in YYYY-MM-DD format' });
    } else if (isValidDate(start_date) && new Date(end_date) < new Date(start_date)) {
      errors.push({ field: 'end_date', message: 'End date must be greater than or equal to start date' });
    } else {
      validEndDate = end_date;
    }
  }

  let validManagerId = null;
  if (manager_id !== undefined && manager_id !== null && manager_id !== '') {
    const parsed = Number(manager_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push({ field: 'manager_id', message: 'Manager ID must be a positive integer' });
    } else {
      validManagerId = parsed;
    }
  }

  let validStatus = 'planned';
  if (status !== undefined && status !== null && status !== '') {
    if (!ENUMS.PROJECT_STATUS.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${ENUMS.PROJECT_STATUS.join(', ')}` });
    } else {
      validStatus = status;
    }
  }

  return {
    errors,
    value: {
      project_name: isNonEmptyString(project_name) ? project_name.trim() : project_name,
      location: isNonEmptyString(location) ? location.trim() : location,
      start_date,
      end_date: validEndDate,
      manager_id: validManagerId,
      status: validStatus,
    },
  };
}

function validateUpdateProject(body) {
  const errors = [];
  const { project_name, location, start_date, end_date, manager_id, status } = body;
  const value = {};

  if (project_name !== undefined) {
    if (!isNonEmptyString(project_name)) {
      errors.push({ field: 'project_name', message: 'Project name cannot be empty' });
    } else if (project_name.trim().length > 200) {
      errors.push({ field: 'project_name', message: 'Project name must not exceed 200 characters' });
    } else {
      value.project_name = project_name.trim();
    }
  }

  if (location !== undefined) {
    if (!isNonEmptyString(location)) {
      errors.push({ field: 'location', message: 'Location cannot be empty' });
    } else if (location.trim().length > 255) {
      errors.push({ field: 'location', message: 'Location must not exceed 255 characters' });
    } else {
      value.location = location.trim();
    }
  }

  if (start_date !== undefined) {
    if (!isValidDate(start_date)) {
      errors.push({ field: 'start_date', message: 'Start date must be in YYYY-MM-DD format' });
    } else {
      value.start_date = start_date;
    }
  }

  if (end_date !== undefined) {
    if (end_date === null || end_date === '') {
      value.end_date = null;
    } else if (!isValidDate(end_date)) {
      errors.push({ field: 'end_date', message: 'End date must be in YYYY-MM-DD format' });
    } else {
      value.end_date = end_date;
    }
  }

  if (value.start_date && value.end_date && new Date(value.end_date) < new Date(value.start_date)) {
    errors.push({ field: 'end_date', message: 'End date must be greater than or equal to start date' });
  }

  if (manager_id !== undefined) {
    const parsed = Number(manager_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push({ field: 'manager_id', message: 'Manager ID must be a positive integer' });
    } else {
      value.manager_id = parsed;
    }
  }

  if (status !== undefined) {
    if (!ENUMS.PROJECT_STATUS.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${ENUMS.PROJECT_STATUS.join(', ')}` });
    } else {
      value.status = status;
    }
  }

  return { errors, value };
}

module.exports = {
  validateCreateProject,
  validateUpdateProject,
  isValidDate,
};
