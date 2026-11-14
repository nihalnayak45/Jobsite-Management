'use strict';

/** 404 for any unmatched route. */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/** Common PostgreSQL error codes mapped to HTTP responses. */
const PG_ERRORS = {
  23505: { status: 409, message: 'Duplicate value violates a unique constraint' },
  23503: { status: 409, message: 'Operation violates a foreign key constraint' },
  23502: { status: 400, message: 'A required field is missing' },
  23514: { status: 400, message: 'A value violates a check constraint' },
  '22P02': { status: 400, message: 'Invalid input syntax' },
};

/**
 * Central error handler. Every error response has the shape
 *   { success: false, message: string, errors?: [...] }
 * plus debug fields outside production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isProd = req.app.get('env') === 'production';
  const mapped = PG_ERRORS[err.code];

  let status = err.statusCode || err.status || (mapped && mapped.status) || 500;
  let message = (mapped && mapped.message) || err.message || 'Internal Server Error';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON request body';
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = 'Internal Server Error';
  }

  res.status(status).json({
    success: false,
    message,
    ...(err.errors && Array.isArray(err.errors) && status < 500 ? { errors: err.errors } : {}),
    ...(!isProd && err.constraint ? { constraint: err.constraint } : {}),
    ...(!isProd && err.detail ? { detail: err.detail } : {}),
    ...(!isProd && status >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
