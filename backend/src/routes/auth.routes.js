'use strict';

const { Router } = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const { register, login, me } = require('../controllers/auth.controller');

const router = Router();

// Routes
router.post('/register', validate(validateRegister), asyncHandler(register));
router.post('/login', validate(validateLogin), asyncHandler(login));
router.get('/me', authenticateToken, asyncHandler(me));

module.exports = router;
