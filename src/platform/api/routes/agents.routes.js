/**
 * AGENTS API ROUTES
 * Rotas para CRUD de agentes
 * STACK_DEPRECATED_OK: legacy route stack (read-only)
 */

import { Router } from 'express';
import { getAgentFactory, createAgent, previewAgent } from '../../AgentFactory.js';

const router = Router();

/**
 * GET /api/platform/agents
 * Lista agentes do tenant
 */
router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    const factory = getAgentFactory();

    // Por enquanto retorna do registry em memoria
    const agents = factory.listAgents().filter(a =>
      !tenant_id || a.tenantId === tenant_id
    );

    res.json({
      success: true,
      data: agents,
      total: agents.length,
    });
  } catch (error) {
    console.error('[Agents API] Erro listando agentes:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/agents/:id
 * Busca agente por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const factory = getAgentFactory();
    const agent = factory.getAgent(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
      });
    }

    res.json({
      success: true,
      data: {
        id: agent.id,
        version: agent.version,
        config: agent.config,
        createdAt: agent.createdAt,
        buildReport: agent.getBuildReport(),
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro buscando agente:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/agents
 * Cria novo agente
 */
router.post('/', async (req, res) => {
  try {
    const config = req.body;

    // Valida config minima
    if (!config.id || !config.empresa?.nome || !config.agente?.nome) {
      return res.status(400).json({
        success: false,
        error: 'Configuracao invalida. Campos obrigatorios: id, empresa.nome, agente.nome',
      });
    }

    const agent = createAgent(config);

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        version: agent.version,
        createdAt: agent.createdAt,
        buildReport: agent.getBuildReport(),
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro criando agente:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/platform/agents/:id
 * Atualiza agente existente
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const config = req.body;
    const factory = getAgentFactory();

    // Remove agente antigo
    factory.removeAgent(id);

    // Cria novo com config atualizada
    config.id = id;
    const agent = factory.createAgent(config);

    res.json({
      success: true,
      data: {
        id: agent.id,
        version: agent.version,
        updatedAt: new Date().toISOString(),
        buildReport: agent.getBuildReport(),
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro atualizando agente:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/platform/agents/:id
 * Remove agente
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const factory = getAgentFactory();
    const removed = factory.removeAgent(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Agente removido com sucesso',
    });
  } catch (error) {
    console.error('[Agents API] Erro removendo agente:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/agents/preview
 * Preview do agente sem criar
 */
router.post('/preview', async (req, res) => {
  try {
    const config = req.body;
    const preview = previewAgent(config);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('[Agents API] Erro no preview:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/agents/:id/prompt
 * Retorna prompt compilado do agente
 */
router.get('/:id/prompt', async (req, res) => {
  try {
    const { id } = req.params;
    const { compact } = req.query;
    const factory = getAgentFactory();
    const agent = factory.getAgent(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
      });
    }

    const prompt = compact === 'true'
      ? agent.getCompactPrompt()
      : agent.getPrompt();

    res.json({
      success: true,
      data: {
        prompt,
        estimatedTokens: Math.ceil(prompt.length / 4),
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro buscando prompt:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/agents/:id/state
 * Retorna estado atual da state machine
 */
router.get('/:id/state', async (req, res) => {
  try {
    const { id } = req.params;
    const factory = getAgentFactory();
    const agent = factory.getAgent(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado',
      });
    }

    const sm = agent.getStateMachine();

    res.json({
      success: true,
      data: {
        currentState: sm.getCurrentState(),
        history: sm.history.slice(-10),
        context: sm.context,
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro buscando estado:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/agents/from-template
 * Cria agente a partir de template
 */
router.post('/from-template', async (req, res) => {
  try {
    const { templateId, overrides } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'templateId e obrigatorio',
      });
    }

    const factory = getAgentFactory();
    const agent = factory.createFromTemplate(templateId, overrides || {});

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        version: agent.version,
        createdAt: agent.createdAt,
        buildReport: agent.getBuildReport(),
      },
    });
  } catch (error) {
    console.error('[Agents API] Erro criando do template:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/templates
 * Lista templates disponiveis
 */
router.get('/templates/list', async (req, res) => {
  try {
    const factory = getAgentFactory();
    const templates = ['sdr-servicos', 'sdr-varejo', 'support-geral', 'scheduler-agenda'];

    const templateList = templates.map(id => ({
      id,
      template: factory.getTemplate(id),
    })).filter(t => t.template);

    res.json({
      success: true,
      data: templateList,
    });
  } catch (error) {
    console.error('[Agents API] Erro listando templates:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
