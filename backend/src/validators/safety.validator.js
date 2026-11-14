'use strict';

const ENUMS = require('../constants/enums');
const { isValidDate } = require('./project.validator');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateSafetyRecord(body) {
  const errors = [];
  const { project_id, record_type, description, date, status } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(record_type)) {
    errors.push({ field: 'record_type', message: 'Record type is required' });
  } else if (!ENUMS.SAFETY_RECORD_TYPE.includes(record_type)) {
    errors.push({
      field: 'record_type',
      message: `Record type must be one of: ${ENUMS.SAFETY_RECORD_TYPE.join(', ')}`,
    });
  }

  if (!isNonEmptyString(description)) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (!isNonEmptyString(date)) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (!isValidDate(date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
  }

  let validStatus = 'open';
  if (status !== undefined && status !== null && status !== '') {
    if (typeof status !== 'string' || status.trim().length > 50) {
      errors.push({ field: 'status', message: 'Status must not exceed 50 characters' });
    } else {
      validStatus = status.trim();
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      record_type,
      description: isNonEmptyString(description) ? description.trim() : description,
      date,
      status: validStatus,
    },
  };
}

module.exports = {
  validateCreateSafetyRecord,
};
