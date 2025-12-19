/**
 * @file activities.routes.js
 * @description Activities and Tasks API routes
 */

import express from 'express';
import { Activity } from '../../models/Activity.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();
const activityModel = new Activity();

/**
 * GET /api/activities
 * List activities with filters
 */
router.get('/api/activities', optionalAuth, (req, res) => {
  try {
    const { page = 1, limit = 50, status, tipo, lead_id, contact_id, opportunity_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (lead_id) where.lead_id = lead_id;
    if (contact_id) where.contact_id = contact_id;
    if (opportunity_id) where.opportunity_id = opportunity_id;

    const activities = activityModel.findAll({
      where,
      limit: parseInt(limit),
      offset,
      orderBy: 'due_date ASC, created_at DESC'
    });

    const total = activityModel.count({ where });

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/timeline
 * Get activity timeline
 */
router.get('/api/activities/timeline', optionalAuth, (req, res) => {
  try {
    const { limit = 50, offset = 0, entityType, entityId } = req.query;
    const userId = req.user?.id;

    const timeline = activityModel.getTimeline({
      userId,
      entityType,
      entityId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/overdue
 * Get overdue activities
 */
router.get('/api/activities/overdue', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    const overdue = activityModel.findOverdue(userId);

    res.json({
      success: true,
      data: overdue,
      count: overdue.length
    });
  } catch (error) {
    console.error('Get overdue error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/today
 * Get today's activities
 */
router.get('/api/activities/today', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    const today = activityModel.findToday(userId);

    res.json({
      success: true,
      data: today,
      count: today.length
    });
  } catch (error) {
    console.error('Get today activities error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/upcoming
 * Get upcoming activities
 */
router.get('/api/activities/upcoming', optionalAuth, (req, res) => {
  try {
    const { days = 7, limit = 50 } = req.query;
    const userId = req.user?.id;

    const upcoming = activityModel.findUpcoming(userId, {
      days: parseInt(days),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: upcoming,
      count: upcoming.length
    });
  } catch (error) {
    console.error('Get upcoming error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/stats
 * Get activity statistics
 */
router.get('/api/activities/stats', optionalAuth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;

    const byStatus = activityModel.getCountsByStatus(userId);
    const byType = activityModel.getCountsByType(userId, { startDate, endDate });

    res.json({
      success: true,
      data: {
        byStatus,
        byType
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/:id
 * Get single activity
 */
router.get('/api/activities/:id', (req, res) => {
  try {
    const activity = activityModel.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/activities
 * Create new activity
 */
router.post('/api/activities', optionalAuth, (req, res) => {
  try {
    const {
      tipo, titulo, descricao,
      lead_id, contact_id, account_id, opportunity_id,
      due_date, due_time, priority,
      assigned_to
    } = req.body;

    // Validation
    if (!tipo || !titulo) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e título são obrigatórios'
      });
    }

    const activity = activityModel.create({
      tipo,
      titulo,
      descricao,
      lead_id,
      contact_id,
      account_id,
      opportunity_id,
      due_date,
      due_time,
      priority: priority || 'normal',
      owner_id: req.user?.id,
      assigned_to: assigned_to || req.user?.id
    });

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/activities/:id
 * Update activity
 */
router.put('/api/activities/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = activityModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Atividade não encontrada'
      });
    }

    const activity = activityModel.update(id, req.body);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/activities/:id/complete
 * Mark activity as completed
 */
router.put('/api/activities/:id/complete', (req, res) => {
  try {
    const { resultado } = req.body;
    const activity = activityModel.complete(req.params.id, resultado);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Complete activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/activities/:id/reschedule
 * Reschedule activity
 */
router.put('/api/activities/:id/reschedule', (req, res) => {
  try {
    const { due_date, due_time } = req.body;

    if (!due_date) {
      return res.status(400).json({
        success: false,
        error: 'Nova data é obrigatória'
      });
    }

    const activity = activityModel.reschedule(req.params.id, due_date, due_time);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Reschedule activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/activities/:id
 * Delete activity
 */
router.delete('/api/activities/:id', (req, res) => {
  try {
    const success = activityModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Atividade excluída com sucesso'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
