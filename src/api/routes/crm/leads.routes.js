/**
 * @file leads.routes.js
 * @description API routes for CRM Leads
 */

import express from 'express';
import Lead from '../../../models/Lead.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { tenantContext, requireTenant } from '../../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../../utils/tenantCompat.js';
import { getDatabase } from '../../../db/connection.js';
import { getTenantColumnForTable } from '../../../utils/tenantCompat.js';

const router = express.Router();
const leadModel = new Lead();

// Tenant-required routes (CRM leads)
router.use('/api/crm/leads', authenticate, tenantContext, requireTenant);

/**
 * GET /api/crm/leads
 * List all leads with pagination and filters
 */
router.get('/api/crm/leads', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const db = getDatabase();
    const tenantColumn = getTenantColumnForTable('leads', db) || 'tenant_id';
    const {
      page = 1,
      limit = 50,
      status,
      origem,
      owner_id,
      converted,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let leads;
    let total;

    if (search) {
      leads = leadModel.search(search, { limit: parseInt(limit), offset, tenantId });
      total = leadModel.count({ where: { [tenantColumn]: tenantId } });
    } else {
      const where = {};
      if (status) where.status = status;
      if (origem) where.origem = origem;
      if (owner_id) where.owner_id = owner_id;
      if (converted !== undefined) where.converted = converted === 'true' ? 1 : 0;
      where[tenantColumn] = tenantId;

      leads = leadModel.findAll({
        where,
        limit: parseInt(limit),
        offset
      });
      total = leadModel.count({ where });
    }

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(' Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/leads/stats
 * Get lead statistics
 */
router.get('/api/crm/leads/stats', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const stats = leadModel.getStats(tenantId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(' Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/leads/:id
 * Get lead by ID with related data
 */
router.get('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { withDetails } = req.query;
    const tenantId = extractTenantId(req);

    let lead;
    lead = leadModel.findByIdWithDetails(id, tenantId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error(' Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/leads
 * Create new lead
 */
router.post('/api/crm/leads', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const leadData = req.body;

    // Validation
    if (!leadData.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome is required'
      });
    }

    const lead = leadModel.create({
      ...leadData,
      tenant_id: tenantId
    });

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error(' Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/leads/:id
 * Update lead
 */
router.put('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = extractTenantId(req);

    delete updateData.id;

    const existing = leadModel.findByIdWithDetails(id, tenantId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadModel.update(id, updateData);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error(' Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/leads/:id
 * Delete lead
 */
router.delete('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);

    const existing = leadModel.findByIdWithDetails(id, tenantId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const deleted = leadModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error(' Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/leads/:id/status
 * Update lead status
 */
router.put('/api/crm/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = extractTenantId(req);

    // Validate status
    const validStatuses = ['novo', 'contatado', 'qualificado', 'desqualificado', 'convertido'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existing = leadModel.findByIdWithDetails(id, tenantId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadModel.updateStatus(id, status, tenantId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead status updated successfully'
    });
  } catch (error) {
    console.error(' Error updating lead status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/leads/:id/bant
 * Update lead BANT qualification
 */
router.put('/api/crm/leads/:id/bant', async (req, res) => {
  try {
    const { id } = req.params;
    const { budget, authority, need, timing } = req.body;
    const tenantId = extractTenantId(req);

    const existing = leadModel.findByIdWithDetails(id, tenantId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadModel.updateBANT(id, {
      budget,
      authority,
      need,
      timing
    }, tenantId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'BANT data updated successfully'
    });
  } catch (error) {
    console.error(' Error updating BANT:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/leads/:id/convert
 * Convert lead to opportunity
 */
router.post('/api/crm/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { opportunityId, accountId, contactId } = req.body;
    const tenantId = extractTenantId(req);

    // Validation
    if (!opportunityId || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId and accountId are required'
      });
    }

    const existing = leadModel.findByIdWithDetails(id, tenantId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadModel.convertToOpportunity(id, {
      opportunityId,
      accountId,
      contactId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead converted successfully'
    });
  } catch (error) {
    console.error(' Error converting lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
