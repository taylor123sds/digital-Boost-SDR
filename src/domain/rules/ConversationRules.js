/**
 * @file domain/rules/ConversationRules.js
 * @description Conversation business rules
 * Wave 3: Domain Layer - Business Rules
 */

import { BusinessRuleError } from '../../utils/errors/index.js';

/**
 * Conversation Business Rules
 * Defines and validates business rules for conversations
 */
export class ConversationRules {
  /**
   * Maximum message length (characters)
   */
  static MAX_MESSAGE_LENGTH = 4096;

  /**
   * Minimum message length (characters)
   */
  static MIN_MESSAGE_LENGTH = 1;

  /**
   * Maximum messages to load in context
   */
  static MAX_CONTEXT_MESSAGES = 50;

  /**
   * Minimum time between messages (ms) to prevent spam
   */
  static MIN_TIME_BETWEEN_MESSAGES = 1000; // 1 second

  /**
   * Maximum messages per minute (rate limiting)
   */
  static MAX_MESSAGES_PER_MINUTE = 30;

  /**
   * Inactivity threshold (ms) - 1 hour
   */
  static INACTIVITY_THRESHOLD = 3600000;

  /**
   * Maximum conversation age for cleanup (days)
   */
  static MAX_CONVERSATION_AGE_DAYS = 90;

  /**
   * Validate message text
   * @param {string} text - Message text
   * @throws {BusinessRuleError} If invalid
   */
  static validateMessageText(text) {
    if (!text || typeof text !== 'string') {
      throw new BusinessRuleError(
        'Message text must be a non-empty string',
        { field: 'text' }
      );
    }

    const trimmedText = text.trim();

    if (trimmedText.length < this.MIN_MESSAGE_LENGTH) {
      throw new BusinessRuleError(
        'Message text is too short',
        {
          field: 'text',
          length: trimmedText.length,
          minimum: this.MIN_MESSAGE_LENGTH
        }
      );
    }

    if (trimmedText.length > this.MAX_MESSAGE_LENGTH) {
      throw new BusinessRuleError(
        'Message text is too long',
        {
          field: 'text',
          length: trimmedText.length,
          maximum: this.MAX_MESSAGE_LENGTH
        }
      );
    }
  }

  /**
   * Validate context size
   * @param {number} messageCount - Requested message count
   * @throws {BusinessRuleError} If invalid
   */
  static validateContextSize(messageCount) {
    if (typeof messageCount !== 'number' || messageCount < 1) {
      throw new BusinessRuleError(
        'Message count must be a positive number',
        { field: 'messageCount', value: messageCount }
      );
    }

    if (messageCount > this.MAX_CONTEXT_MESSAGES) {
      throw new BusinessRuleError(
        'Context size too large',
        {
          field: 'messageCount',
          value: messageCount,
          maximum: this.MAX_CONTEXT_MESSAGES
        }
      );
    }
  }

  /**
   * Check if conversation is inactive
   * @param {Conversation} conversation - Conversation entity
   * @returns {boolean} True if inactive
   */
  static isInactive(conversation) {
    const timeSinceLastMessage = conversation.getTimeSinceLastMessage();

    if (timeSinceLastMessage === null) {
      return true; // No messages = inactive
    }

    return timeSinceLastMessage > this.INACTIVITY_THRESHOLD;
  }

  /**
   * Check if conversation should be archived
   * @param {Conversation} conversation - Conversation entity
   * @returns {Object} Archive assessment
   */
  static shouldArchive(conversation) {
    const reasons = [];

    // Rule 1: Check age
    const ageInDays = Math.floor(
      (Date.now() - conversation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays > this.MAX_CONVERSATION_AGE_DAYS) {
      reasons.push(`Conversation age (${ageInDays} days) exceeds maximum (${this.MAX_CONVERSATION_AGE_DAYS} days)`);
    }

    // Rule 2: Check inactivity
    if (this.isInactive(conversation)) {
      const daysSinceLastMessage = Math.floor(
        (conversation.getTimeSinceLastMessage() || 0) / (1000 * 60 * 60 * 24)
      );
      reasons.push(`Inactive for ${daysSinceLastMessage} days`);
    }

    // Rule 3: Check if empty
    if (conversation.isEmpty()) {
      reasons.push('Conversation is empty');
    }

    const shouldArchive = reasons.length > 0;

    return {
      should_archive: shouldArchive,
      reasons,
      age_days: ageInDays
    };
  }

  /**
   * Validate rate limiting
   * @param {Conversation} conversation - Conversation entity
   * @param {number} timeWindowMs - Time window in milliseconds
   * @throws {BusinessRuleError} If rate limit exceeded
   */
  static validateRateLimit(conversation, timeWindowMs = 60000) {
    const oneMinuteAgo = new Date(Date.now() - timeWindowMs);
    const recentMessages = conversation.getMessagesByDateRange(
      oneMinuteAgo,
      new Date()
    );

    if (recentMessages.length >= this.MAX_MESSAGES_PER_MINUTE) {
      throw new BusinessRuleError(
        'Message rate limit exceeded',
        {
          messages_in_window: recentMessages.length,
          maximum: this.MAX_MESSAGES_PER_MINUTE,
          window_ms: timeWindowMs
        }
      );
    }
  }

  /**
   * Validate message timing (prevent rapid-fire spam)
   * @param {Conversation} conversation - Conversation entity
   * @throws {BusinessRuleError} If too soon after last message
   */
  static validateMessageTiming(conversation) {
    const lastMessage = conversation.getLastMessage();

    if (!lastMessage) {
      return; // No previous message
    }

    const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();

    if (timeSinceLastMessage < this.MIN_TIME_BETWEEN_MESSAGES) {
      throw new BusinessRuleError(
        'Messages sent too rapidly',
        {
          time_since_last_ms: timeSinceLastMessage,
          minimum_ms: this.MIN_TIME_BETWEEN_MESSAGES
        }
      );
    }
  }

  /**
   * Calculate conversation health score
   * @param {Conversation} conversation - Conversation entity
   * @returns {Object} Health assessment
   */
  static assessHealth(conversation) {
    let healthScore = 100;
    const issues = [];

    // Check message balance
    const userCount = conversation.getUserMessageCount();
    const botCount = conversation.getBotMessageCount();
    const total = conversation.getMessageCount();

    if (total === 0) {
      healthScore = 0;
      issues.push('No messages in conversation');
      return {
        health_score: healthScore,
        health_level: 'critical',
        issues
      };
    }

    const userRatio = userCount / total;

    // Unhealthy if bot dominates (user < 30%)
    if (userRatio < 0.3) {
      healthScore -= 30;
      issues.push('Low user engagement (bot dominates conversation)');
    }

    // Unhealthy if user dominates (user > 70%)
    if (userRatio > 0.7) {
      healthScore -= 20;
      issues.push('Bot not responding enough');
    }

    // Check for recent activity
    if (this.isInactive(conversation)) {
      healthScore -= 25;
      issues.push('Conversation is inactive');
    }

    // Check conversation length
    if (total < 5) {
      healthScore -= 15;
      issues.push('Very short conversation');
    }

    const healthLevel = healthScore >= 70 ? 'good' :
      (healthScore >= 40 ? 'moderate' : 'poor');

    return {
      health_score: Math.max(0, healthScore),
      health_level: healthLevel,
      issues,
      message_count: total,
      user_ratio: Math.round(userRatio * 100),
      is_active: !this.isInactive(conversation)
    };
  }

  /**
   * Check if conversation needs attention
   * @param {Conversation} conversation - Conversation entity
   * @returns {Object} Attention assessment
   */
  static needsAttention(conversation) {
    const reasons = [];

    // Check 1: User sent message but no bot response
    const lastMessage = conversation.getLastMessage();
    if (lastMessage && lastMessage.isFromUser()) {
      const timeSince = Date.now() - lastMessage.timestamp.getTime();
      if (timeSince > 300000) { // 5 minutes
        reasons.push('User message awaiting response for 5+ minutes');
      }
    }

    // Check 2: Multiple consecutive user messages
    const lastFive = conversation.getRecentMessages(5);
    const consecutiveUser = lastFive.reduce((count, msg, idx) => {
      if (idx === 0) return msg.isFromUser() ? 1 : 0;
      const prev = lastFive[idx - 1];
      if (msg.isFromUser() && prev.isFromUser()) {
        return count + 1;
      }
      return count;
    }, 0);

    if (consecutiveUser >= 3) {
      reasons.push('Multiple consecutive user messages without bot response');
    }

    // Check 3: Health score low
    const health = this.assessHealth(conversation);
    if (health.health_level === 'poor') {
      reasons.push('Conversation health is poor');
    }

    const needsAttention = reasons.length > 0;

    return {
      needs_attention: needsAttention,
      urgency: consecutiveUser >= 3 ? 'high' : 'medium',
      reasons
    };
  }

  /**
   * Validate search query
   * @param {string} query - Search query
   * @throws {BusinessRuleError} If invalid
   */
  static validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new BusinessRuleError(
        'Search query must be a non-empty string',
        { field: 'query' }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      throw new BusinessRuleError(
        'Search query too short (minimum 2 characters)',
        {
          field: 'query',
          length: trimmedQuery.length
        }
      );
    }

    if (trimmedQuery.length > 100) {
      throw new BusinessRuleError(
        'Search query too long (maximum 100 characters)',
        {
          field: 'query',
          length: trimmedQuery.length
        }
      );
    }
  }
}

export default ConversationRules;
