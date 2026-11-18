'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  validateCreateProject,
  validateUpdateProject,
} = require('../validators/project.validator');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  assignEngineerToProject,
  removeEngineerFromProject,
  getProjectEngineers,
  getAvailableSiteEngineers,
} = require('../controllers/project.controller');

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager'),
  validate(validateCreateProject),
  asyncHandler(createProject)
);

router.get('/', asyncHandler(getProjects));

router.get(
  '/available-engineers',
  authorizeRoles('project_manager', 'admin'),
  asyncHandler(getAvailableSiteEngineers)
);

router.get('/:id', asyncHandler(getProjectById));

router.put(
  '/:id',
  authorizeRoles('project_manager'),
  validate(validateUpdateProject),
  asyncHandler(updateProject)
);

router.patch(
  '/:id',
  authorizeRoles('project_manager'),
  validate(validateUpdateProject),
  asyncHandler(updateProject)
);

// Site engineer assignment routes
router.post(
  '/:id/assign-engineer',
  authorizeRoles('project_manager'),
  asyncHandler(assignEngineerToProject)
);

router.delete(
  '/:id/assign-engineer/:engineerId',
  authorizeRoles('project_manager'),
  asyncHandler(removeEngineerFromProject)
);

router.get(
  '/:id/engineers',
  asyncHandler(getProjectEngineers)
);

module.exports = router;
