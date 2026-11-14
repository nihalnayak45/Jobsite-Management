'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateWorker,
  validateAttendance,
} = require('../validators/workforce.validator');
const {
  registerWorker,
  getWorkers,
  recordAttendance,
  getProjectAttendance,
} = require('../controllers/workforce.controller');

const router = Router();

// All workforce routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateCreateWorker),
  asyncHandler(registerWorker)
);

router.get('/', asyncHandler(getWorkers));

router.post(
  '/attendance',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateAttendance),
  asyncHandler(recordAttendance)
);

router.get('/attendance/:projectId', asyncHandler(getProjectAttendance));

module.exports = router;
