/**
 * @file Lead.js
 * @description Lead model (potential customers)
 */

import { BaseModel } from './BaseModel.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

export class Lead extends BaseModel {
  constructor() {
    super('leads');
  }

  /**
   * Search leads by name, email, phone, or company
   */
  search(searchTerm, options = {}) {
    const db = this.getDb();
    const { limit = 100, offset = 0, tenantId = null } = options;
    const fields = ['nome', 'empresa', 'email', 'whatsapp', 'telefone'];

    const validFields = fields.filter(field => field);
    const conditions = validFields.map(field => `${field} LIKE ?`).join(' OR ');
    const params = validFields.map(() => `%${searchTerm}%`);

    const tenantColumn = tenantId ? getTenantColumnForTable('leads', db) : null;
    const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';

    if (tenantColumn) {
      params.push(tenantId);
    }

    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 1000);
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    params.push(safeLimit, safeOffset);

    const query = `
      SELECT * FROM leads
      WHERE (${conditions})${tenantClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    return db.prepare(query).all(...params);
  }

  /**
   * Find leads by status
   */
  findByStatus(status, options = {}) {
    return this.findAll({ where: { status }, ...options });
  }

  /**
   * Find leads by origin
   */
  findByOrigin(origem, options = {}) {
    return this.findAll({ where: { origem }, ...options });
  }

  /**
   * Find leads by owner
   */
  findByOwner(ownerId, options = {}) {
    return this.findAll({ where: { owner_id: ownerId }, ...options });
  }

  /**
   * Find qualified leads
   */
  findQualified(options = {}) {
    return this.findAll({ where: { status: 'qualificado' }, ...options });
  }

  /**
   * Find new leads (not yet contacted)
   */
  findNew(options = {}) {
    return this.findAll({ where: { status: 'novo' }, ...options });
  }

  /**
   * Find converted leads
   */
  findConverted(options = {}) {
    return this.findAll({ where: { converted: 1 }, ...options });
  }

  /**
   * Get lead with details
   */
  findByIdWithDetails(leadId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const leadsTenant = tenantId ? getTenantColumnForTable('leads', db) : null;
      const leadsClause = leadsTenant ? ` AND ${leadsTenant} = ?` : '';
      const lead = db.prepare(`SELECT * FROM leads WHERE id = ?${leadsClause}`)
        .get(...(leadsTenant ? [leadId, tenantId] : [leadId]));
      if (!lead) return null;

      // Get activities
      const activitiesTenant = getTenantColumnForTable('activities', db);
      const activitiesClause = activitiesTenant ? ` AND ${activitiesTenant} = ?` : '';
      const activities = db.prepare(`
        SELECT * FROM activities
        WHERE lead_id = ?${activitiesClause}
        ORDER BY created_at DESC
        LIMIT 10
      `).all(...(activitiesTenant ? [leadId, tenantId] : [leadId]));

      // If converted, get associated records
      let opportunity = null;
      let account = null;
      let contact = null;

      if (lead.converted) {
        if (lead.opportunity_id) {
          const oppTenant = getTenantColumnForTable('opportunities', db);
          const oppClause = oppTenant ? ` AND ${oppTenant} = ?` : '';
          opportunity = db.prepare(`SELECT * FROM opportunities WHERE id = ?${oppClause}`)
            .get(...(oppTenant ? [lead.opportunity_id, tenantId] : [lead.opportunity_id]));
        }
        if (lead.account_id) {
          const accountTenant = getTenantColumnForTable('accounts', db);
          const accountClause = accountTenant ? ` AND ${accountTenant} = ?` : '';
          account = db.prepare(`SELECT * FROM accounts WHERE id = ?${accountClause}`)
            .get(...(accountTenant ? [lead.account_id, tenantId] : [lead.account_id]));
        }
        if (lead.contact_id) {
          const contactTenant = getTenantColumnForTable('contacts', db);
          const contactClause = contactTenant ? ` AND ${contactTenant} = ?` : '';
          contact = db.prepare(`SELECT * FROM contacts WHERE id = ?${contactClause}`)
            .get(...(contactTenant ? [lead.contact_id, tenantId] : [lead.contact_id]));
        }
      }

      return {
        ...lead,
        activities,
        opportunity,
        account,
        contact
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update lead status
   */
  updateStatus(leadId, newStatus, tenantId = DEFAULT_TENANT_ID) {
    return this.update(leadId, {
      status: newStatus,
      ultimo_contato: new Date().toISOString()
    });
  }

  /**
   * Update BANT score
   */
  updateBANT(leadId, bantData, tenantId = DEFAULT_TENANT_ID) {
    const { budget, authority, need, timing } = bantData;

    // Calculate BANT score (0-100)
    let score = 0;
    if (budget) score += 25;
    if (authority) score += 25;
    if (need) score += 25;
    if (timing) score += 25;

    return this.update(leadId, {
      bant_budget: budget || null,
      bant_authority: authority || null,
      bant_need: need || null,
      bant_timing: timing || null,
      bant_score: score
    });
  }

  /**
   * Convert lead to opportunity
   */
  convertToOpportunity(leadId, conversionData) {
    const db = this.getDb();
    try {
      const transaction = db.transaction(() => {
        const lead = this.findById(leadId);
        if (!lead) throw new Error('Lead not found');

        // Update lead as converted
        this.update(leadId, {
          converted: 1,
          converted_at: new Date().toISOString(),
          status: 'convertido',
          opportunity_id: conversionData.opportunityId,
          account_id: conversionData.accountId,
          contact_id: conversionData.contactId
        });

        return this.findById(leadId);
      });

      return transaction();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get lead statistics
   */
  getStats(tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = tenantId ? getTenantColumnForTable('leads', db) : null;
      const tenantWhere = tenantColumn ? `WHERE ${tenantColumn} = ?` : '';
      const tenantAnd = tenantColumn ? `AND ${tenantColumn} = ?` : '';
      const tenantParams = tenantColumn ? [tenantId] : [];

      const total = db.prepare(`SELECT COUNT(*) as count FROM leads ${tenantWhere}`).get(...tenantParams).count;
      const converted = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE converted = 1 ${tenantAnd}`).get(...tenantParams).count;
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM leads
        ${tenantWhere}
        GROUP BY status
      `).all(...tenantParams);
      const byOrigin = db.prepare(`
        SELECT origem, COUNT(*) as count
        FROM leads
        WHERE origem IS NOT NULL ${tenantAnd}
        GROUP BY origem
      `).all(...tenantParams);
      const avgBantScore = db.prepare(`
        SELECT AVG(bant_score) as avg_score
        FROM leads
        WHERE bant_score > 0 ${tenantAnd}
      `).get(...tenantParams);

      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(2) : 0;

      return {
        total,
        converted,
        conversionRate,
        byStatus,
        byOrigin,
        avgBantScore: avgBantScore.avg_score || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create lead with validation
   */
  create(data) {
    const leadData = {
      status: 'novo',
      score: 0,
      bant_score: 0,
      converted: 0,
      consentimento_email: 0,
      consentimento_whatsapp: 0,
      custom_fields: '{}',
      tags: '[]',
      ...data
    };

    if (!leadData.id) {
      leadData.id = this.generateId();
    }

    return super.create(leadData);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default Lead;
