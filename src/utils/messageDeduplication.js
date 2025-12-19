// utils/messageDeduplication.js
//  UNIFIED MESSAGE DEDUPLICATION - Phase 3
// Single source of truth using Evolution API message IDs
//  FIX CRÍTICO: Usar conexão centralizada para evitar corrupção do banco

import { getDatabase } from '../db/index.js';

//  FIX CRÍTICO: Usar getDatabase() dinamicamente em cada função
// ANTES: Capturava referência estática no load do módulo
// DEPOIS: Busca conexão fresh em cada operação

/**
 *  Initialize DEDUPLICATION TABLE
 * Called lazily on first use
 */
let tableInitialized = false;

function initializeTable() {
  if (tableInitialized) return;

  try {
    const db = getDatabase();
    db.exec(`CREATE TABLE IF NOT EXISTS message_deduplication (
      message_id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      message_type TEXT,
      message_hash TEXT
    )`);

    // Create index separately
    db.exec(`CREATE INDEX IF NOT EXISTS idx_received_at ON message_deduplication(received_at)`);

    tableInitialized = true;
    console.log(' [DEDUP] Unified message deduplication initialized');
  } catch (error) {
    console.error(' [DEDUP] Failed to initialize table:', error.message);
  }
}

// Initialize on module load but handle errors gracefully
try {
  initializeTable();
} catch (err) {
  console.error(' [DEDUP] Deferred initialization - will retry on first use');
}

// Configuration
const DEDUP_CONFIG = {
  RETENTION_HOURS: 24,        // Keep records for 24 hours
  CLEANUP_INTERVAL: 3600000,  // Cleanup every hour (1 hour in ms)
  MAX_RECORDS: 100000         // Maximum records before forced cleanup
};

/**
 *  CHECK IF MESSAGE IS DUPLICATE
 * Uses Evolution API message ID as primary key
 *
 * @param {string} messageId - Evolution API message ID (e.g., "3EB0...")
 * @param {string} contactId - Contact identifier (phone number)
 * @param {string} messageType - Type of message (text, audio, image, etc.)
 * @returns {boolean} true if duplicate, false if new
 */
export function isDuplicate(messageId, contactId, messageType = 'text') {
  try {
    initializeTable(); // Ensure table exists

    const db = getDatabase(); //  Get fresh connection
    const stmt = db.prepare(`
      SELECT message_id, received_at
      FROM message_deduplication
      WHERE message_id = ?
    `);

    const existing = stmt.get(messageId);

    if (existing) {
      const ageMinutes = (Date.now() - new Date(existing.received_at).getTime()) / 60000;
      console.log(` [DEDUP] Duplicate detected: ${messageId} (${ageMinutes.toFixed(1)}min ago)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(` [DEDUP] Error checking duplicate:`, error.message);
    // Fail open: If we can't check, allow the message through
    return false;
  }
}

/**
 *  REGISTER MESSAGE
 * Records message ID to prevent future duplicates
 *
 * @param {string} messageId - Evolution API message ID
 * @param {string} contactId - Contact identifier
 * @param {string} messageType - Type of message
 * @param {string} messageHash - Optional hash for monitoring
 * @returns {boolean} true if registered successfully
 */
export function registerMessage(messageId, contactId, messageType = 'text', messageHash = null) {
  try {
    initializeTable(); // Ensure table exists

    const db = getDatabase(); //  Get fresh connection
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO message_deduplication
        (message_id, contact_id, message_type, message_hash)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(messageId, contactId, messageType, messageHash);

    if (result.changes > 0) {
      console.log(` [DEDUP] Registered: ${messageId} from ${contactId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(` [DEDUP] Error registering message:`, error.message);
    return false;
  }
}

/**
 *  MARK MESSAGE AS PROCESSED
 * Updates processed_at timestamp
 *
 * @param {string} messageId - Evolution API message ID
 */
export function markProcessed(messageId) {
  try {
    const db = getDatabase(); //  Get fresh connection
    const stmt = db.prepare(`
      UPDATE message_deduplication
      SET processed_at = datetime('now')
      WHERE message_id = ?
    `);

    stmt.run(messageId);
  } catch (error) {
    console.error(` [DEDUP] Error marking processed:`, error.message);
  }
}

/**
 *  CLEANUP OLD RECORDS
 * Removes records older than RETENTION_HOURS
 *
 * @returns {number} Number of records deleted
 */
export function cleanupOldRecords() {
  try {
    const db = getDatabase(); //  Get fresh connection
    const stmt = db.prepare(`
      DELETE FROM message_deduplication
      WHERE received_at < datetime('now', '-${DEDUP_CONFIG.RETENTION_HOURS} hours')
    `);

    const result = stmt.run();

    if (result.changes > 0) {
      console.log(` [DEDUP] Cleaned up ${result.changes} old records`);
    }

    return result.changes;
  } catch (error) {
    console.error(` [DEDUP] Error during cleanup:`, error.message);
    return 0;
  }
}

/**
 *  FORCE CLEANUP
 * Emergency cleanup when approaching MAX_RECORDS
 */
function forceCleanup() {
  try {
    const db = getDatabase(); //  Get fresh connection
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM message_deduplication');
    const { count } = countStmt.get();

    if (count > DEDUP_CONFIG.MAX_RECORDS) {
      console.warn(` [DEDUP] Approaching max records (${count}/${DEDUP_CONFIG.MAX_RECORDS})`);

      // Delete oldest 25% of records
      const deleteCount = Math.floor(DEDUP_CONFIG.MAX_RECORDS * 0.25);

      const stmt = db.prepare(`
        DELETE FROM message_deduplication
        WHERE message_id IN (
          SELECT message_id
          FROM message_deduplication
          ORDER BY received_at ASC
          LIMIT ?
        )
      `);

      const result = stmt.run(deleteCount);
      console.log(` [DEDUP] Emergency cleanup: deleted ${result.changes} oldest records`);
    }
  } catch (error) {
    console.error(` [DEDUP] Error during force cleanup:`, error.message);
  }
}

/**
 *  GET STATISTICS
 * Returns deduplication statistics
 */
export function getStatistics() {
  try {
    const db = getDatabase(); //  Get fresh connection
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_records,
        COUNT(processed_at) as processed,
        COUNT(*) - COUNT(processed_at) as pending,
        MIN(received_at) as oldest_record,
        MAX(received_at) as newest_record
      FROM message_deduplication
    `).get();

    const byType = db.prepare(`
      SELECT message_type, COUNT(*) as count
      FROM message_deduplication
      GROUP BY message_type
    `).all();

    return {
      ...stats,
      by_type: byType,
      retention_hours: DEDUP_CONFIG.RETENTION_HOURS,
      max_records: DEDUP_CONFIG.MAX_RECORDS
    };
  } catch (error) {
    console.error(` [DEDUP] Error getting statistics:`, error.message);
    return { error: error.message };
  }
}

// Start automatic cleanup with error handling
let cleanupInterval = setInterval(() => {
  try {
    cleanupOldRecords();
    forceCleanup();
  } catch (error) {
    console.error(` [DEDUP] Cleanup interval error (ignored):`, error.message);
  }
}, DEDUP_CONFIG.CLEANUP_INTERVAL);

// Cleanup on shutdown
//  FIX: Não fechar db aqui pois a conexão é gerenciada centralmente
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  // db.close() removido - conexão centralizada gerencia lifecycle
});

process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  // db.close() removido - conexão centralizada gerencia lifecycle
});

export default {
  isDuplicate,
  registerMessage,
  markProcessed,
  cleanupOldRecords,
  getStatistics
};
