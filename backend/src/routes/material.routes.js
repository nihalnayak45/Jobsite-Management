'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateMaterial,
  validateUpdateStock,
} = require('../validators/material.validator');
const {
  createMaterial,
  getMaterialsByProject,
  getMaterialById,
  updateStock,
  getMaterialBurnRate,
  quickLogTransaction,
  getMaterialQR,
} = require('../controllers/material.controller');

const router = Router();

// All materials routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateCreateMaterial),
  asyncHandler(createMaterial)
);

router.get('/project/:projectId', asyncHandler(getMaterialsByProject));

// Single material details
router.get('/:id', asyncHandler(getMaterialById));

// QR code generation for material bins/pallets
router.get('/:id/qr', asyncHandler(getMaterialQR));

// Burn-Rate analytics & Runway forecasting
router.get('/project/:projectId/burn-rate', asyncHandler(getMaterialBurnRate));

// Quick QR-driven material transaction logging
router.post(
  '/:id/transactions',
  authorizeRoles('project_manager', 'site_engineer', 'worker'),
  asyncHandler(quickLogTransaction)
);

router.patch(
  '/:id/stock',
  authorizeRoles('project_manager', 'site_engineer'),
  validate(validateUpdateStock),
  asyncHandler(updateStock)
);

module.exports = router;
