/**
 * @file Account.js
 * @description Account model (companies/organizations)
 */

import { BaseModel } from './BaseModel.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

export class Account extends BaseModel {
  constructor() {
    super('accounts');
  }

  /**
   * Search accounts by name, CNPJ, or segment
   */
  search(searchTerm, options = {}) {
    const fields = ['nome', 'razao_social', 'cnpj', 'setor', 'segmento'];
    return super.search(searchTerm, fields, options);
  }

  /**
   * Find accounts by type
   */
  findByType(tipo, options = {}) {
    return this.findAll({ where: { tipo }, ...options });
  }

  /**
   * Find accounts by sector
   */
  findBySetor(setor, options = {}) {
    return this.findAll({ where: { setor }, ...options });
  }

  /**
   * Find accounts by owner
   */
  findByOwner(ownerId, options = {}) {
    return this.findAll({ where: { owner_id: ownerId }, ...options });
  }

  /**
   * Get account with related contacts
   */
  findByIdWithContacts(accountId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const account = this.findById(accountId);
      if (!account) return null;

      const contactsTenant = getTenantColumnForTable('contacts', db);
      const opportunitiesTenant = getTenantColumnForTable('opportunities', db);
      const contactsClause = contactsTenant ? ` AND ${contactsTenant} = ?` : '';
      const opportunitiesClause = opportunitiesTenant ? ` AND ${opportunitiesTenant} = ?` : '';
      const contacts = db.prepare(`SELECT * FROM contacts WHERE account_id = ?${contactsClause}`)
        .all(...(contactsTenant ? [accountId, tenantId] : [accountId]));
      const opportunities = db.prepare(`SELECT * FROM opportunities WHERE account_id = ?${opportunitiesClause}`)
        .all(...(opportunitiesTenant ? [accountId, tenantId] : [accountId]));

      return {
        ...account,
        contacts,
        opportunities,
        totalContacts: contacts.length,
        totalOpportunities: opportunities.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get account statistics
   */
  getStats(tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('accounts', db);
      const tenantWhere = tenantColumn ? ` WHERE ${tenantColumn} = ?` : '';
      const tenantParams = tenantColumn ? [tenantId] : [];
      const total = db.prepare(`SELECT COUNT(*) as count FROM accounts${tenantWhere}`).get(...tenantParams).count;
      const byTypeWhere = tenantColumn ? ` WHERE ${tenantColumn} = ?` : '';
      const byType = db.prepare(`
        SELECT tipo, COUNT(*) as count
        FROM accounts
        ${byTypeWhere}
        GROUP BY tipo
      `).all(...tenantParams);
      const bySetorWhere = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const bySetor = db.prepare(`
        SELECT setor, COUNT(*) as count
        FROM accounts
        WHERE setor IS NOT NULL${bySetorWhere}
        GROUP BY setor
        ORDER BY count DESC
        LIMIT 10
      `).all(...(tenantColumn ? [tenantId] : []));

      return { total, byType, bySetor };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create account with validation
   */
  create(data) {
    // Set defaults
    const accountData = {
      tipo: 'prospect',
      pais: 'Brasil',
      custom_fields: '{}',
      tags: '[]',
      ...data
    };

    // Generate ID if not provided
    if (!accountData.id) {
      accountData.id = this.generateId();
    }

    return super.create(accountData);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default Account;
