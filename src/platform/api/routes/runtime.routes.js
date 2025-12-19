/**
 * RUNTIME API ROUTES
 * Rotas para processamento de mensagens em tempo real
 */

import { Router } from 'express';
import { getRuntimeAdapter } from '../RuntimeAdapter.js';
import { getAgentFactory } from '../../AgentFactory.js';

const router = Router();

/**
 * POST /api/platform/runtime/process
 * Processa mensagem usando agente
 */
router.post('/process', async (req, res) => {
  try {
    const {
      agentId,
      conversationId,
      contactId,
      message,
      channel = 'whatsapp',
      conversationHistory = [],
      existingState = null,
    } = req.body;

    // Validacao
    if (!agentId || !message) {
      return res.status(400).json({
        success: false,
        error: 'agentId e message sao obrigatorios',
      });
    }

    const adapter = getRuntimeAdapter();
    const result = await adapter.processMessage({
      agentId,
      conversationId: conversationId || `conv_${Date.now()}`,
      contactId: contactId || 'unknown',
      message,
      channel,
      conversationHistory,
      existingState,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Runtime API] Erro processando mensagem:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/runtime/chat
 * Endpoint simplificado para chat (compativel com frontend)
 */
router.post('/chat', async (req, res) => {
  try {
    const { agentId, message, sessionId, history = [] } = req.body;

    if (!agentId || !message) {
      return res.status(400).json({
        success: false,
        error: 'agentId e message sao obrigatorios',
      });
    }

    const adapter = getRuntimeAdapter();
    const result = await adapter.processMessage({
      agentId,
      conversationId: sessionId || `session_${Date.now()}`,
      contactId: 'webchat_user',
      message,
      channel: 'webchat',
      conversationHistory: history,
    });

    res.json({
      success: true,
      response: result.response,
      state: result.currentState,
      score: result.leadScore,
      suggestions: result.suggestedQuestions,
    });
  } catch (error) {
    console.error('[Runtime API] Erro no chat:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/runtime/simulate
 * Simula conversa completa para testes
 */
router.post('/simulate', async (req, res) => {
  try {
    const { agentId, messages } = req.body;

    if (!agentId || !messages?.length) {
      return res.status(400).json({
        success: false,
        error: 'agentId e messages[] sao obrigatorios',
      });
    }

    const adapter = getRuntimeAdapter();
    const results = [];
    let currentState = null;
    const history = [];

    for (const msg of messages) {
      const result = await adapter.processMessage({
        agentId,
        conversationId: `sim_${Date.now()}`,
        contactId: 'simulator',
        message: msg,
        channel: 'simulator',
        conversationHistory: history,
        existingState: currentState,
      });

      results.push({
        input: msg,
        output: result.response,
        state: result.currentState,
        score: result.leadScore,
      });

      // Atualiza para proxima iteracao
      currentState = result.state;
      history.push(
        { role: 'user', content: msg },
        { role: 'assistant', content: result.response }
      );
    }

    res.json({
      success: true,
      data: {
        simulation: results,
        finalState: currentState,
        totalMessages: messages.length,
      },
    });
  } catch (error) {
    console.error('[Runtime API] Erro na simulacao:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/runtime/states
 * Lista estados disponiveis da state machine SDR
 */
router.get('/states', async (req, res) => {
  try {
    const { SDR_STATES } = await import('../../runtime/state_machines/SDRStateMachine.js');

    const states = Object.entries(SDR_STATES).map(([id, state]) => ({
      id,
      name: state.name,
      description: state.description,
      goals: state.goals,
      spinStage: state.spinStage,
      bantCriteria: state.bantCriteria,
      allowedTransitions: state.allowedTransitions,
    }));

    res.json({
      success: true,
      data: states,
    });
  } catch (error) {
    console.error('[Runtime API] Erro listando estados:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/runtime/qualify
 * Calcula score de qualificacao
 */
router.post('/qualify', async (req, res) => {
  try {
    const { bantData } = req.body;

    if (!bantData) {
      return res.status(400).json({
        success: false,
        error: 'bantData e obrigatorio',
      });
    }

    const { calculateBANTScore, classifyLead } = await import('../../templates/playbooks/bant.playbook.js');

    const score = calculateBANTScore(bantData);
    const classification = classifyLead(score);

    res.json({
      success: true,
      data: {
        score,
        classification,
        bantData,
      },
    });
  } catch (error) {
    console.error('[Runtime API] Erro qualificando:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/runtime/extract
 * Extrai dados estruturados de mensagem
 */
router.post('/extract', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message e obrigatoria',
      });
    }

    const adapter = getRuntimeAdapter();
    const extracted = adapter.extractData(message);

    res.json({
      success: true,
      data: extracted,
    });
  } catch (error) {
    console.error('[Runtime API] Erro extraindo dados:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/platform/runtime/questions/:stage
 * Retorna perguntas sugeridas por estagio
 */
router.get('/questions/:stage', async (req, res) => {
  try {
    const { stage } = req.params;
    const { vertical = 'geral' } = req.query;

    const { getSPINQuestions } = await import('../../templates/playbooks/spin-selling.playbook.js');
    const { BANT_QUESTIONS } = await import('../../templates/playbooks/bant.playbook.js');

    let questions = [];

    // SPIN stages
    if (['situation', 'problem', 'implication', 'needPayoff'].includes(stage)) {
      questions = getSPINQuestions(stage, vertical);
    }
    // BANT criteria
    else if (['budget', 'authority', 'need', 'timeline'].includes(stage)) {
      questions = BANT_QUESTIONS[stage] || [];
    }

    res.json({
      success: true,
      data: {
        stage,
        vertical,
        questions,
      },
    });
  } catch (error) {
    console.error('[Runtime API] Erro buscando perguntas:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/platform/runtime/webhook
 * Webhook para integracao com sistemas externos (Evolution, etc)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log(`[Runtime Webhook] Evento: ${event}`);

    // Processa diferentes tipos de eventos
    switch (event) {
      case 'messages.upsert':
        // Mensagem recebida - processa com agente
        // Aqui integraria com o webhook_handler existente
        break;

      case 'connection.update':
        // Status da conexao
        break;

      default:
        console.log(`[Runtime Webhook] Evento nao tratado: ${event}`);
    }

    res.json({ success: true, received: event });
  } catch (error) {
    console.error('[Runtime Webhook] Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
