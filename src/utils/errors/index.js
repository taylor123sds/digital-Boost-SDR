/**
 * @file errors/index.js
 * @description Central export point for all error classes
 * Wave 1: Foundation Layer
 */

export {
  ApplicationError,
  ValidationError,
  BusinessRuleError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  TimeoutError
} from './base.error.js';

export {
  OpenAIError,
  WhatsAppError,
  GoogleSheetsError,
  SchedulingError,
  LeadError,
  CampaignError,
  ConversationError,
  BANTError,
  StateError,
  AudioProcessingError
} from './domain.error.js';

/**
 * Error handler utilities
 */

/**
 * Checks if an error is operational (expected/recoverable)
 * @param {Error} error - Error to check
 * @returns {boolean} True if operational
 */
export function isOperationalError(error) {
  if (error.isOperational !== undefined) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extracts safe error details for client response
 * @param {Error} error - Error to extract from
 * @returns {Object} Safe error details
 */
export function getClientSafeError(error) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // If it's our custom error, use toJSON if available
  if (typeof error.toJSON === 'function') {
    return error.toJSON();
  }

  // Generic error response
  return {
    name: error.name || 'Error',
    message: isOperationalError(error) ? error.message : 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  };
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncErrorHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Express error handler middleware factory
 * @param {Object} logger - Optional logger instance
 * @returns {Function} Express middleware
 */
export function errorHandlerMiddleware(logger = console) {
  return (error, req, res, next) => {
    // Log the error
    const errorDetails = getClientSafeError(error);

    if (isOperationalError(error)) {
      logger.warn('Operational error occurred:', {
        ...errorDetails,
        path: req.path,
        method: req.method
      });
    } else {
      logger.error('Non-operational error occurred:', {
        ...errorDetails,
        path: req.path,
        method: req.method
      });
    }

    // Send response
    res.status(error.statusCode || 500).json({
      error: errorDetails
    });
  };
}
