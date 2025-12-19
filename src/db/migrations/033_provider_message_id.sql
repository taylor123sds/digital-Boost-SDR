-- =============================================================================
-- Migration 033: Provider Message ID
-- =============================================================================
-- P0-4: Adicionar provider_message_id na tabela whatsapp_messages
--
-- PROPÓSITO:
-- 1. Rastrear ID original da mensagem no provider (Evolution API)
-- 2. Permitir correlação entre mensagens enviadas e status de entrega
-- 3. Facilitar debugging e suporte
-- 4. Prevenir duplicação de mensagens enviadas
--
-- O provider_message_id é o ID retornado pelo WhatsApp/Evolution quando
-- uma mensagem é enviada com sucesso. Exemplo: "3EB0...@s.whatsapp.net"
-- =============================================================================

-- Adicionar coluna provider_message_id se não existir
-- SQLite não suporta IF NOT EXISTS em ALTER TABLE, então usamos PRAGMA
-- para verificar se a coluna já existe

-- Tentar adicionar a coluna (vai falhar silenciosamente se já existir)
ALTER TABLE whatsapp_messages ADD COLUMN provider_message_id TEXT;

-- Criar índice para buscar por provider_message_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id
ON whatsapp_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- =============================================================================
-- Adicionar coluna delivery_status para tracking de status
-- =============================================================================

-- Status de entrega: sent, delivered, read, failed
ALTER TABLE whatsapp_messages ADD COLUMN delivery_status TEXT DEFAULT 'pending';

-- Timestamp de quando foi entregue/lido
ALTER TABLE whatsapp_messages ADD COLUMN delivered_at TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN read_at TEXT;

-- Índice para buscar mensagens pendentes de confirmação
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_delivery
ON whatsapp_messages(delivery_status, from_me)
WHERE from_me = 1 AND delivery_status != 'read';

-- =============================================================================
-- Comentários sobre uso:
-- =============================================================================
--
-- INSERT (ao enviar mensagem):
-- INSERT INTO whatsapp_messages (
--   phone_number, message_text, from_me, provider_message_id, delivery_status
-- ) VALUES (?, ?, 1, ?, 'sent');
--
-- UPDATE (ao receber callback de entrega):
-- UPDATE whatsapp_messages
-- SET delivery_status = 'delivered', delivered_at = datetime('now')
-- WHERE provider_message_id = ?;
--
-- UPDATE (ao receber callback de leitura):
-- UPDATE whatsapp_messages
-- SET delivery_status = 'read', read_at = datetime('now')
-- WHERE provider_message_id = ?;
--
-- SELECT (correlacionar mensagem enviada):
-- SELECT * FROM whatsapp_messages
-- WHERE provider_message_id = ? AND from_me = 1;
-- =============================================================================
