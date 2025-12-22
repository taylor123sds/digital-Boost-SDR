/**
 * @file tenantGuard.js
 * @description Helper to enforce tenant-scoped queries in webhook path
 */

import { getTenantColumnForTable } from './tenantCompat.js';

export const TENANT_REQUIRED_TABLES = new Set([
  'agents',
  'agent_versions',
  'leads',
  'pipeline_stages',
  'whatsapp_messages',
  'messages',
  'conversations',
  'pipeline_history',
  'cadence_enrollments',
  'conversation_contexts',
  'conversation_context',
  'prospect_leads',
  'opt_out_registry',
  'accounts',
  'contacts',
  'opportunities',
  'activities',
  'meetings',
  'integrations',
  'integration_bindings',
  'oauth_states',
  'async_jobs',
  'inbound_events'
]);

export const TENANT_REQUIRED_ROUTES = new Set([
  '/api/agents',
  '/api/integrations',
  '/api/webhooks/inbound',
  '/api/pipeline',
  '/api/funil',
  '/api/whatsapp',
  '/api/prospecting',
  '/api/cadences',
  '/api/crm/leads',
  '/api/clientes'
]);

export const GLOBAL_TABLE_ALLOWLIST = new Set([
  // Add explicit global tables here when needed (catalog, static lookup, etc.)
]);

/**
 * Assert that a SQL query is tenant-scoped when required.
 *
 * @param {string} query - SQL query string
 * @param {Array} params - Bound params
 * @param {Object} options - Options
 * @param {string} options.tenantId - Tenant ID to enforce
 * @param {string|null} options.tenantColumn - Column name (tenant_id) or null
 * @param {string} options.operation - Optional description for error messages
 */
export function assertTenantScoped(query, params = [], options = {}) {
  const {
    tenantId,
    tenantColumn,
    operation = 'tenant-scoped query'
  } = options;

  if (!tenantColumn) {
    return;
  }

  if (!tenantId) {
    throw new Error(`[TENANT-GUARD] Missing tenant for ${operation}`);
  }

  const normalizedQuery = String(query).toLowerCase();
  const normalizedColumn = String(tenantColumn).toLowerCase();

  if (!normalizedQuery.includes(normalizedColumn)) {
    throw new Error(`[TENANT-GUARD] Query missing ${tenantColumn} for ${operation}`);
  }

  if (Array.isArray(params) && tenantId && !params.some(param => param === tenantId)) {
    throw new Error(`[TENANT-GUARD] Params missing tenantId for ${operation}`);
  }
}

/**
 * Require a tenant column on a table for tenant-scoped operations.
 *
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} tenantId - Tenant ID
 * @param {string} operation - Operation description
 * @returns {string} Tenant column name
 */
export function getTenantColumnOrThrow(db, tableName, tenantId, operation = 'tenant operation') {
  if (!tenantId) {
    throw new Error(`[TENANT-GUARD] Missing tenant for ${operation}`);
  }

  if (!TENANT_REQUIRED_TABLES.has(tableName)) {
    throw new Error(`[TENANT-GUARD] ${tableName} not declared as tenant-required for ${operation}`);
  }

  const tenantColumn = getTenantColumnForTable(tableName, db);

  if (!tenantColumn) {
    throw new Error(`[TENANT-GUARD] Missing tenant column for ${tableName} in ${operation}`);
  }

  return tenantColumn;
}

export default {
  assertTenantScoped,
  getTenantColumnOrThrow,
  TENANT_REQUIRED_TABLES,
  GLOBAL_TABLE_ALLOWLIST
};
