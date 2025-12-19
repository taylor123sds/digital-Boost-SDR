/**
 * @file utils/logger.enhanced.js
 * @description Enhanced Winston logger with structured logging
 * Wave 1: Foundation Layer - Logging System
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom log format for pretty console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const emoji = {
      error: '',
      warn: '',
      info: '',
      http: '',
      verbose: '',
      debug: '',
      silly: ''
    }[level] || '';

    let output = `${emoji} ${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => key !== 'timestamp' && key !== 'level');
    if (metaKeys.length > 0) {
      const metaStr = JSON.stringify(
        Object.fromEntries(metaKeys.map(key => [key, meta[key]])),
        null,
        2
      );
      output += `\n${metaStr}`;
    }

    return output;
  })
);

/**
 * JSON format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports based on configuration
 */
function createTransports() {
  const transports = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level
    })
  );

  // File transport (if enabled)
  if (config.logging.fileEnabled) {
    const logDir = path.dirname(config.logging.filePath);

    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: parseSize(config.logging.maxSize),
        maxFiles: config.logging.maxFiles
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: config.logging.filePath,
        format: fileFormat,
        maxsize: parseSize(config.logging.maxSize),
        maxFiles: config.logging.maxFiles
      })
    );
  }

  return transports;
}

/**
 * Parse size string (e.g., "10m", "1g") to bytes
 */
function parseSize(sizeStr) {
  const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^(\d+)([kmg]?)$/i);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return value * (units[unit] || 1);
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: config.logging.level,
  transports: createTransports(),
  exitOnError: false
});

/**
 * Enhanced logger with domain-specific methods
 */
export class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext) {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log methods
   */
  error(message, meta = {}) {
    logger.error(message, { ...this.context, ...meta });
  }

  warn(message, meta = {}) {
    logger.warn(message, { ...this.context, ...meta });
  }

  info(message, meta = {}) {
    logger.info(message, { ...this.context, ...meta });
  }

  http(message, meta = {}) {
    logger.http(message, { ...this.context, ...meta });
  }

  verbose(message, meta = {}) {
    logger.verbose(message, { ...this.context, ...meta });
  }

  debug(message, meta = {}) {
    logger.debug(message, { ...this.context, ...meta });
  }

  /**
   * Domain-specific logging methods
   */

  /**
   * Log OpenAI API calls
   */
  openai(action, meta = {}) {
    this.info(`OpenAI: ${action}`, { service: 'OpenAI', ...meta });
  }

  /**
   * Log WhatsApp operations
   */
  whatsapp(action, meta = {}) {
    this.info(`WhatsApp: ${action}`, { service: 'WhatsApp', ...meta });
  }

  /**
   * Log database operations
   */
  database(operation, meta = {}) {
    this.debug(`Database: ${operation}`, { service: 'Database', ...meta });
  }

  /**
   * Log API requests
   */
  apiRequest(method, path, meta = {}) {
    this.http(`${method} ${path}`, { type: 'request', ...meta });
  }

  /**
   * Log API responses
   */
  apiResponse(method, path, statusCode, meta = {}) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    logger[level](`${method} ${path} - ${statusCode}`, {
      ...this.context,
      type: 'response',
      statusCode,
      ...meta
    });
  }

  /**
   * Log conversation events
   */
  conversation(event, meta = {}) {
    this.info(`Conversation: ${event}`, { domain: 'conversation', ...meta });
  }

  /**
   * Log lead events
   */
  lead(event, leadId, meta = {}) {
    this.info(`Lead: ${event}`, { domain: 'lead', leadId, ...meta });
  }

  /**
   * Log campaign events
   */
  campaign(event, campaignId, meta = {}) {
    this.info(`Campaign: ${event}`, { domain: 'campaign', campaignId, ...meta });
  }

  /**
   * Log scheduling events
   */
  scheduling(event, meta = {}) {
    this.info(`Scheduling: ${event}`, { domain: 'scheduling', ...meta });
  }

  /**
   * Performance timing
   */
  startTimer(label) {
    const start = Date.now();
    return {
      end: (meta = {}) => {
        const duration = Date.now() - start;
        this.debug(`Timer: ${label} completed in ${duration}ms`, {
          timer: label,
          duration,
          ...meta
        });
        return duration;
      }
    };
  }
}

/**
 * Create default logger instance
 */
export const defaultLogger = new Logger({ service: 'LEADLY' });

/**
 * Create logger for specific module/service
 */
export function createLogger(context) {
  return new Logger(context);
}

/**
 * Express middleware for request logging
 */
export function requestLoggerMiddleware(logger = defaultLogger) {
  return (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.apiRequest(req.method, req.path, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.apiResponse(req.method, req.path, res.statusCode, { duration });
    });

    next();
  };
}

export default defaultLogger;
