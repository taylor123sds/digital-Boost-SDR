/**
 * @file TenantModel.js
 * @description Modelo de Tenant (cliente) para sistema SaaS multi-tenant
 *
 * Cada tenant representa uma empresa/cliente usando o ORBION
 * com seus próprios leads, configurações e integrações
 */

import crypto from 'crypto';

/**
 * Status possíveis do tenant
 */
export const TenantStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
  CANCELLED: 'cancelled'
};

/**
 * Planos disponíveis
 */
export const TenantPlan = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

/**
 * Limites por plano
 */
export const PlanLimits = {
  [TenantPlan.FREE]: {
    maxLeads: 100,
    maxMessagesPerDay: 50,
    maxUsers: 1,
    maxCampaigns: 1,
    features: ['basic_chat', 'manual_messages']
  },
  [TenantPlan.STARTER]: {
    maxLeads: 1000,
    maxMessagesPerDay: 500,
    maxUsers: 3,
    maxCampaigns: 5,
    features: ['basic_chat', 'manual_messages', 'cadences', 'basic_reports']
  },
  [TenantPlan.PROFESSIONAL]: {
    maxLeads: 10000,
    maxMessagesPerDay: 2000,
    maxUsers: 10,
    maxCampaigns: 20,
    features: ['basic_chat', 'manual_messages', 'cadences', 'advanced_reports', 'ai_agents', 'prospecting']
  },
  [TenantPlan.ENTERPRISE]: {
    maxLeads: -1, // ilimitado
    maxMessagesPerDay: -1,
    maxUsers: -1,
    maxCampaigns: -1,
    features: ['all']
  }
};

/**
 * Modelo de Tenant
 */
export class TenantModel {
  constructor(data = {}) {
    this.id = data.id || this._generateId();
    this.name = data.name || '';
    this.slug = data.slug || this._generateSlug(data.name);
    this.email = data.email || '';
    this.phone = data.phone || '';

    // Plano e status
    this.plan = data.plan || TenantPlan.FREE;
    this.status = data.status || TenantStatus.TRIAL;
    this.trialEndsAt = data.trialEndsAt || this._getTrialEndDate();

    // Configurações de integração (criptografadas)
    this.config = {
      openaiApiKey: data.config?.openaiApiKey || '',
      evolutionInstance: data.config?.evolutionInstance || '',
      evolutionApiKey: data.config?.evolutionApiKey || '',
      webhookUrl: data.config?.webhookUrl || '',
      googleSheetsId: data.config?.googleSheetsId || '',
      ...data.config
    };

    // Personalização do agente
    this.agentConfig = {
      name: data.agentConfig?.name || 'Assistente',
      persona: data.agentConfig?.persona || 'professional',
      greeting: data.agentConfig?.greeting || 'Olá! Como posso ajudar?',
      language: data.agentConfig?.language || 'pt-BR',
      timezone: data.agentConfig?.timezone || 'America/Sao_Paulo',
      businessHours: data.agentConfig?.businessHours || {
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5] // seg-sex
      },
      ...data.agentConfig
    };

    // Limites e uso
    this.limits = PlanLimits[this.plan] || PlanLimits[TenantPlan.FREE];
    this.usage = {
      leadsCount: data.usage?.leadsCount || 0,
      messagesThisMonth: data.usage?.messagesThisMonth || 0,
      messagesToday: data.usage?.messagesToday || 0,
      lastUsageReset: data.usage?.lastUsageReset || new Date().toISOString()
    };

    // Metadados
    this.metadata = {
      createdAt: data.metadata?.createdAt || new Date().toISOString(),
      updatedAt: data.metadata?.updatedAt || new Date().toISOString(),
      lastActivityAt: data.metadata?.lastActivityAt || null,
      createdBy: data.metadata?.createdBy || null
    };
  }

  /**
   * Verifica se tenant está ativo
   */
  isActive() {
    if (this.status === TenantStatus.CANCELLED) return false;
    if (this.status === TenantStatus.SUSPENDED) return false;

    if (this.status === TenantStatus.TRIAL) {
      const trialEnd = new Date(this.trialEndsAt);
      if (trialEnd < new Date()) return false;
    }

    return true;
  }

  /**
   * Verifica se pode enviar mais mensagens hoje
   */
  canSendMessage() {
    if (!this.isActive()) return false;

    const limit = this.limits.maxMessagesPerDay;
    if (limit === -1) return true;

    return this.usage.messagesToday < limit;
  }

  /**
   * Verifica se pode adicionar mais leads
   */
  canAddLead() {
    if (!this.isActive()) return false;

    const limit = this.limits.maxLeads;
    if (limit === -1) return true;

    return this.usage.leadsCount < limit;
  }

  /**
   * Verifica se tem acesso a uma feature
   */
  hasFeature(feature) {
    if (this.limits.features.includes('all')) return true;
    return this.limits.features.includes(feature);
  }

  /**
   * Incrementa contador de mensagens
   */
  incrementMessageCount() {
    this.usage.messagesToday++;
    this.usage.messagesThisMonth++;
    this.metadata.lastActivityAt = new Date().toISOString();
  }

  /**
   * Reseta contadores diários
   */
  resetDailyUsage() {
    this.usage.messagesToday = 0;
    this.usage.lastUsageReset = new Date().toISOString();
  }

  /**
   * Converte para objeto plain
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      email: this.email,
      phone: this.phone,
      plan: this.plan,
      status: this.status,
      trialEndsAt: this.trialEndsAt,
      agentConfig: this.agentConfig,
      limits: this.limits,
      usage: this.usage,
      metadata: this.metadata
    };
  }

  /**
   * Converte para objeto com configs sensíveis (admin only)
   */
  toFullJSON() {
    return {
      ...this.toJSON(),
      config: this.config
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  _generateId() {
    return `tenant_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  _generateSlug(name) {
    if (!name) return `tenant-${Date.now()}`;

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  _getTrialEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14 dias de trial
    return date.toISOString();
  }
}

export default TenantModel;
