/**
 * @file reports.routes.js
 * @description Reports Builder API routes
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceIsolation, requireTenant } from '../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

// Limit auth middleware to the reports API scope to avoid /app/* conflicts.
router.use('/api/reports', authenticate, enforceIsolation, requireTenant);

//  CORREÇÃO: Usar conexão singleton do db/connection.js
function getDb() {
  return getDatabase();
}

/**
 * GET /api/reports/summary
 * Get overall summary for reports dashboard
 */
router.get('/api/reports/summary', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    // Leads summary
    let leadsCount = 0;
    let leadsConverted = 0;
    try {
      const leadsStmt = db.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted
        FROM leads
        WHERE tenant_id = ?
      `);
      const leads = leadsStmt.get(tenantId);
      leadsCount = leads?.total || 0;
      leadsConverted = leads?.converted || 0;
    } catch (e) { /* ignore */ }

    // Opportunities summary
    let oppsCount = 0;
    let oppsValue = 0;
    let oppsWon = 0;
    try {
      const oppsStmt = db.prepare(`
        SELECT COUNT(*) as total,
               SUM(valor) as total_value,
               SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won
        FROM opportunities
        WHERE tenant_id = ?
      `);
      const opps = oppsStmt.get(tenantId);
      oppsCount = opps?.total || 0;
      oppsValue = opps?.total_value || 0;
      oppsWon = opps?.won || 0;
    } catch (e) { /* ignore */ }

    // Activities summary
    let activitiesCount = 0;
    let activitiesCompleted = 0;
    try {
      const actStmt = db.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed
        FROM activities
        WHERE tenant_id = ?
      `);
      const acts = actStmt.get(tenantId);
      activitiesCount = acts?.total || 0;
      activitiesCompleted = acts?.completed || 0;
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      summary: {
        leads: {
          total: leadsCount,
          converted: leadsConverted,
          conversionRate: leadsCount > 0 ? ((leadsConverted / leadsCount) * 100).toFixed(1) : 0
        },
        opportunities: {
          total: oppsCount,
          totalValue: oppsValue,
          won: oppsWon,
          winRate: oppsCount > 0 ? ((oppsWon / oppsCount) * 100).toFixed(1) : 0
        },
        activities: {
          total: activitiesCount,
          completed: activitiesCompleted,
          completionRate: activitiesCount > 0 ? ((activitiesCompleted / activitiesCount) * 100).toFixed(1) : 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reports summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/reports/templates
 * Get available report templates
 */
router.get('/api/reports/templates', (req, res) => {
  try {
    const templates = [
      {
        id: 'pipeline_weekly',
        name: 'Pipeline Semanal',
        description: 'Resumo do pipeline de vendas da semana',
        metrics: ['opportunities', 'value', 'stage'],
        defaultPeriod: 'week'
      },
      {
        id: 'activity_daily',
        name: 'Atividades Diárias',
        description: 'Relatório de atividades realizadas no dia',
        metrics: ['activities', 'calls', 'meetings', 'emails'],
        defaultPeriod: 'day'
      },
      {
        id: 'conversion_monthly',
        name: 'Conversão Mensal',
        description: 'Taxa de conversão de leads para oportunidades',
        metrics: ['leads', 'conversions', 'rate'],
        defaultPeriod: 'month'
      },
      {
        id: 'team_performance',
        name: 'Performance do Time',
        description: 'Métricas de performance por membro do time',
        metrics: ['users', 'revenue', 'deals', 'activities'],
        defaultPeriod: 'month'
      },
      {
        id: 'lead_source',
        name: 'Origem de Leads',
        description: 'Análise de leads por fonte de aquisição',
        metrics: ['leads', 'source', 'conversion'],
        defaultPeriod: 'month'
      },
      {
        id: 'win_loss',
        name: 'Win/Loss Analysis',
        description: 'Análise de negócios ganhos e perdidos',
        metrics: ['opportunities', 'won', 'lost', 'reasons'],
        defaultPeriod: 'quarter'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/reports/generate
 * Generate a report
 */
router.post('/api/reports/generate', (req, res) => {
  const db = getDb();
  try {
    const { templateId, startDate, endDate, filters = {} } = req.body;
    const tenantId = extractTenantId(req);

    // Validation
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID é obrigatório'
      });
    }

    let reportData = {};

    switch (templateId) {
      case 'pipeline_weekly':
        reportData = generatePipelineReport(db, startDate, endDate, tenantId);
        break;
      case 'activity_daily':
        reportData = generateActivityReport(db, startDate, endDate, tenantId, filters.userId);
        break;
      case 'conversion_monthly':
        reportData = generateConversionReport(db, startDate, endDate, tenantId);
        break;
      case 'team_performance':
        reportData = generateTeamReport(db, startDate, endDate, tenantId);
        break;
      case 'lead_source':
        reportData = generateLeadSourceReport(db, startDate, endDate, tenantId);
        break;
      case 'win_loss':
        reportData = generateWinLossReport(db, startDate, endDate, tenantId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Template não encontrado'
        });
    }

    res.json({
      success: true,
      data: {
        templateId,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        ...reportData
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/reports/export/:format
 * Export report data
 */
router.get('/api/reports/export/:format', (req, res) => {
  try {
    const { format } = req.params;
    const { data } = req.query;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido. Use csv ou json'
      });
    }

    // For now, just return JSON
    // PDF and Excel would require additional libraries (pdfmake, xlsx)
    res.json({
      success: true,
      message: `Export em ${format} será implementado com as dependências adicionais`,
      format
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// Report Generators
// =====================

function generatePipelineReport(db, startDate, endDate, tenantId) {
  const dateFilter = buildDateFilter(startDate, endDate, 'created_at');

  const stagesStmt = db.prepare(`
    SELECT
      stage,
      COUNT(*) as count,
      SUM(valor) as total_value,
      AVG(valor) as avg_value
    FROM opportunities
    WHERE status = 'aberta' ${dateFilter.where}
      AND tenant_id = ?
    GROUP BY stage
    ORDER BY CASE stage
      WHEN 'prospeccao' THEN 1
      WHEN 'qualificacao' THEN 2
      WHEN 'proposta' THEN 3
      WHEN 'negociacao' THEN 4
      WHEN 'fechamento' THEN 5
    END
  `);
  const stages = stagesStmt.all(...dateFilter.params, tenantId);

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) as total_opportunities,
      SUM(valor) as total_value,
      SUM(CASE WHEN status = 'ganha' THEN valor ELSE 0 END) as won_value,
      COUNT(CASE WHEN status = 'ganha' THEN 1 END) as won_count
    FROM opportunities
    WHERE 1=1 ${dateFilter.where}
      AND tenant_id = ?
  `);
  const summary = summaryStmt.get(...dateFilter.params, tenantId);

  return {
    title: 'Pipeline Report',
    summary,
    stages,
    charts: {
      stageDistribution: stages.map(s => ({ name: s.stage, value: s.count })),
      valueByStage: stages.map(s => ({ name: s.stage, value: s.total_value || 0 }))
    }
  };
}

function generateActivityReport(db, startDate, endDate, tenantId, userId = null) {
  const dateFilter = buildDateFilter(startDate, endDate, 'created_at');
  const userFilter = userId ? 'AND (owner_id = ? OR assigned_to = ?)' : '';
  const params = [...dateFilter.params];
  if (userId) params.push(userId, userId);
  params.push(tenantId);

  const byTypeStmt = db.prepare(`
    SELECT
      tipo,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM activities
    WHERE 1=1 ${dateFilter.where} ${userFilter}
      AND tenant_id = ?
    GROUP BY tipo
  `);
  const byType = byTypeStmt.all(...params);

  const byStatusStmt = db.prepare(`
    SELECT
      status,
      COUNT(*) as count
    FROM activities
    WHERE 1=1 ${dateFilter.where} ${userFilter}
      AND tenant_id = ?
    GROUP BY status
  `);
  const byStatus = byStatusStmt.all(...params);

  const dailyStmt = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM activities
    WHERE 1=1 ${dateFilter.where} ${userFilter}
      AND tenant_id = ?
    GROUP BY date(created_at)
    ORDER BY date ASC
  `);
  const daily = dailyStmt.all(...params);

  return {
    title: 'Activity Report',
    byType,
    byStatus,
    daily,
    totals: {
      total: byStatus.reduce((sum, s) => sum + s.count, 0),
      completed: byType.reduce((sum, t) => sum + t.completed, 0)
    }
  };
}

function generateConversionReport(db, startDate, endDate, tenantId) {
  const dateFilter = buildDateFilter(startDate, endDate, 'created_at');

  const leadsStmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN status = 'qualificado' THEN 1 ELSE 0 END) as qualified,
      SUM(CASE WHEN status = 'desqualificado' THEN 1 ELSE 0 END) as disqualified
    FROM leads
    WHERE 1=1 ${dateFilter.where}
      AND tenant_id = ?
  `);
  const leads = leadsStmt.get(...dateFilter.params, tenantId);

  const bySourceStmt = db.prepare(`
    SELECT
      origem,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted
    FROM leads
    WHERE 1=1 ${dateFilter.where}
      AND tenant_id = ?
    GROUP BY origem
  `);
  const bySource = bySourceStmt.all(...dateFilter.params, tenantId);

  const conversionRate = leads.total > 0
    ? ((leads.converted / leads.total) * 100).toFixed(1)
    : 0;

  return {
    title: 'Conversion Report',
    summary: {
      ...leads,
      conversionRate
    },
    bySource: bySource.map(s => ({
      ...s,
      conversionRate: s.total > 0 ? ((s.converted / s.total) * 100).toFixed(1) : 0
    }))
  };
}

function generateTeamReport(db, startDate, endDate, tenantId) {
  const dateFilter = buildDateFilter(startDate, endDate, 'o.created_at');

  const performanceStmt = db.prepare(`
    SELECT
      u.id,
      u.name,
      COUNT(DISTINCT o.id) as total_deals,
      SUM(CASE WHEN o.status = 'ganha' THEN 1 ELSE 0 END) as won_deals,
      SUM(CASE WHEN o.status = 'ganha' THEN o.valor ELSE 0 END) as revenue,
      COUNT(DISTINCT a.id) as activities_completed
    FROM users u
    LEFT JOIN opportunities o ON u.id = o.owner_id ${dateFilter.where} AND o.tenant_id = ?
    LEFT JOIN activities a ON u.id = a.owner_id AND a.status = 'completed' AND a.tenant_id = ?
    WHERE u.is_active = 1 AND u.role IN ('sdr', 'manager')
      AND u.tenant_id = ?
    GROUP BY u.id
    ORDER BY revenue DESC
  `);
  const performance = performanceStmt.all(...dateFilter.params, tenantId, tenantId, tenantId);

  return {
    title: 'Team Performance Report',
    members: performance.map(p => ({
      ...p,
      winRate: p.total_deals > 0
        ? ((p.won_deals / p.total_deals) * 100).toFixed(1)
        : 0
    })),
    totals: {
      totalRevenue: performance.reduce((sum, p) => sum + (p.revenue || 0), 0),
      totalDeals: performance.reduce((sum, p) => sum + p.total_deals, 0),
      totalWon: performance.reduce((sum, p) => sum + p.won_deals, 0)
    }
  };
}

function generateLeadSourceReport(db, startDate, endDate, tenantId) {
  const dateFilter = buildDateFilter(startDate, endDate, 'created_at');

  const sourcesStmt = db.prepare(`
    SELECT
      COALESCE(origem, 'Desconhecido') as source,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted,
      AVG(bant_score) as avg_bant
    FROM leads
    WHERE 1=1 ${dateFilter.where}
      AND tenant_id = ?
    GROUP BY origem
    ORDER BY total DESC
  `);
  const sources = sourcesStmt.all(...dateFilter.params, tenantId);

  return {
    title: 'Lead Source Report',
    sources: sources.map(s => ({
      ...s,
      conversionRate: s.total > 0 ? ((s.converted / s.total) * 100).toFixed(1) : 0
    })),
    totals: {
      total: sources.reduce((sum, s) => sum + s.total, 0),
      converted: sources.reduce((sum, s) => sum + s.converted, 0)
    }
  };
}

function generateWinLossReport(db, startDate, endDate, tenantId) {
  const dateFilter = buildDateFilter(startDate, endDate, 'data_fechamento');

  const summaryStmt = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
      SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost,
      SUM(CASE WHEN status = 'ganha' THEN valor ELSE 0 END) as won_value,
      SUM(CASE WHEN status = 'perdida' THEN valor ELSE 0 END) as lost_value
    FROM opportunities
    WHERE status IN ('ganha', 'perdida') ${dateFilter.where}
      AND tenant_id = ?
  `);
  const summary = summaryStmt.get(...dateFilter.params, tenantId);

  const lossReasonsStmt = db.prepare(`
    SELECT
      COALESCE(motivo_perda, 'Não informado') as reason,
      COUNT(*) as count,
      SUM(valor) as lost_value
    FROM opportunities
    WHERE status = 'perdida' ${dateFilter.where}
      AND tenant_id = ?
    GROUP BY motivo_perda
    ORDER BY count DESC
  `);
  const lossReasons = lossReasonsStmt.all(...dateFilter.params, tenantId);

  const winRate = (summary.won + summary.lost) > 0
    ? ((summary.won / (summary.won + summary.lost)) * 100).toFixed(1)
    : 0;

  return {
    title: 'Win/Loss Report',
    summary: {
      ...summary,
      winRate
    },
    lossReasons
  };
}

function buildDateFilter(startDate, endDate, column) {
  let where = '';
  const params = [];

  if (startDate && endDate) {
    where = `AND ${column} BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  } else if (startDate) {
    where = `AND ${column} >= ?`;
    params.push(startDate);
  } else if (endDate) {
    where = `AND ${column} <= ?`;
    params.push(endDate);
  }

  return { where, params };
}

export default router;
