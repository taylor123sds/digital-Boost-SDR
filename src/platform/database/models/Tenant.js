/**
 * TENANT MODEL
 * Modelo para multi-tenancy - isolamento por empresa/conta
 */

import { randomUUID } from 'crypto';

export class Tenant {
  constructor(data = {}) {
    this.id = data.id || `tenant_${randomUUID()}`;
    this.name = data.name;
    this.slug = data.slug;
    this.plan = data.plan || 'starter'; // starter, growth, enterprise
    this.status = data.status || 'active';
    this.settings = data.settings || this.getDefaultSettings();
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  getDefaultSettings() {
    const planLimits = {
      starter: {
        max_agents: 1,
        max_users: 3,
        max_conversations_month: 500,
        max_knowledge_docs: 50,
        features: ['sdr'],
      },
      growth: {
        max_agents: 5,
        max_users: 15,
        max_conversations_month: 5000,
        max_knowledge_docs: 200,
        features: ['sdr', 'support', 'analytics'],
      },
      enterprise: {
        max_agents: -1, // unlimited
        max_users: -1,
        max_conversations_month: -1,
        max_knowledge_docs: -1,
        features: ['sdr', 'support', 'scheduler', 'analytics', 'integrations', 'api', 'whitelabel'],
      },
    };

    return planLimits[this.plan] || planLimits.starter;
  }

  hasFeature(feature) {
    const settings = typeof this.settings === 'string' ? JSON.parse(this.settings) : this.settings;
    return settings.features?.includes(feature) || settings.features?.includes('*');
  }

  canCreateAgent() {
    const settings = typeof this.settings === 'string' ? JSON.parse(this.settings) : this.settings;
    if (settings.max_agents === -1) return true;
    // Would need to check current count from DB
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      plan: this.plan,
      status: this.status,
      settings: typeof this.settings === 'string' ? JSON.parse(this.settings) : this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDBRow() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      plan: this.plan,
      status: this.status,
      settings: typeof this.settings === 'object' ? JSON.stringify(this.settings) : this.settings,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  static fromDBRow(row) {
    return new Tenant({
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      status: row.status,
      settings: row.settings ? JSON.parse(row.settings) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}

export default Tenant;
