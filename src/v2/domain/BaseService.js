/**
 * @file BaseService.js
 * @description Classe base abstrata para services (lógica de negócio)
 * Implementa Service Layer Pattern
 * @module domain/BaseService
 */

import { createLogger } from '../shared/utils/logger.js';

/**
 * Classe base abstrata para Services
 * Services orquestram lógica de negócio complexa e coordenam
 * múltiplos repositórios e integrações
 *
 * @abstract
 * @example
 * class LeadService extends BaseService {
 *   constructor(leadRepository, sheetsService) {
 *     super('LeadService');
 *     this.leadRepo = leadRepository;
 *     this.sheets = sheetsService;
 *   }
 *
 *   async createLead(data) {
 *     // Validação, criação, sincronização, etc
 *   }
 * }
 */
export class BaseService {
  /**
   * @param {string} serviceName - Nome do serviço (para logging)
   */
  constructor(serviceName) {
    if (new.target === BaseService) {
      throw new Error('BaseService é uma classe abstrata e não pode ser instanciada diretamente');
    }

    if (!serviceName) {
      throw new Error('Service name is required');
    }

    this.serviceName = serviceName;
    this.logger = createLogger(serviceName);
  }

  /**
   * Loga início de operação
   * @protected
   * @param {string} operation - Nome da operação
   * @param {object} [meta] - Metadados
   */
  _logStart(operation, meta = {}) {
    this.logger.debug(`${operation} started`, meta);
  }

  /**
   * Loga sucesso de operação
   * @protected
   * @param {string} operation - Nome da operação
   * @param {object} [meta] - Metadados
   */
  _logSuccess(operation, meta = {}) {
    this.logger.info(`${operation} completed`, meta);
  }

  /**
   * Loga erro de operação
   * @protected
   * @param {string} operation - Nome da operação
   * @param {Error} error - Erro ocorrido
   * @param {object} [meta] - Metadados
   */
  _logError(operation, error, meta = {}) {
    this.logger.error(`${operation} failed`, {
      error: error.message,
      stack: error.stack,
      ...meta,
    });
  }

  /**
   * Executa operação com logging automático
   * @protected
   * @param {string} operation - Nome da operação
   * @param {Function} fn - Função assíncrona a executar
   * @param {object} [meta] - Metadados para logs
   * @returns {Promise<any>}
   */
  async _executeWithLogging(operation, fn, meta = {}) {
    const start = Date.now();
    this._logStart(operation, meta);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this._logSuccess(operation, { ...meta, duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this._logError(operation, error, { ...meta, duration: `${duration}ms` });
      throw error;
    }
  }

  /**
   * Valida dados de entrada
   * @protected
   * @param {object} schema - Schema Joi de validação
   * @param {object} data - Dados a validar
   * @returns {object} Dados validados
   * @throws {ValidationError}
   */
  async _validate(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});

      const { ValidationError } = await import('../shared/utils/errors.js');
      throw new ValidationError('Validation failed', details);
    }

    return value;
  }

  /**
   * Executa múltiplas operações em paralelo
   * @protected
   * @param {Array<Promise>} promises - Array de promises
   * @returns {Promise<Array>}
   */
  async _executeParallel(promises) {
    return Promise.all(promises);
  }

  /**
   * Executa operações com retry em caso de falha
   * @protected
   * @param {Function} fn - Função a executar
   * @param {object} [options] - Opções de retry
   * @param {number} [options.maxAttempts=3] - Número máximo de tentativas
   * @param {number} [options.delay=1000] - Delay inicial em ms
   * @param {number} [options.multiplier=2] - Multiplicador do delay
   * @returns {Promise<any>}
   */
  async _executeWithRetry(fn, options = {}) {
    const { maxAttempts = 3, delay = 1000, multiplier = 2 } = options;

    let lastError;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          this.logger.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
            error: error.message,
            nextDelay: `${currentDelay}ms`,
          });

          await this._sleep(currentDelay);
          currentDelay *= multiplier;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep helper
   * @protected
   * @param {number} ms - Milissegundos
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sanitiza dados sensíveis para logging
   * @protected
   * @param {object} data - Dados a sanitizar
   * @param {Array<string>} [sensitiveFields] - Campos sensíveis
   * @returns {object}
   */
  _sanitizeForLog(data, sensitiveFields = ['password', 'token', 'apiKey', 'secret']) {
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Formata erro para resposta
   * @protected
   * @param {Error} error - Erro a formatar
   * @returns {object}
   */
  async _formatError(error) {
    const { parseError } = await import('../shared/utils/errors.js');
    return parseError(error);
  }

  /**
   * Verifica se valor está vazio
   * @protected
   * @param {any} value
   * @returns {boolean}
   */
  _isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return false;
  }

  /**
   * Extrai campos específicos de um objeto
   * @protected
   * @param {object} obj - Objeto fonte
   * @param {Array<string>} fields - Campos a extrair
   * @returns {object}
   */
  _pick(obj, fields) {
    const result = {};
    for (const field of fields) {
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    }
    return result;
  }

  /**
   * Remove campos específicos de um objeto
   * @protected
   * @param {object} obj - Objeto fonte
   * @param {Array<string>} fields - Campos a remover
   * @returns {object}
   */
  _omit(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
      delete result[field];
    }
    return result;
  }
}

export default BaseService;
