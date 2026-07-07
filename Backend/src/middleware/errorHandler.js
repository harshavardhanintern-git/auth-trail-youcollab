const logger = require('../utils/logger');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  // Log all errors
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  // Handle standard JSON response
  const errorResponse = {
    success: false,
    error: {
      message: err.isOperational ? err.message : 'Oops! Something went wrong on our end. Give it another shot.',
      code: err.isOperational ? errorCode : 'INTERNAL_ERROR',
    },
  };

  // Include stack trace in development
  if (config.NODE_ENV === 'development' && !err.isOperational) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.message;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
