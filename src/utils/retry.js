// retry.js
//  Sistema de retry inteligente com backoff exponencial
// Diferencia erros temporários (retry) de permanentes (fail fast)
// P1-1: Consolidado com retry.config.js

import log from './logger.js';
import { RETRY_CONFIG, getRetryConfig, calculateDelay as calcDelayFromConfig } from '../config/retry.config.js';

/**
 * Configuração de retry - usa config centralizado como fallback
 */
const DEFAULT_CONFIG = {
  maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS) || RETRY_CONFIG.default.maxAttempts,
  initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY) || RETRY_CONFIG.default.initialDelay,
  maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || RETRY_CONFIG.default.maxDelay,
  multiplier: parseInt(process.env.RETRY_MULTIPLIER) || 2,
  jitter: true, // Adiciona aleatoriedade para evitar thundering herd
  backoff: RETRY_CONFIG.default.backoff,
};

/**
 * Códigos HTTP que NÃO devem ser retried (erros permanentes)
 */
const NON_RETRYABLE_HTTP_CODES = new Set([
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  406, // Not Acceptable
  409, // Conflict
  410, // Gone
  422, // Unprocessable Entity
]);

/**
 * Códigos HTTP que DEVEM ser retried (erros temporários)
 */
const RETRYABLE_HTTP_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Verifica se um erro é retryable
 */
export function isRetryableError(error) {
  // 1. Erros de rede são sempre retryable
  if (error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      error.code === 'EPIPE') {
    return true;
  }

  // 2. Circuit breaker aberto não é retryable (já tem lógica própria)
  if (error.circuitBreakerOpen) {
    return false;
  }

  // 3. Verificar código HTTP
  const statusCode = error.statusCode || error.status || error.response?.status;

  if (statusCode) {
    // Explicitamente não-retryable
    if (NON_RETRYABLE_HTTP_CODES.has(statusCode)) {
      return false;
    }

    // Explicitamente retryable
    if (RETRYABLE_HTTP_CODES.has(statusCode)) {
      return true;
    }

    // Qualquer 5xx não listado é retryable
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }
  }

  // 4. Timeouts são retryable
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  // 5. Por padrão, considerar não-retryable para fail fast
  return false;
}

/**
 * Calcula delay com backoff exponencial e jitter
 */
function calculateDelay(attempt, config) {
  // Backoff exponencial: initialDelay * (multiplier ^ attempt)
  let delay = config.initialDelay * Math.pow(config.multiplier, attempt - 1);

  // Aplicar max delay
  delay = Math.min(delay, config.maxDelay);

  // Adicionar jitter (aleatoriedade ±25%)
  if (config.jitter) {
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    delay = Math.max(0, delay + jitter);
  }

  return Math.floor(delay);
}

/**
 * Retry com backoff exponencial e lógica inteligente
 * @param {Function} fn - Função async a ser retried
 * @param {Object} options - Configurações de retry
 * @returns {Promise<any>} Resultado da função
 */
export async function retryWithBackoff(fn, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const context = options.context || 'operation';

  let lastError = null;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;

    try {
      log.debug(`Retry attempt ${attempt}/${config.maxAttempts}`, {
        context: 'retry',
        operation: context,
        attempt
      });

      const result = await fn();

      // Sucesso!
      if (attempt > 1) {
        log.info(`Operation succeeded after ${attempt} attempts`, {
          context: 'retry',
          operation: context,
          totalAttempts: attempt
        });
      }

      return result;

    } catch (error) {
      lastError = error;

      const retryable = isRetryableError(error);
      const isLastAttempt = attempt >= config.maxAttempts;

      log.warn(`Attempt ${attempt}/${config.maxAttempts} failed`, {
        context: 'retry',
        operation: context,
        error: error.message,
        statusCode: error.statusCode || error.status,
        code: error.code,
        retryable,
        isLastAttempt
      });

      // Se não é retryable, fail fast
      if (!retryable) {
        log.error(`Non-retryable error, failing immediately`, error, {
          context: 'retry',
          operation: context,
          attempt
        });

        throw error;
      }

      // Se é a última tentativa, falha
      if (isLastAttempt) {
        log.error(`All ${attempt} attempts failed`, lastError, {
          context: 'retry',
          operation: context,
          totalAttempts: attempt
        });

        // Enriquecer erro com informações de retry
        lastError.retriesExhausted = true;
        lastError.totalAttempts = attempt;

        throw lastError;
      }

      // Calcular delay e aguardar
      const delay = calculateDelay(attempt, config);

      log.debug(`Waiting ${delay}ms before next attempt`, {
        context: 'retry',
        operation: context,
        attempt,
        delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Nunca deve chegar aqui, mas por segurança
  throw lastError;
}

/**
 * Wrapper para retry que preserva contexto da função original
 */
export function withRetry(fn, options = {}) {
  return async (...args) => {
    return retryWithBackoff(() => fn(...args), options);
  };
}

/**
 * Retry específico para chamadas HTTP
 */
export async function retryHttp(requestFn, options = {}) {
  return retryWithBackoff(requestFn, {
    ...options,
    context: options.context || 'http_request'
  });
}

/**
 * Retry específico para operações de banco de dados
 * P1-1: Usa config centralizado RETRY_CONFIG.database
 */
export async function retryDatabase(queryFn, options = {}) {
  const dbConfig = getRetryConfig('database');
  return retryWithBackoff(queryFn, {
    maxAttempts: dbConfig.maxAttempts,
    initialDelay: dbConfig.initialDelay,
    maxDelay: dbConfig.maxDelay,
    ...options,
    context: options.context || 'database_query',
  });
}

/**
 * Retry específico para chamadas OpenAI
 * P1-1: Usa config centralizado RETRY_CONFIG.openai
 */
export async function retryOpenAI(apiFn, options = {}) {
  const openaiConfig = getRetryConfig('openai');
  return retryWithBackoff(apiFn, {
    maxAttempts: openaiConfig.maxAttempts,
    initialDelay: openaiConfig.initialDelay,
    maxDelay: openaiConfig.maxDelay,
    ...options,
    context: options.context || 'openai_api',
  });
}

/**
 * Retry específico para WhatsApp/Evolution API
 * P1-1: Usa config centralizado RETRY_CONFIG.whatsapp
 */
export async function retryWhatsApp(sendFn, options = {}) {
  const waConfig = getRetryConfig('whatsapp');
  return retryWithBackoff(sendFn, {
    maxAttempts: waConfig.maxAttempts,
    initialDelay: waConfig.initialDelay,
    maxDelay: waConfig.maxDelay,
    ...options,
    context: options.context || 'whatsapp_send',
  });
}

/**
 * Retry específico para Google Sheets
 * P1-1: Usa config centralizado RETRY_CONFIG.sheets
 */
export async function retrySheets(sheetsFn, options = {}) {
  const sheetsConfig = getRetryConfig('sheets');
  return retryWithBackoff(sheetsFn, {
    maxAttempts: sheetsConfig.maxAttempts,
    initialDelay: sheetsConfig.initialDelay,
    maxDelay: sheetsConfig.maxDelay,
    ...options,
    context: options.context || 'google_sheets',
  });
}

/**
 * Retry para transcrição de áudio
 * P1-1: Usa config centralizado RETRY_CONFIG.audio
 */
export async function retryAudio(audioFn, options = {}) {
  const audioConfig = getRetryConfig('audio');
  return retryWithBackoff(audioFn, {
    maxAttempts: audioConfig.maxAttempts,
    initialDelay: audioConfig.initialDelay,
    maxDelay: audioConfig.maxDelay,
    ...options,
    context: options.context || 'audio_transcription',
  });
}

/**
 * Retry com fallback - se todas tentativas falharem, executa função de fallback
 */
export async function retryWithFallback(fn, fallbackFn, options = {}) {
  try {
    return await retryWithBackoff(fn, options);
  } catch (error) {
    log.warn(`All retries failed, executing fallback`, {
      context: 'retry',
      operation: options.context || 'operation',
      error: error.message
    });

    return await fallbackFn(error);
  }
}

// Export config para testes
export const retryConfig = DEFAULT_CONFIG;
