/**
 * @file KommoCRMProvider.js
 * @description Kommo (ex-amoCRM) provider implementation
 *
 * API Docs: https://www.kommo.com/developers/content/api/api
 *
 * Important Kommo notes:
 * - OAuth uses account subdomain for API calls
 * - Refresh tokens rotate (new refresh token on each refresh)
 * - Rate limits apply per account
 */

import axios from 'axios';
import { BaseCRMProvider } from './BaseCRMProvider.js';

export class KommoCRMProvider extends BaseCRMProvider {
  constructor(config, logger) {
    super(config, logger);
    this.providerName = 'kommo';

    this.clientId = config.clientId || process.env.KOMMO_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.KOMMO_CLIENT_SECRET;
    this.redirectUri = config.redirectUri || process.env.KOMMO_REDIRECT_URI;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizeUrl({ state, redirectUri, scopes }) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri || this.redirectUri,
      response_type: 'code',
      state
    });

    // Note: Kommo uses a central auth URL, account is determined by user login
    return `https://www.kommo.com/oauth?${params.toString()}`;
  }

  /**
   * Get API base URL for account
   * @param {string} accountDomain - Account subdomain (from referer or stored)
   */
  getApiBaseUrl(accountDomain) {
    // accountDomain should be like 'example.kommo.com' or just 'example'
    const domain = accountDomain.includes('.') ? accountDomain : `${accountDomain}.kommo.com`;
    return `https://${domain}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens({ code, redirectUri, referer }) {
    // referer contains the account subdomain
    const accountDomain = this.extractDomain(referer);
    const baseUrl = this.getApiBaseUrl(accountDomain);

    try {
      const response = await axios.post(`${baseUrl}/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri || this.redirectUri
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        expires_at: expiresAt,
        account_domain: accountDomain,
        scope: data.scope
      };

    } catch (error) {
      this.logger.error('Kommo token exchange failed', {
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   * IMPORTANT: Kommo rotates refresh tokens!
   */
  async refreshAccessToken(refreshToken, accountDomain) {
    const baseUrl = this.getApiBaseUrl(accountDomain);

    try {
      const response = await axios.post(`${baseUrl}/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: this.redirectUri
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;
      const expiresAt = new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString();

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token, // NEW refresh token!
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        expires_at: expiresAt,
        account_domain: accountDomain
      };

    } catch (error) {
      this.logger.error('Kommo token refresh failed', {
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(accessToken, method, endpoint, data, accountDomain) {
    const baseUrl = this.getApiBaseUrl(accountDomain);

    try {
      const response = await axios({
        method,
        url: `${baseUrl}/api/v4${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      });

      return response.data;
    } catch (error) {
      this.logger.error('Kommo API request failed', {
        method,
        endpoint,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a lead
   */
  async upsertLead(accessToken, leadData, accountDomain) {
    const kommoLead = this.mapLeadToCRM(leadData);

    // If we have a remote ID, update; otherwise create
    if (leadData.remoteId) {
      const response = await this.apiRequest(
        accessToken,
        'PATCH',
        `/leads/${leadData.remoteId}`,
        kommoLead,
        accountDomain
      );

      return {
        remoteId: response.id || leadData.remoteId,
        success: true,
        action: 'updated'
      };
    } else {
      const response = await this.apiRequest(
        accessToken,
        'POST',
        '/leads',
        [kommoLead],
        accountDomain
      );

      const created = response._embedded?.leads?.[0];

      return {
        remoteId: created?.id,
        success: true,
        action: 'created'
      };
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(accessToken, remoteId, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'GET',
      `/leads/${remoteId}`,
      { with: 'contacts,catalog_elements' },
      accountDomain
    );

    return this.mapLeadFromCRM(response);
  }

  /**
   * Search leads by phone, email, or name
   */
  async searchLeads(accessToken, query, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'GET',
      '/leads',
      {
        query: query.q,
        limit: query.limit || 50,
        page: query.page || 1,
        with: 'contacts'
      },
      accountDomain
    );

    const leads = response._embedded?.leads || [];
    return leads.map(lead => this.mapLeadFromCRM(lead));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a contact
   */
  async upsertContact(accessToken, contactData, accountDomain) {
    const kommoContact = this.mapContactToCRM(contactData);

    if (contactData.remoteId) {
      const response = await this.apiRequest(
        accessToken,
        'PATCH',
        `/contacts/${contactData.remoteId}`,
        kommoContact,
        accountDomain
      );

      return {
        remoteId: response.id || contactData.remoteId,
        success: true,
        action: 'updated'
      };
    } else {
      const response = await this.apiRequest(
        accessToken,
        'POST',
        '/contacts',
        [kommoContact],
        accountDomain
      );

      const created = response._embedded?.contacts?.[0];

      return {
        remoteId: created?.id,
        success: true,
        action: 'created'
      };
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(accessToken, remoteId, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'GET',
      `/contacts/${remoteId}`,
      { with: 'leads' },
      accountDomain
    );

    return this.mapContactFromCRM(response);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE/ACTIVITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add note to a lead
   */
  async addNoteToLead(accessToken, leadRemoteId, noteText, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'POST',
      `/leads/${leadRemoteId}/notes`,
      [{
        note_type: 'common',
        params: {
          text: noteText
        }
      }],
      accountDomain
    );

    return {
      success: true,
      noteId: response._embedded?.notes?.[0]?.id
    };
  }

  /**
   * Add task/activity
   */
  async addActivity(accessToken, activityData, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'POST',
      '/tasks',
      [{
        text: activityData.text || activityData.description,
        complete_till: activityData.dueDate
          ? Math.floor(new Date(activityData.dueDate).getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 86400,
        entity_id: activityData.leadId,
        entity_type: 'leads',
        task_type_id: activityData.typeId || 1, // 1 = call
        responsible_user_id: activityData.userId
      }],
      accountDomain
    );

    return {
      success: true,
      taskId: response._embedded?.tasks?.[0]?.id
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE/METADATA OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get pipelines with stages
   */
  async getPipelines(accessToken, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'GET',
      '/leads/pipelines',
      {},
      accountDomain
    );

    return (response._embedded?.pipelines || []).map(pipeline => ({
      id: pipeline.id,
      name: pipeline.name,
      isMain: pipeline.is_main,
      stages: (pipeline._embedded?.statuses || []).map(stage => ({
        id: stage.id,
        name: stage.name,
        sort: stage.sort,
        color: stage.color,
        type: stage.type // 0 = normal, 1 = win, 2 = loss
      }))
    }));
  }

  /**
   * Get users
   */
  async getUsers(accessToken, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'GET',
      '/users',
      {},
      accountDomain
    );

    return (response._embedded?.users || []).map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.rights?.is_admin ? 'admin' : 'user'
    }));
  }

  /**
   * Get custom fields
   */
  async getCustomFields(accessToken, entity, accountDomain) {
    const entityMap = {
      lead: 'leads',
      contact: 'contacts',
      company: 'companies'
    };

    const response = await this.apiRequest(
      accessToken,
      'GET',
      `/${entityMap[entity] || entity}/custom_fields`,
      {},
      accountDomain
    );

    return (response._embedded?.custom_fields || []).map(field => ({
      id: field.id,
      name: field.name,
      code: field.code,
      type: field.type,
      isRequired: field.is_predefined,
      enums: field.enums?.map(e => ({ id: e.id, value: e.value }))
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create webhook subscription
   */
  async createWebhookSubscription(accessToken, webhookConfig, accountDomain) {
    const response = await this.apiRequest(
      accessToken,
      'POST',
      '/webhooks',
      {
        destination: webhookConfig.url,
        settings: webhookConfig.events || ['add_lead', 'update_lead', 'add_contact', 'update_contact']
      },
      accountDomain
    );

    return {
      success: true,
      webhookId: response?.id
    };
  }

  /**
   * Parse webhook payload from Kommo
   */
  parseWebhookPayload(payload) {
    // Kommo webhook format varies by event type
    const eventType = Object.keys(payload).find(k =>
      ['leads', 'contacts', 'companies', 'tasks'].some(e => k.includes(e))
    );

    if (!eventType) {
      return { type: 'unknown', entity: null, data: payload };
    }

    const action = eventType.includes('add') ? 'created'
      : eventType.includes('update') ? 'updated'
        : eventType.includes('delete') ? 'deleted'
          : 'unknown';

    const entity = eventType.replace(/\[.*\]/, '').replace('add_', '').replace('update_', '').replace('delete_', '');

    return {
      type: action,
      entity,
      data: payload[eventType]
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get updated records since timestamp
   */
  async getUpdatedRecords(accessToken, entity, since, accountDomain) {
    const entityEndpoint = entity === 'lead' ? 'leads'
      : entity === 'contact' ? 'contacts'
        : entity;

    const sinceTimestamp = Math.floor(new Date(since).getTime() / 1000);

    const response = await this.apiRequest(
      accessToken,
      'GET',
      `/${entityEndpoint}`,
      {
        filter: {
          updated_at: { from: sinceTimestamp }
        },
        limit: 250
      },
      accountDomain
    );

    return response._embedded?.[entityEndpoint] || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Map local lead to Kommo format
   */
  mapLeadToCRM(localLead) {
    const lead = {
      name: localLead.name || localLead.nome || `Lead ${localLead.phone || localLead.whatsapp}`,
      price: localLead.valor || localLead.value || 0,
      pipeline_id: localLead.pipelineId,
      status_id: localLead.stageId
    };

    // Custom fields
    const customFields = [];

    // Add phone as custom field if available
    if (localLead.phone || localLead.whatsapp || localLead.telefone) {
      customFields.push({
        field_code: 'PHONE',
        values: [{
          value: localLead.phone || localLead.whatsapp || localLead.telefone,
          enum_code: 'WORK'
        }]
      });
    }

    // Add email if available
    if (localLead.email) {
      customFields.push({
        field_code: 'EMAIL',
        values: [{
          value: localLead.email,
          enum_code: 'WORK'
        }]
      });
    }

    if (customFields.length > 0) {
      lead.custom_fields_values = customFields;
    }

    // Tags
    if (localLead.tags) {
      lead._embedded = {
        tags: localLead.tags.map(t => ({ name: t }))
      };
    }

    return lead;
  }

  /**
   * Map Kommo lead to local format
   */
  mapLeadFromCRM(kommoLead) {
    const local = {
      remoteId: kommoLead.id,
      name: kommoLead.name,
      value: kommoLead.price || 0,
      pipelineId: kommoLead.pipeline_id,
      stageId: kommoLead.status_id,
      responsibleUserId: kommoLead.responsible_user_id,
      createdAt: new Date(kommoLead.created_at * 1000).toISOString(),
      updatedAt: new Date(kommoLead.updated_at * 1000).toISOString()
    };

    // Extract custom fields
    const customFields = kommoLead.custom_fields_values || [];

    const phoneField = customFields.find(f => f.field_code === 'PHONE');
    if (phoneField) {
      local.phone = phoneField.values?.[0]?.value;
    }

    const emailField = customFields.find(f => f.field_code === 'EMAIL');
    if (emailField) {
      local.email = emailField.values?.[0]?.value;
    }

    // Tags
    if (kommoLead._embedded?.tags) {
      local.tags = kommoLead._embedded.tags.map(t => t.name);
    }

    // Contacts
    if (kommoLead._embedded?.contacts) {
      local.contacts = kommoLead._embedded.contacts.map(c => ({
        id: c.id,
        isMain: c.is_main
      }));
    }

    return local;
  }

  /**
   * Map local contact to Kommo format
   */
  mapContactToCRM(localContact) {
    const contact = {
      name: localContact.name || localContact.nome,
      first_name: localContact.firstName,
      last_name: localContact.lastName
    };

    const customFields = [];

    if (localContact.phone || localContact.whatsapp || localContact.telefone) {
      customFields.push({
        field_code: 'PHONE',
        values: [{
          value: localContact.phone || localContact.whatsapp || localContact.telefone,
          enum_code: 'WORK'
        }]
      });
    }

    if (localContact.email) {
      customFields.push({
        field_code: 'EMAIL',
        values: [{
          value: localContact.email,
          enum_code: 'WORK'
        }]
      });
    }

    if (customFields.length > 0) {
      contact.custom_fields_values = customFields;
    }

    return contact;
  }

  /**
   * Map Kommo contact to local format
   */
  mapContactFromCRM(kommoContact) {
    const local = {
      remoteId: kommoContact.id,
      name: kommoContact.name,
      firstName: kommoContact.first_name,
      lastName: kommoContact.last_name,
      responsibleUserId: kommoContact.responsible_user_id,
      createdAt: new Date(kommoContact.created_at * 1000).toISOString(),
      updatedAt: new Date(kommoContact.updated_at * 1000).toISOString()
    };

    const customFields = kommoContact.custom_fields_values || [];

    const phoneField = customFields.find(f => f.field_code === 'PHONE');
    if (phoneField) {
      local.phone = phoneField.values?.[0]?.value;
    }

    const emailField = customFields.find(f => f.field_code === 'EMAIL');
    if (emailField) {
      local.email = emailField.values?.[0]?.value;
    }

    return local;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract domain from referer URL
   */
  extractDomain(referer) {
    if (!referer) return null;

    // Handle full URL or just domain
    try {
      if (referer.includes('://')) {
        const url = new URL(referer);
        return url.hostname;
      }
      return referer.replace(/^https?:\/\//, '').split('/')[0];
    } catch (e) {
      return referer;
    }
  }
}

// Factory function
export function createKommoProvider(config, logger) {
  return new KommoCRMProvider(config, logger);
}

export default KommoCRMProvider;
