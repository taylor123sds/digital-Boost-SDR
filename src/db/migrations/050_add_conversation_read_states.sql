-- Migration 050: Add conversation read state tracking
-- Stores last_read_at per tenant and phone_number to compute unread counts.

CREATE TABLE IF NOT EXISTS conversation_read_states (
  tenant_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  last_read_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_conversation_read_states_phone
  ON conversation_read_states(phone_number);

CREATE INDEX IF NOT EXISTS idx_conversation_read_states_tenant
  ON conversation_read_states(tenant_id);
