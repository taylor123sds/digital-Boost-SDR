-- Migration: Create automations and automation_executions tables
-- Description: Tables for automation engine workflows
-- Created: 2025-11-18

-- Automations table - stores workflow definitions
CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration (JSON)
  -- {type: "schedule"|"event", cron?: "0 9 * * *", event?: "lead_score_changed", target?: "leads"}
  trigger_config TEXT NOT NULL DEFAULT '{}',

  -- Conditions array (JSON)
  -- [{field: "ultimo_contato", operator: "older_than", value: "48h"}]
  conditions TEXT DEFAULT '[]',

  -- Actions array (JSON)
  -- [{type: "send_whatsapp", template: "followup_frio"}, {type: "update_field", field: "followup_count", operation: "increment"}]
  actions TEXT NOT NULL DEFAULT '[]',

  -- Status
  enabled INTEGER DEFAULT 1,

  -- Metadata
  category TEXT, -- quick_win, nurturing, alerts, etc
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_run_at TEXT
);

-- Execution logs
CREATE TABLE IF NOT EXISTS automation_executions (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,

  -- Execution info
  status TEXT NOT NULL, -- success, failed, skipped
  matched_count INTEGER DEFAULT 0,
  results TEXT, -- JSON array of action results

  -- Performance
  duration_ms INTEGER,

  -- Error info
  error TEXT,

  -- Timestamp
  executed_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(enabled);
CREATE INDEX IF NOT EXISTS idx_automations_category ON automations(category);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_date ON automation_executions(executed_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS automations_updated_at
AFTER UPDATE ON automations
BEGIN
  UPDATE automations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update last_run_at on execution
CREATE TRIGGER IF NOT EXISTS automations_last_run
AFTER INSERT ON automation_executions
BEGIN
  UPDATE automations SET last_run_at = NEW.executed_at WHERE id = NEW.automation_id;
END;
