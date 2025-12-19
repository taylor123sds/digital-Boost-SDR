/**
 * @file 040_add_tenant_id_learning_tables.js
 * @description Add tenant_id to learning/analytics tables if missing.
 */

import { getDatabase } from '../index.js';
import { DEFAULT_TENANT_ID } from '../../utils/tenantCompat.js';

function tableExists(db, tableName) {
  return !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
}

function columnExists(db, tableName, columnName) {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return info.some(col => col.name === columnName);
}

function addColumnIfMissing(db, tableName, columnName, columnType) {
  if (!tableExists(db, tableName)) return false;
  if (columnExists(db, tableName, columnName)) return false;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  return true;
}

function ensureIndex(db, indexName, tableName, columns) {
  if (!tableExists(db, tableName)) return false;
  const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnList})`);
  return true;
}

function backfillDefault(db, tableName, columnName, defaultValue) {
  if (!tableExists(db, tableName)) return false;
  if (!columnExists(db, tableName, columnName)) return false;
  db.prepare(`
    UPDATE ${tableName}
    SET ${columnName} = ?
    WHERE ${columnName} IS NULL
  `).run(defaultValue);
  return true;
}

export function up() {
  const db = getDatabase();

  // Meetings (used by command-center and ai-insights)
  addColumnIfMissing(db, 'meetings', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_meetings_tenant', 'meetings', 'tenant_id');
  backfillDefault(db, 'meetings', 'tenant_id', DEFAULT_TENANT_ID);

  // Feedback loop tables
  addColumnIfMissing(db, 'conversation_outcomes', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_conversation_outcomes_tenant', 'conversation_outcomes', 'tenant_id');
  backfillDefault(db, 'conversation_outcomes', 'tenant_id', DEFAULT_TENANT_ID);

  addColumnIfMissing(db, 'abandonment_patterns', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_abandonment_patterns_tenant', 'abandonment_patterns', 'tenant_id');
  backfillDefault(db, 'abandonment_patterns', 'tenant_id', DEFAULT_TENANT_ID);

  // Sentiment and experiments
  addColumnIfMissing(db, 'sentiment_momentum', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_sentiment_momentum_tenant', 'sentiment_momentum', 'tenant_id');
  backfillDefault(db, 'sentiment_momentum', 'tenant_id', DEFAULT_TENANT_ID);

  addColumnIfMissing(db, 'ab_experiments', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_ab_experiments_tenant', 'ab_experiments', 'tenant_id');
  backfillDefault(db, 'ab_experiments', 'tenant_id', DEFAULT_TENANT_ID);

  // Optional: message sentiment
  addColumnIfMissing(db, 'message_sentiment', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_message_sentiment_tenant', 'message_sentiment', 'tenant_id');
  backfillDefault(db, 'message_sentiment', 'tenant_id', DEFAULT_TENANT_ID);

  // Conversation activity
  addColumnIfMissing(db, 'conversation_activity', 'tenant_id', `TEXT DEFAULT '${DEFAULT_TENANT_ID}'`);
  ensureIndex(db, 'idx_conversation_activity_tenant', 'conversation_activity', 'tenant_id');
  backfillDefault(db, 'conversation_activity', 'tenant_id', DEFAULT_TENANT_ID);

  return true;
}

export function down() {
  // Non-destructive migration: no down migration
  return true;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    up();
    console.log(' Migration 040 executed successfully');
  } catch (error) {
    console.error(' Migration 040 failed:', error);
    process.exit(1);
  }
}

export default { up, down };
