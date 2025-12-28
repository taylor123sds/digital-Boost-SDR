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
import channelsRouter from './channels.routes.js';
import metrics from '../../utils/metrics.js';

const router = express.Router();

const AGENT_PRESETS = {
  agentTypes: [
    { id: 'sdr', name: 'SDR Agent', description: 'Qualificacao com SPIN Selling e BANT', icon: 'Phone', color: 'cyan' },
    { id: 'specialist', name: 'Specialist Agent', description: 'Consultor tecnico para duvidas complexas', icon: 'Brain', color: 'violet' },
    { id: 'scheduler', name: 'Scheduler Agent', description: 'Agendamento inteligente de reunioes', icon: 'Calendar', color: 'green' },
    { id: 'support', name: 'Support Agent', description: 'Suporte ao cliente com base de conhecimento', icon: 'HeadphonesIcon', color: 'yellow' }
  ],
  sectors: [
    { id: 'energia_solar', name: 'Energia Solar', icon: '☀️' },
    { id: 'saas', name: 'SaaS', icon: '☁️' },
    { id: 'consultoria', name: 'Consultoria', icon: '💼' },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
    { id: 'varejo', name: 'Varejo', icon: '🏪' },
    { id: 'educacao', name: 'Educacao', icon: '🎓' },
    { id: 'imobiliario', name: 'Imobiliario', icon: '🏠' },
    { id: 'financeiro', name: 'Financeiro', icon: '💰' },
    { id: 'saude', name: 'Saude', icon: '🏥' },
    { id: 'outro', name: 'Outro', icon: '📦' }
  ],
  ctaTypes: [
    { id: 'reuniao', name: 'Agendar Reuniao', description: 'Call de qualificacao ou discovery' },
    { id: 'demonstracao', name: 'Demonstracao', description: 'Apresentacao do produto/servico' },
    { id: 'orcamento', name: 'Enviar Orcamento', description: 'Proposta comercial personalizada' },
    { id: 'visita', name: 'Agendar Visita', description: 'Visita tecnica ou presencial' },
    { id: 'teste_gratis', name: 'Teste Gratuito', description: 'Trial ou POC do produto' }
  ],
  qualificationFrameworks: [
    { id: 'bant', name: 'BANT', description: 'Budget, Authority, Need, Timeline' },
    { id: 'spin', name: 'SPIN Selling', description: 'Situation, Problem, Implication, Need-payoff' },
    { id: 'meddic', name: 'MEDDIC', description: 'Metrics, Economic Buyer, Decision Criteria, etc.' },
    { id: 'custom', name: 'Personalizado', description: 'Configure seus proprios criterios' }
  ],
  bantFieldsConfig: [
    { key: 'budget', label: 'Budget (Orcamento)', description: 'Verifica disponibilidade de investimento' },
    { key: 'authority', label: 'Authority (Autoridade)', description: 'Identifica decisor ou influenciador' },
    { key: 'need', label: 'Need (Necessidade)', description: 'Mapeia dores e objetivos' },
    { key: 'timeline', label: 'Timeline (Prazo)', description: 'Urgencia para implementacao' },
    { key: 'companySize', label: 'Tamanho da Empresa', description: 'Numero de funcionarios/faturamento' },
    { key: 'decisionProcess', label: 'Processo Decisorio', description: 'Como tomam decisoes de compra' },
    { key: 'painPoints', label: 'Pontos de Dor', description: 'Principais desafios atuais' },
    { key: 'currentSolution', label: 'Solucao Atual', description: 'O que usam hoje para resolver' }
  ],
  weekDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
  steps: [
    { id: 0, title: 'Identidade', subtitle: 'Persona do agente', icon: 'User' },
    { id: 1, title: 'Empresa', subtitle: 'Contexto do negocio', icon: 'Building' },
    { id: 2, title: 'Oferta', subtitle: 'Servicos e produtos', icon: 'Package' },
    { id: 3, title: 'ICP', subtitle: 'Perfil do cliente ideal', icon: 'Users' },
    { id: 4, title: 'Politicas', subtitle: 'Regras e limites', icon: 'Shield' },
    { id: 5, title: 'Objetivos', subtitle: 'CTA e KPIs', icon: 'Flag' },
    { id: 6, title: 'Canais', subtitle: 'Horarios e canais', icon: 'MessageSquare' },
    { id: 7, title: 'Integracoes', subtitle: 'Conectar servicos', icon: 'Plug' },
    { id: 8, title: 'Playbooks', subtitle: 'Objecoes e handoff', icon: 'BookOpen' },
    { id: 9, title: 'Preview', subtitle: 'Revisar e ativar', icon: 'Eye' }
  ],
  toneLabels: ['Muito Formal', 'Formal', 'Equilibrado', 'Casual', 'Muito Casual']
};
const allowLegacyEvolutionRoutes = process.env.LEGACY_EVOLUTION_ROUTES !== 'false';
const isProduction = process.env.NODE_ENV === 'production';
const legacyEvolutionCutoffRaw = process.env.LEGACY_EVOLUTION_CUTOFF_AT;
const legacyEvolutionCutoffAt = legacyEvolutionCutoffRaw
  ? Date.parse(legacyEvolutionCutoffRaw)
  : (!isProduction ? Date.now() + 7 * 24 * 60 * 60 * 1000 : null);
const hasLegacyEvolutionCutoff = Number.isFinite(legacyEvolutionCutoffAt);
const legacyEvolutionLogKey = 'legacy_evolution_routes_warned';

if (allowLegacyEvolutionRoutes && isProduction && !legacyEvolutionCutoffRaw) {
  throw new Error('LEGACY_EVOLUTION_CUTOFF_AT must be set in production or disable legacy routes with LEGACY_EVOLUTION_ROUTES=false.');
}

if (allowLegacyEvolutionRoutes && isProduction && legacyEvolutionCutoffRaw && !hasLegacyEvolutionCutoff) {
  throw new Error('LEGACY_EVOLUTION_CUTOFF_AT is invalid. Provide a valid ISO timestamp or disable legacy routes.');
}

if (!legacyEvolutionCutoffRaw && !isProduction && allowLegacyEvolutionRoutes) {
  console.warn(`[DEPRECATED] LEGACY_EVOLUTION_CUTOFF_AT not set. Defaulting to ${new Date(legacyEvolutionCutoffAt).toISOString()}`);
} else if (legacyEvolutionCutoffRaw && !hasLegacyEvolutionCutoff) {
  console.warn('[DEPRECATED] LEGACY_EVOLUTION_CUTOFF_AT is invalid. Legacy Evolution routes will not auto-expire.');
}

function getRequestId(req) {
  return req.headers['x-request-id'] || req.headers['x-correlation-id'] || req.headers['x-requestid'] || null;
}

function blockLegacyEvolutionRoutes(req, res, next) {
  if (req.path.startsWith('/api/evolution/instances')) {
    return next();
  }

  metrics.increment('legacy_evolution_route_hits_total', 1, {
    method: req.method,
    route: req.originalUrl || req.url
  });

  if (!allowLegacyEvolutionRoutes) {
    console.warn(JSON.stringify({
      event: 'DEPRECATED_ROUTE_BLOCKED',
      route: req.originalUrl || req.url,
      method: req.method,
      tenantId: req.tenantId || req.user?.tenantId || 'unknown',
      agentId: req.params?.agentId,
      cutoffAt: hasLegacyEvolutionCutoff ? new Date(legacyEvolutionCutoffAt).toISOString() : null,
      requestId: getRequestId(req),
      reason: 'legacy_disabled',
      timestamp: new Date().toISOString()
    }));
    return res.status(410).json({
      success: false,
      error: 'LEGACY_EVOLUTION_ROUTE_DISABLED',
      message: 'Use /api/agents/:agentId/channels/evolution/* endpoints'
    });
  }

  if (hasLegacyEvolutionCutoff && Date.now() >= legacyEvolutionCutoffAt) {
    console.warn(JSON.stringify({
      event: 'DEPRECATED_ROUTE_BLOCKED',
      route: req.originalUrl || req.url,
      method: req.method,
      tenantId: req.tenantId || req.user?.tenantId || 'unknown',
      agentId: req.params?.agentId,
      cutoffAt: new Date(legacyEvolutionCutoffAt).toISOString(),
      requestId: getRequestId(req),
      reason: 'cutoff_reached',
      timestamp: new Date().toISOString()
    }));
    return res.status(410).json({
      success: false,
      error: 'LEGACY_EVOLUTION_ROUTE_EXPIRED',
      message: 'Use /api/agents/:agentId/channels/evolution/* endpoints',
      cutoffAt: new Date(legacyEvolutionCutoffAt).toISOString()
    });
  }

  if (allowLegacyEvolutionRoutes) {
    const now = Date.now();
    const lastLogged = global[legacyEvolutionLogKey] || 0;
    if (now - lastLogged > 3600000) {
      console.warn('[DEPRECATED] Legacy Evolution routes in use. Prefer /api/agents/:agentId/channels/evolution/*');
      global[legacyEvolutionLogKey] = now;
    }
    console.warn(JSON.stringify({
      event: 'DEPRECATED_ROUTE_USED',
      route: req.originalUrl || req.url,
      method: req.method,
      tenantId: req.tenantId || req.user?.tenantId || 'unknown',
      agentId: req.params?.agentId,
      cutoffAt: hasLegacyEvolutionCutoff ? new Date(legacyEvolutionCutoffAt).toISOString() : null,
      requestId: getRequestId(req),
      timestamp: new Date().toISOString()
    }));
    res.set('Deprecation', 'true');
    res.set('Link', '</api/agents/:agentId/channels/evolution/*>; rel="successor-version"');
    return next();
  }

  return res.status(410).json({
    success: false,
    error: 'LEGACY_EVOLUTION_ROUTE_DISABLED',
    message: 'Use /api/agents/:agentId/channels/evolution/* endpoints'
  });
}

function legacyEvolutionShim(req, res, next) {
  const { agentId } = req.params;
  const legacyPrefix = `/api/agents/${agentId}/evolution`;
  const canonicalPrefix = `/api/agents/${agentId}/channels/evolution`;
  const originalUrl = req.originalUrl || req.url;
  const [path, query] = originalUrl.split('?');
  let targetPath = path.replace(legacyPrefix, canonicalPrefix);

  if (targetPath.endsWith('/create')) {
    targetPath = targetPath.replace('/create', '/connect');
  }

  const targetUrl = query ? `${targetPath}?${query}` : targetPath;
  const previousUrl = req.url;
  const previousOriginalUrl = req.originalUrl;

  req.url = targetUrl;
  req.originalUrl = targetUrl;

  return channelsRouter.handle(req, res, (err) => {
    req.url = previousUrl;
    req.originalUrl = previousOriginalUrl;
    next(err);
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
  const tenantId = req.tenantId || req.user?.tenantId || req.user?.id || 'anonymous';
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
 * GET /api/config/agent-presets
 * UI presets for agent creation
 */
router.get('/api/config/agent-presets', (req, res) => {
  res.json({ success: true, data: AGENT_PRESETS });
});

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

    const agent = repository.findByIdForTenant(agentId, req.tenantId);

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
    const originalAgent = repository.findByIdForTenant(agentId, req.tenantId);

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
router.get('/api/agents/:agentId/evolution/status', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);

/**
 * POST /api/agents/:agentId/evolution/create
 * Create Evolution instance for agent
 */
router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);

/**
 * GET /api/agents/:agentId/evolution/qrcode
 * Get QR Code for Evolution instance
 */
router.get('/api/agents/:agentId/evolution/qrcode', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);

/**
 * POST /api/agents/:agentId/evolution/disconnect
 * Disconnect Evolution instance
 */
router.post('/api/agents/:agentId/evolution/disconnect', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);

/**
 * DELETE /api/agents/:agentId/evolution
 * Delete Evolution instance
 */
router.delete('/api/agents/:agentId/evolution', authenticate, tenantContext, requireManager, validateAgentId, legacyEvolutionShim);

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
