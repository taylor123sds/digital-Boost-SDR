/**
 * @file scalable/index.js
 * @description Módulo principal de infraestrutura escalável
 *
 * Este módulo fornece todas as abstrações necessárias para
 * escalar o ORBION de um sistema single-tenant para SaaS multi-tenant
 *
 * Funcionalidades:
 * - Cache distribuído (Redis/Memory)
 * - Locks distribuídos (Redis/Memory)
 * - Filas de mensagens (BullMQ/Memory)
 * - Database abstrato (PostgreSQL/SQLite)
 * - Multi-tenancy completo
 * - Feature flags para migração gradual
 *
 * @example
 * ```javascript
 * import { init, getDatabase, getCache, isFeatureEnabled } from './scalable/index.js';
 *
 * // Inicializar sistema escalável
 * await init();
 *
 * // Usar componentes
 * const db = getDatabase();
 * const cache = getCache();
 *
 * if (isFeatureEnabled('multi_tenant_enabled')) {
 *   // Código multi-tenant
 * }
 * ```
 */

// ==================== IMPORTS ====================

// Contracts/Interfaces
export {
  ICacheProvider,
  ILockProvider,
  IDatabaseProvider,
  IQueueProvider
} from './contracts/index.js';

// Cache
export {
  getCache,
  createCacheProvider,
  MemoryCacheProvider
} from './cache/index.js';

// Locks
export {
  getLockProvider,
  createLockProvider,
  MemoryLockProvider
} from './locks/index.js';

// Queue
export {
  getQueue,
  createQueueProvider,
  getAllQueues,
  closeAllQueues,
  getAllQueueStats,
  getInboundQueue,
  getOutboundQueue,
  getWebhookQueue,
  getAIQueue,
  getLeadsQueue,
  QueueNames,
  MemoryQueueProvider
} from './queue/index.js';

// Database
export {
  getDatabase,
  createDatabaseProvider,
  initDatabase,
  resetDatabase,
  DatabaseType,
  defaultMigrations,
  SQLiteDatabaseProvider
} from './database/index.js';

// Tenant
export {
  TenantModel,
  TenantStatus,
  TenantPlan,
  PlanLimits,
  TenantService,
  getCurrentTenant,
  getCurrentTenantId,
  runWithTenant,
  createTenantMiddleware,
  requireTenant,
  withTenantFilter,
  getTenantService,
  resetTenantService
} from './tenant/index.js';

// Feature Flags
export {
  getFeatureFlags,
  isFeatureEnabled,
  withFeatureFlag,
  guardWithFlag,
  FeatureFlagsManager
} from './config/FeatureFlags.js';

// Admin
export { createAdminRoutes } from './admin/AdminApiRoutes.js';

// Agents
export {
  AgentModel,
  AgentType,
  AgentStatus,
  AgentService,
  getAgentService,
  resetAgentService,
  createAgentRoutes,
  agentMigrations
} from './agents/index.js';

// ==================== INICIALIZAÇÃO ====================

let initialized = false;

/**
 * Inicializa todo o sistema escalável
 * @param {Object} opts - Opções de inicialização
 * @returns {Promise<Object>} Componentes inicializados
 */
export async function init(opts = {}) {
  if (initialized && !opts.force) {
    console.log('[Scalable] Sistema já inicializado');
    return getComponents();
  }

  console.log('[Scalable] Inicializando sistema escalável...');

  const components = {};

  try {
    // 1. Feature Flags (primeiro, para controlar outras inicializações)
    const featureFlags = getFeatureFlags();
    await featureFlags.init();
    components.featureFlags = featureFlags;
    console.log('[Scalable] Feature flags inicializadas');

    // 2. Database
    const { initDatabase, defaultMigrations } = await import('./database/index.js');
    components.database = await initDatabase({
      migrations: opts.runMigrations !== false ? defaultMigrations : [],
      ...opts.database
    });
    console.log('[Scalable] Database inicializado');

    // 3. Cache
    const { getCache } = await import('./cache/index.js');
    components.cache = getCache(opts.cache);
    console.log('[Scalable] Cache inicializado');

    // 4. Locks
    const { getLockProvider } = await import('./locks/index.js');
    components.locks = getLockProvider(opts.locks);
    console.log('[Scalable] Locks inicializados');

    // 5. Queues (opcional, se habilitado)
    if (isFeatureEnabled('use_bullmq_queue') || opts.enableQueues) {
      const { getWebhookQueue, getAIQueue, getOutboundQueue } = await import('./queue/index.js');
      components.queues = {
        webhook: getWebhookQueue(),
        ai: getAIQueue(),
        outbound: getOutboundQueue()
      };
      console.log('[Scalable] Filas inicializadas');
    }

    // 6. Tenant Service (se multi-tenant habilitado)
    if (isFeatureEnabled('multi_tenant_enabled') || opts.enableMultiTenant) {
      const { TenantService } = await import('./tenant/index.js');
      components.tenantService = new TenantService({
        database: components.database,
        cache: components.cache
      });
      console.log('[Scalable] TenantService inicializado');
    }

    initialized = true;
    console.log('[Scalable] Sistema escalável pronto!');

    return components;

  } catch (error) {
    console.error('[Scalable] Erro na inicialização:', error);
    throw error;
  }
}

/**
 * Obtém componentes inicializados
 */
export function getComponents() {
  const { getDatabase } = require('./database/index.js');
  const { getCache } = require('./cache/index.js');
  const { getLockProvider } = require('./locks/index.js');
  const { getFeatureFlags } = require('./config/FeatureFlags.js');

  return {
    database: getDatabase(),
    cache: getCache(),
    locks: getLockProvider(),
    featureFlags: getFeatureFlags()
  };
}

/**
 * Encerra todos os componentes
 */
export async function shutdown() {
  console.log('[Scalable] Encerrando sistema...');

  try {
    // Fechar filas
    const { closeAllQueues } = await import('./queue/index.js');
    await closeAllQueues();

    // Desconectar database
    const { resetDatabase } = await import('./database/index.js');
    await resetDatabase();

    initialized = false;
    console.log('[Scalable] Sistema encerrado');

  } catch (error) {
    console.error('[Scalable] Erro ao encerrar:', error);
  }
}

// ==================== HELPERS ====================

/**
 * Verifica status do sistema
 */
export async function healthCheck() {
  const health = {
    status: 'healthy',
    components: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Database
    const db = getDatabase();
    health.components.database = await db.healthCheck();

    // Cache
    const cache = getCache();
    const cacheTest = await cache.set('_health_check', 'ok', { ttl: 1 });
    health.components.cache = { healthy: cacheTest };

    // Queues
    const { getAllQueueStats } = await import('./queue/index.js');
    health.components.queues = await getAllQueueStats();

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  return health;
}

/**
 * Obtém estatísticas do sistema
 */
export async function getStats() {
  const stats = {
    timestamp: new Date().toISOString()
  };

  try {
    // Database stats
    const db = getDatabase();
    stats.database = db.getStats();

    // Queue stats
    const { getAllQueueStats } = await import('./queue/index.js');
    stats.queues = await getAllQueueStats();

    // Feature flags
    stats.featureFlags = getFeatureFlags().listAll().length;

  } catch (error) {
    stats.error = error.message;
  }

  return stats;
}

// ==================== EXPRESS MIDDLEWARE ====================

/**
 * Middleware Express para injetar componentes escaláveis
 */
export function scalableMiddleware(opts = {}) {
  return async (req, res, next) => {
    // Injetar database
    req.db = getDatabase();

    // Injetar cache
    req.cache = getCache();

    // Injetar feature flags helper
    req.isFeatureEnabled = (name) => isFeatureEnabled(name, {
      tenantId: req.tenantId,
      userId: req.user?.id
    });

    next();
  };
}

/**
 * Cria rotas de health check
 */
export function createHealthRoutes() {
  const { Router } = require('express');
  const router = Router();

  router.get('/health', async (req, res) => {
    const health = await healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  router.get('/stats', async (req, res) => {
    const stats = await getStats();
    res.json(stats);
  });

  return router;
}

// ==================== DEFAULT EXPORT ====================

export default {
  // Inicialização
  init,
  shutdown,
  healthCheck,
  getStats,

  // Database
  getDatabase,
  initDatabase,
  DatabaseType,

  // Cache
  getCache,

  // Locks
  getLockProvider,

  // Queue
  getQueue,
  QueueNames,

  // Tenant
  TenantModel,
  TenantService,
  getCurrentTenant,
  runWithTenant,
  createTenantMiddleware,

  // Feature Flags
  getFeatureFlags,
  isFeatureEnabled,

  // Admin
  createAdminRoutes,

  // Agents
  AgentModel,
  AgentType,
  AgentStatus,
  AgentService,
  getAgentService,
  createAgentRoutes,

  // Middleware
  scalableMiddleware,
  createHealthRoutes
};
