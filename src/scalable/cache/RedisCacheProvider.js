/**
 * @file RedisCacheProvider.js
 * @description Implementação de cache com Redis (produção)
 *
 * Usa ioredis para conexão com Redis
 * Suporta cluster, sentinela e conexão simples
 */

import { ICacheProvider } from '../contracts/ICacheProvider.js';

/**
 * Implementação de cache com Redis
 * @implements {ICacheProvider}
 */
export class RedisCacheProvider extends ICacheProvider {
  /**
   * @param {Object} options - Opções de configuração
   * @param {string} [options.url] - URL de conexão Redis
   * @param {string} [options.host='localhost'] - Host do Redis
   * @param {number} [options.port=6379] - Porta do Redis
   * @param {string} [options.password] - Senha do Redis
   * @param {number} [options.db=0] - Database number
   * @param {string} [options.keyPrefix='orbion:'] - Prefixo das chaves
   * @param {number} [options.defaultTtl=3600] - TTL padrão em segundos
   */
  constructor(options = {}) {
    super();
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password,
      db: options.db || 0,
      keyPrefix: options.keyPrefix || 'orbion:',
      defaultTtl: options.defaultTtl || 3600,
      ...options
    };

    this.client = null;
    this.isConnected = false;
  }

  /**
   * Conecta ao Redis
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.client && this.isConnected) return;

    try {
      // Importação dinâmica do ioredis
      const Redis = (await import('ioredis')).default;

      const redisOptions = {
        host: this.options.host,
        port: this.options.port,
        password: this.options.password,
        db: this.options.db,
        keyPrefix: this.options.keyPrefix,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      };

      // Se URL fornecida, usar ela
      if (this.options.url) {
        this.client = new Redis(this.options.url, {
          keyPrefix: this.options.keyPrefix,
          retryStrategy: redisOptions.retryStrategy
        });
      } else {
        this.client = new Redis(redisOptions);
      }

      // Event handlers
      this.client.on('connect', () => {
        console.log('[RedisCache] Conectado ao Redis');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('[RedisCache] Erro:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[RedisCache] Conexão fechada');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;

    } catch (error) {
      console.error('[RedisCache] Falha ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * Garante que o cliente está conectado
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
  async get(key) {
    await this._ensureConnected();

    try {
      const value = await this.client.get(key);
      if (value === null) return null;

      // Tentar deserializar JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`[RedisCache] Erro ao obter ${key}:`, error.message);
      return null;
    }
  }

  /**
   * @inheritdoc
   */
  async set(key, value, options = {}) {
    await this._ensureConnected();

    try {
      const ttl = options.ttl || this.options.defaultTtl;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`[RedisCache] Erro ao definir ${key}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async delete(key) {
    await this._ensureConnected();

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`[RedisCache] Erro ao deletar ${key}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async exists(key) {
    await this._ensureConnected();

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[RedisCache] Erro ao verificar ${key}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async deletePattern(pattern) {
    await this._ensureConnected();

    try {
      // Usar SCAN para encontrar chaves (mais seguro que KEYS)
      const fullPattern = this.options.keyPrefix + pattern;
      let cursor = '0';
      let count = 0;

      do {
        const [newCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // Remover prefixo das chaves para deletar corretamente
          const keysWithoutPrefix = keys.map(k =>
            k.startsWith(this.options.keyPrefix)
              ? k.slice(this.options.keyPrefix.length)
              : k
          );
          await this.client.del(...keysWithoutPrefix);
          count += keys.length;
        }
      } while (cursor !== '0');

      return count;
    } catch (error) {
      console.error(`[RedisCache] Erro ao deletar padrão ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * @inheritdoc
   */
  async increment(key, amount = 1) {
    await this._ensureConnected();

    try {
      if (amount === 1) {
        return await this.client.incr(key);
      }
      return await this.client.incrby(key, amount);
    } catch (error) {
      console.error(`[RedisCache] Erro ao incrementar ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * @inheritdoc
   */
  async expire(key, ttl) {
    await this._ensureConnected();

    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`[RedisCache] Erro ao definir TTL ${key}:`, error.message);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async getMany(keys) {
    await this._ensureConnected();

    try {
      const values = await this.client.mget(...keys);
      const result = new Map();

      keys.forEach((key, index) => {
        if (values[index] !== null) {
          try {
            result.set(key, JSON.parse(values[index]));
          } catch {
            result.set(key, values[index]);
          }
        }
      });

      return result;
    } catch (error) {
      console.error('[RedisCache] Erro ao obter múltiplos:', error.message);
      return new Map();
    }
  }

  /**
   * @inheritdoc
   */
  async setMany(entries, options = {}) {
    await this._ensureConnected();

    try {
      const ttl = options.ttl || this.options.defaultTtl;
      const pipeline = this.client.pipeline();

      for (const [key, value] of entries) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl > 0) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('[RedisCache] Erro ao definir múltiplos:', error.message);
      return false;
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

  /**
   * @inheritdoc
   */
  async healthCheck() {
    const start = Date.now();

    try {
      await this._ensureConnected();
      const pong = await this.client.ping();

      return {
        healthy: pong === 'PONG',
        latency: Date.now() - start,
        provider: 'redis',
        connected: this.isConnected
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: 'redis'
      };
    }
  }

  /**
   * Obtém informações do Redis
   * @returns {Promise<Object>}
   */
  async getInfo() {
    await this._ensureConnected();

    try {
      const info = await this.client.info();
      return this._parseRedisInfo(info);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Parseia output do INFO do Redis
   * @private
   */
  _parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }

    return result;
  }
}

export default RedisCacheProvider;
