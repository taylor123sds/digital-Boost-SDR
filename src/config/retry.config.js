/**
 * @file retry.config.js
 * @description Configuração centralizada para retry logic em toda a aplicação
 *
 * Consolidação de 4 sistemas diferentes de retry:
 * 1. retry.js (genérico)
 * 2. circuit-breaker.js
 * 3. UnifiedMessageCoordinator._sendWithRetry()
 * 4. persistence_manager.saveIndividual()
 */

/**
 * Configurações de retry por tipo de operação
 */
export const RETRY_CONFIG = {
  /**
   * WhatsApp - Envio de mensagens
   * Alta prioridade, retry rápido
   */
  whatsapp: {
    maxAttempts: 3,
    initialDelay: 1000,      // 1 segundo
    maxDelay: 5000,          // 5 segundos
    backoff: 'exponential',  // 1s, 2s, 4s
    timeout: 10000,          // 10 segundos por tentativa
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'Bad Request',
      '500',
      '502',
      '503',
      '504'
    ]
  },

  /**
   * Database - Operações de persistência
   * Retry mais agressivo devido a WAL mode
   */
  database: {
    maxAttempts: 5,
    initialDelay: 500,       // 500ms
    maxDelay: 3000,          // 3 segundos
    backoff: 'linear',       // 500ms, 1s, 1.5s, 2s, 2.5s
    timeout: 5000,
    retryableErrors: [
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
      'database is locked'
    ]
  },

  /**
   * OpenAI - Chamadas à API
   * Retry moderado com backoff exponencial
   */
  openai: {
    maxAttempts: 2,
    initialDelay: 2000,      // 2 segundos
    maxDelay: 10000,         // 10 segundos
    backoff: 'exponential',  // 2s, 4s
    timeout: 30000,          // 30 segundos por tentativa
    retryableErrors: [
      'rate_limit_exceeded',
      '429',
      '500',
      '502',
      '503',
      'timeout'
    ]
  },

  /**
   * HTTP Externo - APIs externas (Evolution, etc)
   */
  http: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoff: 'exponential',
    timeout: 15000,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      '500',
      '502',
      '503',
      '504'
    ]
  },

  /**
   * Google Sheets - Sync assíncrono
   * Retry relaxado, não é crítico
   */
  sheets: {
    maxAttempts: 2,
    initialDelay: 3000,      // 3 segundos
    maxDelay: 10000,         // 10 segundos
    backoff: 'exponential',
    timeout: 20000,
    retryableErrors: [
      'rate_limit_exceeded',
      '429',
      '500',
      '503'
    ]
  },

  /**
   * Áudio - Transcrição e processamento
   * Retry moderado
   */
  audio: {
    maxAttempts: 2,
    initialDelay: 2000,
    maxDelay: 8000,
    backoff: 'exponential',
    timeout: 25000,
    retryableErrors: [
      'timeout',
      '500',
      '503',
      'rate_limit_exceeded'
    ]
  },

  /**
   * Default - Fallback para operações não especificadas
   */
  default: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoff: 'exponential',
    timeout: 10000,
    retryableErrors: []
  }
};

/**
 * Calcula delay para próxima tentativa
 * @param {number} attempt - Número da tentativa (1-based)
 * @param {string} backoffType - 'exponential' ou 'linear'
 * @param {number} initialDelay - Delay inicial em ms
 * @param {number} maxDelay - Delay máximo em ms
 * @returns {number} Delay em ms
 */
export function calculateDelay(attempt, backoffType, initialDelay, maxDelay) {
  let delay;

  if (backoffType === 'exponential') {
    // 2^attempt * initialDelay (com jitter)
    delay = Math.pow(2, attempt - 1) * initialDelay;
    // Adicionar jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    delay = delay + jitter;
  } else {
    // Linear: attempt * initialDelay
    delay = attempt * initialDelay;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Verifica se erro é retryable
 * @param {Error} error - Erro a verificar
 * @param {Array<string>} retryableErrors - Lista de erros retryable
 * @returns {boolean}
 */
export function isRetryableError(error, retryableErrors = []) {
  if (!error) return false;

  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  const errorStatus = error.status || error.statusCode || '';

  return retryableErrors.some(retryable => {
    return errorMessage.includes(retryable) ||
           errorCode.includes(retryable) ||
           String(errorStatus).includes(retryable);
  });
}

/**
 * Get configuração para tipo de operação
 * @param {string} type - Tipo de operação
 * @returns {Object} Configuração de retry
 */
export function getRetryConfig(type) {
  return RETRY_CONFIG[type] || RETRY_CONFIG.default;
}

/**
 * Exemplo de uso:
 *
 * import { retry } from '../utils/retry.js';
 * import { getRetryConfig } from '../config/retry.config.js';
 *
 * const config = getRetryConfig('whatsapp');
 *
 * await retry(
 *   () => sendWhatsAppMessage(to, text),
 *   config
 * );
 */

export default RETRY_CONFIG;
