-- ============================================
-- LEADLY AGENT PLATFORM - DATABASE MIGRATION
-- Migration 002: Update Agent Types for 3 Templates
-- ============================================

-- ============================================
-- 1. ADD TEMPLATE_ID COLUMN
-- ============================================
-- Adiciona referencia ao template usado na criacao
ALTER TABLE agents ADD COLUMN template_id TEXT DEFAULT NULL;

-- ============================================
-- 2. UPDATE TYPE VALUES
-- ============================================
-- Converter tipos antigos para novos:
-- 'sdr' -> 'sdr_full' (comportamento anterior era SDR completo)
-- 'support' -> 'support' (mantem)
-- 'scheduler' -> 'sdr_full' (scheduler sozinho vira SDR full)
-- 'custom' -> depende da config, default para 'sdr_consultant'

UPDATE agents SET type = 'sdr_full' WHERE type = 'sdr';
UPDATE agents SET type = 'sdr_full' WHERE type = 'scheduler';
UPDATE agents SET type = 'sdr_consultant' WHERE type = 'custom';
-- support ja esta correto

-- ============================================
-- 3. ADD BEHAVIOR COLUMNS
-- ============================================
-- Colunas para configuracao rapida de comportamento

ALTER TABLE agents ADD COLUMN spin_enabled INTEGER DEFAULT 1;
ALTER TABLE agents ADD COLUMN bant_enabled INTEGER DEFAULT 1;
ALTER TABLE agents ADD COLUMN auto_scheduling INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN support_mode INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN handoff_enabled INTEGER DEFAULT 0;

-- Atualizar valores baseados no tipo
UPDATE agents SET
  spin_enabled = 1,
  bant_enabled = 1,
  auto_scheduling = 1,
  support_mode = 0,
  handoff_enabled = 0
WHERE type = 'sdr_full';

UPDATE agents SET
  spin_enabled = 1,
  bant_enabled = 1,
  auto_scheduling = 0,
  support_mode = 0,
  handoff_enabled = 1
WHERE type = 'sdr_consultant';

UPDATE agents SET
  spin_enabled = 0,
  bant_enabled = 0,
  auto_scheduling = 0,
  support_mode = 1,
  handoff_enabled = 1
WHERE type = 'support';

-- ============================================
-- 4. ADD ENABLED_MODES JSON COLUMN
-- ============================================
-- Modos habilitados para roteamento de intencao
ALTER TABLE agents ADD COLUMN enabled_modes TEXT DEFAULT '["sdr","atendimento"]';

UPDATE agents SET enabled_modes = '["sdr","atendimento","scheduler"]' WHERE type = 'sdr_full';
UPDATE agents SET enabled_modes = '["sdr","atendimento"]' WHERE type = 'sdr_consultant';
UPDATE agents SET enabled_modes = '["atendimento"]' WHERE type = 'support';

-- ============================================
-- 5. ADD INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agents_template ON agents(template_id);
CREATE INDEX IF NOT EXISTS idx_agents_spin ON agents(spin_enabled);
CREATE INDEX IF NOT EXISTS idx_agents_scheduling ON agents(auto_scheduling);

-- ============================================
-- 6. UPDATE SEED DATA
-- ============================================
-- Adicionar agentes de exemplo para cada tipo

INSERT OR IGNORE INTO agents (
  id, tenant_id, name, description, type, template_id,
  vertical, status, config, spin_enabled, bant_enabled,
  auto_scheduling, support_mode, handoff_enabled, enabled_modes
) VALUES
(
  'agent_sdr_consultant_demo',
  'tenant_default',
  'SDR Consultant Demo',
  'Agente SDR que qualifica e passa para vendedor',
  'sdr_consultant',
  'sdr_consultant',
  'servicos',
  'draft',
  '{"identity":{"companyName":"Empresa Demo","agentName":"Julia"},"behavior":{"bantEnabled":true,"spinEnabled":true,"autoScheduling":false,"handoffEnabled":true}}',
  1, 1, 0, 0, 1,
  '["sdr","atendimento"]'
),
(
  'agent_sdr_full_demo',
  'tenant_default',
  'SDR Full Demo',
  'Agente SDR completo com agendamento automatico',
  'sdr_full',
  'sdr_full',
  'servicos',
  'draft',
  '{"identity":{"companyName":"Empresa Demo","agentName":"Carlos"},"behavior":{"bantEnabled":true,"spinEnabled":true,"autoScheduling":true,"calendarEnabled":true}}',
  1, 1, 1, 0, 0,
  '["sdr","atendimento","scheduler"]'
),
(
  'agent_support_demo',
  'tenant_default',
  'Support Demo',
  'Agente de atendimento ao cliente',
  'support',
  'support',
  'servicos',
  'draft',
  '{"identity":{"companyName":"Empresa Demo","agentName":"Ana"},"behavior":{"bantEnabled":false,"spinEnabled":false,"supportMode":true,"autoEscalate":true}}',
  0, 0, 0, 1, 1,
  '["atendimento"]'
);

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================
-- Tipos de agente disponiveis:
-- 'sdr_consultant' - SDR + Specialist (qualifica, passa para vendedor)
-- 'sdr_full' - SDR + Specialist + Scheduler (automacao completa)
-- 'support' - Atendimento puro (sem funcao SDR)
