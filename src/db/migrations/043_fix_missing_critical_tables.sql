-- ============================================================================
-- Migration 043: Fix Missing Critical Tables
-- ============================================================================
-- Creates tables that may be missing from incomplete migrations
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create sessions table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_valid INTEGER DEFAULT 1,
    expires_at TEXT NOT NULL,
    refresh_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_valid ON sessions(is_valid);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- STEP 2: Create auth_audit_log table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_success', 'login_failed',
        'logout', 'token_refresh',
        'password_changed', 'password_reset_requested',
        'account_locked', 'account_unlocked',
        'session_invalidated'
    )),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at);

-- ============================================================================
-- STEP 3: Create password_reset_tokens table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- ============================================================================
-- STEP 4: Create agents table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT DEFAULT 'sdr' CHECK(type IN ('sdr', 'support', 'custom', 'scheduler')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'offline', 'draft')),
  channel TEXT DEFAULT 'whatsapp' CHECK(channel IN ('whatsapp', 'email', 'chat', 'voice')),
  description TEXT,
  config_json TEXT DEFAULT '{}',
  system_prompt TEXT,
  created_by_user_id TEXT,
  messages_processed INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- ============================================================================
-- STEP 5: Create agent_versions table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_snapshot TEXT,
  compiled_prompt TEXT,
  published_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent_id ON agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_tenant_id ON agent_versions(tenant_id);

-- ============================================================================
-- STEP 6: Create integrations table if missing (ensure all columns exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'evolution',
  instance_name TEXT,
  phone_number TEXT,
  profile_name TEXT,
  status TEXT DEFAULT 'disconnected' CHECK(status IN ('connected', 'disconnected', 'connecting', 'error')),
  config_json TEXT DEFAULT '{}',
  secrets_json TEXT DEFAULT '{}',
  webhook_url TEXT,
  api_key TEXT,
  last_connected_at TEXT,
  error_message TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, provider, instance_name)
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_instance_name ON integrations(instance_name);

-- ============================================================================
-- STEP 7: Create integration_bindings table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_bindings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  capabilities TEXT DEFAULT '[]',
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
  UNIQUE(agent_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_bindings_tenant_id ON integration_bindings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_bindings_agent_id ON integration_bindings(agent_id);
CREATE INDEX IF NOT EXISTS idx_integration_bindings_integration_id ON integration_bindings(integration_id);

-- ============================================================================
-- DONE: All critical tables should now exist
-- ============================================================================
