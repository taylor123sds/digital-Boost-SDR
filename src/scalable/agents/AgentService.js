/**
 * @file AgentService.js
 * @description Serviço para gerenciar agentes do SaaS
 *
 * Fornece CRUD completo para agentes com:
 * - Cache para performance
 * - Validações
 * - Métricas
 */

import { AgentModel, AgentType, AgentStatus } from './AgentModel.js';
import { getDatabase } from '../database/index.js';
import { getCache } from '../cache/index.js';

/**
 * Serviço de Agentes
 */
export class AgentService {
  constructor(options = {}) {
    this.db = options.database || getDatabase();
    this.cache = options.cache || getCache();
    this.cachePrefix = 'agent:';
    this.cacheTtl = 300; // 5 minutos
  }

  // ==================== CRUD ====================

  /**
   * Cria um novo agente
   * @param {Object} data - Dados do agente
   * @returns {Promise<AgentModel>}
   */
  async create(data) {
    const agent = new AgentModel(data);

    // Validar dados obrigatórios
    if (!agent.tenant_id) {
      throw new Error('tenant_id é obrigatório');
    }

    if (!agent.name) {
      throw new Error('name é obrigatório');
    }

    // Verificar se slug já existe para o tenant
    const existing = await this.findBySlug(agent.tenant_id, agent.slug);
    if (existing) {
      agent.slug = `${agent.slug}-${Date.now()}`;
    }

    // Inserir no banco
    const dbData = agent.toDatabase();
    await this.db.execute(`
      INSERT INTO agents (
        id, tenant_id, name, slug, type, status,
        persona, system_prompt, prompts, message_templates,
        behavior, ai_config, integrations, knowledge_base, metrics,
        created_at, updated_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dbData.id,
      dbData.tenant_id,
      dbData.name,
      dbData.slug,
      dbData.type,
      dbData.status,
      dbData.persona,
      dbData.system_prompt,
      dbData.prompts,
      dbData.message_templates,
      dbData.behavior,
      dbData.ai_config,
      dbData.integrations,
      dbData.knowledge_base,
      dbData.metrics,
      dbData.created_at,
      dbData.updated_at,
      dbData.last_active_at
    ]);

    // Invalidar cache
    await this._invalidateCache(agent.tenant_id);

    console.log(`[AgentService] Agente criado: ${agent.id} (${agent.name})`);
    return agent;
  }

  /**
   * Busca agente por ID
   * @param {string} id - ID do agente
   * @returns {Promise<AgentModel|null>}
   */
  async findById(id) {
    // Tentar cache
    const cached = await this.cache.get(`${this.cachePrefix}${id}`);
    if (cached) {
      return AgentModel.fromDatabase(cached);
    }

    // Buscar no banco
    const row = await this.db.queryOne(
      'SELECT * FROM agents WHERE id = ?',
      [id]
    );

    if (!row) return null;

    // Salvar no cache
    await this.cache.set(`${this.cachePrefix}${id}`, row, { ttl: this.cacheTtl });

    return AgentModel.fromDatabase(row);
  }

  /**
   * Busca agente por slug e tenant
   * @param {string} tenantId - ID do tenant
   * @param {string} slug - Slug do agente
   * @returns {Promise<AgentModel|null>}
   */
  async findBySlug(tenantId, slug) {
    const row = await this.db.queryOne(
      'SELECT * FROM agents WHERE tenant_id = ? AND slug = ?',
      [tenantId, slug]
    );
    return AgentModel.fromDatabase(row);
  }

  /**
   * Lista agentes de um tenant
   * @param {string} tenantId - ID do tenant
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<AgentModel[]>}
   */
  async findByTenant(tenantId, filters = {}) {
    let sql = 'SELECT * FROM agents WHERE tenant_id = ?';
    const params = [tenantId];

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await this.db.query(sql, params);
    return rows.map(row => AgentModel.fromDatabase(row));
  }

  /**
   * Lista todos os agentes (admin)
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<AgentModel[]>}
   */
  async findAll(filters = {}) {
    let sql = 'SELECT * FROM agents WHERE 1=1';
    const params = [];

    if (filters.tenant_id) {
      sql += ' AND tenant_id = ?';
      params.push(filters.tenant_id);
    }

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR slug LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = await this.db.query(sql, params);
    return rows.map(row => AgentModel.fromDatabase(row));
  }

  /**
   * Atualiza um agente
   * @param {string} id - ID do agente
   * @param {Object} updates - Campos a atualizar
   * @returns {Promise<AgentModel|null>}
   */
  async update(id, updates) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Agente não encontrado');
    }

    // Mesclar atualizações
    const updatedAgent = new AgentModel({
      ...existing.toJSON(),
      ...updates,
      updated_at: new Date().toISOString()
    });

    const dbData = updatedAgent.toDatabase();

    await this.db.execute(`
      UPDATE agents SET
        name = ?,
        slug = ?,
        type = ?,
        status = ?,
        persona = ?,
        system_prompt = ?,
        prompts = ?,
        message_templates = ?,
        behavior = ?,
        ai_config = ?,
        integrations = ?,
        knowledge_base = ?,
        metrics = ?,
        updated_at = ?,
        last_active_at = ?
      WHERE id = ?
    `, [
      dbData.name,
      dbData.slug,
      dbData.type,
      dbData.status,
      dbData.persona,
      dbData.system_prompt,
      dbData.prompts,
      dbData.message_templates,
      dbData.behavior,
      dbData.ai_config,
      dbData.integrations,
      dbData.knowledge_base,
      dbData.metrics,
      dbData.updated_at,
      dbData.last_active_at,
      id
    ]);

    // Invalidar cache
    await this._invalidateCache(updatedAgent.tenant_id, id);

    console.log(`[AgentService] Agente atualizado: ${id}`);
    return updatedAgent;
  }

  /**
   * Deleta um agente
   * @param {string} id - ID do agente
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.execute('DELETE FROM agents WHERE id = ?', [id]);

    // Invalidar cache
    await this._invalidateCache(existing.tenant_id, id);

    console.log(`[AgentService] Agente deletado: ${id}`);
    return true;
  }

  // ==================== OPERAÇÕES DE STATUS ====================

  /**
   * Ativa um agente
   * @param {string} id - ID do agente
   */
  async activate(id) {
    return this.update(id, { status: AgentStatus.ACTIVE });
  }

  /**
   * Pausa um agente
   * @param {string} id - ID do agente
   */
  async pause(id) {
    return this.update(id, { status: AgentStatus.PAUSED });
  }

  /**
   * Desabilita um agente
   * @param {string} id - ID do agente
   */
  async disable(id) {
    return this.update(id, { status: AgentStatus.DISABLED });
  }

  /**
   * Coloca em modo teste
   * @param {string} id - ID do agente
   */
  async setTesting(id) {
    return this.update(id, { status: AgentStatus.TESTING });
  }

  // ==================== CONFIGURAÇÕES ====================

  /**
   * Atualiza system prompt
   * @param {string} id - ID do agente
   * @param {string} prompt - Novo system prompt
   */
  async updateSystemPrompt(id, prompt) {
    return this.update(id, { system_prompt: prompt });
  }

  /**
   * Atualiza prompts específicos
   * @param {string} id - ID do agente
   * @param {Object} prompts - Prompts a atualizar
   */
  async updatePrompts(id, prompts) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      prompts: { ...existing.prompts, ...prompts }
    });
  }

  /**
   * Atualiza templates de mensagem
   * @param {string} id - ID do agente
   * @param {Object} templates - Templates a atualizar
   */
  async updateMessageTemplates(id, templates) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      message_templates: { ...existing.message_templates, ...templates }
    });
  }

  /**
   * Atualiza configurações de comportamento
   * @param {string} id - ID do agente
   * @param {Object} behavior - Comportamento a atualizar
   */
  async updateBehavior(id, behavior) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      behavior: { ...existing.behavior, ...behavior }
    });
  }

  /**
   * Atualiza configurações de IA
   * @param {string} id - ID do agente
   * @param {Object} aiConfig - Config de IA a atualizar
   */
  async updateAIConfig(id, aiConfig) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      ai_config: { ...existing.ai_config, ...aiConfig }
    });
  }

  /**
   * Atualiza integrações
   * @param {string} id - ID do agente
   * @param {Object} integrations - Integrações a atualizar
   */
  async updateIntegrations(id, integrations) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      integrations: { ...existing.integrations, ...integrations }
    });
  }

  // ==================== MÉTRICAS ====================

  /**
   * Atualiza métricas do agente
   * @param {string} id - ID do agente
   * @param {Object} metrics - Métricas a atualizar
   */
  async updateMetrics(id, metrics) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Agente não encontrado');

    return this.update(id, {
      metrics: { ...existing.metrics, ...metrics },
      last_active_at: new Date().toISOString()
    });
  }

  /**
   * Incrementa contador de métricas
   * @param {string} id - ID do agente
   * @param {string} metric - Nome da métrica
   * @param {number} value - Valor a incrementar
   */
  async incrementMetric(id, metric, value = 1) {
    const existing = await this.findById(id);
    if (!existing) return;

    const newValue = (existing.metrics[metric] || 0) + value;
    await this.updateMetrics(id, { [metric]: newValue });
  }

  /**
   * Obtém estatísticas de um tenant
   * @param {string} tenantId - ID do tenant
   */
  async getTenantStats(tenantId) {
    const agents = await this.findByTenant(tenantId);

    return {
      total_agents: agents.length,
      active_agents: agents.filter(a => a.status === AgentStatus.ACTIVE).length,
      total_conversations: agents.reduce((sum, a) => sum + a.metrics.total_conversations, 0),
      total_messages_sent: agents.reduce((sum, a) => sum + a.metrics.total_messages_sent, 0),
      meetings_scheduled: agents.reduce((sum, a) => sum + a.metrics.meetings_scheduled, 0),
      leads_qualified: agents.reduce((sum, a) => sum + a.metrics.leads_qualified, 0),
      by_type: this._groupByType(agents),
      by_status: this._groupByStatus(agents)
    };
  }

  /**
   * Obtém estatísticas globais (admin)
   */
  async getGlobalStats() {
    const agents = await this.findAll();

    const tenantStats = {};
    for (const agent of agents) {
      if (!tenantStats[agent.tenant_id]) {
        tenantStats[agent.tenant_id] = [];
      }
      tenantStats[agent.tenant_id].push(agent);
    }

    return {
      total_agents: agents.length,
      total_tenants: Object.keys(tenantStats).length,
      active_agents: agents.filter(a => a.status === AgentStatus.ACTIVE).length,
      total_conversations: agents.reduce((sum, a) => sum + a.metrics.total_conversations, 0),
      total_messages_sent: agents.reduce((sum, a) => sum + a.metrics.total_messages_sent, 0),
      meetings_scheduled: agents.reduce((sum, a) => sum + a.metrics.meetings_scheduled, 0),
      by_type: this._groupByType(agents),
      by_status: this._groupByStatus(agents)
    };
  }

  // ==================== TEMPLATES ====================

  /**
   * Cria agente a partir de template
   * @param {string} tenantId - ID do tenant
   * @param {string} template - Nome do template (orbion, support, etc)
   * @param {Object} customization - Personalizações
   */
  async createFromTemplate(tenantId, template, customization = {}) {
    const templates = {
      orbion: {
        name: 'ORBION SDR',
        type: AgentType.SDR,
        persona: {
          name: 'ORBION',
          role: 'SDR Especialista',
          tone: 'professional'
        },
        system_prompt: `Você é o ORBION, um SDR especialista em vendas consultivas B2B.
Sua missão é qualificar leads usando a metodologia BANT (Budget, Authority, Need, Timeline).

Diretrizes:
- Seja consultivo, não vendedor agressivo
- Faça perguntas abertas para entender o contexto
- Identifique dores e necessidades reais
- Agende reuniões apenas com leads qualificados
- Use linguagem profissional mas acessível`
      },
      support: {
        name: 'Suporte',
        type: AgentType.SUPPORT,
        persona: {
          name: 'Assistente',
          role: 'Suporte ao Cliente',
          tone: 'friendly'
        }
      },
      onboarding: {
        name: 'Onboarding',
        type: AgentType.ONBOARDING,
        persona: {
          name: 'Guia',
          role: 'Especialista em Onboarding',
          tone: 'friendly'
        }
      }
    };

    const baseTemplate = templates[template] || templates.orbion;

    return this.create({
      tenant_id: tenantId,
      ...baseTemplate,
      ...customization
    });
  }

  /**
   * Duplica um agente existente
   * @param {string} id - ID do agente a duplicar
   * @param {Object} overrides - Campos a sobrescrever
   */
  async duplicate(id, overrides = {}) {
    const original = await this.findById(id);
    if (!original) {
      throw new Error('Agente não encontrado');
    }

    const data = original.toJSON();
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    delete data.last_active_at;

    return this.create({
      ...data,
      name: `${data.name} (Cópia)`,
      status: AgentStatus.DRAFT,
      metrics: {
        total_conversations: 0,
        total_messages_sent: 0,
        total_messages_received: 0,
        meetings_scheduled: 0,
        leads_qualified: 0,
        avg_response_time: 0,
        satisfaction_score: 0
      },
      ...overrides
    });
  }

  // ==================== HELPERS PRIVADOS ====================

  /**
   * Agrupa agentes por tipo
   * @private
   */
  _groupByType(agents) {
    const groups = {};
    for (const type of Object.values(AgentType)) {
      groups[type] = agents.filter(a => a.type === type).length;
    }
    return groups;
  }

  /**
   * Agrupa agentes por status
   * @private
   */
  _groupByStatus(agents) {
    const groups = {};
    for (const status of Object.values(AgentStatus)) {
      groups[status] = agents.filter(a => a.status === status).length;
    }
    return groups;
  }

  /**
   * Invalida cache
   * @private
   */
  async _invalidateCache(tenantId, agentId = null) {
    try {
      if (agentId) {
        await this.cache.delete(`${this.cachePrefix}${agentId}`);
      }
      await this.cache.delete(`${this.cachePrefix}tenant:${tenantId}`);
    } catch (error) {
      console.warn('[AgentService] Erro ao invalidar cache:', error.message);
    }
  }
}

// Singleton
let instance = null;

/**
 * Obtém instância do serviço de agentes
 * @returns {AgentService}
 */
export function getAgentService() {
  if (!instance) {
    instance = new AgentService();
  }
  return instance;
}

/**
 * Reseta instância (para testes)
 */
export function resetAgentService() {
  instance = null;
}

export default AgentService;
