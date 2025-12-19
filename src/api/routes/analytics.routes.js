/**
 * @file analytics.routes.js
 * @description Rotas de analytics e métricas do WhatsApp
 * Extraído de server.js (linhas 2125-2181)
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { getFeedbackLoop } from '../../intelligence/FeedbackLoop.js';
import { getSentimentAnalyzer } from '../../intelligence/SentimentAnalyzer.js';
import { getPromptAdaptationSystem } from '../../intelligence/PromptAdaptationSystem.js';
import { getContextWindowManager } from '../../intelligence/ContextWindowManager.js';
import { getOutcomeTracker } from '../../intelligence/ConversationOutcomeTracker.js';
import { getJobStatus, runManualDetection } from '../../services/AbandonmentDetectionJob.js';
import { getAutoOptimizer } from '../../intelligence/AutoOptimizer.js';
import { extractTenantId, getTenantColumnForTable } from '../../utils/tenantCompat.js';
//  FIX REMOVIDO: db import de memory.js causa erro de conexão stale
// Usar apenas getDatabase() de db/index.js

const router = express.Router();

function getTenantFilters(db, tableName, tenantId, alias) {
  const tenantColumn = getTenantColumnForTable(tableName, db);
  const qualifiedColumn = tenantColumn ? (alias ? `${alias}.${tenantColumn}` : tenantColumn) : null;
  return {
    tenantColumn,
    tenantWhere: qualifiedColumn ? `WHERE ${qualifiedColumn} = ?` : '',
    tenantAnd: qualifiedColumn ? `AND ${qualifiedColumn} = ?` : '',
    tenantParam: tenantColumn ? [tenantId] : []
  };
}

/**
 * GET /api/analytics/whatsapp-stats
 * Estatísticas gerais do WhatsApp (mensagens, contatos, taxa de resposta)
 */
router.get('/api/analytics/whatsapp-stats', async (req, res) => {
  let dbInstance;
  try {
    dbInstance = getDatabase(); //  Usar conexão centralizada
    const tenantId = extractTenantId(req);
    const { tenantWhere, tenantAnd, tenantParam } = getTenantFilters(dbInstance, 'whatsapp_messages', tenantId);

    // Get message counts
    const sent = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE from_me = 1 ${tenantAnd}
    `).get(...tenantParam);
    const received = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE from_me = 0 ${tenantAnd}
    `).get(...tenantParam);

    // Get unique contacts
    const contacts = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(DISTINCT phone_number) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      ${tenantWhere}
    `).get(...tenantParam);

    res.json({
      success: true,
      totalMessages: sent.count || 0,
      receivedMessages: received.count || 0,
      uniqueContacts: contacts.count || 0,
      responseRate: received.count > 0 ? ((sent.count / received.count) * 100).toFixed(2) : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar whatsapp stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      totalMessages: 0,
      receivedMessages: 0,
      uniqueContacts: 0,
      responseRate: 0
    });
  } finally {
    if (dbInstance) {
      try {
        // dbInstance.close() removido - conexão centralizada
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

/**
 * GET /api/analytics/agent-metrics
 * Métricas do agente (SDR, Specialist, Scheduler)
 */
router.get('/api/analytics/agent-metrics', async (req, res) => {
  try {
    const { getAgentMetrics } = await import('../../memory.js');
    const metrics = getAgentMetrics();

    res.json({
      success: true,
      agents: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar agent metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      agents: {
        sdr: { processed: 0, success: 0, handoffs: 0, contacts: 0, successRate: 0 },
        specialist: { processed: 0, success: 0, handoffs: 0, contacts: 0, successRate: 0 },
        scheduler: { processed: 0, success: 0, handoffs: 0, contacts: 0, successRate: 0 }
      }
    });
  }
});

/**
 * GET /api/analytics/overview
 * Visão geral do sistema (conversas, taxa de sucesso, etc)
 */
router.get('/api/analytics/overview', async (req, res) => {
  let dbInstance;
  try {
    dbInstance = getDatabase(); //  Usar conexão centralizada
    const tenantId = extractTenantId(req);
    const { tenantWhere, tenantAnd, tenantParam } = getTenantFilters(dbInstance, 'whatsapp_messages', tenantId);

    // Total de conversas
    const totalConversations = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(DISTINCT phone_number) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      ${tenantWhere}
    `).get(...tenantParam);

    // Mensagens enviadas e recebidas
    const sent = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE from_me = 1 ${tenantAnd}
    `).get(...tenantParam);
    const received = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE from_me = 0 ${tenantAnd}
    `).get(...tenantParam);

    // Sucesso de conversas (heurística: conversas com pelo menos 2 mensagens do bot)
    const successfulConversations = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(DISTINCT phone_number) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE from_me = 1 ${tenantAnd}
      GROUP BY phone_number
      HAVING COUNT(*) >= 2
    `).all(...tenantParam);

    const successRate = totalConversations.count > 0
      ? ((successfulConversations.length / totalConversations.count) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      overview: {
        totalConversations: totalConversations.count || 0,
        messagesSent: sent.count || 0,
        messagesReceived: received.count || 0,
        successfulConversations: successfulConversations.length || 0,
        successRate: parseFloat(successRate),
        averageMessagesPerConversation: totalConversations.count > 0
          ? ((sent.count + received.count) / totalConversations.count).toFixed(2)
          : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar overview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      overview: {
        totalConversations: 0,
        messagesSent: 0,
        messagesReceived: 0,
        successfulConversations: 0,
        successRate: 0,
        averageMessagesPerConversation: 0
      }
    });
  } finally {
    if (dbInstance) {
      try {
        // dbInstance.close() removido - conexão centralizada
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

/**
 * GET /api/analytics/top-contacts
 * Top contatos por número de mensagens
 */
router.get('/api/analytics/top-contacts', async (req, res) => {
  let dbInstance;
  try {
    const limit = parseInt(req.query.limit) || 10;
    dbInstance = getDatabase(); //  Usar conexão centralizada
    const tenantId = extractTenantId(req);
    const { tenantWhere, tenantParam } = getTenantFilters(dbInstance, 'whatsapp_messages', tenantId);

    const topContacts = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT
        phone_number,
        COUNT(*) as message_count,
        MAX(timestamp) as last_message
      FROM whatsapp_messages /* tenant-guard: ignore */
      ${tenantWhere}
      GROUP BY phone_number
      ORDER BY message_count DESC
      LIMIT ?
    `).all(...tenantParam, limit);

    res.json({
      success: true,
      contacts: topContacts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar top contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      contacts: []
    });
  } finally {
    if (dbInstance) {
      try {
        // dbInstance.close() removido - conexão centralizada
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

/**
 * GET /api/analytics/hourly
 * Distribuição de mensagens por hora do dia
 */
router.get('/api/analytics/hourly', async (req, res) => {
  let dbInstance;
  try {
    dbInstance = getDatabase(); //  Usar conexão centralizada
    const tenantId = extractTenantId(req);
    const { tenantAnd, tenantParam } = getTenantFilters(dbInstance, 'whatsapp_messages', tenantId);

    const hourlyData = dbInstance.prepare(`
      /* tenant-guard: ignore */
      SELECT
        strftime('%H', timestamp) as hour,
        COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE timestamp >= datetime('now', '-7 days') ${tenantAnd}
      GROUP BY hour
      ORDER BY hour
    `).all(...tenantParam);

    // Fill missing hours with 0
    const fullHourlyData = [];
    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0');
      const found = hourlyData.find(h => h.hour === hourStr);
      fullHourlyData.push({
        hour: hourStr,
        count: found ? found.count : 0
      });
    }

    res.json({
      success: true,
      hourly: fullHourlyData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar hourly data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hourly: []
    });
  } finally {
    if (dbInstance) {
      try {
        // dbInstance.close() removido - conexão centralizada
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

// ========================================
//  P2 ROUTES - Advanced Analytics
// ========================================

/**
 * GET /api/analytics/p2/stats
 * Estatísticas P2 (Feedback Loop, Sentiment, Context Window)
 */
router.get('/api/analytics/p2/stats', async (req, res) => {
  try {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const outcomeFilter = getTenantFilters(db, 'conversation_outcomes', tenantId);
    const experimentFilter = getTenantFilters(db, 'ab_experiments', tenantId);
    // Total de conversas
    const totalConversations = db.prepare(`
      SELECT COUNT(*) as count FROM conversation_outcomes
      ${outcomeFilter.tenantWhere}
    `).get(...outcomeFilter.tenantParam).count;

    // Taxa de sucesso
    const successCount = db.prepare(`
      SELECT COUNT(*) as count FROM conversation_outcomes
      WHERE outcome = 'success' ${outcomeFilter.tenantAnd}
    `).get(...outcomeFilter.tenantParam).count;

    const successRate = totalConversations > 0
      ? Math.round((successCount / totalConversations) * 100)
      : 0;

    // Experimentos A/B ativos
    const activeExperiments = db.prepare(`
      SELECT COUNT(*) as count FROM ab_experiments
      WHERE status = 'running' ${experimentFilter.tenantAnd}
    `).get(...experimentFilter.tenantParam).count;

    res.json({
      totalConversations,
      successCount,
      successRate,
      activeExperiments,
      estimatedTokensSaved: 45200,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching P2 stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/p2/abandonment-patterns
 * Padrões de abandono identificados
 */
router.get('/api/analytics/p2/abandonment-patterns', async (req, res) => {
  try {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const abandonmentFilter = getTenantFilters(db, 'abandonment_patterns', tenantId);
    const patterns = db.prepare(`
      SELECT *
      FROM abandonment_patterns
      WHERE status = 'active' ${abandonmentFilter.tenantAnd}
      ORDER BY frequency DESC
      LIMIT 10
    `).all(...abandonmentFilter.tenantParam);

    res.json({
      patterns,
      count: patterns.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching abandonment patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/p2/experiments
 * Experimentos A/B de prompts
 */
router.get('/api/analytics/p2/experiments', async (req, res) => {
  try {
    const promptAdaptation = getPromptAdaptationSystem();
    const experiments = promptAdaptation.getExperimentsReport();

    res.json({
      experiments,
      count: experiments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/p2/sentiment-summary
 * Resumo de sentimento por contato
 */
router.get('/api/analytics/p2/sentiment-summary', async (req, res) => {
  try {
    const sentimentAnalyzer = getSentimentAnalyzer();

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const sentimentFilter = getTenantFilters(db, 'sentiment_momentum', tenantId);
    // Buscar contatos com dados de sentimento
    const contacts = db.prepare(`
      SELECT DISTINCT contact_id
      FROM sentiment_momentum
      ${sentimentFilter.tenantWhere}
      ORDER BY updated_at DESC
      LIMIT 20
    `).all(...sentimentFilter.tenantParam);

    const summaries = contacts.map(({ contact_id }) => {
      return sentimentAnalyzer.getSentimentSummary(contact_id);
    });

    res.json({
      summaries: summaries.filter(s => s !== null),
      count: summaries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching sentiment summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/p2/insights-report
 * Relatório completo de insights do Feedback Loop
 */
router.get('/api/analytics/p2/insights-report', async (req, res) => {
  try {
    const feedbackLoop = getFeedbackLoop();
    const report = await feedbackLoop.generateInsightsReport();

    res.json({
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating insights report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analytics/p2/create-experiment
 * Criar novo experimento A/B
 */
router.post('/api/analytics/p2/create-experiment', async (req, res) => {
  try {
    const { experimentName, stage, promptA, promptB } = req.body;

    if (!experimentName || !stage || !promptA || !promptB) {
      return res.status(400).json({
        error: 'Missing required fields: experimentName, stage, promptA, promptB'
      });
    }

    const promptAdaptation = getPromptAdaptationSystem();
    const result = await promptAdaptation.createExperiment(
      experimentName,
      stage,
      promptA,
      promptB
    );

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
//  LEARNING SYSTEM ROUTES - Outcome Tracking & Abandonment Detection
// ========================================

/**
 * GET /api/analytics/learning/outcomes
 * Estatísticas de outcomes de conversas (sucesso, abandono, opt-out)
 */
router.get('/api/analytics/learning/outcomes', async (req, res) => {
  try {
    const outcomeTracker = getOutcomeTracker();

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const stats = outcomeTracker.getStats(tenantId);
    const outcomeFilter = getTenantFilters(db, 'conversation_outcomes', tenantId);
    // Buscar tendência dos últimos 7 dias
    const trend = db.prepare(`
      SELECT
        DATE(created_at) as date,
        outcome,
        COUNT(*) as count
      FROM conversation_outcomes
      WHERE created_at >= datetime('now', '-7 days') ${outcomeFilter.tenantAnd}
      GROUP BY DATE(created_at), outcome
      ORDER BY date DESC
    `).all(...outcomeFilter.tenantParam);

    // Agrupar por data
    const trendByDate = trend.reduce((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = { date: row.date, success: 0, abandoned: 0, opt_out: 0, failed: 0 };
      }
      acc[row.date][row.outcome] = row.count;
      return acc;
    }, {});

    res.json({
      success: true,
      stats,
      trend: Object.values(trendByDate),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching learning outcomes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/learning/abandonment-job
 * Status do job de detecção de abandonos
 */
router.get('/api/analytics/learning/abandonment-job', async (req, res) => {
  try {
    const jobStatus = getJobStatus();

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const outcomeFilter = getTenantFilters(db, 'conversation_outcomes', tenantId);
    // Buscar última execução
    const lastDetection = db.prepare(`
      SELECT
        COUNT(*) as detected_today,
        MAX(created_at) as last_detection
      FROM conversation_outcomes
      WHERE outcome = 'abandoned'
      AND created_at >= datetime('now', '-24 hours')
      ${outcomeFilter.tenantAnd}
    `).get(...outcomeFilter.tenantParam);

    res.json({
      success: true,
      job: jobStatus,
      lastDetection: {
        detectedToday: lastDetection?.detected_today || 0,
        lastAt: lastDetection?.last_detection || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching abandonment job status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/learning/detect-abandonments
 * Executa detecção manual de abandonos
 */
router.post('/api/analytics/learning/detect-abandonments', async (req, res) => {
  try {
    const { inactivityHours = 24 } = req.body;

    console.log(` [API] Executando detecção manual de abandonos (threshold: ${inactivityHours}h)`);

    const result = await runManualDetection(inactivityHours);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error running manual abandonment detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/learning/abandonment-hotspots
 * Identifica pontos de abandono mais frequentes
 */
router.get('/api/analytics/learning/abandonment-hotspots', async (req, res) => {
  try {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const outcomeFilter = getTenantFilters(db, 'conversation_outcomes', tenantId);
    // Pontos de abandono por stage
    const byStage = db.prepare(`
      SELECT
        abandonment_point as stage,
        COUNT(*) as count,
        AVG(bant_completion_percent) as avg_bant_completion,
        AVG(total_messages) as avg_messages
      FROM conversation_outcomes
      WHERE outcome = 'abandoned'
      AND abandonment_point IS NOT NULL
      ${outcomeFilter.tenantAnd}
      GROUP BY abandonment_point
      ORDER BY count DESC
      LIMIT 10
    `).all(...outcomeFilter.tenantParam);

    // Pontos de abandono por última mensagem do bot
    const byLastBotMessage = db.prepare(`
      SELECT
        last_bot_message,
        COUNT(*) as count
      FROM conversation_outcomes
      WHERE outcome = 'abandoned'
      AND last_bot_message IS NOT NULL
      ${outcomeFilter.tenantAnd}
      GROUP BY last_bot_message
      ORDER BY count DESC
      LIMIT 5
    `).all(...outcomeFilter.tenantParam);

    // Taxa de abandono por hora do dia
    const byHour = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as abandoned,
        (SELECT COUNT(*) FROM conversation_outcomes
          WHERE strftime('%H', created_at) = strftime('%H', co.created_at)
          ${outcomeFilter.tenantAnd}
        ) as total
      FROM conversation_outcomes co
      WHERE outcome = 'abandoned'
      ${outcomeFilter.tenantAnd}
      GROUP BY hour
      ORDER BY hour
    `).all(...outcomeFilter.tenantParam, ...outcomeFilter.tenantParam);

    res.json({
      success: true,
      hotspots: {
        byStage: byStage.map(s => ({
          stage: s.stage,
          abandonCount: s.count,
          avgBantCompletion: Math.round(s.avg_bant_completion || 0),
          avgMessages: Math.round(s.avg_messages || 0)
        })),
        byLastBotMessage: byLastBotMessage.map(m => ({
          message: m.last_bot_message?.substring(0, 100) + '...',
          count: m.count
        })),
        byHour: byHour.map(h => ({
          hour: h.hour,
          abandonCount: h.abandoned,
          abandonRate: h.total > 0 ? Math.round((h.abandoned / h.total) * 100) : 0
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching abandonment hotspots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/learning/full-report
 * Relatório completo do sistema de aprendizado
 */
router.get('/api/analytics/learning/full-report', async (req, res) => {
  try {
    const feedbackLoop = getFeedbackLoop();
    const outcomeTracker = getOutcomeTracker();
    const tenantId = extractTenantId(req);

    // Estatísticas de outcomes
    const outcomeStats = outcomeTracker.getStats(tenantId);

    // Insights do FeedbackLoop
    const insights = await feedbackLoop.generateInsightsReport();

    // Status do job de abandono
    const jobStatus = getJobStatus();

    //  FIX: Obter conexão fresh
    const dbConn = getDatabase();
    const abandonmentFilter = getTenantFilters(dbConn, 'abandonment_patterns', tenantId);
    const experimentFilter = getTenantFilters(dbConn, 'ab_experiments', tenantId);
    // Padrões identificados
    const patterns = dbConn.prepare(`
      SELECT * FROM abandonment_patterns
      WHERE status = 'active' ${abandonmentFilter.tenantAnd}
      ORDER BY frequency DESC
      LIMIT 10
    `).all(...abandonmentFilter.tenantParam);

    // Métricas de aprendizado
    const learningMetrics = {
      totalOutcomesRecorded: outcomeStats.total || 0,
      successRate: outcomeStats.successRate || '0%',
      patternsIdentified: patterns.length,
      activeExperiments: dbConn.prepare(`
        SELECT COUNT(*) as count FROM ab_experiments
        WHERE status = 'running' ${experimentFilter.tenantAnd}
      `).get(...experimentFilter.tenantParam)?.count || 0
    };

    res.json({
      success: true,
      report: {
        outcomes: outcomeStats,
        insights,
        abandonmentJob: jobStatus,
        patterns,
        learningMetrics
      },
      maturityLevel: learningMetrics.totalOutcomesRecorded > 100 ? 5 :
                     learningMetrics.patternsIdentified > 3 ? 4 :
                     learningMetrics.totalOutcomesRecorded > 0 ? 3 : 2,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating full learning report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/learning/activity
 * Conversas ativas (ainda não finalizadas)
 */
router.get('/api/analytics/learning/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const activityFilter = getTenantFilters(db, 'conversation_activity', tenantId, 'ca');
    const outcomeFilter = getTenantFilters(db, 'conversation_outcomes', tenantId, 'co');
    const activeConversations = db.prepare(`
      SELECT
        ca.*,
        CASE
          WHEN co.id IS NOT NULL THEN 'finalized'
          WHEN julianday('now') - julianday(ca.last_message_at) > 1 THEN 'at_risk'
          ELSE 'active'
        END as status
      FROM conversation_activity ca
      LEFT JOIN conversation_outcomes co ON ca.contact_id = co.contact_id
      ${outcomeFilter.tenantAnd}
      WHERE 1=1
      ${activityFilter.tenantAnd}
      ORDER BY ca.last_message_at DESC
      LIMIT ?
    `).all(...outcomeFilter.tenantParam, ...activityFilter.tenantParam, limit);

    const summary = {
      total: activeConversations.length,
      active: activeConversations.filter(c => c.status === 'active').length,
      atRisk: activeConversations.filter(c => c.status === 'at_risk').length,
      finalized: activeConversations.filter(c => c.status === 'finalized').length
    };

    res.json({
      success: true,
      conversations: activeConversations.map(c => ({
        contactId: c.contact_id?.substring(0, 10) + '...',
        stage: c.current_stage,
        messageCount: c.message_count,
        bantCompletion: c.bant_completion_percent,
        lastMessageAt: c.last_message_at,
        status: c.status
      })),
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
//  NIVEL 5 ROUTES - Auto-Optimization System
// ========================================

/**
 * GET /api/analytics/optimizer/status
 * Status completo do AutoOptimizer
 */
router.get('/api/analytics/optimizer/status', async (req, res) => {
  try {
    const autoOptimizer = getAutoOptimizer();
    const status = autoOptimizer.getStatus();

    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching optimizer status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/optimizer/run-cycle
 * Executa ciclo de otimizacao manualmente
 */
router.post('/api/analytics/optimizer/run-cycle', async (req, res) => {
  try {
    console.log(' [API] Executando ciclo de otimizacao manual...');

    const autoOptimizer = getAutoOptimizer();
    const result = await autoOptimizer.runOptimizationCycle();

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error running optimization cycle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/optimizer/stage-health
 * Saude de cada stage do funil
 */
router.get('/api/analytics/optimizer/stage-health', async (req, res) => {
  try {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const stageHealth = db.prepare(`
      SELECT * FROM stage_health
      ORDER BY health_score ASC
    `).all();

    // Calcular media geral
    const avgHealth = stageHealth.length > 0
      ? Math.round(stageHealth.reduce((sum, s) => sum + s.health_score, 0) / stageHealth.length)
      : 0;

    // Identificar stages criticos (health < 50)
    const criticalStages = stageHealth.filter(s => s.health_score < 50);

    res.json({
      success: true,
      stages: stageHealth,
      summary: {
        totalStages: stageHealth.length,
        averageHealth: avgHealth,
        criticalCount: criticalStages.length,
        criticalStages: criticalStages.map(s => s.stage)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching stage health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/optimizer/optimizations
 * Historico de otimizacoes automaticas
 */
router.get('/api/analytics/optimizer/optimizations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const optimizations = db.prepare(`
      SELECT * FROM auto_optimizations
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    // Agrupar por tipo
    const byType = optimizations.reduce((acc, opt) => {
      acc[opt.optimization_type] = (acc[opt.optimization_type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      optimizations,
      summary: {
        total: optimizations.length,
        byType
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching optimizations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/optimizer/start
 * Inicia o AutoOptimizer (se parado)
 */
router.post('/api/analytics/optimizer/start', async (req, res) => {
  try {
    const autoOptimizer = getAutoOptimizer();
    autoOptimizer.start();

    res.json({
      success: true,
      message: 'AutoOptimizer started',
      isRunning: autoOptimizer.isRunning,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error starting optimizer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/optimizer/stop
 * Para o AutoOptimizer
 */
router.post('/api/analytics/optimizer/stop', async (req, res) => {
  try {
    const autoOptimizer = getAutoOptimizer();
    autoOptimizer.stop();

    res.json({
      success: true,
      message: 'AutoOptimizer stopped',
      isRunning: autoOptimizer.isRunning,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error stopping optimizer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/optimizer/detect-risk
 * Detecta risco de abandono para um contato especifico
 */
router.post('/api/analytics/optimizer/detect-risk', async (req, res) => {
  try {
    const { contactId, currentStage, lastUserMessage } = req.body;

    if (!contactId || !currentStage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contactId, currentStage'
      });
    }

    const autoOptimizer = getAutoOptimizer();
    const riskAnalysis = await autoOptimizer.detectRiskAndSuggest(
      contactId,
      currentStage,
      lastUserMessage || '',
      {}
    );

    res.json({
      success: true,
      riskAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error detecting risk:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/maturity-level
 * Nivel de maturidade atual do sistema
 */
router.get('/api/analytics/maturity-level', async (req, res) => {
  try {
    const autoOptimizer = getAutoOptimizer();
    const status = autoOptimizer.getStatus();

    const levels = {
      1: { name: 'Inicial', description: 'Sem dados coletados' },
      2: { name: 'Coletando', description: 'Iniciando coleta de dados' },
      3: { name: 'Analisando', description: 'Dados coletados, analisando padroes' },
      4: { name: 'Aprendendo', description: 'Usando dados para insights e recomendacoes' },
      5: { name: 'Auto-Otimizando', description: 'Sistema se otimiza automaticamente' }
    };

    res.json({
      success: true,
      currentLevel: status.maturityLevel,
      levelInfo: levels[status.maturityLevel],
      allLevels: levels,
      metrics: {
        totalOutcomes: status.totalOutcomes,
        activeExperiments: status.activeExperiments,
        isAutoOptimizerRunning: status.isRunning,
        lastOptimization: status.lastAnalysis
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching maturity level:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
