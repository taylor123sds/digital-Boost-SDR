/**
 * @file application/use-cases/message/SendMessageUseCase.js
 * @description Send Message Use Case
 * Wave 5: Application Layer - Use Cases
 */

import { ValidationError } from '../../../utils/errors/index.js';
import { MessageSentEvent } from '../../../infrastructure/events/index.js';

/**
 * Send Message Use Case
 * Orchestrates message sending with validation and events
 */
export class SendMessageUseCase {
  /**
   * @param {Object} conversationService - Conversation domain service
   * @param {Object} whatsappAdapter - WhatsApp adapter
   * @param {Object} eventBus - Event bus
   * @param {Object} logger - Logger instance
   */
  constructor(conversationService, whatsappAdapter, eventBus, logger) {
    this.conversationService = conversationService;
    this.whatsappAdapter = whatsappAdapter;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Execute use case
   * @param {Object} input - Input data
   * @param {string} input.phoneNumber - Recipient phone number
   * @param {string} input.text - Message text
   * @param {string} input.type - Message type (optional)
   * @returns {Promise<Object>} Send result
   */
  async execute(input) {
    this.logger.info('SendMessageUseCase: Executing', {
      phoneNumber: input.phoneNumber,
      tenantId: input.tenantId,
      textLength: input.text?.length
    });

    // Validate input
    this.validate(input);

    try {
      // Send message via WhatsApp
      const sendResult = await this.whatsappAdapter.sendTextMessage(
        input.phoneNumber,
        input.text
      );

      // Record message in conversation
      const message = await this.conversationService.addBotMessage(
        input.phoneNumber,
        input.text,
        {
          type: input.type || 'text',
          messageId: sendResult.messageId,
          tenantId: input.tenantId
        }
      );

      // Publish domain event
      await this.eventBus.publish(new MessageSentEvent(input.phoneNumber, message));

      this.logger.info('SendMessageUseCase: Message sent', {
        phoneNumber: input.phoneNumber,
        messageId: sendResult.messageId
      });

      return this.formatOutput(message, sendResult);
    } catch (error) {
      this.logger.error('SendMessageUseCase: Failed', {
        phoneNumber: input.phoneNumber,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate input
   * @private
   * @param {Object} input - Input data
   */
  validate(input) {
    if (!input.phoneNumber) {
      throw new ValidationError('Phone number is required', {
        field: 'phoneNumber'
      });
    }

    if (!input.text || typeof input.text !== 'string') {
      throw new ValidationError('Message text is required', {
        field: 'text'
      });
    }

    if (input.text.trim().length === 0) {
      throw new ValidationError('Message text cannot be empty', {
        field: 'text'
      });
    }

    if (input.text.length > 4096) {
      throw new ValidationError('Message text too long (max 4096 characters)', {
        field: 'text',
        maxLength: 4096
      });
    }

    if (!input.tenantId) {
      throw new ValidationError('Tenant ID is required', {
        field: 'tenantId'
      });
    }
  }

  /**
   * Format output
   * @private
   * @param {Object} message - Message entity
   * @param {Object} sendResult - Send result from WhatsApp
   * @returns {Object} Formatted output
   */
  formatOutput(message, sendResult) {
    return {
      success: true,
      message: {
        text: message.text,
        fromMe: message.fromMe,
        type: message.type,
        timestamp: message.timestamp.toISOString()
      },
      whatsapp: {
        messageId: sendResult.messageId,
        timestamp: sendResult.timestamp
      }
    };
  }
}

export default SendMessageUseCase;
