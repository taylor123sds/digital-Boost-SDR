-- =============================================================================
-- Migration 037: Dedicated webhook_public_id Column
-- =============================================================================
-- P3-10: Coluna dedicada webhook_public_id (ao inves de json_extract)
--
-- PROBLEMA:
-- - json_extract(config_json, '$.webhook_public_id') eh lento
-- - Index em json_extract nao eh tao eficiente quanto coluna nativa
-- - Cada lookup de webhook precisa parse de JSON
--
-- SOLUCAO:
-- - Coluna dedicada webhook_public_id TEXT UNIQUE
-- - Index nativo muito mais rapido
-- - Mantemos sync com config_json via trigger
--
-- BENEFICIOS:
-- - Lookup O(log n) em vez de O(n) com json parse
-- - Validacao UNIQUE no banco
-- - Queries mais simples
-- =============================================================================

-- Add dedicated column (if not exists - SQLite workaround)
-- This will fail silently if column already exists
ALTER TABLE integrations ADD COLUMN webhook_public_id TEXT;

-- Create unique index for fast lookups and uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_webhook_public_id_unique
ON integrations(webhook_public_id)
WHERE webhook_public_id IS NOT NULL;

-- =============================================================================
-- Trigger to sync webhook_public_id with config_json
-- =============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_id_insert;
DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_id_update;

-- Sync on INSERT: extract from config_json if provided
CREATE TRIGGER trg_integrations_sync_webhook_id_insert
AFTER INSERT ON integrations
WHEN json_valid(NEW.config_json) AND json_extract(NEW.config_json, '$.webhook_public_id') IS NOT NULL
BEGIN
    UPDATE integrations
    SET webhook_public_id = json_extract(NEW.config_json, '$.webhook_public_id')
    WHERE id = NEW.id AND webhook_public_id IS NULL;
END;

-- Sync on UPDATE: keep in sync when config_json changes
CREATE TRIGGER trg_integrations_sync_webhook_id_update
AFTER UPDATE OF config_json ON integrations
WHEN json_valid(NEW.config_json)
BEGIN
    UPDATE integrations
    SET webhook_public_id = json_extract(NEW.config_json, '$.webhook_public_id')
    WHERE id = NEW.id;
END;

-- =============================================================================
-- Backfill existing rows
-- =============================================================================
UPDATE integrations
SET webhook_public_id = json_extract(config_json, '$.webhook_public_id')
WHERE json_valid(config_json)
  AND json_extract(config_json, '$.webhook_public_id') IS NOT NULL
  AND webhook_public_id IS NULL;

-- =============================================================================
-- Add webhook_secret column (for P3-11 preparation)
-- =============================================================================
ALTER TABLE integrations ADD COLUMN webhook_secret TEXT;

-- Sync webhook_secret from config_json
UPDATE integrations
SET webhook_secret = json_extract(config_json, '$.webhook_secret')
WHERE json_valid(config_json)
  AND json_extract(config_json, '$.webhook_secret') IS NOT NULL
  AND webhook_secret IS NULL;

-- Trigger for webhook_secret sync
DROP TRIGGER IF EXISTS trg_integrations_sync_webhook_secret;

CREATE TRIGGER trg_integrations_sync_webhook_secret
AFTER INSERT ON integrations
WHEN json_valid(NEW.config_json) AND json_extract(NEW.config_json, '$.webhook_secret') IS NOT NULL
BEGIN
    UPDATE integrations
    SET webhook_secret = json_extract(NEW.config_json, '$.webhook_secret')
    WHERE id = NEW.id AND webhook_secret IS NULL;
END;

-- =============================================================================
-- View for quick integration lookup by webhook_public_id
-- =============================================================================
CREATE VIEW IF NOT EXISTS v_integration_webhook_lookup AS
SELECT
    i.id,
    i.tenant_id,
    i.agent_id,
    i.provider,
    i.status,
    i.webhook_public_id,
    i.webhook_secret,
    a.name as agent_name,
    a.status as agent_status
FROM integrations i
LEFT JOIN agents a ON a.id = i.agent_id
WHERE i.status = 'active'
  AND i.webhook_public_id IS NOT NULL;

-- =============================================================================
-- DONE
-- =============================================================================
