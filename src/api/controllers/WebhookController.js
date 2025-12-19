/**
 * @file api/controllers/WebhookController.js
 * @description Webhook Controller - Clean Architecture Integration
 * Wave 6: Cleanup & Migration
 *
 * This controller bridges Express routes and application use cases,
 * orchestrating the incoming message flow through clean architecture layers.
 *
 * Responsibilities:
 * - Handle HTTP-specific concerns
 * - Validate and normalize webhook data
 * - Orchestrate use case execution
 * - Map results to HTTP responses
 * - Handle errors appropriately
 *
 * @version 1.0.0-wave6
 * @date 2025-11-11
 */

import { ApplicationError } from '../../utils/errors/index.js';
import { IncomingMessageDTO } from '../../application/dtos/MessageDTO.js';

/**
 * Webhook Controller Error
 */
class WebhookControllerError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 500,
      code: 'WEBHOOK_CONTROLLER_ERROR',
      isOperational: true,
      context
    });
  }
}

/**
 * Webhook Controller
 * Handles incoming webhook messages from Evolution API (WhatsApp)
 */
export class WebhookController {
  /**
   * @param {Object} dependencies - Injected dependencies
   */
  constructor(dependencies) {
    this.processIncomingMessageUseCase = dependencies.processIncomingMessageUseCase;
    this.sendMessageUseCase = dependencies.sendMessageUseCase;
    this.whatsappAdapter = dependencies.whatsappAdapter;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;

    // Bind methods to preserve context
    this.handleIncomingMessage = this.handleIncomingMessage.bind(this);
  }

  /**
   * Handle incoming webhook message
   * @param {Object} messageData - Validated message data from WebhookHandler
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handleIncomingMessage(messageData, options = {}) {
    const { from, text, messageType, metadata, messageId } = messageData;

    try {
      this.logger.info('Processing incoming message via use case', {
        from,
        messageType,
        messageId
      });

      // Create DTO for validation
      const incomingMessageDTO = new IncomingMessageDTO({
        phoneNumber: from,
        text: text || '[Mensagem sem texto]',
        type: messageType,
        messageId,
        timestamp: Date.now()
      });

      // Validate DTO
      if (!incomingMessageDTO.isValid()) {
        const errors = incomingMessageDTO.validate();
        this.logger.warn('Invalid message DTO', { errors, from });
        throw new WebhookControllerError('Invalid message data', { errors });
      }

      // Execute ProcessIncomingMessageUseCase
      const result = await this.processIncomingMessageUseCase.execute({
        phoneNumber: incomingMessageDTO.phoneNumber,
        text: incomingMessageDTO.text,
        type: incomingMessageDTO.type,
        messageId: incomingMessageDTO.messageId,
        timestamp: incomingMessageDTO.timestamp,
        metadata: {
          ...metadata,
          fromWhatsApp: true,
          waitTime: options.waitTime,
          attempts: options.attempts
        }
      });

      this.logger.info('Message processed successfully', {
        from,
        hasAiResponse: !!result.aiResponse
      });

      // Check if should send response
      if (!result.aiResponse || result.aiResponse.shouldSend === false) {
        this.logger.info('Response suppressed per AI decision', { from });
        return {
          success: true,
          responseSent: false,
          reason: 'ai_suppressed_response'
        };
      }

      // Send AI response using SendMessageUseCase
      const aiResponseText = result.aiResponse.text;

      if (!aiResponseText || aiResponseText.trim().length === 0) {
        this.logger.warn('Empty AI response, skipping send', { from });
        return {
          success: true,
          responseSent: false,
          reason: 'empty_ai_response'
        };
      }

      // Handle pre-handoff message if exists (agent transition)
      if (result.aiResponse.preHandoffMessage) {
        this.logger.info('Sending pre-handoff message first', { from });

        await this.sendMessageUseCase.execute({
          phoneNumber: from,
          text: result.aiResponse.preHandoffMessage,
          type: 'text'
        });

        // Wait 1.5s for user to read
        await this._delay(1500);
      }

      // Send main response
      await this.sendMessageUseCase.execute({
        phoneNumber: from,
        text: aiResponseText,
        type: 'text'
      });

      this.logger.info('Main response sent successfully', { from });

      // Handle follow-up message if exists (BANT stage transition)
      if (result.aiResponse.followUpMessage) {
        this.logger.info('Sending follow-up message', { from });

        // Wait 1.5s for user to read main message
        await this._delay(1500);

        await this.sendMessageUseCase.execute({
          phoneNumber: from,
          text: result.aiResponse.followUpMessage,
          type: 'text'
        });

        this.logger.info('Follow-up message sent successfully', { from });
      }

      // Handle Digital Boost audio if requested
      if (result.aiResponse.sendDigitalBoostAudio === true) {
        this.logger.info('Sending Digital Boost audio', { from });

        // Wait 1s before sending audio
        await this._delay(1000);

        try {
          await this._sendDigitalBoostAudio(from);
          this.logger.info('Digital Boost audio sent successfully', { from });
        } catch (audioError) {
          this.logger.error('Failed to send Digital Boost audio', {
            error: audioError.message,
            from
          });

          // Send fallback text message
          await this.sendMessageUseCase.execute({
            phoneNumber: from,
            text: 'Tive um problema ao gerar o áudio. Posso te explicar por mensagem de texto?',
            type: 'text'
          });
        }
      }

      return {
        success: true,
        responseSent: true,
        lead: result.lead,
        aiResponse: result.aiResponse
      };

    } catch (error) {
      this.logger.error('Error in webhook controller', {
        error: error.message,
        stack: error.stack,
        from,
        messageId
      });

      // Try to send error response to user
      try {
        await this.sendMessageUseCase.execute({
          phoneNumber: from,
          text: 'Desculpe, houve um problema no processamento. Pode repetir?',
          type: 'text'
        });
      } catch (sendError) {
        this.logger.error('Failed to send error message', {
          error: sendError.message,
          from
        });
      }

      return {
        success: false,
        error: error.message,
        from
      };
    }
  }

  /**
   * Send Digital Boost audio explanation
   * @private
   * @param {string} phoneNumber - Contact phone number
   */
  async _sendDigitalBoostAudio(phoneNumber) {
    // Get audio content
    const { DIGITAL_BOOST_AUDIO_SCRIPT, DIGITAL_BOOST_AUDIO_URL } = await import('../../tools/digital_boost_explainer.js');

    if (DIGITAL_BOOST_AUDIO_URL) {
      // Send audio message via adapter (bypassing use case since it's not recorded in conversation)
      await this.whatsappAdapter.sendAudioMessage(phoneNumber, DIGITAL_BOOST_AUDIO_URL);
    } else {
      this.logger.warn('Digital Boost audio URL not configured', { phoneNumber });
      throw new WebhookControllerError('Digital Boost audio not available');
    }
  }

  /**
   * Delay helper
   * @private
   * @param {number} ms - Milliseconds to delay
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle opt-out request
   * @param {string} phoneNumber - Contact phone number
   * @param {string} message - User message
   * @returns {Promise<Object>} Opt-out result
   */
  async handleOptOut(phoneNumber, message) {
    try {
      const { classifyOptOutIntent } = await import('../../tools/intelligent_opt_out.js');
      const optOutCheck = classifyOptOutIntent(message, phoneNumber);

      if (optOutCheck.type !== 'definitive_opt_out') {
        return {
          isOptOut: false,
          type: optOutCheck.type
        };
      }

      this.logger.info('Opt-out request detected', {
        phoneNumber,
        reason: optOutCheck.reason
      });

      // Send confirmation message
      await this.sendMessageUseCase.execute({
        phoneNumber,
        text: optOutCheck.message,
        type: 'text'
      });

      // Publish opt-out event
      this.eventBus.publish({
        name: 'LeadOptedOut',
        data: {
          phoneNumber,
          reason: optOutCheck.reason,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        version: '1.0'
      });

      // Mark in database (TODO: Move to domain service)
      const { db } = await import('../../memory.js');
      db.prepare(`INSERT OR REPLACE INTO memory (key, value) VALUES (?, ?)`).run(
        `opt_out_${phoneNumber}`,
        JSON.stringify({
          opted_out: true,
          date: new Date().toISOString(),
          reason: optOutCheck.reason
        })
      );

      this.logger.info('Opt-out processed successfully', { phoneNumber });

      return {
        isOptOut: true,
        type: 'definitive_opt_out',
        reason: optOutCheck.reason
      };

    } catch (error) {
      this.logger.error('Error handling opt-out', {
        error: error.message,
        phoneNumber
      });

      return {
        isOptOut: false,
        error: error.message
      };
    }
  }

  /**
   * Check if contact has opted out
   * @param {string} phoneNumber - Contact phone number
   * @returns {Promise<boolean>} True if opted out
   */
  async isOptedOut(phoneNumber) {
    try {
      // TODO: Move to domain service
      const { db } = await import('../../memory.js');
      const result = db.prepare('SELECT value FROM memory WHERE key = ?').get(`opt_out_${phoneNumber}`);

      if (!result) {
        return false;
      }

      const data = JSON.parse(result.value);
      return data.opted_out === true;

    } catch (error) {
      this.logger.error('Error checking opt-out status', {
        error: error.message,
        phoneNumber
      });
      return false;
    }
  }
}

/**
 * Factory function to create WebhookController with DI
 * @param {Container} container - DI container
 * @returns {Promise<WebhookController>} Webhook controller instance
 */
export async function createWebhookController(container) {
  const processIncomingMessageUseCase = await container.resolve('processIncomingMessageUseCase');
  const sendMessageUseCase = await container.resolve('sendMessageUseCase');
  const whatsappAdapter = await container.resolve('whatsappAdapter');
  const eventBus = await container.resolve('eventBus');

  const { createLogger } = await import('../../utils/logger.enhanced.js');
  const logger = createLogger({ module: 'WebhookController' });

  return new WebhookController({
    processIncomingMessageUseCase,
    sendMessageUseCase,
    whatsappAdapter,
    eventBus,
    logger
  });
}

export default WebhookController;
