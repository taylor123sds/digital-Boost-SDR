/**
 * @file Contact.js
 * @description Contact model (individuals within accounts)
 */

import { BaseModel } from './BaseModel.js';

export class Contact extends BaseModel {
  constructor() {
    super('contacts');
  }

  /**
   * Search contacts by name, email, or phone
   */
  search(searchTerm, options = {}) {
    const fields = ['nome', 'sobrenome', 'email', 'whatsapp', 'telefone', 'cargo'];
    return super.search(searchTerm, fields, options);
  }

  /**
   * Find contacts by account
   */
  findByAccount(accountId, options = {}) {
    return this.findAll({ where: { account_id: accountId }, ...options });
  }

  /**
   * Find contacts by email
   */
  findByEmail(email) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM contacts WHERE email = ?');
      return stmt.get(email);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find contacts by WhatsApp
   */
  findByWhatsApp(whatsapp) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM contacts WHERE whatsapp = ?');
      return stmt.get(whatsapp);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find decision makers
   */
  findDecisionMakers(options = {}) {
    return this.findAll({ where: { is_decisor: 1 }, ...options });
  }

  /**
   * Find by seniority level
   */
  findBySenioridade(senioridade, options = {}) {
    return this.findAll({ where: { senioridade }, ...options });
  }

  /**
   * Get contact with account and activities
   */
  findByIdWithDetails(contactId) {
    const db = this.getDb();
    try {
      const contact = this.findById(contactId);
      if (!contact) return null;

      // Get associated account
      let account = null;
      if (contact.account_id) {
        account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(contact.account_id);
      }

      // Get recent activities
      const activities = db.prepare(`
        SELECT * FROM activities
        WHERE contact_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(contactId);

      // Get opportunities
      const opportunities = db.prepare(`
        SELECT * FROM opportunities
        WHERE contact_id = ?
        ORDER BY created_at DESC
      `).all(contactId);

      return {
        ...contact,
        account,
        activities,
        opportunities,
        totalActivities: activities.length,
        totalOpportunities: opportunities.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get contact statistics
   */
  getStats() {
    const db = this.getDb();
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
      const decisors = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE is_decisor = 1').get().count;
      const bySenioridade = db.prepare(`
        SELECT senioridade, COUNT(*) as count
        FROM contacts
        WHERE senioridade IS NOT NULL
        GROUP BY senioridade
      `).all();
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM contacts
        GROUP BY status
      `).all();

      return { total, decisors, bySenioridade, byStatus };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update contact score
   */
  updateScore(contactId, scoreChange) {
    const db = this.getDb();
    try {
      const stmt = db.prepare(`
        UPDATE contacts
        SET score = score + ?,
            updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(scoreChange, contactId);
      return this.findById(contactId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record LGPD consent
   */
  recordConsent(contactId, consentType, value, metadata = {}) {
    const db = this.getDb();
    try {
      const updates = {
        [`consentimento_${consentType}`]: value ? 1 : 0,
        lgpd_data_consentimento: new Date().toISOString(),
        lgpd_ip_consentimento: metadata.ip || null,
        updated_at: new Date().toISOString()
      };

      return this.update(contactId, updates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create contact with validation
   */
  create(data) {
    const contactData = {
      status: 'ativo',
      score: 0,
      is_decisor: 0,
      consentimento_email: 0,
      consentimento_whatsapp: 0,
      consentimento_sms: 0,
      custom_fields: '{}',
      tags: '[]',
      ...data
    };

    if (!contactData.id) {
      contactData.id = this.generateId();
    }

    return super.create(contactData);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default Contact;
