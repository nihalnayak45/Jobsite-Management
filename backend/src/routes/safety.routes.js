'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateSafetyRecord,
} = require('../validators/safety.validator');
const {
  createSafetyRecord,
  getSafetyRecordsByProject,
} = require('../controllers/safety.controller');

const router = Router();

// All safety routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateCreateSafetyRecord),
  asyncHandler(createSafetyRecord)
);

router.get('/project/:projectId', asyncHandler(getSafetyRecordsByProject));

module.exports = router;
