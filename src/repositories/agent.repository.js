/**
 * @file agent.repository.js
 * @description Tenant-aware Agent repository using the agents table
 *
 * This is the CANONICAL repository for agents - uses orbion.db directly
 * Adapted to match existing VPS database schema
 *
 * P0-5: Uses 'tenant_id' column (CANONICAL per ARCHITECTURE_DECISIONS.md)
 * - Table agents uses 'tenant_id' (canonical)
 * - Code uses tenantId parameter (camelCase)
 * - Legacy table compat removed; agents uses tenant_id only
 *
 * VPS Schema:
 * - id, tenant_id, name, slug, type, status
 * - persona, system_prompt, prompts, message_templates
 * - behavior, ai_config, integrations, knowledge_base, metrics
 * - created_at, updated_at, last_active_at
 */

import { getDatabase } from '../db/connection.js';
import { randomUUID } from 'crypto';
import { DEFAULT_TENANT_ID } from '../middleware/tenant.middleware.js';

export class AgentRepository {
  /**
   * Find all agents for a tenant
   */
  findByTenant(tenantId) {
    const db = getDatabase();
    try {
      // VPS schema doesn't have is_active, use status != 'deleted'
      const agents = db.prepare(`
        SELECT * FROM agents
        WHERE tenant_id = ? AND status != 'deleted'
        ORDER BY created_at DESC
      `).all(tenantId);

      return agents.map(a => this._parseAgent(a));
    } catch (error) {
      console.error('[AGENT-REPO] Error finding by tenant:', error);
      return [];
    }
  }

  /**
   * Find agent by ID
   */
  findById(agentId, tenantId) {
    const db = getDatabase();
    try {
      if (!tenantId) {
        throw new Error('tenantId is required for agent lookup');
      }
      const agent = db.prepare(`
        SELECT * FROM agents WHERE id = ? AND tenant_id = ?
      `).get(agentId, tenantId);

      return agent ? this._parseAgent.call(this, agent) : null;
    } catch (error) {
      console.error('[AGENT-REPO] Error finding by ID:', error);
      return null;
    }
  }

  /**
   * Find agent by ID with tenant isolation
   */
  findByIdForTenant(agentId, tenantId) {
    const db = getDatabase();
    try {
      const agent = db.prepare(`
        SELECT * FROM agents
        WHERE id = ? AND tenant_id = ?
      `).get(agentId, tenantId);

      return agent ? this._parseAgent.call(this, agent) : null;
    } catch (error) {
      console.error('[AGENT-REPO] Error finding by ID for tenant:', error);
      return null;
    }
  }

  /**
   * Find agent by slug for tenant
   */
  findBySlug(slug, tenantId) {
    const db = getDatabase();
    try {
      const agent = db.prepare(`
        SELECT * FROM agents
        WHERE slug = ? AND tenant_id = ?
      `).get(slug, tenantId);

      return agent ? this._parseAgent.call(this, agent) : null;
    } catch (error) {
      console.error('[AGENT-REPO] Error finding by slug:', error);
      return null;
    }
  }

  /**
   * Create a new agent
   * Matches VPS schema: persona, prompts, message_templates, behavior, ai_config, integrations, knowledge_base, metrics
   */
  create(data, tenantId, createdByUserId = null) {
    const db = getDatabase();
    try {
      const id = data.id || `agent_${randomUUID()}`;
      const now = new Date().toISOString();
      const configJson = this._normalizeConfigJson(data.config ?? data.config_json);

      // Generate slug from name if not provided
      const slug = data.slug || data.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check for unique slug
      const existing = this.findBySlug(slug, tenantId);
      if (existing) {
        throw new Error(`Slug "${slug}" already exists for this tenant`);
      }

      const agent = {
        id,
        tenant_id: tenantId,
        name: data.name,
        slug,
        type: data.type || 'sdr',
        status: data.status || 'draft',
        channel: data.channel || 'whatsapp',
        description: data.description || null,
        config_json: configJson,
        persona: JSON.stringify(data.persona || {}),
        system_prompt: data.system_prompt || null,
        prompts: JSON.stringify(data.prompts || {}),
        message_templates: JSON.stringify(data.message_templates || {}),
        behavior: JSON.stringify(data.behavior || {}),
        ai_config: JSON.stringify(data.ai_config || {}),
        integrations: JSON.stringify(data.integrations || {}),
        knowledge_base: JSON.stringify(data.knowledge_base || {}),
        metrics: JSON.stringify(data.metrics || {}),
        created_at: now,
        updated_at: now,
        last_active_at: null
      };

      const columns = Object.keys(agent).join(', ');
      const placeholders = Object.keys(agent).map(() => '?').join(', ');

      db.prepare(`
        INSERT INTO agents (${columns}) VALUES (${placeholders})
      `).run(...Object.values(agent));

      return this._parseAgent(agent);
    } catch (error) {
      console.error('[AGENT-REPO] Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Update an agent
   */
  update(agentId, data, tenantId) {
    const db = getDatabase();
    try {
      // Verify ownership
      const existing = this.findByIdForTenant(agentId, tenantId);
      if (!existing) {
        throw new Error('Agent not found or access denied');
      }
      const configJson = data.config !== undefined || data.config_json !== undefined
        ? this._normalizeConfigJson(data.config ?? data.config_json, existing.config || {})
        : (existing.config_json || JSON.stringify(existing.config || {}));

      const updates = {
        name: data.name !== undefined ? data.name : existing.name,
        type: data.type !== undefined ? data.type : existing.type,
        status: data.status !== undefined ? data.status : existing.status,
        channel: data.channel !== undefined ? data.channel : existing.channel,
        description: data.description !== undefined ? data.description : existing.description,
        config_json: configJson,
        persona: data.persona !== undefined ? JSON.stringify(data.persona) : JSON.stringify(existing.persona),
        system_prompt: data.system_prompt !== undefined ? data.system_prompt : existing.system_prompt,
        prompts: data.prompts !== undefined ? JSON.stringify(data.prompts) : JSON.stringify(existing.prompts),
        message_templates: data.message_templates !== undefined ? JSON.stringify(data.message_templates) : JSON.stringify(existing.message_templates),
        behavior: data.behavior !== undefined ? JSON.stringify(data.behavior) : JSON.stringify(existing.behavior),
        ai_config: data.ai_config !== undefined ? JSON.stringify(data.ai_config) : JSON.stringify(existing.ai_config),
        integrations: data.integrations !== undefined ? JSON.stringify(data.integrations) : JSON.stringify(existing.integrations),
        knowledge_base: data.knowledge_base !== undefined ? JSON.stringify(data.knowledge_base) : JSON.stringify(existing.knowledge_base),
        metrics: data.metrics !== undefined ? JSON.stringify(data.metrics) : JSON.stringify(existing.metrics),
        updated_at: new Date().toISOString()
      };

      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');

      db.prepare(`
        UPDATE agents SET ${setClause}
        WHERE id = ? AND tenant_id = ?
      `).run(...Object.values(updates), agentId, tenantId);

      return this.findById(agentId, tenantId);
    } catch (error) {
      console.error('[AGENT-REPO] Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Delete an agent (soft delete via status)
   */
  delete(agentId, tenantId) {
    const db = getDatabase();
    try {
      // Verify ownership
      const existing = this.findByIdForTenant(agentId, tenantId);
      if (!existing) {
        throw new Error('Agent not found or access denied');
      }

      db.prepare(`
        UPDATE agents SET status = 'deleted', updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(new Date().toISOString(), agentId, tenantId);

      return true;
    } catch (error) {
      console.error('[AGENT-REPO] Error deleting agent:', error);
      throw error;
    }
  }

  /**
   * Duplicate an agent
   */
  duplicate(agentId, newData, tenantId, createdByUserId = null) {
    try {
      const original = this.findById(agentId, tenantId);
      if (!original) {
        throw new Error('Original agent not found');
      }

      // Create new agent with copied data
      const duplicateData = {
        name: newData.name || `${original.name} (Copy)`,
        slug: newData.slug || `${original.slug}-copy-${Date.now()}`,
        type: original.type,
        status: 'draft', // New duplicates start as draft
        persona: original.persona,
        system_prompt: original.system_prompt,
        prompts: original.prompts,
        message_templates: original.message_templates,
        behavior: original.behavior,
        ai_config: original.ai_config,
        integrations: original.integrations,
        knowledge_base: original.knowledge_base,
        metrics: {} // Reset metrics for new copy
      };

      return this.create(duplicateData, tenantId, createdByUserId);
    } catch (error) {
      console.error('[AGENT-REPO] Error duplicating agent:', error);
      throw error;
    }
  }

  /**
   * Update agent metrics
   */
  updateMetrics(agentId, tenantId, metricsUpdate) {
    const db = getDatabase();
    try {
      const agent = this.findById(agentId, tenantId);
      if (!agent) return false;

      const currentMetrics = agent.metrics || {};
      const newMetrics = { ...currentMetrics, ...metricsUpdate };

      db.prepare(`
        UPDATE agents SET metrics = ?, updated_at = ?, last_active_at = ?
        WHERE id = ?
      `).run(JSON.stringify(newMetrics), new Date().toISOString(), new Date().toISOString(), agentId);

      return true;
    } catch (error) {
      console.error('[AGENT-REPO] Error updating metrics:', error);
      return false;
    }
  }

  /**
   * Update last active timestamp
   */
  updateLastActive(agentId) {
    const db = getDatabase();
    try {
      db.prepare(`
        UPDATE agents SET last_active_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), agentId);

      return true;
    } catch (error) {
      console.error('[AGENT-REPO] Error updating last active:', error);
      return false;
    }
  }

  /**
   * Get agent count for tenant
   */
  countByTenant(tenantId) {
    const db = getDatabase();
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM agents
        WHERE tenant_id = ? AND status != 'deleted'
      `).get(tenantId);

      return result?.count || 0;
    } catch (error) {
      console.error('[AGENT-REPO] Error counting agents:', error);
      return 0;
    }
  }

  /**
   * Get all agents (admin only)
   */
  findAll() {
    const db = getDatabase();
    try {
      const agents = db.prepare(`
        SELECT * FROM agents /* tenant-guard: ignore (admin list) */
        WHERE status != 'deleted'
        ORDER BY tenant_id, created_at DESC
      `).all();

      return agents.map(a => this._parseAgent(a));
    } catch (error) {
      console.error('[AGENT-REPO] Error finding all agents:', error);
      return [];
    }
  }

  /**
   * Parse agent from database row
   * Matches VPS schema
   */
  _parseAgent(row) {
    if (!row) return null;

    const config = this._safeJsonParse(row.config_json, {});
    const integrations = this._safeJsonParse(row.integrations, {});

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      status: row.status,
      description: row.description,
      config,
      config_json: row.config_json,
      persona: this._safeJsonParse(row.persona, {}),
      system_prompt: row.system_prompt,
      prompts: this._safeJsonParse(row.prompts, {}),
      message_templates: this._safeJsonParse(row.message_templates, {}),
      behavior: this._safeJsonParse(row.behavior, {}),
      ai_config: this._safeJsonParse(row.ai_config, {}),
      integrations,
      knowledge_base: this._safeJsonParse(row.knowledge_base, {}),
      metrics: this._safeJsonParse(row.metrics, {}),
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_active_at: row.last_active_at,
      messages_processed: row.messages_processed,
      avg_response_time: row.avg_response_time,
      // Computed fields for API compatibility
      is_active: row.status !== 'deleted' && row.status !== 'offline',
      channel: row.channel || integrations.channel || 'whatsapp'
    };
  }

  _normalizeConfigJson(value, fallback = {}) {
    if (value === undefined || value === null) {
      return JSON.stringify(fallback);
    }
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch {
        return JSON.stringify(fallback);
      }
    }
    return JSON.stringify(value);
  }

  /**
   * Find agent by webhook API key
   * API key is stored in integrations.webhook.apiKey
   */
  findByApiKey(apiKey) {
    const db = getDatabase();
    try {
      if (!apiKey) return null;

      // Search all active agents for matching API key
      const agents = db.prepare(`
        SELECT * FROM agents
        WHERE status != 'deleted'
        AND json_extract(integrations, '$.webhook.apiKey') = ?
      `).all(apiKey);

      if (agents.length === 0) return null;

      return this._parseAgent(agents[0]);
    } catch (error) {
      console.error('[AGENT-REPO] Error finding by API key:', error);
      return null;
    }
  }

  /**
   * Generate and save a new API key for an agent
   */
  generateApiKey(agentId, tenantId) {
    const db = getDatabase();
    try {
      const agent = this.findById(agentId, tenantId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Generate secure API key
      const apiKey = `dh_${randomUUID().replace(/-/g, '')}`;

      // Update integrations with new API key
      const integrations = agent.integrations || {};
      integrations.webhook = integrations.webhook || {};
      integrations.webhook.apiKey = apiKey;
      integrations.webhook.createdAt = new Date().toISOString();

      db.prepare(`
        UPDATE agents SET integrations = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(JSON.stringify(integrations), new Date().toISOString(), agentId, tenantId);

      return apiKey;
    } catch (error) {
      console.error('[AGENT-REPO] Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Revoke API key for an agent
   */
  revokeApiKey(agentId, tenantId) {
    const db = getDatabase();
    try {
      const agent = this.findById(agentId, tenantId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Remove API key from integrations
      const integrations = agent.integrations || {};
      if (integrations.webhook) {
        delete integrations.webhook.apiKey;
        integrations.webhook.revokedAt = new Date().toISOString();
      }

      db.prepare(`
        UPDATE agents SET integrations = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(JSON.stringify(integrations), new Date().toISOString(), agentId, tenantId);

      return true;
    } catch (error) {
      console.error('[AGENT-REPO] Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * Safely parse JSON
   */
  _safeJsonParse(str, defaultValue = {}) {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }
}

// Singleton instance
let repository = null;

export function getAgentRepository() {
  if (!repository) {
    repository = new AgentRepository();
  }
  return repository;
}

export default AgentRepository;
