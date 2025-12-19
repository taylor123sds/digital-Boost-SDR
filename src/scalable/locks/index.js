/**
 * @file locks/index.js
 * @description Factory e exportações do módulo de locks distribuídos
 */

import { MemoryLockProvider } from './MemoryLockProvider.js';
import { RedisLockProvider } from './RedisLockProvider.js';

/**
 * Tipos de provedor de lock disponíveis
 */
export const LockProviderType = {
  MEMORY: 'memory',
  REDIS: 'redis'
};

/**
 * Factory para criar provedores de lock
 * @param {string} type - Tipo do provedor
 * @param {Object} options - Opções de configuração
 * @returns {ILockProvider}
 */
export function createLockProvider(type, options = {}) {
  switch (type) {
    case LockProviderType.REDIS:
      return new RedisLockProvider(options);

    case LockProviderType.MEMORY:
    default:
      return new MemoryLockProvider(options);
  }
}

/**
 * Cria provedor baseado em variáveis de ambiente
 * @returns {ILockProvider}
 */
export function createLockProviderFromEnv() {
  const redisUrl = process.env.REDIS_URL;
  const useRedis = process.env.USE_REDIS === 'true' || !!redisUrl;

  if (useRedis) {
    console.log('[Lock] Usando Redis como provedor de locks');
    return createLockProvider(LockProviderType.REDIS, {
      url: redisUrl,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'lock:'
    });
  }

  console.log('[Lock] Usando Memory como provedor de locks (dev/fallback)');
  return createLockProvider(LockProviderType.MEMORY);
}

// Singleton instance
let lockInstance = null;

/**
 * Obtém instância singleton do lock provider
 * @returns {ILockProvider}
 */
export function getLockProvider() {
  if (!lockInstance) {
    lockInstance = createLockProviderFromEnv();
  }
  return lockInstance;
}

/**
 * Reseta instância do lock provider (para testes)
 */
export async function resetLockProvider() {
  if (lockInstance) {
    await lockInstance.close();
    lockInstance = null;
  }
}

// Exportações
export { MemoryLockProvider } from './MemoryLockProvider.js';
export { RedisLockProvider } from './RedisLockProvider.js';

export default {
  createLockProvider,
  createLockProviderFromEnv,
  getLockProvider,
  resetLockProvider,
  LockProviderType
};
