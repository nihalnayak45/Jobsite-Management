'use strict';

const { isValidDate } = require('./project.validator');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateCreateDailyReport(body) {
  const errors = [];
  const { project_id, report_date, work_summary } = body;

  const parsedProjectId = Number(project_id);
  if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
    errors.push({ field: 'project_id', message: 'Project ID is required and must be a positive integer' });
  }

  if (!isNonEmptyString(report_date)) {
    errors.push({ field: 'report_date', message: 'Report date is required' });
  } else if (!isValidDate(report_date)) {
    errors.push({ field: 'report_date', message: 'Report date must be in YYYY-MM-DD format' });
  }

  if (!isNonEmptyString(work_summary)) {
    errors.push({ field: 'work_summary', message: 'Work summary is required' });
  }

  return {
    errors,
    value: {
      project_id: parsedProjectId,
      report_date,
      work_summary: isNonEmptyString(work_summary) ? work_summary.trim() : work_summary,
    },
  };
}

module.exports = {
  validateCreateDailyReport,
};
