'use strict';

/**
 * Authentication & role-based authorization middlewares.
 *
 *   router.get('/me', authenticateToken, handler);
 *   router.post('/projects', authenticateToken, authorizeRoles('admin', 'project_manager'), handler);
 */
const ENUMS = require('../constants/enums');
const AppError = require('../utils/AppError');
const asyncHandler = require('./asyncHandler');
const User = require('../models/user.model');
const { verifyToken, toPublicUser } = require('../services/auth.service');

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/);
  return /^Bearer$/i.test(scheme) && token ? token : null;
}

/**
 * Verifies the Bearer JWT, re-loads the user from the DB (so deleted or
 * deactivated accounts and role changes take effect immediately) and attaches
 * { id, name, email, role } to req.user. Responds 401 on any failure.
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw new AppError(401, 'Unauthorized: missing or malformed Bearer token');

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new AppError(
      401,
      err.name === 'TokenExpiredError' ? 'Unauthorized: token has expired' : 'Unauthorized: invalid token'
    );
  }

  if (!Number.isInteger(payload.id) || payload.id <= 0) {
    throw new AppError(401, 'Unauthorized: invalid token');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new AppError(401, 'Unauthorized: user no longer exists');
  if (!user.is_active) throw new AppError(401, 'Unauthorized: account is deactivated');

  req.user = toPublicUser(user); // role comes from the DB, not the token
  next();
});

/**
 * Like authenticateToken, but only runs when an Authorization header is present.
 * Lets public endpoints behave differently for authenticated callers.
 */
const optionalAuthenticate = (req, res, next) =>
  req.headers.authorization ? authenticateToken(req, res, next) : next();

/**
 * Restricts a route to the given roles. Must run after authenticateToken.
 * Validates roles using the 4-role ENUMS.ROLES (rejecting 'admin').
 */
function authorizeRoles(...allowedRoles) {
  const rawRoles = allowedRoles.flat();
  // Filter out deprecated 'admin' and keep valid roles from the 4-role model
  const roles = rawRoles.filter((r) => r !== 'admin' && ENUMS.ROLES.includes(r));
  const unknown = rawRoles.filter((r) => r !== 'admin' && !ENUMS.ROLES.includes(r));

  if (unknown.length > 0 || (rawRoles.length > 0 && roles.length === 0)) {
    throw new Error(`authorizeRoles: invalid role(s) ${JSON.stringify(unknown.length ? unknown : rawRoles)}`);
  }

  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Unauthorized: authentication required'));
    if (!ENUMS.ROLES.includes(req.user.role) || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Forbidden: insufficient permissions'));
    }
    return next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuthenticate,
  authorizeRoles,
};
