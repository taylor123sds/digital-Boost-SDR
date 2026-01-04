/**
 * @file channels.routes.js
 * @description Routes for managing agent communication channels (Evolution, etc.)
 *
 * Provides one-click connect for WhatsApp via Evolution API
 */

import express from 'express';
import { authenticate, requireManager } from '../../middleware/auth.middleware.js';
import { tenantContext } from '../../middleware/tenant.middleware.js';
import { getIntegrationService } from '../../services/IntegrationService.js';
import { getEvolutionProvider } from '../../providers/EvolutionProvider.js';
import { getEntitlementService } from '../../services/EntitlementService.js';

const router = express.Router();

const INTEGRATION_CATEGORIES = [
  { id: 'messaging', name: 'Mensageria', icon: 'MessageSquare' },
  { id: 'calendar', name: 'Calendario', icon: 'Calendar' },
  { id: 'crm', name: 'CRM', icon: 'Database' },
  { id: 'webhooks', name: 'Webhooks', icon: 'Webhook' }
];

const INTEGRATION_CATALOG = [
  {
    id: 'evolution-api',
    name: 'Evolution API',
    type: 'whatsapp',
    provider: 'evolution',
    status: 'disconnected',
    icon: '📱',
    description: 'WhatsApp via Evolution API - Multi-device, QR Code'
  },
  {
    id: 'meta-whatsapp',
    name: 'WhatsApp Cloud API',
    type: 'whatsapp',
    provider: 'meta',
    status: 'disconnected',
    icon: '☁️',
    description: 'WhatsApp oficial via Meta Business Platform'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    type: 'calendar',
    provider: 'google',
    status: 'disconnected',
    icon: '📅',
    description: 'Sincronize agendamentos com Google Calendar'
  },
  {
    id: 'kommo',
    name: 'Kommo CRM',
    type: 'crm',
    provider: 'kommo',
    status: 'disconnected',
    icon: '🟠',
    description: 'Sincronize leads e negocios com Kommo (amoCRM)'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    type: 'crm',
    provider: 'hubspot',
    status: 'disconnected',
    icon: '🔶',
    description: 'Sincronize leads e deals com HubSpot CRM'
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    type: 'crm',
    provider: 'pipedrive',
    status: 'disconnected',
    icon: '🔷',
    description: 'Sincronize pipeline com Pipedrive'
  },
  {
    id: 'custom-webhook',
    name: 'Webhook Customizado',
    type: 'webhook',
    provider: 'custom',
    status: 'disconnected',
    icon: '🔗',
    description: 'Envie eventos para seu endpoint'
  }
];

/**
 * POST /api/agents/:agentId/channels/evolution/connect
 * One-click Evolution API connect
 *
 * Creates instance, configures webhook, returns QR code
 */
router.post('/api/agents/:agentId/channels/evolution/connect',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;
      const { instanceName } = req.body || {};

      const integrationService = getIntegrationService();
      const result = await integrationService.connectEvolutionForAgent(tenantId, agentId, {
        instanceName
      });

      if (!result.success) {
        console.error('[CHANNELS] Evolution connect failed:', {
          agentId,
          tenantId,
          error: result.error,
          code: result.code
        });
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
          upgradeRequired: result.upgradeRequired
        });
      }

      res.json({
        success: true,
        data: {
          integrationId: result.integrationId,
          instanceName: result.instanceName,
          qrcode: result.qrcode,
          status: result.status,
          webhookPublicId: result.webhookPublicId,
          isNewIntegration: result.isNewIntegration
        },
        message: result.isNewIntegration
          ? 'Nova conexao criada. Escaneie o QR code com seu WhatsApp.'
          : 'Conexao recuperada. Escaneie o QR code se necessario.'
      });

    } catch (error) {
      console.error('[CHANNELS] Evolution connect error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao conectar Evolution API',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/integrations/catalog
 * Returns integration catalog for UI
 */
router.get('/api/integrations/catalog', authenticate, tenantContext, (req, res) => {
  res.json({
    success: true,
    data: {
      categories: INTEGRATION_CATEGORIES,
      integrations: INTEGRATION_CATALOG
    }
  });
});

/**
 * GET /api/agents/:agentId/channels/evolution/status
 * Get Evolution connection status
 */
router.get('/api/agents/:agentId/channels/evolution/status',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();

      // Get binding for agent
      const binding = integrationService.getBindingForAgent(tenantId, agentId);

      if (!binding) {
        return res.json({
          success: true,
          data: {
            connected: false,
            status: 'not_configured',
            message: 'Nenhuma conexao Evolution configurada para este agente'
          }
        });
      }

      // Get live status
      const status = await integrationService.getConnectionStatus(tenantId, binding.integration_id);

      res.json({
        success: true,
        data: {
          integrationId: binding.integration_id,
          instanceName: binding.instance_name,
          connected: status.connected,
          status: status.status,
          phoneNumber: status.phoneNumber,
          profileName: status.profileName
        }
      });

    } catch (error) {
      console.error('[CHANNELS] Evolution status error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar status',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/agents/:agentId/integrations
 * List integrations bound to a specific agent
 */
router.get('/api/agents/:agentId/integrations',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const bindings = integrationService.listBindingsForAgent(tenantId, agentId);

      res.json({
        success: true,
        data: bindings
      });
    } catch (error) {
      console.error('[CHANNELS] Agent integrations error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar integracoes do agente',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/agents/:agentId/channels/evolution/qrcode
 * Get fresh QR code for scanning
 */
router.get('/api/agents/:agentId/channels/evolution/qrcode',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const binding = integrationService.getBindingForAgent(tenantId, agentId);

      if (!binding) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma conexao Evolution configurada'
        });
      }

      // Get fresh QR code
      const evolutionProvider = getEvolutionProvider();
      const result = await evolutionProvider.connectInstance(binding.instance_name);

      if (!result.qrcode?.base64) {
        // Might already be connected
        const state = await evolutionProvider.getConnectionState(binding.instance_name);

        if (state.connected) {
          return res.json({
            success: true,
            data: {
              connected: true,
              status: 'connected',
              message: 'Ja conectado ao WhatsApp'
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          qrcode: result.qrcode,
          instanceName: binding.instance_name
        }
      });

    } catch (error) {
      console.error('[CHANNELS] QR code error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar QR code',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/agents/:agentId/channels/evolution/disconnect
 * Disconnect WhatsApp (logout but keep instance)
 */
router.post('/api/agents/:agentId/channels/evolution/disconnect',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const binding = integrationService.getBindingForAgent(tenantId, agentId);

      if (!binding) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma conexao Evolution configurada'
        });
      }

      const result = await integrationService.disconnectEvolution(tenantId, binding.integration_id);

      res.json({
        success: result.success,
        message: result.success
          ? 'Desconectado do WhatsApp com sucesso'
          : result.error
      });

    } catch (error) {
      console.error('[CHANNELS] Disconnect error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao desconectar',
        details: error.message
      });
    }
  }
);

/**
 * DELETE /api/agents/:agentId/channels/evolution
 * Delete Evolution instance and mark integration as deleted
 */
router.delete('/api/agents/:agentId/channels/evolution',
  authenticate,
  tenantContext,
  requireManager,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const binding = integrationService.getBindingForAgent(tenantId, agentId);

      if (!binding) {
        return res.status(404).json({
          success: false,
          error: 'Nenhuma conexao Evolution configurada'
        });
      }

      const evolutionProvider = getEvolutionProvider();
      await evolutionProvider.deleteInstance(binding.instance_name);
      integrationService.update(tenantId, binding.integration_id, {
        status: 'deleted'
      });

      res.json({
        success: true,
        message: 'Instancia removida com sucesso'
      });
    } catch (error) {
      console.error('[CHANNELS] Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao remover instancia',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/integrations
 * List all integrations for tenant
 */
router.get('/api/integrations',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const { provider, status } = req.query;

      const integrationService = getIntegrationService();
      const integrations = integrationService.getAll(tenantId, { provider, status });

      // Get entitlements for limits
      const entitlementService = getEntitlementService();
      const canAdd = entitlementService.canAddIntegration(tenantId);

      res.json({
        success: true,
        data: integrations,
        meta: {
          total: integrations.length,
          canAddMore: canAdd.allowed,
          limit: canAdd.max,
          remaining: canAdd.remaining
        }
      });

    } catch (error) {
      console.error('[INTEGRATIONS] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar integracoes'
      });
    }
  }
);

/**
 * GET /api/integrations/:integrationId
 * Get integration details
 */
router.get('/api/integrations/:integrationId',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const integration = integrationService.getById(tenantId, integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Integracao nao encontrada'
        });
      }

      res.json({
        success: true,
        data: integration
      });

    } catch (error) {
      console.error('[INTEGRATIONS] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar integracao'
      });
    }
  }
);

/**
 * GET /api/integrations/:integrationId/status
 * Get live status for integration
 */
router.get('/api/integrations/:integrationId/status',
  authenticate,
  tenantContext,
  async (req, res) => {
    try {
      const { integrationId } = req.params;
      const tenantId = req.tenantId;

      const integrationService = getIntegrationService();
      const status = await integrationService.getConnectionStatus(tenantId, integrationId);

      res.json({
        success: status.success,
        data: status
      });

    } catch (error) {
      console.error('[INTEGRATIONS] Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar status'
      });
    }
  }
);

export default router;
