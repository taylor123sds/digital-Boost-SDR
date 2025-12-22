/**
 * @file Notification.js
 * @description Notification model for alerts and updates
 */

import { BaseModel } from './BaseModel.js';
import { DEFAULT_TENANT_ID, getTenantColumnForTable } from '../utils/tenantCompat.js';

export class Notification extends BaseModel {
  constructor() {
    super('notifications');
  }

  /**
   * Find notifications for a user
   */
  findByUser(userId, { tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0, unreadOnly = false } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      let query = `
        SELECT * FROM notifications
        WHERE user_id = ?${tenantClause}
      `;
      const params = [userId];
      if (tenantColumn) params.push(tenantId);

      if (unreadOnly) {
        query += ' AND is_read = 0';
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  getUnreadCount(userId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND is_read = 0${tenantClause}
      `);
      const result = tenantColumn ? stmt.get(userId, tenantId) : stmt.get(userId);
      return result?.count || 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread count by priority
   */
  getUnreadCountByPriority(userId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        SELECT
          priority,
          COUNT(*) as count
        FROM notifications
        WHERE user_id = ? AND is_read = 0${tenantClause}
        GROUP BY priority
      `);
      const results = tenantColumn ? stmt.all(userId, tenantId) : stmt.all(userId);

      return {
        urgent: results.find(r => r.priority === 'urgent')?.count || 0,
        high: results.find(r => r.priority === 'high')?.count || 0,
        normal: results.find(r => r.priority === 'normal')?.count || 0,
        low: results.find(r => r.priority === 'low')?.count || 0,
        total: results.reduce((sum, r) => sum + r.count, 0)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    return this.update(notificationId, { is_read: 1 });
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE user_id = ? AND is_read = 0${tenantClause}
      `);
      const result = tenantColumn ? stmt.run(userId, tenantId) : stmt.run(userId);
      return result.changes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find by type
   */
  findByType(userId, type, { tenantId = DEFAULT_TENANT_ID, limit = 50, offset = 0 } = {}) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        SELECT * FROM notifications
        WHERE user_id = ? AND type = ?${tenantClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      return tenantColumn
        ? stmt.all(userId, type, tenantId, limit, offset)
        : stmt.all(userId, type, limit, offset);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find by entity
   */
  findByEntity(entityType, entityId, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        SELECT * FROM notifications
        WHERE entity_type = ? AND entity_id = ?${tenantClause}
        ORDER BY created_at DESC
      `);
      return tenantColumn ? stmt.all(entityType, entityId, tenantId) : stmt.all(entityType, entityId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  deleteOld(daysOld = 30, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const tenantClause = tenantColumn ? ` AND ${tenantColumn} = ?` : '';
      const stmt = db.prepare(`
        DELETE FROM notifications
        WHERE created_at < datetime('now', '-' || ? || ' days')
          AND is_read = 1
          ${tenantClause}
      `);
      const result = tenantColumn ? stmt.run(daysOld, tenantId) : stmt.run(daysOld);
      return result.changes;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create notification for multiple users
   */
  createForUsers(userIds, notificationData, tenantId = DEFAULT_TENANT_ID) {
    const db = this.getDb();
    try {
      const tenantColumn = getTenantColumnForTable('notifications', db);
      const stmt = db.prepare(`
        INSERT INTO notifications (${tenantColumn ? 'tenant_id, ' : ''}id, user_id, type, title, message, priority, entity_type, entity_id, action_url)
        VALUES (${tenantColumn ? '?, ' : ''}?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const results = [];
      for (const userId of userIds) {
        const id = this.generateId();
        stmt.run(
          ...(tenantColumn ? [tenantId] : []),
          id,
          userId,
          notificationData.type,
          notificationData.title,
          notificationData.message || null,
          notificationData.priority || 'normal',
          notificationData.entity_type || null,
          notificationData.entity_id || null,
          notificationData.action_url || null
        );
        results.push(id);
      }

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  getPreferences(userId) {
    const db = this.getDb();
    try {
      const stmt = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?');
      let prefs = stmt.get(userId);

      // Create default preferences if not exists
      if (!prefs) {
        const insertStmt = db.prepare(`
          INSERT INTO notification_preferences (id, user_id)
          VALUES (?, ?)
        `);
        insertStmt.run(this.generateId(), userId);
        prefs = stmt.get(userId);
      }

      return prefs;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  updatePreferences(userId, preferences) {
    const db = this.getDb();
    try {
      // Ensure preferences exist
      this.getPreferences(userId);

      const updates = Object.keys(preferences).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(preferences), userId];

      const stmt = db.prepare(`
        UPDATE notification_preferences
        SET ${updates}, updated_at = datetime('now')
        WHERE user_id = ?
      `);
      stmt.run(...values);

      return this.getPreferences(userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create notification with defaults
   */
  create(data) {
    const notificationData = {
      id: this.generateId(),
      priority: 'normal',
      is_read: 0,
      ...data
    };
    return super.create(notificationData);
  }

  /**
   * Create specific notification types (helper methods)
   */

  createHotLeadNotification(userId, lead) {
    return this.create({
      user_id: userId,
      type: 'lead_hot',
      title: 'Lead Quente!',
      message: `${lead.nome} atingiu score alto (${lead.score})`,
      priority: 'urgent',
      entity_type: 'lead',
      entity_id: lead.id,
      action_url: `/leads/${lead.id}`
    });
  }

  createTaskOverdueNotification(userId, activity) {
    return this.create({
      user_id: userId,
      type: 'task_overdue',
      title: 'Tarefa Atrasada',
      message: `"${activity.titulo}" está atrasada`,
      priority: 'high',
      entity_type: 'activity',
      entity_id: activity.id,
      action_url: `/activities/${activity.id}`
    });
  }

  createDealWonNotification(userId, opportunity) {
    return this.create({
      user_id: userId,
      type: 'deal_won',
      title: 'Deal Fechado!',
      message: `${opportunity.nome} - R$ ${opportunity.valor?.toLocaleString('pt-BR')}`,
      priority: 'normal',
      entity_type: 'opportunity',
      entity_id: opportunity.id,
      action_url: `/opportunities/${opportunity.id}`
    });
  }

  createMeetingReminderNotification(userId, meeting) {
    return this.create({
      user_id: userId,
      type: 'meeting_reminder',
      title: 'Reunião em breve',
      message: `${meeting.titulo} começa em 15 minutos`,
      priority: 'high',
      entity_type: 'meeting',
      entity_id: meeting.id,
      action_url: `/meetings/${meeting.id}`
    });
  }
}

export default Notification;
