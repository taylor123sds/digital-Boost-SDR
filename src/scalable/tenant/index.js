/**
 * @file tenant/index.js
 * @description Exportações do módulo de multi-tenancy
 */

export { TenantModel, TenantStatus, TenantPlan, PlanLimits } from './TenantModel.js';
export { TenantService } from './TenantService.js';
export {
  getCurrentTenant,
  getCurrentTenantId,
  runWithTenant,
  createTenantMiddleware,
  requireTenant,
  withTenantFilter
} from './TenantContext.js';

// Singleton do TenantService
let tenantServiceInstance = null;

/**
 * Obtém instância singleton do TenantService
 * @param {Object} options
 * @returns {TenantService}
 */
export function getTenantService(options = {}) {
  if (!tenantServiceInstance) {
    const { TenantService } = require('./TenantService.js');
    tenantServiceInstance = new TenantService(options);
  }
  return tenantServiceInstance;
}

/**
 * Reseta instância do TenantService (para testes)
 */
export function resetTenantService() {
  tenantServiceInstance = null;
}

export default {
  TenantModel,
  TenantStatus,
  TenantPlan,
  PlanLimits,
  TenantService,
  getCurrentTenant,
  getCurrentTenantId,
  runWithTenant,
  createTenantMiddleware,
  requireTenant,
  withTenantFilter,
  getTenantService,
  resetTenantService
};
