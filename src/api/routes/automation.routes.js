/**
 * @file automation.routes.js
 * @description Rotas da API para gerenciamento de automações
 * @version 1.0.0
 */

import express from 'express';
import { getAutomationEngine } from '../../automation/engine.js';
import { getDatabase } from '../../db/connection.js';
import { createLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = createLogger({ module: 'AutomationRoutes' });

// === AUTOMATIONS CRUD ===

/**
 * GET /api/automations
 * Lista todas as automações
 */
router.get('/api/automations', async (req, res) => {
  try {
    const db = getDatabase();
    const automations = db.prepare(`
      SELECT
        a.*,
        (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id) as total_executions,
        (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id AND status = 'success') as successful_executions
      FROM automations a
      ORDER BY a.created_at DESC
    `).all();

    // Parse JSON fields
    const parsed = automations.map(a => ({
      ...a,
      trigger: JSON.parse(a.trigger_config || '{}'),
      conditions: JSON.parse(a.conditions || '[]'),
      actions: JSON.parse(a.actions || '[]')
    }));

    res.json({
      success: true,
      automations: parsed,
      count: parsed.length
    });
  } catch (error) {
    logger.error('Failed to list automations', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/automations/:id
 * Busca uma automação específica
 */
router.get('/api/automations/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const automation = db.prepare('SELECT * FROM automations WHERE id = ?').get(req.params.id);

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }

    res.json({
      success: true,
      automation: {
        ...automation,
        trigger: JSON.parse(automation.trigger_config || '{}'),
        conditions: JSON.parse(automation.conditions || '[]'),
        actions: JSON.parse(automation.actions || '[]')
      }
    });
  } catch (error) {
    logger.error('Failed to get automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/automations
 * Cria uma nova automação
 */
router.post('/api/automations', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    const { name, description, trigger, conditions, actions, enabled, category } = req.body;

    if (!name || !trigger || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, trigger, actions'
      });
    }

    const id = await engine.addAutomation({
      name,
      description,
      trigger,
      conditions,
      actions,
      enabled,
      category
    });

    logger.info(`Created automation: ${name}`, { id });

    res.json({
      success: true,
      id,
      message: 'Automation created successfully'
    });
  } catch (error) {
    logger.error('Failed to create automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/automations/:id
 * Atualiza uma automação
 */
router.put('/api/automations/:id', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    const { name, description, trigger, conditions, actions, enabled, category } = req.body;

    await engine.updateAutomation(req.params.id, {
      name,
      description,
      trigger,
      conditions,
      actions,
      enabled,
      category
    });

    res.json({
      success: true,
      message: 'Automation updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/automations/:id
 * Remove uma automação
 */
router.delete('/api/automations/:id', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    await engine.removeAutomation(req.params.id);

    res.json({
      success: true,
      message: 'Automation deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/automations/:id/toggle
 * Habilita/desabilita uma automação
 */
router.post('/api/automations/:id/toggle', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    const { enabled } = req.body;

    await engine.toggleAutomation(req.params.id, enabled);

    res.json({
      success: true,
      message: `Automation ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    logger.error('Failed to toggle automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/automations/:id/run
 * Executa uma automação manualmente
 */
router.post('/api/automations/:id/run', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    const result = await engine.runManually(req.params.id);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Failed to run automation', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// === EXECUTION LOGS ===

/**
 * GET /api/automations/:id/executions
 * Lista execuções de uma automação
 */
router.get('/api/automations/:id/executions', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 50 } = req.query;

    const executions = db.prepare(`
      SELECT * FROM automation_executions
      WHERE automation_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `).all(req.params.id, parseInt(limit));

    res.json({
      success: true,
      executions: executions.map(e => ({
        ...e,
        results: JSON.parse(e.results || '[]')
      }))
    });
  } catch (error) {
    logger.error('Failed to list executions', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/automations/executions/recent
 * Lista execuções recentes de todas as automações
 */
router.get('/api/automations/executions/recent', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 100 } = req.query;

    const executions = db.prepare(`
      SELECT
        e.*,
        a.name as automation_name
      FROM automation_executions e
      JOIN automations a ON a.id = e.automation_id
      ORDER BY e.executed_at DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({
      success: true,
      executions: executions.map(e => ({
        ...e,
        results: JSON.parse(e.results || '[]')
      }))
    });
  } catch (error) {
    logger.error('Failed to list recent executions', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// === ENGINE STATUS ===

/**
 * GET /api/automations/engine/stats
 * Estatísticas do engine de automações
 */
router.get('/api/automations/engine/stats', async (req, res) => {
  try {
    const engine = getAutomationEngine();
    const stats = engine.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get engine stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/automations/engine/initialize
 * Inicializa o engine (se não estiver rodando)
 */
router.post('/api/automations/engine/initialize', async (req, res) => {
  try {
    const engine = getAutomationEngine();

    if (engine.isRunning) {
      return res.json({
        success: true,
        message: 'Engine already running'
      });
    }

    await engine.initialize();

    res.json({
      success: true,
      message: 'Engine initialized successfully'
    });
  } catch (error) {
    logger.error('Failed to initialize engine', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// === TEMPLATES ===

/**
 * GET /api/automations/templates
 * Lista templates de automação pré-configurados
 */
router.get('/api/automations/templates', async (req, res) => {
  const templates = [
    {
      id: 'lead_frio',
      name: 'Lead Frio - Follow-up 48h',
      description: 'Envia mensagem de follow-up para leads sem interação há 48h',
      category: 'quick_win',
      trigger: {
        type: 'schedule',
        cron: '0 9 * * *', // Todo dia às 9h
        target: 'leads'
      },
      conditions: [
        { field: 'ultimo_contato', operator: 'older_than', value: '48h' },
        { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado'] }
      ],
      actions: [
        {
          type: 'send_whatsapp',
          template: 'Olá {{nome}}! Tudo bem? Vi que conversamos recentemente sobre {{interesse}}. Gostaria de retomar nossa conversa e entender melhor como posso ajudar. Tem um momento hoje?'
        },
        {
          type: 'update_field',
          field: 'followup_count',
          operation: 'increment'
        },
        {
          type: 'log',
          message: 'Follow-up enviado para lead frio'
        }
      ]
    },
    {
      id: 'bant_timeout',
      name: 'BANT Timeout - 24h Parado',
      description: 'Notifica quando lead fica parado em estágio BANT por 24h',
      category: 'quick_win',
      trigger: {
        type: 'schedule',
        cron: '0 10 * * *', // Todo dia às 10h
        target: 'leads'
      },
      conditions: [
        { field: 'updated_at', operator: 'older_than', value: '24h' },
        { field: 'status', operator: 'equals', value: 'contatado' },
        { field: 'bant_score', operator: 'greater_than', value: 0 },
        { field: 'bant_score', operator: 'less_than', value: 70 }
      ],
      actions: [
        {
          type: 'send_notification',
          notification_type: 'warning',
          title: 'Lead parado no funil',
          message: '{{nome}} ({{empresa}}) está parado há 24h com score BANT {{bant_score}}%'
        },
        {
          type: 'create_task',
          title: 'Reativar lead: {{nome}}',
          description: 'Lead parado no estágio BANT. Score atual: {{bant_score}}%. Sugestão: fazer follow-up focado em {{bant_need}}',
          priority: 'high'
        }
      ]
    },
    {
      id: 'meeting_no_show',
      name: 'Meeting No-Show',
      description: 'Reage quando reunião não é realizada',
      category: 'quick_win',
      trigger: {
        type: 'schedule',
        cron: '0 18 * * *', // Todo dia às 18h
        target: 'meetings'
      },
      conditions: [
        { field: 'data_fim', operator: 'older_than', value: '1h' },
        { field: 'status', operator: 'equals', value: 'agendada' }
      ],
      actions: [
        {
          type: 'send_whatsapp',
          template: 'Olá {{nome}}! Percebi que não conseguimos nos conectar na reunião agendada. Entendo que imprevistos acontecem. Podemos reagendar para um horário mais conveniente?'
        },
        {
          type: 'update_field',
          field: 'status',
          value: 'no_show'
        },
        {
          type: 'send_notification',
          notification_type: 'warning',
          title: 'No-show em reunião',
          message: 'Reunião com {{nome}} não realizada'
        }
      ]
    },
    {
      id: 'high_score_alert',
      name: 'High Score Alert',
      description: 'Alerta imediato quando lead atinge score ≥80',
      category: 'quick_win',
      trigger: {
        type: 'event',
        event: 'lead_score_changed',
        target: 'leads'
      },
      conditions: [
        { field: 'bant_score', operator: 'greater_or_equal', value: 80 }
      ],
      actions: [
        {
          type: 'send_notification',
          notification_type: 'success',
          title: ' Lead quente identificado!',
          message: '{{nome}} ({{empresa}}) atingiu score {{bant_score}}%! Priorizar contato imediato.'
        },
        {
          type: 'update_field',
          field: 'priority',
          value: 'high'
        },
        {
          type: 'create_task',
          title: 'URGENTE: Contatar {{nome}}',
          description: 'Lead com score {{bant_score}}% - alta probabilidade de conversão. Ligar ou agendar reunião imediatamente.',
          priority: 'urgent'
        }
      ]
    },
    {
      id: 'nurturing_sequence',
      name: 'Sequência de Nurturing',
      description: 'Envia conteúdo educativo para leads em estágio inicial',
      category: 'nurturing',
      trigger: {
        type: 'schedule',
        cron: '0 14 * * 1,3,5', // Seg, Qua, Sex às 14h
        target: 'leads'
      },
      conditions: [
        { field: 'status', operator: 'equals', value: 'novo' },
        { field: 'created_at', operator: 'older_than', value: '3d' }
      ],
      actions: [
        {
          type: 'send_whatsapp',
          template: 'Olá {{nome}}! Preparei um conteúdo especial sobre {{interesse}} que pode te ajudar. Posso enviar?'
        },
        {
          type: 'update_field',
          field: 'nurturing_stage',
          operation: 'increment'
        }
      ]
    },
    {
      id: 'weekly_report',
      name: 'Relatório Semanal',
      description: 'Envia relatório de performance toda segunda-feira',
      category: 'reports',
      trigger: {
        type: 'schedule',
        cron: '0 8 * * 1', // Segunda às 8h
        target: 'leads'
      },
      conditions: [],
      actions: [
        {
          type: 'send_notification',
          notification_type: 'info',
          title: ' Relatório Semanal',
          message: 'Leads novos: {{count}}. Conversões: {{converted}}. Taxa: {{rate}}%'
        }
      ]
    }
  ];

  res.json({
    success: true,
    templates
  });
});

/**
 * POST /api/automations/templates/:templateId/install
 * Instala um template de automação
 */
router.post('/api/automations/templates/:templateId/install', async (req, res) => {
  try {
    const templates = {
      lead_frio: {
        name: 'Lead Frio - Follow-up 48h',
        description: 'Envia mensagem de follow-up para leads sem interação há 48h',
        category: 'quick_win',
        trigger: { type: 'schedule', cron: '0 9 * * *', target: 'leads' },
        conditions: [
          { field: 'ultimo_contato', operator: 'older_than', value: '48h' },
          { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado'] }
        ],
        actions: [
          { type: 'send_whatsapp', template: 'Olá {{nome}}! Tudo bem? Vi que conversamos recentemente. Gostaria de retomar nossa conversa. Tem um momento hoje?' },
          { type: 'update_field', field: 'followup_count', operation: 'increment' }
        ]
      },
      bant_timeout: {
        name: 'BANT Timeout - 24h Parado',
        description: 'Notifica quando lead fica parado em estágio BANT por 24h',
        category: 'quick_win',
        trigger: { type: 'schedule', cron: '0 10 * * *', target: 'leads' },
        conditions: [
          { field: 'updated_at', operator: 'older_than', value: '24h' },
          { field: 'status', operator: 'equals', value: 'contatado' },
          { field: 'bant_score', operator: 'greater_than', value: 0 },
          { field: 'bant_score', operator: 'less_than', value: 70 }
        ],
        actions: [
          { type: 'send_notification', notification_type: 'warning', title: 'Lead parado no funil', message: '{{nome}} está parado há 24h com score {{bant_score}}%' },
          { type: 'create_task', title: 'Reativar lead: {{nome}}', description: 'Lead parado. Score: {{bant_score}}%', priority: 'high' }
        ]
      },
      meeting_no_show: {
        name: 'Meeting No-Show',
        description: 'Reage quando reunião não é realizada',
        category: 'quick_win',
        trigger: { type: 'schedule', cron: '0 18 * * *', target: 'meetings' },
        conditions: [
          { field: 'data_fim', operator: 'older_than', value: '1h' },
          { field: 'status', operator: 'equals', value: 'agendada' }
        ],
        actions: [
          { type: 'send_whatsapp', template: 'Olá! Percebi que não conseguimos nos conectar. Podemos reagendar?' },
          { type: 'update_field', field: 'status', value: 'no_show' }
        ]
      },
      high_score_alert: {
        name: 'High Score Alert',
        description: 'Alerta quando lead atinge score ≥80',
        category: 'quick_win',
        trigger: { type: 'event', event: 'lead_score_changed', target: 'leads' },
        conditions: [
          { field: 'bant_score', operator: 'greater_or_equal', value: 80 }
        ],
        actions: [
          { type: 'send_notification', notification_type: 'success', title: ' Lead quente!', message: '{{nome}} atingiu score {{bant_score}}%!' },
          { type: 'create_task', title: 'URGENTE: Contatar {{nome}}', priority: 'urgent' }
        ]
      }
    };

    const template = templates[req.params.templateId];
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const engine = getAutomationEngine();
    const id = await engine.addAutomation(template);

    res.json({
      success: true,
      id,
      message: `Template "${template.name}" installed successfully`
    });
  } catch (error) {
    logger.error('Failed to install template', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
