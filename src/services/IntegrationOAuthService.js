/**
 * @file IntegrationOAuthService.js
 * @description OAuth service for CRM integrations
 *
 * Handles:
 * - OAuth state generation and validation (CSRF protection)
 * - Token exchange
 * - Token refresh
 * - Token encryption/decryption
 */

import { getDatabase } from '../db/connection.js';
import crypto from 'crypto';
import { KommoCRMProvider } from '../providers/crm/KommoCRMProvider.js';

// Encryption key for tokens (required)
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('INTEGRATION_ENCRYPTION_KEY is required for OAuth token encryption');
}

export class IntegrationOAuthService {
  constructor(logger) {
    this.logger = logger || console;
    this.STATE_EXPIRY_MINUTES = 10;
  }

  getDb() {
    return getDatabase();
  }

  /**
   * Generate unique ID
   */
  generateId(prefix = 'oauth') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate OAuth state for CSRF protection
   * @param {string} tenantId - Tenant ID
   * @param {string} provider - CRM provider (kommo, hubspot, etc.)
   * @param {Object} metadata - Additional metadata to store
   * @returns {Object} State info
   */
  generateState(tenantId, provider, metadata = {}) {
    const db = this.getDb();

    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.STATE_EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO oauth_states (id, tenant_id, provider, state, redirect_uri, scopes, metadata_json, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      this.generateId('ostate'),
      tenantId,
      provider,
      state,
      metadata.redirectUri || null,
      metadata.scopes || null,
      JSON.stringify(metadata),
      expiresAt
    );

    this.logger.info('OAuth state generated', { tenantId, provider, state: state.substring(0, 8) + '...' });

    return {
      state,
      expiresAt,
      expiresInMinutes: this.STATE_EXPIRY_MINUTES
    };
  }

  /**
   * Validate OAuth state (CSRF check)
   * @param {string} state - State from callback
   * @returns {Object} Validation result with tenant info
   */
  validateState(state) {
    const db = this.getDb();

    const record = db.prepare(`
      SELECT * FROM oauth_states
      WHERE state = ?
      AND consumed_at IS NULL
      AND datetime(expires_at) > datetime('now')
    `).get(state);

    if (!record) {
      this.logger.warn('Invalid or expired OAuth state', { state: state.substring(0, 8) + '...' });
      return {
        valid: false,
        error: 'Invalid or expired state'
      };
    }

    // Mark as consumed
    db.prepare(`
      UPDATE oauth_states SET consumed_at = datetime('now') WHERE id = ?
    `).run(record.id);

    const metadata = JSON.parse(record.metadata_json || '{}');

    return {
      valid: true,
      tenantId: record.tenant_id,
      provider: record.provider,
      integrationId: record.integration_id,
      redirectUri: record.redirect_uri,
      scopes: record.scopes,
      metadata
    };
  }

  /**
   * Encrypt tokens for storage
   * @param {Object} tokens - Token object { access_token, refresh_token, expires_at, etc. }
   * @returns {string} Encrypted JSON string
   */
  encryptTokens(tokens) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const jsonString = JSON.stringify(tokens);
      let encrypted = cipher.update(jsonString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Token encryption failed', { error: error.message });
      throw new Error('Failed to encrypt tokens');
    }
  }

  /**
   * Decrypt tokens from storage
   * @param {string} encryptedString - Encrypted token string
   * @returns {Object} Decrypted token object
   */
  decryptTokens(encryptedString) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedString.split(':');

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Token decryption failed', { error: error.message });
      throw new Error('Failed to decrypt tokens');
    }
  }

  /**
   * Store OAuth tokens for an integration
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   * @param {Object} tokens - Token object
   */
  storeTokens(tenantId, integrationId, tokens) {
    const db = this.getDb();

    const encryptedTokens = this.encryptTokens(tokens);

    // Get existing config
    const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId);
    const config = JSON.parse(integration?.config_json || '{}');

    // Update config with encrypted tokens
    config.oauth_tokens_encrypted = encryptedTokens;
    config.oauth_token_expires_at = tokens.expires_at;
    config.oauth_scopes = tokens.scope;

    db.prepare(`
      UPDATE integrations
      SET config_json = ?,
          status = 'connected',
          last_connected_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(JSON.stringify(config), integrationId, tenantId);

    this.logger.info('OAuth tokens stored', { tenantId, integrationId });
  }

  /**
   * Get OAuth tokens for an integration
   * @param {string} integrationId - Integration ID
   * @returns {Object|null} Decrypted tokens or null
   */
  getTokens(integrationId) {
    const db = this.getDb();

    const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId);

    if (!integration) {
      return null;
    }

    const config = JSON.parse(integration.config_json || '{}');

    if (!config.oauth_tokens_encrypted) {
      return null;
    }

    try {
      const tokens = this.decryptTokens(config.oauth_tokens_encrypted);

      // Check if expired
      if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
        return {
          ...tokens,
          expired: true
        };
      }

      return tokens;
    } catch (error) {
      this.logger.error('Failed to get tokens', { integrationId, error: error.message });
      return null;
    }
  }

  /**
   * Check if tokens need refresh
   * @param {string} integrationId - Integration ID
   * @returns {boolean} True if tokens need refresh
   */
  needsRefresh(integrationId) {
    const tokens = this.getTokens(integrationId);

    if (!tokens) return true;
    if (tokens.expired) return true;

    // Refresh if expiring within 5 minutes
    if (tokens.expires_at) {
      const expiresAt = new Date(tokens.expires_at);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt < fiveMinutesFromNow) {
        return true;
      }
    }

    return false;
  }

  /**
   * Refresh tokens for an integration when needed
   * @param {Object} integration - Integration row
   * @param {Object} [options]
   * @param {boolean} [options.force] - Force refresh even if not expiring
   * @returns {Promise<{success: boolean, tokens?: Object, error?: string}>}
   */
  async refreshTokensIfNeeded(integration, options = {}) {
    if (!integration?.id) {
      return { success: false, error: 'missing_integration' };
    }

    const shouldRefresh = options.force || this.needsRefresh(integration.id);
    if (!shouldRefresh) {
      const tokens = this.getTokens(integration.id);
      return { success: true, tokens };
    }

    const tokens = this.getTokens(integration.id);
    if (!tokens?.refresh_token) {
      return { success: false, error: 'missing_refresh_token' };
    }

    const config = JSON.parse(integration.config_json || '{}');
    const provider = integration.provider;

    try {
      switch (provider) {
        case 'kommo': {
          const kommoProvider = new KommoCRMProvider({}, this.logger);
          const accountDomain = config.accountDomain || tokens.account_domain;
          if (!accountDomain) {
            return { success: false, error: 'missing_account_domain' };
          }
          const refreshed = await kommoProvider.refreshAccessToken(tokens.refresh_token, accountDomain);
          this.updateTokens(integration.id, refreshed);
          return { success: true, tokens: { ...tokens, ...refreshed, expired: false } };
        }
        default:
          return { success: false, error: 'provider_not_supported' };
      }
    } catch (error) {
      this.logger.error('OAuth refresh failed', {
        integrationId: integration.id,
        provider,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get valid tokens (refresh on demand)
   * @param {Object} integration - Integration row
   * @param {Object} [options]
   * @param {boolean} [options.forceRefresh]
   * @returns {Promise<Object|null>}
   */
  async getValidTokens(integration, options = {}) {
    if (!integration?.id) return null;

    const tokens = this.getTokens(integration.id);
    if (!tokens) return null;

    const refreshResult = await this.refreshTokensIfNeeded(integration, {
      force: options.forceRefresh
    });

    if (!refreshResult.success) {
      return null;
    }

    return refreshResult.tokens || tokens;
  }

  /**
   * Update tokens after refresh
   * @param {string} integrationId - Integration ID
   * @param {Object} newTokens - New token object
   */
  updateTokens(integrationId, newTokens) {
    const db = this.getDb();

    // Get existing tokens to preserve refresh_token if not provided
    const existingTokens = this.getTokens(integrationId);
    const { expired, ...existingTokenData } = existingTokens || {};

    const mergedTokens = {
      ...existingTokenData,
      ...newTokens,
      // Keep old refresh_token if new one not provided (some providers don't return it every time)
      refresh_token: newTokens.refresh_token || existingTokenData?.refresh_token
    };

    const encryptedTokens = this.encryptTokens(mergedTokens);

    // Get existing config
    const integration = db.prepare('SELECT config_json, tenant_id FROM integrations WHERE id = ?').get(integrationId);
    const config = JSON.parse(integration?.config_json || '{}');

    config.oauth_tokens_encrypted = encryptedTokens;
    config.oauth_token_expires_at = mergedTokens.expires_at;
    config.oauth_last_refreshed = new Date().toISOString();

    db.prepare(`
      UPDATE integrations
      SET config_json = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(config), integrationId);

    this.logger.info('OAuth tokens refreshed', { integrationId });
  }

  /**
   * Revoke OAuth tokens and disconnect integration
   * @param {string} tenantId - Tenant ID
   * @param {string} integrationId - Integration ID
   */
  revokeTokens(tenantId, integrationId) {
    const db = this.getDb();

    // Get existing config
    const integration = db.prepare('SELECT config_json FROM integrations WHERE id = ?').get(integrationId);
    const config = JSON.parse(integration?.config_json || '{}');

    // Remove token fields
    delete config.oauth_tokens_encrypted;
    delete config.oauth_token_expires_at;
    delete config.oauth_scopes;

    db.prepare(`
      UPDATE integrations
      SET config_json = ?,
          status = 'disconnected',
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(JSON.stringify(config), integrationId, tenantId);

    this.logger.info('OAuth tokens revoked', { tenantId, integrationId });
  }

  /**
   * Clean up expired OAuth states
   * Call periodically via cron
   */
  cleanupExpiredStates() {
    const db = this.getDb();

    const result = db.prepare(`
      DELETE FROM oauth_states
      WHERE datetime(expires_at) < datetime('now')
    `).run();

    if (result.changes > 0) {
      this.logger.info('Cleaned up expired OAuth states', { count: result.changes });
    }

    return result.changes;
  }
}

// Singleton instance
let oauthServiceInstance = null;

export function getIntegrationOAuthService(logger) {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new IntegrationOAuthService(logger);
  }
  return oauthServiceInstance;
}

export default IntegrationOAuthService;
