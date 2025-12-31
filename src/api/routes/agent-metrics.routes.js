/**
 * @file agent-metrics.routes.js
 * @description Agent Type-Specific Metrics API
 *
 * Returns different metrics based on agent type:
 * - SDR/Specialist: leads, BANT, conversion, pipeline
 * - Support: tickets, SLA, resolution time, CSAT
 * - Scheduler: bookings, no-shows, availability
 * - Document Handler: documents processed, OCR stats, errors
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

// Auth middleware for all agent metrics routes
router.use('/api/agents/:agentId/metrics', authenticate, tenantContext, requireTenant);
router.use('/api/agents/:agentId/tabs', authenticate, tenantContext, requireTenant);

// ============================================================================
// TAB CONFIGURATION BY AGENT TYPE
// ============================================================================

const DEFAULT_TABS_BY_TYPE = {
  sdr: [
    { id: 'metrics', label: 'Metricas', icon: 'BarChart2', enabled: true },
    { id: 'leads', label: 'Leads', icon: 'Users', enabled: true },
    { id: 'pipeline', label: 'Pipeline', icon: 'Columns', enabled: true },
    { id: 'cadence', label: 'Cadencia', icon: 'Clock', enabled: true },
    { id: 'prospecting', label: 'Prospeccao', icon: 'Target', enabled: true },
    { id: 'settings', label: 'Config', icon: 'Settings', enabled: true }
  ],
  specialist: [
    { id: 'metrics', label: 'Metricas', icon: 'BarChart2', enabled: true },
    { id: 'leads', label: 'Leads', icon: 'Users', enabled: true },
    { id: 'pipeline', label: 'Pipeline', icon: 'Columns', enabled: true },
    { id: 'cadence', label: 'Cadencia', icon: 'Clock', enabled: true },
    { id: 'prospecting', label: 'Prospeccao', icon: 'Target', enabled: true },
    { id: 'settings', label: 'Config', icon: 'Settings', enabled: true }
  ],
  support: [
    { id: 'metrics', label: 'Metricas', icon: 'BarChart2', enabled: true },
    { id: 'tickets', label: 'Tickets', icon: 'MessageSquare', enabled: true },
    { id: 'conversations', label: 'Conversas', icon: 'MessagesSquare', enabled: true },
    { id: 'settings', label: 'Config', icon: 'Settings', enabled: true }
  ],
  scheduler: [
    { id: 'metrics', label: 'Metricas', icon: 'BarChart2', enabled: true },
    { id: 'bookings', label: 'Agendamentos', icon: 'Calendar', enabled: true },
    { id: 'pipeline', label: 'Pipeline', icon: 'Columns', enabled: true },
    { id: 'settings', label: 'Config', icon: 'Settings', enabled: true }
  ],
  document_handler: [
    { id: 'metrics', label: 'Metricas', icon: 'BarChart2', enabled: true },
    { id: 'documents', label: 'Documentos', icon: 'FileText', enabled: true },
    { id: 'packages', label: 'Pacotes', icon: 'FolderOpen', enabled: true },
    { id: 'settings', label: 'Config', icon: 'Settings', enabled: true }
  ]
};

/**
 * GET /api/agents/:agentId/tabs
 * Returns available tabs for the agent based on its type
 */
router.get('/api/agents/:agentId/tabs', async (req, res) => {
  try {
    const { agentId } = req.params;
    const tenantId = extractTenantId(req);
    const db = getDatabase();

    // Get agent type
    const agent = db.prepare(`
      SELECT id, type FROM agents
      WHERE id = ? AND tenant_id = ?
    `).get(agentId, tenantId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get default tabs for agent type
    const defaultTabs = DEFAULT_TABS_BY_TYPE[agent.type] || DEFAULT_TABS_BY_TYPE.sdr;

    // Check for custom tab configuration
    const customTabs = db.prepare(`
      SELECT tab_id, enabled, position, custom_label
      FROM agent_tab_config
      WHERE agent_id = ? AND tenant_id = ?
      ORDER BY position
    `).all(agentId, tenantId);

    // Merge defaults with custom config
    let tabs = defaultTabs;
    if (customTabs.length > 0) {
      tabs = defaultTabs.map(tab => {
        const custom = customTabs.find(c => c.tab_id === tab.id);
        if (custom) {
          return {
            ...tab,
            enabled: custom.enabled === 1,
            label: custom.custom_label || tab.label,
            position: custom.position
          };
        }
        return tab;
      }).filter(t => t.enabled).sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    res.json({
      success: true,
      agentType: agent.type,
      tabs
    });

  } catch (error) {
    console.error('[AGENT-TABS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/:agentId/metrics
 * Returns metrics specific to the agent type
 */
router.get('/api/agents/:agentId/metrics', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = '7d' } = req.query;
    const tenantId = extractTenantId(req);
    const db = getDatabase();

    // Get agent type
    const agent = db.prepare(`
      SELECT id, type, name FROM agents
      WHERE id = ? AND tenant_id = ?
    `).get(agentId, tenantId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Calculate date range
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    let metrics;

    switch (agent.type) {
      case 'sdr':
      case 'specialist':
        metrics = await getSDRMetrics(db, agentId, tenantId, fromDateStr);
        break;
      case 'support':
        metrics = await getSupportMetrics(db, agentId, tenantId, fromDateStr);
        break;
      case 'scheduler':
        metrics = await getSchedulerMetrics(db, agentId, tenantId, fromDateStr);
        break;
      case 'document_handler':
        metrics = await getDocumentHandlerMetrics(db, agentId, tenantId, fromDateStr);
        break;
      default:
        metrics = await getSDRMetrics(db, agentId, tenantId, fromDateStr);
    }

    res.json({
      success: true,
      agentId,
      agentType: agent.type,
      agentName: agent.name,
      period,
      metrics
    });

  } catch (error) {
    console.error('[AGENT-METRICS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// METRIC FUNCTIONS BY TYPE
// ============================================================================

/**
 * SDR/Specialist Metrics
 */
async function getSDRMetrics(db, agentId, tenantId, fromDate) {
  // Total leads for this agent
  const totalLeads = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
  `).get(agentId, tenantId, fromDate)?.count || 0;

  // Leads by stage
  const leadsByStage = db.prepare(`
    SELECT stage_id, COUNT(*) as count
    FROM leads
    WHERE agent_id = ? AND tenant_id = ?
    GROUP BY stage_id
  `).all(agentId, tenantId);

  // Messages sent/received
  const messageStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received
    FROM whatsapp_messages
    WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
  `).get(agentId, tenantId, fromDate) || { total: 0, sent: 0, received: 0 };

  // Conversion rate (leads that reached qualified stage)
  const qualifiedLeads = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE agent_id = ? AND tenant_id = ?
      AND stage_id IN ('stage_qualificado', 'stage_proposta', 'stage_negociacao', 'stage_ganhou')
  `).get(agentId, tenantId)?.count || 0;

  // Average BANT score
  const avgBantScore = db.prepare(`
    SELECT AVG(bant_score) as avg FROM leads
    WHERE agent_id = ? AND tenant_id = ? AND bant_score > 0
  `).get(agentId, tenantId)?.avg || 0;

  // Pipeline value
  const pipelineValue = db.prepare(`
    SELECT SUM(CAST(valor AS REAL)) as total FROM leads
    WHERE agent_id = ? AND tenant_id = ?
      AND stage_id IN ('stage_proposta', 'stage_negociacao')
  `).get(agentId, tenantId)?.total || 0;

  // Won deals
  const wonDeals = db.prepare(`
    SELECT COUNT(*) as count, SUM(CAST(valor AS REAL)) as value FROM leads
    WHERE agent_id = ? AND tenant_id = ? AND stage_id = 'stage_ganhou'
  `).get(agentId, tenantId) || { count: 0, value: 0 };

  // Cadence stats
  const cadenceStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM cadence_enrollments ce
    JOIN leads l ON ce.lead_id = l.id
    WHERE l.agent_id = ? AND l.tenant_id = ?
  `).get(agentId, tenantId) || { total: 0, active: 0, responded: 0, completed: 0 };

  return {
    summary: {
      totalLeads,
      qualifiedLeads,
      conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0,
      avgBantScore: parseFloat(avgBantScore).toFixed(1),
      pipelineValue,
      wonDeals: wonDeals.count,
      wonValue: wonDeals.value || 0
    },
    messages: {
      total: messageStats.total,
      sent: messageStats.sent,
      received: messageStats.received,
      responseRate: messageStats.sent > 0 ? ((messageStats.received / messageStats.sent) * 100).toFixed(1) : 0
    },
    funnel: {
      byStage: leadsByStage.reduce((acc, s) => {
        acc[s.stage_id] = s.count;
        return acc;
      }, {})
    },
    cadence: cadenceStats
  };
}

/**
 * Support Agent Metrics
 */
async function getSupportMetrics(db, agentId, tenantId, fromDate) {
  // Check if support_tickets table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='support_tickets'
  `).get();

  if (!tableExists) {
    // Fallback to conversation-based metrics
    const conversations = db.prepare(`
      SELECT
        COUNT(DISTINCT phone_number) as total_conversations,
        COUNT(*) as total_messages,
        SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as agent_messages,
        SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as customer_messages
      FROM whatsapp_messages
      WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
    `).get(agentId, tenantId, fromDate) || {};

    return {
      summary: {
        totalConversations: conversations.total_conversations || 0,
        totalMessages: conversations.total_messages || 0,
        avgMessagesPerConversation: conversations.total_conversations > 0
          ? (conversations.total_messages / conversations.total_conversations).toFixed(1)
          : 0
      },
      messages: {
        agentMessages: conversations.agent_messages || 0,
        customerMessages: conversations.customer_messages || 0
      },
      tickets: {
        open: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        note: 'Tabela support_tickets nao existe. Execute a migracao 054.'
      }
    };
  }

  // Full ticket-based metrics
  const ticketStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated,
      AVG(resolution_time_ms) as avg_resolution_time,
      AVG(first_response_time_ms) as avg_first_response,
      SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as sla_breached,
      AVG(csat_score) as avg_csat
    FROM support_tickets
    WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
  `).get(agentId, tenantId, fromDate) || {};

  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM support_tickets
    WHERE agent_id = ? AND tenant_id = ?
    GROUP BY priority
  `).all(agentId, tenantId);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM support_tickets
    WHERE agent_id = ? AND tenant_id = ? AND category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `).all(agentId, tenantId);

  return {
    summary: {
      totalTickets: ticketStats.total || 0,
      openTickets: (ticketStats.open || 0) + (ticketStats.pending || 0) + (ticketStats.in_progress || 0),
      resolvedTickets: (ticketStats.resolved || 0) + (ticketStats.closed || 0),
      escalatedTickets: ticketStats.escalated || 0,
      avgResolutionTimeMs: ticketStats.avg_resolution_time || 0,
      avgFirstResponseMs: ticketStats.avg_first_response || 0,
      slaBreached: ticketStats.sla_breached || 0,
      avgCsat: ticketStats.avg_csat ? parseFloat(ticketStats.avg_csat).toFixed(1) : null
    },
    tickets: {
      open: ticketStats.open || 0,
      pending: ticketStats.pending || 0,
      inProgress: ticketStats.in_progress || 0,
      resolved: ticketStats.resolved || 0,
      closed: ticketStats.closed || 0,
      escalated: ticketStats.escalated || 0
    },
    breakdown: {
      byPriority: byPriority.reduce((acc, p) => { acc[p.priority] = p.count; return acc; }, {}),
      byCategory
    }
  };
}

/**
 * Scheduler Agent Metrics
 */
async function getSchedulerMetrics(db, agentId, tenantId, fromDate) {
  // Check if scheduler_bookings table exists
  const bookingsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='scheduler_bookings'
  `).get();

  // Use meetings table as fallback/primary source
  const meetingStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'agendada' OR status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN status = 'confirmada' OR status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'realizada' OR status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
      SUM(CASE WHEN status = 'cancelada' OR status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM meetings
    WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
  `).get(agentId, tenantId, fromDate) || {};

  // Upcoming meetings
  const upcomingMeetings = db.prepare(`
    SELECT COUNT(*) as count FROM meetings
    WHERE agent_id = ? AND tenant_id = ?
      AND meeting_date >= date('now')
      AND status NOT IN ('cancelada', 'cancelled', 'realizada', 'completed')
  `).get(agentId, tenantId)?.count || 0;

  // Today's meetings
  const todayMeetings = db.prepare(`
    SELECT COUNT(*) as count FROM meetings
    WHERE agent_id = ? AND tenant_id = ?
      AND date(meeting_date) = date('now')
  `).get(agentId, tenantId)?.count || 0;

  // By type
  const byType = db.prepare(`
    SELECT meeting_type, COUNT(*) as count
    FROM meetings
    WHERE agent_id = ? AND tenant_id = ?
    GROUP BY meeting_type
  `).all(agentId, tenantId);

  // Completion rate
  const totalFinalized = (meetingStats.completed || 0) + (meetingStats.no_show || 0);
  const completionRate = totalFinalized > 0
    ? ((meetingStats.completed / totalFinalized) * 100).toFixed(1)
    : 0;

  return {
    summary: {
      totalBookings: meetingStats.total || 0,
      upcomingBookings: upcomingMeetings,
      todayBookings: todayMeetings,
      completedBookings: meetingStats.completed || 0,
      noShowCount: meetingStats.no_show || 0,
      cancelledCount: meetingStats.cancelled || 0,
      completionRate
    },
    bookings: {
      scheduled: meetingStats.scheduled || 0,
      confirmed: meetingStats.confirmed || 0,
      completed: meetingStats.completed || 0,
      noShow: meetingStats.no_show || 0,
      cancelled: meetingStats.cancelled || 0
    },
    breakdown: {
      byType: byType.reduce((acc, t) => { acc[t.meeting_type || 'default'] = t.count; return acc; }, {})
    }
  };
}

/**
 * Document Handler Agent Metrics
 * Includes both documents AND RH events (FERIAS, ATESTADO, etc)
 */
async function getDocumentHandlerMetrics(db, agentId, tenantId, fromDate) {
  // Check if rh_events table exists (primary source for this agent type)
  const rhEventsExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='rh_events'
  `).get();

  // RH Events stats
  let rhStats = { total: 0, sent: 0, partial: 0, received: 0 };
  let rhByType = [];
  let recentRhEvents = [];

  if (rhEventsExists) {
    rhStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'received' OR status = 'processing' THEN 1 ELSE 0 END) as received
      FROM rh_events
      WHERE agent_id = ? AND created_at >= ?
    `).get(agentId, fromDate) || rhStats;

    rhByType = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM rh_events
      WHERE agent_id = ?
      GROUP BY event_type
    `).all(agentId);

    recentRhEvents = db.prepare(`
      SELECT id, event_type, message, status, created_at
      FROM rh_events
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(agentId);
  }

  // Check if documents table exists
  const docsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='documents'
  `).get();

  let docStats = { total: 0, pending: 0, processing: 0, completed: 0, errors: 0 };

  if (docsTableExists) {
    docStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM documents
      WHERE agent_id = ? AND tenant_id = ? AND created_at >= ?
    `).get(agentId, tenantId, fromDate) || docStats;
  }

  // Combined totals
  const totalEvents = (rhStats.total || 0) + (docStats.total || 0);
  const totalSent = (rhStats.sent || 0) + (docStats.completed || 0);
  const totalPending = (rhStats.received || 0) + (docStats.pending || 0);
  const totalErrors = (rhStats.partial || 0) + (docStats.errors || 0);

  const successRate = totalEvents > 0
    ? ((totalSent / totalEvents) * 100).toFixed(1)
    : 0;

  return {
    summary: {
      totalEvents,
      sent: totalSent,
      pending: totalPending,
      errors: totalErrors,
      successRate
    },
    rhEvents: {
      total: rhStats.total || 0,
      sent: rhStats.sent || 0,
      partial: rhStats.partial || 0,
      byType: rhByType.reduce((acc, t) => { acc[t.event_type] = t.count; return acc; }, {})
    },
    documents: {
      total: docStats.total || 0,
      completed: docStats.completed || 0,
      pending: docStats.pending || 0,
      errors: docStats.errors || 0
    },
    recentEvents: recentRhEvents.map(e => ({
      id: e.id,
      type: e.event_type,
      message: e.message?.substring(0, 100) + (e.message?.length > 100 ? '...' : ''),
      status: e.status,
      createdAt: e.created_at
    }))
  };
}

export default router;
