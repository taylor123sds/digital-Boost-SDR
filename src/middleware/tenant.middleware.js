/**
 * @file tenant.middleware.js
 * @description Tenant context middleware for multi-tenancy support
 *
 * P0-5: tenant_id is the canonical name (per ARCHITECTURE_DECISIONS.md)
 * Every authenticated request will have req.tenantId available
 */

import { getDatabase } from '../db/connection.js';

// Default tenant for legacy data (single-tenant mode)
export const DEFAULT_TENANT_ID = 'default';

/**
 * Extract tenant context from authenticated request
 * MUST be used AFTER authenticate middleware
 *
 * P0-5: Uses tenantId from JWT (canonical)
 */
export function tenantContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Tenant context requires authentication'
    });
  }

  // P0-5: tenantId is canonical
  const tenantId = req.user.tenantId || req.user.id || DEFAULT_TENANT_ID;

  req.tenantId = tenantId;

  // Also set in locals for views/templates if needed
  res.locals.tenantId = tenantId;

  next();
}

/**
 * Optional tenant context - doesn't fail if no user
 * Uses default tenant for anonymous requests
 *
 * P0-5: Uses tenantId (canonical)
 */
export function optionalTenantContext(req, res, next) {
  if (req.user) {
    // P0-5: tenantId is canonical
    req.tenantId = req.user.tenantId || req.user.id || DEFAULT_TENANT_ID;
  } else {
    req.tenantId = DEFAULT_TENANT_ID;
  }

  res.locals.tenantId = req.tenantId;
  next();
}

/**
 * Validate that tenant exists in database
 */
export async function validateTenant(req, res, next) {
  if (!req.tenantId || req.tenantId === DEFAULT_TENANT_ID) {
    return next();
  }

  try {
    const db = getDatabase();
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(req.tenantId);

    if (!team) {
      // If team doesn't exist, check if it's a user ID
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.tenantId);

      if (!user) {
        return res.status(403).json({
          success: false,
          error: 'Tenant not found'
        });
      }
    }

    next();
  } catch (error) {
    console.error('[TENANT] Error validating tenant:', error);
    next(); // Continue even on validation errors
  }
}

/**
 * Ensure tenant isolation - user can only access their own tenant's data
 */
export function enforceIsolation(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context required'
    });
  }

  // Admin can access any tenant if they specify one
  if (req.user?.role === 'admin' && req.query.tenantId) {
    req.tenantId = req.query.tenantId;
  }

  next();
}

/**
 * Require a non-default tenant for protected routes
 */
export function requireTenant(req, res, next) {
  if (!req.tenantId || req.tenantId === DEFAULT_TENANT_ID) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context required'
    });
  }

  next();
}

/**
 * Helper to add tenant filter to SQL queries
 * @param {string} baseQuery - The base SQL query
 * @param {string} tenantIdColumn - Column name for tenant_id (default: 'tenant_id')
 * @returns {string} Query with tenant filter added
 */
export function addTenantFilter(baseQuery, tenantIdColumn = 'tenant_id') {
  const lowerQuery = baseQuery.toLowerCase();

  // If query already has WHERE, add AND
  if (lowerQuery.includes('where')) {
    return baseQuery.replace(/where/i, `WHERE ${tenantIdColumn} = ? AND`);
  }

  // Otherwise add WHERE before ORDER BY, LIMIT, or at end
  if (lowerQuery.includes('order by')) {
    return baseQuery.replace(/order by/i, `WHERE ${tenantIdColumn} = ? ORDER BY`);
  }

  if (lowerQuery.includes('limit')) {
    return baseQuery.replace(/limit/i, `WHERE ${tenantIdColumn} = ? LIMIT`);
  }

  return `${baseQuery} WHERE ${tenantIdColumn} = ?`;
}

/**
 * Create tenant-scoped database helper
 */
export function createTenantDbHelper(db, tenantId) {
  return {
    /**
     * Run SELECT with automatic tenant filter
     */
    selectWithTenant(table, columns = '*', where = '', params = []) {
      let query = `SELECT ${columns} FROM ${table}`;

      // Always add tenant filter first
      const tenantWhere = `tenant_id = ?`;
      const allParams = [tenantId, ...params];

      if (where) {
        query += ` WHERE ${tenantWhere} AND (${where})`;
      } else {
        query += ` WHERE ${tenantWhere}`;
      }

      return db.prepare(query).all(...allParams);
    },

    /**
     * Insert with automatic tenant_id
     */
    insertWithTenant(table, data) {
      const dataWithTenant = { ...data, tenant_id: tenantId };
      const columns = Object.keys(dataWithTenant).join(', ');
      const placeholders = Object.keys(dataWithTenant).map(() => '?').join(', ');

      const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      return db.prepare(query).run(...Object.values(dataWithTenant));
    },

    /**
     * Update with automatic tenant filter
     */
    updateWithTenant(table, data, where, params = []) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const query = `UPDATE ${table} SET ${setClause} WHERE tenant_id = ? AND ${where}`;

      return db.prepare(query).run(...Object.values(data), tenantId, ...params);
    },

    /**
     * Delete with automatic tenant filter
     */
    deleteWithTenant(table, where, params = []) {
      const query = `DELETE FROM ${table} WHERE tenant_id = ? AND ${where}`;
      return db.prepare(query).run(tenantId, ...params);
    },

    /**
     * Count with automatic tenant filter
     */
    countWithTenant(table, where = '', params = []) {
      let query = `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = ?`;
      const allParams = [tenantId, ...params];

      if (where) {
        query += ` AND (${where})`;
      }

      return db.prepare(query).get(...allParams).count;
    }
  };
}

export default {
  tenantContext,
  optionalTenantContext,
  validateTenant,
  enforceIsolation,
  requireTenant,
  addTenantFilter,
  createTenantDbHelper,
  DEFAULT_TENANT_ID
};
