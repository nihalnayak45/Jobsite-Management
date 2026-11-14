'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { getHealth } = require('../controllers/health.controller');

const router = Router();

router.get('/', asyncHandler(getHealth));

module.exports = router;
