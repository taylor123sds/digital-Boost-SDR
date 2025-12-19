/**
 * @file config/di-container.js
 * @description Dependency Injection Container for LEADLY agent
 * Wave 1: Foundation Layer - Dependency Injection
 *
 * This container manages application dependencies and their lifecycle.
 * It supports:
 * - Singleton pattern for shared services
 * - Factory pattern for per-request instances
 * - Lazy initialization
 * - Circular dependency detection
 */

import config from './index.js';
import { defaultLogger, createLogger } from '../utils/logger.enhanced.js';
import { ApplicationError } from '../utils/errors/index.js';

/**
 * Dependency container error
 */
class ContainerError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 500,
      code: 'CONTAINER_ERROR',
      isOperational: false,
      context
    });
  }
}

/**
 * Dependency types
 */
const DependencyType = {
  SINGLETON: 'singleton',
  FACTORY: 'factory',
  VALUE: 'value'
};

/**
 * Dependency container
 */
export class Container {
  constructor() {
    this.dependencies = new Map();
    this.resolving = new Set(); // For circular dependency detection
    this.logger = defaultLogger.child({ module: 'DI-Container' });
  }

  /**
   * Register a singleton dependency
   * Singletons are created once and shared across the application
   */
  registerSingleton(name, factory) {
    if (this.dependencies.has(name)) {
      throw new ContainerError(`Dependency '${name}' is already registered`, { name });
    }

    this.dependencies.set(name, {
      type: DependencyType.SINGLETON,
      factory,
      instance: null
    });

    this.logger.debug(`Registered singleton: ${name}`);
  }

  /**
   * Register a factory dependency
   * Factories create a new instance each time they are resolved
   */
  registerFactory(name, factory) {
    if (this.dependencies.has(name)) {
      throw new ContainerError(`Dependency '${name}' is already registered`, { name });
    }

    this.dependencies.set(name, {
      type: DependencyType.FACTORY,
      factory
    });

    this.logger.debug(`Registered factory: ${name}`);
  }

  /**
   * Register a value dependency
   * Values are stored as-is without any factory function
   */
  registerValue(name, value) {
    if (this.dependencies.has(name)) {
      throw new ContainerError(`Dependency '${name}' is already registered`, { name });
    }

    this.dependencies.set(name, {
      type: DependencyType.VALUE,
      instance: value
    });

    this.logger.debug(`Registered value: ${name}`);
  }

  /**
   * Resolve a dependency by name (supports async factories)
   */
  async resolve(name) {
    if (!this.dependencies.has(name)) {
      throw new ContainerError(`Dependency '${name}' not found`, { name });
    }

    // Check for circular dependencies
    if (this.resolving.has(name)) {
      throw new ContainerError(`Circular dependency detected: ${name}`, {
        name,
        resolvingChain: Array.from(this.resolving)
      });
    }

    const dependency = this.dependencies.get(name);

    // Handle VALUE type
    if (dependency.type === DependencyType.VALUE) {
      return dependency.instance;
    }

    // Handle FACTORY type
    if (dependency.type === DependencyType.FACTORY) {
      this.resolving.add(name);
      try {
        const instance = await dependency.factory(this);
        return instance;
      } finally {
        this.resolving.delete(name);
      }
    }

    // Handle SINGLETON type
    if (dependency.type === DependencyType.SINGLETON) {
      // Return existing instance if already created
      if (dependency.instance) {
        return dependency.instance;
      }

      // Create new instance
      this.resolving.add(name);
      try {
        dependency.instance = await dependency.factory(this);
        this.logger.debug(`Initialized singleton: ${name}`);
        return dependency.instance;
      } finally {
        this.resolving.delete(name);
      }
    }

    throw new ContainerError(`Unknown dependency type for '${name}'`, { name, type: dependency.type });
  }

  /**
   * Check if dependency is registered
   */
  has(name) {
    return this.dependencies.has(name);
  }

  /**
   * Remove a dependency
   */
  remove(name) {
    if (this.dependencies.has(name)) {
      this.dependencies.delete(name);
      this.logger.debug(`Removed dependency: ${name}`);
    }
  }

  /**
   * Clear all dependencies
   */
  clear() {
    this.dependencies.clear();
    this.resolving.clear();
    this.logger.debug('Cleared all dependencies');
  }

  /**
   * Get all registered dependency names
   */
  getRegisteredNames() {
    return Array.from(this.dependencies.keys());
  }

  /**
   * Get dependency information
   */
  getInfo(name) {
    if (!this.dependencies.has(name)) {
      return null;
    }

    const dep = this.dependencies.get(name);
    return {
      name,
      type: dep.type,
      initialized: dep.instance !== null && dep.instance !== undefined
    };
  }

  /**
   * Get all dependencies information
   */
  getAllInfo() {
    return Array.from(this.dependencies.keys()).map(name => this.getInfo(name));
  }
}

/**
 * Create and configure the default container
 */
export function createDefaultContainer() {
  const container = new Container();

  // Register configuration
  container.registerValue('config', config);

  // Register logger factory
  container.registerFactory('logger', (c) => {
    return createLogger({ service: 'LEADLY' });
  });

  // Register database connection (singleton)
  //  FIX CRÍTICO: Usar conexão centralizada do db/connection.js
  // ANTES: Criava nova conexão independente causando conflitos de WAL
  // DEPOIS: Usa conexão singleton que já configura WAL, busy_timeout, etc.
  container.registerSingleton('db', async (c) => {
    const { getDatabase } = await import('../db/index.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Database' });

    logger.info(`Using centralized database connection`);
    const db = getDatabase();
    logger.info('Database connection established (singleton)');
    return db;
  });

  // Register OpenAI client (singleton)
  container.registerSingleton('openaiClient', async (c) => {
    const { default: OpenAI } = await import('openai');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'OpenAI' });

    logger.info('Initializing OpenAI client');

    const client = new OpenAI({
      apiKey: config.openai.apiKey
    });

    logger.info('OpenAI client initialized');
    return client;
  });

  // ============================================================
  // Billing & Entitlements
  // ============================================================

  // Register Entitlement Service (singleton)
  container.registerSingleton('entitlementService', async (c) => {
    const { EntitlementService } = await import('../services/EntitlementService.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Entitlement' });

    return new EntitlementService(logger);
  });

  // Register Integration Service (singleton)
  container.registerSingleton('integrationService', async (c) => {
    const { IntegrationService } = await import('../services/IntegrationService.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Integration' });

    return new IntegrationService(logger);
  });

  // Register Evolution Provider (singleton)
  container.registerSingleton('evolutionProvider', async (c) => {
    const { EvolutionProvider } = await import('../providers/EvolutionProvider.js');
    const config = await c.resolve('config');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Evolution' });

    return new EvolutionProvider({
      baseUrl: config.evolution?.baseUrl || process.env.EVOLUTION_BASE_URL,
      apiKey: config.evolution?.apiKey || process.env.EVOLUTION_API_KEY,
      publicBaseUrl: process.env.PUBLIC_BASE_URL
    }, logger);
  });

  // ============================================================
  // Wave 2: Database Layer - Repository Registration
  // ============================================================

  // Register Database Connection Manager (singleton)
  container.registerSingleton('dbConnection', async (c) => {
    const { getDatabaseConnection } = await import('../db/connection.js');
    const connection = getDatabaseConnection();
    return connection.getConnection();
  });

  // Register State Repository (singleton)
  container.registerSingleton('stateRepository', async (c) => {
    const { StateRepository } = await import('../repositories/state.repository.js');
    const db = await c.resolve('dbConnection');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Repository' });

    return new StateRepository(db, logger);
  });

  // Register Conversation Repository (singleton)
  container.registerSingleton('conversationRepository', async (c) => {
    const { ConversationRepository } = await import('../repositories/conversation.repository.js');
    const db = await c.resolve('dbConnection');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Repository' });

    return new ConversationRepository(db, logger);
  });

  // Register Memory Repository (singleton)
  container.registerSingleton('memoryRepository', async (c) => {
    const { MemoryRepository } = await import('../repositories/memory.repository.js');
    const db = await c.resolve('dbConnection');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'Repository' });

    return new MemoryRepository(db, logger);
  });

  // ============================================================
  // Wave 3: Domain Layer - Domain Services Registration
  // ============================================================

  // Register BANT Qualification Service (singleton)
  container.registerSingleton('bantQualificationService', async (c) => {
    const { BANTQualificationService } = await import('../domain/services/BANTQualificationService.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'BANTQualification' });

    return new BANTQualificationService(logger);
  });

  // Register Lead Service (singleton)
  container.registerSingleton('leadService', async (c) => {
    const { LeadService } = await import('../domain/services/LeadService.js');
    const stateRepository = await c.resolve('stateRepository');
    const bantQualificationService = await c.resolve('bantQualificationService');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'LeadService' });

    return new LeadService(stateRepository, bantQualificationService, logger);
  });

  // Register Conversation Service (singleton)
  container.registerSingleton('conversationService', async (c) => {
    const { ConversationService } = await import('../domain/services/ConversationService.js');
    const conversationRepository = await c.resolve('conversationRepository');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'ConversationService' });

    return new ConversationService(conversationRepository, logger);
  });

  // ============================================================
  // Wave 4: Infrastructure Layer - Adapters, Events, Cache
  // ============================================================

  // Register OpenAI Adapter (singleton)
  container.registerSingleton('openaiAdapter', async (c) => {
    const { OpenAIAdapter } = await import('../infrastructure/adapters/OpenAIAdapter.js');
    const openaiClient = await c.resolve('openaiClient');
    const config = await c.resolve('config');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'OpenAIAdapter' });

    return new OpenAIAdapter(openaiClient, config, logger);
  });

  // Register WhatsApp Adapter (singleton)
  container.registerSingleton('whatsappAdapter', async (c) => {
    const { WhatsAppAdapter } = await import('../infrastructure/adapters/WhatsAppAdapter.js');
    const config = await c.resolve('config');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'WhatsAppAdapter' });

    return new WhatsAppAdapter(config, logger);
  });

  // Register Google Sheets Adapter (singleton)
  container.registerSingleton('googleSheetsAdapter', async (c) => {
    const { GoogleSheetsAdapter } = await import('../infrastructure/adapters/GoogleSheetsAdapter.js');
    const config = await c.resolve('config');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'GoogleSheetsAdapter' });

    return new GoogleSheetsAdapter(config, logger);
  });

  // Register Event Bus (singleton)
  container.registerSingleton('eventBus', async (c) => {
    const { EventBus } = await import('../infrastructure/events/EventBus.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'EventBus' });

    return new EventBus(logger);
  });

  // Register Cache Manager (singleton)
  container.registerSingleton('cacheManager', async (c) => {
    const { CacheManager } = await import('../infrastructure/cache/CacheManager.js');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'CacheManager' });

    return new CacheManager({
      defaultTTL: 300000,  // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60000  // 1 minute
    }, logger);
  });

  // ============================================================
  // Wave 5: Application Layer - Use Cases
  // ============================================================

  // Lead Use Cases
  container.registerFactory('createLeadUseCase', async (c) => {
    const { CreateLeadUseCase } = await import('../application/use-cases/lead/CreateLeadUseCase.js');
    const leadService = await c.resolve('leadService');
    const eventBus = await c.resolve('eventBus');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'CreateLeadUseCase' });

    return new CreateLeadUseCase(leadService, eventBus, logger);
  });

  container.registerFactory('qualifyLeadUseCase', async (c) => {
    const { QualifyLeadUseCase } = await import('../application/use-cases/lead/QualifyLeadUseCase.js');
    const leadService = await c.resolve('leadService');
    const eventBus = await c.resolve('eventBus');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'QualifyLeadUseCase' });

    return new QualifyLeadUseCase(leadService, eventBus, logger);
  });

  container.registerFactory('updateBANTStageUseCase', async (c) => {
    const { UpdateBANTStageUseCase } = await import('../application/use-cases/lead/UpdateBANTStageUseCase.js');
    const leadService = await c.resolve('leadService');
    const eventBus = await c.resolve('eventBus');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'UpdateBANTStageUseCase' });

    return new UpdateBANTStageUseCase(leadService, eventBus, logger);
  });

  // Message Use Cases
  container.registerFactory('sendMessageUseCase', async (c) => {
    const { SendMessageUseCase } = await import('../application/use-cases/message/SendMessageUseCase.js');
    const conversationService = await c.resolve('conversationService');
    const whatsappAdapter = await c.resolve('whatsappAdapter');
    const eventBus = await c.resolve('eventBus');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'SendMessageUseCase' });

    return new SendMessageUseCase(conversationService, whatsappAdapter, eventBus, logger);
  });

  container.registerFactory('processIncomingMessageUseCase', async (c) => {
    const { ProcessIncomingMessageUseCase } = await import('../application/use-cases/message/ProcessIncomingMessageUseCase.js');
    const conversationService = await c.resolve('conversationService');
    const leadService = await c.resolve('leadService');
    const openaiAdapter = await c.resolve('openaiAdapter');
    const eventBus = await c.resolve('eventBus');
    const cacheManager = await c.resolve('cacheManager');
    const { createLogger } = await import('../utils/logger.enhanced.js');
    const logger = createLogger({ module: 'ProcessIncomingMessageUseCase' });

    // Load AgentHub if available (optional)
    let agentHub = null;
    try {
      const { getAgentHub } = await import('../agents/agent_hub_init.js');
      agentHub = getAgentHub();
      logger.info('AgentHub loaded successfully');
    } catch (error) {
      logger.warn('AgentHub not available, will use OpenAI fallback', { error: error.message });
    }

    return new ProcessIncomingMessageUseCase(conversationService, leadService, openaiAdapter, eventBus, cacheManager, logger, agentHub);
  });

  return container;
}

/**
 * Global container instance
 */
let globalContainer = null;

/**
 * Get or create the global container
 */
export function getContainer() {
  if (!globalContainer) {
    globalContainer = createDefaultContainer();
  }
  return globalContainer;
}

/**
 * Set the global container (useful for testing)
 */
export function setContainer(container) {
  globalContainer = container;
}

/**
 * Reset the global container
 */
export function resetContainer() {
  if (globalContainer) {
    globalContainer.clear();
  }
  globalContainer = null;
}

export default getContainer;
