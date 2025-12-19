/**
 * @file db/transaction.js
 * @description Transaction helpers for database operations
 * Wave 2: Database Layer - Transaction Manager
 */

import { DatabaseError } from '../utils/errors/index.js';
import { createLogger } from '../utils/logger.enhanced.js';

const logger = createLogger({ module: 'Transaction' });

/**
 * Execute a function within a transaction
 * Automatically rolls back on error
 *
 * @param {Database} db - Database instance
 * @param {Function} fn - Function to execute in transaction
 * @returns {*} Result of the transaction function
 *
 * @example
 * const result = withTransaction(db, () => {
 *   const lead = leadRepo.create({ name: 'John' });
 *   const state = stateRepo.create({ leadId: lead.id });
 *   return { lead, state };
 * });
 */
export function withTransaction(db, fn) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'withTransaction');
  }

  if (typeof fn !== 'function') {
    throw new DatabaseError('Transaction function is required', 'withTransaction');
  }

  try {
    logger.debug('Starting transaction');

    const transaction = db.transaction(fn);
    const result = transaction();

    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    logger.error('Transaction failed and was rolled back', { error: error.message });
    throw new DatabaseError('Transaction failed', 'withTransaction', error);
  }
}

/**
 * Execute an async function within a transaction
 * Note: better-sqlite3 doesn't support async transactions natively,
 * but we can wrap the sync transaction for consistency
 *
 * @param {Database} db - Database instance
 * @param {Function} fn - Async function to execute
 * @returns {Promise<*>} Result of the function
 */
export async function withAsyncTransaction(db, fn) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'withAsyncTransaction');
  }

  if (typeof fn !== 'function') {
    throw new DatabaseError('Transaction function is required', 'withAsyncTransaction');
  }

  try {
    logger.debug('Starting async transaction');

    // Execute the async function first to get all data
    const data = await fn();

    // Then execute the actual database operations in a sync transaction
    const result = withTransaction(db, () => data);

    logger.debug('Async transaction completed successfully');
    return result;
  } catch (error) {
    logger.error('Async transaction failed', { error: error.message });
    throw new DatabaseError('Async transaction failed', 'withAsyncTransaction', error);
  }
}

/**
 * Create a savepoint for nested transactions
 *
 * @param {Database} db - Database instance
 * @param {string} name - Savepoint name
 */
export function createSavepoint(db, name) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'createSavepoint');
  }

  if (!name) {
    throw new DatabaseError('Savepoint name is required', 'createSavepoint');
  }

  try {
    db.prepare(`SAVEPOINT ${name}`).run();
    logger.debug('Savepoint created', { name });
  } catch (error) {
    logger.error('Failed to create savepoint', { name, error: error.message });
    throw new DatabaseError('Failed to create savepoint', 'createSavepoint', error);
  }
}

/**
 * Release a savepoint
 *
 * @param {Database} db - Database instance
 * @param {string} name - Savepoint name
 */
export function releaseSavepoint(db, name) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'releaseSavepoint');
  }

  if (!name) {
    throw new DatabaseError('Savepoint name is required', 'releaseSavepoint');
  }

  try {
    db.prepare(`RELEASE SAVEPOINT ${name}`).run();
    logger.debug('Savepoint released', { name });
  } catch (error) {
    logger.error('Failed to release savepoint', { name, error: error.message });
    throw new DatabaseError('Failed to release savepoint', 'releaseSavepoint', error);
  }
}

/**
 * Rollback to a savepoint
 *
 * @param {Database} db - Database instance
 * @param {string} name - Savepoint name
 */
export function rollbackToSavepoint(db, name) {
  if (!db) {
    throw new DatabaseError('Database instance is required', 'rollbackToSavepoint');
  }

  if (!name) {
    throw new DatabaseError('Savepoint name is required', 'rollbackToSavepoint');
  }

  try {
    db.prepare(`ROLLBACK TO SAVEPOINT ${name}`).run();
    logger.debug('Rolled back to savepoint', { name });
  } catch (error) {
    logger.error('Failed to rollback to savepoint', { name, error: error.message });
    throw new DatabaseError('Failed to rollback to savepoint', 'rollbackToSavepoint', error);
  }
}

/**
 * Execute function with savepoint for nested transaction support
 *
 * @param {Database} db - Database instance
 * @param {string} name - Savepoint name
 * @param {Function} fn - Function to execute
 * @returns {*} Result of the function
 *
 * @example
 * withSavepoint(db, 'update_lead', () => {
 *   leadRepo.update(id, data);
 *   stateRepo.update(stateId, stateData);
 * });
 */
export function withSavepoint(db, name, fn) {
  if (!db || !name || !fn) {
    throw new DatabaseError('Database, savepoint name, and function are required', 'withSavepoint');
  }

  try {
    createSavepoint(db, name);

    const result = fn();

    releaseSavepoint(db, name);

    return result;
  } catch (error) {
    logger.warn('Rolling back to savepoint due to error', { name, error: error.message });

    try {
      rollbackToSavepoint(db, name);
    } catch (rollbackError) {
      logger.error('Failed to rollback to savepoint', {
        name,
        error: rollbackError.message
      });
    }

    throw new DatabaseError('Savepoint transaction failed', 'withSavepoint', error);
  }
}

/**
 * Batch insert helper with transaction
 *
 * @param {Database} db - Database instance
 * @param {string} table - Table name
 * @param {Array<Object>} records - Array of records to insert
 * @param {number} batchSize - Number of records per batch (default: 100)
 * @returns {number} Total number of inserted records
 *
 * @example
 * const count = batchInsert(db, 'leads', leadsArray, 50);
 */
export function batchInsert(db, table, records, batchSize = 100) {
  if (!db || !table || !records || !Array.isArray(records)) {
    throw new DatabaseError('Invalid parameters for batch insert', 'batchInsert');
  }

  if (records.length === 0) {
    logger.debug('No records to insert');
    return 0;
  }

  try {
    logger.info('Starting batch insert', {
      table,
      totalRecords: records.length,
      batchSize
    });

    let inserted = 0;

    // Get keys from first record
    const keys = Object.keys(records[0]);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      withTransaction(db, () => {
        for (const record of batch) {
          const values = keys.map(key => record[key]);
          stmt.run(...values);
          inserted++;
        }
      });

      logger.debug('Batch inserted', {
        batch: Math.floor(i / batchSize) + 1,
        inserted,
        total: records.length
      });
    }

    logger.info('Batch insert completed', {
      table,
      inserted,
      totalRecords: records.length
    });

    return inserted;
  } catch (error) {
    logger.error('Batch insert failed', {
      table,
      error: error.message
    });
    throw new DatabaseError('Batch insert failed', 'batchInsert', error);
  }
}

/**
 * Batch update helper with transaction
 *
 * @param {Database} db - Database instance
 * @param {string} table - Table name
 * @param {Array<Object>} updates - Array of {id, data} objects
 * @param {number} batchSize - Number of updates per batch (default: 100)
 * @returns {number} Total number of updated records
 */
export function batchUpdate(db, table, updates, batchSize = 100) {
  if (!db || !table || !updates || !Array.isArray(updates)) {
    throw new DatabaseError('Invalid parameters for batch update', 'batchUpdate');
  }

  if (updates.length === 0) {
    logger.debug('No records to update');
    return 0;
  }

  try {
    logger.info('Starting batch update', {
      table,
      totalUpdates: updates.length,
      batchSize
    });

    let updated = 0;

    // Process in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      withTransaction(db, () => {
        for (const { id, data } of batch) {
          const keys = Object.keys(data);
          const setClause = keys.map(key => `${key} = ?`).join(', ');
          const values = [...Object.values(data), id];

          const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
          const result = db.prepare(sql).run(...values);

          updated += result.changes;
        }
      });

      logger.debug('Batch updated', {
        batch: Math.floor(i / batchSize) + 1,
        updated,
        total: updates.length
      });
    }

    logger.info('Batch update completed', {
      table,
      updated,
      totalUpdates: updates.length
    });

    return updated;
  } catch (error) {
    logger.error('Batch update failed', {
      table,
      error: error.message
    });
    throw new DatabaseError('Batch update failed', 'batchUpdate', error);
  }
}

export default {
  withTransaction,
  withAsyncTransaction,
  createSavepoint,
  releaseSavepoint,
  rollbackToSavepoint,
  withSavepoint,
  batchInsert,
  batchUpdate
};
