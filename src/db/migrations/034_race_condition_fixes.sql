-- =============================================================================
-- Migration 034: Race Condition Fixes (Indices + WAL Mode)
-- =============================================================================
-- P1-3: Partial unique indices para prevenir race conditions
-- P1-4: Ativar WAL mode por padrão no SQLite
--
-- PROPÓSITO:
-- 1. Prevenir leads duplicados via UNIQUE index
-- 2. Garantir idempotência de mensagens
-- 3. Melhorar performance de escrita com WAL mode
-- 4. Permitir leituras concorrentes durante escrita
-- =============================================================================

-- =============================================================================
-- P1-4: WAL MODE (Write-Ahead Logging)
-- =============================================================================
-- WAL mode permite:
-- - Múltiplos leitores simultâneos
-- - Um escritor enquanto há leitores
-- - Melhor performance em geral
-- - Melhor recuperação de crash
--
-- IMPORTANTE: Este PRAGMA é persistente (armazenado no banco)
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;  -- 5 segundos de espera antes de SQLITE_BUSY
PRAGMA synchronous = NORMAL; -- Balance entre performance e segurança
PRAGMA cache_size = -64000;  -- 64MB de cache
PRAGMA temp_store = MEMORY;  -- Tabelas temporárias em memória

-- =============================================================================
-- P1-3: PARTIAL UNIQUE INDICES
-- =============================================================================
-- Previne race conditions onde dois webhooks chegam quase simultaneamente
-- para o mesmo contato e ambos tentam criar um lead
--
-- ESTRATÉGIA: UNIQUE index + ON CONFLICT IGNORE
-- =============================================================================

-- Índice único para leads por telefone (previne duplicação)
-- Apenas para leads não deletados
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_phone
ON leads(telefone) WHERE telefone IS NOT NULL AND deleted_at IS NULL;

-- Índice único para leads por whatsapp (alternativo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_whatsapp
ON leads(whatsapp) WHERE whatsapp IS NOT NULL AND deleted_at IS NULL;

-- Índice único para mensagens por provider_message_id (previne duplicação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_provider_id
ON whatsapp_messages(provider_message_id)
WHERE provider_message_id IS NOT NULL;

-- Índice único para eventos por provider_event_id (idempotência)
-- Já criado na migration 031, mas garantir que existe
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_unique_provider
ON inbound_events(provider, provider_event_id)
WHERE provider_event_id IS NOT NULL;

-- =============================================================================
-- Índices de performance adicionais
-- =============================================================================

-- Índice para buscar leads por status de cadência
CREATE INDEX IF NOT EXISTS idx_leads_cadence_status
ON leads(cadence_status, stage_id)
WHERE cadence_status IS NOT NULL;

-- Índice para buscar mensagens recentes por contato
CREATE INDEX IF NOT EXISTS idx_messages_recent_by_contact
ON whatsapp_messages(phone_number, created_at DESC);

-- Índice para buscar jobs por contato em processamento
CREATE INDEX IF NOT EXISTS idx_jobs_contact_processing
ON async_jobs(contact_id)
WHERE status = 'processing' AND contact_id IS NOT NULL;

-- =============================================================================
-- Comentários sobre uso de ON CONFLICT:
-- =============================================================================
--
-- INSERT com idempotência (leads):
-- INSERT INTO leads (telefone, empresa, ...) VALUES (?, ?, ...)
-- ON CONFLICT(telefone) DO UPDATE SET updated_at = datetime('now');
--
-- INSERT com idempotência (mensagens):
-- INSERT INTO whatsapp_messages (phone_number, message_text, provider_message_id, ...)
-- VALUES (?, ?, ?, ...)
-- ON CONFLICT(provider_message_id) DO NOTHING;
--
-- INSERT com idempotência (inbound_events):
-- INSERT INTO inbound_events (id, provider, provider_event_id, ...)
-- VALUES (?, ?, ?, ...)
-- ON CONFLICT(provider, provider_event_id) DO UPDATE SET updated_at = datetime('now');
-- =============================================================================
