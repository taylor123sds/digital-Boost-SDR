/**
 * @file ServiceLocator.js
 * @description P1-1: Unified Service Locator pattern for dependency injection
 *
 * Provides centralized access to all services with lazy initialization.
 * Replaces scattered `get*Service()` calls with a single entry point.
 *
 * Benefits:
 * - Single source of truth for service access
 * - Lazy initialization (services created on first use)
 * - Easy to mock for testing
 * - Prevents circular dependency issues
 * - Centralizes service configuration
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import log from '../utils/logger-wrapper.js';

/**
 * ServiceLocator - Singleton service container
 */
class ServiceLocator {
  constructor() {
    // Service instances (lazy loaded)
    this._services = new Map();

    // Service factories (how to create each service)
    this._factories = new Map();

    // Service dependencies (for initialization order)
    this._initialized = false;

    // Register default factories
    this._registerDefaultFactories();

    log.info('[ServiceLocator] Initialized');
  }

  /**
   * Register default service factories
   * @private
   */
  _registerDefaultFactories() {
    // Database connection
    this.registerFactory('database', async () => {
      const { getDatabase } = await import('../db/connection.js');
      return getDatabase();
    });

    // Database connection manager
    this.registerFactory('databaseConnection', async () => {
      const { getDatabaseConnection } = await import('../db/connection.js');
      return getDatabaseConnection();
    });

    // Transaction helpers
    this.registerFactory('transaction', async () => {
      const transaction = await import('../db/transaction.js');
      return transaction;
    });

    // Cadence Integration Service
    this.registerFactory('cadenceIntegration', async () => {
      const { getCadenceIntegrationService } = await import('./CadenceIntegrationService.js');
      return getCadenceIntegrationService();
    });

    // Cadence Engine
    this.registerFactory('cadenceEngine', async () => {
      const { getCadenceEngine } = await import('../automation/CadenceEngine.js');
      return getCadenceEngine();
    });

    // Prospecting Engine
    this.registerFactory('prospectingEngine', async () => {
      const { getProspectingEngine } = await import('../automation/ProspectingEngine.js');
      return getProspectingEngine();
    });

    // Conversation Context Service
    this.registerFactory('conversationContext', async () => {
      const { getConversationContextService } = await import('./ConversationContextService.js');
      return getConversationContextService();
    });

    // Webhook Handler
    this.registerFactory('webhookHandler', async () => {
      const { webhookHandler } = await import('../handlers/webhook_handler.js');
      return webhookHandler;
    });

    // Webhook Transaction Manager
    this.registerFactory('webhookTransaction', async () => {
      const { getWebhookTransactionManager } = await import('../handlers/WebhookTransactionManager.js');
      return getWebhookTransactionManager();
    });

    // Contact Rate Limiter
    this.registerFactory('contactRateLimiter', async () => {
      const { getContactRateLimiter } = await import('../middleware/ContactRateLimiter.js');
      return getContactRateLimiter();
    });

    // Early Deduplicator
    this.registerFactory('earlyDeduplicator', async () => {
      const { getEarlyDeduplicator } = await import('../utils/EarlyDeduplicator.js');
      return getEarlyDeduplicator();
    });

    // Message Pipeline
    this.registerFactory('messagePipeline', async () => {
      const { messagePipeline } = await import('../middleware/MessagePipeline.js');
      return messagePipeline;
    });

    // Lead Repository
    this.registerFactory('leadRepository', async () => {
      const { leadRepository } = await import('../repositories/lead.repository.js');
      return leadRepository;
    });

    // Agent Repository
    this.registerFactory('agentRepository', async () => {
      const { AgentRepository } = await import('../repositories/agent.repository.js');
      return new AgentRepository();
    });

    // Config Loader
    this.registerFactory('configLoader', async () => {
      const { getConfigLoader } = await import('../config/AgentConfigLoader.js');
      return getConfigLoader();
    });

    // WhatsApp Client
    this.registerFactory('whatsapp', async () => {
      const whatsapp = await import('../tools/whatsapp.js');
      return whatsapp;
    });

    // OpenAI Client
    this.registerFactory('openai', async () => {
      const { openai } = await import('../core/openai_client.js');
      return openai;
    });

    // Meeting Scheduler
    this.registerFactory('meetingScheduler', async () => {
      const meetingScheduler = await import('../tools/meeting_scheduler.js');
      return meetingScheduler;
    });

    // Calendar Enhanced
    this.registerFactory('calendar', async () => {
      const calendar = await import('../tools/calendar_enhanced.js');
      return calendar;
    });

    // Google Sheets
    this.registerFactory('googleSheets', async () => {
      const googleSheets = await import('../tools/google_sheets.js');
      return googleSheets;
    });

    // Usage Metering Service
    this.registerFactory('usageMetering', async () => {
      const { getUsageMeteringService } = await import('./UsageMeteringService.js');
      return getUsageMeteringService();
    });
  }

  /**
   * Register a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that returns the service
   */
  registerFactory(name, factory) {
    if (typeof factory !== 'function') {
      throw new Error(`Factory for ${name} must be a function`);
    }
    this._factories.set(name, factory);
  }

  /**
   * Register a service instance directly (for testing/mocking)
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   */
  register(name, instance) {
    this._services.set(name, instance);
    log.debug(`[ServiceLocator] Registered ${name} directly`);
  }

  /**
   * Get a service (lazy loading)
   * @param {string} name - Service name
   * @returns {Promise<*>} Service instance
   */
  async get(name) {
    // Return cached instance if exists
    if (this._services.has(name)) {
      return this._services.get(name);
    }

    // Check if factory exists
    if (!this._factories.has(name)) {
      throw new Error(`Service '${name}' not found. Available: ${[...this._factories.keys()].join(', ')}`);
    }

    try {
      // Create instance using factory
      const factory = this._factories.get(name);
      const instance = await factory();

      // Cache the instance
      this._services.set(name, instance);

      log.debug(`[ServiceLocator] Lazy loaded ${name}`);
      return instance;
    } catch (error) {
      log.error(`[ServiceLocator] Failed to load ${name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get a service synchronously (throws if not cached)
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  getSync(name) {
    if (!this._services.has(name)) {
      throw new Error(`Service '${name}' not loaded. Call 'await get("${name}")' first.`);
    }
    return this._services.get(name);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this._factories.has(name) || this._services.has(name);
  }

  /**
   * Check if a service is loaded (cached)
   * @param {string} name - Service name
   * @returns {boolean}
   */
  isLoaded(name) {
    return this._services.has(name);
  }

  /**
   * Pre-load essential services
   * Call this during server startup
   */
  async preload() {
    const essentialServices = [
      'database',
      'configLoader',
      'leadRepository',
      'webhookHandler',
      'messagePipeline'
    ];

    log.info('[ServiceLocator] Pre-loading essential services...');

    for (const name of essentialServices) {
      try {
        await this.get(name);
        log.debug(`[ServiceLocator] Pre-loaded: ${name}`);
      } catch (error) {
        log.warn(`[ServiceLocator] Failed to pre-load ${name}: ${error.message}`);
      }
    }

    this._initialized = true;
    log.info('[ServiceLocator] Pre-loading complete');
  }

  /**
   * Clear all cached services (for testing)
   */
  clear() {
    this._services.clear();
    this._initialized = false;
    log.info('[ServiceLocator] Cleared all services');
  }

  /**
   * Get list of available services
   * @returns {string[]}
   */
  listServices() {
    return [...this._factories.keys()];
  }

  /**
   * Get list of loaded services
   * @returns {string[]}
   */
  listLoadedServices() {
    return [...this._services.keys()];
  }

  /**
   * Get service statistics
   * @returns {Object}
   */
  getStats() {
    return {
      available: this._factories.size,
      loaded: this._services.size,
      initialized: this._initialized,
      services: {
        available: this.listServices(),
        loaded: this.listLoadedServices()
      }
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get ServiceLocator singleton
 * @returns {ServiceLocator}
 */
export function getServiceLocator() {
  if (!instance) {
    instance = new ServiceLocator();
  }
  return instance;
}

/**
 * Shorthand for getting a service
 * @param {string} name - Service name
 * @returns {Promise<*>}
 */
export async function getService(name) {
  return getServiceLocator().get(name);
}

/**
 * Shorthand for getting a service synchronously
 * @param {string} name - Service name
 * @returns {*}
 */
export function getServiceSync(name) {
  return getServiceLocator().getSync(name);
}

/**
 * Reset ServiceLocator (for testing)
 */
export function resetServiceLocator() {
  if (instance) {
    instance.clear();
    instance = null;
  }
}

export default {
  getServiceLocator,
  getService,
  getServiceSync,
  resetServiceLocator
};
