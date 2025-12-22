/**
 * @file Contact.js
 * @description Contact model (individuals within accounts)
 */

import { BaseModel } from './BaseModel.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

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
    const { tenantId = DEFAULT_TENANT_ID, ...rest } = options;
    return this.findAll({ where: { account_id: accountId, tenant_id: tenantId }, ...rest });
  }

  /**
   * Find contacts by email
   */
  findByEmail(email, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('contacts', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`SELECT * FROM contacts WHERE email = ?${tenantClause}`);
      return tenantColumn ? stmt.get(email, tenantId) : stmt.get(email);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find contacts by WhatsApp
   */
  findByWhatsApp(whatsapp, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('contacts', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`SELECT * FROM contacts WHERE whatsapp = ?${tenantClause}`);
      return tenantColumn ? stmt.get(whatsapp, tenantId) : stmt.get(whatsapp);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find decision makers
   */
  findDecisionMakers(options = {}) {
    const { tenantId = DEFAULT_TENANT_ID, ...rest } = options;
    return this.findAll({ where: { is_decisor: 1, tenant_id: tenantId }, ...rest });
  }

  /**
   * Find by seniority level
   */
  findBySenioridade(senioridade, options = {}) {
    const { tenantId = DEFAULT_TENANT_ID, ...rest } = options;
    return this.findAll({ where: { senioridade, tenant_id: tenantId }, ...rest });
  }

  /**
   * Get contact with account and activities
   */
  findByIdWithDetails(contactId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const contact = this.findById(contactId);
      if (!contact) return null;

      // Get associated account
      let account = null;
      if (contact.account_id) {
        const accountTenant = getTenantColumnForTable('accounts', db);
        const accountClause = accountTenant ? ` AND ${accountTenant} = ?` : '';
        account = db.prepare(`SELECT * FROM accounts WHERE id = ?${accountClause}`)
          .get(...(accountTenant ? [contact.account_id, tenantId] : [contact.account_id]));
      }

      // Get recent activities
      const activitiesTenant = getTenantColumnForTable('activities', db);
      const activitiesClause = activitiesTenant ? ` AND ${activitiesTenant} = ?` : '';
      const activities = db.prepare(`
        SELECT * FROM activities
        WHERE contact_id = ?${activitiesClause}
        ORDER BY created_at DESC
        LIMIT 10
      `).all(...(activitiesTenant ? [contactId, tenantId] : [contactId]));

      // Get opportunities
      const opportunitiesTenant = getTenantColumnForTable('opportunities', db);
      const opportunitiesClause = opportunitiesTenant ? ` AND ${opportunitiesTenant} = ?` : '';
      const opportunities = db.prepare(`
        SELECT * FROM opportunities
        WHERE contact_id = ?${opportunitiesClause}
        ORDER BY created_at DESC
      `).all(...(opportunitiesTenant ? [contactId, tenantId] : [contactId]));

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
  getStats(tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('contacts', db);
      const tenantWhere = tenantColumn ? ` WHERE ${tenantColumn} = ?` : '';
      const tenantParams = tenantColumn ? [tenantId] : [];
      const total = db.prepare(`SELECT COUNT(*) as count FROM contacts${tenantWhere}`).get(...tenantParams).count;
      const decisors = db.prepare(`SELECT COUNT(*) as count FROM contacts${tenantWhere}${tenantWhere ? " AND" : " WHERE"} is_decisor = 1`).get(...tenantParams).count;
      const bySenioridade = db.prepare(`
        SELECT senioridade, COUNT(*) as count
        FROM contacts
        WHERE senioridade IS NOT NULL${tenantColumn ? ` AND ${tenantColumn} = ?` : ''}
        GROUP BY senioridade
      `).all(...(tenantColumn ? [tenantId] : []));
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM contacts
        ${tenantWhere}
        GROUP BY status
      `).all(...tenantParams);

      return { total, decisors, bySenioridade, byStatus };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update contact score
   */
  updateScore(contactId, scoreChange, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('contacts', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        UPDATE contacts
        SET score = score + ?,
            updated_at = datetime('now')
        WHERE id = ?${tenantClause}
      `);
      stmt.run(...(tenantColumn ? [scoreChange, contactId, tenantId] : [scoreChange, contactId]));
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
