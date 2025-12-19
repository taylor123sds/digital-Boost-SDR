/**
 * @file lead-scoring.routes.js
 * @description Lead Scoring API routes
 */

import express from 'express';
import { ScoringRule } from '../../models/ScoringRule.js';
import Lead from '../../models/Lead.js';
import { authenticate, requireManager } from '../../middleware/auth.middleware.js';

const router = express.Router();
const scoringModel = new ScoringRule();
const leadModel = new Lead();

/**
 * GET /api/scoring/rules
 * List all scoring rules
 */
router.get('/api/scoring/rules', (req, res) => {
  try {
    const { active } = req.query;

    let rules;
    if (active === 'true') {
      rules = scoringModel.findActive();
    } else {
      rules = scoringModel.findAll({ orderBy: 'priority ASC, created_at ASC' });
    }

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Get scoring rules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scoring/rules/:id
 * Get single scoring rule
 */
router.get('/api/scoring/rules/:id', (req, res) => {
  try {
    const rule = scoringModel.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Get scoring rule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scoring/rules
 * Create new scoring rule
 */
router.post('/api/scoring/rules', (req, res) => {
  try {
    const { name, description, category, field, operator, value, value_secondary, points, priority } = req.body;

    // Validation
    if (!name || !field || !operator || value === undefined || points === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nome, campo, operador, valor e pontos são obrigatórios'
      });
    }

    const rule = scoringModel.create({
      name,
      description,
      category: category || 'profile',
      field,
      operator,
      value: String(value),
      value_secondary: value_secondary ? String(value_secondary) : null,
      points: parseInt(points),
      priority: priority || 0
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Create scoring rule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/scoring/rules/:id
 * Update scoring rule
 */
router.put('/api/scoring/rules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = scoringModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    // Convert types
    if (updates.value !== undefined) updates.value = String(updates.value);
    if (updates.value_secondary !== undefined) updates.value_secondary = String(updates.value_secondary);
    if (updates.points !== undefined) updates.points = parseInt(updates.points);
    if (updates.priority !== undefined) updates.priority = parseInt(updates.priority);

    const rule = scoringModel.update(id, updates);

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Update scoring rule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/scoring/rules/:id
 * Delete scoring rule
 */
router.delete('/api/scoring/rules/:id', (req, res) => {
  try {
    const success = scoringModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Regra excluída com sucesso'
    });
  } catch (error) {
    console.error('Delete scoring rule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/scoring/rules/:id/toggle
 * Toggle rule active status
 */
router.put('/api/scoring/rules/:id/toggle', (req, res) => {
  try {
    const rule = scoringModel.toggleActive(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Regra não encontrada'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Toggle scoring rule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scoring/calculate/:leadId
 * Calculate score for a specific lead
 */
router.post('/api/scoring/calculate/:leadId', (req, res) => {
  try {
    const lead = leadModel.findById(req.params.leadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead não encontrado'
      });
    }

    const score = scoringModel.calculateLeadScore(lead);

    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    console.error('Calculate lead score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scoring/calculate-all
 * Recalculate scores for all leads
 */
router.post('/api/scoring/calculate-all', (req, res) => {
  try {
    const { status } = req.query;

    let leads;
    if (status) {
      leads = leadModel.findAll({ where: { status } });
    } else {
      leads = leadModel.findAll({});
    }

    const results = {
      total: leads.length,
      processed: 0,
      errors: 0
    };

    for (const lead of leads) {
      try {
        scoringModel.calculateLeadScore(lead);
        results.processed++;
      } catch {
        results.errors++;
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Calculate all scores error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scoring/leaderboard
 * Get leads ranked by score
 */
router.get('/api/scoring/leaderboard', (req, res) => {
  try {
    const { grade, limit = 50, offset = 0 } = req.query;

    const leaderboard = scoringModel.getLeaderboard({
      grade,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scoring/lead/:leadId
 * Get score for a specific lead
 */
router.get('/api/scoring/lead/:leadId', (req, res) => {
  try {
    const score = scoringModel.getLeadScore(req.params.leadId);

    if (!score) {
      // Calculate if not exists
      const lead = leadModel.findById(req.params.leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead não encontrado'
        });
      }

      const newScore = scoringModel.calculateLeadScore(lead);
      return res.json({
        success: true,
        data: newScore
      });
    }

    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    console.error('Get lead score error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scoring/lead/:leadId/history
 * Get score history for a lead
 */
router.get('/api/scoring/lead/:leadId/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const history = scoringModel.getScoreHistory(req.params.leadId, {
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get score history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scoring/stats
 * Get scoring statistics
 */
router.get('/api/scoring/stats', (req, res) => {
  try {
    const stats = scoringModel.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get scoring stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
