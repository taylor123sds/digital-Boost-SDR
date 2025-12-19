/**
 * @file DeliveryTrackingService.js
 * @description Service for tracking WhatsApp message delivery status
 *
 * Tracks delivery confirmations from Evolution API webhooks and updates
 * cadence action logs accordingly.
 *
 * Delivery States:
 * - sent: Message sent to Evolution API
 * - delivered: Message delivered to recipient's phone
 * - read: Message read by recipient
 * - failed: Message failed to deliver
 *
 * @version 1.0.0
 * @author ORBION Team
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';

/**
 * Singleton instance
 */
let instance = null;

class DeliveryTrackingService {
  constructor() {
    if (instance) {
      return instance;
    }

    this.stats = {
      tracked: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      startedAt: new Date().toISOString()
    };

    // Map messageId -> actionId for quick lookups
    this.pendingDeliveries = new Map();

    // Auto-cleanup old pending entries every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this._cleanupOldEntries();
    }, 30 * 60 * 1000);

    instance = this;
    log.info('[DELIVERY-TRACKING] Service initialized');
  }

  /**
   * Get database connection
   *  CORREÇÃO: Usar conexão singleton do db/connection.js
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Register a message for delivery tracking
   * Called when a cadence message is sent
   *
   * @param {string} actionId - Cadence action log ID
   * @param {string} messageId - Evolution API message ID (key.id)
   * @param {string} phone - Recipient phone number
   * @returns {void}
   */
  registerMessage(actionId, messageId, phone) {
    if (!messageId) {
      log.warn('[DELIVERY-TRACKING] No messageId provided for tracking');
      return;
    }

    this.pendingDeliveries.set(messageId, {
      actionId,
      phone,
      registeredAt: Date.now()
    });

    this.stats.tracked++;

    log.debug('[DELIVERY-TRACKING] Message registered for tracking', {
      actionId: actionId?.substring(0, 12),
      messageId: messageId?.substring(0, 12),
      phone: phone?.substring(0, 8)
    });
  }

  /**
   * Process delivery status update from Evolution webhook
   * Called by webhook handler when receiving message status updates
   *
   * @param {Object} statusData - Status data from webhook
   * @param {string} statusData.messageId - Message ID (key.id)
   * @param {string} statusData.status - Delivery status (DELIVERY_ACK, READ, ERROR)
   * @param {string} statusData.phone - Recipient phone
   * @returns {Object} Processing result
   */
  async processDeliveryStatus(statusData) {
    const { messageId, status, phone } = statusData;

    if (!messageId) {
      return { success: false, reason: 'no_message_id' };
    }

    // Check if we're tracking this message
    const pending = this.pendingDeliveries.get(messageId);

    if (!pending) {
      // Message not from cadence system, ignore
      return { success: true, action: 'ignored', reason: 'not_tracked' };
    }

    const db = this.getDb();

    try {
      // Map Evolution status to our status
      const newStatus = this._mapStatus(status);

      if (!newStatus) {
        return { success: true, action: 'ignored', reason: 'unknown_status' };
      }

      // Update cadence action log
      const updateResult = db.prepare(`
        UPDATE cadence_actions_log
        SET status = ?,
            delivery_status = ?,
            delivery_updated_at = datetime('now')
        WHERE id = ?
      `).run(newStatus, status, pending.actionId);

      if (updateResult.changes > 0) {
        log.info('[DELIVERY-TRACKING] Status updated', {
          actionId: pending.actionId?.substring(0, 12),
          status: newStatus,
          originalStatus: status
        });

        // Update stats
        if (newStatus === 'delivered') this.stats.delivered++;
        else if (newStatus === 'read') this.stats.read++;
        else if (newStatus === 'failed') this.stats.failed++;

        // Remove from pending if final status
        if (['delivered', 'read', 'failed'].includes(newStatus)) {
          this.pendingDeliveries.delete(messageId);
        }

        return { success: true, action: 'updated', status: newStatus };
      }

      return { success: false, reason: 'action_not_found' };

    } catch (error) {
      log.error('[DELIVERY-TRACKING] Error processing status', {
        error: error.message,
        messageId: messageId?.substring(0, 12)
      });
      return { success: false, error: error.message };
    }
    //  FIX CRÍTICO: NÃO fechar conexão singleton - ela é compartilhada
  }

  /**
   * Map Evolution API status to our internal status
   * @private
   */
  _mapStatus(evolutionStatus) {
    const statusMap = {
      // Evolution API v2 status values
      'DELIVERY_ACK': 'delivered',
      'READ': 'read',
      'PLAYED': 'read', // For audio messages
      'ERROR': 'failed',
      'FAILED': 'failed',
      // Baileys status values (if raw)
      '3': 'delivered', // DELIVERY_ACK
      '4': 'read'       // READ
    };

    return statusMap[evolutionStatus] || null;
  }

  /**
   * Get delivery stats for a specific time range
   *
   * @param {Object} options - Query options
   * @param {string} options.since - ISO date string for start time
   * @returns {Object} Delivery statistics
   */
  getDeliveryStats(options = {}) {
    const db = this.getDb();

    try {
      const since = options.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM cadence_actions_log
        WHERE executed_at >= ?
        AND channel = 'whatsapp'
      `).get(since);

      const deliveryRate = stats.total > 0
        ? (((stats.delivered || 0) + (stats.read || 0)) / stats.total * 100).toFixed(1)
        : 0;

      const readRate = (stats.delivered + stats.read) > 0
        ? ((stats.read || 0) / ((stats.delivered || 0) + (stats.read || 0)) * 100).toFixed(1)
        : 0;

      return {
        ...stats,
        deliveryRate: `${deliveryRate}%`,
        readRate: `${readRate}%`,
        pendingTracking: this.pendingDeliveries.size,
        serviceStats: this.stats
      };

    } catch (error) {
      log.error('[DELIVERY-TRACKING] Error getting stats', { error: error.message });
      return { error: error.message };
    }
    //  FIX CRÍTICO: NÃO fechar conexão singleton - ela é compartilhada
  }

  /**
   * Check if a cadence message was delivered
   *
   * @param {string} actionId - Cadence action ID
   * @returns {Object} Delivery status info
   */
  getDeliveryStatus(actionId) {
    const db = this.getDb();

    try {
      const action = db.prepare(`
        SELECT status, delivery_status, delivery_updated_at, executed_at
        FROM cadence_actions_log
        WHERE id = ?
      `).get(actionId);

      if (!action) {
        return { found: false };
      }

      return {
        found: true,
        status: action.status,
        deliveryStatus: action.delivery_status,
        deliveryUpdatedAt: action.delivery_updated_at,
        executedAt: action.executed_at,
        isDelivered: ['delivered', 'read'].includes(action.status),
        isRead: action.status === 'read'
      };

    } catch (error) {
      return { found: false, error: error.message };
    }
    //  FIX CRÍTICO: NÃO fechar conexão singleton - ela é compartilhada
  }

  /**
   * Cleanup old pending entries (> 1 hour)
   * @private
   */
  _cleanupOldEntries() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [messageId, data] of this.pendingDeliveries.entries()) {
      if (data.registeredAt < oneHourAgo) {
        this.pendingDeliveries.delete(messageId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug('[DELIVERY-TRACKING] Cleaned up old entries', { count: cleaned });
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: true,
      pendingDeliveries: this.pendingDeliveries.size,
      stats: this.stats
    };
  }

  /**
   * Shutdown service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    log.info('[DELIVERY-TRACKING] Service shutdown');
  }
}

/**
 * Get singleton instance
 */
export function getDeliveryTrackingService() {
  if (!instance) {
    instance = new DeliveryTrackingService();
  }
  return instance;
}

export default DeliveryTrackingService;
