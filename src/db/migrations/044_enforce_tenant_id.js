/**
 * @file 044_enforce_tenant_id.js
 * @description Ensure tenant_id exists and is backfilled for legacy tables.
 */

import { getDatabase } from '../index.js';

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

function backfillColumn(db, tableName, columnName, sourceColumn) {
  if (!tableExists(db, tableName)) return false;
  if (!columnExists(db, tableName, columnName)) return false;
  if (!columnExists(db, tableName, sourceColumn)) return false;
  db.exec(`
    UPDATE ${tableName}
    SET ${columnName} = ${sourceColumn}
    WHERE ${columnName} IS NULL AND ${sourceColumn} IS NOT NULL
  `);
  return true;
}

function ensureIndex(db, indexName, tableName, columns) {
  if (!tableExists(db, tableName)) return false;
  const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnList})`);
  return true;
}

export function up() {
  const db = getDatabase();

  const legacyTables = [
    { table: 'users', sourceColumn: 'team_id', index: 'idx_users_tenant' },
    { table: 'user_teams', sourceColumn: 'team_id', index: 'idx_user_teams_tenant' },
    { table: 'billing_events', sourceColumn: 'team_id', index: 'idx_billing_events_tenant' },
    { table: 'usage_metrics', sourceColumn: 'team_id', index: 'idx_usage_metrics_tenant' },
    { table: 'user_trial_grants', sourceColumn: 'first_team_id', index: 'idx_user_trial_grants_tenant' }
  ];

  for (const { table, sourceColumn, index } of legacyTables) {
    addColumnIfMissing(db, table, 'tenant_id', 'TEXT');
    backfillColumn(db, table, 'tenant_id', sourceColumn);
    ensureIndex(db, index, table, 'tenant_id');
  }

  return true;
}

export function down() {
  // Non-destructive migration: no down migration
  return true;
}

// Execute if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  try {
    up();
    console.log(' Migration 044 executed successfully');
  } catch (error) {
    console.error(' Migration 044 failed:', error);
    process.exit(1);
  }
}

export default { up, down };
