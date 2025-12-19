/**
 * @file TenantContext.js
 * @description Context e Middleware para multi-tenancy
 *
 * Permite injetar e acessar o tenant atual em qualquer parte do código
 * usando AsyncLocalStorage para contexto por request
 */

import { AsyncLocalStorage } from 'async_hooks';

// Storage para contexto assíncrono
const tenantStorage = new AsyncLocalStorage();

/**
 * Obtém o tenant do contexto atual
 * @returns {TenantModel|null}
 */
export function getCurrentTenant() {
  const store = tenantStorage.getStore();
  return store?.tenant || null;
}

/**
 * Obtém o ID do tenant do contexto atual
 * @returns {string|null}
 */
export function getCurrentTenantId() {
  const tenant = getCurrentTenant();
  return tenant?.id || null;
}

/**
 * Executa função com contexto de tenant
 * @param {TenantModel} tenant - Tenant
 * @param {Function} fn - Função a executar
 * @returns {Promise<any>}
 */
export function runWithTenant(tenant, fn) {
  return tenantStorage.run({ tenant }, fn);
}

/**
 * Middleware Express para injetar tenant no request
 * @param {TenantService} tenantService
 * @returns {Function} Express middleware
 */
export function createTenantMiddleware(tenantService) {
  return async (req, res, next) => {
    try {
      // Extrair tenant ID de várias fontes
      const tenantId = extractTenantId(req);

      if (!tenantId) {
        // Rotas públicas não precisam de tenant
        if (isPublicRoute(req.path)) {
          return next();
        }

        return res.status(400).json({
          error: 'Tenant não especificado',
          code: 'TENANT_REQUIRED'
        });
      }

      // Buscar tenant
      const tenant = await tenantService.findById(tenantId);

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant não encontrado',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Verificar se tenant está ativo
      if (!tenant.isActive()) {
        return res.status(403).json({
          error: 'Tenant inativo ou suspenso',
          code: 'TENANT_INACTIVE',
          status: tenant.status
        });
      }

      // Injetar tenant no request
      req.tenant = tenant;
      req.tenantId = tenant.id;

      // Executar resto da request com contexto do tenant
      return runWithTenant(tenant, () => next());

    } catch (error) {
      console.error('[TenantMiddleware] Erro:', error.message);
      return res.status(500).json({
        error: 'Erro ao processar tenant',
        code: 'TENANT_ERROR'
      });
    }
  };
}

/**
 * Extrai tenant ID do request
 * @param {Request} req
 * @returns {string|null}
 */
function extractTenantId(req) {
  // 1. Header X-Tenant-ID
  if (req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }

  // 2. Query parameter
  if (req.query.tenant_id) {
    return req.query.tenant_id;
  }

  // 3. Do JWT token (se autenticado)
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }

  // 4. Do subdomínio (tenant.orbion.ai)
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'api' && subdomain !== 'www') {
    return subdomain; // Será resolvido por slug depois
  }

  // 5. Do path (/api/v1/tenants/:tenantId/...)
  const match = req.path.match(/\/tenants\/([^/]+)/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Verifica se é rota pública (não precisa de tenant)
 * @param {string} path
 * @returns {boolean}
 */
function isPublicRoute(path) {
  const publicPaths = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/tenants/create',
    '/api/webhook/evolution',
    '/api/webhook/whatsapp',
    '/admin'
  ];

  return publicPaths.some(p => path.startsWith(p));
}

/**
 * Decorator para garantir que função roda com tenant
 * @param {Function} fn
 * @returns {Function}
 */
export function requireTenant(fn) {
  return async (...args) => {
    const tenant = getCurrentTenant();
    if (!tenant) {
      throw new Error('Operação requer contexto de tenant');
    }
    return fn(...args);
  };
}

/**
 * Helper para adicionar tenant_id em queries
 * @param {Object} where - Condições WHERE
 * @returns {Object}
 */
export function withTenantFilter(where = {}) {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    return { ...where, tenant_id: tenantId };
  }
  return where;
}

export default {
  getCurrentTenant,
  getCurrentTenantId,
  runWithTenant,
  createTenantMiddleware,
  requireTenant,
  withTenantFilter
};
