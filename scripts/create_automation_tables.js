/**
 * @file create_automation_tables.js
 * @description Creates the automations and automation_executions tables
 */

import Database from 'better-sqlite3';

const db = new Database('./orbion.db');

console.log('Creating automation tables...');

// Create automations table
db.exec(`
  CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_config TEXT NOT NULL,
    conditions TEXT DEFAULT '[]',
    actions TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    category TEXT DEFAULT 'custom',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

console.log('  - automations table created');

// Create automation_executions table
db.exec(`
  CREATE TABLE IF NOT EXISTS automation_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    automation_id TEXT NOT NULL,
    executed_at TEXT DEFAULT (datetime('now')),
    status TEXT NOT NULL,
    matched_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    results TEXT DEFAULT '[]',
    error TEXT,
    FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
  )
`);

console.log('  - automation_executions table created');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(enabled);
  CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON automation_executions(automation_id);
  CREATE INDEX IF NOT EXISTS idx_automation_executions_executed_at ON automation_executions(executed_at);
`);

console.log('  - indexes created');

db.close();

console.log('\nAutomation tables created successfully!');
console.log('Restart the server to load the Automation Engine.');
