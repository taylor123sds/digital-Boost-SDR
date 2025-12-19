/**
 * @file EvolutionInstanceManager.js
 * @description Gerenciador de instâncias Evolution API para agentes multi-tenant
 *
 * Responsabilidades:
 * - Criar/gerenciar instâncias WhatsApp por tipo de agente
 * - Associar instâncias a agentes específicos
 * - Monitorar status de conexão
 * - Gerar QR codes para conexão
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { getDatabase } from '../../db/index.js';

// Configuração Evolution API
const EVOLUTION_CONFIG = {
  baseUrl: process.env.EVOLUTION_BASE_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || 'leadly-evolution-key-2024'
};

// Mapeamento de tipos de agente para instâncias padrão
const DEFAULT_INSTANCES = {
  sdr: 'sdr_agent',
  specialist: 'specialist_agent',
  scheduler: 'scheduler_agent',
  support: 'support_agent'
};

/**
 * Classe para gerenciar instâncias Evolution API
 */
export class EvolutionInstanceManager {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || EVOLUTION_CONFIG.baseUrl;
    this.apiKey = config.apiKey || EVOLUTION_CONFIG.apiKey;
    this.webhookUrl = config.webhookUrl || 'http://localhost:3001/api/webhook/evolution';
    this.db = null;
  }

  /**
   * Inicializa o manager com conexão ao banco
   */
  async initialize() {
    try {
      this.db = getDatabase();
      await this.ensureTable();
      console.log('[EVOLUTION-MANAGER] Inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('[EVOLUTION-MANAGER] Erro ao inicializar:', error.message);
      return false;
    }
  }

  /**
   * Garante que a tabela de instâncias existe
   */
  async ensureTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS evolution_instances (
        id TEXT PRIMARY KEY,
        instance_name TEXT NOT NULL UNIQUE,
        agent_id TEXT,
        agent_type TEXT,
        tenant_id TEXT,
        evolution_id TEXT,
        token TEXT,
        status TEXT DEFAULT 'created',
        phone_number TEXT,
        profile_name TEXT,
        qrcode TEXT,
        webhook_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        connected_at TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
      CREATE INDEX IF NOT EXISTS idx_evolution_agent ON evolution_instances(agent_id);
      CREATE INDEX IF NOT EXISTS idx_evolution_tenant ON evolution_instances(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_evolution_type ON evolution_instances(agent_type);
    `;

    this.db.exec(createTableSQL);
  }

  /**
   * Headers padrão para requisições à Evolution API
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey
    };
  }

  /**
   * Faz requisição à Evolution API
   */
  async request(method, endpoint, body = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: this.getHeaders()
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      console.error(`[EVOLUTION-MANAGER] Request error: ${endpoint}`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lista todas as instâncias da Evolution API
   */
  async listInstances() {
    return await this.request('GET', '/instance/fetchInstances');
  }

  /**
   * Cria uma nova instância na Evolution API
   */
  async createInstance(instanceName, options = {}) {
    const payload = {
      instanceName,
      integration: options.integration || 'WHATSAPP-BAILEYS',
      webhook: {
        url: options.webhookUrl || this.webhookUrl,
        events: options.events || [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED'
        ]
      }
    };

    const result = await this.request('POST', '/instance/create', payload);

    if (result.success && result.data?.instance) {
      // Salvar no banco local
      const instance = result.data.instance;
      await this.saveInstanceToDb({
        id: instance.instanceId,
        instance_name: instance.instanceName,
        evolution_id: instance.instanceId,
        token: result.data.hash,
        status: instance.status || 'created',
        webhook_url: payload.webhook.url,
        agent_type: options.agentType || null,
        tenant_id: options.tenantId || null
      });
    }

    return result;
  }

  /**
   * Obtém status de conexão de uma instância
   */
  async getConnectionStatus(instanceName) {
    return await this.request('GET', `/instance/connectionState/${instanceName}`);
  }

  /**
   * Conecta uma instância (gera QR Code)
   */
  async connectInstance(instanceName) {
    return await this.request('GET', `/instance/connect/${instanceName}`);
  }

  /**
   * Desconecta uma instância
   */
  async disconnectInstance(instanceName) {
    return await this.request('DELETE', `/instance/logout/${instanceName}`);
  }

  /**
   * Deleta uma instância
   */
  async deleteInstance(instanceName) {
    const result = await this.request('DELETE', `/instance/delete/${instanceName}`);

    if (result.success) {
      // Remover do banco local
      const stmt = this.db.prepare('DELETE FROM evolution_instances WHERE instance_name = ?');
      stmt.run(instanceName);
    }

    return result;
  }

  /**
   * Salva/atualiza instância no banco local
   */
  async saveInstanceToDb(instanceData) {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_instances
        (id, instance_name, agent_id, agent_type, tenant_id, evolution_id, token, status, webhook_url, updated_at)
      VALUES
        (@id, @instance_name, @agent_id, @agent_type, @tenant_id, @evolution_id, @token, @status, @webhook_url, datetime('now'))
      ON CONFLICT(instance_name)
      DO UPDATE SET
        agent_id = @agent_id,
        agent_type = @agent_type,
        tenant_id = @tenant_id,
        evolution_id = @evolution_id,
        token = @token,
        status = @status,
        webhook_url = @webhook_url,
        updated_at = datetime('now')
    `);

    return stmt.run({
      id: instanceData.id || crypto.randomUUID(),
      instance_name: instanceData.instance_name,
      agent_id: instanceData.agent_id || null,
      agent_type: instanceData.agent_type || null,
      tenant_id: instanceData.tenant_id || null,
      evolution_id: instanceData.evolution_id || null,
      token: instanceData.token || null,
      status: instanceData.status || 'created',
      webhook_url: instanceData.webhook_url || this.webhookUrl
    });
  }

  /**
   * Associa uma instância a um agente
   */
  async associateWithAgent(instanceName, agentId, tenantId = null) {
    const stmt = this.db.prepare(`
      UPDATE evolution_instances
      SET agent_id = ?, tenant_id = ?, updated_at = datetime('now')
      WHERE instance_name = ?
    `);

    return stmt.run(agentId, tenantId, instanceName);
  }

  /**
   * Obtém instância por nome de agente
   */
  getInstanceByAgent(agentId) {
    const stmt = this.db.prepare(`
      SELECT * FROM evolution_instances WHERE agent_id = ?
    `);
    return stmt.get(agentId);
  }

  /**
   * Obtém instância por tipo de agente
   */
  getInstanceByType(agentType) {
    const defaultName = DEFAULT_INSTANCES[agentType];
    if (!defaultName) return null;

    const stmt = this.db.prepare(`
      SELECT * FROM evolution_instances WHERE instance_name = ? OR agent_type = ?
    `);
    return stmt.get(defaultName, agentType);
  }

  /**
   * Lista todas as instâncias do banco local
   */
  listLocalInstances(filters = {}) {
    let sql = 'SELECT * FROM evolution_instances WHERE 1=1';
    const params = [];

    if (filters.tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(filters.tenantId);
    }

    if (filters.agentType) {
      sql += ' AND agent_type = ?';
      params.push(filters.agentType);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Sincroniza instâncias locais com Evolution API
   */
  async syncInstances() {
    const result = await this.listInstances();

    if (!result.success) {
      return { success: false, error: 'Falha ao listar instâncias remotas' };
    }

    const remoteInstances = result.data || [];
    const synced = [];

    for (const remote of remoteInstances) {
      await this.saveInstanceToDb({
        id: remote.id,
        instance_name: remote.name,
        evolution_id: remote.id,
        token: remote.token,
        status: remote.connectionStatus || 'unknown',
        phone_number: remote.number,
        profile_name: remote.profileName
      });
      synced.push(remote.name);
    }

    return {
      success: true,
      synced: synced.length,
      instances: synced
    };
  }

  /**
   * Cria instância padrão para um tipo de agente
   */
  async createDefaultInstance(agentType, tenantId = null) {
    const instanceName = DEFAULT_INSTANCES[agentType];
    if (!instanceName) {
      return { success: false, error: `Tipo de agente inválido: ${agentType}` };
    }

    // Verificar se já existe
    const existing = this.getInstanceByType(agentType);
    if (existing) {
      return {
        success: true,
        data: existing,
        message: 'Instância já existe'
      };
    }

    return await this.createInstance(instanceName, {
      agentType,
      tenantId
    });
  }

  /**
   * Envia mensagem de texto via instância
   */
  async sendTextMessage(instanceName, number, text) {
    return await this.request('POST', `/message/sendText/${instanceName}`, {
      number,
      text
    });
  }

  /**
   * Obtém QR Code para conexão
   */
  async getQRCode(instanceName) {
    const result = await this.connectInstance(instanceName);

    if (result.success && result.data?.base64) {
      // Atualizar QR code no banco
      const stmt = this.db.prepare(`
        UPDATE evolution_instances
        SET qrcode = ?, status = 'waiting_qr', updated_at = datetime('now')
        WHERE instance_name = ?
      `);
      stmt.run(result.data.base64, instanceName);
    }

    return result;
  }

  /**
   * Atualiza status de conexão
   */
  async updateConnectionStatus(instanceName, status, phoneNumber = null, profileName = null) {
    const stmt = this.db.prepare(`
      UPDATE evolution_instances
      SET status = ?,
          phone_number = COALESCE(?, phone_number),
          profile_name = COALESCE(?, profile_name),
          connected_at = CASE WHEN ? = 'open' THEN datetime('now') ELSE connected_at END,
          updated_at = datetime('now')
      WHERE instance_name = ?
    `);

    return stmt.run(status, phoneNumber, profileName, status, instanceName);
  }
}

// Singleton para uso global
let instanceManager = null;

export function getEvolutionManager() {
  if (!instanceManager) {
    instanceManager = new EvolutionInstanceManager();
  }
  return instanceManager;
}

export function resetEvolutionManager() {
  instanceManager = null;
}

export default {
  EvolutionInstanceManager,
  getEvolutionManager,
  resetEvolutionManager,
  DEFAULT_INSTANCES
};
