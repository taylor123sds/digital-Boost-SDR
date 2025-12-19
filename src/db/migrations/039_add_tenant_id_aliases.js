/**
 * @file 039_add_tenant_id_aliases.js
 * @description Add tenant_id aliases for legacy team_id columns
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

function ensureUniqueIndex(db, indexName, tableName, columns) {
  if (!tableExists(db, tableName)) return false;
  const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnList})`);
  return true;
}

export function up() {
  const db = getDatabase();

  // users: tenant_id alias
  addColumnIfMissing(db, 'users', 'tenant_id', 'TEXT');
  backfillColumn(db, 'users', 'tenant_id', 'team_id');
  ensureIndex(db, 'idx_users_tenant', 'users', 'tenant_id');

  // user_teams: tenant_id alias
  addColumnIfMissing(db, 'user_teams', 'tenant_id', 'TEXT');
  backfillColumn(db, 'user_teams', 'tenant_id', 'team_id');
  ensureIndex(db, 'idx_user_teams_tenant', 'user_teams', 'tenant_id');

  // billing_events: tenant_id alias
  addColumnIfMissing(db, 'billing_events', 'tenant_id', 'TEXT');
  backfillColumn(db, 'billing_events', 'tenant_id', 'team_id');
  ensureIndex(db, 'idx_billing_events_tenant', 'billing_events', 'tenant_id');

  // usage_metrics: tenant_id alias
  addColumnIfMissing(db, 'usage_metrics', 'tenant_id', 'TEXT');
  backfillColumn(db, 'usage_metrics', 'tenant_id', 'team_id');
  ensureIndex(db, 'idx_usage_metrics_tenant', 'usage_metrics', 'tenant_id');
  ensureUniqueIndex(db, 'uq_usage_metrics_tenant_period', 'usage_metrics', ['tenant_id', 'metric_type', 'period_start']);

  // user_trial_grants: tenant_id alias
  addColumnIfMissing(db, 'user_trial_grants', 'tenant_id', 'TEXT');
  backfillColumn(db, 'user_trial_grants', 'tenant_id', 'first_team_id');
  ensureIndex(db, 'idx_user_trial_grants_tenant', 'user_trial_grants', 'tenant_id');

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
    console.log(' Migration 039 executed successfully');
  } catch (error) {
    console.error(' Migration 039 failed:', error);
    process.exit(1);
  }
}

export default { up, down };
