/**
 * @file opportunities.routes.js
 * @description API routes for CRM Opportunities (Sales Pipeline)
 */

import express from 'express';
import Opportunity from '../../../models/Opportunity.js';

const router = express.Router();
const opportunityModel = new Opportunity();

/**
 * GET /api/crm/opportunities
 * List all opportunities with pagination and filters
 */
router.get('/api/crm/opportunities', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      stage,
      status,
      account_id,
      owner_id,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let opportunities;
    let total;

    if (search) {
      opportunities = opportunityModel.search(search, { limit: parseInt(limit), offset });
      total = opportunityModel.count();
    } else {
      const where = {};
      if (stage) where.stage = stage;
      if (status) where.status = status;
      if (account_id) where.account_id = account_id;
      if (owner_id) where.owner_id = owner_id;

      opportunities = opportunityModel.findAll({
        where,
        limit: parseInt(limit),
        offset
      });
      total = opportunityModel.count({ where });
    }

    res.json({
      success: true,
      data: opportunities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(' Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/opportunities/pipeline
 * Get pipeline statistics
 */
router.get('/api/crm/opportunities/pipeline', async (req, res) => {
  try {
    const stats = opportunityModel.getPipelineStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(' Error fetching pipeline stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/opportunities/:id
 * Get opportunity by ID with related data
 */
router.get('/api/crm/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { withDetails } = req.query;

    let opportunity;
    if (withDetails === 'true') {
      opportunity = opportunityModel.findByIdWithDetails(id);
    } else {
      opportunity = opportunityModel.findById(id);
    }

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error(' Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/opportunities
 * Create new opportunity
 */
router.post('/api/crm/opportunities', async (req, res) => {
  try {
    const opportunityData = req.body;

    // Validation
    if (!opportunityData.nome || !opportunityData.account_id) {
      return res.status(400).json({
        success: false,
        error: 'Nome and account_id are required'
      });
    }

    const opportunity = opportunityModel.create(opportunityData);

    res.status(201).json({
      success: true,
      data: opportunity,
      message: 'Opportunity created successfully'
    });
  } catch (error) {
    console.error(' Error creating opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/opportunities/:id
 * Update opportunity
 */
router.put('/api/crm/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;

    const opportunity = opportunityModel.update(id, updateData);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Opportunity updated successfully'
    });
  } catch (error) {
    console.error(' Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/opportunities/:id
 * Delete opportunity
 */
router.delete('/api/crm/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = opportunityModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    console.error(' Error deleting opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/opportunities/:id/stage
 * Update opportunity stage
 */
router.put('/api/crm/opportunities/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, probabilidade } = req.body;

    // Validate stage
    const validStages = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
      });
    }

    const opportunity = opportunityModel.updateStage(id, stage, probabilidade);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Opportunity stage updated successfully'
    });
  } catch (error) {
    console.error(' Error updating opportunity stage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/opportunities/:id/win
 * Mark opportunity as won
 */
router.post('/api/crm/opportunities/:id/win', async (req, res) => {
  try {
    const { id } = req.params;

    const opportunity = opportunityModel.markAsWon(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Opportunity marked as won'
    });
  } catch (error) {
    console.error(' Error marking opportunity as won:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/opportunities/:id/lose
 * Mark opportunity as lost
 */
router.post('/api/crm/opportunities/:id/lose', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, concorrente } = req.body;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        error: 'Motivo is required'
      });
    }

    const opportunity = opportunityModel.markAsLost(id, motivo, concorrente);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Opportunity marked as lost'
    });
  } catch (error) {
    console.error(' Error marking opportunity as lost:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/opportunities/:id/products
 * Add product to opportunity
 */
router.post('/api/crm/opportunities/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantidade, preco_unitario, desconto } = req.body;

    // Validation
    if (!product_id || !quantidade || !preco_unitario) {
      return res.status(400).json({
        success: false,
        error: 'product_id, quantidade, and preco_unitario are required'
      });
    }

    const opportunity = opportunityModel.addProduct(id, {
      product_id,
      quantidade,
      preco_unitario,
      desconto
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Product added to opportunity'
    });
  } catch (error) {
    console.error(' Error adding product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/opportunities/:id/products/:productId
 * Remove product from opportunity
 */
router.delete('/api/crm/opportunities/:id/products/:productId', async (req, res) => {
  try {
    const { id, productId } = req.params;

    const opportunity = opportunityModel.removeProduct(id, productId);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: opportunity,
      message: 'Product removed from opportunity'
    });
  } catch (error) {
    console.error(' Error removing product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
