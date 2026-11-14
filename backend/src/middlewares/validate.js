'use strict';

const AppError = require('../utils/AppError');

/**
 * Runs a validator ({ value, errors } = fn(body)) against req.body.
 * On failure -> 400 { success: false, message, errors: [{ field, message }] }.
 * On success -> replaces req.body with the sanitised value.
 */
module.exports = (validatorFn) => (req, res, next) => {
  const { value, errors } = validatorFn(req.body || {});
  if (errors.length > 0) {
    return next(new AppError(400, `Validation failed: ${errors[0].message}`, errors));
  }
  req.body = value;
  return next();
};
