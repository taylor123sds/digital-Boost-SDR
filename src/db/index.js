/**
 * @file db/index.js
 * @description Central export point for database utilities
 * Wave 2: Database Layer
 */

export {
  DatabaseConnection,
  getDatabaseConnection,
  getDatabase,
  closeDatabase,
  resetDatabaseConnection
} from './connection.js';

export {
  withTransaction,
  withAsyncTransaction,
  createSavepoint,
  releaseSavepoint,
  rollbackToSavepoint,
  withSavepoint,
  batchInsert,
  batchUpdate
} from './transaction.js';

export default {
  connection: './connection.js',
  transaction: './transaction.js'
};
