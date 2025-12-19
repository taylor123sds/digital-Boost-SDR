/**
 * @file AgentApiRoutes.js
 * @description API REST para gerenciamento de agentes
 */

import { Router } from 'express';
import { getAgentService } from './AgentService.js';
import { AgentType, AgentStatus } from './AgentModel.js';
import {
  PersonalizationFields,
  AgentTemplates,
  generateAgentFromTemplate,
  listTemplates,
  getTemplate
} from './AgentTemplates.js';

/**
 * Cria rotas de API para agentes
 * @param {Object} opts - Opções
 * @returns {Router}
 */
export function createAgentRoutes(opts = {}) {
  const router = Router();
  const agentService = opts.agentService || getAgentService();

  // ==================== CRUD ====================

  /**
   * GET /agents - Lista todos os agentes (admin) ou por tenant
   */
  router.get('/', async (req, res) => {
    try {
      const { tenant_id, type, status, search, limit, offset } = req.query;

      const filters = {};
      if (tenant_id) filters.tenant_id = tenant_id;
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const agents = await agentService.findAll(filters);

      res.json({
        success: true,
        data: agents.map(a => a.toJSON()),
        total: agents.length
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao listar agentes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/stats - Estatísticas globais
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = await agentService.getGlobalStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[AgentAPI] Erro ao obter stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/types - Lista tipos de agente disponíveis
   */
  router.get('/types', (req, res) => {
    res.json({
      success: true,
      data: Object.entries(AgentType).map(([key, value]) => ({
        key,
        value,
        label: {
          sdr: 'SDR (Qualificacao)',
          vendedor: 'Vendedor (Varejo)',
          support: 'Suporte',
          onboarding: 'Onboarding',
          collection: 'Cobranca',
          nps: 'NPS/Pesquisa',
          custom: 'Personalizado'
        }[value] || key
      }))
    });
  });

  /**
   * GET /agents/statuses - Lista status disponíveis
   */
  router.get('/statuses', (req, res) => {
    res.json({
      success: true,
      data: Object.entries(AgentStatus).map(([key, value]) => ({
        key,
        value,
        label: {
          draft: 'Rascunho',
          active: 'Ativo',
          paused: 'Pausado',
          disabled: 'Desabilitado',
          testing: 'Em Teste'
        }[value] || key
      }))
    });
  });

  // ==================== TEMPLATES ====================

  /**
   * GET /agents/templates - Lista todos os templates disponiveis
   */
  router.get('/templates', (req, res) => {
    try {
      const templates = listTemplates();
      res.json({
        success: true,
        data: templates,
        total: templates.length
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao listar templates:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/templates/fields - Lista todos os campos de personalizacao
   */
  router.get('/templates/fields', (req, res) => {
    try {
      res.json({
        success: true,
        data: PersonalizationFields
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao listar campos:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/templates/:templateId - Obtem detalhes de um template
   */
  router.get('/templates/:templateId', (req, res) => {
    try {
      const template = getTemplate(req.params.templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template nao encontrado'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao obter template:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/templates/:templateId/preview - Preview do agente gerado
   * Gera um preview sem salvar no banco
   */
  router.post('/templates/:templateId/preview', (req, res) => {
    try {
      const { personalization } = req.body;

      if (!personalization) {
        return res.status(400).json({
          success: false,
          error: 'personalization e obrigatorio'
        });
      }

      const agentConfig = generateAgentFromTemplate(
        req.params.templateId,
        personalization
      );

      res.json({
        success: true,
        data: {
          config: agentConfig,
          preview: {
            system_prompt: agentConfig.system_prompt,
            message_templates: agentConfig.message_templates,
            persona: agentConfig.persona
          }
        }
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao gerar preview:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/templates/:templateId/create - Cria agente a partir de template
   * Gera e salva o agente no banco
   */
  router.post('/templates/:templateId/create', async (req, res) => {
    try {
      const { tenant_id, personalization, overrides } = req.body;

      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'tenant_id e obrigatorio'
        });
      }

      if (!personalization) {
        return res.status(400).json({
          success: false,
          error: 'personalization e obrigatorio'
        });
      }

      // Gerar config a partir do template
      const agentConfig = generateAgentFromTemplate(
        req.params.templateId,
        personalization
      );

      // Criar o agente no banco
      const agent = await agentService.create({
        tenant_id,
        ...agentConfig,
        ...overrides
      });

      res.status(201).json({
        success: true,
        data: agent.toJSON(),
        message: `Agente ${agentConfig.name} criado com sucesso a partir do template ${req.params.templateId}`
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao criar do template:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/templates/:templateId/validate - Valida dados de personalizacao
   */
  router.post('/templates/:templateId/validate', (req, res) => {
    try {
      const { personalization } = req.body;
      const template = getTemplate(req.params.templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template nao encontrado'
        });
      }

      // Verificar campos obrigatórios
      const missingFields = [];
      const invalidFields = [];

      for (const fieldKey of template.requiredFields || []) {
        const field = PersonalizationFields[fieldKey];
        const value = personalization?.[fieldKey];

        if (!value || (typeof value === 'string' && !value.trim())) {
          missingFields.push({
            key: fieldKey,
            label: field?.label || fieldKey
          });
        }
      }

      // Validar tipos de campo
      for (const [key, value] of Object.entries(personalization || {})) {
        const field = PersonalizationFields[key];
        if (!field) continue;

        if (field.type === 'url' && value) {
          try {
            new URL(value);
          } catch {
            invalidFields.push({
              key,
              label: field.label,
              message: 'URL invalida'
            });
          }
        }
      }

      const isValid = missingFields.length === 0 && invalidFields.length === 0;

      res.json({
        success: true,
        data: {
          valid: isValid,
          missingFields,
          invalidFields,
          completeness: personalization
            ? Math.round(
                ((template.requiredFields.length - missingFields.length) /
                  template.requiredFields.length) *
                  100
              )
            : 0
        }
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao validar:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/:id - Busca agente por ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const agent = await agentService.findById(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agente nao encontrado'
        });
      }

      res.json({ success: true, data: agent.toJSON() });
    } catch (error) {
      console.error('[AgentAPI] Erro ao buscar agente:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents - Cria novo agente
   */
  router.post('/', async (req, res) => {
    try {
      const agent = await agentService.create(req.body);

      res.status(201).json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente criado com sucesso'
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao criar agente:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/from-template - Cria agente a partir de template
   */
  router.post('/from-template', async (req, res) => {
    try {
      const { tenant_id, template, customization } = req.body;

      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          error: 'tenant_id e obrigatorio'
        });
      }

      const agent = await agentService.createFromTemplate(
        tenant_id,
        template || 'orbion',
        customization || {}
      );

      res.status(201).json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente criado a partir do template'
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao criar do template:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id - Atualiza agente
   */
  router.put('/:id', async (req, res) => {
    try {
      const agent = await agentService.update(req.params.id, req.body);

      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente atualizado com sucesso'
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao atualizar agente:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PATCH /agents/:id - Atualiza campos específicos
   */
  router.patch('/:id', async (req, res) => {
    try {
      const agent = await agentService.update(req.params.id, req.body);

      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente atualizado'
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao atualizar agente:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /agents/:id - Deleta agente
   */
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await agentService.delete(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Agente nao encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Agente deletado com sucesso'
      });
    } catch (error) {
      console.error('[AgentAPI] Erro ao deletar agente:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== OPERAÇÕES DE STATUS ====================

  /**
   * POST /agents/:id/activate - Ativa agente
   */
  router.post('/:id/activate', async (req, res) => {
    try {
      const agent = await agentService.activate(req.params.id);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente ativado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/pause - Pausa agente
   */
  router.post('/:id/pause', async (req, res) => {
    try {
      const agent = await agentService.pause(req.params.id);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente pausado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/disable - Desabilita agente
   */
  router.post('/:id/disable', async (req, res) => {
    try {
      const agent = await agentService.disable(req.params.id);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente desabilitado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/test - Coloca em modo teste
   */
  router.post('/:id/test', async (req, res) => {
    try {
      const agent = await agentService.setTesting(req.params.id);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente em modo teste'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/duplicate - Duplica agente
   */
  router.post('/:id/duplicate', async (req, res) => {
    try {
      const agent = await agentService.duplicate(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: agent.toJSON(),
        message: 'Agente duplicado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== CONFIGURAÇÕES ====================

  /**
   * PUT /agents/:id/system-prompt - Atualiza system prompt
   */
  router.put('/:id/system-prompt', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'prompt e obrigatorio'
        });
      }

      const agent = await agentService.updateSystemPrompt(req.params.id, prompt);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'System prompt atualizado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id/prompts - Atualiza prompts específicos
   */
  router.put('/:id/prompts', async (req, res) => {
    try {
      const agent = await agentService.updatePrompts(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Prompts atualizados'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id/message-templates - Atualiza templates de mensagem
   */
  router.put('/:id/message-templates', async (req, res) => {
    try {
      const agent = await agentService.updateMessageTemplates(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Templates atualizados'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id/behavior - Atualiza comportamento
   */
  router.put('/:id/behavior', async (req, res) => {
    try {
      const agent = await agentService.updateBehavior(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Comportamento atualizado'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id/ai-config - Atualiza configuração de IA
   */
  router.put('/:id/ai-config', async (req, res) => {
    try {
      const agent = await agentService.updateAIConfig(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Configuracao de IA atualizada'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /agents/:id/integrations - Atualiza integrações
   */
  router.put('/:id/integrations', async (req, res) => {
    try {
      const agent = await agentService.updateIntegrations(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.toJSON(),
        message: 'Integracoes atualizadas'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== MÉTRICAS ====================

  /**
   * GET /agents/:id/metrics - Obtém métricas do agente
   */
  router.get('/:id/metrics', async (req, res) => {
    try {
      const agent = await agentService.findById(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agente nao encontrado'
        });
      }

      res.json({
        success: true,
        data: agent.metrics
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/metrics - Atualiza métricas
   */
  router.post('/:id/metrics', async (req, res) => {
    try {
      const agent = await agentService.updateMetrics(req.params.id, req.body);
      res.json({
        success: true,
        data: agent.metrics,
        message: 'Metricas atualizadas'
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /agents/:id/metrics/increment - Incrementa métrica
   */
  router.post('/:id/metrics/increment', async (req, res) => {
    try {
      const { metric, value } = req.body;

      if (!metric) {
        return res.status(400).json({
          success: false,
          error: 'metric e obrigatorio'
        });
      }

      await agentService.incrementMetric(req.params.id, metric, value || 1);

      const agent = await agentService.findById(req.params.id);
      res.json({
        success: true,
        data: agent.metrics,
        message: `Metrica ${metric} incrementada`
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== TENANT ====================

  /**
   * GET /agents/tenant/:tenantId - Lista agentes de um tenant
   */
  router.get('/tenant/:tenantId', async (req, res) => {
    try {
      const { type, status, limit } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (limit) filters.limit = parseInt(limit);

      const agents = await agentService.findByTenant(req.params.tenantId, filters);

      res.json({
        success: true,
        data: agents.map(a => a.toJSON()),
        total: agents.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /agents/tenant/:tenantId/stats - Estatísticas do tenant
   */
  router.get('/tenant/:tenantId/stats', async (req, res) => {
    try {
      const stats = await agentService.getTenantStats(req.params.tenantId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createAgentRoutes;
