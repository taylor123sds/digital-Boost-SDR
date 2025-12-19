-- ============================================================================
-- Migration 025: Multi-Tenancy Support (Simplified for VPS)
-- ============================================================================
-- Only adds tenant_id to tables that don't have it
-- Does NOT modify existing agents table (already has tenant_id)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add tenant_id to whatsapp_messages if missing
-- ============================================================================
-- SQLite doesn't support IF NOT EXISTS for columns, using PRAGMA to check
-- This will silently fail if column already exists

ALTER TABLE whatsapp_messages ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);

-- ============================================================================
-- STEP 2: Backfill existing data with default tenant
-- Only update tables that have tenant_id column
-- ============================================================================

UPDATE whatsapp_messages SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE agents SET tenant_id = 'default' WHERE tenant_id IS NULL;
-- Note: leads table is single-tenant by design, no tenant_id column

-- ============================================================================
-- STEP 3: Ensure integrations table exists with correct schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
-- STEP 4: Create default integration for existing Evolution API instance
-- ============================================================================

INSERT OR IGNORE INTO integrations (id, tenant_id, provider, instance_name, status, is_active)
VALUES ('int_default_evolution', 'default', 'evolution', 'digitalboost', 'connected', 1);

-- ============================================================================
-- DONE
-- ============================================================================
