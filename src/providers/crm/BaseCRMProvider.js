/**
 * @file BaseCRMProvider.js
 * @description Base class for CRM providers
 *
 * Defines the interface that all CRM providers must implement
 */

export class BaseCRMProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {Object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger || console;
    this.providerName = 'base';
  }

  /**
   * Get OAuth authorization URL
   * @param {Object} options - Authorization options
   * @param {string} options.state - CSRF state
   * @param {string} options.redirectUri - Callback URL
   * @param {string[]} options.scopes - Requested scopes
   * @returns {string} Authorization URL
   */
  getAuthorizeUrl({ state, redirectUri, scopes }) {
    throw new Error('getAuthorizeUrl must be implemented by subclass');
  }

  /**
   * Exchange authorization code for tokens
   * @param {Object} options - Exchange options
   * @param {string} options.code - Authorization code
   * @param {string} options.redirectUri - Callback URL (must match authorize)
   * @param {string} options.referer - Account subdomain (for some CRMs like Kommo)
   * @returns {Promise<Object>} Token object { access_token, refresh_token, expires_in, etc. }
   */
  async exchangeCodeForTokens({ code, redirectUri, referer }) {
    throw new Error('exchangeCodeForTokens must be implemented by subclass');
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token object
   */
  async refreshAccessToken(refreshToken) {
    throw new Error('refreshAccessToken must be implemented by subclass');
  }

  /**
   * Make authenticated API request
   * @param {string} accessToken - Access token
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} API response
   */
  async apiRequest(accessToken, method, endpoint, data) {
    throw new Error('apiRequest must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a lead in the CRM
   * @param {string} accessToken - Access token
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} Created/updated lead with remote ID
   */
  async upsertLead(accessToken, leadData) {
    throw new Error('upsertLead must be implemented by subclass');
  }

  /**
   * Get lead by ID
   * @param {string} accessToken - Access token
   * @param {string} remoteId - CRM lead ID
   * @returns {Promise<Object>} Lead data
   */
  async getLead(accessToken, remoteId) {
    throw new Error('getLead must be implemented by subclass');
  }

  /**
   * Search leads
   * @param {string} accessToken - Access token
   * @param {Object} query - Search query
   * @returns {Promise<Array>} Matching leads
   */
  async searchLeads(accessToken, query) {
    throw new Error('searchLeads must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a contact
   * @param {string} accessToken - Access token
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} Created/updated contact
   */
  async upsertContact(accessToken, contactData) {
    throw new Error('upsertContact must be implemented by subclass');
  }

  /**
   * Get contact by ID
   * @param {string} accessToken - Access token
   * @param {string} remoteId - CRM contact ID
   * @returns {Promise<Object>} Contact data
   */
  async getContact(accessToken, remoteId) {
    throw new Error('getContact must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE/ACTIVITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add note to a lead
   * @param {string} accessToken - Access token
   * @param {string} leadRemoteId - CRM lead ID
   * @param {string} noteText - Note content
   * @returns {Promise<Object>} Created note
   */
  async addNoteToLead(accessToken, leadRemoteId, noteText) {
    throw new Error('addNoteToLead must be implemented by subclass');
  }

  /**
   * Add activity/task
   * @param {string} accessToken - Access token
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity
   */
  async addActivity(accessToken, activityData) {
    throw new Error('addActivity must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE/METADATA OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get pipelines/stages
   * @param {string} accessToken - Access token
   * @returns {Promise<Array>} Pipelines with stages
   */
  async getPipelines(accessToken) {
    throw new Error('getPipelines must be implemented by subclass');
  }

  /**
   * Get users
   * @param {string} accessToken - Access token
   * @returns {Promise<Array>} Users
   */
  async getUsers(accessToken) {
    throw new Error('getUsers must be implemented by subclass');
  }

  /**
   * Get custom fields
   * @param {string} accessToken - Access token
   * @param {string} entity - Entity type (lead, contact, etc.)
   * @returns {Promise<Array>} Custom fields
   */
  async getCustomFields(accessToken, entity) {
    throw new Error('getCustomFields must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create webhook subscription
   * @param {string} accessToken - Access token
   * @param {Object} webhookConfig - Webhook configuration
   * @returns {Promise<Object>} Created webhook
   */
  async createWebhookSubscription(accessToken, webhookConfig) {
    throw new Error('createWebhookSubscription must be implemented by subclass');
  }

  /**
   * Verify incoming webhook signature
   * @param {Object} headers - Request headers
   * @param {string} body - Request body
   * @returns {boolean} True if valid
   */
  verifyWebhook(headers, body) {
    // Default: no verification
    return true;
  }

  /**
   * Parse webhook payload
   * @param {Object} payload - Raw webhook payload
   * @returns {Object} Normalized event { type, entity, data }
   */
  parseWebhookPayload(payload) {
    throw new Error('parseWebhookPayload must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get updated records since timestamp
   * @param {string} accessToken - Access token
   * @param {string} entity - Entity type
   * @param {string} since - ISO timestamp
   * @returns {Promise<Array>} Updated records
   */
  async getUpdatedRecords(accessToken, entity, since) {
    throw new Error('getUpdatedRecords must be implemented by subclass');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Map local lead data to CRM format
   * @param {Object} localLead - Local lead object
   * @returns {Object} CRM-formatted lead
   */
  mapLeadToCRM(localLead) {
    // Override in subclass
    return localLead;
  }

  /**
   * Map CRM lead data to local format
   * @param {Object} crmLead - CRM lead object
   * @returns {Object} Local-formatted lead
   */
  mapLeadFromCRM(crmLead) {
    // Override in subclass
    return crmLead;
  }

  /**
   * Health check
   * @param {string} accessToken - Access token
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck(accessToken) {
    try {
      await this.getUsers(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default BaseCRMProvider;
