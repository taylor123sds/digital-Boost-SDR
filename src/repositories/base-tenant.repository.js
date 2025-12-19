/**
 * @file repositories/base-tenant.repository.js
 * @description Base tenant-aware repository with automatic tenant isolation
 *
 * P0-5: Tenant ID Naming Convention
 *
 * CANONICAL NAME: tenant_id (as per ARCHITECTURE_DECISIONS.md)
 *
 * STRATEGY:
 * - Internal name: tenantId (used in code)
 * - Database column: 'tenant_id' (canonical, used in migrations 025+)
 * - Legacy column: 'team_id' (deprecated, from migrations < 025)
 * - Subclasses can override getTenantColumn() for legacy tables using 'team_id'
 * - All queries automatically filter by tenant
 *
 * @version 1.1.0 - P0-5 tenant_id canonical
 */

import { BaseRepository } from './base.repository.js';
import { DatabaseError } from '../utils/errors/index.js';

/**
 * Default tenant column name (canonical)
 * P0-5: Changed from 'team_id' to 'tenant_id' per ARCHITECTURE_DECISIONS.md
 * Legacy tables using 'team_id' should override getTenantColumn()
 * @deprecated 'team_id' is deprecated, use 'tenant_id' in new tables
 */
const DEFAULT_TENANT_COLUMN = 'tenant_id';

/**
 * Base tenant-aware repository
 * Extends BaseRepository with automatic tenant filtering
 */
export class BaseTenantRepository extends BaseRepository {
  /**
   * @param {Database} db - SQLite database instance
   * @param {Logger} logger - Logger instance
   * @param {string} tableName - Name of the table
   * @param {Object} options - Repository options
   * @param {string} options.tenantColumn - Override tenant column name (default: 'tenant_id')
   * @param {boolean} options.tenantOptional - If true, allow null tenant (for global tables)
   */
  constructor(db, logger, tableName, options = {}) {
    super(db, logger, tableName);

    this._tenantColumn = options.tenantColumn || DEFAULT_TENANT_COLUMN;
    this._tenantOptional = options.tenantOptional || false;
  }

  /**
   * Get tenant column name for this repository
   * Subclasses can override for legacy tables using 'tenant_id'
   * @returns {string} Column name
   */
  getTenantColumn() {
    return this._tenantColumn;
  }

  /**
   * Check if tenant column exists in table
   * Caches result after first check
   * @returns {boolean}
   */
  hasTenantColumn() {
    if (this._hasTenantColumn !== undefined) {
      return this._hasTenantColumn;
    }

    try {
      const info = this.db.prepare(`PRAGMA table_info(${this.tableName})`).all();
      const column = this.getTenantColumn();
      this._hasTenantColumn = info.some(col => col.name === column);
      return this._hasTenantColumn;
    } catch (error) {
      this.logger.warn('Failed to check tenant column existence', { error: error.message });
      return false;
    }
  }

  /**
   * Validate tenant ID
   * @param {string} tenantId - Tenant ID to validate
   * @throws {Error} If tenant is required but not provided
   */
  validateTenantId(tenantId) {
    if (!this._tenantOptional && !tenantId) {
      throw new DatabaseError(
        `Tenant ID is required for ${this.tableName}`,
        'validateTenantId'
      );
    }
  }

  // =========================================================================
  // TENANT-AWARE CRUD OPERATIONS
  // =========================================================================

  /**
   * Find record by ID within tenant scope
   * @param {string|number} id - Record ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object|null}
   */
  findByIdForTenant(id, tenantId) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.findById(id);
      }

      const column = this.getTenantColumn();
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND ${column} = ?`;
      const result = this.db.prepare(sql).get(id, tenantId);

      this.logger.debug('findByIdForTenant executed', { id, tenantId, found: !!result });
      return result || null;
    } catch (error) {
      this.logger.error('findByIdForTenant failed', { id, tenantId, error: error.message });
      throw new DatabaseError(`Failed to find ${this.tableName} by id for tenant`, 'findByIdForTenant', error);
    }
  }

  /**
   * Find all records for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Array}
   */
  findAllForTenant(tenantId, options = {}) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.findAll(options);
      }

      const { limit, offset = 0, orderBy = 'id', order = 'ASC' } = options;
      const column = this.getTenantColumn();

      let sql = `SELECT * FROM ${this.tableName} WHERE ${column} = ? ORDER BY ${orderBy} ${order}`;
      const params = [tenantId];

      if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const results = this.db.prepare(sql).all(...params);

      this.logger.debug('findAllForTenant executed', { tenantId, count: results.length, options });
      return results;
    } catch (error) {
      this.logger.error('findAllForTenant failed', { tenantId, error: error.message });
      throw new DatabaseError(`Failed to find all ${this.tableName} for tenant`, 'findAllForTenant', error);
    }
  }

  /**
   * Find records matching criteria within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {Object} criteria - Key-value pairs to match
   * @param {Object} options - Query options
   * @returns {Array}
   */
  findByForTenant(tenantId, criteria, options = {}) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.findBy(criteria, options);
      }

      const { limit, offset = 0, orderBy = 'id', order = 'ASC' } = options;
      const column = this.getTenantColumn();
      const keys = Object.keys(criteria);

      // Start with tenant filter
      let whereClause = `${column} = ?`;
      const values = [tenantId];

      if (keys.length > 0) {
        const criteriaClause = keys.map(key => `${key} = ?`).join(' AND ');
        whereClause += ` AND ${criteriaClause}`;
        values.push(...Object.values(criteria));
      }

      let sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} ORDER BY ${orderBy} ${order}`;

      if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        values.push(limit, offset);
      }

      const results = this.db.prepare(sql).all(...values);

      this.logger.debug('findByForTenant executed', { tenantId, criteria, count: results.length });
      return results;
    } catch (error) {
      this.logger.error('findByForTenant failed', { tenantId, criteria, error: error.message });
      throw new DatabaseError(`Failed to find ${this.tableName} by criteria for tenant`, 'findByForTenant', error);
    }
  }

  /**
   * Find one record matching criteria within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {Object} criteria - Key-value pairs to match
   * @returns {Object|null}
   */
  findOneByForTenant(tenantId, criteria) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.findOneBy(criteria);
      }

      const column = this.getTenantColumn();
      const keys = Object.keys(criteria);

      let whereClause = `${column} = ?`;
      const values = [tenantId];

      if (keys.length > 0) {
        const criteriaClause = keys.map(key => `${key} = ?`).join(' AND ');
        whereClause += ` AND ${criteriaClause}`;
        values.push(...Object.values(criteria));
      }

      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const result = this.db.prepare(sql).get(...values);

      this.logger.debug('findOneByForTenant executed', { tenantId, criteria, found: !!result });
      return result || null;
    } catch (error) {
      this.logger.error('findOneByForTenant failed', { tenantId, criteria, error: error.message });
      throw new DatabaseError(`Failed to find one ${this.tableName} for tenant`, 'findOneByForTenant', error);
    }
  }

  /**
   * Create record with automatic tenant ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} data - Record data (without tenant_id)
   * @returns {Object} Created record
   */
  createForTenant(tenantId, data) {
    this.validateTenantId(tenantId);

    try {
      // Add tenant ID to data
      const column = this.getTenantColumn();
      const dataWithTenant = { ...data };

      if (this.hasTenantColumn()) {
        dataWithTenant[column] = tenantId;
      }

      return this.create(dataWithTenant);
    } catch (error) {
      this.logger.error('createForTenant failed', { tenantId, data, error: error.message });
      throw new DatabaseError(`Failed to create ${this.tableName} for tenant`, 'createForTenant', error);
    }
  }

  /**
   * Update record within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {string|number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Object|null}
   */
  updateForTenant(tenantId, id, data) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.update(id, data);
      }

      // First verify record belongs to tenant
      const existing = this.findByIdForTenant(id, tenantId);
      if (!existing) {
        this.logger.warn('updateForTenant: record not found or wrong tenant', { id, tenantId });
        return null;
      }

      // Now update
      return this.update(id, data);
    } catch (error) {
      this.logger.error('updateForTenant failed', { id, tenantId, data, error: error.message });
      throw new DatabaseError(`Failed to update ${this.tableName} for tenant`, 'updateForTenant', error);
    }
  }

  /**
   * Update records matching criteria within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {Object} criteria - Criteria to match
   * @param {Object} data - Updated data
   * @returns {number} Number of updated records
   */
  updateByForTenant(tenantId, criteria, data) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.updateBy(criteria, data);
      }

      const column = this.getTenantColumn();
      const dataKeys = Object.keys(data);
      const criteriaKeys = Object.keys(criteria);

      if (dataKeys.length === 0) {
        this.logger.warn('updateByForTenant called with no data');
        return 0;
      }

      const setClause = dataKeys.map(key => `${key} = ?`).join(', ');
      let whereClause = `${column} = ?`;
      const values = [...Object.values(data), tenantId];

      if (criteriaKeys.length > 0) {
        const criteriaClause = criteriaKeys.map(key => `${key} = ?`).join(' AND ');
        whereClause += ` AND ${criteriaClause}`;
        values.push(...Object.values(criteria));
      }

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).run(...values);

      this.logger.info('updateByForTenant executed', { tenantId, criteria, changes: result.changes });
      return result.changes;
    } catch (error) {
      this.logger.error('updateByForTenant failed', { tenantId, criteria, error: error.message });
      throw new DatabaseError(`Failed to update ${this.tableName} by criteria for tenant`, 'updateByForTenant', error);
    }
  }

  /**
   * Delete record within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {string|number} id - Record ID
   * @returns {boolean}
   */
  deleteForTenant(tenantId, id) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.delete(id);
      }

      const column = this.getTenantColumn();
      const sql = `DELETE FROM ${this.tableName} WHERE id = ? AND ${column} = ?`;
      const result = this.db.prepare(sql).run(id, tenantId);

      const deleted = result.changes > 0;
      this.logger.info('deleteForTenant executed', { id, tenantId, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('deleteForTenant failed', { id, tenantId, error: error.message });
      throw new DatabaseError(`Failed to delete ${this.tableName} for tenant`, 'deleteForTenant', error);
    }
  }

  /**
   * Delete records matching criteria within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {Object} criteria - Criteria to match
   * @returns {number}
   */
  deleteByForTenant(tenantId, criteria) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.deleteBy(criteria);
      }

      const column = this.getTenantColumn();
      const keys = Object.keys(criteria);

      let whereClause = `${column} = ?`;
      const values = [tenantId];

      if (keys.length > 0) {
        const criteriaClause = keys.map(key => `${key} = ?`).join(' AND ');
        whereClause += ` AND ${criteriaClause}`;
        values.push(...Object.values(criteria));
      }

      const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).run(...values);

      this.logger.info('deleteByForTenant executed', { tenantId, criteria, changes: result.changes });
      return result.changes;
    } catch (error) {
      this.logger.error('deleteByForTenant failed', { tenantId, criteria, error: error.message });
      throw new DatabaseError(`Failed to delete ${this.tableName} by criteria for tenant`, 'deleteByForTenant', error);
    }
  }

  /**
   * Count records for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {number}
   */
  countForTenant(tenantId) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.count();
      }

      const column = this.getTenantColumn();
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${column} = ?`;
      const result = this.db.prepare(sql).get(tenantId);

      this.logger.debug('countForTenant executed', { tenantId, count: result.count });
      return result.count;
    } catch (error) {
      this.logger.error('countForTenant failed', { tenantId, error: error.message });
      throw new DatabaseError(`Failed to count ${this.tableName} for tenant`, 'countForTenant', error);
    }
  }

  /**
   * Count records matching criteria for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} criteria - Criteria to match
   * @returns {number}
   */
  countByForTenant(tenantId, criteria) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.countBy(criteria);
      }

      const column = this.getTenantColumn();
      const keys = Object.keys(criteria);

      let whereClause = `${column} = ?`;
      const values = [tenantId];

      if (keys.length > 0) {
        const criteriaClause = keys.map(key => `${key} = ?`).join(' AND ');
        whereClause += ` AND ${criteriaClause}`;
        values.push(...Object.values(criteria));
      }

      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).get(...values);

      this.logger.debug('countByForTenant executed', { tenantId, criteria, count: result.count });
      return result.count;
    } catch (error) {
      this.logger.error('countByForTenant failed', { tenantId, criteria, error: error.message });
      throw new DatabaseError(`Failed to count ${this.tableName} by criteria for tenant`, 'countByForTenant', error);
    }
  }

  /**
   * Check if record exists within tenant scope
   * @param {string} tenantId - Tenant ID
   * @param {string|number} id - Record ID
   * @returns {boolean}
   */
  existsForTenant(tenantId, id) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.exists(id);
      }

      const column = this.getTenantColumn();
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? AND ${column} = ? LIMIT 1`;
      const result = this.db.prepare(sql).get(id, tenantId);

      return !!result;
    } catch (error) {
      this.logger.error('existsForTenant failed', { id, tenantId, error: error.message });
      throw new DatabaseError(`Failed to check if ${this.tableName} exists for tenant`, 'existsForTenant', error);
    }
  }

  /**
   * Execute tenant-scoped query
   * Automatically adds tenant filter to WHERE clause
   * @param {string} tenantId - Tenant ID
   * @param {string} sql - SQL query (can include WHERE clause)
   * @param {Array} params - Query parameters (tenant will be prepended)
   * @returns {Array}
   */
  queryForTenant(tenantId, sql, params = []) {
    this.validateTenantId(tenantId);

    try {
      if (!this.hasTenantColumn()) {
        return this.query(sql, params);
      }

      const column = this.getTenantColumn();
      const lowerSql = sql.toLowerCase();

      // Add tenant filter to WHERE clause
      let modifiedSql;
      if (lowerSql.includes('where')) {
        modifiedSql = sql.replace(/where/i, `WHERE ${column} = ? AND`);
      } else if (lowerSql.includes('order by')) {
        modifiedSql = sql.replace(/order by/i, `WHERE ${column} = ? ORDER BY`);
      } else if (lowerSql.includes('group by')) {
        modifiedSql = sql.replace(/group by/i, `WHERE ${column} = ? GROUP BY`);
      } else if (lowerSql.includes('limit')) {
        modifiedSql = sql.replace(/limit/i, `WHERE ${column} = ? LIMIT`);
      } else {
        modifiedSql = `${sql} WHERE ${column} = ?`;
      }

      const modifiedParams = [tenantId, ...params];
      return this.query(modifiedSql, modifiedParams);
    } catch (error) {
      this.logger.error('queryForTenant failed', { tenantId, sql, error: error.message });
      throw new DatabaseError('Tenant-scoped query failed', 'queryForTenant', error);
    }
  }
}

// =========================================================================
// COMPATIBILITY ALIASES
// P0-5: For tables still using legacy 'team_id' column
// =========================================================================

/**
 * P0-5: Create a legacy repository class that uses 'team_id' column
 * Use this for tables that still have legacy 'team_id' column
 * New tables should use 'tenant_id' (canonical)
 */
export class LegacyTenantRepository extends BaseTenantRepository {
  constructor(db, logger, tableName, options = {}) {
    super(db, logger, tableName, {
      ...options,
      tenantColumn: 'team_id'  // P0-5: Legacy column for older tables
    });
  }
}

/**
 * Repository factory with tenant column detection
 * Automatically uses correct column based on table schema
 */
export function createTenantRepository(db, logger, tableName, options = {}) {
  const repo = new BaseTenantRepository(db, logger, tableName, options);

  // P0-5: Check if table has tenant_id (canonical), if not try team_id (legacy)
  if (!repo.hasTenantColumn()) {
    const legacyRepo = new LegacyTenantRepository(db, logger, tableName, options);
    if (legacyRepo.hasTenantColumn()) {
      logger.info(`Using legacy team_id column for ${tableName}`);
      return legacyRepo;
    }
  }

  return repo;
}

export default BaseTenantRepository;
