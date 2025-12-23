/**
 * Migration 049: Fix missing billing columns in teams table
 *
 * Migration 028 was recorded but ALTER TABLE statements failed silently
 * (SQLite doesn't allow DEFAULT with expressions in ALTER TABLE).
 * This migration adds the missing billing columns properly.
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

  // SQLite ALTER TABLE doesn't support DEFAULT with expressions like datetime('now')
  // Only add DEFAULT clause for simple literal values
  let defaultClause = '';
  if (defaultValue !== null && typeof defaultValue === 'string' && !defaultValue.includes('(')) {
    defaultClause = ` DEFAULT ${defaultValue}`;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
  console.log(`  Added column ${table}.${column}`);
  return true;
}

export async function up() {
  const db = getDatabase();

  console.log('Migration 049: Adding missing billing columns to teams table...');

  // Billing status
  addColumnIfMissing(db, 'teams', 'billing_status', 'TEXT', "'trial'");

  // Trial tracking (no default - will UPDATE after)
  addColumnIfMissing(db, 'teams', 'trial_started_at', 'TEXT');
  addColumnIfMissing(db, 'teams', 'trial_ends_at', 'TEXT');

  // Paid subscription tracking
  addColumnIfMissing(db, 'teams', 'paid_until', 'TEXT');
  addColumnIfMissing(db, 'teams', 'stripe_customer_id', 'TEXT');
  addColumnIfMissing(db, 'teams', 'stripe_subscription_id', 'TEXT');

  // Plan limits
  addColumnIfMissing(db, 'teams', 'max_agents', 'INTEGER', '1');
  addColumnIfMissing(db, 'teams', 'max_messages_per_month', 'INTEGER', '1000');
  addColumnIfMissing(db, 'teams', 'messages_used_this_month', 'INTEGER', '0');
  addColumnIfMissing(db, 'teams', 'billing_cycle_start', 'TEXT');

  // Set initial values for trial columns (fills NULL values in existing rows)
  console.log('  Setting trial dates for existing teams...');
  db.exec(`
    UPDATE teams
    SET trial_started_at = datetime('now'),
        trial_ends_at = datetime('now', '+7 days')
    WHERE trial_started_at IS NULL
  `);

  console.log('Migration 049: Complete');
}
