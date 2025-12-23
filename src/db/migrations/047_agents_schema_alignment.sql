-- Migration 047: Align agents table schema with agent.repository.js
-- Adds missing columns expected by the code

-- Add persona column (JSON object for agent personality config)
ALTER TABLE agents ADD COLUMN persona TEXT DEFAULT '{}';

-- Add prompts column (JSON object for custom prompts)
ALTER TABLE agents ADD COLUMN prompts TEXT DEFAULT '{}';

-- Add message_templates column (JSON object for message templates)
ALTER TABLE agents ADD COLUMN message_templates TEXT DEFAULT '{}';

-- Add behavior column (JSON object for behavior settings)
ALTER TABLE agents ADD COLUMN behavior TEXT DEFAULT '{}';

-- Add ai_config column (JSON object for AI configuration)
ALTER TABLE agents ADD COLUMN ai_config TEXT DEFAULT '{}';

-- Add integrations column (JSON object for integrations config)
ALTER TABLE agents ADD COLUMN integrations TEXT DEFAULT '{}';

-- Add knowledge_base column (JSON object for RAG/KB config)
ALTER TABLE agents ADD COLUMN knowledge_base TEXT DEFAULT '{}';

-- Add metrics column (JSON object for agent metrics)
ALTER TABLE agents ADD COLUMN metrics TEXT DEFAULT '{}';

-- Add last_active_at column (timestamp of last activity)
ALTER TABLE agents ADD COLUMN last_active_at TEXT DEFAULT NULL;
