/**
 * @file agents/index.js
 * @description Exports do módulo de agentes
 *
 * Arquitetura Modular:
 * - AgentModel: Modelo de dados do agente
 * - AgentService: Serviço de CRUD e operações
 * - AgentApiRoutes: Rotas REST para agentes
 * - AgentTemplates: Templates pré-configurados (SDR, Specialist, Scheduler, Support)
 * - AgentConfigSchema: Schema de configuração dinâmica
 * - AgentConfigService: Serviço de configurações
 * - ConfigurableConsultativeEngine: Motor inteligente configurável
 */

// Import for default export
import { AgentModel, AgentType, AgentStatus } from './AgentModel.js';
import { AgentService, getAgentService, resetAgentService } from './AgentService.js';
import { createAgentRoutes } from './AgentApiRoutes.js';
import {
  PersonalizationFields,
  AgentTemplates,
  generateAgentFromTemplate,
  listTemplates,
  getTemplate
} from './AgentTemplates.js';
import {
  EvolutionInstanceManager,
  getEvolutionManager,
  resetEvolutionManager,
  DEFAULT_INSTANCES
} from './EvolutionInstanceManager.js';

// NEW: Configurable Agent System
import {
  BusinessSectors,
  CTATypes,
  AgentConfigSchema,
  generateSectorDefaults,
  validateAgentConfig,
  agentConfigMigration
} from './AgentConfigSchema.js';
import {
  AgentConfigService,
  getAgentConfigService,
  resetAgentConfigService
} from './AgentConfigService.js';
import { createAgentConfigRoutes } from './AgentConfigRoutes.js';
import { ConfigurableConsultativeEngine } from './ConfigurableConsultativeEngine.js';

// Re-export - Models
export { AgentModel, AgentType, AgentStatus };

// Re-export - Services
export { AgentService, getAgentService, resetAgentService };

// Re-export - Routes
export { createAgentRoutes };

// Re-export - Templates
export {
  PersonalizationFields,
  AgentTemplates,
  generateAgentFromTemplate,
  listTemplates,
  getTemplate
};

// Re-export - Evolution Instance Manager
export {
  EvolutionInstanceManager,
  getEvolutionManager,
  resetEvolutionManager,
  DEFAULT_INSTANCES
};

// Re-export - Configurable Agent System
export {
  // Schema
  BusinessSectors,
  CTATypes,
  AgentConfigSchema,
  generateSectorDefaults,
  validateAgentConfig,
  agentConfigMigration,
  // Service
  AgentConfigService,
  getAgentConfigService,
  resetAgentConfigService,
  // Routes
  createAgentConfigRoutes,
  // Engine
  ConfigurableConsultativeEngine
};

// Migration para tabela de agentes
export const agentMigrations = [
  {
    name: '001_create_agents_table',
    up: `
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        type TEXT DEFAULT 'sdr',
        status TEXT DEFAULT 'draft',
        persona TEXT DEFAULT '{}',
        system_prompt TEXT,
        prompts TEXT DEFAULT '{}',
        message_templates TEXT DEFAULT '{}',
        behavior TEXT DEFAULT '{}',
        ai_config TEXT DEFAULT '{}',
        integrations TEXT DEFAULT '{}',
        knowledge_base TEXT DEFAULT '{}',
        metrics TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_active_at TEXT,
        UNIQUE(tenant_id, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(tenant_id, slug);
    `
  }
];

export default {
  // Models
  AgentModel,
  AgentType,
  AgentStatus,

  // Services
  AgentService,
  getAgentService,
  resetAgentService,

  // Routes
  createAgentRoutes,

  // Templates
  PersonalizationFields,
  AgentTemplates,
  generateAgentFromTemplate,
  listTemplates,
  getTemplate,

  // Evolution Instance Manager
  EvolutionInstanceManager,
  getEvolutionManager,
  resetEvolutionManager,
  DEFAULT_INSTANCES,

  // Configurable Agent System
  BusinessSectors,
  CTATypes,
  AgentConfigSchema,
  generateSectorDefaults,
  validateAgentConfig,
  agentConfigMigration,
  AgentConfigService,
  getAgentConfigService,
  resetAgentConfigService,
  createAgentConfigRoutes,
  ConfigurableConsultativeEngine,

  // Migrations
  agentMigrations
};
