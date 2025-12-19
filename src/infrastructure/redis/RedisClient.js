/**
 * REDIS CLIENT
 * Conexão compartilhada com Redis para rate limiting, cache e filas
 */

import Redis from 'ioredis';
import logger from '../../utils/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Conecta ao Redis
   */
  connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://:evolution_redis_pass_2025_secure@redis:6379';

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('[REDIS] Conectado com sucesso');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('[REDIS] Erro de conexão:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('[REDIS] Conexão fechada');
      });

      // Tenta conectar
      this.client.connect().catch(err => {
        logger.error('[REDIS] Falha ao conectar:', err.message);
      });

      return this.client;
    } catch (error) {
      logger.error('[REDIS] Erro ao criar cliente:', error.message);
      return null;
    }
  }

  /**
   * Retorna o cliente Redis
   */
  getClient() {
    if (!this.client) {
      this.connect();
    }
    return this.client;
  }

  /**
   * Verifica se está conectado
   */
  isReady() {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Incrementa contador com TTL
   */
  async increment(key, ttlSeconds = 3600) {
    if (!this.isReady()) {
      return null;
    }

    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, ttlSeconds);
      const results = await multi.exec();
      return results[0][1]; // Retorna o valor incrementado
    } catch (error) {
      logger.error('[REDIS] Erro ao incrementar:', error.message);
      return null;
    }
  }

  /**
   * Obtém valor
   */
  async get(key) {
    if (!this.isReady()) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('[REDIS] Erro ao obter:', error.message);
      return null;
    }
  }

  /**
   * Define valor com TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      logger.error('[REDIS] Erro ao definir:', error.message);
      return false;
    }
  }

  /**
   * Fecha conexão
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('[REDIS] Desconectado');
    }
  }
}

// Singleton
const redisClient = new RedisClient();

export default redisClient;
export { RedisClient };
