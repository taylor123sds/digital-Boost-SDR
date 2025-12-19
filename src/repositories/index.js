/**
 * @file repositories/index.js
 * @description Central export point for all repositories
 * Wave 2: Database Layer
 *
 * P0-5: Tenant ID Naming Convention (UPDATED)
 * - Canonical column name: 'tenant_id' (per ARCHITECTURE_DECISIONS.md)
 * - Use BaseTenantRepository for tenant-aware tables
 * - For legacy tables using 'team_id', override getTenantColumn()
 * - All new tables should use 'tenant_id'
 */

export { BaseRepository } from './base.repository.js';
export {
  BaseTenantRepository,
  LegacyTenantRepository,
  createTenantRepository
} from './base-tenant.repository.js';
export { StateRepository } from './state.repository.js';
export { ConversationRepository } from './conversation.repository.js';
export { MemoryRepository } from './memory.repository.js';
export { AgentRepository, getAgentRepository } from './agent.repository.js';

export default {
  BaseRepository: './base.repository.js',
  BaseTenantRepository: './base-tenant.repository.js',
  StateRepository: './state.repository.js',
  ConversationRepository: './conversation.repository.js',
  MemoryRepository: './memory.repository.js',
  AgentRepository: './agent.repository.js'
};
