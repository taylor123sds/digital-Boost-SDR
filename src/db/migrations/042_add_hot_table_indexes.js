/**
 * @file 042_add_hot_table_indexes.js
 * @description Add composite indexes for hot tables (tenant + time/phone).
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

function ensureIndex(db, indexName, tableName, columns) {
  if (!tableExists(db, tableName)) return false;
  const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnList})`);
  return true;
}

function normalizeColumn(column) {
  return String(column).trim().split(' ')[0];
}

function ensureCompositeIndex(db, indexName, tableName, columns) {
  if (!tableExists(db, tableName)) return false;
  const hasAllColumns = columns.every(col => columnExists(db, tableName, normalizeColumn(col)));
  if (!hasAllColumns) return false;
  return ensureIndex(db, indexName, tableName, columns);
}

export function up() {
  const db = getDatabase();

  // Leads: tenant + created_at / phone
  ensureCompositeIndex(db, 'idx_leads_tenant_created', 'leads', ['tenant_id', 'created_at DESC']);
  ensureCompositeIndex(db, 'idx_leads_tenant_phone', 'leads', ['tenant_id', 'telefone']);
  ensureCompositeIndex(db, 'idx_leads_tenant_whatsapp', 'leads', ['tenant_id', 'whatsapp']);

  // WhatsApp messages: tenant + created_at / phone
  ensureCompositeIndex(db, 'idx_whatsapp_messages_tenant_created', 'whatsapp_messages', ['tenant_id', 'created_at DESC']);
  ensureCompositeIndex(db, 'idx_whatsapp_messages_tenant_phone', 'whatsapp_messages', ['tenant_id', 'phone_number']);

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
    console.log(' Migration 042 executed successfully');
  } catch (error) {
    console.error(' Migration 042 failed:', error);
    process.exit(1);
  }
}

export default { up, down };
