'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { getClientSummary } = require('../controllers/clientSummary.controller');

const router = Router();

router.use(authenticateToken);

router.get('/summary/:projectId', asyncHandler(getClientSummary));

module.exports = router;
