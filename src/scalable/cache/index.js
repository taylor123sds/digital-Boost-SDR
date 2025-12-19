/**
 * @file cache/index.js
 * @description Factory e exportações do módulo de cache
 *
 * Usa padrão Strategy para permitir trocar implementações
 * sem alterar código de negócio
 */

import { MemoryCacheProvider } from './MemoryCacheProvider.js';
import { RedisCacheProvider } from './RedisCacheProvider.js';

/**
 * Tipos de provedor de cache disponíveis
 */
export const CacheProviderType = {
  MEMORY: 'memory',
  REDIS: 'redis'
};

/**
 * Factory para criar provedores de cache
 * @param {string} type - Tipo do provedor
 * @param {Object} options - Opções de configuração
 * @returns {ICacheProvider}
 */
export function createCacheProvider(type, options = {}) {
  switch (type) {
    case CacheProviderType.REDIS:
      return new RedisCacheProvider(options);

    case CacheProviderType.MEMORY:
    default:
      return new MemoryCacheProvider(options);
  }
}

/**
 * Cria provedor baseado em variáveis de ambiente
 * @returns {ICacheProvider}
 */
export function createCacheProviderFromEnv() {
  const redisUrl = process.env.REDIS_URL;
  const useRedis = process.env.USE_REDIS === 'true' || !!redisUrl;

  if (useRedis) {
    console.log('[Cache] Usando Redis como provedor de cache');
    return createCacheProvider(CacheProviderType.REDIS, {
      url: redisUrl,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_PREFIX || 'orbion:'
    });
  }

  console.log('[Cache] Usando Memory como provedor de cache (dev/fallback)');
  return createCacheProvider(CacheProviderType.MEMORY, {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000'),
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600')
  });
}

// Singleton instance
let cacheInstance = null;

/**
 * Obtém instância singleton do cache
 * @returns {ICacheProvider}
 */
export function getCache() {
  if (!cacheInstance) {
    cacheInstance = createCacheProviderFromEnv();
  }
  return cacheInstance;
}

/**
 * Reseta instância do cache (para testes)
 */
export async function resetCache() {
  if (cacheInstance) {
    await cacheInstance.close();
    cacheInstance = null;
  }
}

// Exportações
export { MemoryCacheProvider } from './MemoryCacheProvider.js';
export { RedisCacheProvider } from './RedisCacheProvider.js';

export default {
  createCacheProvider,
  createCacheProviderFromEnv,
  getCache,
  resetCache,
  CacheProviderType
};
