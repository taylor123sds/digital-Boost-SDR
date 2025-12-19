-- ============================================================================
-- Migration 025: Multi-Tenancy Support
-- ============================================================================
-- Adds tenant_id column to main tables for data isolation
-- Creates agents and integrations tables for per-tenant configuration
-- ============================================================================

-- ============================================================================
-- STEP 1: Add tenant_id to existing tables
-- ============================================================================

-- Add tenant_id to leads table
ALTER TABLE leads ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);

-- Add tenant_id to accounts table
ALTER TABLE accounts ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);

-- Add tenant_id to contacts table
ALTER TABLE contacts ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);

-- Add tenant_id to opportunities table
ALTER TABLE opportunities ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);

-- Add tenant_id to activities table
ALTER TABLE activities ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);

-- Add tenant_id to whatsapp_messages table
ALTER TABLE whatsapp_messages ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);

-- Add tenant_id to pipelines table
ALTER TABLE pipelines ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);

-- ============================================================================
-- STEP 2: Create agents table
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
-- STEP 3: Create agent_versions table (for prompt versioning)
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
-- STEP 4: Create integrations table (for Evolution API per tenant)
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
-- STEP 5: Create integration_bindings table (connect agents to integrations)
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
-- STEP 6: Backfill existing data with default tenant
-- ============================================================================

-- Backfill leads
UPDATE leads SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill accounts
UPDATE accounts SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill contacts
UPDATE contacts SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill opportunities
UPDATE opportunities SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill activities
UPDATE activities SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill whatsapp_messages
UPDATE whatsapp_messages SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Backfill pipelines
UPDATE pipelines SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- ============================================================================
-- STEP 7: Create default integration for existing Evolution API instance
-- ============================================================================

INSERT OR IGNORE INTO integrations (id, tenant_id, provider, instance_name, status, is_active)
VALUES ('int_default_evolution', 'default', 'evolution', 'digitalboost', 'connected', 1);

-- ============================================================================
-- STEP 8: Create default agent for existing setup
-- ============================================================================

INSERT OR IGNORE INTO agents (id, tenant_id, name, slug, type, status, description, created_by_user_id)
VALUES (
  'agent_default_sdr',
  'default',
  'Agente Orbion SDR',
  'orbion-sdr',
  'sdr',
  'active',
  'Agente SDR padrao do sistema ORBION',
  NULL
);

-- Bind default agent to default integration
INSERT OR IGNORE INTO integration_bindings (id, tenant_id, agent_id, integration_id, is_primary)
VALUES ('bind_default', 'default', 'agent_default_sdr', 'int_default_evolution', 1);

-- ============================================================================
-- DONE
-- ============================================================================
