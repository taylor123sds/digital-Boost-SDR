-- =============================================================================
-- Migration 031: Inbound Events (Webhook Staging Table)
-- =============================================================================
-- P0-2: Tabela de staging para webhooks - permite idempotência e retry
--
-- PROPÓSITO:
-- 1. Persistir webhook ANTES de processar (fail-safe)
-- 2. Permitir retry de eventos que falharam
-- 3. Rastreabilidade completa de todos os webhooks recebidos
-- 4. Idempotência via UNIQUE(provider, provider_event_id)
--
-- FLUXO:
-- 1. Webhook chega -> INSERT em inbound_events (status='pending')
-- 2. Processamento -> UPDATE status='processing'
-- 3. Sucesso -> UPDATE status='processed', processed_at=NOW
-- 4. Erro -> UPDATE status='error', error_message=..., retry_count++
-- 5. Job de retry -> SELECT WHERE status='error' AND retry_count < max
-- =============================================================================

-- Tabela de eventos de entrada (webhooks)
CREATE TABLE IF NOT EXISTS inbound_events (
    id TEXT PRIMARY KEY,                              -- UUID gerado pelo sistema
    tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
    provider TEXT NOT NULL,                           -- 'evolution', 'meta', 'typebot', etc.
    provider_event_id TEXT,                           -- ID original do provider (para idempotência)
    event_type TEXT NOT NULL,                         -- 'messages.upsert', 'messages.update', etc.
    contact_phone TEXT,                               -- Número do contato (normalizado)
    payload_json TEXT NOT NULL,                       -- Payload completo do webhook (JSON)
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'processed', 'error', 'skipped')),
    error_message TEXT,                               -- Mensagem de erro (se houver)
    error_stack TEXT,                                 -- Stack trace (para debugging)
    retry_count INTEGER DEFAULT 0,                    -- Número de tentativas
    max_retries INTEGER DEFAULT 3,                    -- Máximo de retries permitido
    next_retry_at TEXT,                               -- Próxima tentativa (para backoff)
    processing_started_at TEXT,                       -- Início do processamento (para timeout detection)
    created_at TEXT DEFAULT (datetime('now')),        -- Quando o webhook chegou
    processed_at TEXT,                                -- Quando foi processado com sucesso
    updated_at TEXT DEFAULT (datetime('now'))         -- Última atualização
);

-- Índice para idempotência (previne processar mesmo webhook 2x)
-- ON CONFLICT (provider, provider_event_id) DO UPDATE SET updated_at = datetime('now')
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_idempotency
ON inbound_events(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;

-- Índice para buscar eventos pendentes/erro para retry
CREATE INDEX IF NOT EXISTS idx_inbound_events_status
ON inbound_events(status) WHERE status IN ('pending', 'error');

-- Índice para buscar por tenant
CREATE INDEX IF NOT EXISTS idx_inbound_events_tenant
ON inbound_events(tenant_id, created_at DESC);

-- Índice para buscar por contato (histórico de webhooks do lead)
CREATE INDEX IF NOT EXISTS idx_inbound_events_contact
ON inbound_events(contact_phone, created_at DESC) WHERE contact_phone IS NOT NULL;

-- Índice para timeout detection (processing que travou)
CREATE INDEX IF NOT EXISTS idx_inbound_events_processing_timeout
ON inbound_events(processing_started_at) WHERE status = 'processing';

-- Índice para next_retry_at (job de retry)
CREATE INDEX IF NOT EXISTS idx_inbound_events_retry
ON inbound_events(next_retry_at) WHERE status = 'error' AND next_retry_at IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS trg_inbound_events_updated_at
AFTER UPDATE ON inbound_events
FOR EACH ROW
BEGIN
    UPDATE inbound_events SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- =============================================================================
-- Comentários sobre uso:
-- =============================================================================
--
-- INSERT (novo webhook):
-- INSERT INTO inbound_events (id, provider, provider_event_id, event_type, contact_phone, payload_json)
-- VALUES (?, 'evolution', ?, 'messages.upsert', ?, ?)
-- ON CONFLICT(provider, provider_event_id) DO UPDATE SET updated_at = datetime('now');
--
-- UPDATE (iniciando processamento):
-- UPDATE inbound_events SET status = 'processing', processing_started_at = datetime('now') WHERE id = ?;
--
-- UPDATE (sucesso):
-- UPDATE inbound_events SET status = 'processed', processed_at = datetime('now') WHERE id = ?;
--
-- UPDATE (erro):
-- UPDATE inbound_events SET
--   status = 'error',
--   error_message = ?,
--   error_stack = ?,
--   retry_count = retry_count + 1,
--   next_retry_at = datetime('now', '+' || (retry_count * 5) || ' minutes')
-- WHERE id = ?;
--
-- SELECT (job de retry):
-- SELECT * FROM inbound_events
-- WHERE status = 'error' AND retry_count < max_retries AND next_retry_at <= datetime('now')
-- ORDER BY created_at ASC LIMIT 10;
--
-- SELECT (timeout detection - processing > 5 min):
-- SELECT * FROM inbound_events
-- WHERE status = 'processing' AND processing_started_at < datetime('now', '-5 minutes');
-- =============================================================================
