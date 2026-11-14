'use strict';

/**
 * Operational error with an HTTP status. Thrown from controllers/middlewares
 * and rendered by the global error handler as { success: false, message }.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message    Client-safe message
   * @param {Array<{field: string, message: string}>} [errors] Optional field-level details
   */
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}

module.exports = AppError;
