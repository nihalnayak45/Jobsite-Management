'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateDailyReport,
} = require('../validators/dailyReport.validator');
const {
  createDailyReport,
  getDailyReportsByProject,
} = require('../controllers/dailyReport.controller');

const router = Router();

// All daily reports routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateCreateDailyReport),
  asyncHandler(createDailyReport)
);

router.get('/project/:projectId', asyncHandler(getDailyReportsByProject));

module.exports = router;
