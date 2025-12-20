/**
 * ORBION Cadence Routes
 * API endpoints for Outbound Cadence Management (15-day flow)
 * Tables: cadences, cadence_steps, cadence_enrollments, cadence_actions_log
 *  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco
 */

import express from 'express';
import { getDatabase } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceIsolation, requireTenant } from '../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

// Limit auth middleware to the cadence API scope to avoid /app/* conflicts.
router.use('/api/cadences', authenticate, enforceIsolation, requireTenant);

/**
 * Helper: Get database connection
 *  CORREÇÃO: Usar conexão singleton do db/connection.js
 */
function getDb() {
  return getDatabase();
}


// ============================================================
// CADENCES (Templates)
// ============================================================

/**
 * GET /api/cadences
 * List all cadence templates
 */
router.get('/api/cadences', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    const cadences = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status = 'active' AND tenant_id = ?) as active_enrollments,
        (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status = 'responded' AND tenant_id = ?) as total_responses,
        (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status = 'converted' AND tenant_id = ?) as total_conversions
      FROM cadences c
      WHERE c.tenant_id = ?
      ORDER BY c.is_default DESC, c.name
    `).all(tenantId, tenantId, tenantId, tenantId);

    res.json({ success: true, cadences });
  } catch (error) {
    console.error('[CADENCE-API] Error listing cadences:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * GET /api/cadences/stats
 * Get cadence performance stats (MUST BE BEFORE /:id route)
 */
router.get('/api/cadences/stats', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    const totalEnrollments = db.prepare(`
      SELECT COUNT(*) as count
      FROM cadence_enrollments
      WHERE tenant_id = ?
    `).get(tenantId).count;
    const activeEnrollments = db.prepare(`
      SELECT COUNT(*) as count
      FROM cadence_enrollments
      WHERE status = 'active' AND tenant_id = ?
    `).get(tenantId).count;
    const respondedEnrollments = db.prepare(`
      SELECT COUNT(*) as count
      FROM cadence_enrollments
      WHERE status = 'responded' AND tenant_id = ?
    `).get(tenantId).count;
    const completedEnrollments = db.prepare(`
      SELECT COUNT(*) as count
      FROM cadence_enrollments
      WHERE status = 'completed' AND tenant_id = ?
    `).get(tenantId).count;
    const convertedEnrollments = db.prepare(`
      SELECT COUNT(*) as count
      FROM cadence_enrollments
      WHERE status = 'converted' AND tenant_id = ?
    `).get(tenantId).count;

    const responseRate = totalEnrollments > 0
      ? ((respondedEnrollments + convertedEnrollments) / totalEnrollments * 100).toFixed(1)
      : 0;

    const avgResponseDay = db.prepare(`
      SELECT AVG(first_response_day) as avg_day
      FROM cadence_enrollments
      WHERE first_response_day IS NOT NULL AND tenant_id = ?
    `).get(tenantId).avg_day || 0;

    const byChannel = db.prepare(`
      SELECT first_response_channel as channel, COUNT(*) as count
      FROM cadence_enrollments
      WHERE first_response_channel IS NOT NULL AND tenant_id = ?
      GROUP BY first_response_channel
    `).all(tenantId);

    const byResponseType = db.prepare(`
      SELECT response_type, COUNT(*) as count
      FROM cadence_enrollments
      WHERE response_type IS NOT NULL AND tenant_id = ?
      GROUP BY response_type
    `).all(tenantId);

    const byDay = db.prepare(`
      SELECT first_response_day as day, COUNT(*) as count
      FROM cadence_enrollments
      WHERE first_response_day IS NOT NULL AND tenant_id = ?
      GROUP BY first_response_day
      ORDER BY first_response_day
    `).all(tenantId);

    const byStage = db.prepare(`
      SELECT ps.name as stage, ps.color, COUNT(l.id) as count
      FROM pipeline_stages ps
      LEFT JOIN leads l ON l.stage_id = ps.id
      WHERE ps.pipeline_id = 'pipeline_outbound_solar'
        AND ps.tenant_id = ?
        AND l.tenant_id = ?
      GROUP BY ps.id
      ORDER BY ps.position
    `).all(tenantId, tenantId);

    res.json({
      success: true,
      stats: {
        total_enrollments: totalEnrollments,
        active: activeEnrollments,
        responded: respondedEnrollments,
        completed: completedEnrollments,
        converted: convertedEnrollments,
        response_rate: parseFloat(responseRate),
        avg_response_day: parseFloat((avgResponseDay || 0).toFixed ? avgResponseDay.toFixed(1) : 0),
        by_channel: byChannel,
        by_response_type: byResponseType,
        by_day: byDay,
        by_stage: byStage
      }
    });
  } catch (error) {
    console.error('[CADENCE-API] Error getting stats:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * GET /api/cadences/pipeline-view
 * Get leads organized by pipeline stage (Kanban view) (MUST BE BEFORE /:id route)
 */
router.get('/api/cadences/pipeline-view', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    const stages = db.prepare(`
      SELECT * FROM pipeline_stages
      WHERE pipeline_id = 'pipeline_outbound_solar'
        AND tenant_id = ?
      ORDER BY position
    `).all(tenantId);

    const result = stages.map(stage => {
      const leads = db.prepare(`
        SELECT
          l.id, l.nome, l.empresa, l.telefone, l.email,
          l.cadence_day, l.cadence_status, l.response_type,
          l.first_response_at, l.stage_entered_at,
          ce.current_day, ce.messages_sent
        FROM leads l
        LEFT JOIN cadence_enrollments ce ON ce.lead_id = l.id AND ce.status IN ('active', 'responded')
          AND ce.tenant_id = ?
        WHERE l.stage_id = ?
          AND l.tenant_id = ?
        ORDER BY l.updated_at DESC
        LIMIT 50
      `).all(tenantId, stage.id, tenantId);

      return {
        id: stage.id,
        name: stage.name,
        slug: stage.slug,
        color: stage.color,
        icon: stage.icon,
        position: stage.position,
        probability: stage.probability,
        leads: leads,
        count: leads.length
      };
    });

    res.json({ success: true, stages: result });
  } catch (error) {
    console.error('[CADENCE-API] Error getting pipeline view:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * GET /api/cadences/:id
 * Get cadence details with steps
 */
router.get('/api/cadences/:id', (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);

    const cadence = db.prepare(`
      SELECT * FROM cadences
      WHERE id = ? AND tenant_id = ?
    `).get(id, tenantId);
    if (!cadence) {
      return res.status(404).json({ success: false, error: 'Cadence not found' });
    }

    const steps = db.prepare(`
      SELECT * FROM cadence_steps
      WHERE cadence_id = ? AND tenant_id = ?
      ORDER BY day, step_order
    `).all(id, tenantId);

    res.json({ success: true, cadence, steps });
  } catch (error) {
    console.error('[CADENCE-API] Error getting cadence:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * GET /api/cadences/:id/steps
 * Get all steps for a cadence
 */
router.get('/api/cadences/:id/steps', (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);

    const steps = db.prepare(`
      SELECT * FROM cadence_steps
      WHERE cadence_id = ? AND tenant_id = ?
      ORDER BY day, step_order
    `).all(id, tenantId);

    // Group by day
    const byDay = {};
    steps.forEach(step => {
      if (!byDay[step.day]) byDay[step.day] = [];
      byDay[step.day].push(step);
    });

    res.json({ success: true, steps, byDay });
  } catch (error) {
    console.error('[CADENCE-API] Error getting steps:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

// ============================================================
// ENROLLMENTS (Leads in Cadence)
// ============================================================

/**
 * POST /api/cadences/:id/enroll
 * Enroll a lead in a cadence
 */
router.post('/api/cadences/:id/enroll', (req, res) => {
  const db = getDb();
  try {
    const { id: cadenceId } = req.params;
    const { lead_id, enrolled_by } = req.body;
    const tenantId = extractTenantId(req);

    if (!lead_id) {
      return res.status(400).json({ success: false, error: 'lead_id is required' });
    }

    // Check if already enrolled
    const existing = db.prepare(`
      SELECT * FROM cadence_enrollments
      WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused')
        AND tenant_id = ?
    `).get(cadenceId, lead_id, tenantId);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Lead already enrolled in this cadence',
        enrollment: existing
      });
    }

    // Create enrollment
    const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const startedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO cadence_enrollments (
        id, cadence_id, lead_id, status, current_day, enrolled_by, started_at, tenant_id
      )
      VALUES (?, ?, ?, 'active', 1, ?, ?, ?)
    `).run(enrollmentId, cadenceId, lead_id, enrolled_by || 'system', startedAt, tenantId);

    // Update lead cadence fields
    db.prepare(`
      UPDATE leads SET
        cadence_id = ?,
        cadence_status = 'active',
        cadence_started_at = datetime('now'),
        cadence_day = 1,
        stage_id = 'stage_em_cadencia',
        stage_entered_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(cadenceId, lead_id, tenantId);

    // Log to pipeline history
    db.prepare(`
      INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
      VALUES (?, ?, 'stage_lead_novo', 'stage_em_cadencia', ?, 'Enrolled in cadence')
    `).run(`ph_${Date.now()}`, lead_id, enrolled_by || 'system');

    console.log(`[CADENCE-API] Lead ${lead_id} enrolled in cadence ${cadenceId}`);

    res.json({
      success: true,
      enrollment_id: enrollmentId,
      message: 'Lead enrolled successfully'
    });
  } catch (error) {
    console.error('[CADENCE-API] Error enrolling lead:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * GET /api/cadences/enrollments/active
 * Get all active enrollments (leads currently in cadence)
 */
router.get('/api/cadences/enrollments/active', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    const enrollments = db.prepare(`
      SELECT
        e.*,
        l.nome as lead_nome,
        l.empresa as lead_empresa,
        l.telefone as lead_telefone,
        l.email as lead_email,
        c.name as cadence_name,
        cs.name as current_step_name,
        cs.channel as current_step_channel
      FROM cadence_enrollments e
      JOIN leads l ON e.lead_id = l.id
      JOIN cadences c ON e.cadence_id = c.id
      LEFT JOIN cadence_steps cs ON e.current_step = cs.id AND e.cadence_id = cs.cadence_id
        AND cs.tenant_id = ?
      WHERE e.status = 'active'
        AND e.tenant_id = ?
        AND l.tenant_id = ?
        AND c.tenant_id = ?
      ORDER BY e.current_day DESC, e.enrolled_at DESC
    `).all(tenantId, tenantId, tenantId, tenantId);

    // Stats
    const stats = {
      total_active: enrollments.length,
      by_day: {},
      by_cadence: {}
    };

    enrollments.forEach(e => {
      stats.by_day[e.current_day] = (stats.by_day[e.current_day] || 0) + 1;
      stats.by_cadence[e.cadence_name] = (stats.by_cadence[e.cadence_name] || 0) + 1;
    });

    res.json({ success: true, enrollments, stats });
  } catch (error) {
    console.error('[CADENCE-API] Error getting active enrollments:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * PUT /api/cadences/enrollments/:id/pause
 * Pause an enrollment
 */
router.put('/api/cadences/enrollments/:id/pause', (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = extractTenantId(req);

    db.prepare(`
      UPDATE cadence_enrollments
      SET status = 'paused', paused_at = datetime('now'), pause_reason = ?
      WHERE id = ? AND tenant_id = ?
    `).run(reason || 'Manual pause', id, tenantId);

    // Get lead_id to update leads table
    const enrollment = db.prepare(`
      SELECT lead_id FROM cadence_enrollments
      WHERE id = ? AND tenant_id = ?
    `).get(id, tenantId);
    if (enrollment) {
      db.prepare(`
        UPDATE leads SET cadence_status = 'paused', updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment.lead_id, tenantId);
    }

    res.json({ success: true, message: 'Enrollment paused' });
  } catch (error) {
    console.error('[CADENCE-API] Error pausing enrollment:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * PUT /api/cadences/enrollments/:id/resume
 * Resume a paused enrollment
 */
router.put('/api/cadences/enrollments/:id/resume', (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);

    db.prepare(`
      UPDATE cadence_enrollments
      SET status = 'active', paused_at = NULL, pause_reason = NULL
      WHERE id = ? AND tenant_id = ?
    `).run(id, tenantId);

    const enrollment = db.prepare(`
      SELECT lead_id FROM cadence_enrollments
      WHERE id = ? AND tenant_id = ?
    `).get(id, tenantId);
    if (enrollment) {
      db.prepare(`
        UPDATE leads SET cadence_status = 'active', updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment.lead_id, tenantId);
    }

    res.json({ success: true, message: 'Enrollment resumed' });
  } catch (error) {
    console.error('[CADENCE-API] Error resuming enrollment:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * PUT /api/cadences/enrollments/:id/respond
 * Mark enrollment as responded (lead replied)
 */
router.put('/api/cadences/enrollments/:id/respond', (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { response_channel, response_type } = req.body;
    const tenantId = extractTenantId(req);

    const enrollment = db.prepare(`
      SELECT * FROM cadence_enrollments
      WHERE id = ? AND tenant_id = ?
    `).get(id, tenantId);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    // Update enrollment
    db.prepare(`
      UPDATE cadence_enrollments
      SET status = 'responded',
          responded_at = datetime('now'),
          first_response_channel = ?,
          first_response_day = current_day,
          response_type = ?
      WHERE id = ? AND tenant_id = ?
    `).run(response_channel || 'whatsapp', response_type, id, tenantId);

    // Update lead
    db.prepare(`
      UPDATE leads SET
        cadence_status = 'responded',
        first_response_at = datetime('now'),
        first_response_channel = ?,
        response_type = ?,
        stage_id = 'stage_respondeu',
        stage_entered_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(response_channel || 'whatsapp', response_type, enrollment.lead_id, tenantId);

    // Log pipeline movement
    db.prepare(`
      INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
      VALUES (?, ?, 'stage_em_cadencia', 'stage_respondeu', 'system', 'Lead responded to cadence')
    `).run(`ph_${Date.now()}`, enrollment.lead_id);

    console.log(`[CADENCE-API] Lead ${enrollment.lead_id} responded on day ${enrollment.current_day}`);

    res.json({ success: true, message: 'Enrollment marked as responded' });
  } catch (error) {
    console.error('[CADENCE-API] Error marking response:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

// ============================================================
// CADENCE EXECUTION (Actions)
// ============================================================

/**
 * GET /api/cadences/actions/pending
 * Get pending actions for today (to be executed)
 */
router.get('/api/cadences/actions/pending', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    // Get all active enrollments and determine which actions need to run today
    const enrollments = db.prepare(`
      SELECT
        e.id as enrollment_id,
        e.lead_id,
        e.cadence_id,
        e.current_day,
        e.messages_sent,
        l.nome as lead_nome,
        l.empresa as lead_empresa,
        l.telefone as lead_telefone,
        l.email as lead_email
      FROM cadence_enrollments e
      JOIN leads l ON e.lead_id = l.id AND l.tenant_id = ?
      WHERE e.status = 'active'
        AND e.tenant_id = ?
    `).all(tenantId, tenantId);

    const pendingActions = [];

    enrollments.forEach(enrollment => {
      // Get steps for current day
      const steps = db.prepare(`
        SELECT * FROM cadence_steps
        WHERE cadence_id = ? AND day = ? AND is_active = 1
          AND tenant_id = ?
        ORDER BY step_order
      `).all(enrollment.cadence_id, enrollment.current_day, tenantId);

      steps.forEach(step => {
        // Check if already executed today
        const alreadyExecuted = db.prepare(`
          SELECT id FROM cadence_actions_log
          WHERE enrollment_id = ? AND step_id = ? AND day = ?
          AND status IN ('sent', 'delivered')
          AND tenant_id = ?
        `).get(enrollment.enrollment_id, step.id, enrollment.current_day, tenantId);

        if (!alreadyExecuted) {
          pendingActions.push({
            enrollment_id: enrollment.enrollment_id,
            lead_id: enrollment.lead_id,
            lead_nome: enrollment.lead_nome,
            lead_empresa: enrollment.lead_empresa,
            lead_telefone: enrollment.lead_telefone,
            lead_email: enrollment.lead_email,
            step_id: step.id,
            step_name: step.name,
            day: step.day,
            channel: step.channel,
            action_type: step.action_type,
            content: step.content,
            subject: step.subject
          });
        }
      });
    });

    res.json({
      success: true,
      pending_actions: pendingActions,
      count: pendingActions.length
    });
  } catch (error) {
    console.error('[CADENCE-API] Error getting pending actions:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * POST /api/cadences/actions/execute
 * Execute a cadence action (send message, create task, etc.)
 */
router.post('/api/cadences/actions/execute', (req, res) => {
  const db = getDb();
  try {
    const { enrollment_id, step_id, lead_id, channel, content_sent } = req.body;
    const tenantId = extractTenantId(req);

    if (!enrollment_id || !step_id || !lead_id) {
      return res.status(400).json({
        success: false,
        error: 'enrollment_id, step_id, and lead_id are required'
      });
    }

    const enrollment = db.prepare(`
      SELECT * FROM cadence_enrollments
      WHERE id = ? AND tenant_id = ?
    `).get(enrollment_id, tenantId);
    const step = db.prepare(`
      SELECT * FROM cadence_steps
      WHERE id = ? AND tenant_id = ?
    `).get(step_id, tenantId);

    if (!enrollment || !step) {
      return res.status(404).json({ success: false, error: 'Enrollment or step not found' });
    }

    // Log the action
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO cadence_actions_log (
        id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at, tenant_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?)
    `).run(
      actionId,
      enrollment_id,
      step_id,
      lead_id,
      step.action_type,
      channel || step.channel,
      enrollment.current_day,
      content_sent || step.content,
      new Date().toISOString(),
      tenantId
    );

    // Update enrollment counters
    if (step.channel === 'whatsapp') {
      db.prepare(`
        UPDATE cadence_enrollments
        SET messages_sent = messages_sent + 1
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment_id, tenantId);
    } else if (step.channel === 'email') {
      db.prepare(`
        UPDATE cadence_enrollments
        SET emails_sent = emails_sent + 1
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment_id, tenantId);
    } else if (step.channel === 'phone') {
      db.prepare(`
        UPDATE cadence_enrollments
        SET calls_made = calls_made + 1
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment_id, tenantId);
    }

    // Update lead last action
    db.prepare(`
      UPDATE leads SET
        cadence_last_action_at = datetime('now'),
        cadence_attempt_count = cadence_attempt_count + 1,
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).run(lead_id, tenantId);

    console.log(`[CADENCE-API] Executed action ${actionId} for lead ${lead_id} on day ${enrollment.current_day}`);

    res.json({
      success: true,
      action_id: actionId,
      message: `Action executed: ${step.name}`
    });
  } catch (error) {
    console.error('[CADENCE-API] Error executing action:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

/**
 * POST /api/cadences/advance-day
 * Advance all active enrollments to next day (run daily by cron)
 */
router.post('/api/cadences/advance-day', (req, res) => {
  const db = getDb();
  try {
    const tenantId = extractTenantId(req);

    // Get all active enrollments
    const enrollments = db.prepare(`
      SELECT e.*, c.duration_days
      FROM cadence_enrollments e
      JOIN cadences c ON e.cadence_id = c.id
      WHERE e.status = 'active'
        AND e.tenant_id = ?
        AND c.tenant_id = ?
    `).all(tenantId, tenantId);

    let advanced = 0;
    let completed = 0;

    enrollments.forEach(enrollment => {
      const nextDay = enrollment.current_day + 1;

      if (nextDay > enrollment.duration_days) {
        // Cadence completed without response - move to nurture
        db.prepare(`
          UPDATE cadence_enrollments
          SET status = 'completed', completed_at = datetime('now'), completion_reason = 'No response after full cadence'
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.id, tenantId);

        db.prepare(`
          UPDATE leads SET
            cadence_status = 'completed',
            stage_id = 'stage_nutricao',
            stage_entered_at = datetime('now'),
            in_nurture_flow = 1,
            nurture_started_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.lead_id, tenantId);

        db.prepare(`
          INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
          VALUES (?, ?, 'stage_em_cadencia', 'stage_nutricao', 'system', 'Cadence completed without response')
        `).run(`ph_${Date.now()}_${enrollment.id}`, enrollment.lead_id);

        completed++;
      } else {
        // Advance to next day
        db.prepare(`
          UPDATE cadence_enrollments
          SET current_day = ?
          WHERE id = ? AND tenant_id = ?
        `).run(nextDay, enrollment.id, tenantId);

        db.prepare(`
          UPDATE leads
          SET cadence_day = ?, updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(nextDay, enrollment.lead_id, tenantId);

        advanced++;
      }
    });

    console.log(`[CADENCE-API] Advanced ${advanced} enrollments, completed ${completed}`);

    res.json({
      success: true,
      advanced,
      completed,
      message: `Processed ${enrollments.length} enrollments`
    });
  } catch (error) {
    console.error('[CADENCE-API] Error advancing day:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // db.close() removido - conexão centralizada gerencia lifecycle
  }
});

export default router;
