/**
 * @file application/dtos/MessageDTO.js
 * @description Message Data Transfer Objects
 * Wave 5: Application Layer - DTOs
 */

/**
 * Send Message DTO
 */
export class SendMessageDTO {
  /**
   * @param {Object} data - Raw data
   */
  constructor(data) {
    this.phoneNumber = data.phoneNumber || data.phone_number;
    this.text = data.text || data.message_text;
    this.type = data.type || data.message_type || 'text';
  }

  /**
   * Validate DTO
   * @returns {Array<string>} Validation errors
   */
  validate() {
    const errors = [];

    if (!this.phoneNumber) {
      errors.push('Phone number is required');
    }

    if (!this.text) {
      errors.push('Message text is required');
    }

    if (this.text && this.text.trim().length === 0) {
      errors.push('Message text cannot be empty');
    }

    if (this.text && this.text.length > 4096) {
      errors.push('Message text too long (max 4096 characters)');
    }

    return errors;
  }

  /**
   * Check if valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.validate().length === 0;
  }
}

/**
 * Incoming Message DTO
 */
export class IncomingMessageDTO {
  /**
   * @param {Object} data - Raw data
   */
  constructor(data) {
    this.phoneNumber = data.phoneNumber || data.phone_number || data.from;
    this.text = data.text || data.message_text || data.body;
    this.type = data.type || data.message_type || 'text';
    this.messageId = data.messageId || data.message_id || data.id;
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  /**
   * Validate DTO
   * @returns {Array<string>} Validation errors
   */
  validate() {
    const errors = [];

    if (!this.phoneNumber) {
      errors.push('Phone number is required');
    }

    if (!this.text) {
      errors.push('Message text is required');
    }

    if (this.text && this.text.trim().length === 0) {
      errors.push('Message text cannot be empty');
    }

    return errors;
  }

  /**
   * Check if valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.validate().length === 0;
  }
}

/**
 * Message Response DTO
 */
export class MessageResponseDTO {
  /**
   * @param {Object} message - Message entity or data
   */
  constructor(message) {
    this.text = message.text || message.message_text;
    this.fromMe = message.fromMe !== undefined ? message.fromMe : message.from_me;
    this.type = message.type || message.message_type || 'text';
    this.timestamp = message.timestamp;
    this.metadata = message.metadata || {};
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      text: this.text,
      from_me: this.fromMe,
      type: this.type,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }
}

export default {
  SendMessageDTO,
  IncomingMessageDTO,
  MessageResponseDTO
};
