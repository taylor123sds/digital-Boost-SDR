/**
 * @file 040_add_tenant_to_cadence.js
 * @description Add tenant_id to cadence and pipeline tables
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

function backfillDefault(db, tableName, columnName) {
  if (!tableExists(db, tableName)) return false;
  if (!columnExists(db, tableName, columnName)) return false;
  db.exec(`
    UPDATE ${tableName}
    SET ${columnName} = 'default'
    WHERE ${columnName} IS NULL OR ${columnName} = ''
  `);
  return true;
}

function backfillWithQuery(db, tableName, columnName, query) {
  if (!tableExists(db, tableName)) return false;
  if (!columnExists(db, tableName, columnName)) return false;
  db.exec(`
    UPDATE ${tableName}
    SET ${columnName} = ${query}
    WHERE ${columnName} IS NULL OR ${columnName} = 'default'
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

  // cadences
  addColumnIfMissing(db, 'cadences', 'tenant_id', "TEXT DEFAULT 'default'");
  backfillDefault(db, 'cadences', 'tenant_id');
  ensureIndex(db, 'idx_cadences_tenant', 'cadences', 'tenant_id');

  // cadence_steps
  addColumnIfMissing(db, 'cadence_steps', 'tenant_id', "TEXT DEFAULT 'default'");
  backfillWithQuery(
    db,
    'cadence_steps',
    'tenant_id',
    "(SELECT tenant_id FROM cadences WHERE cadences.id = cadence_steps.cadence_id)"
  );
  ensureIndex(db, 'idx_cadence_steps_tenant', 'cadence_steps', 'tenant_id');

  // cadence_enrollments
  addColumnIfMissing(db, 'cadence_enrollments', 'tenant_id', "TEXT DEFAULT 'default'");
  backfillWithQuery(
    db,
    'cadence_enrollments',
    'tenant_id',
    "(SELECT tenant_id FROM leads WHERE leads.id = cadence_enrollments.lead_id)"
  );
  ensureIndex(db, 'idx_cadence_enrollments_tenant', 'cadence_enrollments', 'tenant_id');

  // cadence_actions_log
  addColumnIfMissing(db, 'cadence_actions_log', 'tenant_id', "TEXT DEFAULT 'default'");
  backfillWithQuery(
    db,
    'cadence_actions_log',
    'tenant_id',
    "(SELECT tenant_id FROM cadence_enrollments WHERE cadence_enrollments.id = cadence_actions_log.enrollment_id)"
  );
  ensureIndex(db, 'idx_cadence_actions_tenant', 'cadence_actions_log', 'tenant_id');

  // pipeline_stages
  addColumnIfMissing(db, 'pipeline_stages', 'tenant_id', "TEXT DEFAULT 'default'");
  backfillDefault(db, 'pipeline_stages', 'tenant_id');
  ensureIndex(db, 'idx_pipeline_stages_tenant', 'pipeline_stages', 'tenant_id');

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
    console.log(' Migration 040 executed successfully');
  } catch (error) {
    console.error(' Migration 040 failed:', error);
    process.exit(1);
  }
}

export default { up, down };
