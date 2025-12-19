/**
 * AGENT MODEL
 * Modelo para agentes criados na plataforma
 *
 * TIPOS DE AGENTE (3 templates):
 * - sdr_consultant: SDR + Specialist (qualifica, passa para vendedor)
 * - sdr_full: SDR + Specialist + Scheduler (automacao completa)
 * - support: Atendimento puro (sem funcao SDR)
 */

import { randomUUID } from 'crypto';

// Tipos de agente disponiveis
export const AGENT_TYPES = {
  SDR_CONSULTANT: 'sdr_consultant',
  SDR_FULL: 'sdr_full',
  SUPPORT: 'support'
};

// Modos habilitados por tipo
export const AGENT_MODES = {
  sdr_consultant: ['sdr', 'atendimento'],
  sdr_full: ['sdr', 'atendimento', 'scheduler'],
  support: ['atendimento']
};

// Configuracoes padrao por tipo
export const AGENT_DEFAULTS = {
  sdr_consultant: {
    spinEnabled: true,
    bantEnabled: true,
    autoScheduling: false,
    supportMode: false,
    handoffEnabled: true
  },
  sdr_full: {
    spinEnabled: true,
    bantEnabled: true,
    autoScheduling: true,
    supportMode: false,
    handoffEnabled: false
  },
  support: {
    spinEnabled: false,
    bantEnabled: false,
    autoScheduling: false,
    supportMode: true,
    handoffEnabled: true
  }
};

export class Agent {
  constructor(data = {}) {
    this.id = data.id || `agent_${randomUUID()}`;
    this.tenantId = data.tenant_id || data.tenantId;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type || 'sdr_full'; // sdr_consultant, sdr_full, support
    this.templateId = data.template_id || data.templateId || this.type;
    this.vertical = data.vertical || 'servicos';
    this.status = data.status || 'draft'; // draft, active, paused, archived
    this.currentVersionId = data.current_version_id || data.currentVersionId;
    this.config = data.config || {};
    this.metrics = data.metrics || this.getDefaultMetrics();

    // Comportamentos (novos campos)
    this.spinEnabled = data.spin_enabled ?? data.spinEnabled ?? AGENT_DEFAULTS[this.type]?.spinEnabled ?? true;
    this.bantEnabled = data.bant_enabled ?? data.bantEnabled ?? AGENT_DEFAULTS[this.type]?.bantEnabled ?? true;
    this.autoScheduling = data.auto_scheduling ?? data.autoScheduling ?? AGENT_DEFAULTS[this.type]?.autoScheduling ?? false;
    this.supportMode = data.support_mode ?? data.supportMode ?? AGENT_DEFAULTS[this.type]?.supportMode ?? false;
    this.handoffEnabled = data.handoff_enabled ?? data.handoffEnabled ?? AGENT_DEFAULTS[this.type]?.handoffEnabled ?? false;
    this.enabledModes = data.enabled_modes || data.enabledModes || AGENT_MODES[this.type] || ['sdr', 'atendimento'];

    this.createdBy = data.created_by || data.createdBy;
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
    this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
  }

  getDefaultMetrics() {
    return {
      totalConversations: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      qualificationRate: 0,
      meetingsScheduled: 0,
    };
  }

  isActive() {
    return this.status === 'active';
  }

  isDraft() {
    return this.status === 'draft';
  }

  canPublish() {
    // Validate required config fields
    const config = typeof this.config === 'string' ? JSON.parse(this.config) : this.config;
    const required = ['empresa', 'agente'];
    return required.every(field => config[field]);
  }

  getConfig() {
    return typeof this.config === 'string' ? JSON.parse(this.config) : this.config;
  }

  setConfig(config) {
    this.config = config;
    this.updatedAt = new Date().toISOString();
  }

  updateMetrics(newMetrics) {
    this.metrics = {
      ...(typeof this.metrics === 'string' ? JSON.parse(this.metrics) : this.metrics),
      ...newMetrics,
    };
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      type: this.type,
      templateId: this.templateId,
      vertical: this.vertical,
      status: this.status,
      currentVersionId: this.currentVersionId,
      config: typeof this.config === 'string' ? JSON.parse(this.config) : this.config,
      metrics: typeof this.metrics === 'string' ? JSON.parse(this.metrics) : this.metrics,
      // Behavior flags
      spinEnabled: this.spinEnabled,
      bantEnabled: this.bantEnabled,
      autoScheduling: this.autoScheduling,
      supportMode: this.supportMode,
      handoffEnabled: this.handoffEnabled,
      enabledModes: this.enabledModes,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDBRow() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      name: this.name,
      description: this.description,
      type: this.type,
      template_id: this.templateId,
      vertical: this.vertical,
      status: this.status,
      current_version_id: this.currentVersionId,
      config: typeof this.config === 'object' ? JSON.stringify(this.config) : this.config,
      metrics: typeof this.metrics === 'object' ? JSON.stringify(this.metrics) : this.metrics,
      // Behavior flags
      spin_enabled: this.spinEnabled ? 1 : 0,
      bant_enabled: this.bantEnabled ? 1 : 0,
      auto_scheduling: this.autoScheduling ? 1 : 0,
      support_mode: this.supportMode ? 1 : 0,
      handoff_enabled: this.handoffEnabled ? 1 : 0,
      enabled_modes: Array.isArray(this.enabledModes) ? JSON.stringify(this.enabledModes) : this.enabledModes,
      created_by: this.createdBy,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  static fromDBRow(row) {
    return new Agent({
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      type: row.type,
      template_id: row.template_id,
      vertical: row.vertical,
      status: row.status,
      current_version_id: row.current_version_id,
      config: row.config ? JSON.parse(row.config) : {},
      metrics: row.metrics ? JSON.parse(row.metrics) : {},
      // Behavior flags
      spin_enabled: row.spin_enabled === 1,
      bant_enabled: row.bant_enabled === 1,
      auto_scheduling: row.auto_scheduling === 1,
      support_mode: row.support_mode === 1,
      handoff_enabled: row.handoff_enabled === 1,
      enabled_modes: row.enabled_modes ? JSON.parse(row.enabled_modes) : null,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  // Helper: verifica se agente pode usar SPIN
  canUseSPIN() {
    return this.spinEnabled && this.type !== 'support';
  }

  // Helper: verifica se agente pode agendar
  canSchedule() {
    return this.autoScheduling && this.type === 'sdr_full';
  }

  // Helper: verifica se e modo suporte
  isSupportMode() {
    return this.supportMode || this.type === 'support';
  }

  // Helper: retorna engine apropriado
  getEngineType() {
    if (this.type === 'support' || this.supportMode) {
      return 'SupportEngine';
    }
    return 'ConfigurableConsultativeEngine';
  }
}

export default Agent;
