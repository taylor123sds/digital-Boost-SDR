/**
 * @file MemoryLockProvider.js
 * @description Implementação de locks em memória (fallback/desenvolvimento)
 *
 * Não deve ser usado em produção com múltiplas instâncias
 */

import { ILockProvider } from '../contracts/ILockProvider.js';
import crypto from 'crypto';

/**
 * Implementação de lock em memória
 * @implements {ILockProvider}
 */
export class MemoryLockProvider extends ILockProvider {
  constructor(options = {}) {
    super();
    this.locks = new Map();
    this.waitQueues = new Map();
    this.defaultTtl = options.defaultTtl || 30000;
    this.maxRetries = options.maxRetries || 50;
    this.retryDelay = options.retryDelay || 100;

    // Cleanup de locks expirados
    this.cleanupInterval = setInterval(() => this._cleanup(), 10000);
  }

  /**
   * @inheritdoc
   */
  async acquire(resource, options = {}) {
    const ttl = options.ttl || this.defaultTtl;
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;

    const lockId = this._generateLockId();
    let attempts = 0;

    while (attempts < maxRetries) {
      const existingLock = this.locks.get(resource);

      // Verificar se lock expirou
      if (existingLock && existingLock.expiresAt < Date.now()) {
        this.locks.delete(resource);
      }

      // Tentar adquirir
      if (!this.locks.has(resource)) {
        this.locks.set(resource, {
          lockId,
          expiresAt: Date.now() + ttl,
          acquiredAt: Date.now()
        });

        return {
          acquired: true,
          lockId,
          resource
        };
      }

      // Aguardar e tentar novamente
      await this._sleep(retryDelay);
      attempts++;
    }

    return {
      acquired: false,
      error: 'max_retries_exceeded',
      resource
    };
  }

  /**
   * @inheritdoc
   */
  async release(resource, lockId) {
    const lock = this.locks.get(resource);

    if (!lock) {
      return false;
    }

    if (lock.lockId !== lockId) {
      console.warn(`[MemoryLock] Lock mismatch para ${resource}`);
      return false;
    }

    this.locks.delete(resource);

    // Notificar próximo na fila
    const queue = this.waitQueues.get(resource);
    if (queue && queue.length > 0) {
      const next = queue.shift();
      if (next.resolve) {
        next.resolve();
      }
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  async extend(resource, lockId, ttl) {
    const lock = this.locks.get(resource);

    if (!lock || lock.lockId !== lockId) {
      return false;
    }

    lock.expiresAt = Date.now() + ttl;
    return true;
  }

  /**
   * @inheritdoc
   */
  async isLocked(resource) {
    const lock = this.locks.get(resource);

    if (!lock) return false;

    if (lock.expiresAt < Date.now()) {
      this.locks.delete(resource);
      return false;
    }

    return true;
  }

  /**
   * @inheritdoc
   */
  async withLock(resource, fn, options = {}) {
    const result = await this.acquire(resource, options);

    if (!result.acquired) {
      throw new Error(`Não foi possível adquirir lock para ${resource}: ${result.error}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(resource, result.lockId);
    }
  }

  /**
   * @inheritdoc
   */
  async getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [, lock] of this.locks) {
      if (lock.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    return {
      active,
      expired,
      waiting: Array.from(this.waitQueues.values()).reduce((sum, q) => sum + q.length, 0),
      provider: 'memory'
    };
  }

  /**
   * @inheritdoc
   */
  async close() {
    clearInterval(this.cleanupInterval);
    this.locks.clear();
    this.waitQueues.clear();
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Gera ID único para lock
   * @private
   */
  _generateLockId() {
    return `lock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpa locks expirados
   * @private
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [resource, lock] of this.locks) {
      if (lock.expiresAt < now) {
        this.locks.delete(resource);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryLock] Cleanup: ${cleaned} locks expirados`);
    }
  }
}

export default MemoryLockProvider;
