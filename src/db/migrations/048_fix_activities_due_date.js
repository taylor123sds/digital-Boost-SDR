/**
 * Migration 048: Fix missing due_date column in activities table
 *
 * Migration 017 had a bug - the SELECT CASE statement doesn't execute ALTER TABLE.
 * This migration properly adds the missing columns.
 */

import { getDatabase } from '../index.js';

function columnExists(db, table, column) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.some(col => col.name === column);
}

function addColumnIfMissing(db, table, column, type, defaultValue = null) {
  if (columnExists(db, table, column)) {
    console.log(`  Column ${table}.${column} already exists, skipping`);
    return false;
  }

  const defaultClause = defaultValue !== null ? ` DEFAULT ${defaultValue}` : '';
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
  console.log(`  Added column ${table}.${column}`);
  return true;
}

export async function up() {
  const db = getDatabase();

  console.log('Migration 048: Fixing activities table schema...');

  // Add missing columns from migration 017
  addColumnIfMissing(db, 'activities', 'due_date', 'TEXT');
  addColumnIfMissing(db, 'activities', 'due_time', 'TEXT');
  addColumnIfMissing(db, 'activities', 'reminder_at', 'TEXT');

  // Create index if not exists
  db.exec('CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date)');

  console.log('Migration 048: Complete');
}
