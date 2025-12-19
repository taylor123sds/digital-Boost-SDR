/**
 * @file RedisLockProvider.js
 * @description Implementação de locks distribuídos com Redis (produção)
 *
 * Usa SET NX EX para locks atômicos
 * Suporta múltiplas instâncias
 */

import { ILockProvider } from '../contracts/ILockProvider.js';
import crypto from 'crypto';

/**
 * Implementação de lock distribuído com Redis
 * @implements {ILockProvider}
 */
export class RedisLockProvider extends ILockProvider {
  /**
   * @param {Object} options - Opções de configuração
   * @param {Object} [options.redis] - Cliente Redis existente
   * @param {string} [options.url] - URL do Redis
   * @param {string} [options.host] - Host do Redis
   * @param {number} [options.port] - Porta do Redis
   * @param {string} [options.keyPrefix='lock:'] - Prefixo das chaves
   * @param {number} [options.defaultTtl=30000] - TTL padrão em ms
   */
  constructor(options = {}) {
    super();
    this.options = {
      keyPrefix: options.keyPrefix || 'lock:',
      defaultTtl: options.defaultTtl || 30000,
      maxRetries: options.maxRetries || 50,
      retryDelay: options.retryDelay || 100,
      ...options
    };

    this.client = options.redis || null;
    this.isConnected = !!options.redis;
  }

  /**
   * Conecta ao Redis
   */
  async connect() {
    if (this.client && this.isConnected) return;

    try {
      const Redis = (await import('ioredis')).default;

      if (this.options.url) {
        this.client = new Redis(this.options.url);
      } else {
        this.client = new Redis({
          host: this.options.host || 'localhost',
          port: this.options.port || 6379,
          password: this.options.password,
          db: this.options.db || 0
        });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('[RedisLock] Erro:', err.message);
        this.isConnected = false;
      });

      await this.client.ping();
      this.isConnected = true;

    } catch (error) {
      console.error('[RedisLock] Falha ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * @private
   */
  async _ensureConnected() {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
  }

  /**
   * @inheritdoc
   */
  async acquire(resource, options = {}) {
    await this._ensureConnected();

    const ttl = options.ttl || this.options.defaultTtl;
    const maxRetries = options.maxRetries || this.options.maxRetries;
    const retryDelay = options.retryDelay || this.options.retryDelay;

    const lockId = this._generateLockId();
    const key = this._getKey(resource);
    const ttlSeconds = Math.ceil(ttl / 1000);

    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        // SET key value NX EX ttl
        const result = await this.client.set(key, lockId, 'NX', 'EX', ttlSeconds);

        if (result === 'OK') {
          return {
            acquired: true,
            lockId,
            resource,
            expiresAt: Date.now() + ttl
          };
        }

        // Lock existe, verificar se expirou
        const existingTtl = await this.client.ttl(key);
        if (existingTtl === -2) {
          // Chave não existe mais, tentar novamente imediatamente
          continue;
        }

      } catch (error) {
        console.error(`[RedisLock] Erro ao adquirir ${resource}:`, error.message);
      }

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
    await this._ensureConnected();

    const key = this._getKey(resource);

    try {
      // Script Lua para garantir que só deleta se o lockId corresponder
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, key, lockId);
      return result === 1;

    } catch (error) {
      console.error(`[RedisLock] Erro ao liberar ${resource}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async extend(resource, lockId, ttl) {
    await this._ensureConnected();

    const key = this._getKey(resource);
    const ttlSeconds = Math.ceil(ttl / 1000);

    try {
      // Script Lua para renovar TTL apenas se o lockId corresponder
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, key, lockId, ttlSeconds);
      return result === 1;

    } catch (error) {
      console.error(`[RedisLock] Erro ao estender ${resource}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async isLocked(resource) {
    await this._ensureConnected();

    const key = this._getKey(resource);

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`[RedisLock] Erro ao verificar ${resource}:`, error.message);
      return false;
    }
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
    await this._ensureConnected();

    try {
      // Contar locks ativos usando SCAN
      const pattern = this._getKey('*');
      let cursor = '0';
      let count = 0;

      do {
        const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        count += keys.length;
      } while (cursor !== '0');

      return {
        active: count,
        provider: 'redis',
        connected: this.isConnected
      };

    } catch (error) {
      return {
        active: 0,
        provider: 'redis',
        error: error.message
      };
    }
  }

  /**
   * @inheritdoc
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Gera ID único para lock
   * @private
   */
  _generateLockId() {
    return `${process.pid}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Obtém chave com prefixo
   * @private
   */
  _getKey(resource) {
    return `${this.options.keyPrefix}${resource}`;
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RedisLockProvider;
