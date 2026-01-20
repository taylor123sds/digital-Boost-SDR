-- Migration 055: Expand agents.type check constraint
-- Adds support for specialist and document_handler types.

BEGIN TRANSACTION;

DROP VIEW IF EXISTS v_integration_webhook_lookup;

ALTER TABLE agents RENAME TO agents_old;

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT DEFAULT 'sdr' CHECK(type IN ('sdr', 'support', 'custom', 'scheduler', 'specialist', 'document_handler')),
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
  persona TEXT DEFAULT '{}',
  prompts TEXT DEFAULT '{}',
  message_templates TEXT DEFAULT '{}',
  behavior TEXT DEFAULT '{}',
  ai_config TEXT DEFAULT '{}',
  integrations TEXT DEFAULT '{}',
  knowledge_base TEXT DEFAULT '{}',
  metrics TEXT DEFAULT '{}',
  last_active_at TEXT DEFAULT NULL,
  UNIQUE(tenant_id, slug)
);

INSERT INTO agents (
  id,
  tenant_id,
  name,
  slug,
  type,
  status,
  channel,
  description,
  config_json,
  system_prompt,
  created_by_user_id,
  messages_processed,
  avg_response_time,
  is_active,
  created_at,
  updated_at,
  persona,
  prompts,
  message_templates,
  behavior,
  ai_config,
  integrations,
  knowledge_base,
  metrics,
  last_active_at
)
SELECT
  id,
  tenant_id,
  name,
  slug,
  type,
  status,
  channel,
  description,
  config_json,
  system_prompt,
  created_by_user_id,
  messages_processed,
  avg_response_time,
  is_active,
  created_at,
  updated_at,
  persona,
  prompts,
  message_templates,
  behavior,
  ai_config,
  integrations,
  knowledge_base,
  metrics,
  last_active_at
FROM agents_old;

CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

DROP TABLE agents_old;

CREATE VIEW IF NOT EXISTS v_integration_webhook_lookup AS
SELECT
  i.id,
  i.tenant_id,
  b.agent_id,
  i.provider,
  i.status,
  i.webhook_public_id,
  i.webhook_secret,
  a.name as agent_name,
  a.status as agent_status
FROM integrations i
LEFT JOIN integration_bindings b ON b.integration_id = i.id AND b.is_primary = 1
LEFT JOIN agents a ON a.id = b.agent_id
WHERE i.status = 'active'
  AND i.webhook_public_id IS NOT NULL;

COMMIT;
