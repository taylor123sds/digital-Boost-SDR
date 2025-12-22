/**
 * @file Activity.js
 * @description Activity model for tasks, calls, meetings, and interactions
 */

import { BaseModel } from './BaseModel.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

export class Activity extends BaseModel {
  constructor() {
    super('activities');
  }

  /**
   * Find activities for a lead
   */
  findByLead(leadId, { tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0 } = {}) {
    return this.findAll({
      where: { lead_id: leadId, tenant_id: tenantId },
      limit,
      offset,
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find activities for a contact
   */
  findByContact(contactId, { tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0 } = {}) {
    return this.findAll({
      where: { contact_id: contactId, tenant_id: tenantId },
      limit,
      offset,
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find activities for an opportunity
   */
  findByOpportunity(opportunityId, { tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0 } = {}) {
    return this.findAll({
      where: { opportunity_id: opportunityId, tenant_id: tenantId },
      limit,
      offset,
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find activities assigned to a user
   */
  findByAssignee(userId, { tenantId = DEFAULT_TENANT_ID, status, limit = 50, offset = 0 } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      let query = `SELECT * FROM activities WHERE assigned_to = ?${tenantClause}`;
      const params = [userId];
      if (tenantColumn) params.push(tenantId);

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY due_date ASC, priority DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find overdue activities
   */
  findOverdue(userId = null, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND a.${tenantColumn} = ?` : '';
      let query = `
        SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN opportunities o ON a.opportunity_id = o.id
        WHERE a.status IN ('pending', 'in_progress')
          AND a.due_date IS NOT NULL
          AND datetime(a.due_date) < datetime('now')
          ${tenantClause}
      `;
      const params = [];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (a.assigned_to = ? OR a.owner_id = ?)';
        params.push(userId, userId);
      }

      query += ' ORDER BY a.due_date ASC, a.priority DESC';

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find today's activities
   */
  findToday(userId = null, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND a.${tenantColumn} = ?` : '';
      let query = `
        SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN opportunities o ON a.opportunity_id = o.id
        WHERE a.status IN ('pending', 'in_progress')
          AND date(a.due_date) = date('now')
          ${tenantClause}
      `;
      const params = [];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (a.assigned_to = ? OR a.owner_id = ?)';
        params.push(userId, userId);
      }

      query += ' ORDER BY a.due_time ASC, a.priority DESC';

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find upcoming activities
   */
  findUpcoming(userId = null, { tenantId = DEFAULT_TENANT_ID, days = 7, limit = 50 } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND a.${tenantColumn} = ?` : '';
      let query = `
        SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN opportunities o ON a.opportunity_id = o.id
        WHERE a.status IN ('pending', 'in_progress')
          AND date(a.due_date) > date('now')
          AND date(a.due_date) <= date('now', '+' || ? || ' days')
          ${tenantClause}
      `;
      const params = [days];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (a.assigned_to = ? OR a.owner_id = ?)';
        params.push(userId, userId);
      }

      query += ' ORDER BY a.due_date ASC, a.due_time ASC LIMIT ?';
      params.push(limit);

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get timeline (recent activities)
   */
  getTimeline({ userId, entityType, entityId, tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0 } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND a.${tenantColumn} = ?` : '';
      let query = `
        SELECT
          a.*,
          u.name as owner_name,
          u2.name as assigned_to_name,
          l.nome as lead_name,
          c.nome as contact_name,
          o.nome as opportunity_name,
          acc.nome as account_name
        FROM activities a
        LEFT JOIN users u ON a.owner_id = u.id
        LEFT JOIN users u2 ON a.assigned_to = u2.id
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN opportunities o ON a.opportunity_id = o.id
        LEFT JOIN accounts acc ON a.account_id = acc.id
        WHERE 1=1${tenantClause}
      `;
      const params = [];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (a.owner_id = ? OR a.assigned_to = ?)';
        params.push(userId, userId);
      }

      if (entityType && entityId) {
        switch (entityType) {
          case 'lead':
            query += ' AND a.lead_id = ?';
            break;
          case 'contact':
            query += ' AND a.contact_id = ?';
            break;
          case 'opportunity':
            query += ' AND a.opportunity_id = ?';
            break;
          case 'account':
            query += ' AND a.account_id = ?';
            break;
        }
        params.push(entityId);
      }

      query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark activity as completed
   */
  complete(activityId, resultado = null, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        UPDATE activities
        SET status = 'completed',
            completed_at = datetime('now'),
            resultado = COALESCE(?, resultado)
        WHERE id = ?${tenantClause}
      `);
      stmt.run(...(tenantColumn ? [resultado, activityId, tenantId] : [resultado, activityId]));
      return this.findById(activityId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reschedule activity
   */
  reschedule(activityId, newDueDate, newDueTime = null) {
    return this.update(activityId, {
      due_date: newDueDate,
      due_time: newDueTime,
      status: 'pending'
    });
  }

  /**
   * Get activity counts by status
   */
  getCountsByStatus(userId = null, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      let query = `
        SELECT
          status,
          COUNT(*) as count
        FROM activities
        WHERE 1=1${tenantClause}
      `;
      const params = [];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (assigned_to = ? OR owner_id = ?)';
        params.push(userId, userId);
      }

      query += ' GROUP BY status';

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      return {
        pending: results.find(r => r.status === 'pending')?.count || 0,
        in_progress: results.find(r => r.status === 'in_progress')?.count || 0,
        completed: results.find(r => r.status === 'completed')?.count || 0,
        cancelled: results.find(r => r.status === 'cancelled')?.count || 0,
        overdue: results.find(r => r.status === 'overdue')?.count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get activity counts by type
   */
  getCountsByType(userId = null, { tenantId = DEFAULT_TENANT_ID, startDate, endDate } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('activities', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      let query = `
        SELECT
          tipo,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM activities
        WHERE 1=1${tenantClause}
      `;
      const params = [];
      if (tenantColumn) params.push(tenantId);

      if (userId) {
        query += ' AND (assigned_to = ? OR owner_id = ?)';
        params.push(userId, userId);
      }

      if (startDate && endDate) {
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += ' GROUP BY tipo';

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search activities
   */
  search(searchTerm, options = {}) {
    const fields = ['titulo', 'descricao'];
    return super.search(searchTerm, fields, options);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create activity with defaults
   */
  create(data) {
    const activityData = {
      id: this.generateId(),
      status: 'pending',
      priority: 'normal',
      metadata: '{}',
      tags: '[]',
      ...data
    };
    return super.create(activityData);
  }
}

export default Activity;
