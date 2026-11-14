'use strict';

const ENUMS = require('../constants/enums');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateEquipment(body) {
  const errors = [];
  const { project_id, name, availability, condition } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Equipment name is required' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Equipment name must not exceed 150 characters' });
  }

  let validAvailability = true;
  if (availability !== undefined && availability !== null && availability !== '') {
    if (typeof availability === 'boolean') {
      validAvailability = availability;
    } else if (['true', '1', 'available', 'operational'].includes(String(availability).toLowerCase())) {
      validAvailability = true;
    } else if (['false', '0', 'in_use', 'unavailable', 'maintenance'].includes(String(availability).toLowerCase())) {
      validAvailability = false;
    } else {
      errors.push({ field: 'availability', message: 'Availability must be a boolean' });
    }
  }

  let validCondition = 'operational';
  if (condition !== undefined && condition !== null && condition !== '') {
    if (!ENUMS.EQUIPMENT_CONDITION.includes(condition)) {
      errors.push({
        field: 'condition',
        message: `Condition must be one of: ${ENUMS.EQUIPMENT_CONDITION.join(', ')}`,
      });
    } else {
      validCondition = condition;
    }
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      name: isNonEmptyString(name) ? name.trim() : name,
      availability: validAvailability,
      condition: validCondition,
    },
  };
}

function validateUpdateEquipment(body) {
  const errors = [];
  const { availability, condition } = body;
  const value = {};

  if (availability === undefined && condition === undefined) {
    errors.push({
      field: 'condition',
      message: 'At least one of availability or condition must be provided',
    });
  }

  if (availability !== undefined) {
    if (typeof availability === 'boolean') {
      value.availability = availability;
    } else if (['true', '1', 'available', 'operational'].includes(String(availability).toLowerCase())) {
      value.availability = true;
    } else if (['false', '0', 'in_use', 'unavailable', 'maintenance'].includes(String(availability).toLowerCase())) {
      value.availability = false;
    } else {
      errors.push({ field: 'availability', message: 'Availability must be a boolean' });
    }
  }

  if (condition !== undefined) {
    if (!ENUMS.EQUIPMENT_CONDITION.includes(condition)) {
      errors.push({
        field: 'condition',
        message: `Condition must be one of: ${ENUMS.EQUIPMENT_CONDITION.join(', ')}`,
      });
    } else {
      value.condition = condition;
    }
  }

  return { errors, value };
}

module.exports = {
  validateCreateEquipment,
  validateUpdateEquipment,
};
