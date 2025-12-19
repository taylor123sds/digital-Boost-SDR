/**
 * AGENT REPOSITORY
 * Repositorio para operacoes de agentes
 */

import { BaseRepository } from './BaseRepository.js';
import { Agent } from '../models/Agent.js';
import { randomUUID } from 'crypto';

export class AgentRepository extends BaseRepository {
  constructor(db) {
    super(db, 'agents', Agent);
  }

  /**
   * Busca agentes por tenant
   */
  findByTenant(tenantId, options = {}) {
    return this.findAll({ tenant_id: tenantId }, {
      orderBy: options.orderBy || 'created_at',
      orderDesc: options.orderDesc !== false,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Busca agentes ativos por tenant
   */
  findActiveByTenant(tenantId) {
    return this.findAll({
      tenant_id: tenantId,
      status: 'active',
    });
  }

  /**
   * Busca agente por tenant e nome
   */
  findByName(tenantId, name) {
    return this.findOne({
      tenant_id: tenantId,
      name: name,
    });
  }

  /**
   * Cria novo agente
   */
  createAgent(tenantId, data) {
    const agent = new Agent({
      tenant_id: tenantId,
      name: data.name,
      description: data.description,
      type: data.type || 'sdr',
      vertical: data.vertical || 'servicos',
      status: 'draft',
      config: data.config || {},
      created_by: data.createdBy,
    });

    return this.create(agent);
  }

  /**
   * Atualiza configuracao do agente
   */
  updateConfig(agentId, config) {
    const agent = this.findById(agentId);
    if (!agent) return null;

    const currentConfig = agent.getConfig();
    const newConfig = { ...currentConfig, ...config };

    return this.update(agentId, {
      config: JSON.stringify(newConfig),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Publica agente (cria versao e ativa)
   */
  publish(agentId, versionId) {
    return this.update(agentId, {
      status: 'active',
      current_version_id: versionId,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Pausa agente
   */
  pause(agentId) {
    return this.update(agentId, {
      status: 'paused',
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Arquiva agente
   */
  archive(agentId) {
    return this.update(agentId, {
      status: 'archived',
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Clona agente
   */
  clone(agentId, newName) {
    const original = this.findById(agentId);
    if (!original) return null;

    const clone = new Agent({
      tenant_id: original.tenantId,
      name: newName || `${original.name} (copia)`,
      description: original.description,
      type: original.type,
      vertical: original.vertical,
      status: 'draft',
      config: original.getConfig(),
      created_by: original.createdBy,
    });

    return this.create(clone);
  }

  /**
   * Busca estatisticas de agentes por tenant
   */
  getStats(tenantId) {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM agents
      WHERE tenant_id = ?
    `).get(tenantId);

    return stats;
  }

  /**
   * Busca agentes com conversas ativas
   */
  findWithActiveConversations(tenantId) {
    const rows = this.db.prepare(`
      SELECT a.*, COUNT(c.id) as active_conversations
      FROM agents a
      LEFT JOIN conversations c ON c.agent_id = a.id AND c.status = 'active'
      WHERE a.tenant_id = ?
      GROUP BY a.id
      HAVING active_conversations > 0
    `).all(tenantId);

    return rows.map(row => ({
      agent: Agent.fromDBRow(row),
      activeConversations: row.active_conversations,
    }));
  }
}

export default AgentRepository;
