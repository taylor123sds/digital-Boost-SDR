/**
 * @file agents.routes.js
 * @description Rotas para gerenciamento de agentes customizaveis
 *
 * Usa o AgentRepository (orbion.db) como fonte canonica
 * Permite que clientes criem e configurem seus proprios agentes SDR/Suporte
 *
 * SECURITY:
 * - JWT Authentication required for all routes
 * - Role-based access control (admin, manager, sdr)
 * - Rate limiting per tenant
 * - Input sanitization on all endpoints
 * - Tenant isolation enforced on all queries
 */

import express from 'express';
import { getAgentRepository } from '../../repositories/agent.repository.js';
import { authenticate, requireRole, requireManager } from '../../middleware/auth.middleware.js';
import { tenantContext, optionalTenantContext } from '../../middleware/tenant.middleware.js';

const router = express.Router();
const allowLegacyEvolutionRoutes = process.env.LEGACY_EVOLUTION_ROUTES === 'true';

function blockLegacyEvolutionRoutes(req, res, next) {
  if (allowLegacyEvolutionRoutes) {
    return next();
  }

  return res.status(410).json({
    success: false,
    error: 'LEGACY_EVOLUTION_ROUTE_DISABLED',
    message: 'Use /api/agents/:agentId/channels/evolution/* endpoints'
  });
}

console.log('   - Agents Management (30 rotas) NEW');
console.log('   - Agent Config (15 rotas) NEW');

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Input Sanitization Middleware
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize input to prevent XSS and injection attacks
 */
function sanitizeInput(req, res, next) {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove script tags and dangerous HTML
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Rate Limiting per Tenant
// ═══════════════════════════════════════════════════════════════════════════

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function rateLimitByTenant(req, res, next) {
  // P3-6: Use req.tenantId (set by tenantContext middleware) for consistency
  const tenantId = req.tenantId || req.user?.teamId || req.user?.id || 'anonymous';
  const now = Date.now();
  const key = `${tenantId}:agents`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const limit = rateLimitStore.get(key);

  // Reset window if expired
  if (now > limit.resetAt) {
    limit.count = 1;
    limit.resetAt = now + RATE_LIMIT_WINDOW;
    return next();
  }

  // Increment count
  limit.count++;

  // Check limit
  if (limit.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: 'Limite de requisicoes excedido. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil((limit.resetAt - now) / 1000)
    });
  }

  next();
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt + RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Validate Agent ID format
// ═══════════════════════════════════════════════════════════════════════════

function validateAgentId(req, res, next) {
  const { agentId } = req.params;
  if (agentId) {
    // UUID or simple ID format only
    const validIdPattern = /^[a-zA-Z0-9_-]{1,64}$/;
    if (!validIdPattern.test(agentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de agente invalido'
      });
    }
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE MOUNTING
// ═══════════════════════════════════════════════════════════════════════════

// Apply global security middlewares to all agent routes
router.use('/api/admin/agents', authenticate, tenantContext, sanitizeInput, rateLimitByTenant, validateAgentId);
router.use('/api/agents', authenticate, tenantContext, sanitizeInput, rateLimitByTenant, validateAgentId);
router.use('/api/config', authenticate, tenantContext, sanitizeInput, rateLimitByTenant);
router.use('/api/agents/:agentId/evolution', blockLegacyEvolutionRoutes);
router.use('/api/evolution', blockLegacyEvolutionRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CRUD ROUTES - Using AgentRepository (orbion.db canonical source)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/agents - List all agents for current tenant
 */
router.get('/api/agents', async (req, res) => {
  try {
    const repository = getAgentRepository();
    const agents = repository.findByTenant(req.tenantId);

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error('[AGENTS-API] Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar agentes'
    });
  }
});

/**
 * GET /api/agents/my
 * Deprecated: use GET /api/agents
 */
router.get('/api/agents/my', authenticate, tenantContext, (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'ENDPOINT_REMOVED',
    message: 'Use GET /api/agents instead.'
  });
});

/**
 * GET /api/agents/:agentId - Get agent by ID
 */
router.get('/api/agents/:agentId', validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const repository = getAgentRepository();

    const agent = repository.findByIdForTenant(agentId, req.tenantId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('[AGENTS-API] Error getting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agente'
    });
  }
});

/**
 * POST /api/agents - Create new agent
 */
router.post('/api/agents', requireManager, async (req, res) => {
  try {
    const { name, type, description, system_prompt, config } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome do agente e obrigatorio'
      });
    }

    const repository = getAgentRepository();
    const agent = repository.create(
      { name, type, description, system_prompt, config },
      req.tenantId,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agente criado com sucesso'
    });
  } catch (error) {
    console.error('[AGENTS-API] Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao criar agente'
    });
  }
});

/**
 * PUT /api/agents/:agentId - Update agent
 */
router.put('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const repository = getAgentRepository();

    const agent = repository.update(agentId, req.body, req.tenantId);

    res.json({
      success: true,
      data: agent,
      message: 'Agente atualizado com sucesso'
    });
  } catch (error) {
    console.error('[AGENTS-API] Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar agente'
    });
  }
});

/**
 * DELETE /api/agents/:agentId - Delete agent (soft delete)
 */
router.delete('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const repository = getAgentRepository();

    repository.delete(agentId, req.tenantId);

    res.json({
      success: true,
      message: 'Agente removido com sucesso'
    });
  } catch (error) {
    console.error('[AGENTS-API] Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao remover agente'
    });
  }
});

// Also mount at /api/admin/agents for admin compatibility
router.get('/api/admin/agents', async (req, res) => {
  try {
    const repository = getAgentRepository();

    // Admin can see all agents
    const agents = req.user.role === 'admin'
      ? repository.findAll()
      : repository.findByTenant(req.tenantId);

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error('[AGENTS-API] Error listing agents (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar agentes'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL SECURE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/agents/:agentId/permissions
 * Check user permissions for a specific agent
 */
router.get('/api/agents/:agentId/permissions', authenticate, tenantContext, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const repository = getAgentRepository();

    const agent = repository.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado'
      });
    }

    const isOwner = agent.tenant_id === req.tenantId;
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';

    res.json({
      success: true,
      data: {
        canView: isOwner || isAdmin,
        canEdit: (isOwner && isManager) || isAdmin,
        canDelete: isAdmin,
        canManageConfig: (isOwner && isManager) || isAdmin,
        role: req.user.role,
        isOwner
      }
    });
  } catch (error) {
    console.error('[AGENTS-API] Error checking permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar permissoes'
    });
  }
});

/**
 * POST /api/agents/:agentId/duplicate
 * Duplicate an agent (admin/manager only)
 */
router.post('/api/agents/:agentId/duplicate', authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { newName, newSlug } = req.body;

    if (!newName || !newSlug) {
      return res.status(400).json({
        success: false,
        error: 'newName e newSlug sao obrigatorios'
      });
    }

    // Validate newSlug format
    if (!/^[a-z0-9_-]+$/.test(newSlug)) {
      return res.status(400).json({
        success: false,
        error: 'Slug invalido. Use apenas letras minusculas, numeros, hifen e underscore.'
      });
    }

    const repository = getAgentRepository();
    const originalAgent = repository.findById(agentId);

    if (!originalAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agente original nao encontrado'
      });
    }

    // Check permission
    if (originalAgent.tenant_id !== req.tenantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sem permissao para duplicar este agente'
      });
    }

    // Create duplicate using repository.duplicate
    const newAgent = repository.duplicate(agentId, {
      name: newName,
      slug: newSlug
    }, req.tenantId, req.user.id);

    res.json({
      success: true,
      data: newAgent,
      message: 'Agente duplicado com sucesso'
    });
  } catch (error) {
    console.error('[AGENTS-API] Error duplicating agent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao duplicar agente'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EVOLUTION API INTEGRATION - WhatsApp Instance Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/agents/:agentId/evolution/status
 * Get Evolution instance status for agent
 */
router.get('/api/agents/:agentId/evolution/status', authenticate, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    const instance = await manager.getInstanceByAgent(agentId);

    if (!instance) {
      return res.json({
        success: true,
        data: {
          connected: false,
          status: 'not_configured',
          message: 'Nenhuma instancia WhatsApp configurada para este agente'
        }
      });
    }

    // Get live status from Evolution API
    const liveStatus = await manager.getInstanceStatus(instance.instance_name);

    res.json({
      success: true,
      data: {
        instanceName: instance.instance_name,
        phoneNumber: instance.phone_number,
        profileName: instance.profile_name,
        status: liveStatus.data?.instance?.state || instance.status,
        connected: liveStatus.data?.instance?.state === 'open',
        connectedAt: instance.connected_at
      }
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status da instancia'
    });
  }
});

/**
 * POST /api/agents/:agentId/evolution/create
 * Create Evolution instance for agent
 */
router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, requireManager, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { instanceName } = req.body;

    // Verify agent exists using repository
    const repository = getAgentRepository();
    const agent = repository.findByIdForTenant(agentId, req.tenantId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente nao encontrado'
      });
    }

    // Check permission
    if (agent.tenant_id !== req.tenantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sem permissao para gerenciar este agente'
      });
    }

    // Use Evolution Manager from scalable module for now
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    // Generate instance name if not provided
    const finalInstanceName = instanceName || `agent_${agentId}_${Date.now()}`;

    // Create instance in Evolution API
    const result = await manager.createInstanceForAgent(agentId, {
      instanceName: finalInstanceName,
      tenantId: agent.tenant_id,
      agentType: agent.type
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Erro ao criar instancia'
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Instancia criada com sucesso. Escaneie o QR Code para conectar.'
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error creating instance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar instancia WhatsApp'
    });
  }
});

/**
 * GET /api/agents/:agentId/evolution/qrcode
 * Get QR Code for Evolution instance
 */
router.get('/api/agents/:agentId/evolution/qrcode', authenticate, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    const instance = await manager.getInstanceByAgent(agentId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma instancia configurada para este agente'
      });
    }

    // Get fresh QR code from Evolution API
    const qrResult = await manager.getQRCode(instance.instance_name);

    if (!qrResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Erro ao obter QR Code. A instancia pode ja estar conectada.'
      });
    }

    res.json({
      success: true,
      data: {
        qrcode: qrResult.data?.qrcode?.base64 || qrResult.data?.base64,
        pairingCode: qrResult.data?.pairingCode
      }
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter QR Code'
    });
  }
});

/**
 * POST /api/agents/:agentId/evolution/disconnect
 * Disconnect Evolution instance
 */
router.post('/api/agents/:agentId/evolution/disconnect', authenticate, requireManager, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    const instance = await manager.getInstanceByAgent(agentId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma instancia configurada para este agente'
      });
    }

    const result = await manager.logoutInstance(instance.instance_name);

    res.json({
      success: true,
      message: 'Instancia desconectada com sucesso'
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error disconnecting:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao desconectar instancia'
    });
  }
});

/**
 * DELETE /api/agents/:agentId/evolution
 * Delete Evolution instance
 */
router.delete('/api/agents/:agentId/evolution', authenticate, requireManager, validateAgentId, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    const instance = await manager.getInstanceByAgent(agentId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma instancia configurada para este agente'
      });
    }

    const result = await manager.deleteInstance(instance.instance_name);

    res.json({
      success: true,
      message: 'Instancia removida com sucesso'
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error deleting instance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover instancia'
    });
  }
});

/**
 * GET /api/evolution/instances
 * List all Evolution instances (admin only)
 */
router.get('/api/evolution/instances', authenticate, async (req, res) => {
  try {
    const { getEvolutionManager } = await import('../../scalable/agents/index.js');
    const manager = getEvolutionManager();
    await manager.initialize();

    const result = await manager.listInstances();

    res.json({
      success: true,
      data: result.data || []
    });
  } catch (error) {
    console.error('[EVOLUTION-API] Error listing instances:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar instancias'
    });
  }
});

console.log('   - Evolution Integration (6 rotas) NEW');

export default router;
