/**
 * @file learning.routes.js
 * @description Rotas do sistema de aprendizado (Self-Learning)
 * Extraído de server.js (linhas 2340-2401)
 *
 * MELHORIAS v2.0:
 * - Métricas completas de todos os sistemas de inteligência
 * - Dashboard de aprendizado em tempo real
 * - Estatísticas de adaptação e padrões
 */

import express from 'express';
import conversationAnalytics from '../../learning/conversation_analytics.js';
import { getPatternApplier } from '../../intelligence/PatternApplier.js';
import { getRealTimeAdapter } from '../../intelligence/RealTimeAdapter.js';
import { getAutoOptimizer } from '../../intelligence/AutoOptimizer.js';
import { getFeedbackLoop } from '../../intelligence/FeedbackLoop.js';
import { getPromptAdaptationSystem } from '../../intelligence/PromptAdaptationSystem.js';
import { getDatabase } from '../../db/index.js';

const router = express.Router();

/**
 * GET /api/learning/report
 * Relatório de aprendizado do sistema
 */
router.get('/api/learning/report', async (req, res) => {
  try {
    const report = await conversationAnalytics.generateLearningReport();

    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' [LEARNING] Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/learning/patterns
 * Padrões de sucesso extraídos das conversas
 */
router.get('/api/learning/patterns', async (req, res) => {
  try {
    const patterns = await conversationAnalytics.extractSuccessfulPatterns(70);

    res.json({
      success: true,
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' [LEARNING] Erro ao buscar patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/learning/score/:contactId
 * Score de qualidade da conversa de um contato
 */
router.get('/api/learning/score/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const score = await conversationAnalytics.calculateConversationScore(contactId);

    res.json({
      success: true,
      contactId,
      score,
      level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' [LEARNING] Erro ao calcular score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOVAS ROTAS: MÉTRICAS COMPLETAS DE INTELIGÊNCIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/learning/intelligence/dashboard
 * Dashboard completo de todos os sistemas de inteligência
 */
router.get('/api/learning/intelligence/dashboard', async (req, res) => {
  try {
    const db = getDatabase();

    // 1. Estatísticas do PatternApplier
    const patternApplier = getPatternApplier();
    const patternStats = patternApplier.getStats();

    // 2. Estatísticas do RealTimeAdapter
    const realTimeAdapter = getRealTimeAdapter();
    const adaptationStats = realTimeAdapter.getStats();

    // 3. Estatísticas do AutoOptimizer
    let autoOptimizerStats = {};
    try {
      const autoOptimizer = getAutoOptimizer();
      autoOptimizerStats = autoOptimizer.getStatus();
    } catch (e) {
      autoOptimizerStats = { error: e.message };
    }

    // 4. Estatísticas do FeedbackLoop
    let feedbackStats = {};
    try {
      const feedbackLoop = getFeedbackLoop();
      feedbackStats = feedbackLoop.getStats();
    } catch (e) {
      feedbackStats = { error: e.message };
    }

    // 5. Estatísticas de A/B Testing
    let abTestStats = {};
    try {
      const promptAdaptation = getPromptAdaptationSystem();
      abTestStats = promptAdaptation.getStats();
    } catch (e) {
      abTestStats = { error: e.message };
    }

    // 6. Métricas do banco de dados
    const dbMetrics = {
      abandonmentPatterns: db.prepare('SELECT COUNT(*) as count FROM abandonment_patterns WHERE is_active = 1').get()?.count || 0,
      successPatterns: db.prepare('SELECT COUNT(*) as count FROM successful_patterns WHERE is_active = 1').get()?.count || 0,
      feedbackInsights: db.prepare('SELECT COUNT(*) as count FROM feedback_insights WHERE is_active = 1').get()?.count || 0,
      conversationOutcomes: db.prepare('SELECT COUNT(*) as count FROM conversation_outcomes').get()?.count || 0,
      realTimeAdaptations: db.prepare('SELECT COUNT(*) as count FROM real_time_adaptations').get()?.count || 0,
      patternUsages: db.prepare('SELECT COUNT(*) as count FROM pattern_usage_log').get()?.count || 0
    };

    // 7. Tendências recentes (últimas 24h)
    const recentTrends = {
      adaptationsLast24h: db.prepare(`
        SELECT COUNT(*) as count FROM real_time_adaptations
        WHERE created_at > datetime('now', '-24 hours')
      `).get()?.count || 0,
      successfulRecoveriesLast24h: db.prepare(`
        SELECT COUNT(*) as count FROM real_time_adaptations
        WHERE was_successful = 1 AND created_at > datetime('now', '-24 hours')
      `).get()?.count || 0,
      newPatternsLast24h: db.prepare(`
        SELECT COUNT(*) as count FROM abandonment_patterns
        WHERE created_at > datetime('now', '-24 hours')
      `).get()?.count || 0,
      conversationsLast24h: db.prepare(`
        SELECT COUNT(*) as count FROM conversation_outcomes
        WHERE recorded_at > datetime('now', '-24 hours')
      `).get()?.count || 0
    };

    // 8. Stage Health (saúde por estágio BANT)
    let stageHealth = [];
    try {
      stageHealth = db.prepare(`
        SELECT stage, health_score, success_rate, abandonment_rate, sample_size, updated_at
        FROM stage_health
        ORDER BY health_score ASC
        LIMIT 10
      `).all();
    } catch (e) {
      // Tabela pode não existir
    }

    res.json({
      success: true,
      dashboard: {
        patternApplier: patternStats,
        realTimeAdapter: adaptationStats,
        autoOptimizer: autoOptimizerStats,
        feedbackLoop: feedbackStats,
        abTesting: abTestStats,
        database: dbMetrics,
        trends: recentTrends,
        stageHealth
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEARNING] Erro no dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/learning/adaptations
 * Histórico de adaptações em tempo real
 */
router.get('/api/learning/adaptations', async (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 50;

    const adaptations = db.prepare(`
      SELECT
        id, contact_id, trigger_type, trigger_details,
        adaptation_applied, was_successful,
        created_at, resolved_at
      FROM real_time_adaptations
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    // Estatísticas por tipo de trigger
    const triggerStats = db.prepare(`
      SELECT
        trigger_type,
        COUNT(*) as total,
        SUM(was_successful) as successful
      FROM real_time_adaptations
      GROUP BY trigger_type
      ORDER BY total DESC
    `).all();

    res.json({
      success: true,
      adaptations,
      triggerStats,
      total: adaptations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEARNING] Erro ao buscar adaptações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/learning/abandonment-patterns
 * Padrões de abandono identificados
 */
router.get('/api/learning/abandonment-patterns', async (req, res) => {
  try {
    const db = getDatabase();

    const patterns = db.prepare(`
      SELECT
        id, pattern_name, trigger_stage, trigger_message_pattern,
        frequency, suggested_fix, prevention_instruction,
        severity, is_active, created_at
      FROM abandonment_patterns
      ORDER BY frequency DESC, severity DESC
      LIMIT 50
    `).all();

    res.json({
      success: true,
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEARNING] Erro ao buscar padrões de abandono:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/learning/patterns/refresh
 * Força refresh dos padrões em memória
 */
router.post('/api/learning/patterns/refresh', async (req, res) => {
  try {
    const patternApplier = getPatternApplier();
    const stats = await patternApplier.refresh();

    res.json({
      success: true,
      message: 'Padrões atualizados com sucesso',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEARNING] Erro ao atualizar padrões:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/learning/experiments
 * Experimentos A/B ativos e histórico
 */
router.get('/api/learning/experiments', async (req, res) => {
  try {
    const db = getDatabase();

    const experiments = db.prepare(`
      SELECT
        id, experiment_name, stage, status,
        variation_a_id, variation_b_id,
        winner, confidence, total_samples,
        created_at, completed_at
      FROM ab_experiments
      ORDER BY created_at DESC
      LIMIT 30
    `).all();

    // Estatísticas de A/B
    const abStats = {
      active: experiments.filter(e => e.status === 'active').length,
      completed: experiments.filter(e => e.status === 'completed').length,
      avgConfidence: experiments
        .filter(e => e.confidence)
        .reduce((sum, e) => sum + e.confidence, 0) / (experiments.filter(e => e.confidence).length || 1)
    };

    res.json({
      success: true,
      experiments,
      stats: abStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEARNING] Erro ao buscar experimentos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
