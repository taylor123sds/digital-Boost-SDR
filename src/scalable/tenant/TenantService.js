/**
 * @file TenantService.js
 * @description Serviço de gerenciamento de Tenants
 *
 * Responsável por CRUD de tenants, validações e controle de uso
 */

import { TenantModel, TenantStatus, TenantPlan } from './TenantModel.js';
import { getCache } from '../cache/index.js';
import crypto from 'crypto';

/**
 * Serviço de gerenciamento de Tenants
 */
export class TenantService {
  /**
   * @param {Object} options
   * @param {IDatabaseProvider} options.database - Provedor de banco de dados
   * @param {ICacheProvider} [options.cache] - Provedor de cache
   */
  constructor(options = {}) {
    this.database = options.database;
    this.cache = options.cache || getCache();
    this.cachePrefix = 'tenant:';
    this.cacheTtl = 300; // 5 minutos
  }

  /**
   * Cria um novo tenant
   * @param {Object} data - Dados do tenant
   * @returns {Promise<TenantModel>}
   */
  async create(data) {
    const tenant = new TenantModel(data);

    // Verificar se slug já existe
    const existing = await this.findBySlug(tenant.slug);
    if (existing) {
      throw new Error(`Tenant com slug '${tenant.slug}' já existe`);
    }

    // Criptografar chaves sensíveis
    const encryptedConfig = this._encryptConfig(tenant.config);

    await this.database.execute(`
      INSERT INTO tenants (
        id, name, slug, email, phone, plan, status, trial_ends_at,
        config, agent_config, usage, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.email,
      tenant.phone,
      tenant.plan,
      tenant.status,
      tenant.trialEndsAt,
      JSON.stringify(encryptedConfig),
      JSON.stringify(tenant.agentConfig),
      JSON.stringify(tenant.usage),
      JSON.stringify(tenant.metadata),
      tenant.metadata.createdAt,
      tenant.metadata.updatedAt
    ]);

    // Invalidar cache
    await this._invalidateCache(tenant.id);

    return tenant;
  }

  /**
   * Busca tenant por ID
   * @param {string} id
   * @returns {Promise<TenantModel|null>}
   */
  async findById(id) {
    // Tentar cache primeiro
    const cached = await this.cache.get(`${this.cachePrefix}${id}`);
    if (cached) {
      return new TenantModel(cached);
    }

    const row = await this.database.queryOne(
      'SELECT * FROM tenants WHERE id = ?',
      [id]
    );

    if (!row) return null;

    const tenant = this._rowToTenant(row);

    // Salvar no cache
    await this.cache.set(
      `${this.cachePrefix}${id}`,
      tenant.toFullJSON(),
      { ttl: this.cacheTtl }
    );

    return tenant;
  }

  /**
   * Busca tenant por slug
   * @param {string} slug
   * @returns {Promise<TenantModel|null>}
   */
  async findBySlug(slug) {
    // Tentar cache primeiro
    const cached = await this.cache.get(`${this.cachePrefix}slug:${slug}`);
    if (cached) {
      return this.findById(cached);
    }

    const row = await this.database.queryOne(
      'SELECT * FROM tenants WHERE slug = ?',
      [slug]
    );

    if (!row) return null;

    // Salvar mapeamento slug -> id no cache
    await this.cache.set(
      `${this.cachePrefix}slug:${slug}`,
      row.id,
      { ttl: this.cacheTtl }
    );

    return this._rowToTenant(row);
  }

  /**
   * Lista todos os tenants
   * @param {Object} options
   * @returns {Promise<{tenants: TenantModel[], total: number}>}
   */
  async findAll(options = {}) {
    const {
      status,
      plan,
      search,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (plan) {
      whereClause += ' AND plan = ?';
      params.push(plan);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR slug LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Contagem total
    const countResult = await this.database.queryOne(
      `SELECT COUNT(*) as total FROM tenants WHERE ${whereClause}`,
      params
    );

    // Buscar registros
    const rows = await this.database.query(
      `SELECT * FROM tenants WHERE ${whereClause}
       ORDER BY ${orderBy} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const tenants = rows.map(row => this._rowToTenant(row));

    return {
      tenants,
      total: countResult?.total || 0,
      limit,
      offset
    };
  }

  /**
   * Atualiza um tenant
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<TenantModel>}
   */
  async update(id, updates) {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new Error(`Tenant ${id} não encontrado`);
    }

    // Aplicar updates
    const allowedUpdates = ['name', 'email', 'phone', 'plan', 'status', 'agentConfig', 'config'];

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'config') {
          tenant.config = { ...tenant.config, ...updates[key] };
        } else if (key === 'agentConfig') {
          tenant.agentConfig = { ...tenant.agentConfig, ...updates[key] };
        } else {
          tenant[key] = updates[key];
        }
      }
    }

    // Atualizar limites se plano mudou
    if (updates.plan) {
      tenant.limits = TenantModel.PlanLimits[updates.plan];
    }

    tenant.metadata.updatedAt = new Date().toISOString();

    // Criptografar config antes de salvar
    const encryptedConfig = this._encryptConfig(tenant.config);

    await this.database.execute(`
      UPDATE tenants SET
        name = ?,
        email = ?,
        phone = ?,
        plan = ?,
        status = ?,
        config = ?,
        agent_config = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      tenant.name,
      tenant.email,
      tenant.phone,
      tenant.plan,
      tenant.status,
      JSON.stringify(encryptedConfig),
      JSON.stringify(tenant.agentConfig),
      tenant.metadata.updatedAt,
      id
    ]);

    // Invalidar cache
    await this._invalidateCache(id);

    return tenant;
  }

  /**
   * Incrementa contador de mensagens do tenant
   * @param {string} tenantId
   */
  async incrementMessageCount(tenantId) {
    await this.database.execute(`
      UPDATE tenants SET
        usage = json_set(
          usage,
          '$.messagesToday', COALESCE(json_extract(usage, '$.messagesToday'), 0) + 1,
          '$.messagesThisMonth', COALESCE(json_extract(usage, '$.messagesThisMonth'), 0) + 1
        ),
        metadata = json_set(metadata, '$.lastActivityAt', ?)
      WHERE id = ?
    `, [new Date().toISOString(), tenantId]);

    await this._invalidateCache(tenantId);
  }

  /**
   * Incrementa contador de leads do tenant
   * @param {string} tenantId
   */
  async incrementLeadsCount(tenantId) {
    await this.database.execute(`
      UPDATE tenants SET
        usage = json_set(
          usage,
          '$.leadsCount', COALESCE(json_extract(usage, '$.leadsCount'), 0) + 1
        )
      WHERE id = ?
    `, [tenantId]);

    await this._invalidateCache(tenantId);
  }

  /**
   * Obtém estatísticas agregadas de todos os tenants
   * @returns {Promise<Object>}
   */
  async getAggregatedStats() {
    const stats = await this.database.queryOne(`
      SELECT
        COUNT(*) as totalTenants,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeTenants,
        SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trialTenants,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspendedTenants,
        SUM(json_extract(usage, '$.leadsCount')) as totalLeads,
        SUM(json_extract(usage, '$.messagesThisMonth')) as totalMessagesMonth
      FROM tenants
    `);

    const byPlan = await this.database.query(`
      SELECT plan, COUNT(*) as count
      FROM tenants
      GROUP BY plan
    `);

    return {
      ...stats,
      byPlan: byPlan.reduce((acc, row) => {
        acc[row.plan] = row.count;
        return acc;
      }, {})
    };
  }

  /**
   * Reseta contadores diários de todos os tenants
   */
  async resetDailyUsage() {
    await this.database.execute(`
      UPDATE tenants SET
        usage = json_set(usage, '$.messagesToday', 0, '$.lastUsageReset', ?)
    `, [new Date().toISOString()]);

    // Limpar todo o cache de tenants
    await this.cache.deletePattern(`${this.cachePrefix}*`);
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Converte row do banco para TenantModel
   * @private
   */
  _rowToTenant(row) {
    const config = typeof row.config === 'string'
      ? JSON.parse(row.config)
      : row.config;

    const decryptedConfig = this._decryptConfig(config);

    return new TenantModel({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      phone: row.phone,
      plan: row.plan,
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      config: decryptedConfig,
      agentConfig: typeof row.agent_config === 'string'
        ? JSON.parse(row.agent_config)
        : row.agent_config,
      usage: typeof row.usage === 'string'
        ? JSON.parse(row.usage)
        : row.usage,
      metadata: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
      }
    });
  }

  /**
   * Criptografa configurações sensíveis
   * @private
   */
  _encryptConfig(config) {
    const secret = process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-me';
    const sensitiveKeys = ['openaiApiKey', 'evolutionApiKey'];

    const encrypted = { ...config };

    for (const key of sensitiveKeys) {
      if (encrypted[key]) {
        // Simples ofuscação (em produção, usar AES-256)
        encrypted[key] = Buffer.from(encrypted[key]).toString('base64');
      }
    }

    return encrypted;
  }

  /**
   * Descriptografa configurações sensíveis
   * @private
   */
  _decryptConfig(config) {
    const sensitiveKeys = ['openaiApiKey', 'evolutionApiKey'];

    const decrypted = { ...config };

    for (const key of sensitiveKeys) {
      if (decrypted[key]) {
        try {
          decrypted[key] = Buffer.from(decrypted[key], 'base64').toString('utf8');
        } catch {
          // Já está em texto plano
        }
      }
    }

    return decrypted;
  }

  /**
   * Invalida cache do tenant
   * @private
   */
  async _invalidateCache(tenantId) {
    await this.cache.delete(`${this.cachePrefix}${tenantId}`);
  }
}

export default TenantService;
