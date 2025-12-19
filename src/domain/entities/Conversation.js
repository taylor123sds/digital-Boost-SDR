/**
 * @file domain/entities/Conversation.js
 * @description Conversation entity - Message history aggregate
 * Wave 3: Domain Layer - Entities
 */

import { PhoneNumber } from '../value-objects/PhoneNumber.js';
import { ValidationError, BusinessRuleError } from '../../utils/errors/index.js';

/**
 * Message class - Individual message value object
 */
export class Message {
  /**
   * @param {Object} props - Message properties
   */
  constructor(props) {
    this.id = props.id || null;
    this.text = props.text || '';
    this.fromMe = Boolean(props.fromMe);
    this.type = props.type || 'text';
    this.timestamp = props.timestamp ? new Date(props.timestamp) : new Date();
    this.metadata = props.metadata || {};

    Object.freeze(this);
  }

  /**
   * Check if message is from bot
   * @returns {boolean} True if from bot
   */
  isFromBot() {
    return this.fromMe;
  }

  /**
   * Check if message is from user
   * @returns {boolean} True if from user
   */
  isFromUser() {
    return !this.fromMe;
  }

  /**
   * Get message age in milliseconds
   * @returns {number} Age in ms
   */
  getAge() {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * Check if message is recent (within threshold)
   * @param {number} thresholdMs - Threshold in milliseconds
   * @returns {boolean} True if recent
   */
  isRecent(thresholdMs = 3600000) { // Default 1 hour
    return this.getAge() < thresholdMs;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object
   */
  toObject() {
    return {
      id: this.id,
      text: this.text,
      from_me: this.fromMe ? 1 : 0,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create from database record
   * @param {Object} record - Database record
   * @returns {Message} Message instance
   */
  static fromDatabase(record) {
    return new Message({
      id: record.id,
      text: record.message_text,
      fromMe: Boolean(record.from_me),
      type: record.message_type || 'text',
      timestamp: record.timestamp || record.created_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : {}
    });
  }
}

/**
 * Conversation Entity
 * Aggregate root for conversation history
 */
export class Conversation {
  /**
   * @param {Object} props - Conversation properties
   * @param {string|PhoneNumber} props.phoneNumber - Phone number
   * @param {Array<Message>} props.messages - Messages
   * @param {Object} props.metadata - Conversation metadata
   */
  constructor(props) {
    this.validateProps(props);

    // Value objects
    this.phoneNumber = props.phoneNumber instanceof PhoneNumber
      ? props.phoneNumber
      : new PhoneNumber(props.phoneNumber);

    // Messages collection
    this.messages = props.messages || [];

    // Metadata
    this.metadata = props.metadata || {};

    // Timestamps
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }

  /**
   * Validate constructor properties
   * @param {Object} props - Properties to validate
   */
  validateProps(props) {
    if (!props) {
      throw new ValidationError('Conversation props are required');
    }

    if (!props.phoneNumber) {
      throw new ValidationError('Phone number is required for Conversation', {
        field: 'phoneNumber'
      });
    }
  }

  /**
   * Get conversation's unique identifier (phone number)
   * @returns {string} Phone number
   */
  getId() {
    return this.phoneNumber.value;
  }

  /**
   * Add message to conversation
   * @param {string} text - Message text
   * @param {boolean} fromMe - Is from bot
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  addMessage(text, fromMe, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Message text is required', { field: 'text' });
    }

    const message = new Message({
      text: text.trim(),
      fromMe: Boolean(fromMe),
      type: options.type || 'text',
      timestamp: options.timestamp || new Date(),
      metadata: options.metadata || {}
    });

    this.messages.push(message);
    this.touch();

    return message;
  }

  /**
   * Add user message
   * @param {string} text - Message text
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  addUserMessage(text, options = {}) {
    return this.addMessage(text, false, options);
  }

  /**
   * Add bot message
   * @param {string} text - Message text
   * @param {Object} options - Additional options
   * @returns {Message} Added message
   */
  addBotMessage(text, options = {}) {
    return this.addMessage(text, true, options);
  }

  /**
   * Get all messages
   * @returns {Array<Message>} All messages
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Get recent messages
   * @param {number} limit - Number of messages
   * @returns {Array<Message>} Recent messages
   */
  getRecentMessages(limit = 10) {
    return this.messages.slice(-limit);
  }

  /**
   * Get messages in chronological order
   * @param {number} limit - Optional limit
   * @returns {Array<Message>} Messages
   */
  getChronological(limit = null) {
    const messages = [...this.messages];
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Get messages in reverse chronological order (most recent first)
   * @param {number} limit - Optional limit
   * @returns {Array<Message>} Messages
   */
  getReverseChronological(limit = null) {
    const messages = [...this.messages].reverse();
    return limit ? messages.slice(0, limit) : messages;
  }

  /**
   * Get user messages only
   * @returns {Array<Message>} User messages
   */
  getUserMessages() {
    return this.messages.filter(m => m.isFromUser());
  }

  /**
   * Get bot messages only
   * @returns {Array<Message>} Bot messages
   */
  getBotMessages() {
    return this.messages.filter(m => m.isFromBot());
  }

  /**
   * Get last message
   * @returns {Message|null} Last message or null
   */
  getLastMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  /**
   * Get last user message
   * @returns {Message|null} Last user message or null
   */
  getLastUserMessage() {
    const userMessages = this.getUserMessages();
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }

  /**
   * Get last bot message
   * @returns {Message|null} Last bot message or null
   */
  getLastBotMessage() {
    const botMessages = this.getBotMessages();
    return botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;
  }

  /**
   * Get conversation context (formatted for AI)
   * @param {number} messageCount - Number of messages
   * @returns {Array<Object>} Context array
   */
  getContext(messageCount = 10) {
    const recentMessages = this.getRecentMessages(messageCount);

    return recentMessages.map(msg => ({
      role: msg.isFromBot() ? 'assistant' : 'user',
      content: msg.text,
      timestamp: msg.timestamp.toISOString()
    }));
  }

  /**
   * Get conversation summary
   * @returns {string} Summary text
   */
  getSummary() {
    const totalMessages = this.messages.length;
    const userMessages = this.getUserMessages().length;
    const botMessages = this.getBotMessages().length;
    const lastMessage = this.getLastMessage();

    return `Conversation with ${this.phoneNumber.formatted()}: ${totalMessages} messages (${userMessages} from user, ${botMessages} from bot). Last message: ${lastMessage ? lastMessage.text.substring(0, 50) : 'none'}`;
  }

  /**
   * Get message count
   * @returns {number} Total messages
   */
  getMessageCount() {
    return this.messages.length;
  }

  /**
   * Get user message count
   * @returns {number} User messages
   */
  getUserMessageCount() {
    return this.getUserMessages().length;
  }

  /**
   * Get bot message count
   * @returns {number} Bot messages
   */
  getBotMessageCount() {
    return this.getBotMessages().length;
  }

  /**
   * Check if conversation is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.messages.length === 0;
  }

  /**
   * Check if conversation has recent activity
   * @param {number} thresholdMs - Threshold in milliseconds
   * @returns {boolean} True if has recent activity
   */
  hasRecentActivity(thresholdMs = 3600000) { // Default 1 hour
    const lastMessage = this.getLastMessage();
    return lastMessage ? lastMessage.isRecent(thresholdMs) : false;
  }

  /**
   * Get time since last message
   * @returns {number|null} Milliseconds or null if no messages
   */
  getTimeSinceLastMessage() {
    const lastMessage = this.getLastMessage();
    return lastMessage ? lastMessage.getAge() : null;
  }

  /**
   * Search messages by text
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array<Message>} Matching messages
   */
  searchMessages(query, options = {}) {
    const {
      caseSensitive = false,
      fromMe = null,
      type = null
    } = options;

    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return this.messages.filter(msg => {
      // Text match
      const text = caseSensitive ? msg.text : msg.text.toLowerCase();
      if (!text.includes(searchQuery)) {
        return false;
      }

      // From filter
      if (fromMe !== null && msg.fromMe !== fromMe) {
        return false;
      }

      // Type filter
      if (type !== null && msg.type !== type) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get messages by type
   * @param {string} type - Message type
   * @returns {Array<Message>} Messages of type
   */
  getMessagesByType(type) {
    return this.messages.filter(m => m.type === type);
  }

  /**
   * Get messages by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array<Message>} Messages in range
   */
  getMessagesByDateRange(startDate, endDate) {
    return this.messages.filter(msg =>
      msg.timestamp >= startDate && msg.timestamp <= endDate
    );
  }

  /**
   * Clear all messages
   * @returns {Conversation} This conversation (for chaining)
   */
  clearMessages() {
    this.messages = [];
    this.touch();
    return this;
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to merge
   * @returns {Conversation} This conversation (for chaining)
   */
  updateMetadata(metadata) {
    if (typeof metadata !== 'object' || metadata === null) {
      throw new ValidationError('Metadata must be an object', { field: 'metadata' });
    }

    this.metadata = { ...this.metadata, ...metadata };
    this.touch();

    return this;
  }

  /**
   * Touch the entity (update timestamp)
   */
  touch() {
    this.updatedAt = new Date();
  }

  /**
   * Get conversation statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const messages = this.messages;
    const userMessages = this.getUserMessages();
    const botMessages = this.getBotMessages();

    // Calculate average message length
    const avgUserMessageLength = userMessages.length > 0
      ? userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length
      : 0;

    const avgBotMessageLength = botMessages.length > 0
      ? botMessages.reduce((sum, m) => sum + m.text.length, 0) / botMessages.length
      : 0;

    // Get message types
    const messageTypes = {};
    messages.forEach(msg => {
      messageTypes[msg.type] = (messageTypes[msg.type] || 0) + 1;
    });

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      botMessages: botMessages.length,
      avgUserMessageLength: Math.round(avgUserMessageLength),
      avgBotMessageLength: Math.round(avgBotMessageLength),
      messageTypes,
      hasRecentActivity: this.hasRecentActivity(),
      timeSinceLastMessage: this.getTimeSinceLastMessage(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Convert to plain object (for persistence)
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      phone_number: this.phoneNumber.value,
      messages: this.messages.map(m => m.toObject()),
      metadata: this.metadata,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString()
    };
  }

  /**
   * Create from database records
   * @param {string} phoneNumber - Phone number
   * @param {Array<Object>} messageRecords - Message records from DB
   * @param {Object} metadata - Conversation metadata
   * @returns {Conversation} Conversation instance
   */
  static fromDatabase(phoneNumber, messageRecords = [], metadata = {}) {
    const messages = messageRecords.map(record => Message.fromDatabase(record));

    return new Conversation({
      phoneNumber,
      messages,
      metadata,
      createdAt: messages[0]?.timestamp,
      updatedAt: messages[messages.length - 1]?.timestamp
    });
  }

  /**
   * Create new conversation
   * @param {string} phoneNumber - Phone number
   * @param {Object} props - Additional properties
   * @returns {Conversation} New conversation instance
   */
  static create(phoneNumber, props = {}) {
    return new Conversation({
      phoneNumber,
      ...props
    });
  }
}

export default Conversation;
