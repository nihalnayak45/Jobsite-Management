'use strict';

const ROLES = Object.freeze(['project_manager', 'site_engineer', 'worker', 'client']);

/**
 * Single source of truth for enumerated column values.
 * Used by migrations (DB CHECK constraints) and, later, by request validators.
 */
const ENUMS = Object.freeze({
  ROLES,
  USER_ROLE: ROLES,
  PROJECT_STATUS: ['planned', 'in_progress', 'completed', 'on_hold'],
  PRIORITY: ['low', 'medium', 'high', 'critical'],
  TASK_STATUS: ['pending', 'in_progress', 'completed', 'overdue'],
  ATTENDANCE_STATUS: ['present', 'absent', 'half_day'],
  EQUIPMENT_CONDITION: ['operational', 'under_maintenance', 'damaged'],
  ISSUE_STATUS: ['open', 'in_progress', 'resolved'],
  SAFETY_RECORD_TYPE: ['safety_incident', 'quality_inspection'],
});

module.exports = ENUMS;
