'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getMaterialAnalytics,
  getProgressAnalytics,
} = require('../controllers/analytics.controller');

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/analytics/materials/:projectId
 * Consumption history and stock depletion forecasting.
 */
router.get('/materials/:projectId', asyncHandler(getMaterialAnalytics));

/**
 * GET /api/analytics/progress/:projectId
 * Planned vs. Actual S-Curve, milestone task breakdown, defects priority, and attendance.
 */
router.get('/progress/:projectId', asyncHandler(getProgressAnalytics));

module.exports = router;

