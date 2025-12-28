/**
 * @file leads.routes.js
 * @description API routes for CRM Leads with per-agent data isolation
 *
 * IMPORTANT: All routes now support agent_id filtering via:
 * - Query parameter: ?agentId=xxx
 * - Header: X-Agent-Id
 *
 * When agentId is provided, leads are isolated to that specific agent.
 * This prevents data leakage between agents of the same tenant.
 */

import express from 'express';
import { leadRepository } from '../../../repositories/lead.repository.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { tenantContext, requireTenant } from '../../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../../utils/tenantCompat.js';
import { defaultLogger } from '../../../utils/logger.enhanced.js';

const router = express.Router();
const logger = defaultLogger.child({ module: 'CRMLeadsRoutes' });

/**
 * Extract agentId from request (query param or header)
 */
function extractAgentId(req) {
  return req.query.agentId || req.headers['x-agent-id'] || null;
}

// Tenant-required routes (CRM leads)
router.use('/api/crm/leads', authenticate, tenantContext, requireTenant);

/**
 * GET /api/crm/leads
 * List all leads with pagination and filters
 * Supports agent isolation via ?agentId=xxx
 */
router.get('/api/crm/leads', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);
    const {
      page = 1,
      limit = 50,
      status,
      stage,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let leads;
    if (search) {
      leads = leadRepository.search(search, {
        limit: parseInt(limit),
        tenantId,
        agentId
      });
    } else {
      leads = leadRepository.findAll({
        limit: parseInt(limit),
        offset,
        orderBy: 'created_at',
        order: 'DESC',
        tenantId,
        agentId
      });
    }

    // Filter by status/stage if provided
    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    if (stage) {
      leads = leads.filter(l => l.stage_id === stage);
    }

    // Map to CRM format
    const mappedLeads = leads.map(l => ({
      id: l.id,
      nome: l.nome,
      name: l.nome,
      empresa: l.empresa,
      company: l.empresa,
      cargo: l.cargo,
      email: l.email,
      telefone: l.telefone,
      phone: l.telefone || l.whatsapp,
      whatsapp: l.whatsapp,
      origem: l.origem,
      status: l.status,
      stage_id: l.stage_id,
      score: l.score,
      bant_score: l.bant_score,
      owner_id: l.owner_id,
      agent_id: l.agent_id,
      converted: l.converted,
      created_at: l.created_at,
      updated_at: l.updated_at
    }));

    logger.debug('Leads fetched', {
      tenantId,
      agentId,
      count: mappedLeads.length
    });

    res.json({
      success: true,
      data: mappedLeads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mappedLeads.length
      }
    });
  } catch (error) {
    logger.error('Error fetching leads', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/leads/stats
 * Get lead statistics for agent
 */
router.get('/api/crm/leads/stats', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);

    const stats = leadRepository.getFunnelStats('pipeline_outbound_solar', tenantId, agentId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching lead stats', { error: error.message });
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
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);

    const lead = leadRepository.findById(id, tenantId, agentId);

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
    logger.error('Error fetching lead', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/leads
 * Create new lead with agent isolation
 */
router.post('/api/crm/leads', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);
    const leadData = req.body;

    // Validation
    if (!leadData.nome && !leadData.name) {
      return res.status(400).json({
        success: false,
        error: 'Nome is required'
      });
    }

    // Normalize field names
    const normalizedData = {
      nome: leadData.nome || leadData.name,
      empresa: leadData.empresa || leadData.company,
      cargo: leadData.cargo || leadData.position,
      email: leadData.email,
      telefone: leadData.telefone || leadData.phone,
      whatsapp: leadData.whatsapp || leadData.telefone || leadData.phone,
      origem: leadData.origem || leadData.source || 'manual',
      status: leadData.status || 'novo',
      stage_id: leadData.stage_id || leadData.stage || 'stage_lead_novo',
      notas: leadData.notas || leadData.notes
    };

    const lead = leadRepository.create(normalizedData, tenantId, agentId);

    logger.info('Lead created', {
      leadId: lead.id,
      tenantId,
      agentId
    });

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    logger.error('Error creating lead', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/leads/:id
 * Update lead with agent isolation check
 */
router.put('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);

    delete updateData.id;
    delete updateData.tenant_id;
    delete updateData.agent_id; // Don't allow changing agent_id

    const existing = leadRepository.findById(id, tenantId, agentId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadRepository.update(id, updateData, tenantId, agentId);

    logger.info('Lead updated', {
      leadId: id,
      tenantId,
      agentId
    });

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    logger.error('Error updating lead', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/leads/:id
 * Delete lead with agent isolation check
 */
router.delete('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);

    const existing = leadRepository.findById(id, tenantId, agentId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    leadRepository.delete(id, tenantId, agentId);

    logger.info('Lead deleted', {
      leadId: id,
      tenantId,
      agentId
    });

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting lead', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/leads/:id/stage
 * Update lead pipeline stage
 */
router.put('/api/crm/leads/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, stage_id, notes } = req.body;
    const tenantId = extractTenantId(req);
    const agentId = extractAgentId(req);

    const newStageId = stage_id || stage;
    if (!newStageId) {
      return res.status(400).json({
        success: false,
        error: 'stage_id is required'
      });
    }

    const lead = leadRepository.updateStage(id, newStageId, notes, tenantId, agentId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    logger.info('Lead stage updated', {
      leadId: id,
      newStageId,
      tenantId,
      agentId
    });

    res.json({
      success: true,
      data: lead,
      message: 'Lead stage updated successfully'
    });
  } catch (error) {
    logger.error('Error updating lead stage', { error: error.message });
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
    const agentId = extractAgentId(req);

    const validStatuses = ['novo', 'contatado', 'qualificado', 'desqualificado', 'convertido'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const lead = leadRepository.update(id, {
      status,
      ultimo_contato: new Date().toISOString()
    }, tenantId, agentId);

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
    logger.error('Error updating lead status', { error: error.message });
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
    const agentId = extractAgentId(req);

    // Calculate BANT score
    let score = 0;
    if (budget) score += 25;
    if (authority) score += 25;
    if (need) score += 25;
    if (timing) score += 25;

    const lead = leadRepository.update(id, {
      bant_budget: budget || null,
      bant_authority: authority || null,
      bant_need: need || null,
      bant_timing: timing || null,
      bant_score: score
    }, tenantId, agentId);

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
    logger.error('Error updating BANT', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
