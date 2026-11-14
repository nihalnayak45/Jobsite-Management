'use strict';

const AppError = require('../utils/AppError');
const DailyReport = require('../models/dailyReport.model');
const Project = require('../models/project.model');
const { isValidDate } = require('../validators/project.validator');

/**
 * POST /api/reports
 * Allowed roles: 'admin', 'project_manager', 'site_engineer'
 */
async function createDailyReport(req, res) {
  const { project_id, report_date, work_summary } = req.body;

  const projectExists = await Project.exists(project_id);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${project_id} not found`);
  }

  const report = await DailyReport.create({
    project_id,
    created_by: req.user.id,
    report_date,
    work_summary,
  });

  res.status(201).json({
    success: true,
    message: 'Daily report created successfully',
    report,
  });
}

/**
 * GET /api/reports/project/:projectId
 * Allowed roles: all authenticated roles
 * Filters: ?date=...&page=...&limit=...
 */
async function getDailyReportsByProject(req, res) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError(400, 'Invalid project ID');
  }

  const projectExists = await Project.exists(projectId);
  if (!projectExists) {
    throw new AppError(404, `Project with ID ${projectId} not found`);
  }

  const { date, page, limit } = req.query;

  if (date && !isValidDate(date)) {
    throw new AppError(400, 'Date filter must be in YYYY-MM-DD format');
  }

  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : undefined;
  const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;

  const reports = await DailyReport.findByProjectId(projectId, {
    date,
    page: parsedPage,
    limit: parsedLimit,
  });

  res.status(200).json({
    success: true,
    count: reports.length,
    reports,
  });
}

module.exports = {
  createDailyReport,
  getDailyReportsByProject,
};
