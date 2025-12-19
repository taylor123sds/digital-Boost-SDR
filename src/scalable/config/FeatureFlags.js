/**
 * @file FeatureFlags.js
 * @description Sistema de Feature Flags para migração gradual
 *
 * Permite habilitar/desabilitar funcionalidades por:
 * - Ambiente (dev/staging/prod)
 * - Tenant específico
 * - Porcentagem de usuários
 * - Data de expiração
 */

import { getCache } from '../cache/index.js';

/**
 * Definição de uma feature flag
 */
class FeatureFlag {
  constructor(config) {
    this.name = config.name;
    this.description = config.description || '';
    this.defaultValue = config.defaultValue ?? false;
    this.environments = config.environments || ['development', 'staging', 'production'];
    this.enabledTenants = config.enabledTenants || [];
    this.disabledTenants = config.disabledTenants || [];
    this.percentage = config.percentage ?? 100;
    this.expiresAt = config.expiresAt || null;
    this.metadata = config.metadata || {};
  }

  /**
   * Verifica se flag está habilitada
   * @param {Object} context
   * @returns {boolean}
   */
  isEnabled(context = {}) {
    const { tenantId, userId, environment } = context;

    // Verificar ambiente
    const currentEnv = environment || process.env.NODE_ENV || 'development';
    if (!this.environments.includes(currentEnv)) {
      return false;
    }

    // Verificar expiração
    if (this.expiresAt && new Date() > new Date(this.expiresAt)) {
      return false;
    }

    // Verificar tenant desabilitado
    if (tenantId && this.disabledTenants.includes(tenantId)) {
      return false;
    }

    // Verificar tenant habilitado explicitamente
    if (tenantId && this.enabledTenants.length > 0) {
      return this.enabledTenants.includes(tenantId);
    }

    // Verificar porcentagem (rollout gradual)
    if (this.percentage < 100) {
      const hash = this._hashString(userId || tenantId || 'default');
      const bucket = hash % 100;
      if (bucket >= this.percentage) {
        return false;
      }
    }

    return this.defaultValue;
  }

  /**
   * Hash simples para consistência de rollout
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Converte para JSON
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      defaultValue: this.defaultValue,
      environments: this.environments,
      enabledTenants: this.enabledTenants,
      disabledTenants: this.disabledTenants,
      percentage: this.percentage,
      expiresAt: this.expiresAt,
      metadata: this.metadata
    };
  }
}

/**
 * Gerenciador de Feature Flags
 */
class FeatureFlagsManager {
  constructor() {
    this.flags = new Map();
    this.cache = null;
    this.cachePrefix = 'ff:';
    this.cacheTtl = 60; // 1 minuto

    // Registrar flags padrão
    this._registerDefaultFlags();
  }

  /**
   * Inicializa o gerenciador
   */
  async init() {
    this.cache = getCache();
  }

  /**
   * Registra uma nova feature flag
   * @param {Object} config
   */
  register(config) {
    const flag = new FeatureFlag(config);
    this.flags.set(flag.name, flag);
    return flag;
  }

  /**
   * Verifica se uma flag está habilitada
   * @param {string} name - Nome da flag
   * @param {Object} context - Contexto (tenantId, userId, etc)
   * @returns {boolean}
   */
  isEnabled(name, context = {}) {
    const flag = this.flags.get(name);
    if (!flag) {
      console.warn(`[FeatureFlags] Flag '${name}' não encontrada`);
      return false;
    }
    return flag.isEnabled(context);
  }

  /**
   * Alias para isEnabled
   */
  check(name, context = {}) {
    return this.isEnabled(name, context);
  }

  /**
   * Obtém valor de uma flag (para flags com valores customizados)
   * @param {string} name
   * @param {Object} context
   * @param {any} defaultValue
   */
  getValue(name, context = {}, defaultValue = null) {
    const flag = this.flags.get(name);
    if (!flag) return defaultValue;

    if (!flag.isEnabled(context)) {
      return defaultValue;
    }

    return flag.metadata.value ?? defaultValue;
  }

  /**
   * Habilita flag para um tenant específico
   * @param {string} name
   * @param {string} tenantId
   */
  async enableForTenant(name, tenantId) {
    const flag = this.flags.get(name);
    if (!flag) return false;

    if (!flag.enabledTenants.includes(tenantId)) {
      flag.enabledTenants.push(tenantId);
    }

    // Remover de desabilitados se estiver lá
    const idx = flag.disabledTenants.indexOf(tenantId);
    if (idx > -1) {
      flag.disabledTenants.splice(idx, 1);
    }

    await this._invalidateCache(name);
    return true;
  }

  /**
   * Desabilita flag para um tenant específico
   * @param {string} name
   * @param {string} tenantId
   */
  async disableForTenant(name, tenantId) {
    const flag = this.flags.get(name);
    if (!flag) return false;

    if (!flag.disabledTenants.includes(tenantId)) {
      flag.disabledTenants.push(tenantId);
    }

    // Remover de habilitados se estiver lá
    const idx = flag.enabledTenants.indexOf(tenantId);
    if (idx > -1) {
      flag.enabledTenants.splice(idx, 1);
    }

    await this._invalidateCache(name);
    return true;
  }

  /**
   * Atualiza porcentagem de rollout
   * @param {string} name
   * @param {number} percentage
   */
  async setPercentage(name, percentage) {
    const flag = this.flags.get(name);
    if (!flag) return false;

    flag.percentage = Math.max(0, Math.min(100, percentage));
    await this._invalidateCache(name);
    return true;
  }

  /**
   * Lista todas as flags
   * @returns {Array}
   */
  listAll() {
    return Array.from(this.flags.values()).map(f => f.toJSON());
  }

  /**
   * Obtém uma flag específica
   * @param {string} name
   */
  getFlag(name) {
    const flag = this.flags.get(name);
    return flag ? flag.toJSON() : null;
  }

  /**
   * Invalida cache de uma flag
   * @private
   */
  async _invalidateCache(name) {
    if (this.cache) {
      await this.cache.delete(`${this.cachePrefix}${name}`);
    }
  }

  /**
   * Registra flags padrão do sistema
   * @private
   */
  _registerDefaultFlags() {
    // ==================== INFRAESTRUTURA ====================

    this.register({
      name: 'use_redis_cache',
      description: 'Usar Redis como cache em vez de memória',
      defaultValue: false,
      environments: ['staging', 'production']
    });

    this.register({
      name: 'use_redis_locks',
      description: 'Usar Redis para locks distribuídos',
      defaultValue: false,
      environments: ['staging', 'production']
    });

    this.register({
      name: 'use_bullmq_queue',
      description: 'Usar BullMQ para filas em vez de memória',
      defaultValue: false,
      environments: ['staging', 'production']
    });

    this.register({
      name: 'use_postgresql',
      description: 'Usar PostgreSQL em vez de SQLite',
      defaultValue: false,
      environments: ['staging', 'production']
    });

    // ==================== MULTI-TENANT ====================

    this.register({
      name: 'multi_tenant_enabled',
      description: 'Habilitar sistema multi-tenant',
      defaultValue: false,
      environments: ['development', 'staging', 'production']
    });

    this.register({
      name: 'tenant_isolation_strict',
      description: 'Isolamento estrito de dados por tenant',
      defaultValue: true,
      environments: ['staging', 'production']
    });

    // ==================== FUNCIONALIDADES ====================

    this.register({
      name: 'ai_agent_v2',
      description: 'Novo motor de agente com melhorias',
      defaultValue: false,
      percentage: 0
    });

    this.register({
      name: 'meeting_calendar_sync',
      description: 'Sincronização com Google Calendar',
      defaultValue: false,
      environments: ['development', 'staging']
    });

    this.register({
      name: 'advanced_analytics',
      description: 'Dashboard de analytics avançado',
      defaultValue: false,
      percentage: 0
    });

    this.register({
      name: 'voice_messages',
      description: 'Suporte a mensagens de voz',
      defaultValue: false,
      environments: ['development']
    });

    this.register({
      name: 'auto_follow_up',
      description: 'Follow-up automático inteligente',
      defaultValue: true,
      environments: ['development', 'staging', 'production']
    });

    // ==================== PERFORMANCE ====================

    this.register({
      name: 'message_batching',
      description: 'Agrupar mensagens para envio em lote',
      defaultValue: false,
      environments: ['staging', 'production']
    });

    this.register({
      name: 'response_caching',
      description: 'Cache de respostas da IA',
      defaultValue: true,
      environments: ['development', 'staging', 'production']
    });

    this.register({
      name: 'lazy_loading',
      description: 'Carregamento lazy de dados',
      defaultValue: true
    });

    // ==================== SEGURANÇA ====================

    this.register({
      name: 'rate_limiting_strict',
      description: 'Rate limiting estrito',
      defaultValue: true,
      environments: ['staging', 'production']
    });

    this.register({
      name: 'audit_logging',
      description: 'Log de auditoria detalhado',
      defaultValue: false,
      environments: ['production']
    });

    this.register({
      name: 'encryption_at_rest',
      description: 'Criptografia de dados em repouso',
      defaultValue: false,
      environments: ['production']
    });

    // ==================== EXPERIMENTAL ====================

    this.register({
      name: 'experimental_gpt4_turbo',
      description: 'Usar GPT-4 Turbo (mais caro)',
      defaultValue: false,
      percentage: 0,
      metadata: { model: 'gpt-4-turbo-preview' }
    });

    this.register({
      name: 'experimental_embeddings_v3',
      description: 'Usar embeddings v3 (mais precisos)',
      defaultValue: false,
      percentage: 0,
      metadata: { model: 'text-embedding-3-large' }
    });
  }
}

// Singleton
let instance = null;

/**
 * Obtém instância do gerenciador de feature flags
 * @returns {FeatureFlagsManager}
 */
export function getFeatureFlags() {
  if (!instance) {
    instance = new FeatureFlagsManager();
  }
  return instance;
}

/**
 * Verifica se uma flag está habilitada (atalho)
 * @param {string} name
 * @param {Object} context
 * @returns {boolean}
 */
export function isFeatureEnabled(name, context = {}) {
  return getFeatureFlags().isEnabled(name, context);
}

/**
 * Decorator para funções que dependem de feature flag
 * @param {string} flagName
 * @param {Function} fallback
 */
export function withFeatureFlag(flagName, fallback = () => null) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      const context = args[0]?.context || {};

      if (isFeatureEnabled(flagName, context)) {
        return originalMethod.apply(this, args);
      }

      return fallback.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * HOF para envolver função com feature flag
 * @param {string} flagName
 * @param {Function} fn
 * @param {Function} fallback
 */
export function guardWithFlag(flagName, fn, fallback = () => null) {
  return function (...args) {
    const context = args[0]?.context || {};

    if (isFeatureEnabled(flagName, context)) {
      return fn.apply(this, args);
    }

    return fallback.apply(this, args);
  };
}

// Exports
export { FeatureFlag, FeatureFlagsManager };

export default {
  getFeatureFlags,
  isFeatureEnabled,
  withFeatureFlag,
  guardWithFlag,
  FeatureFlag,
  FeatureFlagsManager
};
