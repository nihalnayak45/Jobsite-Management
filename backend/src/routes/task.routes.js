'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateTask,
  validateUpdateTaskStatus,
} = require('../validators/task.validator');
const {
  createTask,
  getTasksByProject,
  updateTaskStatus,
} = require('../controllers/task.controller');

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager'),
  requireProjectAccess,
  validate(validateCreateTask),
  asyncHandler(createTask)
);

router.get('/project/:projectId', asyncHandler(getTasksByProject));

router.patch(
  '/:id/status',
  authorizeRoles('project_manager', 'site_engineer', 'worker'),
  validate(validateUpdateTaskStatus),
  asyncHandler(updateTaskStatus)
);

module.exports = router;
