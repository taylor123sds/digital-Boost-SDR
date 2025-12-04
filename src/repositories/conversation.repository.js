/**
 * @file repositories/conversation.repository.js
 * @description Repository for whatsapp_messages table
 * Wave 2: Database Layer - Conversation Repository
 */

import { BaseRepository } from './base.repository.js';
import { ConversationError } from '../utils/errors/index.js';

/**
 * Conversation Repository
 * Manages WhatsApp message history
 */
export class ConversationRepository extends BaseRepository {
  constructor(db, logger) {
    super(db, logger, 'whatsapp_messages');
  }

  /**
   * Find messages by phone number
   * @param {string} phoneNumber - Phone number
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} Messages
   */
  findByPhone(phoneNumber, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      return this.findBy(
        { phone_number: phoneNumber },
        { limit, offset, orderBy: 'created_at', order: 'DESC' }
      );
    } catch (error) {
      this.logger.error('findByPhone failed', { phoneNumber, error: error.message });
      throw new ConversationError('Failed to find messages by phone', { phoneNumber });
    }
  }

  /**
   * Find recent messages for phone number
   * @param {string} phoneNumber - Phone number
   * @param {number} limit - Number of messages to retrieve
   * @returns {Array} Recent messages (newest first)
   */
  findRecent(phoneNumber, limit = 10) {
    try {
      return this.findByPhone(phoneNumber, { limit, offset: 0 });
    } catch (error) {
      this.logger.error('findRecent failed', { phoneNumber, limit, error: error.message });
      throw new ConversationError('Failed to find recent messages', { phoneNumber });
    }
  }

  /**
   * Create a new message
   * @param {Object} data - Message data
   * @param {string} data.phone_number - Phone number
   * @param {string} data.message_text - Message text
   * @param {number} data.from_me - 1 if from bot, 0 if from user
   * @param {string} data.message_type - Message type (text, audio, image, etc)
   * @returns {Object} Created message
   */
  createMessage(data) {
    try {
      const messageData = {
        phone_number: data.phone_number,
        message_text: data.message_text,
        from_me: data.from_me || 0,
        message_type: data.message_type || 'text',
        created_at: data.created_at || new Date().toISOString()
      };

      const message = this.create(messageData);

      this.logger.info('Message created', {
        phone_number: data.phone_number,
        from_me: data.from_me,
        type: data.message_type
      });

      return message;
    } catch (error) {
      this.logger.error('createMessage failed', { data, error: error.message });
      throw new ConversationError('Failed to create message', data);
    }
  }

  /**
   * Find messages by type
   * @param {string} phoneNumber - Phone number
   * @param {string} messageType - Message type
   * @param {Object} options - Query options
   * @returns {Array} Messages
   */
  findByType(phoneNumber, messageType, options = {}) {
    try {
      return this.findBy(
        { phone_number: phoneNumber, message_type: messageType },
        { ...options, orderBy: 'created_at', order: 'DESC' }
      );
    } catch (error) {
      this.logger.error('findByType failed', { phoneNumber, messageType, error: error.message });
      throw new ConversationError('Failed to find messages by type', { phoneNumber, messageType });
    }
  }

  /**
   * Get conversation context (last N messages)
   * @param {string} phoneNumber - Phone number
   * @param {number} messageCount - Number of messages
   * @returns {Array} Messages in chronological order (oldest first)
   */
  getContext(phoneNumber, messageCount = 10) {
    try {
      const messages = this.findRecent(phoneNumber, messageCount);

      // Reverse to get chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      this.logger.error('getContext failed', { phoneNumber, messageCount, error: error.message });
      throw new ConversationError('Failed to get conversation context', { phoneNumber });
    }
  }

  /**
   * Count messages for phone number
   * @param {string} phoneNumber - Phone number
   * @param {Object} filters - Additional filters (from_me, message_type)
   * @returns {number} Message count
   */
  countByPhone(phoneNumber, filters = {}) {
    try {
      const criteria = { phone_number: phoneNumber, ...filters };
      return this.countBy(criteria);
    } catch (error) {
      this.logger.error('countByPhone failed', { phoneNumber, filters, error: error.message });
      throw new ConversationError('Failed to count messages', { phoneNumber });
    }
  }

  /**
   * Delete old messages (cleanup)
   * @param {number} daysOld - Delete messages older than this many days
   * @returns {number} Number of deleted messages
   */
  deleteOlderThan(daysOld) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const sql = `DELETE FROM ${this.tableName} WHERE created_at < ?`;
      const result = this.execute(sql, [cutoffDate.toISOString()]);

      this.logger.info('Old messages deleted', { daysOld, deleted: result.changes });
      return result.changes;
    } catch (error) {
      this.logger.error('deleteOlderThan failed', { daysOld, error: error.message });
      throw new ConversationError('Failed to delete old messages', { daysOld });
    }
  }

  /**
   * Delete messages for phone number
   * @param {string} phoneNumber - Phone number
   * @returns {number} Number of deleted messages
   */
  deleteByPhone(phoneNumber) {
    try {
      const deleted = this.deleteBy({ phone_number: phoneNumber });

      this.logger.info('Messages deleted for phone', { phoneNumber, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('deleteByPhone failed', { phoneNumber, error: error.message });
      throw new ConversationError('Failed to delete messages', { phoneNumber });
    }
  }

  /**
   * Get message statistics for phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Statistics
   */
  getStatistics(phoneNumber) {
    try {
      const sql = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as from_bot,
          SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as from_user,
          COUNT(DISTINCT message_type) as message_types,
          MIN(created_at) as first_message,
          MAX(created_at) as last_message
        FROM ${this.tableName}
        WHERE phone_number = ?
      `;

      const stats = this.db.prepare(sql).get(phoneNumber);

      this.logger.debug('Statistics retrieved', { phoneNumber, stats });
      return stats;
    } catch (error) {
      this.logger.error('getStatistics failed', { phoneNumber, error: error.message });
      throw new ConversationError('Failed to get statistics', { phoneNumber });
    }
  }

  /**
   * Find messages by date range
   * @param {string} phoneNumber - Phone number
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Array} Messages
   */
  findByDateRange(phoneNumber, startDate, endDate, options = {}) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE phone_number = ?
          AND created_at >= ?
          AND created_at <= ?
        ORDER BY created_at DESC
      `;

      const params = [phoneNumber, startDate.toISOString(), endDate.toISOString()];

      if (options.limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.offset || 0);
      }

      return this.query(sql, params);
    } catch (error) {
      this.logger.error('findByDateRange failed', { phoneNumber, startDate, endDate, error: error.message });
      throw new ConversationError('Failed to find messages by date range', { phoneNumber });
    }
  }
}

export default ConversationRepository;
