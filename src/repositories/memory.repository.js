/**
 * @file repositories/memory.repository.js
 * @description Repository for memory table (key-value store)
 * Wave 2: Database Layer - Memory Repository
 */

import { BaseRepository } from './base.repository.js';
import { NotFoundError, DatabaseError } from '../utils/errors/index.js';

/**
 * Memory Repository
 * Manages key-value storage in memory table
 */
export class MemoryRepository extends BaseRepository {
  constructor(db, logger) {
    super(db, logger, 'memory');
  }

  /**
   * Get value by key
   * @param {string} key - Memory key
   * @returns {string|null} Value or null if not found
   */
  get(key) {
    try {
      const record = this.findOneBy({ key });

      this.logger.debug('Memory get', { key, found: !!record });
      return record ? record.value : null;
    } catch (error) {
      this.logger.error('get failed', { key, error: error.message });
      throw new DatabaseError('Failed to get memory value', 'get', error);
    }
  }

  /**
   * Get parsed JSON value
   * @param {string} key - Memory key
   * @param {*} defaultValue - Default value if not found or parse fails
   * @returns {*} Parsed value or default
   */
  getJSON(key, defaultValue = null) {
    try {
      const value = this.get(key);

      if (!value) {
        return defaultValue;
      }

      try {
        return JSON.parse(value);
      } catch (parseError) {
        this.logger.warn('Failed to parse JSON value', { key, parseError: parseError.message });
        return defaultValue;
      }
    } catch (error) {
      this.logger.error('getJSON failed', { key, error: error.message });
      return defaultValue;
    }
  }

  /**
   * Set value for key
   * @param {string} key - Memory key
   * @param {string} value - Value to store
   * @returns {Object} Memory record
   */
  set(key, value) {
    try {
      const existing = this.findOneBy({ key });

      let record;
      if (existing) {
        record = this.update(existing.id, { value });
        this.logger.debug('Memory updated', { key });
      } else {
        record = this.create({ key, value });
        this.logger.debug('Memory created', { key });
      }

      return record;
    } catch (error) {
      this.logger.error('set failed', { key, error: error.message });
      throw new DatabaseError('Failed to set memory value', 'set', error);
    }
  }

  /**
   * Set JSON value
   * @param {string} key - Memory key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {Object} Memory record
   */
  setJSON(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      return this.set(key, jsonValue);
    } catch (error) {
      this.logger.error('setJSON failed', { key, error: error.message });
      throw new DatabaseError('Failed to set JSON value', 'setJSON', error);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Memory key
   * @returns {boolean} True if exists
   */
  has(key) {
    try {
      const record = this.findOneBy({ key });
      return !!record;
    } catch (error) {
      this.logger.error('has failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete by key
   * @param {string} key - Memory key
   * @returns {boolean} True if deleted
   */
  remove(key) {
    try {
      const deleted = this.deleteBy({ key });

      this.logger.debug('Memory removed', { key, deleted: deleted > 0 });
      return deleted > 0;
    } catch (error) {
      this.logger.error('remove failed', { key, error: error.message });
      throw new DatabaseError('Failed to remove memory value', 'remove', error);
    }
  }

  /**
   * Get all keys
   * @returns {Array<string>} Array of keys
   */
  keys() {
    try {
      const records = this.findAll({ orderBy: 'key', order: 'ASC' });
      return records.map(r => r.key);
    } catch (error) {
      this.logger.error('keys failed', { error: error.message });
      throw new DatabaseError('Failed to get memory keys', 'keys', error);
    }
  }

  /**
   * Get keys matching pattern (simple wildcard support)
   * @param {string} pattern - Pattern with * wildcard (e.g., "user:*")
   * @returns {Array<string>} Matching keys
   */
  keysLike(pattern) {
    try {
      const sqlPattern = pattern.replace(/\*/g, '%');
      const sql = `SELECT key FROM ${this.tableName} WHERE key LIKE ? ORDER BY key`;
      const records = this.query(sql, [sqlPattern]);

      return records.map(r => r.key);
    } catch (error) {
      this.logger.error('keysLike failed', { pattern, error: error.message });
      throw new DatabaseError('Failed to get matching keys', 'keysLike', error);
    }
  }

  /**
   * Get multiple values by keys
   * @param {Array<string>} keys - Array of keys
   * @returns {Object} Object with key-value pairs
   */
  getMany(keys) {
    try {
      if (!keys || keys.length === 0) {
        return {};
      }

      const placeholders = keys.map(() => '?').join(',');
      const sql = `SELECT key, value FROM ${this.tableName} WHERE key IN (${placeholders})`;
      const records = this.query(sql, keys);

      const result = {};
      records.forEach(record => {
        result[record.key] = record.value;
      });

      this.logger.debug('getMany executed', { requestedKeys: keys.length, foundKeys: records.length });
      return result;
    } catch (error) {
      this.logger.error('getMany failed', { keys, error: error.message });
      throw new DatabaseError('Failed to get multiple values', 'getMany', error);
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} pairs - Object with key-value pairs
   * @returns {number} Number of records set
   */
  setMany(pairs) {
    try {
      if (!pairs || Object.keys(pairs).length === 0) {
        return 0;
      }

      let count = 0;
      for (const [key, value] of Object.entries(pairs)) {
        this.set(key, value);
        count++;
      }

      this.logger.debug('setMany executed', { count });
      return count;
    } catch (error) {
      this.logger.error('setMany failed', { error: error.message });
      throw new DatabaseError('Failed to set multiple values', 'setMany', error);
    }
  }

  /**
   * Delete multiple keys
   * @param {Array<string>} keys - Array of keys to delete
   * @returns {number} Number of deleted records
   */
  removeMany(keys) {
    try {
      if (!keys || keys.length === 0) {
        return 0;
      }

      const placeholders = keys.map(() => '?').join(',');
      const sql = `DELETE FROM ${this.tableName} WHERE key IN (${placeholders})`;
      const result = this.execute(sql, keys);

      this.logger.debug('removeMany executed', { requestedKeys: keys.length, deleted: result.changes });
      return result.changes;
    } catch (error) {
      this.logger.error('removeMany failed', { keys, error: error.message });
      throw new DatabaseError('Failed to remove multiple values', 'removeMany', error);
    }
  }

  /**
   * Clear all memory records
   * @returns {number} Number of deleted records
   */
  clear() {
    try {
      const sql = `DELETE FROM ${this.tableName}`;
      const result = this.execute(sql);

      this.logger.info('Memory cleared', { deleted: result.changes });
      return result.changes;
    } catch (error) {
      this.logger.error('clear failed', { error: error.message });
      throw new DatabaseError('Failed to clear memory', 'clear', error);
    }
  }

  /**
   * Get memory statistics
   * @returns {Object} Statistics
   */
  getStats() {
    try {
      const total = this.count();
      const sql = `
        SELECT
          AVG(LENGTH(value)) as avg_value_size,
          MAX(LENGTH(value)) as max_value_size,
          MIN(LENGTH(value)) as min_value_size
        FROM ${this.tableName}
      `;
      const sizeStats = this.db.prepare(sql).get();

      return {
        total,
        avgValueSize: Math.round(sizeStats.avg_value_size || 0),
        maxValueSize: sizeStats.max_value_size || 0,
        minValueSize: sizeStats.min_value_size || 0
      };
    } catch (error) {
      this.logger.error('getStats failed', { error: error.message });
      throw new DatabaseError('Failed to get memory stats', 'getStats', error);
    }
  }
}

export default MemoryRepository;
