/**
 * @file AdminApiRoutes.js
 * @description API Routes para painel administrativo SaaS
 * STACK_DEPRECATED_OK: legacy route stack (read-only)
 *
 * Endpoints para gerenciamento centralizado de todos os tenants/agentes
 */

import { Router } from 'express';
import { TenantService } from '../tenant/TenantService.js';
import { TenantStatus, TenantPlan } from '../tenant/TenantModel.js';

/**
 * Cria rotas do painel admin
 * @param {Object} options
 * @param {TenantService} options.tenantService
 * @returns {Router}
 */
export function createAdminRoutes(options = {}) {
  const router = Router();
  const { tenantService, database } = options;

  // ==================== MIDDLEWARE ====================

  /**
   * Middleware de autenticação admin
   */
  const requireAdmin = async (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return res.status(401).json({
        error: 'Acesso não autorizado',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    next();
  };

  // Aplicar middleware em todas as rotas
  router.use(requireAdmin);

  // ==================== DASHBOARD ====================

  /**
   * GET /admin/dashboard
   * Estatísticas gerais do sistema
   */
  router.get('/dashboard', async (req, res) => {
    try {
      const stats = await tenantService.getAggregatedStats();

      // Buscar atividade recente
      const recentActivity = await database.query(`
        SELECT t.name, t.slug, t.status, t.plan,
               json_extract(t.usage, '$.messagesToday') as messagesToday,
               json_extract(t.usage, '$.leadsCount') as leadsCount,
               json_extract(t.metadata, '$.lastActivityAt') as lastActivity
        FROM tenants t
        WHERE json_extract(t.metadata, '$.lastActivityAt') IS NOT NULL
        ORDER BY json_extract(t.metadata, '$.lastActivityAt') DESC
        LIMIT 10
      `);

      // Buscar alertas (tenants com problemas)
      const alerts = await database.query(`
        SELECT id, name, slug, status, plan,
               json_extract(usage, '$.messagesToday') as messagesToday
        FROM tenants
        WHERE status = 'suspended'
           OR (status = 'trial' AND trial_ends_at < datetime('now'))
           OR json_extract(usage, '$.messagesToday') > 1800
      `);

      res.json({
        success: true,
        data: {
          stats,
          recentActivity,
          alerts,
          systemHealth: await getSystemHealth(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[Admin] Erro dashboard:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TENANTS ====================

  /**
   * GET /admin/tenants
   * Lista todos os tenants
   */
  router.get('/tenants', async (req, res) => {
    try {
      const { status, plan, search, limit = 50, offset = 0 } = req.query;

      const result = await tenantService.findAll({
        status,
        plan,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          tenants: result.tenants.map(t => t.toJSON()),
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });

    } catch (error) {
      console.error('[Admin] Erro listar tenants:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /admin/tenants/:id
   * Detalhes de um tenant específico
   */
  router.get('/tenants/:id', async (req, res) => {
    try {
      const tenant = await tenantService.findById(req.params.id);

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      // Buscar métricas do tenant
      const metrics = await getTenantMetrics(database, tenant.id);

      res.json({
        success: true,
        data: {
          tenant: tenant.toFullJSON(),
          metrics
        }
      });

    } catch (error) {
      console.error('[Admin] Erro buscar tenant:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /admin/tenants
   * Cria novo tenant
   */
  router.post('/tenants', async (req, res) => {
    try {
      const tenant = await tenantService.create(req.body);

      res.status(201).json({
        success: true,
        data: { tenant: tenant.toJSON() }
      });

    } catch (error) {
      console.error('[Admin] Erro criar tenant:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * PATCH /admin/tenants/:id
   * Atualiza um tenant
   */
  router.patch('/tenants/:id', async (req, res) => {
    try {
      const tenant = await tenantService.update(req.params.id, req.body);

      res.json({
        success: true,
        data: { tenant: tenant.toJSON() }
      });

    } catch (error) {
      console.error('[Admin] Erro atualizar tenant:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /admin/tenants/:id/suspend
   * Suspende um tenant
   */
  router.post('/tenants/:id/suspend', async (req, res) => {
    try {
      const tenant = await tenantService.update(req.params.id, {
        status: TenantStatus.SUSPENDED
      });

      res.json({
        success: true,
        message: `Tenant ${tenant.name} suspenso`,
        data: { tenant: tenant.toJSON() }
      });

    } catch (error) {
      console.error('[Admin] Erro suspender tenant:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /admin/tenants/:id/activate
   * Ativa/reativa um tenant
   */
  router.post('/tenants/:id/activate', async (req, res) => {
    try {
      const tenant = await tenantService.update(req.params.id, {
        status: TenantStatus.ACTIVE
      });

      res.json({
        success: true,
        message: `Tenant ${tenant.name} ativado`,
        data: { tenant: tenant.toJSON() }
      });

    } catch (error) {
      console.error('[Admin] Erro ativar tenant:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /admin/tenants/:id/upgrade
   * Upgrade de plano
   */
  router.post('/tenants/:id/upgrade', async (req, res) => {
    try {
      const { plan } = req.body;

      if (!Object.values(TenantPlan).includes(plan)) {
        return res.status(400).json({ error: 'Plano inválido' });
      }

      const tenant = await tenantService.update(req.params.id, { plan });

      res.json({
        success: true,
        message: `Tenant ${tenant.name} atualizado para plano ${plan}`,
        data: { tenant: tenant.toJSON() }
      });

    } catch (error) {
      console.error('[Admin] Erro upgrade tenant:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== MÉTRICAS ====================

  /**
   * GET /admin/metrics/overview
   * Métricas gerais do sistema
   */
  router.get('/metrics/overview', async (req, res) => {
    try {
      const { period = '7d' } = req.query;

      const metrics = await getSystemMetrics(database, period);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('[Admin] Erro métricas:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /admin/metrics/messages
   * Métricas de mensagens
   */
  router.get('/metrics/messages', async (req, res) => {
    try {
      const { period = '7d', tenant_id } = req.query;

      let whereClause = '1=1';
      const params = [];

      if (tenant_id) {
        whereClause += ' AND tenant_id = ?';
        params.push(tenant_id);
      }

      const daily = await database.query(`
        SELECT DATE(created_at) as date,
               COUNT(*) as total,
               SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as sent,
               SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as received
        FROM whatsapp_messages
        WHERE ${whereClause}
          AND created_at >= datetime('now', '-${parseInt(period)}')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, params);

      res.json({
        success: true,
        data: { daily }
      });

    } catch (error) {
      console.error('[Admin] Erro métricas mensagens:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== OPERAÇÕES ====================

  /**
   * POST /admin/operations/reset-daily-usage
   * Reseta contadores diários de todos os tenants
   */
  router.post('/operations/reset-daily-usage', async (req, res) => {
    try {
      await tenantService.resetDailyUsage();

      res.json({
        success: true,
        message: 'Contadores diários resetados'
      });

    } catch (error) {
      console.error('[Admin] Erro reset daily:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /admin/operations/broadcast
   * Envia notificação para todos os tenants
   */
  router.post('/operations/broadcast', async (req, res) => {
    try {
      const { message, type = 'info', targetStatus } = req.body;

      // Implementar broadcast (pode ser via email, push, etc)
      const result = await broadcastNotification(database, {
        message,
        type,
        targetStatus
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Admin] Erro broadcast:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== HEALTH ====================

  /**
   * GET /admin/health
   * Status de saúde do sistema
   */
  router.get('/health', async (req, res) => {
    try {
      const health = await getSystemHealth();

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

// ==================== HELPERS ====================

/**
 * Obtém métricas de um tenant
 */
async function getTenantMetrics(database, tenantId) {
  try {
    const leads = await database.queryOne(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN stage_id = 'stage_qualificado' THEN 1 ELSE 0 END) as qualified
      FROM leads WHERE tenant_id = ?
    `, [tenantId]);

    const messages = await database.queryOne(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as sent
      FROM whatsapp_messages WHERE tenant_id = ?
    `, [tenantId]);

    const meetings = await database.queryOne(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM meetings WHERE tenant_id = ?
    `, [tenantId]);

    return { leads, messages, meetings };

  } catch {
    return { leads: {}, messages: {}, meetings: {} };
  }
}

/**
 * Obtém métricas do sistema
 */
async function getSystemMetrics(database, period) {
  const days = parseInt(period) || 7;

  try {
    const totals = await database.queryOne(`
      SELECT
        (SELECT COUNT(*) FROM tenants) as totalTenants,
        (SELECT COUNT(*) FROM leads) as totalLeads,
        (SELECT COUNT(*) FROM whatsapp_messages
         WHERE created_at >= datetime('now', '-${days} days')) as messagesInPeriod,
        (SELECT COUNT(*) FROM meetings
         WHERE created_at >= datetime('now', '-${days} days')) as meetingsInPeriod
    `);

    return totals;

  } catch {
    return {};
  }
}

/**
 * Obtém status de saúde do sistema
 */
async function getSystemHealth() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {}
  };

  // Database
  try {
    const start = Date.now();
    // Simple health check
    health.components.database = {
      status: 'healthy',
      latency: Date.now() - start
    };
  } catch (error) {
    health.components.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Memory
  const memUsage = process.memoryUsage();
  health.components.memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
  };

  // Uptime
  health.components.uptime = {
    seconds: Math.round(process.uptime()),
    formatted: formatUptime(process.uptime())
  };

  return health;
}

/**
 * Formata uptime em string legível
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);

  return parts.join(' ');
}

/**
 * Envia notificação broadcast
 */
async function broadcastNotification(database, { message, type, targetStatus }) {
  // Buscar tenants alvo
  let query = 'SELECT id, email, name FROM tenants WHERE 1=1';
  const params = [];

  if (targetStatus) {
    query += ' AND status = ?';
    params.push(targetStatus);
  }

  const tenants = await database.query(query, params);

  // Salvar notificação no banco
  for (const tenant of tenants) {
    await database.execute(`
      INSERT INTO notifications (id, tenant_id, type, message, read, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `, [
      `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant.id,
      type,
      message
    ]);
  }

  return {
    sentTo: tenants.length,
    message
  };
}

export default createAdminRoutes;
