'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { getDashboard } = require('../controllers/dashboard.controller');

const router = Router();

router.use(authenticateToken);

router.get('/:projectId', asyncHandler(getDashboard));

module.exports = router;
