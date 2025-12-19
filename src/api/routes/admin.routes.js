/**
 * @file admin.routes.js
 * @description Rotas de administração e monitoramento do sistema
 * Extraído de server.js (linhas 545-853)
 */

import express from 'express';
import webhookHandler from '../../handlers/webhook_handler.js';
import { getUnifiedCoordinator } from '../../handlers/UnifiedMessageCoordinator.js';
import persistenceManager from '../../handlers/persistence_manager.js';
import audioProcessor from '../../handlers/audio_processor.js';
import globalErrorHandler from '../../utils/error_handler.js';
import { serverStats } from '../../config/express.config.js';

const coordinator = getUnifiedCoordinator();

const router = express.Router();

// === SYSTEM STATUS ENDPOINTS ===

/**
 * GET /api/health
 * Status geral do sistema com estatísticas de todos os handlers
 */
router.get('/api/health', async (req, res) => {
  try {
    const webhookStats = webhookHandler.getStats();
    const coordinatorStats = coordinator.getStats();
    const persistenceStats = persistenceManager.getStats();
    const audioStats = audioProcessor.getStats();

    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - serverStats.startTime;

    res.json({
      status: 'healthy',
      server: 'LEADLY-v2-Refactored',
      uptime: Math.floor(uptime / 1000),
      stats: serverStats,
      handlers: {
        webhook: webhookStats,
        coordinator: coordinatorStats,
        persistence: persistenceStats,
        audioProcessor: audioStats
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/stats
 * Estatísticas detalhadas do sistema
 */
router.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      server: serverStats,
      webhook: webhookHandler.getStats(),
      coordinator: coordinator.getStats(),
      persistence: persistenceManager.getStats(),
      performance: {
        averageProcessingTime: serverStats.messagesProcessed > 0
          ? Math.round((Date.now() - serverStats.startTime) / serverStats.messagesProcessed)
          : 0,
        successRate: serverStats.messagesProcessed > 0
          ? ((serverStats.messagesProcessed - serverStats.errors) / serverStats.messagesProcessed * 100).toFixed(2) + '%'
          : '100%',
        requestsPerMinute: Math.round(serverStats.totalRequests / ((Date.now() - serverStats.startTime) / 60000))
      }
    };

    res.json(stats);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === CACHE MANAGEMENT ENDPOINTS ===

/**
 * POST /api/admin/clear-cache
 * Limpar caches de todos os handlers
 */
router.post('/api/admin/clear-cache', async (req, res) => {
  try {
    const results = {
      webhook: webhookHandler.clearCache(),
      coordinator: coordinator.emergencyCleanup(),
      persistence: persistenceManager.clearQueue()
    };

    res.json({
      success: true,
      message: 'Caches limpos com sucesso',
      details: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// === HANDLERS HEALTH ENDPOINTS ===

/**
 * GET /api/admin/handlers-health
 * Verificar saúde de todos os handlers
 */
router.get('/api/admin/handlers-health', async (req, res) => {
  try {
    const coordinatorStats = coordinator.getStats();
    const health = {
      coordinator: {
        healthy: coordinatorStats.successRate > 95,
        stats: coordinatorStats
      },
      persistence: await persistenceManager.healthCheck()
    };

    const allHealthy = Object.values(health).every(h => h.healthy);

    res.json({
      overall: allHealthy ? 'healthy' : 'degraded',
      details: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      overall: 'error',
      error: error.message
    });
  }
});

// === GLOBAL ERROR HANDLER ENDPOINTS ===

/**
 * GET /api/admin/system-health
 * Status de saúde do sistema via error handler
 */
router.get('/api/admin/system-health', async (req, res) => {
  try {
    const health = globalErrorHandler.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/error-stats
 * Estatísticas de erros do sistema
 */
router.get('/api/admin/error-stats', async (req, res) => {
  try {
    const stats = globalErrorHandler.getErrorStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/clear-old-errors
 * Limpar logs de erros antigos
 */
router.post('/api/admin/clear-old-errors', async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    globalErrorHandler.clearOldLogs(maxAgeMs);

    res.json({
      success: true,
      message: `Logs mais antigos que ${maxAgeHours}h foram removidos`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// === MESSAGE COORDINATOR ADMIN ENDPOINTS ===

/**
 * GET /api/admin/coordinator/stats
 * Estatísticas detalhadas do unified message coordinator
 */
router.get('/api/admin/coordinator/stats', async (req, res) => {
  try {
    const stats = coordinator.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/coordinator/emergency-cleanup
 * Limpar todos os caches e contatos ativos (emergência)
 */
router.post('/api/admin/coordinator/emergency-cleanup', async (req, res) => {
  try {
    const result = coordinator.emergencyCleanup();
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NOTE: As rotas específicas de fila por contato foram removidas.
// O UnifiedMessageCoordinator gerencia filas internamente de forma automática.
// Use GET /api/admin/coordinator/stats para ver todas as métricas.

// === AUDIO PROCESSING ENDPOINTS ===

/**
 * GET /api/admin/audio/stats
 * Estatísticas de processamento de áudio
 */
router.get('/api/admin/audio/stats', async (req, res) => {
  try {
    const stats = audioProcessor.getStats();
    res.json({
      status: 'success',
      audioProcessing: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audio/status/:messageId
 * Status de transcrição de um áudio específico
 */
router.get('/api/admin/audio/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = audioProcessor.getTranscriptionStatus(messageId);
    res.json({
      messageId,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === CONTEXT MANAGEMENT ENDPOINTS ===

/**
 * GET /api/admin/context/stats
 * Estatísticas do gerenciador de contexto
 */
router.get('/api/admin/context/stats', async (req, res) => {
  try {
    const { default: contextManager } = await import('../../tools/context_manager.js');
    const stats = await contextManager.getStats();

    res.json({
      status: 'success',
      contextManager: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
