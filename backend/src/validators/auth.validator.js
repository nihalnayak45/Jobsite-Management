'use strict';

/**
 * Dependency-free request validators. Each returns { value, errors } where
 * `value` is the sanitised payload and `errors` is a list of { field, message }.
 */
const ENUMS = require('../constants/enums');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function validateEmail(email, errors) {
  if (!isNonEmptyString(email)) {
    errors.push({ field: 'email', message: 'Email is required' });
    return undefined;
  }
  const value = email.trim().toLowerCase();
  if (value.length > 255 || !EMAIL_RE.test(value)) {
    errors.push({ field: 'email', message: 'Email must be a valid email address' });
  }
  return value;
}

function validateRegister(body) {
  const errors = [];
  const { name, email, password, role } = body;

  if (!isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.trim().length < 2 || name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 150 characters' });
  }

  const normalizedEmail = validateEmail(email, errors);

  if (typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < PASSWORD_MIN) {
    errors.push({ field: 'password', message: `Password must be at least ${PASSWORD_MIN} characters` });
  } else if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX) {
    errors.push({ field: 'password', message: `Password must be at most ${PASSWORD_MAX} bytes` });
  }

  let normalizedRole = 'worker';
  if (role !== undefined && role !== null && role !== '') {
    if (typeof role !== 'string' || !ENUMS.ROLES.includes(role) || role === 'admin') {
      errors.push({ field: 'role', message: `Role must be one of: ${ENUMS.ROLES.join(', ')}` });
    } else {
      normalizedRole = role;
    }
  }

  return {
    errors,
    value: {
      name: typeof name === 'string' ? name.trim() : name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
    },
  };
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body;

  if (!isNonEmptyString(email)) errors.push({ field: 'email', message: 'Email is required' });
  if (typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return {
    errors,
    value: { email: typeof email === 'string' ? email.trim().toLowerCase() : email, password },
  };
}

module.exports = { validateRegister, validateLogin };
