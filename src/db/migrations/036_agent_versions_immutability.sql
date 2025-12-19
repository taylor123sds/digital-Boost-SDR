-- =============================================================================
-- Migration 036: Agent Versions Immutability Trigger
-- =============================================================================
-- P3-7: Garantir que agent_versions são imutáveis após criação
--
-- PROPÓSITO:
-- 1. Versões de agentes são imutáveis (append-only)
-- 2. Impede UPDATE em colunas críticas
-- 3. Permite atualizar apenas metadata não-crítica
-- 4. Mantém auditoria completa de prompts
--
-- COLUNAS PROTEGIDAS:
-- - agent_id (qual agente)
-- - version_number (número da versão)
-- - system_prompt (prompt completo)
-- - model_name (modelo usado)
-- - temperature (temperatura)
-- - compiled_prompt_hash (hash do prompt compilado)
-- =============================================================================

-- Create agent_versions table if not exists
CREATE TABLE IF NOT EXISTS agent_versions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,

    -- Prompt and model configuration (IMMUTABLE after creation)
    system_prompt TEXT NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,

    -- Compiled prompt cache
    compiled_prompt TEXT,
    compiled_prompt_hash TEXT,

    -- Metadata (can be updated)
    description TEXT,
    change_notes TEXT,
    is_active INTEGER DEFAULT 0,

    -- Audit
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    -- Foreign key
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(agent_id, version_number)
);

-- Index for finding active version
CREATE INDEX IF NOT EXISTS idx_agent_versions_active
ON agent_versions(agent_id, is_active)
WHERE is_active = 1;

-- Index for version ordering
CREATE INDEX IF NOT EXISTS idx_agent_versions_order
ON agent_versions(agent_id, version_number DESC);

-- =============================================================================
-- P3-7: IMMUTABILITY TRIGGER
-- Prevents updates to critical columns after creation
-- =============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_agent_versions_immutable;

-- Create immutability trigger
CREATE TRIGGER trg_agent_versions_immutable
BEFORE UPDATE ON agent_versions
FOR EACH ROW
WHEN (
    OLD.system_prompt != NEW.system_prompt OR
    OLD.model_name != NEW.model_name OR
    OLD.temperature != NEW.temperature OR
    OLD.max_tokens != NEW.max_tokens OR
    OLD.agent_id != NEW.agent_id OR
    OLD.version_number != NEW.version_number OR
    (OLD.compiled_prompt_hash IS NOT NULL AND OLD.compiled_prompt_hash != NEW.compiled_prompt_hash)
)
BEGIN
    SELECT RAISE(ABORT, 'agent_versions are immutable: cannot modify system_prompt, model_name, temperature, max_tokens, agent_id, or version_number after creation');
END;

-- =============================================================================
-- View for latest version per agent
-- =============================================================================
CREATE VIEW IF NOT EXISTS v_agent_latest_versions AS
SELECT
    av.*,
    a.name as agent_name
FROM agent_versions av
INNER JOIN agents a ON a.id = av.agent_id
WHERE av.version_number = (
    SELECT MAX(version_number)
    FROM agent_versions
    WHERE agent_id = av.agent_id
);

-- =============================================================================
-- Helper: Get active version for an agent
-- =============================================================================
-- Usage: SELECT * FROM agent_versions WHERE agent_id = ? AND is_active = 1

-- =============================================================================
-- P3-9: Add agent_version_id to conversations (for version binding)
-- =============================================================================
-- Note: This is done here as it's related to agent versioning

-- Add column if not exists (SQLite way)
-- First check if column exists by trying to select it
-- This is a safe way to add column in SQLite

-- We'll handle this in application code since SQLite doesn't have IF NOT EXISTS for columns
-- The application will check: PRAGMA table_info(conversations) and add if needed
