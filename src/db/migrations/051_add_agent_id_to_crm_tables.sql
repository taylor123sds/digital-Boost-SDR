-- Migration 051: Add agent_id to CRM tables for per-agent data isolation
-- Each agent can have its own leads, messages, activities, and opportunities

-- Add agent_id to leads table
ALTER TABLE leads ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);

-- Add agent_id to whatsapp_messages table
ALTER TABLE whatsapp_messages ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_agent_id ON whatsapp_messages(agent_id);

-- Add agent_id to activities table
ALTER TABLE activities ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activities_agent_id ON activities(agent_id);

-- Add agent_id to opportunities table
ALTER TABLE opportunities ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_agent_id ON opportunities(agent_id);

-- Add agent_id to accounts table (optional - companies can be shared)
ALTER TABLE accounts ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_agent_id ON accounts(agent_id);

-- Add agent_id to contacts table
ALTER TABLE contacts ADD COLUMN agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_agent_id ON contacts(agent_id);
