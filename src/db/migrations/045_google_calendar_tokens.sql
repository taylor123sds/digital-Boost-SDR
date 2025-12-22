-- =============================================================================
-- Migration 045: Google Calendar OAuth tokens per tenant
-- =============================================================================
-- Stores encrypted OAuth tokens scoped by tenant/provider/integration/account.
-- =============================================================================

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  integration_id TEXT NOT NULL DEFAULT '',
  account_email TEXT DEFAULT NULL,
  tokens_encrypted TEXT NOT NULL,
  token_expires_at TEXT,
  token_scopes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_tokens_unique
ON google_calendar_tokens(tenant_id, provider, integration_id, account_email);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_tenant
ON google_calendar_tokens(tenant_id, provider, updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_google_calendar_tokens_updated_at
AFTER UPDATE ON google_calendar_tokens
FOR EACH ROW
BEGIN
  UPDATE google_calendar_tokens SET updated_at = datetime('now') WHERE id = NEW.id;
END;
