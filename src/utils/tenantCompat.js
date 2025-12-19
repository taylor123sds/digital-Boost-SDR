/**
 * @file tenantCompat.js
 * @description P0-5: Tenant/Team ID Compatibility Utilities
 *
 * Provides helpers for the migration period where we need to support
 * both tenant_id and team_id naming conventions.
 *
 * P0-5 UPDATE: Names updated per ARCHITECTURE_DECISIONS.md
 *
 * CANONICAL NAME: tenant_id (in database) / tenantId (in code)
 * LEGACY NAME: team_id (in old tables, migrations < 025)
 *
 * New code should always use tenant_id. This compat layer exists
 * for backward compatibility with older tables using team_id.
 *
 * @version 1.1.0 - P0-5 tenant_id canonical
 */

/**
 * Default tenant ID for legacy/anonymous data
 */
export const DEFAULT_TENANT_ID = 'default';

/**
 * Normalize a row from database to use consistent naming
 * - Ensures team_id is always present (aliased from tenant_id if needed)
 * - Optionally includes tenant_id for backward compatibility
 *
 * @param {Object} row - Database row
 * @param {Object} options - Options
 * @param {boolean} options.includeAlias - Include tenant_id as alias of team_id
 * @returns {Object} Normalized row
 */
export function normalizeDbRow(row, options = {}) {
  if (!row) return null;

  const { includeAlias = true } = options;
  const normalized = { ...row };

  // If row has tenant_id but not team_id, alias it
  if (row.tenant_id && !row.team_id) {
    normalized.team_id = row.tenant_id;
  }

  // If row has team_id and we want backward compat alias
  if (includeAlias && row.team_id && !row.tenant_id) {
    normalized.tenant_id = row.team_id;
  }

  return normalized;
}

/**
 * Normalize API response data to include both team_id and tenant_id
 * during migration period for frontend compatibility
 *
 * @param {Object} data - Response data
 * @returns {Object} Data with both field names
 */
export function normalizeApiResponse(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    return data.map(item => normalizeApiResponse(item));
  }

  const normalized = { ...data };

  // Ensure both naming conventions are present
  if (data.team_id !== undefined && data.tenant_id === undefined) {
    normalized.tenant_id = data.team_id;
  }
  if (data.tenant_id !== undefined && data.team_id === undefined) {
    normalized.team_id = data.tenant_id;
  }

  // Also normalize tenantId/teamId (camelCase)
  if (data.teamId !== undefined && data.tenantId === undefined) {
    normalized.tenantId = data.teamId;
  }
  if (data.tenantId !== undefined && data.teamId === undefined) {
    normalized.teamId = data.tenantId;
  }

  return normalized;
}

/**
 * Extract tenant ID from request, supporting both naming conventions
 *
 * Priority:
 * 1. req.tenantId (canonical - set by auth middleware)
 * 2. req.body.team_id or req.body.tenant_id
 * 3. req.query.team_id or req.query.tenant_id
 * 4. req.params.teamId or req.params.tenantId
 * 5. req.user.teamId
 * 6. DEFAULT_TENANT_ID
 *
 * @param {Request} req - Express request
 * @returns {string} Tenant ID
 */
export function extractTenantId(req) {
  // 1. Canonical (set by auth middleware)
  if (req.tenantId && req.tenantId !== DEFAULT_TENANT_ID) {
    return req.tenantId;
  }
  if (req.teamId && req.teamId !== DEFAULT_TENANT_ID) {
    return req.teamId;
  }

  // 2. From body (both conventions)
  if (req.body?.team_id) return req.body.team_id;
  if (req.body?.tenant_id) return req.body.tenant_id;
  if (req.body?.teamId) return req.body.teamId;
  if (req.body?.tenantId) return req.body.tenantId;

  // 3. From query
  if (req.query?.team_id) return req.query.team_id;
  if (req.query?.tenant_id) return req.query.tenant_id;
  if (req.query?.teamId) return req.query.teamId;
  if (req.query?.tenantId) return req.query.tenantId;

  // 4. From params
  if (req.params?.teamId) return req.params.teamId;
  if (req.params?.tenantId) return req.params.tenantId;

  // 5. From user
  if (req.user?.teamId) return req.user.teamId;

  // 6. Default
  return req.tenantId || DEFAULT_TENANT_ID;
}

/**
 * Create SQL column name based on table schema
 * Use this when dynamically building queries
 *
 * @param {string} tableName - Table name
 * @param {Object} db - Database connection for schema check
 * @returns {string} Column name ('team_id' or 'tenant_id')
 */
export function getTenantColumnForTable(tableName, db) {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all();

    // Prefer tenant_id (canonical)
    if (info.some(col => col.name === 'tenant_id')) {
      return 'tenant_id';
    }

    // Fall back to team_id (legacy)
    if (info.some(col => col.name === 'team_id')) {
      return 'team_id';
    }

    // Table has no tenant column
    return null;
  } catch {
    return null;
  }
}

/**
 * Append tenant_id/team_id columns to an insert payload based on table schema.
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
    const hasTeamId = info.some(col => col.name === 'team_id');

    if (hasTenantId) {
      columns.push('tenant_id');
      values.push(tenantId);
    }
    if (hasTeamId) {
      columns.push('team_id');
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
