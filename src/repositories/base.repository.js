/**
 * @file repositories/base.repository.js
 * @description Base repository class with common CRUD operations
 * Wave 2: Database Layer - Base Repository
 */

import { DatabaseError } from '../utils/errors/index.js';

/**
 * Base repository providing common database operations
 * All domain repositories should extend this class
 */
export class BaseRepository {
  /**
   * @param {Database} db - SQLite database instance
   * @param {Logger} logger - Logger instance
   * @param {string} tableName - Name of the table this repository manages
   */
  constructor(db, logger, tableName) {
    if (!db) {
      throw new DatabaseError('Database instance is required', 'constructor');
    }
    if (!logger) {
      throw new DatabaseError('Logger instance is required', 'constructor');
    }
    if (!tableName) {
      throw new DatabaseError('Table name is required', 'constructor');
    }

    this.db = db;
    this.logger = logger.child({ repository: tableName });
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} Record or null if not found
   */
  findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = this.db.prepare(sql).get(id);

      this.logger.debug('findById executed', { id, found: !!result });
      return result || null;
    } catch (error) {
      this.logger.error('findById failed', { id, error: error.message });
      throw new DatabaseError(`Failed to find ${this.tableName} by id`, 'findById', error);
    }
  }

  /**
   * Find all records (with optional limit and offset)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.orderBy - Column to order by
   * @param {string} options.order - Order direction (ASC or DESC)
   * @returns {Array} Array of records
   */
  findAll(options = {}) {
    try {
      const { limit, offset = 0, orderBy = 'id', order = 'ASC' } = options;

      let sql = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order}`;
      const params = [];

      if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const stmt = this.db.prepare(sql);
      const results = params.length > 0 ? stmt.all(...params) : stmt.all();

      this.logger.debug('findAll executed', { count: results.length, options });
      return results;
    } catch (error) {
      this.logger.error('findAll failed', { error: error.message });
      throw new DatabaseError(`Failed to find all ${this.tableName}`, 'findAll', error);
    }
  }

  /**
   * Find records matching criteria
   * @param {Object} criteria - Key-value pairs to match
   * @param {Object} options - Query options (limit, offset, orderBy, order)
   * @returns {Array} Array of matching records
   */
  findBy(criteria, options = {}) {
    try {
      const { limit, offset = 0, orderBy = 'id', order = 'ASC' } = options;

      const keys = Object.keys(criteria);
      if (keys.length === 0) {
        return this.findAll(options);
      }

      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(criteria);

      let sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} ORDER BY ${orderBy} ${order}`;
      const params = [...values];

      if (limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const results = this.db.prepare(sql).all(...params);

      this.logger.debug('findBy executed', { criteria, count: results.length, options });
      return results;
    } catch (error) {
      this.logger.error('findBy failed', { criteria, error: error.message });
      throw new DatabaseError(`Failed to find ${this.tableName} by criteria`, 'findBy', error);
    }
  }

  /**
   * Find one record matching criteria
   * @param {Object} criteria - Key-value pairs to match
   * @returns {Object|null} First matching record or null
   */
  findOneBy(criteria) {
    try {
      const keys = Object.keys(criteria);
      if (keys.length === 0) {
        return null;
      }

      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(criteria);

      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const result = this.db.prepare(sql).get(...values);

      this.logger.debug('findOneBy executed', { criteria, found: !!result });
      return result || null;
    } catch (error) {
      this.logger.error('findOneBy failed', { criteria, error: error.message });
      throw new DatabaseError(`Failed to find one ${this.tableName}`, 'findOneBy', error);
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Object} Created record with ID
   */
  create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(',');

      const sql = `INSERT INTO ${this.tableName} (${keys.join(',')}) VALUES (${placeholders})`;
      const result = this.db.prepare(sql).run(...values);

      const created = this.findById(result.lastInsertRowid);

      this.logger.info('Record created', { id: result.lastInsertRowid, table: this.tableName });
      return created;
    } catch (error) {
      this.logger.error('create failed', { data, error: error.message });
      throw new DatabaseError(`Failed to create ${this.tableName}`, 'create', error);
    }
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Object|null} Updated record or null if not found
   */
  update(id, data) {
    try {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        this.logger.warn('update called with no data', { id });
        return this.findById(id);
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = this.db.prepare(sql).run(...values);

      if (result.changes === 0) {
        this.logger.warn('update found no record', { id });
        return null;
      }

      const updated = this.findById(id);

      this.logger.info('Record updated', { id, table: this.tableName, changes: result.changes });
      return updated;
    } catch (error) {
      this.logger.error('update failed', { id, data, error: error.message });
      throw new DatabaseError(`Failed to update ${this.tableName}`, 'update', error);
    }
  }

  /**
   * Update records matching criteria
   * @param {Object} criteria - Criteria to match
   * @param {Object} data - Updated data
   * @returns {number} Number of updated records
   */
  updateBy(criteria, data) {
    try {
      const criteriaKeys = Object.keys(criteria);
      const dataKeys = Object.keys(data);

      if (criteriaKeys.length === 0 || dataKeys.length === 0) {
        this.logger.warn('updateBy called with empty criteria or data');
        return 0;
      }

      const setClause = dataKeys.map(key => `${key} = ?`).join(', ');
      const whereClause = criteriaKeys.map(key => `${key} = ?`).join(' AND ');
      const values = [...Object.values(data), ...Object.values(criteria)];

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).run(...values);

      this.logger.info('Records updated by criteria', {
        criteria,
        table: this.tableName,
        changes: result.changes
      });
      return result.changes;
    } catch (error) {
      this.logger.error('updateBy failed', { criteria, data, error: error.message });
      throw new DatabaseError(`Failed to update ${this.tableName} by criteria`, 'updateBy', error);
    }
  }

  /**
   * Delete a record by ID
   * @param {number} id - Record ID
   * @returns {boolean} True if deleted, false if not found
   */
  delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = this.db.prepare(sql).run(id);

      const deleted = result.changes > 0;

      this.logger.info('Record deleted', { id, table: this.tableName, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('delete failed', { id, error: error.message });
      throw new DatabaseError(`Failed to delete ${this.tableName}`, 'delete', error);
    }
  }

  /**
   * Delete records matching criteria
   * @param {Object} criteria - Criteria to match
   * @returns {number} Number of deleted records
   */
  deleteBy(criteria) {
    try {
      const keys = Object.keys(criteria);
      if (keys.length === 0) {
        this.logger.warn('deleteBy called with empty criteria');
        return 0;
      }

      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(criteria);

      const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).run(...values);

      this.logger.info('Records deleted by criteria', {
        criteria,
        table: this.tableName,
        changes: result.changes
      });
      return result.changes;
    } catch (error) {
      this.logger.error('deleteBy failed', { criteria, error: error.message });
      throw new DatabaseError(`Failed to delete ${this.tableName} by criteria`, 'deleteBy', error);
    }
  }

  /**
   * Count all records
   * @returns {number} Total record count
   */
  count() {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const result = this.db.prepare(sql).get();

      this.logger.debug('count executed', { count: result.count });
      return result.count;
    } catch (error) {
      this.logger.error('count failed', { error: error.message });
      throw new DatabaseError(`Failed to count ${this.tableName}`, 'count', error);
    }
  }

  /**
   * Count records matching criteria
   * @param {Object} criteria - Criteria to match
   * @returns {number} Matching record count
   */
  countBy(criteria) {
    try {
      const keys = Object.keys(criteria);
      if (keys.length === 0) {
        return this.count();
      }

      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(criteria);

      const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).get(...values);

      this.logger.debug('countBy executed', { criteria, count: result.count });
      return result.count;
    } catch (error) {
      this.logger.error('countBy failed', { criteria, error: error.message });
      throw new DatabaseError(`Failed to count ${this.tableName} by criteria`, 'countBy', error);
    }
  }

  /**
   * Check if record exists by ID
   * @param {number} id - Record ID
   * @returns {boolean} True if exists
   */
  exists(id) {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = this.db.prepare(sql).get(id);

      return !!result;
    } catch (error) {
      this.logger.error('exists failed', { id, error: error.message });
      throw new DatabaseError(`Failed to check if ${this.tableName} exists`, 'exists', error);
    }
  }

  /**
   * Execute raw SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Query results
   */
  query(sql, params = []) {
    try {
      const results = this.db.prepare(sql).all(...params);

      this.logger.debug('Raw query executed', { sql, paramCount: params.length, resultCount: results.length });
      return results;
    } catch (error) {
      this.logger.error('query failed', { sql, error: error.message });
      throw new DatabaseError('Raw query failed', 'query', error);
    }
  }

  /**
   * Execute raw SQL statement (for updates/inserts/deletes)
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Object} Statement result with changes/lastInsertRowid
   */
  execute(sql, params = []) {
    try {
      const result = this.db.prepare(sql).run(...params);

      this.logger.debug('Statement executed', {
        sql,
        paramCount: params.length,
        changes: result.changes
      });
      return result;
    } catch (error) {
      this.logger.error('execute failed', { sql, error: error.message });
      throw new DatabaseError('Statement execution failed', 'execute', error);
    }
  }
}

export default BaseRepository;
