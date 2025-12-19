/**
 * @file EvolutionProvider.js
 * @description Evolution API provider for WhatsApp instance management
 *
 * Provides methods to:
 * - Create and configure instances
 * - Connect (generate QR code)
 * - Get connection state
 * - Configure webhooks automatically
 */

import axios from 'axios';
import crypto from 'crypto';

export class EvolutionProvider {
  /**
   * @param {Object} config - Configuration
   * @param {string} config.baseUrl - Evolution API base URL
   * @param {string} config.apiKey - Evolution API key
   * @param {string} config.publicBaseUrl - Public URL for webhooks
   * @param {Object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger || console;

    this.client = axios.create({
      baseURL: config.baseUrl || process.env.EVOLUTION_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey || process.env.EVOLUTION_API_KEY
      },
      timeout: 30000
    });

    this.publicBaseUrl = config.publicBaseUrl || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Generate unique instance name
   * @param {string} tenantId - Tenant ID
   * @param {string} agentId - Agent ID
   * @returns {string} Instance name
   */
  generateInstanceName(tenantId, agentId) {
    const hash = crypto.createHash('md5')
      .update(`${tenantId}_${agentId}`)
      .digest('hex')
      .substring(0, 8);
    return `evo_${hash}`;
  }

  /**
   * Generate webhook secret
   * @returns {string} Random secret
   */
  generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new Evolution API instance
   * @param {Object} options - Instance options
   * @param {string} options.instanceName - Unique instance name
   * @param {string} options.webhookPublicId - Public webhook ID for URL
   * @param {string} options.webhookSecret - Secret for webhook validation
   * @param {boolean} options.qrcode - Whether to return QR code immediately
   * @returns {Promise<Object>} Create result
   */
  async createInstance({ instanceName, webhookPublicId, webhookSecret, qrcode = true }) {
    try {
      this.logger.info('Creating Evolution instance', { instanceName });

      // Build webhook URL
      const webhookUrl = `${this.publicBaseUrl}/api/webhooks/inbound/${webhookPublicId}`;

      const payload = {
        instanceName,
        qrcode,
        integration: 'WHATSAPP-BAILEYS',
        // Webhook configuration
        webhook: {
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'MESSAGES_DELETE',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
            'CONTACTS_UPSERT',
            'PRESENCE_UPDATE'
          ]
        },
        // Additional settings
        settings: {
          reject_call: true,
          msg_call: 'Desculpe, no momento nao atendemos ligacoes. Por favor, envie uma mensagem.',
          groups_ignore: true,
          always_online: true,
          read_messages: true,
          read_status: true
        }
      };

      // Add webhook headers if secret provided
      if (webhookSecret) {
        payload.webhook.headers = {
          'X-Webhook-Secret': webhookSecret,
          'Content-Type': 'application/json'
        };
      }

      const response = await this.client.post('/instance/create', payload);

      this.logger.info('Evolution instance created', {
        instanceName,
        status: response.data?.instance?.status,
        hasQr: !!response.data?.qrcode
      });

      return {
        success: true,
        instanceName,
        instanceId: response.data?.instance?.instanceId,
        status: response.data?.instance?.status,
        qrcode: response.data?.qrcode,
        webhookUrl
      };

    } catch (error) {
      this.logger.error('Failed to create Evolution instance', {
        instanceName,
        error: error.response?.data || error.message
      });

      // Check if instance already exists
      if (error.response?.status === 403 || error.response?.data?.message?.includes('already')) {
        return {
          success: false,
          error: 'Instance already exists',
          code: 'INSTANCE_EXISTS',
          instanceName
        };
      }

      throw error;
    }
  }

  /**
   * Connect an existing instance (get QR code)
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Connection result with QR code
   */
  async connectInstance(instanceName) {
    try {
      this.logger.info('Connecting Evolution instance', { instanceName });

      const response = await this.client.get(`/instance/connect/${instanceName}`);

      this.logger.info('Evolution connect response', {
        instanceName,
        hasBase64: !!response.data?.base64,
        hasCode: !!response.data?.code
      });

      return {
        success: true,
        instanceName,
        qrcode: {
          base64: response.data?.base64,
          code: response.data?.code,
          pairingCode: response.data?.pairingCode
        }
      };

    } catch (error) {
      this.logger.error('Failed to connect Evolution instance', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Get connection state of an instance
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Connection state
   */
  async getConnectionState(instanceName) {
    try {
      const response = await this.client.get(`/instance/connectionState/${instanceName}`);

      const state = response.data?.state || response.data?.instance?.state;

      return {
        success: true,
        instanceName,
        state,
        connected: state === 'open',
        status: this.mapState(state)
      };

    } catch (error) {
      this.logger.error('Failed to get connection state', {
        instanceName,
        error: error.response?.data || error.message
      });

      // Instance might not exist
      if (error.response?.status === 404) {
        return {
          success: false,
          instanceName,
          state: 'not_found',
          connected: false,
          status: 'disconnected'
        };
      }

      throw error;
    }
  }

  /**
   * Map Evolution state to friendly status
   * @param {string} state - Evolution state
   * @returns {string} Friendly status
   */
  mapState(state) {
    const stateMap = {
      'open': 'connected',
      'close': 'disconnected',
      'connecting': 'connecting',
      'PAIRING': 'waiting_scan',
      'TIMEOUT': 'timeout',
      'CONFLICT': 'conflict',
      'UNPAIRED': 'disconnected',
      'UNLAUNCHED': 'not_initialized'
    };
    return stateMap[state] || 'unknown';
  }

  /**
   * Get instance info including phone number
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Instance info
   */
  async getInstanceInfo(instanceName) {
    try {
      const response = await this.client.get(`/instance/fetchInstances`, {
        params: { instanceName }
      });

      const instance = Array.isArray(response.data)
        ? response.data.find(i => i.name === instanceName || i.instanceName === instanceName)
        : response.data;

      if (!instance) {
        return {
          success: false,
          error: 'Instance not found'
        };
      }

      return {
        success: true,
        instanceName,
        phoneNumber: instance.ownerJid?.replace('@s.whatsapp.net', ''),
        profileName: instance.profileName,
        profilePicUrl: instance.profilePictureUrl,
        status: instance.connectionStatus
      };

    } catch (error) {
      this.logger.error('Failed to get instance info', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Logout from WhatsApp (disconnect but keep instance)
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Logout result
   */
  async logoutInstance(instanceName) {
    try {
      this.logger.info('Logging out Evolution instance', { instanceName });

      const response = await this.client.delete(`/instance/logout/${instanceName}`);

      return {
        success: true,
        instanceName,
        message: 'Logged out successfully'
      };

    } catch (error) {
      this.logger.error('Failed to logout Evolution instance', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Delete instance completely
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Delete result
   */
  async deleteInstance(instanceName) {
    try {
      this.logger.info('Deleting Evolution instance', { instanceName });

      const response = await this.client.delete(`/instance/delete/${instanceName}`);

      return {
        success: true,
        instanceName,
        message: 'Instance deleted successfully'
      };

    } catch (error) {
      this.logger.error('Failed to delete Evolution instance', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Update webhook configuration
   * @param {string} instanceName - Instance name
   * @param {Object} webhookConfig - Webhook configuration
   * @returns {Promise<Object>} Update result
   */
  async updateWebhook(instanceName, { url, events, headers }) {
    try {
      this.logger.info('Updating webhook for instance', { instanceName, url });

      const payload = {
        webhook: {
          url,
          webhook_by_events: false,
          webhook_base64: false,
          events: events || [
            'QRCODE_UPDATED',
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE'
          ]
        }
      };

      if (headers) {
        payload.webhook.headers = headers;
      }

      const response = await this.client.put(`/webhook/set/${instanceName}`, payload);

      return {
        success: true,
        instanceName,
        webhookUrl: url
      };

    } catch (error) {
      this.logger.error('Failed to update webhook', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Send text message
   * @param {string} instanceName - Instance name
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} text - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendTextMessage(instanceName, phoneNumber, text) {
    try {
      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: phoneNumber,
        text
      });

      return {
        success: true,
        messageId: response.data?.key?.id,
        timestamp: response.data?.messageTimestamp
      };

    } catch (error) {
      this.logger.error('Failed to send text message', {
        instanceName,
        phoneNumber,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Restart instance
   * @param {string} instanceName - Instance name
   * @returns {Promise<Object>} Restart result
   */
  async restartInstance(instanceName) {
    try {
      this.logger.info('Restarting Evolution instance', { instanceName });

      const response = await this.client.put(`/instance/restart/${instanceName}`);

      return {
        success: true,
        instanceName,
        message: 'Instance restarted successfully'
      };

    } catch (error) {
      this.logger.error('Failed to restart Evolution instance', {
        instanceName,
        error: error.response?.data || error.message
      });

      throw error;
    }
  }

  /**
   * Health check
   * @returns {Promise<boolean>} True if Evolution API is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/instance/fetchInstances');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let evolutionProviderInstance = null;

export function getEvolutionProvider(config, logger) {
  if (!evolutionProviderInstance) {
    evolutionProviderInstance = new EvolutionProvider(config || {}, logger);
  }
  return evolutionProviderInstance;
}

export default EvolutionProvider;
