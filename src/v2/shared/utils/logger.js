/**
 * @file logger.js
 * @description Sistema de logging estruturado usando Winston
 * @module shared/utils/logger
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import env, { isProduction, isDevelopment } from '../../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Níveis de log customizados
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Cores para cada nível (console)
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

/**
 * Formato para ambiente de desenvolvimento (colorido)
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'ORBION'}] ${level}: ${message} ${metaStr}`;
  })
);

/**
 * Formato para produção (JSON)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Transportes (onde os logs são salvos)
 */
const transports = [
  // Console - sempre ativo
  new winston.transports.Console({
    format: isDevelopment() ? devFormat : prodFormat,
  }),

  // Arquivo de erros
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Arquivo combinado (todos os logs)
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Em produção, adicionar arquivo de warnings
if (isProduction()) {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'warnings.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    })
  );
}

/**
 * Logger principal
 */
const logger = winston.createLogger({
  levels,
  level: isDevelopment() ? 'debug' : 'info',
  format: isProduction() ? prodFormat : devFormat,
  transports,
  exitOnError: false,
});

/**
 * Cria um logger child com contexto específico
 * @param {string} service - Nome do serviço/módulo
 * @returns {winston.Logger}
 *
 * @example
 * const logger = createLogger('WhatsAppClient');
 * logger.info('Message sent', { to: '5584999999999' });
 */
export function createLogger(service) {
  return logger.child({ service });
}

/**
 * Logger padrão
 */
export default logger;

/**
 * Wrapper de métodos para facilitar uso
 */
export const log = {
  /**
   * Log de erro
   * @param {string} message
   * @param {Error|object} [meta]
   */
  error: (message, meta = {}) => {
    if (meta instanceof Error) {
      logger.error(message, { error: meta.message, stack: meta.stack });
    } else {
      logger.error(message, meta);
    }
  },

  /**
   * Log de warning
   * @param {string} message
   * @param {object} [meta]
   */
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  /**
   * Log de informação
   * @param {string} message
   * @param {object} [meta]
   */
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  /**
   * Log HTTP (requests)
   * @param {string} message
   * @param {object} [meta]
   */
  http: (message, meta = {}) => {
    logger.http(message, meta);
  },

  /**
   * Log de debug
   * @param {string} message
   * @param {object} [meta]
   */
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
};

/**
 * Logs específicos para domínios
 */

/**
 * Logger para operações de database
 */
export const dbLogger = createLogger('Database');

/**
 * Logger para WhatsApp
 */
export const whatsappLogger = createLogger('WhatsApp');

/**
 * Logger para OpenAI
 */
export const openaiLogger = createLogger('OpenAI');

/**
 * Logger para Google Sheets
 */
export const sheetsLogger = createLogger('GoogleSheets');

/**
 * Logger para agentes
 */
export const agentLogger = createLogger('Agents');

/**
 * Logger para BANT
 */
export const bantLogger = createLogger('BANT');

/**
 * Logger para API/HTTP
 */
export const apiLogger = createLogger('API');

/**
 * Helper para logar performance de funções
 * @param {string} operation - Nome da operação
 * @param {Function} fn - Função a executar
 * @param {winston.Logger} [customLogger] - Logger customizado
 * @returns {Promise<any>}
 *
 * @example
 * const result = await logPerformance('sendMessage', async () => {
 *   return await whatsapp.send(message);
 * }, whatsappLogger);
 */
export async function logPerformance(operation, fn, customLogger = logger) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    customLogger.debug(`${operation} completed`, { duration: `${duration}ms` });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    customLogger.error(`${operation} failed`, {
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Middleware Express para logging de requisições
 * @param {object} req - Request
 * @param {object} res - Response
 * @param {Function} next - Next function
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log quando resposta terminar
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400) {
      apiLogger.warn(`HTTP ${res.statusCode}`, logData);
    } else {
      apiLogger.http(`HTTP ${res.statusCode}`, logData);
    }
  });

  next();
}

/**
 * Stream para Morgan (integração com Express)
 */
export const morganStream = {
  write: (message) => {
    apiLogger.http(message.trim());
  },
};
