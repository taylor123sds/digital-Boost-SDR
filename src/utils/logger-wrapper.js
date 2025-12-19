/**
 * @file logger-wrapper.js
 * @description Wrapper simplificado para padronizar logging em toda a aplicação
 *
 * Migração gradual de console.log para logger estruturado
 *
 * PRIORIDADE DE MIGRAÇÃO:
 * 1. handlers/ (mais crítico)
 * 2. agents/
 * 3. tools/
 * 4. utils/
 */

import logger from './logger.js';

/**
 * Logger wrapper simplificado
 * Mantém compatibilidade com console.log mas adiciona estrutura
 */
export const log = {
  /**
   * Informações gerais
   * @param {string} message - Mensagem principal
   * @param {Object} context - Contexto adicional
   */
  info: (message, context = {}) => {
    logger.info(message, { module: getCallerModule(), ...context });
  },

  /**
   * Erros
   * @param {string} message - Mensagem de erro
   * @param {Error|Object} error - Objeto de erro ou contexto
   * @param {Object} context - Contexto adicional
   */
  error: (message, error, context = {}) => {
    const errorContext = error instanceof Error ? {
      error: error.message,
      stack: error.stack,
      ...context
    } : {
      ...error,
      ...context
    };

    logger.error(message, { module: getCallerModule(), ...errorContext });
  },

  /**
   * Avisos
   * @param {string} message - Mensagem de aviso
   * @param {Object} context - Contexto adicional
   */
  warn: (message, context = {}) => {
    logger.warn(message, { module: getCallerModule(), ...context });
  },

  /**
   * Debug (apenas em desenvolvimento)
   * @param {string} message - Mensagem de debug
   * @param {Object} context - Contexto adicional
   */
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(message, { module: getCallerModule(), ...context });
    }
  },

  /**
   * Sucesso - ação bem-sucedida
   * @param {string} message - Mensagem de sucesso
   * @param {Object} context - Contexto adicional
   */
  success: (message, context = {}) => {
    logger.info(` ${message}`, { module: getCallerModule(), level: 'success', ...context });
  },

  /**
   * Operação iniciada
   * @param {string} message - Mensagem de início
   * @param {Object} context - Contexto adicional
   */
  start: (message, context = {}) => {
    logger.info(` ${message}`, { module: getCallerModule(), level: 'start', ...context });
  }
};

/**
 * Detecta o módulo que chamou o logger
 * Útil para rastrear origem dos logs
 */
function getCallerModule() {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Linha 3 geralmente contém o caller
  if (lines[3]) {
    const match = lines[3].match(/at\s+(.+?)\s+\(/);
    if (match) {
      return match[1];
    }
  }

  return 'unknown';
}

/**
 * Migration helper - compatibilidade com console.log
 *
 * USO TEMPORÁRIO durante migração:
 *
 * // Em vez de:
 * console.log('Mensagem');
 *
 * // Use:
 * log.info('Mensagem');
 *
 * // Em vez de:
 * console.error('Erro:', error);
 *
 * // Use:
 * log.error('Erro', error);
 */
export function createCompatLogger(moduleName) {
  return {
    log: (msg, ...args) => log.info(`[${moduleName}] ${msg}`, { args }),
    info: (msg, ...args) => log.info(`[${moduleName}] ${msg}`, { args }),
    error: (msg, ...args) => log.error(`[${moduleName}] ${msg}`, ...args),
    warn: (msg, ...args) => log.warn(`[${moduleName}] ${msg}`, { args }),
    debug: (msg, ...args) => log.debug(`[${moduleName}] ${msg}`, { args })
  };
}

/**
 * Express middleware para logging de requests
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
}

export default log;
