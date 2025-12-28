/**
 * @file IntegrationService.js
 * @description Service for managing integrations (Evolution, CRM, etc.)
 *
 * Handles:
 * - Creating/updating integrations
 * - Binding agents to integrations
 * - One-click Evolution connect
 */

import { getDatabase } from '../db/connection.js';
import { getEvolutionProvider } from '../providers/EvolutionProvider.js';
import { getEntitlementService } from './EntitlementService.js';
import crypto from 'crypto';

export class IntegrationService {
  constructor(logger) {
    this.logger = logger || console;
  }

  getDb() {
    return getDatabase();
  }

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'int') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate webhook public ID (URL-safe)
   * @returns {string} UUID-like public ID
   */
  generateWebhookPublicId() {
    return crypto.randomUUID();
  }

  /**
   * Generate webhook secret
   * @returns {string} Random secret
   */
  generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get integration by ID
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   * @returns {Object|null} Integration or null
   */
  getById(tenantId, integrationId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM integrations
      WHERE tenant_id = ? AND id = ?
    `).get(tenantId, integrationId);
  }

  /**
   * Get integration by instance name
   * @param {string} tenantId - Tenant ID
   * @param {string} instanceName - Evolution instance name
   * @returns {Object|null} Integration or null
   */
  getByInstanceName(tenantId, instanceName) {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM integrations
      WHERE tenant_id = ? AND instance_name = ?
    `).get(tenantId, instanceName);
  }

  /**
   * Get integration by webhook public ID (for inbound webhooks)
   * @param {string} webhookPublicId - Public webhook ID
   * @returns {Object|null} Integration or null
   */
  getByWebhookPublicId(webhookPublicId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT i.*, a.id as bound_agent_id, a.name as bound_agent_name
      FROM integrations i /* tenant-guard: ignore (lookup by webhook_public_id) */
      LEFT JOIN integration_bindings ib ON i.id = ib.integration_id AND ib.is_primary = 1
      LEFT JOIN agents a ON ib.agent_id = a.id
      WHERE json_extract(i.config_json, '$.webhook_public_id') = ?
    `).get(webhookPublicId);
  }

  /**
   * Get all integrations for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} filters - Optional filters
   * @returns {Array} Integrations
   */
  getAll(tenantId, { provider, status, isActive } = {}) {
    const db = this.getDb();

    let query = `SELECT * FROM integrations WHERE tenant_id = ?`;
    const params = [tenantId];

    if (provider) {
      query += ` AND provider = ?`;
      params.push(provider);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC`;

    return db.prepare(query).all(...params);
  }

  /**
   * Create a new integration
   * @param {string} tenantId - Tenant ID
   * @param {Object} data - Integration data
   * @returns {Object} Created integration
   */
  create(tenantId, data) {
    const db = this.getDb();

    const id = this.generateId('int');
    const webhookPublicId = this.generateWebhookPublicId();
    const webhookSecret = this.generateWebhookSecret();

    const webhookAuthType = data.config?.webhook_auth_type || 'header_secret';
    const webhookQueryToken = data.config?.webhook_query_token || null;
    const webhookHmacSecret = data.config?.webhook_hmac_secret || null;
    const configJson = JSON.stringify({
      ...(data.config || {}),
      webhook_public_id: webhookPublicId,
      webhook_secret: webhookSecret,
      webhook_auth_type: webhookAuthType,
      webhook_query_token: webhookQueryToken,
      webhook_hmac_secret: webhookHmacSecret
    });

    db.prepare(`
      INSERT INTO integrations (
        id, tenant_id, provider, instance_name, phone_number, profile_name,
        status, config_json, secrets_json, webhook_url, api_key, is_active,
        webhook_auth_type, webhook_query_token, webhook_hmac_secret
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      data.provider || 'evolution',
      data.instanceName || null,
      data.phoneNumber || null,
      data.profileName || null,
      data.status || 'disconnected',
      configJson,
      JSON.stringify(data.secrets || {}),
      data.webhookUrl || null,
      data.apiKey || null,
      1,
      webhookAuthType,
      webhookQueryToken,
      webhookHmacSecret
    );

    return {
      id,
      tenantId,
      webhookPublicId,
      webhookSecret,
      ...data
    };
  }

  /**
   * Update integration
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   * @param {Object} data - Data to update
   * @returns {Object} Updated integration
   */
  update(tenantId, integrationId, data) {
    const db = this.getDb();

    const sets = [];
    const params = [];

    if (data.status !== undefined) {
      sets.push('status = ?');
      params.push(data.status);
    }

    if (data.phoneNumber !== undefined) {
      sets.push('phone_number = ?');
      params.push(data.phoneNumber);
    }

    if (data.profileName !== undefined) {
      sets.push('profile_name = ?');
      params.push(data.profileName);
    }

    if (data.webhookUrl !== undefined) {
      sets.push('webhook_url = ?');
      params.push(data.webhookUrl);
    }

    if (data.errorMessage !== undefined) {
      sets.push('error_message = ?');
      params.push(data.errorMessage);
    }

    if (data.lastConnectedAt !== undefined) {
      sets.push('last_connected_at = ?');
      params.push(data.lastConnectedAt);
    }

    if (data.config !== undefined) {
      // Merge with existing config
      const existing = this.getById(tenantId, integrationId);
      const existingConfig = JSON.parse(existing?.config_json || '{}');
      sets.push('config_json = ?');
      params.push(JSON.stringify({ ...existingConfig, ...data.config }));
    }

    sets.push('updated_at = datetime("now")');

    params.push(tenantId, integrationId);

    db.prepare(`
      UPDATE integrations SET ${sets.join(', ')}
      WHERE tenant_id = ? AND id = ?
    `).run(...params);

    return this.getById(tenantId, integrationId);
  }

  /**
   * Create binding between agent and integration
   * @param {string} tenantId - Tenant ID
   * @param {string} agentId - Agent ID
   * @param {string} integrationId - Integration ID
   * @param {boolean} isPrimary - Whether this is the primary binding
   * @returns {Object} Created binding
   */
  createBinding(tenantId, agentId, integrationId, isPrimary = true) {
    const db = this.getDb();

    const id = this.generateId('bind');

    // If setting as primary, unset other primary bindings for this agent
    if (isPrimary) {
      db.prepare(`
        UPDATE integration_bindings SET is_primary = 0
        WHERE tenant_id = ? AND agent_id = ?
      `).run(tenantId, agentId);
    }

    db.prepare(`
      INSERT OR REPLACE INTO integration_bindings (id, tenant_id, agent_id, integration_id, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, tenantId, agentId, integrationId, isPrimary ? 1 : 0);

    return { id, tenantId, agentId, integrationId, isPrimary };
  }

  /**
   * Get binding for agent
   * @param {string} tenantId - Tenant ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Binding with integration details
   */
  getBindingForAgent(tenantId, agentId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT ib.*, i.provider, i.instance_name, i.phone_number, i.status as integration_status
      FROM integration_bindings ib
      JOIN integrations i ON ib.integration_id = i.id
      WHERE ib.tenant_id = ? AND ib.agent_id = ? AND ib.is_primary = 1
    `).get(tenantId, agentId);
  }

  /**
   * List all integrations bound to an agent
   * @param {string} tenantId - Tenant ID
   * @param {string} agentId - Agent ID
   * @returns {Array} Bindings with integration details
   */
  listBindingsForAgent(tenantId, agentId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT ib.*, i.provider, i.instance_name, i.phone_number, i.status as integration_status,
             i.config_json, i.last_sync, i.created_at, i.updated_at
      FROM integration_bindings ib
      JOIN integrations i ON ib.integration_id = i.id
      WHERE ib.tenant_id = ? AND ib.agent_id = ?
      ORDER BY ib.is_primary DESC, i.updated_at DESC
    `).all(tenantId, agentId);
  }

  /**
   * One-click Evolution connect for an agent
   * Creates integration, binding, and Evolution instance in one call
   *
   * @param {string} tenantId - Tenant ID
   * @param {string} agentId - Agent ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Connection result with QR code
   */
  async connectEvolutionForAgent(tenantId, agentId, options = {}) {
    const db = this.getDb();
    const requestedInstanceName = typeof options.instanceName === 'string'
      ? options.instanceName.trim()
      : '';

    // Check entitlements
    const entitlementService = getEntitlementService();
    const canAdd = entitlementService.canAddIntegration(tenantId);

    // Check if agent already has a connection
    const existingBinding = this.getBindingForAgent(tenantId, agentId);
    if (existingBinding && existingBinding.integration_status === 'connected') {
      return {
        success: false,
        error: 'Agent already has an active Evolution connection',
        code: 'ALREADY_CONNECTED',
        integration: existingBinding
      };
    }

    // Verify agent exists
    const agent = db.prepare(`
      SELECT * FROM agents WHERE tenant_id = ? AND id = ?
    `).get(tenantId, agentId);

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND'
      };
    }

    // Get or create integration
    let integration;
    let isNewIntegration = false;

    if (existingBinding) {
      // Reuse existing integration
      integration = this.getById(tenantId, existingBinding.integration_id);
    } else {
      // Check integration limits
      if (!canAdd.allowed) {
        return {
          success: false,
          error: canAdd.reason,
          code: 'INTEGRATION_LIMIT',
          upgradeRequired: canAdd.upgradeRequired
        };
      }

      // Create new integration
      const instanceName = requestedInstanceName
        || `evo_${tenantId.substring(0, 8)}_${agentId.substring(0, 8)}`;

      integration = this.create(tenantId, {
        provider: 'evolution',
        instanceName,
        status: 'connecting'
      });

      isNewIntegration = true;

      // Create binding
      this.createBinding(tenantId, agentId, integration.id, true);

      this.logger.info('Created new Evolution integration', {
        tenantId,
        agentId,
        integrationId: integration.id,
        instanceName
      });
    }

    // Get config for webhook
    const configJson = JSON.parse(
      db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integration.id)?.config_json || '{}'
    );

    // Create/connect Evolution instance
    const evolutionProvider = getEvolutionProvider();

    try {
      // Try to create instance first
      let evolutionResult;

      try {
        evolutionResult = await evolutionProvider.createInstance({
          instanceName: integration.instanceName || integration.instance_name,
          webhookPublicId: configJson.webhook_public_id,
          webhookSecret: configJson.webhook_secret,
          qrcode: true
        });
      } catch (createError) {
        // If instance already exists, just connect
        if (createError.response?.status === 403 || createError.message?.includes('already')) {
          this.logger.info('Instance already exists, connecting...', {
            instanceName: integration.instanceName || integration.instance_name
          });
        } else {
          throw createError;
        }
      }

      // If no QR from create, try connect
      if (!evolutionResult?.qrcode?.base64) {
        evolutionResult = await evolutionProvider.connectInstance(
          integration.instanceName || integration.instance_name
        );
      }

      // Update integration with webhook URL
      const publicBaseUrl = process.env.PUBLIC_BASE_URL;
      if (process.env.NODE_ENV === 'production' && !publicBaseUrl) {
        throw new Error('PUBLIC_BASE_URL is required in production');
      }
      const baseUrl = publicBaseUrl || 'http://localhost:3000';
      this.update(tenantId, integration.id, {
        webhookUrl: `${baseUrl}/api/webhooks/inbound/${configJson.webhook_public_id}`,
        status: 'connecting'
      });

      return {
        success: true,
        integrationId: integration.id,
        instanceName: integration.instanceName || integration.instance_name,
        webhookPublicId: configJson.webhook_public_id,
        qrcode: evolutionResult?.qrcode,
        status: 'connecting',
        isNewIntegration,
        bindingId: existingBinding?.id
      };

    } catch (error) {
      this.logger.error('Failed to connect Evolution', {
        tenantId,
        agentId,
        error: error.message
      });

      // Update integration status
      this.update(tenantId, integration.id, {
        status: 'error',
        errorMessage: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'EVOLUTION_ERROR',
        integrationId: integration.id
      };
    }
  }

  /**
   * Get connection status for an integration
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Connection status
   */
  async getConnectionStatus(tenantId, integrationId) {
    const integration = this.getById(tenantId, integrationId);

    if (!integration) {
      return {
        success: false,
        error: 'Integration not found',
        code: 'NOT_FOUND'
      };
    }

    if (integration.provider !== 'evolution') {
      return {
        success: true,
        integrationId,
        provider: integration.provider,
        status: integration.status
      };
    }

    // Get live status from Evolution
    const evolutionProvider = getEvolutionProvider();

    try {
      const state = await evolutionProvider.getConnectionState(integration.instance_name);

      // Update local status if changed
      if (state.status !== integration.status) {
        this.update(tenantId, integrationId, {
          status: state.status,
          lastConnectedAt: state.connected ? new Date().toISOString() : undefined
        });

        // If connected, try to get phone info
        if (state.connected) {
          try {
            const info = await evolutionProvider.getInstanceInfo(integration.instance_name);
            if (info.phoneNumber) {
              this.update(tenantId, integrationId, {
                phoneNumber: info.phoneNumber,
                profileName: info.profileName
              });
            }
          } catch (e) {
            // Ignore info fetch errors
          }
        }
      }

      return {
        success: true,
        integrationId,
        instanceName: integration.instance_name,
        status: state.status,
        connected: state.connected,
        phoneNumber: integration.phone_number,
        profileName: integration.profile_name
      };

    } catch (error) {
      this.logger.error('Failed to get Evolution status', {
        integrationId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: 'EVOLUTION_ERROR',
        integrationId,
        localStatus: integration.status
      };
    }
  }

  /**
   * Disconnect Evolution integration
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Disconnect result
   */
  async disconnectEvolution(tenantId, integrationId) {
    const integration = this.getById(tenantId, integrationId);

    if (!integration) {
      return {
        success: false,
        error: 'Integration not found'
      };
    }

    if (integration.provider !== 'evolution') {
      return {
        success: false,
        error: 'Not an Evolution integration'
      };
    }

    const evolutionProvider = getEvolutionProvider();

    try {
      await evolutionProvider.logoutInstance(integration.instance_name);

      this.update(tenantId, integrationId, {
        status: 'disconnected',
        phoneNumber: null,
        profileName: null
      });

      return {
        success: true,
        message: 'Disconnected successfully'
      };

    } catch (error) {
      this.logger.error('Failed to disconnect Evolution', {
        integrationId,
        error: error.message
      });

      // Still update local status
      this.update(tenantId, integrationId, {
        status: 'disconnected'
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate webhook request
   * P3-11: Webhook secret is REQUIRED by default for security
   *
   * @param {string} webhookPublicId - Public webhook ID from URL
   * @param {string} providedSecret - Secret from request header (X-Webhook-Secret)
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with integration if valid
   */
  validateWebhook(webhookPublicId, providedSecret, options = {}) {
    const integration = this.getByWebhookPublicId(webhookPublicId);

    if (!integration) {
      return {
        valid: false,
        error: 'Integration not found',
        code: 'INTEGRATION_NOT_FOUND'
      };
    }

    const configJson = JSON.parse(integration.config_json || '{}');
    const expectedSecret = configJson.webhook_secret || integration.webhook_secret;
    const authType = configJson.webhook_auth_type || integration.webhook_auth_type || 'header_secret';

    const allowNoSecret = process.env.WEBHOOK_ALLOW_NO_SECRET === 'true';

    if (!expectedSecret) {
      if (allowNoSecret) {
        this.logger.warn('[SECURITY] Webhook accepted without secret (DEPRECATED)', {
          integrationId: integration.id,
          webhookPublicId
        });
        return {
          valid: true,
          integration,
          warning: 'No webhook secret configured - this is insecure'
        };
      }

      return {
        valid: false,
        error: 'Webhook secret not configured on integration',
        code: 'SECRET_NOT_CONFIGURED'
      };
    }

    if (authType === 'query_token') {
      const expectedToken = configJson.webhook_query_token || integration.webhook_query_token || expectedSecret;
      const queryToken = options?.queryToken || options?.query?.token || options?.query?.webhook_token;
      if (!queryToken) {
        return {
          valid: false,
          error: 'Webhook token required in query string',
          code: 'TOKEN_MISSING'
        };
      }

      const tokenMatch = this.timingSafeEqual(queryToken, expectedToken);
      if (!tokenMatch) {
        this.logger.warn('[SECURITY] Invalid webhook query token attempt', {
          integrationId: integration.id,
          webhookPublicId
        });
        return {
          valid: false,
          error: 'Invalid webhook token',
          code: 'TOKEN_INVALID'
        };
      }
    } else if (authType === 'signature_hmac') {
      const expectedHmacSecret = configJson.webhook_hmac_secret || integration.webhook_hmac_secret || expectedSecret;
      const signatureHeader = options?.signature || options?.headers?.['x-webhook-signature'] || options?.headers?.['x-signature'] || options?.headers?.['x-hub-signature-256'];
      const rawBody = options?.rawBody;

      if (!signatureHeader) {
        return {
          valid: false,
          error: 'Webhook signature required',
          code: 'SIGNATURE_MISSING'
        };
      }

      if (!rawBody) {
        return {
          valid: false,
          error: 'Raw body required for signature verification',
          code: 'RAW_BODY_MISSING'
        };
      }

      const expected = crypto.createHmac('sha256', expectedHmacSecret).update(rawBody).digest('hex');
      const provided = String(signatureHeader).startsWith('sha256=')
        ? String(signatureHeader).slice(7)
        : String(signatureHeader);

      const signatureMatch = this.timingSafeEqual(provided, expected);
      if (!signatureMatch) {
        this.logger.warn('[SECURITY] Invalid webhook signature attempt', {
          integrationId: integration.id,
          webhookPublicId
        });
        return {
          valid: false,
          error: 'Invalid webhook signature',
          code: 'SIGNATURE_INVALID'
        };
      }
    } else {
      if (!providedSecret) {
        return {
          valid: false,
          error: 'Webhook secret required in X-Webhook-Secret header',
          code: 'SECRET_MISSING'
        };
      }

      const secretsMatch = this.timingSafeEqual(providedSecret, expectedSecret);
      if (!secretsMatch) {
        this.logger.warn('[SECURITY] Invalid webhook secret attempt', {
          integrationId: integration.id,
          webhookPublicId
        });
        return {
          valid: false,
          error: 'Invalid webhook secret',
          code: 'SECRET_INVALID'
        };
      }
    }

    return {
      valid: true,
      integration
    };
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} Whether strings match
   */
  timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    // Different lengths will return false, but we still compare to avoid timing leak
    if (aBuffer.length !== bBuffer.length) {
      // Compare against itself to keep timing constant
      crypto.timingSafeEqual(aBuffer, aBuffer);
      return false;
    }

    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }
}

// Singleton instance
let integrationServiceInstance = null;

export function getIntegrationService(logger) {
  if (!integrationServiceInstance) {
    integrationServiceInstance = new IntegrationService(logger);
  }
  return integrationServiceInstance;
}

export default IntegrationService;
