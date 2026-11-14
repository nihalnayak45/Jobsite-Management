'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { getNotifications } = require('../controllers/notification.controller');

const router = Router();

router.use(authenticateToken);

router.get('/project/:projectId', asyncHandler(getNotifications));

module.exports = router;
