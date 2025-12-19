// logger.js
// P1-3: CONSOLIDATED - Redirects to logger.enhanced.js
// This file provides backwards compatibility for existing imports

import { defaultLogger, createLogger, requestLoggerMiddleware, Logger } from './logger.enhanced.js';

/**
 * P1-3: Helper functions for logging - maintains backwards compatibility
 * with existing code that imports `log` from this file
 */
export const log = {
  // Basic log methods
  info: (message, meta = {}) => defaultLogger.info(message, meta),
  warn: (message, meta = {}) => defaultLogger.warn(message, meta),
  error: (message, error = null, meta = {}) => {
    if (error instanceof Error) {
      defaultLogger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else {
      defaultLogger.error(message, meta);
    }
  },
  debug: (message, meta = {}) => defaultLogger.debug(message, meta),
  http: (message, meta = {}) => defaultLogger.http(message, meta),

  // Domain-specific methods for backwards compatibility
  whatsapp: (action, phoneNumber, details = {}) => {
    defaultLogger.whatsapp(action, { phoneNumber, ...details });
  },

  botDetection: (phoneNumber, action, score, details = {}) => {
    defaultLogger.info(`[BOT-DETECTION] ${action}`, {
      context: 'bot_detection',
      phoneNumber,
      botScore: score,
      ...details
    });
  },

  humanVerification: (phoneNumber, action, details = {}) => {
    defaultLogger.info(`[HUMAN-CHECK] ${action}`, {
      context: 'human_verification',
      phoneNumber,
      ...details
    });
  },

  campaign: (action, details = {}) => {
    defaultLogger.campaign(action, undefined, details);
  },

  conversation: (phoneNumber, action, details = {}) => {
    defaultLogger.conversation(action, { phoneNumber, ...details });
  },

  database: (action, details = {}) => {
    defaultLogger.database(action, details);
  },

  api: (method, endpoint, statusCode, duration, details = {}) => {
    defaultLogger.apiResponse(method, endpoint, statusCode, { duration, ...details });
  },

  performance: (operation, duration, details = {}) => {
    defaultLogger.debug(`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
      context: 'performance',
      operation,
      duration,
      ...details
    });
  },

  // P1-3: New helper methods
  openai: (action, details = {}) => {
    defaultLogger.openai(action, details);
  },

  scheduling: (action, details = {}) => {
    defaultLogger.scheduling(action, details);
  },

  lead: (action, leadId, details = {}) => {
    defaultLogger.lead(action, leadId, details);
  },

  /**
   * Create a timer for performance tracking
   */
  startTimer: (label) => defaultLogger.startTimer(label),

  /**
   * Create child logger with additional context
   */
  child: (context) => createLogger(context)
};

/**
 * Express middleware for request logging
 * Backwards compatible export
 */
export const requestLogger = requestLoggerMiddleware;

// Re-export from enhanced logger
export { defaultLogger, createLogger, Logger, requestLoggerMiddleware };

export default log;

/**
 * @deprecated This file is for backwards compatibility.
 * New code should import from './logger.enhanced.js' directly:
 *
 * import { defaultLogger, createLogger } from './logger.enhanced.js';
 *
 * // Or for module-specific logging:
 * const logger = defaultLogger.child({ module: 'MyModule' });
 */
