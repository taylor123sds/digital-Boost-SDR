/**
 * @file ContactRateLimiter.js
 * @description Rate limiter por contato para evitar spam/abuso
 *
 * PROPÓSITO:
 * - Limitar mensagens por contato (ex: max 10 msgs/min)
 * - Proteger contra bots que enviam muitas mensagens
 * - Controlar custos de OpenAI
 *
 * ALGORITMO: Token Bucket
 * - Cada contato tem um "bucket" de tokens
 * - Cada mensagem consome 1 token
 * - Tokens são repostos ao longo do tempo
 *
 * @version 1.0.0
 */

import log from '../utils/logger-wrapper.js';

/**
 * Configuração padrão do rate limiter
 */
const DEFAULT_CONFIG = {
  maxTokens: 10,           // Máximo de tokens no bucket
  refillRate: 2,           // Tokens adicionados por segundo
  refillInterval: 1000,    // Intervalo de refill em ms
  cleanupInterval: 60000,  // Limpeza de buckets inativos (1 min)
  inactivityTimeout: 300000 // Remover bucket após 5 min sem uso
};

class ContactRateLimiter {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buckets = new Map(); // contactId -> bucket state
    this.stats = {
      allowed: 0,
      blocked: 0,
      bucketsCreated: 0,
      bucketsCleaned: 0
    };

    // Iniciar cleanup periódico
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.config.cleanupInterval);

    log.info(`[RATE-LIMITER] Iniciado: ${this.config.maxTokens} tokens, ${this.config.refillRate}/s refill`);
  }

  /**
   * Verifica se contato pode enviar mensagem
   * @param {string} contactId - ID do contato
   * @returns {Object} { allowed: boolean, tokensRemaining: number, retryAfterMs?: number }
   */
  check(contactId) {
    if (!contactId) {
      return { allowed: true, tokensRemaining: this.config.maxTokens };
    }

    const now = Date.now();
    let bucket = this.buckets.get(contactId);

    // Criar bucket se não existe
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        lastRefill: now,
        lastAccess: now,
        messageCount: 0
      };
      this.buckets.set(contactId, bucket);
      this.stats.bucketsCreated++;
    }

    // Refill tokens baseado no tempo passado
    const timeSinceRefill = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timeSinceRefill / this.config.refillInterval) * this.config.refillRate;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    bucket.lastAccess = now;

    // Verificar se há tokens disponíveis
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.messageCount++;
      this.stats.allowed++;

      return {
        allowed: true,
        tokensRemaining: bucket.tokens
      };
    }

    // Sem tokens - calcular quando terá
    const msUntilToken = this.config.refillInterval / this.config.refillRate;
    this.stats.blocked++;

    log.warn(`[RATE-LIMITER] Bloqueado: ${contactId} (${bucket.messageCount} msgs, retry in ${msUntilToken}ms)`);

    return {
      allowed: false,
      tokensRemaining: 0,
      retryAfterMs: msUntilToken,
      reason: 'rate_limit_exceeded'
    };
  }

  /**
   * Consome token manualmente (para operações custosas)
   * @param {string} contactId - ID do contato
   * @param {number} tokens - Quantidade de tokens a consumir
   */
  consume(contactId, tokens = 1) {
    const bucket = this.buckets.get(contactId);
    if (bucket) {
      bucket.tokens = Math.max(0, bucket.tokens - tokens);
    }
  }

  /**
   * Adiciona tokens (ex: para leads VIP)
   * @param {string} contactId - ID do contato
   * @param {number} tokens - Quantidade de tokens a adicionar
   */
  addTokens(contactId, tokens = 1) {
    const bucket = this.buckets.get(contactId);
    if (bucket) {
      bucket.tokens = Math.min(this.config.maxTokens * 2, bucket.tokens + tokens);
    }
  }

  /**
   * Reseta bucket de um contato
   */
  reset(contactId) {
    this.buckets.delete(contactId);
  }

  /**
   * Limpa buckets inativos
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [contactId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastAccess > this.config.inactivityTimeout) {
        this.buckets.delete(contactId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.bucketsCleaned += cleaned;
      log.debug(`[RATE-LIMITER] Limpou ${cleaned} buckets inativos (total: ${this.buckets.size})`);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      activeBuckets: this.buckets.size,
      blockRate: this.stats.blocked > 0
        ? ((this.stats.blocked / (this.stats.allowed + this.stats.blocked)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Para o rate limiter (cleanup)
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
  }
}

// Singleton
let rateLimiterInstance = null;

export function getContactRateLimiter(config) {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new ContactRateLimiter(config);
  }
  return rateLimiterInstance;
}

export { ContactRateLimiter };
export default ContactRateLimiter;
