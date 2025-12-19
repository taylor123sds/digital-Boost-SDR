/**
 * @file errors/base.error.js
 * @description Base error classes for ORBION agent
 * Wave 1: Foundation Layer - Error Handling
 */

/**
 * Base application error
 * All custom errors should extend this class
 */
export class ApplicationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      isOperational: true,
      context
    });
  }
}

/**
 * Business rule violation error
 */
export class BusinessRuleError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      isOperational: true,
      context
    });
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends ApplicationError {
  constructor(resource, identifier) {
    super(`${resource} not found: ${identifier}`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      isOperational: true,
      context: { resource, identifier }
    });
  }
}

/**
 * Unauthorized error for authentication failures
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized access') {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      isOperational: true
    });
  }
}

/**
 * Forbidden error for authorization failures
 */
export class ForbiddenError extends ApplicationError {
  constructor(message = 'Access forbidden') {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
      isOperational: true
    });
  }
}

/**
 * Conflict error for conflicting operations
 */
export class ConflictError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      isOperational: true,
      context
    });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApplicationError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      isOperational: true,
      context: { retryAfter }
    });
  }
}

/**
 * External service error for third-party API failures
 */
export class ExternalServiceError extends ApplicationError {
  constructor(service, message, originalError = null) {
    super(`${service} error: ${message}`, {
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      isOperational: true,
      context: {
        service,
        originalError: originalError?.message,
        originalStack: originalError?.stack
      }
    });
    this.originalError = originalError;
  }
}

/**
 * Database error
 */
export class DatabaseError extends ApplicationError {
  constructor(message, operation = null, originalError = null) {
    super(`Database error: ${message}`, {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      isOperational: false,
      context: {
        operation,
        originalError: originalError?.message
      }
    });
    this.originalError = originalError;
  }
}

/**
 * Timeout error for operations that exceed time limits
 */
export class TimeoutError extends ApplicationError {
  constructor(operation, timeoutMs) {
    super(`Operation timed out: ${operation}`, {
      statusCode: 408,
      code: 'TIMEOUT',
      isOperational: true,
      context: { operation, timeoutMs }
    });
  }
}
