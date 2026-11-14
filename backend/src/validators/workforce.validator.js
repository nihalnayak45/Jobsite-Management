'use strict';

const ENUMS = require('../constants/enums');
const { isValidDate } = require('./project.validator');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateWorker(body) {
  const errors = [];
  const { name, contact, contractor_details } = body;

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Worker name is required' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Worker name must not exceed 150 characters' });
  }

  let validContact = null;
  if (contact !== undefined && contact !== null && contact !== '') {
    if (typeof contact !== 'string' || contact.trim().length > 100) {
      errors.push({ field: 'contact', message: 'Contact details must not exceed 100 characters' });
    } else {
      validContact = contact.trim();
    }
  }

  let validContractor = null;
  if (contractor_details !== undefined && contractor_details !== null && contractor_details !== '') {
    validContractor = String(contractor_details).trim();
  }

  return {
    errors,
    value: {
      name: isNonEmptyString(name) ? name.trim() : name,
      contact: validContact,
      contractor_details: validContractor,
    },
  };
}

function validateAttendance(body) {
  const errors = [];
  const { project_id, date, worker_id, status, records } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(date)) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (!isValidDate(date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
  }

  const normalizedRecords = [];

  // Check if batch records format: { project_id, date, records: [{ worker_id, status }] }
  if (records !== undefined) {
    if (!Array.isArray(records) || records.length === 0) {
      errors.push({ field: 'records', message: 'Records must be a non-empty array' });
    } else {
      records.forEach((rec, idx) => {
        const wId = Number(rec && rec.worker_id);
        const wStatus = rec && rec.status;

        if (!Number.isInteger(wId) || wId <= 0) {
          errors.push({ field: `records[${idx}].worker_id`, message: 'Worker ID must be a positive integer' });
        }
        if (!ENUMS.ATTENDANCE_STATUS.includes(wStatus)) {
          errors.push({
            field: `records[${idx}].status`,
            message: `Status must be one of: ${ENUMS.ATTENDANCE_STATUS.join(', ')}`,
          });
        }

        if (Number.isInteger(wId) && wId > 0 && ENUMS.ATTENDANCE_STATUS.includes(wStatus)) {
          normalizedRecords.push({
            project_id: parsedProjectId,
            worker_id: wId,
            date,
            status: wStatus,
          });
        }
      });
    }
  } else {
    // Single record format: { project_id, date, worker_id, status }
    const parsedWorkerId = Number(worker_id);
    if (!Number.isInteger(parsedWorkerId) || parsedWorkerId <= 0) {
      errors.push({ field: 'worker_id', message: 'Worker ID is required and must be a positive integer' });
    }

    if (!ENUMS.ATTENDANCE_STATUS.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${ENUMS.ATTENDANCE_STATUS.join(', ')}` });
    }

    if (
      Number.isInteger(parsedProjectId) &&
      parsedProjectId > 0 &&
      isValidDate(date) &&
      Number.isInteger(parsedWorkerId) &&
      parsedWorkerId > 0 &&
      ENUMS.ATTENDANCE_STATUS.includes(status)
    ) {
      normalizedRecords.push({
        project_id: parsedProjectId,
        worker_id: parsedWorkerId,
        date,
        status,
      });
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      date,
      records: normalizedRecords,
    },
  };
}

module.exports = {
  validateCreateWorker,
  validateAttendance,
};
