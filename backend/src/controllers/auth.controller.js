'use strict';

const env = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/user.model');
const { hashPassword, verifyPassword, signToken, toPublicUser } = require('../services/auth.service');
const ENUMS = require('../constants/enums');

/** POST /api/auth/register */
async function register(req, res) {
  const { name, email, password } = req.body;
  let { role } = req.body;

  // Fallback default role is 'worker'; reject 'admin'
  if (!role) {
    role = 'worker';
  } else if (role === 'admin' || !ENUMS.ROLES.includes(role)) {
    throw new AppError(400, `Role must be one of: ${ENUMS.ROLES.join(', ')}`);
  }

  if (await User.findByEmail(email)) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({ name, email, passwordHash, role });
  } catch (err) {
    // Concurrent registration with the same email.
    if (err.code === '23505') throw new AppError(409, 'Email is already registered');
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: toPublicUser(user),
  });
}

/** POST /api/auth/login */
async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findByEmailWithPassword(email);
  const passwordOk = await verifyPassword(password, user && user.password_hash);

  if (!user || !passwordOk) {
    throw new AppError(401, 'Invalid email or password');
  }
  if (!user.is_active) {
    throw new AppError(403, 'Account is deactivated. Contact an administrator.');
  }

  res.status(200).json({
    success: true,
    token: signToken(user),
    user: toPublicUser(user),
  });
}

/** GET /api/auth/me */
async function me(req, res) {
  res.status(200).json({ success: true, user: req.user });
}

module.exports = { register, login, me };
