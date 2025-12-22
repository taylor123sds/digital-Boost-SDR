/**
 * @file tenantCompat.js
 * @description P0-5: Tenant/Team ID Compatibility Utilities
 *
 * Provides helpers for tenant_id canonical usage.
 *
 * P0-5 UPDATE: Names updated per ARCHITECTURE_DECISIONS.md
 *
 * CANONICAL NAME: tenant_id (in database) / tenantId (in code)
 * New code should always use tenant_id.
 *
 * @version 1.1.0 - P0-5 tenant_id canonical
 */

/**
 * Default tenant ID for legacy/anonymous data
 */
export const DEFAULT_TENANT_ID = 'default';

/**
 * Normalize a row from database to use consistent naming
 * - Ensures tenant_id stays canonical in runtime
 *
 * @param {Object} row - Database row
 * @returns {Object} Normalized row
 */
export function normalizeDbRow(row) {
  if (!row) return null;
  return { ...row };
}

/**
 * Normalize API response data to keep tenant_id canonical
 *
 * @param {Object} data - Response data
 * @returns {Object} Data with both field names
 */
export function normalizeApiResponse(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    return data.map(item => normalizeApiResponse(item));
  }

  return { ...data };
}

/**
 * Extract tenant ID from request, canonical-only
 *
 * Priority:
 * 1. req.tenantId (canonical - set by auth middleware)
 * 2. req.body.tenant_id or req.body.tenantId
 * 3. req.query.tenant_id or req.query.tenantId
 * 4. req.params.tenantId
 * 5. DEFAULT_TENANT_ID
 *
 * @param {Request} req - Express request
 * @returns {string} Tenant ID
 */
export function extractTenantId(req) {
  // 1. Canonical (set by auth middleware)
  if (req.tenantId && req.tenantId !== DEFAULT_TENANT_ID) {
    return req.tenantId;
  }

  // 2. From body
  if (req.body?.tenant_id) return req.body.tenant_id;
  if (req.body?.tenantId) return req.body.tenantId;

  // 3. From query
  if (req.query?.tenant_id) return req.query.tenant_id;
  if (req.query?.tenantId) return req.query.tenantId;

  // 4. From params
  if (req.params?.tenantId) return req.params.tenantId;

  // 5. Default
  return req.tenantId || DEFAULT_TENANT_ID;
}

/**
 * Create SQL column name based on table schema
 * Use this when dynamically building queries
 *
 * @param {string} tableName - Table name
 * @param {Object} db - Database connection for schema check
 * @returns {string|null} Column name ('tenant_id') or null when missing
 */
export function getTenantColumnForTable(tableName, db) {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all();

    // Prefer tenant_id (canonical)
    if (info.some(col => col.name === 'tenant_id')) {
      return 'tenant_id';
    }

    // Table has no tenant column
    return null;
  } catch {
    return null;
  }
}

/**
 * Append tenant_id column to an insert payload based on table schema.
 * Returns updated { columns, values } arrays.
 *
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string[]} columns - Existing columns
 * @param {Array} values - Existing values
 * @param {string} tenantId - Tenant ID to apply
 * @returns {{columns: string[], values: Array}}
 */
export function appendTenantColumns(db, tableName, columns, values, tenantId) {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasTenantId = info.some(col => col.name === 'tenant_id');

    if (hasTenantId) {
      columns.push('tenant_id');
      values.push(tenantId);
    }
  } catch {
    // If schema lookup fails, do not modify columns/values.
  }

  return { columns, values };
}

/**
 * Validate that a tenant ID is not the default/anonymous tenant
 *
 * @param {string} tenantId - Tenant ID to validate
 * @returns {boolean} True if valid (not default)
 */
export function isValidTenant(tenantId) {
  return tenantId && tenantId !== DEFAULT_TENANT_ID;
}

/**
 * Require valid tenant - throws if tenant is default/missing
 *
 * @param {string} tenantId - Tenant ID
 * @param {string} operation - Description of operation (for error message)
 * @throws {Error} If tenant is not valid
 */
export function requireValidTenant(tenantId, operation = 'this operation') {
  if (!isValidTenant(tenantId)) {
    throw new Error(`Valid tenant required for ${operation}`);
  }
}

/**
 * Middleware factory to ensure tenant context is present
 *
 * @param {Object} options - Options
 * @param {boolean} options.required - Whether tenant is required (default: true)
 * @param {string} options.errorMessage - Custom error message
 * @returns {Function} Express middleware
 */
export function ensureTenant(options = {}) {
  const { required = true, errorMessage = 'Tenant context required' } = options;

  return (req, res, next) => {
    const tenantId = extractTenantId(req);

    if (required && !isValidTenant(tenantId)) {
      return res.status(403).json({
        success: false,
        error: errorMessage
      });
    }

    // Ensure req.tenantId is set
    req.tenantId = tenantId;

    next();
  };
}

export default {
  DEFAULT_TENANT_ID,
  normalizeDbRow,
  normalizeApiResponse,
  extractTenantId,
  getTenantColumnForTable,
  appendTenantColumns,
  isValidTenant,
  requireValidTenant,
  ensureTenant
};
