/**
 * @file Lead.js
 * @description Lead model (potential customers)
 */

import { BaseModel } from './BaseModel.js';

export class Lead extends BaseModel {
  constructor() {
    super('leads');
  }

  /**
   * Search leads by name, email, phone, or company
   */
  search(searchTerm, options = {}) {
    const fields = ['nome', 'empresa', 'email', 'whatsapp', 'telefone'];
    return super.search(searchTerm, fields, options);
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
  findByIdWithDetails(leadId) {
    const db = this.getDb();
    try {
      const lead = this.findById(leadId);
      if (!lead) return null;

      // Get activities
      const activities = db.prepare(`
        SELECT * FROM activities
        WHERE lead_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(leadId);

      // If converted, get associated records
      let opportunity = null;
      let account = null;
      let contact = null;

      if (lead.converted) {
        if (lead.opportunity_id) {
          opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(lead.opportunity_id);
        }
        if (lead.account_id) {
          account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(lead.account_id);
        }
        if (lead.contact_id) {
          contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(lead.contact_id);
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
  updateStatus(leadId, newStatus) {
    return this.update(leadId, {
      status: newStatus,
      ultimo_contato: new Date().toISOString()
    });
  }

  /**
   * Update BANT score
   */
  updateBANT(leadId, bantData) {
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
  getStats() {
    const db = this.getDb();
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
      const converted = db.prepare('SELECT COUNT(*) as count FROM leads WHERE converted = 1').get().count;
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM leads
        GROUP BY status
      `).all();
      const byOrigin = db.prepare(`
        SELECT origem, COUNT(*) as count
        FROM leads
        WHERE origem IS NOT NULL
        GROUP BY origem
      `).all();
      const avgBantScore = db.prepare(`
        SELECT AVG(bant_score) as avg_score
        FROM leads
        WHERE bant_score > 0
      `).get();

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
