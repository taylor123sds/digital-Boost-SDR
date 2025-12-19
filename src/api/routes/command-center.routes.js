/**
 * @file command-center.routes.js
 * @description Command Center API - Consolidated dashboard data
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
 * GET /api/command-center/overview
 * Get all KPIs in one request
 */
router.get('/api/command-center/overview', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user?.id;
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId);
    const opportunityFilter = getTenantFilters(db, 'opportunities', tenantId);
    const activityFilter = getTenantFilters(db, 'activities', tenantId);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);
    const meetingFilter = getTenantFilters(db, 'meetings', tenantId);

    // Today's date
    const today = new Date().toISOString().split('T')[0];

    // Leads stats
    const leadsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN status = 'qualificado' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted
      FROM leads /* tenant-guard: ignore */
      WHERE status NOT IN ('desqualificado') ${leadFilter.tenantAnd}
    `);
    const leads = leadsStmt.get(...leadFilter.tenantParam);

    // Pipeline stats
    const pipelineStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total_opportunities,
        SUM(CASE WHEN status = 'aberta' THEN valor ELSE 0 END) as pipeline_value,
        SUM(CASE WHEN status = 'ganha' THEN valor ELSE 0 END) as won_value,
        SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN status = 'perdida' THEN 1 ELSE 0 END) as lost_count,
        AVG(CASE WHEN status = 'ganha' THEN ciclo_venda_dias ELSE NULL END) as avg_cycle
      FROM opportunities /* tenant-guard: ignore */
      ${opportunityFilter.tenantWhere}
    `);
    const pipeline = pipelineStmt.get(...opportunityFilter.tenantParam);

    // Calculate win rate
    const totalClosed = (pipeline.won_count || 0) + (pipeline.lost_count || 0);
    const winRate = totalClosed > 0 ? ((pipeline.won_count / totalClosed) * 100).toFixed(1) : 0;

    // Conversion rate (leads to opportunities)
    const conversionRate = leads.total > 0
      ? ((leads.converted / leads.total) * 100).toFixed(1)
      : 0;

    // Activities stats
    const activitiesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN date(COALESCE(due_date, data_agendada)) = date('now') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN status IN ('pendente', 'em_andamento') AND datetime(COALESCE(due_date, data_agendada)) < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM activities /* tenant-guard: ignore */
      ${activityFilter.tenantWhere}
    `);
    const activities = activitiesStmt.get(...activityFilter.tenantParam);

    // Meetings today
    const meetingsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT COUNT(*) as count
      FROM meetings /* tenant-guard: ignore */
      WHERE date(data_inicio) = date('now')
        ${meetingFilter.tenantAnd}
    `);
    const meetingsToday = meetingsStmt.get(...meetingFilter.tenantParam);

    // Messages stats (WhatsApp)
    const messagesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today,
        COUNT(DISTINCT phone_number) as unique_contacts
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-7 days') ${messageFilter.tenantAnd}
    `);
    const messages = messagesStmt.get(...messageFilter.tenantParam);

    res.json({
      success: true,
      data: {
        kpis: {
          leadsToday: leads.today || 0,
          totalLeads: leads.total || 0,
          qualifiedLeads: leads.qualified || 0,
          pipelineValue: pipeline.pipeline_value || 0,
          wonValue: pipeline.won_value || 0,
          winRate: parseFloat(winRate),
          conversionRate: parseFloat(conversionRate),
          avgSalesCycle: Math.round(pipeline.avg_cycle || 0)
        },
        activities: {
          total: activities.total || 0,
          completed: activities.completed || 0,
          today: activities.today || 0,
          overdue: activities.overdue || 0
        },
        meetings: {
          today: meetingsToday.count || 0
        },
        messages: {
          total: messages.total || 0,
          today: messages.today || 0,
          uniqueContacts: messages.unique_contacts || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Command center overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/command-center/tasks/urgent
 * Get overdue and urgent tasks
 */
router.get('/api/command-center/tasks/urgent', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { limit = 10 } = req.query;
    const tenantId = extractTenantId(req);
    const activityFilter = getTenantFilters(db, 'activities', tenantId, 'a');

    const stmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        a.*,
        l.nome as lead_name,
        l.empresa as lead_empresa,
        c.nome as contact_name,
        o.nome as opportunity_name
      FROM activities a /* tenant-guard: ignore */
      LEFT JOIN leads l ON a.lead_id = l.id
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN opportunities o ON a.opportunity_id = o.id
      WHERE a.status IN ('pendente', 'em_andamento')
        AND (
          datetime(COALESCE(a.due_date, a.data_agendada)) < datetime('now')
          OR a.prioridade IN ('alta', 'urgente')
        )
        ${activityFilter.tenantAnd}
      ORDER BY
        CASE WHEN datetime(COALESCE(a.due_date, a.data_agendada)) < datetime('now') THEN 0 ELSE 1 END,
        CASE a.prioridade
          WHEN 'urgente' THEN 0
          WHEN 'alta' THEN 1
          WHEN 'media' THEN 2
          ELSE 3
        END,
        COALESCE(a.due_date, a.data_agendada) ASC
      LIMIT ?
    `);

    const tasks = stmt.all(...activityFilter.tenantParam, parseInt(limit));

    res.json({
      success: true,
      data: tasks.map(task => ({
        ...task,
        isOverdue: task.due_date && new Date(task.due_date) < new Date(),
        entity: task.lead_name || task.contact_name || task.opportunity_name || 'Sem vínculo'
      }))
    });
  } catch (error) {
    console.error('Urgent tasks error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/command-center/hot-leads
 * Get leads with high scores
 */
router.get('/api/command-center/hot-leads', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { limit = 10, minScore = 60 } = req.query;
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);

    const stmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        l.*,
        ls.total_score,
        ls.classification as grade,
        ls.firmographics_score as profile_score,
        ls.intent_score as engagement_score,
        ls.behavior_score,
        (SELECT MAX(created_at)
         FROM whatsapp_messages /* tenant-guard: ignore */
         WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}
        ) as last_message
      FROM leads l /* tenant-guard: ignore */
      LEFT JOIN lead_scores ls ON l.whatsapp = ls.contact_id
      WHERE l.status NOT IN ('convertido', 'desqualificado')
        AND (ls.total_score >= ? OR l.bant_score >= ?)
        ${leadFilter.tenantAnd}
      ORDER BY COALESCE(ls.total_score, l.bant_score, 0) DESC
      LIMIT ?
    `);

    const leads = stmt.all(
      parseInt(minScore),
      parseInt(minScore),
      ...messageFilter.tenantParam,
      ...leadFilter.tenantParam,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: leads.map(lead => ({
        ...lead,
        score: lead.total_score || lead.bant_score || 0,
        isHot: (lead.total_score || lead.bant_score || 0) >= 80
      }))
    });
  } catch (error) {
    console.error('Hot leads error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/command-center/activity-feed
 * Get recent activity feed
 */
router.get('/api/command-center/activity-feed', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { limit = 20 } = req.query;
    const tenantId = extractTenantId(req);
    const activityFilter = getTenantFilters(db, 'activities', tenantId, 'a');
    const leadFilter = getTenantFilters(db, 'leads', tenantId);
    const opportunityFilter = getTenantFilters(db, 'opportunities', tenantId);

    // Combine different activity types
    const activities = [];

    // Recent activities
    const activitiesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        'activity' as feed_type,
        a.id,
        a.tipo as type,
        a.assunto as title,
        a.status,
        a.created_at,
        l.nome as lead_name,
        c.nome as contact_name
      FROM activities a /* tenant-guard: ignore */
      LEFT JOIN leads l ON a.lead_id = l.id
      LEFT JOIN contacts c ON a.contact_id = c.id
      ${activityFilter.tenantWhere}
      ORDER BY a.created_at DESC
      LIMIT ?
    `);
    activities.push(...activitiesStmt.all(...activityFilter.tenantParam, parseInt(limit)));

    // Recent leads
    const leadsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        'lead' as feed_type,
        id,
        'new_lead' as type,
        nome as title,
        status,
        created_at,
        empresa as lead_name,
        NULL as contact_name
      FROM leads /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-7 days')
      ${leadFilter.tenantAnd}
      ORDER BY created_at DESC
      LIMIT ?
    `);
    activities.push(...leadsStmt.all(...leadFilter.tenantParam, parseInt(limit) / 2));

    // Recent opportunities
    const oppsStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        'opportunity' as feed_type,
        id,
        'deal_update' as type,
        nome as title,
        status,
        created_at,
        NULL as lead_name,
        NULL as contact_name
      FROM opportunities /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-7 days')
      ${opportunityFilter.tenantAnd}
      ORDER BY created_at DESC
      LIMIT ?
    `);
    activities.push(...oppsStmt.all(...opportunityFilter.tenantParam, parseInt(limit) / 2));

    // Sort by date and limit
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const feed = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/command-center/pipeline-summary
 * Get pipeline summary by stage
 */
router.get('/api/command-center/pipeline-summary', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);
    const opportunityFilter = getTenantFilters(db, 'opportunities', tenantId);

    const stmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        stage,
        COUNT(*) as count,
        SUM(valor) as total_value,
        AVG(valor) as avg_value,
        SUM(valor * probabilidade / 100) as weighted_value
      FROM opportunities /* tenant-guard: ignore */
      WHERE status = 'aberta'
        ${opportunityFilter.tenantAnd}
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

    const stages = stmt.all(...opportunityFilter.tenantParam);

    // Calculate totals
    const totals = stages.reduce((acc, stage) => ({
      count: acc.count + stage.count,
      value: acc.value + (stage.total_value || 0),
      weighted: acc.weighted + (stage.weighted_value || 0)
    }), { count: 0, value: 0, weighted: 0 });

    res.json({
      success: true,
      data: {
        stages,
        totals
      }
    });
  } catch (error) {
    console.error('Pipeline summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

/**
 * GET /api/command-center/performance
 * Get weekly performance metrics
 */
router.get('/api/command-center/performance', optionalAuth, (req, res) => {
  const db = getDb();
  try {
    const { days = 7 } = req.query;
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId);
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);
    const activityFilter = getTenantFilters(db, 'activities', tenantId);

    // Daily metrics for the period
    const dailyStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        date(created_at) as date,
        COUNT(*) as count
      FROM leads /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-' || ? || ' days')
        ${leadFilter.tenantAnd}
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    const dailyLeads = dailyStmt.all(parseInt(days), ...leadFilter.tenantParam);

    const messagesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        date(created_at) as date,
        COUNT(*) as sent,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received
      FROM whatsapp_messages /* tenant-guard: ignore */
      WHERE created_at > datetime('now', '-' || ? || ' days')
        ${messageFilter.tenantAnd}
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    const dailyMessages = messagesStmt.all(parseInt(days), ...messageFilter.tenantParam);

    const activitiesStmt = db.prepare(`
      /* tenant-guard: ignore */
      SELECT
        date(completed_at) as date,
        COUNT(*) as count,
        tipo
      FROM activities /* tenant-guard: ignore */
      WHERE status = 'concluida'
        AND completed_at > datetime('now', '-' || ? || ' days')
        ${activityFilter.tenantAnd}
      GROUP BY date(completed_at), tipo
      ORDER BY date ASC
    `);
    const dailyActivities = activitiesStmt.all(parseInt(days), ...activityFilter.tenantParam);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        leads: dailyLeads,
        messages: dailyMessages,
        activities: dailyActivities
      }
    });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada
  }
});

export default router;
