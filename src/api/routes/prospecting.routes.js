/**
 * @file prospecting.routes.js
 * @description Rotas de controle do Motor de Prospecção Automática
 *
 * Endpoints:
 * - POST /api/prospecting/start   - Inicia a prospecção automática
 * - POST /api/prospecting/stop    - Para a prospecção
 * - POST /api/prospecting/pause   - Pausa temporariamente
 * - POST /api/prospecting/resume  - Resume após pausa
 * - GET  /api/prospecting/status  - Status atual do engine
 * - GET  /api/prospecting/metrics - Métricas detalhadas
 * - GET  /api/prospecting/history - Histórico de prospecção
 * - POST /api/prospecting/config  - Atualiza configuração
 * - POST /api/prospecting/template - Define template de mensagem
 * - POST /api/prospecting/manual  - Prospecta lead manualmente
 * - POST /api/prospecting/test    - Modo teste (dry-run)
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import express from 'express';
import { prospectingEngine } from '../../automation/ProspectingEngine.js';
import { syncNow, getProspectSyncStatus, startProspectSyncJob, stopProspectSyncJob } from '../../services/ProspectSyncJob.js';
import { getProspectStats } from '../../services/ProspectImportService.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';
import log from '../../utils/logger-wrapper.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLE DO ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/prospecting/start
 * Inicia o motor de prospecção automática
 *
 * Body (opcional):
 * {
 *   "intervalMinutes": 5,      // Intervalo entre envios
 *   "maxPerDay": 100,          // Limite diário
 *   "startHour": 8,            // Hora início
 *   "endHour": 18,             // Hora fim
 *   "dryRun": false            // Modo teste
 * }
 */
router.post('/api/prospecting/start', optionalAuth, async (req, res) => {
  try {
    const config = req.body || {};
    const tenantId = extractTenantId(req);

    log.info('[API-PROSPECTING] Iniciando engine', config);

    const result = await prospectingEngine.start({ config, tenantId });

    if (result.success) {
      res.json({
        success: true,
        message: 'Prospecção automática iniciada',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        state: result.state
      });
    }

  } catch (error) {
    log.error('[API-PROSPECTING] Erro ao iniciar', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/stop
 * Para o motor de prospecção
 */
router.post('/api/prospecting/stop', optionalAuth, (req, res) => {
  try {
    log.info('[API-PROSPECTING] Parando engine');

    const result = prospectingEngine.stop();

    res.json({
      success: result.success,
      message: result.message || result.error,
      metrics: result.metrics
    });

  } catch (error) {
    log.error('[API-PROSPECTING] Erro ao parar', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/pause
 * Pausa temporariamente
 */
router.post('/api/prospecting/pause', optionalAuth, (req, res) => {
  try {
    log.info('[API-PROSPECTING] Pausando engine');

    const result = prospectingEngine.pause();

    res.json({
      success: result.success,
      message: result.message || result.error
    });

  } catch (error) {
    log.error('[API-PROSPECTING] Erro ao pausar', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/resume
 * Resume após pausa
 */
router.post('/api/prospecting/resume', optionalAuth, (req, res) => {
  try {
    log.info('[API-PROSPECTING] Resumindo engine');

    const result = prospectingEngine.resume();

    res.json({
      success: result.success,
      message: result.message || result.error
    });

  } catch (error) {
    log.error('[API-PROSPECTING] Erro ao resumir', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUS E MÉTRICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/prospecting/status
 * Status atual do engine
 */
router.get('/api/prospecting/status', optionalAuth, (req, res) => {
  try {
    const status = prospectingEngine.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/stats
 * Legacy alias for quick stats (frontend contract)
 */
router.get('/api/prospecting/stats', optionalAuth, (req, res) => {
  try {
    const status = prospectingEngine.getStatus();
    const metrics = prospectingEngine.getMetrics();

    res.set('Deprecation', 'true');
    res.set('Link', '</api/prospecting/metrics>; rel="successor-version"');
    res.json({
      success: true,
      pending: metrics.queueRemaining ?? status.queueSize ?? 0,
      sentToday: metrics.totalSent ?? 0,
      replies: 0,
      isRunning: status.state === 'running' || status.state === 'processing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/metrics
 * Métricas detalhadas
 */
router.get('/api/prospecting/metrics', optionalAuth, (req, res) => {
  try {
    const metrics = prospectingEngine.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/leads
 * Legacy alias for history list (frontend contract)
 */
router.get('/api/prospecting/leads', optionalAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = prospectingEngine.getHistory(limit);

    res.set('Deprecation', 'true');
    res.set('Link', '</api/prospecting/history>; rel="successor-version"');
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/history
 * Histórico de prospecção
 */
router.get('/api/prospecting/history', optionalAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = prospectingEngine.getHistory(limit);

    res.json({
      success: true,
      data: history,
      total: history.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/prospecting/config
 * Atualiza configuração do engine
 *
 * Body:
 * {
 *   "intervalMinutes": 5,
 *   "maxPerDay": 100,
 *   "startHour": 8,
 *   "endHour": 18,
 *   "workDays": [1,2,3,4,5],
 *   "cooldownHours": 24
 * }
 */
router.post('/api/prospecting/config', optionalAuth, (req, res) => {
  try {
    const newConfig = req.body;

    if (!newConfig || Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Configuração não fornecida'
      });
    }

    log.info('[API-PROSPECTING] Atualizando configuração', newConfig);

    const config = prospectingEngine.updateConfig(newConfig);

    res.json({
      success: true,
      message: 'Configuração atualizada',
      config
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/template
 * Define template de mensagem personalizado
 *
 * Body:
 * {
 *   "template": "Olá {empresa}! Somos da Digital Boost..."
 * }
 *
 * Variáveis disponíveis:
 * - {empresa} - Nome da empresa
 * - {cidade} - Cidade/Estado
 * - {segmento} - Segmento de atuação
 * - {nome} - Nome do contato (se disponível)
 */
router.post('/api/prospecting/template', optionalAuth, (req, res) => {
  try {
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Template não fornecido'
      });
    }

    log.info('[API-PROSPECTING] Atualizando template');

    prospectingEngine.setMessageTemplate(template);

    res.json({
      success: true,
      message: 'Template atualizado',
      template
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OPERAÇÕES MANUAIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/prospecting/manual
 * Prospecta um lead manualmente (fora da fila automática)
 *
 * Body:
 * {
 *   "phone": "84999999999"
 * }
 */
router.post('/api/prospecting/manual', optionalAuth, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Telefone não fornecido'
      });
    }

    log.info('[API-PROSPECTING] Prospecção manual', { phone });

    const result = await prospectingEngine.processManual(phone);

    if (result.success) {
      res.json({
        success: true,
        message: 'Lead prospectado com sucesso',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    log.error('[API-PROSPECTING] Erro na prospecção manual', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/test
 * Inicia em modo teste (dry-run) - não envia mensagens reais
 */
router.post('/api/prospecting/test', optionalAuth, async (req, res) => {
  try {
    const config = {
      ...req.body,
      dryRun: true,
      intervalMinutes: 0.1 // 6 segundos para teste
    };

    log.info('[API-PROSPECTING] Iniciando modo teste', config);

    const result = await prospectingEngine.start({ config });

    if (result.success) {
      res.json({
        success: true,
        message: 'Modo teste iniciado (dry-run)',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/reset
 * Reseta contadores diários
 */
router.post('/api/prospecting/reset', optionalAuth, (req, res) => {
  try {
    prospectingEngine.resetDailyCounters();

    res.json({
      success: true,
      message: 'Contadores resetados'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO SHEET1  SQLITE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/prospecting/sync/status
 * Status da sincronização automática
 */
router.get('/api/prospecting/sync/status', optionalAuth, (req, res) => {
  try {
    const status = getProspectSyncStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/sync/now
 * Força sincronização imediata
 */
router.post('/api/prospecting/sync/now', optionalAuth, async (req, res) => {
  try {
    log.info('[API-PROSPECTING] Sincronização manual solicitada');

    const result = await syncNow();

    res.json({
      success: result.success,
      message: result.success ? 'Sincronização concluída' : result.error,
      data: result
    });

  } catch (error) {
    log.error('[API-PROSPECTING] Erro na sincronização', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/prospects/stats
 * Estatísticas da tabela prospect_leads
 */
router.get('/api/prospecting/prospects/stats', optionalAuth, (req, res) => {
  try {
    const stats = getProspectStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
