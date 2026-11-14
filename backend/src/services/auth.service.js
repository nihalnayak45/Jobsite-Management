'use strict';

/**
 * Auth primitives: password hashing, JWT signing/verification, user sanitising.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_ALGORITHM = 'HS256';

let dummyHash = null;

async function hashPassword(plain) {
  return bcrypt.hash(plain, env.auth.bcryptSaltRounds);
}

/**
 * Compares a password with a hash. When `hash` is missing (unknown email) it still
 * runs a comparison against a dummy hash so response timing doesn't reveal
 * whether an account exists.
 */
async function verifyPassword(plain, hash) {
  if (!hash) {
    dummyHash = dummyHash || (await bcrypt.hash('jms-timing-equaliser', env.auth.bcryptSaltRounds));
    await bcrypt.compare(plain, dummyHash);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

/** Signs a JWT with { id, role, email }. */
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, env.auth.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.auth.jwtExpiresIn,
    issuer: env.auth.jwtIssuer,
    subject: String(user.id),
  });
}

/** Verifies a JWT; throws jsonwebtoken errors (TokenExpiredError, JsonWebTokenError). */
function verifyToken(token) {
  return jwt.verify(token, env.auth.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    issuer: env.auth.jwtIssuer,
  });
}

/** Strips a user row down to the fields safe to expose / attach to req.user. */
function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  toPublicUser,
};
