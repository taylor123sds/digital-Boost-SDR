// rate_limiter.js
//  Rate limiting por contato para prevenir spam e loops infinitos

import { normalizePhone } from './phone_normalizer.js';
import log from './logger.js';

/**
 * Rate Limiter usando sliding window com buckets
 * Limita número de mensagens por contato em janelas de tempo
 */
class RateLimiter {
  constructor() {
    // Map: contactId => Array de timestamps de mensagens
    this.messageBuckets = new Map();

    // Configurações de rate limiting
    this.config = {
      // Janela de 1 minuto
      shortWindow: {
        duration: 60000, // 1 minuto
        maxMessages: 10, // Máximo 10 mensagens por minuto
      },
      // Janela de 1 hora
      longWindow: {
        duration: 3600000, // 1 hora
        maxMessages: 60, // Máximo 60 mensagens por hora
      },
    };

    // Auto-cleanup a cada 5 minutos
    this.startAutoCleanup();
  }

  /**
   * Verifica se contato excedeu rate limit
   * @param {string} contactId - ID do contato
   * @returns {Object} { allowed: boolean, reason?: string, retryAfter?: number }
   */
  checkLimit(contactId) {
    const normalized = normalizePhone(contactId);
    const now = Date.now();

    // Obter bucket de mensagens do contato
    let bucket = this.messageBuckets.get(normalized);

    if (!bucket) {
      // Primeiro contato - criar bucket
      bucket = [];
      this.messageBuckets.set(normalized, bucket);
    }

    // Limpar timestamps antigos
    bucket = bucket.filter(timestamp => now - timestamp < this.config.longWindow.duration);
    this.messageBuckets.set(normalized, bucket);

    // Verificar limite de curto prazo (1 minuto)
    const recentMessages = bucket.filter(
      timestamp => now - timestamp < this.config.shortWindow.duration
    );

    if (recentMessages.length >= this.config.shortWindow.maxMessages) {
      const oldestInWindow = Math.min(...recentMessages);
      const retryAfter = this.config.shortWindow.duration - (now - oldestInWindow);

      log.warn(`Rate limit exceeded (short window)`, {
        context: 'rate_limiter',
        phoneNumber: normalized,
        messagesInWindow: recentMessages.length,
        maxAllowed: this.config.shortWindow.maxMessages,
        retryAfter,
      });

      return {
        allowed: false,
        reason: `Limite de ${this.config.shortWindow.maxMessages} mensagens por minuto excedido`,
        retryAfter,
        window: 'short',
      };
    }

    // Verificar limite de longo prazo (1 hora)
    if (bucket.length >= this.config.longWindow.maxMessages) {
      const oldestInWindow = Math.min(...bucket);
      const retryAfter = this.config.longWindow.duration - (now - oldestInWindow);

      log.warn(`Rate limit exceeded (long window)`, {
        context: 'rate_limiter',
        phoneNumber: normalized,
        messagesInWindow: bucket.length,
        maxAllowed: this.config.longWindow.maxMessages,
        retryAfter,
      });

      return {
        allowed: false,
        reason: `Limite de ${this.config.longWindow.maxMessages} mensagens por hora excedido`,
        retryAfter,
        window: 'long',
      };
    }

    return { allowed: true };
  }

  /**
   * Registra nova mensagem enviada
   * @param {string} contactId - ID do contato
   */
  recordMessage(contactId) {
    const normalized = normalizePhone(contactId);
    const now = Date.now();

    let bucket = this.messageBuckets.get(normalized);

    if (!bucket) {
      bucket = [];
      this.messageBuckets.set(normalized, bucket);
    }

    bucket.push(now);

    log.debug(`Message recorded for rate limiting`, {
      context: 'rate_limiter',
      phoneNumber: normalized,
      totalInHour: bucket.length,
    });
  }

  /**
   * Obtém estatísticas de uso para um contato
   * @param {string} contactId - ID do contato
   * @returns {Object} Estatísticas de mensagens
   */
  getStats(contactId) {
    const normalized = normalizePhone(contactId);
    const now = Date.now();

    let bucket = this.messageBuckets.get(normalized) || [];

    // Limpar timestamps antigos
    bucket = bucket.filter(timestamp => now - timestamp < this.config.longWindow.duration);

    const recentMessages = bucket.filter(
      timestamp => now - timestamp < this.config.shortWindow.duration
    );

    return {
      messagesLastMinute: recentMessages.length,
      messagesLastHour: bucket.length,
      shortWindowLimit: this.config.shortWindow.maxMessages,
      longWindowLimit: this.config.longWindow.maxMessages,
      shortWindowRemaining: Math.max(0, this.config.shortWindow.maxMessages - recentMessages.length),
      longWindowRemaining: Math.max(0, this.config.longWindow.maxMessages - bucket.length),
    };
  }

  /**
   * Reseta rate limit para um contato (uso administrativo)
   * @param {string} contactId - ID do contato
   */
  reset(contactId) {
    const normalized = normalizePhone(contactId);
    this.messageBuckets.delete(normalized);

    log.info(`Rate limit reset`, {
      context: 'rate_limiter',
      phoneNumber: normalized,
    });
  }

  /**
   * Reseta todos os rate limits
   */
  resetAll() {
    const count = this.messageBuckets.size;
    this.messageBuckets.clear();

    log.info(`All rate limits reset`, {
      context: 'rate_limiter',
      contactsCleared: count,
    });
  }

  /**
   * Auto-cleanup de buckets antigos
   *  FIX CRÍTICO: Adicionar try-catch para evitar crash do processo
   */
  startAutoCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      try {
        const now = Date.now();
        let cleaned = 0;

        //  FIX: Criar snapshot para evitar problemas de iteração
        const entries = [...this.messageBuckets.entries()];

        for (const [contactId, bucket] of entries) {
          // Filtrar timestamps dentro da janela longa
          const filteredBucket = bucket.filter(
            timestamp => now - timestamp < this.config.longWindow.duration
          );

          if (filteredBucket.length === 0) {
            // Bucket vazio - remover
            this.messageBuckets.delete(contactId);
            cleaned++;
          } else if (filteredBucket.length < bucket.length) {
            // Atualizar bucket com timestamps filtrados
            this.messageBuckets.set(contactId, filteredBucket);
          }
        }

        if (cleaned > 0) {
          log.debug(`Rate limiter auto-cleanup`, {
            context: 'rate_limiter',
            bucketsRemoved: cleaned,
            remainingBuckets: this.messageBuckets.size,
          });
        }
      } catch (error) {
        //  FIX: Log do erro mas não deixar crashar o processo
        log.error(`Rate limiter cleanup error (ignored)`, {
          context: 'rate_limiter',
          error: error.message,
        });
      }
    }, 300000); // A cada 5 minutos
  }

  /**
   * Shutdown do rate limiter
   */
  shutdown() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Estatísticas globais do rate limiter
   */
  getGlobalStats() {
    const now = Date.now();
    let totalShortWindow = 0;
    let totalLongWindow = 0;
    let activeContacts = 0;

    for (const bucket of this.messageBuckets.values()) {
      const filtered = bucket.filter(
        timestamp => now - timestamp < this.config.longWindow.duration
      );

      if (filtered.length > 0) {
        activeContacts++;
        totalLongWindow += filtered.length;

        const recentMessages = filtered.filter(
          timestamp => now - timestamp < this.config.shortWindow.duration
        );
        totalShortWindow += recentMessages.length;
      }
    }

    return {
      activeContacts,
      messagesLastMinute: totalShortWindow,
      messagesLastHour: totalLongWindow,
      avgMessagesPerContactLastHour: activeContacts > 0 ? (totalLongWindow / activeContacts).toFixed(2) : 0,
    };
  }
}

// Exportar instância singleton
const rateLimiter = new RateLimiter();

export default rateLimiter;
