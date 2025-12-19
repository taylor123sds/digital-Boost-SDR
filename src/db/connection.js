/**
 * @file db/connection.js
 * @description Database connection manager with health checks and lifecycle management
 * Wave 2: Database Layer - Connection Manager
 */

import Database from 'better-sqlite3';
import { DatabaseError } from '../utils/errors/index.js';
import config from '../config/index.js';
import { createLogger } from '../utils/logger.enhanced.js';

const logger = createLogger({ module: 'DatabaseConnection' });

/**
 * Database connection manager
 * Provides singleton connection with health checks and lifecycle management
 */
export class DatabaseConnection {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  /**
   * Connect to the database
   * @returns {Database} Database instance
   */
  connect() {
    //  FIX CRÍTICO: Verificar se a conexão está REALMENTE aberta
    // better-sqlite3 tem propriedade .open que indica se está aberta
    if (this.db && this.isConnected && this.db.open) {
      logger.debug('Using existing database connection');
      return this.db;
    }

    // Se a conexão foi fechada externamente, resetar estado
    if (this.db && !this.db.open) {
      logger.warn('Database connection was closed externally, reconnecting...');
      this.db = null;
      this.isConnected = false;
    }

    try {
      const dbPath = config.database.path;
      logger.info('Connecting to database', { path: dbPath });

      this.db = new Database(dbPath);

      // Configure database
      this.configure();

      // Verify connection
      this.healthCheck();

      this.isConnected = true;
      this.connectionAttempts = 0;

      logger.info('Database connection established', {
        path: dbPath,
        wal: config.database.enableWAL
      });

      return this.db;
    } catch (error) {
      this.connectionAttempts++;
      logger.error('Database connection failed', {
        attempt: this.connectionAttempts,
        error: error.message
      });

      if (this.connectionAttempts >= this.maxRetries) {
        throw new DatabaseError(
          'Failed to connect to database after maximum retries',
          'connect',
          error
        );
      }

      throw new DatabaseError('Database connection failed', 'connect', error);
    }
  }

  /**
   * Configure database settings
   */
  configure() {
    try {
      // Enable WAL mode for better concurrency
      if (config.database.enableWAL) {
        this.db.pragma('journal_mode = WAL');
        logger.debug('WAL mode enabled');
      }

      // Set busy timeout
      const timeout = config.database.timeout || 5000;
      this.db.pragma(`busy_timeout = ${timeout}`);
      logger.debug('Busy timeout set', { timeout });

      // Additional performance optimizations
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -64000'); // 64MB cache
      this.db.pragma('temp_store = MEMORY');

      // Create performance indexes
      this.createIndexes();

      logger.debug('Database configuration applied');
    } catch (error) {
      logger.error('Database configuration failed', { error: error.message });
      throw new DatabaseError('Failed to configure database', 'configure', error);
    }
  }

  /**
   * Create performance indexes for common queries
   */
  createIndexes() {
    try {
      const indexes = [
        // Leads table indexes
        'CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp)',
        'CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone)',
        'CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id)',
        'CREATE INDEX IF NOT EXISTS idx_leads_cadence_status ON leads(cadence_status)',
        'CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at)',
        'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)',

        // WhatsApp messages indexes
        'CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number)',
        'CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at)',

        // Lead states index
        'CREATE INDEX IF NOT EXISTS idx_lead_states_phone ON lead_states(phone_number)',

        // Cadence enrollments indexes
        'CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_lead ON cadence_enrollments(lead_id)',
        'CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_status ON cadence_enrollments(status)',

        // Memory table index (for context retrieval)
        'CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key)',

        // Meetings index
        'CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at)'
      ];

      for (const indexSql of indexes) {
        try {
          this.db.prepare(indexSql).run();
        } catch {
          // Ignore errors for tables that might not exist yet
        }
      }

      logger.debug('Performance indexes created/verified');
    } catch (error) {
      // Non-fatal: log but don't throw
      logger.warn('Some indexes could not be created', { error: error.message });
    }
  }

  /**
   * Perform health check on database connection
   * @returns {boolean} True if healthy
   */
  healthCheck() {
    try {
      const result = this.db.prepare('SELECT 1 as health').get();

      if (result && result.health === 1) {
        logger.debug('Database health check passed');
        return true;
      }

      throw new Error('Health check returned unexpected result');
    } catch (error) {
      this.isConnected = false;
      logger.error('Database health check failed', { error: error.message });
      throw new DatabaseError('Database health check failed', 'healthCheck', error);
    }
  }

  /**
   * Get database instance
   * Creates connection if not exists
   * @returns {Database} Database instance
   */
  getConnection() {
    //  FIX: Verificar se a conexão está realmente aberta
    // better-sqlite3 tem propriedade .open que indica se está aberta
    if (!this.db || !this.isConnected || !this.db.open) {
      logger.debug('Connection needs to be established', {
        hasDb: !!this.db,
        isConnected: this.isConnected,
        isOpen: this.db ? this.db.open : false
      });
      return this.connect();
    }

    return this.db;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      try {
        logger.info('Closing database connection');
        this.db.close();
        this.db = null;
        this.isConnected = false;
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', { error: error.message });
        throw new DatabaseError('Failed to close database connection', 'close', error);
      }
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasConnection: !!this.db,
      path: config.database.path,
      attempts: this.connectionAttempts,
      healthy: this.isConnected ? this.healthCheck() : false
    };
  }

  /**
   * Execute a transaction
   * @param {Function} fn - Function to execute in transaction
   * @returns {*} Result of transaction function
   */
  transaction(fn) {
    const db = this.getConnection();

    try {
      const transaction = db.transaction(fn);
      const result = transaction();

      logger.debug('Transaction executed successfully');
      return result;
    } catch (error) {
      logger.error('Transaction failed', { error: error.message });
      throw new DatabaseError('Transaction execution failed', 'transaction', error);
    }
  }

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
  getStatistics() {
    try {
      const db = this.getConnection();

      const pageCount = db.pragma('page_count', { simple: true });
      const pageSize = db.pragma('page_size', { simple: true });
      const cacheSize = db.pragma('cache_size', { simple: true });
      const journalMode = db.pragma('journal_mode', { simple: true });

      const stats = {
        pageCount,
        pageSize,
        cacheSize,
        journalMode,
        databaseSize: pageCount * pageSize,
        path: config.database.path
      };

      logger.debug('Database statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get database statistics', { error: error.message });
      throw new DatabaseError('Failed to get statistics', 'getStatistics', error);
    }
  }

  /**
   * Optimize database (vacuum and analyze)
   */
  optimize() {
    try {
      const db = this.getConnection();

      logger.info('Optimizing database...');

      // Analyze tables for query optimization
      db.prepare('ANALYZE').run();

      // Optional: VACUUM to reclaim space (can be slow on large databases)
      // db.prepare('VACUUM').run();

      logger.info('Database optimization complete');
    } catch (error) {
      logger.error('Database optimization failed', { error: error.message });
      throw new DatabaseError('Failed to optimize database', 'optimize', error);
    }
  }

  /**
   * Create a checkpoint (useful with WAL mode)
   * Forces WAL file to be checkpointed back into the database
   */
  checkpoint() {
    try {
      const db = this.getConnection();

      logger.info('Creating database checkpoint...');

      const result = db.pragma('wal_checkpoint(TRUNCATE)');

      logger.info('Database checkpoint created', { result });
      return result;
    } catch (error) {
      logger.error('Database checkpoint failed', { error: error.message });
      throw new DatabaseError('Failed to create checkpoint', 'checkpoint', error);
    }
  }
}

/**
 * Singleton instance
 */
let instance = null;

/**
 * Get database connection instance (singleton)
 * @returns {DatabaseConnection} Database connection manager
 */
export function getDatabaseConnection() {
  if (!instance) {
    instance = new DatabaseConnection();
  }
  return instance;
}

/**
 * Get database instance directly (for convenience)
 * Always verifies connection is open before returning
 * @returns {Database} Database instance
 */
export function getDatabase() {
  const connection = getDatabaseConnection();

  // Always verify and reconnect if needed
  if (connection.db && !connection.db.open) {
    logger.warn('getDatabase: Connection closed, forcing reconnection');
    connection.db = null;
    connection.isConnected = false;
  }

  return connection.getConnection();
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

/**
 * Reset database connection (for testing)
 */
export function resetDatabaseConnection() {
  closeDatabase();
  instance = null;
}

export default {
  getDatabaseConnection,
  getDatabase,
  closeDatabase,
  resetDatabaseConnection
};
