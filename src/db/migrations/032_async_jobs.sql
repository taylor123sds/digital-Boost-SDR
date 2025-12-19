-- =============================================================================
-- Migration 032: Async Jobs (Persistent Job Queue)
-- =============================================================================
-- P0-3: Fila persistente de jobs assíncronos
--
-- PROPÓSITO:
-- 1. Substituir filas em memória (MessageQueue, ContactLockManager)
-- 2. Sobreviver a restart do processo
-- 3. Permitir processamento distribuído (múltiplas instâncias)
-- 4. Rastreabilidade de todos os jobs
-- 5. Retry automático com backoff exponencial
--
-- TIPOS DE JOBS:
-- - 'message_process': Processar mensagem de entrada
-- - 'message_send': Enviar mensagem de saída
-- - 'cadence_step': Executar step de cadência
-- - 'lead_sync': Sincronizar lead com Sheets
-- - 'webhook_retry': Reprocessar webhook que falhou
-- =============================================================================

-- Tabela de jobs assíncronos
CREATE TABLE IF NOT EXISTS async_jobs (
    id TEXT PRIMARY KEY,                              -- UUID do job
    tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
    job_type TEXT NOT NULL,                           -- 'message_process', 'message_send', etc.
    priority INTEGER DEFAULT 0,                       -- 0=normal, 1=high, -1=low
    contact_id TEXT,                                  -- Telefone do contato (para lock)
    payload_json TEXT NOT NULL,                       -- Dados do job (JSON)
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result_json TEXT,                                 -- Resultado do processamento (JSON)
    error_message TEXT,                               -- Mensagem de erro (se houver)
    error_stack TEXT,                                 -- Stack trace (para debugging)
    retry_count INTEGER DEFAULT 0,                    -- Número de tentativas
    max_retries INTEGER DEFAULT 3,                    -- Máximo de retries permitido
    timeout_seconds INTEGER DEFAULT 60,               -- Timeout do job em segundos
    next_retry_at TEXT,                               -- Próxima tentativa (para backoff)
    locked_by TEXT,                                   -- ID do worker que está processando
    locked_at TEXT,                                   -- Quando foi locked
    scheduled_for TEXT DEFAULT (datetime('now')),     -- Quando deve executar (para scheduling)
    started_at TEXT,                                  -- Início do processamento
    completed_at TEXT,                                -- Fim do processamento
    created_at TEXT DEFAULT (datetime('now')),        -- Quando foi criado
    updated_at TEXT DEFAULT (datetime('now'))         -- Última atualização
);

-- Índice para buscar próximo job a processar (FIFO por prioridade)
CREATE INDEX IF NOT EXISTS idx_async_jobs_pending
ON async_jobs(priority DESC, scheduled_for ASC)
WHERE status = 'pending' AND scheduled_for <= datetime('now');

-- Índice para lock por contato (evita processar 2 jobs do mesmo contato em paralelo)
CREATE INDEX IF NOT EXISTS idx_async_jobs_contact_lock
ON async_jobs(contact_id, status)
WHERE status IN ('pending', 'processing') AND contact_id IS NOT NULL;

-- Índice para retry jobs
CREATE INDEX IF NOT EXISTS idx_async_jobs_retry
ON async_jobs(next_retry_at)
WHERE status = 'failed' AND retry_count < max_retries AND next_retry_at IS NOT NULL;

-- Índice para timeout detection
CREATE INDEX IF NOT EXISTS idx_async_jobs_timeout
ON async_jobs(locked_at)
WHERE status = 'processing';

-- Índice para buscar por tenant
CREATE INDEX IF NOT EXISTS idx_async_jobs_tenant
ON async_jobs(tenant_id, created_at DESC);

-- Índice para buscar por tipo de job
CREATE INDEX IF NOT EXISTS idx_async_jobs_type
ON async_jobs(job_type, status);

-- Índice para buscar jobs de um contato específico
CREATE INDEX IF NOT EXISTS idx_async_jobs_contact_history
ON async_jobs(contact_id, created_at DESC)
WHERE contact_id IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS trg_async_jobs_updated_at
AFTER UPDATE ON async_jobs
FOR EACH ROW
BEGIN
    UPDATE async_jobs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- =============================================================================
-- Comentários sobre uso:
-- =============================================================================
--
-- ENQUEUE (criar job):
-- INSERT INTO async_jobs (id, job_type, contact_id, payload_json, priority)
-- VALUES (?, 'message_process', ?, ?, 0);
--
-- DEQUEUE (pegar próximo job - com lock):
-- UPDATE async_jobs SET
--   status = 'processing',
--   locked_by = ?,
--   locked_at = datetime('now'),
--   started_at = datetime('now')
-- WHERE id = (
--   SELECT id FROM async_jobs
--   WHERE status = 'pending'
--   AND scheduled_for <= datetime('now')
--   AND (contact_id IS NULL OR contact_id NOT IN (
--     SELECT contact_id FROM async_jobs WHERE status = 'processing' AND contact_id IS NOT NULL
--   ))
--   ORDER BY priority DESC, scheduled_for ASC
--   LIMIT 1
-- )
-- RETURNING *;
--
-- COMPLETE (sucesso):
-- UPDATE async_jobs SET
--   status = 'completed',
--   result_json = ?,
--   completed_at = datetime('now'),
--   locked_by = NULL,
--   locked_at = NULL
-- WHERE id = ?;
--
-- FAIL (erro - com retry):
-- UPDATE async_jobs SET
--   status = 'failed',
--   error_message = ?,
--   error_stack = ?,
--   retry_count = retry_count + 1,
--   next_retry_at = datetime('now', '+' || (POWER(2, retry_count) * 30) || ' seconds'),
--   locked_by = NULL,
--   locked_at = NULL
-- WHERE id = ?;
--
-- TIMEOUT RECOVERY (jobs que travaram):
-- UPDATE async_jobs SET
--   status = 'pending',
--   locked_by = NULL,
--   locked_at = NULL,
--   retry_count = retry_count + 1
-- WHERE status = 'processing'
-- AND locked_at < datetime('now', '-' || timeout_seconds || ' seconds');
--
-- CANCEL:
-- UPDATE async_jobs SET status = 'cancelled' WHERE id = ? AND status = 'pending';
-- =============================================================================

-- =============================================================================
-- View para estatísticas de jobs
-- =============================================================================
CREATE VIEW IF NOT EXISTS v_async_jobs_stats AS
SELECT
    job_type,
    status,
    COUNT(*) as count,
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
        THEN (julianday(completed_at) - julianday(started_at)) * 86400
        ELSE NULL END) as avg_duration_seconds,
    MAX(created_at) as last_created_at
FROM async_jobs
GROUP BY job_type, status;
