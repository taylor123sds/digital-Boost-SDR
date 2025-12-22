/**
 * @file domain/services/ConversationService.js
 * @description Conversation Domain Service
 * Wave 3: Domain Layer - Services
 */

import { Conversation, Message } from '../entities/Conversation.js';
import { PhoneNumber } from '../value-objects/PhoneNumber.js';
import { ValidationError, NotFoundError } from '../../utils/errors/index.js';

/**
 * Conversation Domain Service
 * Orchestrates conversation and message operations
 */
export class ConversationService {
  /**
   * @param {Object} conversationRepository - Conversation repository
   * @param {Object} logger - Logger instance
   */
  constructor(conversationRepository, logger) {
    this.conversationRepository = conversationRepository;
    this.logger = logger;
  }

  /**
   * Get conversation by phone number
   * @param {string} phoneNumber - Phone number
   * @param {number} messageLimit - Maximum messages to load
   * @returns {Conversation} Conversation entity
   */
  async getByPhoneNumber(phoneNumber, tenantId, messageLimit = 100) {
    this.logger.debug('Getting conversation by phone number', {
      phoneNumber,
      tenantId,
      messageLimit
    });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    // Get messages from repository
    const messageRecords = this.conversationRepository.findRecent(
      phoneValue,
      tenantId,
      messageLimit
    );

    // Create conversation entity
    return Conversation.fromDatabase(phoneValue, messageRecords);
  }

  /**
   * Get conversation context for AI
   * @param {string} phoneNumber - Phone number
   * @param {number} messageCount - Number of messages
   * @returns {Array<Object>} Context array
   */
  async getContext(phoneNumber, tenantId, messageCount = 10) {
    this.logger.debug('Getting conversation context', {
      phoneNumber,
      tenantId,
      messageCount
    });

    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, messageCount);

    return conversation.getContext(messageCount);
  }

  /**
   * Add message to conversation
   * @param {string} phoneNumber - Phone number
   * @param {string} text - Message text
   * @param {boolean} fromMe - Is from bot
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  async addMessage(phoneNumber, text, fromMe, options = {}) {
    this.logger.info('Adding message to conversation', {
      phoneNumber,
      tenantId: options.tenantId,
      fromMe,
      textLength: text?.length
    });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    // Validate message
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Message text is required', { field: 'text' });
    }

    // Create message record
    const messageData = {
      phone_number: phoneValue,
      message_text: text.trim(),
      from_me: fromMe ? 1 : 0,
      message_type: options.type || 'text',
      timestamp: options.timestamp || new Date().toISOString(),
      metadata: options.metadata ? JSON.stringify(options.metadata) : null
    };

    // Persist to database
    const record = this.conversationRepository.createMessage(messageData, options.tenantId);

    // Return Message entity
    return Message.fromDatabase(record);
  }

  /**
   * Add user message
   * @param {string} phoneNumber - Phone number
   * @param {string} text - Message text
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  async addUserMessage(phoneNumber, text, options = {}) {
    return await this.addMessage(phoneNumber, text, false, options);
  }

  /**
   * Add bot message
   * @param {string} phoneNumber - Phone number
   * @param {string} text - Message text
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  async addBotMessage(phoneNumber, text, options = {}) {
    return await this.addMessage(phoneNumber, text, true, options);
  }

  /**
   * Get message count for conversation
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Message counts
   */
  async getMessageCount(phoneNumber, tenantId) {
    this.logger.debug('Getting message count', { phoneNumber });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    const total = this.conversationRepository.countByPhone(phoneValue, tenantId);
    const fromUser = this.conversationRepository.countByPhone(phoneValue, tenantId, {
      from_me: 0
    });
    const fromBot = this.conversationRepository.countByPhone(phoneValue, tenantId, {
      from_me: 1
    });

    return {
      total,
      from_user: fromUser,
      from_bot: fromBot
    };
  }

  /**
   * Get conversation statistics
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Statistics
   */
  async getStatistics(phoneNumber, tenantId) {
    this.logger.debug('Getting conversation statistics', { phoneNumber });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    return this.conversationRepository.getStatistics(phoneValue, tenantId);
  }

  /**
   * Search messages in conversation
   * @param {string} phoneNumber - Phone number
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array<Message>} Matching messages
   */
  async searchMessages(phoneNumber, tenantId, query, options = {}) {
    this.logger.debug('Searching messages', { phoneNumber, query, options });

    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId);

    const results = conversation.searchMessages(query, options);

    return results;
  }

  /**
   * Get messages by type
   * @param {string} phoneNumber - Phone number
   * @param {string} type - Message type
   * @returns {Array<Message>} Messages of type
   */
  async getMessagesByType(phoneNumber, tenantId, type) {
    this.logger.debug('Getting messages by type', { phoneNumber, type });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    const records = this.conversationRepository.findByType(phoneValue, tenantId, type);

    return records.map(record => Message.fromDatabase(record));
  }

  /**
   * Get messages by date range
   * @param {string} phoneNumber - Phone number
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array<Message>} Messages in range
   */
  async getMessagesByDateRange(phoneNumber, tenantId, startDate, endDate) {
    this.logger.debug('Getting messages by date range', {
      phoneNumber,
      tenantId,
      startDate,
      endDate
    });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    const records = this.conversationRepository.findByDateRange(
      phoneValue,
      tenantId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    return records.map(record => Message.fromDatabase(record));
  }

  /**
   * Delete conversation
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if deleted
   */
  async deleteConversation(phoneNumber, tenantId) {
    this.logger.info('Deleting conversation', { phoneNumber, tenantId });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    const deleted = this.conversationRepository.deleteByPhone(phoneValue, tenantId);

    return deleted > 0;
  }

  /**
   * Delete old messages
   * @param {number} daysOld - Days old threshold
   * @returns {number} Number of deleted messages
   */
  async deleteOldMessages(tenantId, daysOld) {
    this.logger.info('Deleting old messages', { tenantId, daysOld });

    return this.conversationRepository.deleteOlderThan(tenantId, daysOld);
  }

  /**
   * Check if conversation has recent activity
   * @param {string} phoneNumber - Phone number
   * @param {number} thresholdMs - Threshold in milliseconds
   * @returns {boolean} True if has recent activity
   */
  async hasRecentActivity(phoneNumber, tenantId, thresholdMs = 3600000) {
    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, 1);

    return conversation.hasRecentActivity(thresholdMs);
  }

  /**
   * Get time since last message
   * @param {string} phoneNumber - Phone number
   * @returns {number|null} Milliseconds or null
   */
  async getTimeSinceLastMessage(phoneNumber, tenantId) {
    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, 1);

    return conversation.getTimeSinceLastMessage();
  }

  /**
   * Get conversation summary
   * @param {string} phoneNumber - Phone number
   * @returns {string} Summary text
   */
  async getSummary(phoneNumber, tenantId) {
    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId);

    return conversation.getSummary();
  }

  /**
   * Get last message
   * @param {string} phoneNumber - Phone number
   * @returns {Message|null} Last message or null
   */
  async getLastMessage(phoneNumber, tenantId) {
    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, 1);

    return conversation.getLastMessage();
  }

  /**
   * Get last user message
   * @param {string} phoneNumber - Phone number
   * @returns {Message|null} Last user message or null
   */
  async getLastUserMessage(phoneNumber, tenantId) {
    const phoneValue = new PhoneNumber(phoneNumber).value;

    const records = this.conversationRepository.findByForTenant(
      tenantId,
      { phone_number: phoneValue, from_me: 0 },
      { orderBy: 'timestamp DESC', limit: 1 }
    );

    return records.length > 0 ? Message.fromDatabase(records[0]) : null;
  }

  /**
   * Get last bot message
   * @param {string} phoneNumber - Phone number
   * @returns {Message|null} Last bot message or null
   */
  async getLastBotMessage(phoneNumber, tenantId) {
    const phoneValue = new PhoneNumber(phoneNumber).value;

    const records = this.conversationRepository.findByForTenant(
      tenantId,
      { phone_number: phoneValue, from_me: 1 },
      { orderBy: 'timestamp DESC', limit: 1 }
    );

    return records.length > 0 ? Message.fromDatabase(records[0]) : null;
  }

  /**
   * Build conversation history for AI context
   * @param {string} phoneNumber - Phone number
   * @param {Object} options - Build options
   * @returns {Array<Object>} Formatted history
   */
  async buildAIContext(phoneNumber, tenantId, options = {}) {
    const {
      messageCount = 10,
      includeSystemPrompt = true,
      systemPrompt = null
    } = options;

    this.logger.debug('Building AI context', { phoneNumber, tenantId, messageCount });

    const context = await this.getContext(phoneNumber, tenantId, messageCount);

    // Add system prompt if requested
    if (includeSystemPrompt && systemPrompt) {
      context.unshift({
        role: 'system',
        content: systemPrompt
      });
    }

    return context;
  }

  /**
   * Analyze conversation sentiment
   * @param {string} phoneNumber - Phone number
   * @param {number} messageCount - Messages to analyze
   * @returns {Object} Sentiment analysis
   */
  async analyzeSentiment(phoneNumber, tenantId, messageCount = 10) {
    this.logger.debug('Analyzing conversation sentiment', {
      phoneNumber,
      tenantId,
      messageCount
    });

    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, messageCount);
    const userMessages = conversation.getUserMessages();

    // Simple sentiment indicators
    const positiveKeywords = [
      'sim', 'yes', 'obrigado', 'thanks', 'perfeito', 'perfect',
      'ótimo', 'great', 'excelente', 'excellent', 'interessante', 'interesting'
    ];

    const negativeKeywords = [
      'não', 'no', 'nunca', 'never', 'problema', 'problem',
      'ruim', 'bad', 'péssimo', 'terrible', 'chato', 'boring'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    userMessages.forEach(msg => {
      const text = msg.text.toLowerCase();

      positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) positiveCount++;
      });

      negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) negativeCount++;
      });
    });

    const total = positiveCount + negativeCount;
    const sentiment = total === 0 ? 'neutral' :
      (positiveCount > negativeCount ? 'positive' :
        (negativeCount > positiveCount ? 'negative' : 'neutral'));

    return {
      sentiment,
      positive_score: total === 0 ? 0 : (positiveCount / total) * 100,
      negative_score: total === 0 ? 0 : (negativeCount / total) * 100,
      message_count: userMessages.length,
      analyzed_at: new Date().toISOString()
    };
  }

  /**
   * Calculate engagement level
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Engagement metrics
   */
  async calculateEngagement(phoneNumber, tenantId) {
    this.logger.debug('Calculating engagement', { phoneNumber, tenantId });

    const stats = await this.getStatistics(phoneNumber, tenantId);
    const conversation = await this.getByPhoneNumber(phoneNumber, tenantId, 20);

    // Calculate metrics
    const avgResponseTime = this._calculateAverageResponseTime(conversation);
    const engagementLevel = this._determineEngagementLevel(stats, avgResponseTime);

    return {
      level: engagementLevel,
      message_count: stats.total,
      user_messages: stats.from_user,
      bot_messages: stats.from_bot,
      avg_response_time_ms: avgResponseTime,
      has_recent_activity: conversation.hasRecentActivity()
    };
  }

  /**
   * Calculate average response time
   * @private
   * @param {Conversation} conversation - Conversation entity
   * @returns {number|null} Average response time in ms
   */
  _calculateAverageResponseTime(conversation) {
    const messages = conversation.getMessages();

    if (messages.length < 2) return null;

    const responseTimes = [];

    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];

      // Calculate time between user message and bot response
      if (!prev.fromMe && curr.fromMe) {
        const diff = curr.timestamp.getTime() - prev.timestamp.getTime();
        responseTimes.push(diff);
      }
    }

    if (responseTimes.length === 0) return null;

    const sum = responseTimes.reduce((a, b) => a + b, 0);
    return sum / responseTimes.length;
  }

  /**
   * Determine engagement level
   * @private
   * @param {Object} stats - Statistics
   * @param {number|null} avgResponseTime - Average response time
   * @returns {string} Engagement level
   */
  _determineEngagementLevel(stats, avgResponseTime) {
    // High engagement: > 10 user messages
    if (stats.from_user > 10) return 'high';

    // Medium engagement: 5-10 user messages
    if (stats.from_user >= 5) return 'medium';

    // Low engagement: < 5 user messages
    return 'low';
  }
}

export default ConversationService;
