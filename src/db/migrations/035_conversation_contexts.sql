-- =============================================================================
-- Migration 035: Conversation Contexts
-- =============================================================================
-- P0-5: Tabela para armazenar contexto das conversas para transações cascade
--
-- PROPÓSITO:
-- 1. Armazenar snapshot do contexto da conversa
-- 2. Permitir follow-ups inteligentes com base no histórico
-- 3. Suportar transações atômicas no webhook_handler
-- 4. Rastrear intent e response_type por mensagem
-- =============================================================================

-- Tabela de contextos de conversa
CREATE TABLE IF NOT EXISTS conversation_contexts (
    id TEXT PRIMARY KEY,                              -- UUID do contexto
    lead_id TEXT,                                     -- FK para leads
    phone TEXT NOT NULL,                              -- Telefone do contato
    tenant_id TEXT DEFAULT 'default',                 -- Multi-tenant support
    last_message TEXT,                                -- Última mensagem do lead
    last_agent_response TEXT,                         -- Última resposta do agente
    intent_json TEXT,                                 -- Intent detectado (JSON)
    response_type TEXT,                               -- positive/negative/neutral
    cadence_day INTEGER DEFAULT 1,                    -- Dia da cadência
    conversation_stage TEXT,                          -- Estágio da conversa (discovery, qualification, etc)
    topics_discussed TEXT,                            -- Tópicos discutidos (JSON array)
    objections_raised TEXT,                           -- Objeções levantadas (JSON array)
    next_action TEXT,                                 -- Próxima ação recomendada
    sentiment_score REAL,                             -- Score de sentimento (-1 a 1)
    engagement_level TEXT,                            -- high/medium/low
    created_at TEXT DEFAULT (datetime('now')),        -- Quando foi criado
    updated_at TEXT DEFAULT (datetime('now'))         -- Última atualização
);

-- Índice para buscar por telefone
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_phone
ON conversation_contexts(phone);

-- Índice para buscar por lead_id
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_lead
ON conversation_contexts(lead_id) WHERE lead_id IS NOT NULL;

-- Índice para buscar por tenant
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_tenant
ON conversation_contexts(tenant_id, created_at DESC);

-- Índice único para garantir um contexto por lead (mais recente)
-- Usando INSERT OR REPLACE para atualizar automaticamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_contexts_unique_lead
ON conversation_contexts(lead_id) WHERE lead_id IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS trg_conversation_contexts_updated_at
AFTER UPDATE ON conversation_contexts
FOR EACH ROW
BEGIN
    UPDATE conversation_contexts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- =============================================================================
-- Comentários sobre uso:
-- =============================================================================
--
-- INSERT/REPLACE (salvar contexto durante transação):
-- INSERT OR REPLACE INTO conversation_contexts (
--   id, lead_id, phone, last_message, intent_json, response_type, cadence_day
-- ) VALUES (?, ?, ?, ?, ?, ?, ?);
--
-- SELECT (obter contexto para follow-up):
-- SELECT * FROM conversation_contexts
-- WHERE lead_id = ?
-- ORDER BY updated_at DESC
-- LIMIT 1;
--
-- SELECT (buscar por telefone):
-- SELECT * FROM conversation_contexts
-- WHERE phone = ?
-- ORDER BY updated_at DESC
-- LIMIT 1;
-- =============================================================================
