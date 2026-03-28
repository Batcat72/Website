const { logSystemEvent } = require('../modules/security-monitoring/securityLogger');

function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Log system error
  logSystemEvent({
    serviceName: 'backend-api',
    logLevel: 'error',
    message: err.message,
    metadata: {
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Error response
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation Error';
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.details = err.errors;
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Invalid token';
    errorResponse.code = 'INVALID_TOKEN';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Token expired';
    errorResponse.code = 'TOKEN_EXPIRED';
    statusCode = 401;
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    errorResponse.error = 'Duplicate entry';
    errorResponse.code = 'DUPLICATE_ENTRY';
    errorResponse.details = err.detail;
    statusCode = 409;
  }

  if (err.code === '23503') { // Foreign key violation
    errorResponse.error = 'Reference error';
    errorResponse.code = 'REFERENCE_ERROR';
    errorResponse.details = err.detail;
    statusCode = 400;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = { errorHandler };