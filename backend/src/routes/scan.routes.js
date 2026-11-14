'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { handleScanAction } = require('../controllers/scan.controller');

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/scan/action
 * Validates project access and executes quick actions from QR codes.
 */
router.post('/action', asyncHandler(handleScanAction));

module.exports = router;

