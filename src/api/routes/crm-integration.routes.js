/**
 * @file crm-integration.routes.js
 * @description Routes for CRM integrations (Kommo, HubSpot, etc.)
 *
 * Handles OAuth flows and CRM-specific operations
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { tenantContext } from '../../middleware/tenant.middleware.js';
import { getIntegrationService } from '../../services/IntegrationService.js';
import { getIntegrationOAuthService } from '../../services/IntegrationOAuthService.js';
import { getEntitlementService } from '../../services/EntitlementService.js';
import { KommoCRMProvider } from '../../providers/crm/KommoCRMProvider.js';

const router = express.Router();

async function getTokensForIntegration(oauthService, integration) {
  const tokens = await oauthService.getValidTokens(integration);
  if (!tokens) {
    return null;
  }
  if (tokens.expired) {
    return null;
  }
  return tokens;
}

async function withTokenRetry(oauthService, integration, tokens, fn) {
  try {
    const data = await fn(tokens.access_token, tokens);
    return { ok: true, data };
  } catch (error) {
    if (error?.response?.status === 401) {
      const refreshResult = await oauthService.refreshTokensIfNeeded(integration, { force: true });
      if (refreshResult.success && refreshResult.tokens?.access_token) {
        const data = await fn(refreshResult.tokens.access_token, refreshResult.tokens);
        return { ok: true, data };
      }
      return { ok: false, status: 401 };
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/integrations/crm/:provider/oauth/start
 * Start OAuth flow for a CRM provider
 */
router.get('/api/integrations/crm/:provider/oauth/start',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const tenantId = req.tenantId;
      const { integrationId } = req.query;

      // Validate provider
      const validProviders = ['kommo', 'hubspot', 'pipedrive'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({
          success: false,
          error: `Provider invalido. Use: ${validProviders.join(', ')}`
        });
      }

      // Check entitlements
      const entitlementService = getEntitlementService();
      const canAdd = entitlementService.canAddIntegration(tenantId);

      if (!canAdd.allowed && !integrationId) {
        return res.status(403).json({
          success: false,
          error: canAdd.reason,
          upgradeRequired: canAdd.upgradeRequired
        });
      }

      // Generate OAuth state
      const oauthService = getIntegrationOAuthService();
      const redirectUri = `${process.env.PUBLIC_BASE_URL}/api/integrations/oauth/callback/${provider}`;

      const { state } = oauthService.generateState(tenantId, provider, {
        integrationId,
        redirectUri,
        userId: req.user.userId
      });

      // Get authorization URL based on provider
      let authUrl;

      switch (provider) {
        case 'kommo':
          const kommoProvider = new KommoCRMProvider({}, console);
          authUrl = kommoProvider.getAuthorizeUrl({ state, redirectUri });
          break;

        case 'hubspot':
          // TODO: Implement HubSpot provider
          authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${process.env.HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=contacts%20oauth&state=${state}`;
          break;

        case 'pipedrive':
          // TODO: Implement Pipedrive provider
          authUrl = `https://oauth.pipedrive.com/oauth/authorize?client_id=${process.env.PIPEDRIVE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Provider not implemented'
          });
      }

      res.json({
        success: true,
        data: {
          authUrl,
          provider,
          state: state.substring(0, 8) + '...', // Don't expose full state
          expiresInMinutes: 10
        }
      });

    } catch (error) {
      console.error('[CRM-OAUTH] Start error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao iniciar OAuth',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/integrations/oauth/callback/:provider
 * OAuth callback handler
 *
 * Note: This endpoint is called by the CRM provider, not the frontend
 */
router.get('/api/integrations/oauth/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, referer, error: oauthError, error_description } = req.query;

    // Handle OAuth errors
    if (oauthError) {
      console.error('[CRM-OAUTH] OAuth error:', { error: oauthError, description: error_description });
      return res.redirect(`/integrations?error=${encodeURIComponent(error_description || oauthError)}`);
    }

    if (!code || !state) {
      return res.redirect('/integrations?error=missing_params');
    }

    // Validate state
    const oauthService = getIntegrationOAuthService();
    const stateValidation = oauthService.validateState(state);

    if (!stateValidation.valid) {
      console.error('[CRM-OAUTH] Invalid state:', stateValidation.error);
      return res.redirect('/integrations?error=invalid_state');
    }

    const { tenantId, metadata } = stateValidation;
    const integrationService = getIntegrationService();

    // Exchange code for tokens based on provider
    let tokens;
    let accountInfo = {};

    switch (provider) {
      case 'kommo':
        const kommoProvider = new KommoCRMProvider({}, console);

        // referer contains the Kommo account domain
        tokens = await kommoProvider.exchangeCodeForTokens({
          code,
          redirectUri: metadata.redirectUri,
          referer: referer || req.query.referer
        });

        accountInfo = {
          accountDomain: tokens.account_domain
        };

        // Get account info
        try {
          const users = await kommoProvider.getUsers(tokens.access_token, tokens.account_domain);
          const currentUser = users.find(u => u.id === tokens.user_id) || users[0];
          accountInfo.accountName = currentUser?.name;
        } catch (e) {
          // Ignore
        }
        break;

      case 'hubspot':
        // TODO: Implement HubSpot token exchange
        return res.redirect('/integrations?error=not_implemented');

      case 'pipedrive':
        // TODO: Implement Pipedrive token exchange
        return res.redirect('/integrations?error=not_implemented');

      default:
        return res.redirect('/integrations?error=unknown_provider');
    }

    // Create or update integration
    let integration;

    if (metadata.integrationId) {
      // Update existing integration
      integration = integrationService.update(tenantId, metadata.integrationId, {
        status: 'connected',
        config: accountInfo
      });
    } else {
      // Create new integration
      integration = integrationService.create(tenantId, {
        provider,
        instanceName: accountInfo.accountDomain || `${provider}_${Date.now()}`,
        status: 'connected',
        config: accountInfo
      });
    }

    // Store tokens
    oauthService.storeTokens(tenantId, integration.id, tokens);

    console.log('[CRM-OAUTH] Integration connected:', {
      provider,
      tenantId,
      integrationId: integration.id
    });

    // Redirect to success page
    res.redirect(`/integrations?success=true&provider=${provider}&integration=${integration.id}`);

  } catch (error) {
    console.error('[CRM-OAUTH] Callback error:', error);
    res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/integrations/:integrationId/disconnect
 * Disconnect CRM integration
 */
router.post('/api/integrations/:integrationId/disconnect',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;

      const oauthService = getIntegrationOAuthService();
      const integrationService = getIntegrationService();

      // Revoke tokens
      oauthService.revokeTokens(tenantId, integrationId);

      // Update integration status
      integrationService.update(tenantId, integrationId, {
        status: 'disconnected'
      });

      res.json({
        success: true,
        message: 'Integracao desconectada com sucesso'
      });

    } catch (error) {
      console.error('[CRM] Disconnect error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao desconectar integracao'
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CRM OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/integrations/:integrationId/sync
 * Trigger manual sync
 */
router.post('/api/integrations/:integrationId/sync',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;
      const { type = 'incremental' } = req.body;

      const integrationService = getIntegrationService();
      const integration = integrationService.getById(tenantId, integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Integracao nao encontrada'
        });
      }

      // TODO: Create sync job
      // For now, return a placeholder
      res.json({
        success: true,
        message: `Sync ${type} iniciado`,
        data: {
          jobId: `job_${Date.now()}`,
          type,
          status: 'pending'
        }
      });

    } catch (error) {
      console.error('[CRM] Sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao iniciar sync'
      });
    }
  }
);

/**
 * GET /api/integrations/:integrationId/pipelines
 * Get CRM pipelines/stages
 */
router.get('/api/integrations/:integrationId/pipelines',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const oauthService = getIntegrationOAuthService();

      const integration = integrationService.getById(tenantId, integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Integracao nao encontrada'
        });
      }

      // Get tokens (refresh on demand)
      const tokens = await getTokensForIntegration(oauthService, integration);

      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'Tokens expirados. Reconecte a integracao.'
        });
      }

      // Get pipelines based on provider
      let pipelines;
      const config = JSON.parse(integration.config_json || '{}');

      switch (integration.provider) {
        case 'kommo':
          const kommoProvider = new KommoCRMProvider({}, console);
          const pipelinesResult = await withTokenRetry(oauthService, integration, tokens, (accessToken) =>
            kommoProvider.getPipelines(accessToken, config.accountDomain)
          );
          if (!pipelinesResult.ok) {
            return res.status(pipelinesResult.status).json({
              success: false,
              error: 'Tokens expirados. Reconecte a integracao.'
            });
          }
          pipelines = pipelinesResult.data;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Provider nao suportado'
          });
      }

      res.json({
        success: true,
        data: pipelines
      });

    } catch (error) {
      console.error('[CRM] Pipelines error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar pipelines'
      });
    }
  }
);

/**
 * POST /api/integrations/:integrationId/leads
 * Push lead to CRM
 */
router.post('/api/integrations/:integrationId/leads',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;
      const leadData = req.body;

      const integrationService = getIntegrationService();
      const oauthService = getIntegrationOAuthService();

      const integration = integrationService.getById(tenantId, integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Integracao nao encontrada'
        });
      }

      // Get tokens (refresh on demand)
      const tokens = await getTokensForIntegration(oauthService, integration);

      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'Tokens expirados. Reconecte a integracao.'
        });
      }

      // Push lead based on provider
      let result;
      const config = JSON.parse(integration.config_json || '{}');

      switch (integration.provider) {
        case 'kommo':
          const kommoProvider = new KommoCRMProvider({}, console);
          const leadResult = await withTokenRetry(oauthService, integration, tokens, (accessToken) =>
            kommoProvider.upsertLead(accessToken, leadData, config.accountDomain)
          );
          if (!leadResult.ok) {
            return res.status(leadResult.status).json({
              success: false,
              error: 'Tokens expirados. Reconecte a integracao.'
            });
          }
          result = leadResult.data;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Provider nao suportado'
          });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[CRM] Push lead error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar lead para CRM'
      });
    }
  }
);

/**
 * GET /api/integrations/:integrationId/test
 * Test CRM connection
 */
router.get('/api/integrations/:integrationId/test',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const oauthService = getIntegrationOAuthService();

      const integration = integrationService.getById(tenantId, integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Integracao nao encontrada'
        });
      }

      // Get tokens (refresh on demand)
      const tokens = await getTokensForIntegration(oauthService, integration);

      if (!tokens) {
        return res.json({
          success: true,
          data: {
            connected: false,
            reason: 'No tokens found'
          }
        });
      }

      // Test connection based on provider
      let testResult;
      const config = JSON.parse(integration.config_json || '{}');

      switch (integration.provider) {
        case 'kommo':
          const kommoProvider = new KommoCRMProvider({}, console);
          const testResultRetry = await withTokenRetry(oauthService, integration, tokens, (accessToken) =>
            kommoProvider.healthCheck(accessToken, config.accountDomain)
          );
          if (!testResultRetry.ok) {
            return res.json({
              success: true,
              data: {
                connected: false,
                reason: 'Tokens expired',
                needsReconnect: true
              }
            });
          }
          const healthy = testResultRetry.data;
          testResult = {
            connected: healthy,
            provider: 'kommo',
            accountDomain: config.accountDomain
          };
          break;

        default:
          testResult = {
            connected: false,
            reason: 'Provider not implemented'
          };
      }

      res.json({
        success: true,
        data: testResult
      });

    } catch (error) {
      console.error('[CRM] Test connection error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao testar conexao'
      });
    }
  }
);

export default router;
