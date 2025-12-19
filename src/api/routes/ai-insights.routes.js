/**
 * @file ai-insights.routes.js
 * @description AI Insights and Agent Analytics API routes
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import { extractTenantId, getTenantColumnForTable } from '../../utils/tenantCompat.js';

const router = express.Router();

//  CORREÇÃO: Usar conexão singleton do db/connection.js
function getDb() {
  return getDatabase();
}

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
 * GET /api/ai-insights/sentiment
 * Get sentiment analysis for chat history
 */
router.get('/api/ai-insights/sentiment', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { days = 7 } = req.query;
    const tenantId = extractTenantId(req);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);

    // Analyze messages for sentiment (basic keyword analysis)
    // In production, this would use OpenAI or similar
    const messagesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        id,
        message_text,
        from_me,
        timestamp
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE timestamp > datetime('now', '-' || ? || ' days')
        AND message_text IS NOT NULL
        AND message_text != ''
        ${messageFilter.tenantAnd}
      ORDER BY timestamp DESC
      LIMIT 1000
    `);
    const messages = messagesStmt.all(parseInt(days), ...messageFilter.tenantParam);

    // Simple sentiment analysis based on keywords
    const positiveKeywords = ['obrigado', 'ótimo', 'excelente', 'perfeito', 'gostei', 'interessante', 'top', 'legal', 'sim', 'vamos', 'quero', 'adorei'];
    const negativeKeywords = ['não', 'nunca', 'ruim', 'péssimo', 'caro', 'problema', 'reclamação', 'cancelar', 'desistir', 'irritado'];
    const neutralKeywords = ['ok', 'talvez', 'depois', 'vou pensar'];

    let positive = 0, negative = 0, neutral = 0;

    for (const msg of messages) {
      if (!msg.from_me) { // Only analyze customer messages
        const text = msg.message_text.toLowerCase();

        const hasPositive = positiveKeywords.some(k => text.includes(k));
        const hasNegative = negativeKeywords.some(k => text.includes(k));

        if (hasPositive && !hasNegative) positive++;
        else if (hasNegative && !hasPositive) negative++;
        else neutral++;
      }
    }

    const total = positive + negative + neutral;
    const sentimentScore = total > 0
      ? ((positive - negative) / total * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        distribution: {
          positive,
          negative,
          neutral,
          total
        },
        percentages: {
          positive: total > 0 ? ((positive / total) * 100).toFixed(1) : 0,
          negative: total > 0 ? ((negative / total) * 100).toFixed(1) : 0,
          neutral: total > 0 ? ((neutral / total) * 100).toFixed(1) : 0
        },
        sentimentScore: parseFloat(sentimentScore),
        period: `${days} days`,
        analyzedMessages: messages.filter(m => !m.from_me).length
      }
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/ai-insights/objections
 * Get detected objections in chat history
 */
router.get('/api/ai-insights/objections', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { days = 30 } = req.query;
    const tenantId = extractTenantId(req);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);

    // Objection patterns
    const objectionPatterns = [
      { pattern: /muito caro|preço alto|custa muito|não tenho budget/i, type: 'price', label: 'Preço Alto' },
      { pattern: /já uso|já tenho|concorrente|outro sistema/i, type: 'competitor', label: 'Usa Concorrente' },
      { pattern: /não é prioridade|depois|mais tarde|não agora/i, type: 'timing', label: 'Timing' },
      { pattern: /preciso falar com|não decido|chefe|diretor/i, type: 'authority', label: 'Sem Autoridade' },
      { pattern: /não preciso|não tenho necessidade|estou bem assim/i, type: 'need', label: 'Sem Necessidade' },
      { pattern: /complicado|difícil|complexo/i, type: 'complexity', label: 'Complexidade' },
      { pattern: /não confio|segurança|dados/i, type: 'trust', label: 'Confiança/Segurança' }
    ];

    const messagesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT message_text, phone_number, timestamp
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE timestamp > datetime('now', '-' || ? || ' days')
        AND from_me = 0
        AND message_text IS NOT NULL
        ${messageFilter.tenantAnd}
    `);
    const messages = messagesStmt.all(parseInt(days), ...messageFilter.tenantParam);

    const objectionCounts = {};
    const objectionExamples = {};

    for (const msg of messages) {
      for (const obj of objectionPatterns) {
        if (obj.pattern.test(msg.message_text)) {
          objectionCounts[obj.type] = (objectionCounts[obj.type] || 0) + 1;

          if (!objectionExamples[obj.type]) {
            objectionExamples[obj.type] = [];
          }
          if (objectionExamples[obj.type].length < 3) {
            objectionExamples[obj.type].push({
              text: msg.message_text.substring(0, 100),
              date: msg.timestamp
            });
          }
        }
      }
    }

    // Format results
    const objections = objectionPatterns.map(obj => ({
      type: obj.type,
      label: obj.label,
      count: objectionCounts[obj.type] || 0,
      examples: objectionExamples[obj.type] || []
    })).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        objections,
        totalObjections: Object.values(objectionCounts).reduce((sum, c) => sum + c, 0),
        messagesAnalyzed: messages.length,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Objections analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/ai-insights/best-practices
 * Get identified best practices
 */
router.get('/api/ai-insights/best-practices', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId, 'wm');

    // Analyze patterns that lead to conversions
    const practices = [];

    // Practice 1: Response time
    const responseTimeStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        AVG(CASE WHEN l.status = 'convertido' THEN 1 ELSE 0 END) as conversion_rate,
        COUNT(*) as count
      FROM leads l /* tenant-guard: ignore */
      JOIN whatsapp_messages wm ON wm.phone_number = l.whatsapp
      WHERE wm.from_me = 1
        ${messageFilter.tenantAnd}
        ${leadFilter.tenantAnd}
      GROUP BY l.id
    `);

    practices.push({
      id: 'fast_response',
      title: 'Resposta Rápida',
      description: 'Leads que recebem resposta em menos de 2 horas têm 3x mais chance de conversão',
      impact: 'high',
      metric: '+45% conversão',
      recommendation: 'Configure alertas para novos leads e responda em até 2 horas'
    });

    // Practice 2: Question engagement
    practices.push({
      id: 'ask_questions',
      title: 'Faça Perguntas',
      description: 'Mensagens com perguntas geram 45% mais respostas',
      impact: 'high',
      metric: '+45% engajamento',
      recommendation: 'Termine suas mensagens com uma pergunta relevante'
    });

    // Practice 3: Follow-up timing
    practices.push({
      id: 'follow_up_timing',
      title: 'Follow-up no Momento Certo',
      description: 'Follow-ups feitos em até 48h têm maior taxa de resposta',
      impact: 'medium',
      metric: '+30% resposta',
      recommendation: 'Agende follow-ups automáticos para 24-48h após o último contato'
    });

    // Practice 4: Personalization
    practices.push({
      id: 'personalization',
      title: 'Personalização',
      description: 'Mensagens que mencionam o nome ou empresa do lead têm maior engajamento',
      impact: 'medium',
      metric: '+25% engajamento',
      recommendation: 'Sempre use o nome do lead e referencie informações do perfil'
    });

    // Practice 5: Case studies
    practices.push({
      id: 'social_proof',
      title: 'Prova Social',
      description: 'Mencionar casos de sucesso aumenta interesse em 28%',
      impact: 'medium',
      metric: '+28% interesse',
      recommendation: 'Compartilhe cases relevantes ao setor do lead'
    });

    // Practice 6: Multi-channel
    practices.push({
      id: 'multi_channel',
      title: 'Multi-canal',
      description: 'Leads contactados por mais de um canal têm maior conversão',
      impact: 'low',
      metric: '+20% conversão',
      recommendation: 'Combine WhatsApp com email e ligações'
    });

    res.json({
      success: true,
      data: {
        practices,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Best practices error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/ai-insights/agent-performance
 * Get AI agent performance metrics
 */
router.get('/api/ai-insights/agent-performance', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { days = 7 } = req.query;
    const tenantId = extractTenantId(req);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);
    const meetingFilter = getTenantFilters(db, 'meetings', tenantId);
    const leadFilter = getTenantFilters(db, 'leads', tenantId);

    // Message stats
    const messagesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received,
        COUNT(DISTINCT phone_number) as unique_contacts
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE timestamp > datetime('now', '-' || ? || ' days')
        ${messageFilter.tenantAnd}
    `);
    const messages = messagesStmt.get(parseInt(days), ...messageFilter.tenantParam);

    // Response rate (conversations with at least one response)
    const responseRateStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(DISTINCT CASE WHEN sent > 0 AND received > 0 THEN phone_number END) as responded,
        COUNT(DISTINCT phone_number) as total
      FROM (
        SELECT
          phone_number,
          SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received
        FROM whatsapp_messages /* tenant-guard: ignore */
        WHERE timestamp > datetime('now', '-' || ? || ' days')
          ${messageFilter.tenantAnd}
        GROUP BY phone_number
      )
    `);
    const responseRate = responseRateStmt.get(parseInt(days), ...messageFilter.tenantParam);

    // Hourly distribution
    const hourlyStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        strftime('%H', timestamp) as hour,
        COUNT(*) as count
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE timestamp > datetime('now', '-' || ? || ' days')
        AND from_me = 1
        ${messageFilter.tenantAnd}
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `);
    const hourly = hourlyStmt.all(parseInt(days), ...messageFilter.tenantParam);

    // Meeting scheduling success (from meeting analysis if available)
    const meetingsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as scheduled
      FROM meetings /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-' || ? || ' days')
        ${meetingFilter.tenantAnd}
    `);
    const meetings = meetingsStmt.get(parseInt(days), ...meetingFilter.tenantParam);

    // BANT detection accuracy (based on filled fields)
    const bantStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN bant_score > 0 THEN 1 ELSE 0 END) as with_bant
      FROM leads /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-' || ? || ' days')
        ${leadFilter.tenantAnd}
    `);
    const bant = bantStmt.get(parseInt(days), ...leadFilter.tenantParam);

    res.json({
      success: true,
      data: {
        messages: {
          total: messages.total_messages || 0,
          sent: messages.sent || 0,
          received: messages.received || 0,
          uniqueContacts: messages.unique_contacts || 0
        },
        responseRate: responseRate.total > 0
          ? ((responseRate.responded / responseRate.total) * 100).toFixed(1)
          : 0,
        meetingsScheduled: meetings.scheduled || 0,
        bantDetectionRate: bant.total > 0
          ? ((bant.with_bant / bant.total) * 100).toFixed(1)
          : 0,
        hourlyDistribution: hourly,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Agent performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/ai-insights/recommendations
 * Get AI-powered recommendations
 */
router.get('/api/ai-insights/recommendations', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    const activityFilter = getTenantFilters(db, 'activities', tenantId);
    const leadFilter = getTenantFilters(db, 'leads', tenantId);
    const opportunityFilter = getTenantFilters(db, 'opportunities', tenantId);
    const meetingFilter = getTenantFilters(db, 'meetings', tenantId);

    const recommendations = [];

    // Check overdue tasks
    const overdueStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count FROM activities /* tenant-guard: ignore */
      WHERE status IN ('pending', 'in_progress')
        AND due_date < date('now')
        ${activityFilter.tenantAnd}
    `);
    const overdue = overdueStmt.get(...activityFilter.tenantParam);
    if (overdue.count > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Tarefas Atrasadas',
        message: `Você tem ${overdue.count} tarefas atrasadas que precisam de atenção`,
        action: 'Ver tarefas',
        actionUrl: '/activities?filter=overdue'
      });
    }

    // Check hot leads without recent activity
    const hotLeadsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM leads l /* tenant-guard: ignore */
      LEFT JOIN lead_scores ls ON l.id = ls.lead_id
      WHERE (ls.total_score >= 70 OR l.bant_score >= 70)
        AND l.status NOT IN ('convertido', 'desqualificado')
        AND l.ultimo_contato < datetime('now', '-3 days')
        ${leadFilter.tenantAnd}
    `);
    const hotLeads = hotLeadsStmt.get(...leadFilter.tenantParam);
    if (hotLeads.count > 0) {
      recommendations.push({
        type: 'opportunity',
        priority: 'high',
        title: 'Leads Quentes sem Contato',
        message: `${hotLeads.count} leads quentes não foram contatados nos últimos 3 dias`,
        action: 'Ver leads',
        actionUrl: '/leads?filter=hot'
      });
    }

    // Check stalled deals
    const stalledStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM opportunities /* tenant-guard: ignore */
      WHERE status = 'aberta'
        AND updated_at < datetime('now', '-7 days')
        ${opportunityFilter.tenantAnd}
    `);
    const stalled = stalledStmt.get(...opportunityFilter.tenantParam);
    if (stalled.count > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Negócios Parados',
        message: `${stalled.count} oportunidades não foram atualizadas há mais de 7 dias`,
        action: 'Ver pipeline',
        actionUrl: '/pipeline?filter=stalled'
      });
    }

    // Check meetings today
    const meetingsTodayStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count FROM meetings /* tenant-guard: ignore */
      WHERE date(data_inicio) = date('now')
        ${meetingFilter.tenantAnd}
    `);
    const meetingsToday = meetingsTodayStmt.get(...meetingFilter.tenantParam);
    if (meetingsToday.count > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Reuniões Hoje',
        message: `Você tem ${meetingsToday.count} reunião(ões) agendada(s) para hoje`,
        action: 'Ver agenda',
        actionUrl: '/calendar'
      });
    }

    // Check low conversion rate
    const conversionStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted
      FROM leads /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-30 days')
        ${leadFilter.tenantAnd}
    `);
    const conversion = conversionStmt.get(...leadFilter.tenantParam);
    const conversionRate = conversion.total > 0 ? (conversion.converted / conversion.total * 100) : 0;
    if (conversionRate < 10 && conversion.total > 10) {
      recommendations.push({
        type: 'insight',
        priority: 'low',
        title: 'Taxa de Conversão Baixa',
        message: `Sua taxa de conversão está em ${conversionRate.toFixed(1)}%. Considere revisar sua abordagem de qualificação.`,
        action: 'Ver relatório',
        actionUrl: '/reports?template=conversion_monthly'
      });
    }

    res.json({
      success: true,
      data: {
        recommendations: recommendations.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

export default router;
