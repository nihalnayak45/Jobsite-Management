'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { requireProjectAccess } = require('../middlewares/projectAccess.middleware');
const {
  validateCreateEquipment,
  validateUpdateEquipment,
} = require('../validators/equipment.validator');
const {
  createEquipment,
  getEquipmentByProject,
  getEquipmentById,
  updateEquipment,
  toggleCheckout,
  getEquipmentQR,
} = require('../controllers/equipment.controller');

const router = Router();

// All equipment routes require authentication
router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('project_manager', 'site_engineer'),
  requireProjectAccess,
  validate(validateCreateEquipment),
  asyncHandler(createEquipment)
);

router.get('/project/:projectId', asyncHandler(getEquipmentByProject));

router.get('/:id/qr', asyncHandler(getEquipmentQR));

router.get('/:id', asyncHandler(getEquipmentById));

// Single-tap QR checkout / check-in
router.post(
  '/:id/toggle-checkout',
  authorizeRoles('project_manager', 'site_engineer', 'worker'),
  asyncHandler(toggleCheckout)
);

router.patch(
  '/:id',
  authorizeRoles('project_manager', 'site_engineer'),
  validate(validateUpdateEquipment),
  asyncHandler(updateEquipment)
);

module.exports = router;
