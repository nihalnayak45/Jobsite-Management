'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  validateCreateIssue,
  validateUpdateIssueStatus,
} = require('../validators/issue.validator');
const {
  createIssue,
  getIssuesByProject,
  updateIssueStatus,
} = require('../controllers/issue.controller');

const router = Router();

// All issues routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('worker', 'site_engineer', 'project_manager'),
  validate(validateCreateIssue),
  asyncHandler(createIssue)
);

router.get('/project/:projectId', asyncHandler(getIssuesByProject));

router.patch(
  '/:id/status',
  authorizeRoles('project_manager', 'site_engineer'),
  validate(validateUpdateIssueStatus),
  asyncHandler(updateIssueStatus)
);

module.exports = router;
