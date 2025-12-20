/**
 * @file forecasting.routes.js
 * @description Sales Forecasting API routes
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceIsolation, requireTenant } from '../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

// Limit auth middleware to the forecasting API scope to avoid /app/* conflicts.
router.use('/api/forecasting', authenticate, enforceIsolation, requireTenant);

//  CORREÇÃO: Usar conexão singleton do db/connection.js
function getDb() {
  return getDatabase();
}

// Stage probabilities
const STAGE_PROBABILITIES = {
  prospeccao: 10,
  qualificacao: 25,
  proposta: 50,
  negociacao: 75,
  fechamento: 90
};

/**
 * GET /api/forecasting/pipeline-weighted
 * Get weighted pipeline values
 */
router.get('/api/forecasting/pipeline-weighted', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    const stmt = db.prepare(`
      SELECT
        stage,
        COUNT(*) as count,
        SUM(valor) as total_value,
        AVG(valor) as avg_value,
        probabilidade
      FROM opportunities
      WHERE status = 'aberta'
        AND tenant_id = ?
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'prospeccao' THEN 1
          WHEN 'qualificacao' THEN 2
          WHEN 'proposta' THEN 3
          WHEN 'negociacao' THEN 4
          WHEN 'fechamento' THEN 5
        END
    `);

    const stages = stmt.all(tenantId);

    // Calculate weighted values
    const pipeline = stages.map(stage => {
      const probability = STAGE_PROBABILITIES[stage.stage] || stage.probabilidade || 0;
      return {
        stage: stage.stage,
        count: stage.count,
        totalValue: stage.total_value || 0,
        avgValue: stage.avg_value || 0,
        probability,
        weightedValue: (stage.total_value || 0) * probability / 100
      };
    });

    // Totals
    const totals = {
      count: pipeline.reduce((sum, s) => sum + s.count, 0),
      totalValue: pipeline.reduce((sum, s) => sum + s.totalValue, 0),
      weightedValue: pipeline.reduce((sum, s) => sum + s.weightedValue, 0)
    };

    res.json({
      success: true,
      data: {
        stages: pipeline,
        totals
      }
    });
  } catch (error) {
    console.error('Pipeline weighted error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/forecasting/scenarios
 * Get best/commit/worst case scenarios
 */
router.get('/api/forecasting/scenarios', (req, res) => {
  const db = getDb();
  try {
    const { months = 3 } = req.query;
    const tenantId = extractTenantId(req);

    // Get open opportunities
    const oppsStmt = db.prepare(`
      SELECT
        id, nome, valor, stage, probabilidade, data_fechamento_prevista
      FROM opportunities
      WHERE status = 'aberta'
        AND data_fechamento_prevista <= date('now', '+' || ? || ' months')
        AND tenant_id = ?
    `);
    const opportunities = oppsStmt.all(parseInt(months), tenantId);

    // Calculate scenarios
    let bestCase = 0;    // All open deals close
    let commitCase = 0;  // Based on probability
    let worstCase = 0;   // Only 50%+ probability

    for (const opp of opportunities) {
      const prob = STAGE_PROBABILITIES[opp.stage] || opp.probabilidade || 0;

      bestCase += opp.valor || 0;
      commitCase += (opp.valor || 0) * prob / 100;

      if (prob >= 50) {
        worstCase += (opp.valor || 0) * prob / 100;
      }
    }

    // Historical data for trend
    const historicalStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', data_fechamento) as month,
        SUM(valor) as revenue
      FROM opportunities
      WHERE status = 'ganha'
        AND data_fechamento > date('now', '-6 months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', data_fechamento)
      ORDER BY month ASC
    `);
    const historical = historicalStmt.all(tenantId);

    res.json({
      success: true,
      data: {
        scenarios: {
          bestCase: Math.round(bestCase),
          commitCase: Math.round(commitCase),
          worstCase: Math.round(worstCase)
        },
        opportunityCount: opportunities.length,
        period: `${months} months`,
        historical
      }
    });
  } catch (error) {
    console.error('Scenarios error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/forecasting/velocity
 * Get sales velocity metrics
 */
router.get('/api/forecasting/velocity', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    // Win rate
    const winRateStmt = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost,
        COUNT(*) as total
      FROM opportunities
      WHERE status IN ('ganha', 'perdida')
        AND updated_at > datetime('now', '-90 days')
        AND tenant_id = ?
    `);
    const winRateData = winRateStmt.get(tenantId);
    const winRate = (winRateData.won + winRateData.lost) > 0
      ? (winRateData.won / (winRateData.won + winRateData.lost) * 100).toFixed(1)
      : 0;

    // Average deal size
    const avgDealStmt = db.prepare(`
      SELECT AVG(valor) as avg_deal
      FROM opportunities
      WHERE status = 'ganha'
        AND data_fechamento > datetime('now', '-90 days')
        AND tenant_id = ?
    `);
    const avgDeal = avgDealStmt.get(tenantId)?.avg_deal || 0;

    // Average sales cycle
    const cycleStmt = db.prepare(`
      SELECT AVG(ciclo_venda_dias) as avg_cycle
      FROM opportunities
      WHERE status = 'ganha'
        AND data_fechamento > datetime('now', '-90 days')
        AND ciclo_venda_dias IS NOT NULL
        AND tenant_id = ?
    `);
    const avgCycle = cycleStmt.get(tenantId)?.avg_cycle || 30;

    // Number of open opportunities
    const openOppsStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE status = 'aberta'
        AND tenant_id = ?
    `);
    const openOpps = openOppsStmt.get(tenantId)?.count || 0;

    // Sales Velocity = (Opportunities × Win Rate × Avg Deal Size) / Sales Cycle
    const velocity = avgCycle > 0
      ? (openOpps * (winRate / 100) * avgDeal) / avgCycle
      : 0;

    // Monthly projected revenue
    const monthlyProjected = velocity * 30;

    res.json({
      success: true,
      data: {
        velocity: Math.round(velocity),
        monthlyProjected: Math.round(monthlyProjected),
        components: {
          openOpportunities: openOpps,
          winRate: parseFloat(winRate),
          avgDealSize: Math.round(avgDeal),
          avgSalesCycle: Math.round(avgCycle)
        }
      }
    });
  } catch (error) {
    console.error('Velocity error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/forecasting/win-rate
 * Get detailed win rate analysis
 */
router.get('/api/forecasting/win-rate', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    // Overall win rate
    const overallStmt = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost
      FROM opportunities
      WHERE status IN ('ganha', 'perdida')
        AND tenant_id = ?
    `);
    const overall = overallStmt.get(tenantId);

    // Win rate by stage (where deals were lost)
    const byStageStmt = db.prepare(`
      SELECT
        stage,
        SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost
      FROM opportunities
      WHERE status IN ('ganha', 'perdida')
        AND tenant_id = ?
      GROUP BY stage
    `);
    const byStage = byStageStmt.all(tenantId);

    // Win rate by month
    const byMonthStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', data_fechamento) as month,
        SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost
      FROM opportunities
      WHERE status IN ('ganha', 'perdida')
        AND data_fechamento > datetime('now', '-12 months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', data_fechamento)
      ORDER BY month ASC
    `);
    const byMonth = byMonthStmt.all(tenantId);

    // Loss reasons
    const lossReasonsStmt = db.prepare(`
      SELECT
        motivo_perda as reason,
        COUNT(*) as count
      FROM opportunities
      WHERE status = 'perdida'
        AND motivo_perda IS NOT NULL
        AND tenant_id = ?
      GROUP BY motivo_perda
      ORDER BY count DESC
      LIMIT 10
    `);
    const lossReasons = lossReasonsStmt.all(tenantId);

    res.json({
      success: true,
      data: {
        overall: {
          won: overall.won || 0,
          lost: overall.lost || 0,
          winRate: (overall.won + overall.lost) > 0
            ? ((overall.won / (overall.won + overall.lost)) * 100).toFixed(1)
            : 0
        },
        byStage: byStage.map(s => ({
          stage: s.stage,
          won: s.won,
          lost: s.lost,
          winRate: (s.won + s.lost) > 0 ? ((s.won / (s.won + s.lost)) * 100).toFixed(1) : 0
        })),
        byMonth: byMonth.map(m => ({
          month: m.month,
          won: m.won,
          lost: m.lost,
          winRate: (m.won + m.lost) > 0 ? ((m.won / (m.won + m.lost)) * 100).toFixed(1) : 0
        })),
        lossReasons
      }
    });
  } catch (error) {
    console.error('Win rate error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/forecasting/trends
 * Get historical trends
 */
router.get('/api/forecasting/trends', (req, res) => {
  const db = getDb();
  try {
    const { months = 12 } = req.query;
    const tenantId = extractTenantId(req);

    // Monthly revenue trend
    const revenueStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', data_fechamento) as month,
        SUM(valor) as revenue,
        COUNT(*) as deals
      FROM opportunities
      WHERE status = 'ganha'
        AND data_fechamento > datetime('now', '-' || ? || ' months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', data_fechamento)
      ORDER BY month ASC
    `);
    const revenue = revenueStmt.all(parseInt(months), tenantId);

    // Monthly leads trend
    const leadsStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted
      FROM leads
      WHERE created_at > datetime('now', '-' || ? || ' months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `);
    const leads = leadsStmt.all(parseInt(months), tenantId);

    // Pipeline value trend
    const pipelineStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        SUM(valor) as pipeline_created,
        COUNT(*) as deals_created
      FROM opportunities
      WHERE created_at > datetime('now', '-' || ? || ' months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `);
    const pipeline = pipelineStmt.all(parseInt(months), tenantId);

    res.json({
      success: true,
      data: {
        revenue,
        leads,
        pipeline,
        period: `${months} months`
      }
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/forecasting/monthly
 * Get monthly forecast breakdown
 */
router.get('/api/forecasting/monthly', (req, res) => {
  const db = getDb();
  try {
    const { months = 3 } = req.query;
    const tenantId = extractTenantId(req);

    const forecastStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', data_fechamento_prevista) as month,
        COUNT(*) as opportunities,
        SUM(valor) as total_value,
        SUM(valor * COALESCE(probabilidade, 50) / 100) as weighted_value
      FROM opportunities
      WHERE status = 'aberta'
        AND data_fechamento_prevista IS NOT NULL
        AND data_fechamento_prevista <= date('now', '+' || ? || ' months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', data_fechamento_prevista)
      ORDER BY month ASC
    `);
    const forecast = forecastStmt.all(parseInt(months), tenantId);

    // Historical comparison
    const historicalStmt = db.prepare(`
      SELECT
        strftime('%Y-%m', data_fechamento) as month,
        SUM(valor) as actual_revenue
      FROM opportunities
      WHERE status = 'ganha'
        AND data_fechamento > datetime('now', '-' || ? || ' months')
        AND tenant_id = ?
      GROUP BY strftime('%Y-%m', data_fechamento)
      ORDER BY month ASC
    `);
    const historical = historicalStmt.all(parseInt(months), tenantId);

    res.json({
      success: true,
      data: {
        forecast,
        historical,
        period: `${months} months`
      }
    });
  } catch (error) {
    console.error('Monthly forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

export default router;
