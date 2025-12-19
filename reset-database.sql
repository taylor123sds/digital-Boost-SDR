-- Reset Database Script
-- Limpa todas as mensagens, leads e cards para começar do zero
-- Mantém a estrutura das tabelas

-- Desabilitar foreign keys temporariamente
PRAGMA foreign_keys = OFF;

-- ============================================================================
-- MENSAGENS E CONVERSAS
-- ============================================================================

DELETE FROM whatsapp_messages;
DELETE FROM crm_messages;
DELETE FROM message_sentiment;
DELETE FROM conversation_analysis;
DELETE FROM enhanced_conversation_states;
DELETE FROM memory;

-- ============================================================================
-- LEADS E CONTATOS
-- ============================================================================

DELETE FROM leads;
DELETE FROM lead_states;
DELETE FROM contacts;

-- ============================================================================
-- ATIVIDADES E EVENTOS
-- ============================================================================

DELETE FROM activities;
DELETE FROM events;
DELETE FROM meetings;
DELETE FROM meeting_analysis;
DELETE FROM meeting_insights;
DELETE FROM meeting_scores;
DELETE FROM meeting_transcriptions;

-- ============================================================================
-- CRM
-- ============================================================================

DELETE FROM opportunities;
DELETE FROM opportunity_products;
DELETE FROM tasks;

-- ============================================================================
-- AUTOMAÇÕES E WORKFLOWS
-- ============================================================================

DELETE FROM automation_executions;
DELETE FROM workflow_executions;
DELETE FROM workflow_actions;

-- ============================================================================
-- ANALYTICS E MÉTRICAS
-- ============================================================================

DELETE FROM agent_metrics;
DELETE FROM conversation_outcomes;
DELETE FROM sentiment_momentum;
DELETE FROM success_signals;
DELETE FROM abandonment_patterns;
DELETE FROM success_patterns;
DELETE FROM successful_patterns;
DELETE FROM feedback_insights;

-- ============================================================================
-- TESTES E EXPERIMENTOS
-- ============================================================================

DELETE FROM ab_experiments;
DELETE FROM prompt_performance;
DELETE FROM prompt_variations;

-- ============================================================================
-- VERIFICAÇÕES E BLOQUEIOS
-- ============================================================================

DELETE FROM human_verifications;
DELETE FROM bot_blocks;
DELETE FROM bot_blocked;

-- ============================================================================
-- DOCUMENTOS E ANÁLISES
-- ============================================================================

DELETE FROM document_analyses;

-- Reabilitar foreign keys
PRAGMA foreign_keys = ON;

-- Vacuum para compactar o banco
VACUUM;

-- Mostrar resultado
SELECT 'Database reset completed successfully!' as status;
