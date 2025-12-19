/**
 * @file infrastructure/adapters/WhatsAppAdapter.js
 * @description WhatsApp service adapter (Evolution API)
 * Wave 4: Infrastructure Layer - External Service Adapters
 */

import axios from 'axios';
import { ExternalServiceError } from '../../utils/errors/index.js';
import {
  sendWhatsAppMessage,
  sendWhatsAppAudio,
  sendWhatsAppMedia
} from '../../tools/whatsapp.js';

/**
 * WhatsApp Adapter
 * Wraps Evolution API with domain-friendly interface
 */
export class WhatsAppAdapter {
  /**
   * @param {Object} config - Configuration
   * @param {Object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;

    // Create axios instance for Evolution API
    this.client = axios.create({
      baseURL: config.evolution.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolution.apiKey
      },
      timeout: config.evolution.timeout || 30000
    });
  }

  /**
   * Send text message
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} text - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendTextMessage(phoneNumber, text) {
    const startTime = Date.now();

    try {
      this.logger.debug('Sending text message', {
        phoneNumber,
        textLength: text.length
      });

      const response = await sendWhatsAppMessage(phoneNumber, text);
      if (response?.blocked) {
        return {
          success: false,
          blocked: true,
          reason: response.reason
        };
      }

      const duration = Date.now() - startTime;

      this.logger.info('Text message sent', {
        duration,
        phoneNumber,
        messageId: response?.key?.id
      });

      return {
        success: true,
        messageId: response?.key?.id,
        timestamp: response?.messageTimestamp
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Text message send failed', {
        duration,
        phoneNumber,
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to send text message: ${error.message}`,
        error
      );
    }
  }

  /**
   * Send audio message
   * @param {string} phoneNumber - Recipient phone number
   * @param {Buffer|string} audio - Audio buffer or URL
   * @returns {Promise<Object>} Send result
   */
  async sendAudioMessage(phoneNumber, audio) {
    const startTime = Date.now();

    try {
      this.logger.debug('Sending audio message', {
        phoneNumber,
        audioType: typeof audio === 'string' ? 'url' : 'buffer'
      });

      const response = await sendWhatsAppMedia(phoneNumber, audio, { type: 'audio' });

      const duration = Date.now() - startTime;

      this.logger.info('Audio message sent', {
        duration,
        phoneNumber,
        messageId: response?.key?.id
      });

      return {
        success: true,
        messageId: response?.key?.id,
        timestamp: response?.messageTimestamp
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Audio message send failed', {
        duration,
        phoneNumber,
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to send audio message: ${error.message}`,
        error
      );
    }
  }

  /**
   * Send media message (image, video, document)
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} mediaUrl - Media URL
   * @param {Object} options - Media options
   * @returns {Promise<Object>} Send result
   */
  async sendMediaMessage(phoneNumber, mediaUrl, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Sending media message', {
        phoneNumber,
        mediaUrl,
        type: options.type || 'image'
      });

      const response = await sendWhatsAppMedia(phoneNumber, mediaUrl, options);

      const duration = Date.now() - startTime;

      this.logger.info('Media message sent', {
        duration,
        phoneNumber,
        messageId: response?.key?.id,
        type: options.type
      });

      return {
        success: true,
        messageId: response?.key?.id,
        timestamp: response?.messageTimestamp
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Media message send failed', {
        duration,
        phoneNumber,
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to send media message: ${error.message}`,
        error
      );
    }
  }

  /**
   * Send typing indicator
   * @param {string} phoneNumber - Recipient phone number
   * @param {boolean} isTyping - Typing state
   * @returns {Promise<Object>} Send result
   */
  async sendTypingIndicator(phoneNumber, isTyping = true) {
    try {
      this.logger.debug('Sending typing indicator', {
        phoneNumber,
        isTyping
      });

      const response = await this.client.post(
        `/chat/sendPresence/${this.config.evolution.instanceName}`,
        {
          number: phoneNumber,
          presence: isTyping ? 'composing' : 'available'
        }
      );

      return {
        success: true
      };
    } catch (error) {
      this.logger.error('Typing indicator send failed', {
        phoneNumber,
        error: error.message
      });

      // Don't throw - typing indicator is non-critical
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Mark result
   */
  async markAsRead(messageId) {
    try {
      this.logger.debug('Marking message as read', { messageId });

      const response = await this.client.post(
        `/chat/markMessageRead/${this.config.evolution.instanceName}`,
        {
          messageId: messageId
        }
      );

      return {
        success: true
      };
    } catch (error) {
      this.logger.error('Mark as read failed', {
        messageId,
        error: error.message
      });

      // Don't throw - mark as read is non-critical
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contact information
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<Object>} Contact info
   */
  async getContactInfo(phoneNumber) {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting contact info', { phoneNumber });

      const response = await this.client.get(
        `/chat/findContact/${this.config.evolution.instanceName}`,
        {
          params: { number: phoneNumber }
        }
      );

      const duration = Date.now() - startTime;

      this.logger.info('Contact info retrieved', {
        duration,
        phoneNumber,
        found: !!response.data
      });

      return {
        exists: true,
        name: response.data?.pushName || response.data?.name,
        profilePicture: response.data?.profilePicUrl,
        ...response.data
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Get contact info failed', {
        duration,
        phoneNumber,
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to get contact info: ${error.message}`,
        error
      );
    }
  }

  /**
   * Check if number is on WhatsApp
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<boolean>} True if on WhatsApp
   */
  async isOnWhatsApp(phoneNumber) {
    try {
      this.logger.debug('Checking WhatsApp number', { phoneNumber });

      const response = await this.client.get(
        `/chat/whatsappNumbers/${this.config.evolution.instanceName}`,
        {
          params: { numbers: [phoneNumber] }
        }
      );

      const exists = response.data?.[0]?.exists || false;

      this.logger.debug('WhatsApp number check complete', {
        phoneNumber,
        exists
      });

      return exists;
    } catch (error) {
      this.logger.error('WhatsApp number check failed', {
        phoneNumber,
        error: error.message
      });

      // Return false on error (assume not on WhatsApp)
      return false;
    }
  }

  /**
   * Get instance status
   * @returns {Promise<Object>} Instance status
   */
  async getInstanceStatus() {
    try {
      this.logger.debug('Getting instance status');

      const response = await this.client.get(
        `/instance/connectionState/${this.config.evolution.instanceName}`
      );

      this.logger.debug('Instance status retrieved', {
        state: response.data?.state
      });

      return {
        connected: response.data?.state === 'open',
        state: response.data?.state,
        ...response.data
      };
    } catch (error) {
      this.logger.error('Get instance status failed', {
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to get instance status: ${error.message}`,
        error
      );
    }
  }

  /**
   * Download media from message
   * @param {string} messageId - Message ID
   * @returns {Promise<Buffer>} Media buffer
   */
  async downloadMedia(messageId) {
    const startTime = Date.now();

    try {
      this.logger.debug('Downloading media', { messageId });

      const response = await this.client.get(
        `/chat/getBase64FromMediaMessage/${this.config.evolution.instanceName}`,
        {
          params: { messageId }
        }
      );

      const duration = Date.now() - startTime;
      const base64 = response.data?.base64;
      const buffer = Buffer.from(base64, 'base64');

      this.logger.info('Media downloaded', {
        duration,
        messageId,
        size: buffer.length
      });

      return buffer;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Media download failed', {
        duration,
        messageId,
        error: error.message
      });

      throw new ExternalServiceError(
        'WhatsApp',
        `Failed to download media: ${error.message}`,
        error
      );
    }
  }

  /**
   * Send reaction to message
   * @param {string} messageId - Message ID to react to
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Reaction result
   */
  async sendReaction(messageId, emoji) {
    try {
      this.logger.debug('Sending reaction', { messageId, emoji });

      const response = await this.client.post(
        `/message/sendReaction/${this.config.evolution.instanceName}`,
        {
          messageId,
          reaction: emoji
        }
      );

      return {
        success: true
      };
    } catch (error) {
      this.logger.error('Send reaction failed', {
        messageId,
        error: error.message
      });

      // Don't throw - reactions are non-critical
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck() {
    try {
      const status = await this.getInstanceStatus();
      return status.connected;
    } catch (error) {
      return false;
    }
  }
}

export default WhatsAppAdapter;
