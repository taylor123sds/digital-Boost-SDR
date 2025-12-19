-- Migration 020: Estender Leads com Campos de Cadência e Outbound
-- Adiciona campos necessários para o fluxo de cadência de 15 dias

-- Adicionar colunas de cadência na tabela leads
ALTER TABLE leads ADD COLUMN pipeline_id TEXT DEFAULT 'pipeline_outbound_solar';
ALTER TABLE leads ADD COLUMN stage_id TEXT DEFAULT 'stage_lead_novo';
ALTER TABLE leads ADD COLUMN stage_entered_at TEXT;

-- Campos de cadência
ALTER TABLE leads ADD COLUMN cadence_id TEXT; -- qual cadência está ativa
ALTER TABLE leads ADD COLUMN cadence_status TEXT DEFAULT 'not_started'; -- not_started, active, paused, completed, responded
ALTER TABLE leads ADD COLUMN cadence_started_at TEXT;
ALTER TABLE leads ADD COLUMN cadence_day INTEGER DEFAULT 0; -- D0, D1, D2...
ALTER TABLE leads ADD COLUMN cadence_last_action_at TEXT;
ALTER TABLE leads ADD COLUMN cadence_next_action_at TEXT;
ALTER TABLE leads ADD COLUMN cadence_attempt_count INTEGER DEFAULT 0;

-- Campos de resposta
ALTER TABLE leads ADD COLUMN first_response_at TEXT;
ALTER TABLE leads ADD COLUMN first_response_channel TEXT; -- whatsapp, email, phone
ALTER TABLE leads ADD COLUMN response_type TEXT; -- curioso, cetico, hand_raiser, objecao
ALTER TABLE leads ADD COLUMN engagement_score INTEGER DEFAULT 0;

-- Campos específicos do ICP Energia Solar
ALTER TABLE leads ADD COLUMN status_digital TEXT; -- sem_site, site_fraco, so_instagram, site_ok
ALTER TABLE leads ADD COLUMN perfil_contato TEXT; -- dono, comercial, administrativo, tecnico
ALTER TABLE leads ADD COLUMN interessado_digital TEXT; -- sim, nao, em_duvida
ALTER TABLE leads ADD COLUMN ticket_estimado TEXT; -- ate_20k, 20_50k, acima_50k
ALTER TABLE leads ADD COLUMN volume_projetos TEXT; -- 1_5, 6_15, 16_30, acima_30
ALTER TABLE leads ADD COLUMN dependencia_principal TEXT; -- indicacao, instagram, indicacao_instagram, google, outro
ALTER TABLE leads ADD COLUMN dor_principal TEXT; -- falta_previsibilidade, falta_visibilidade, perda_orcamentos, imagem_profissionalismo

-- Campos de proposta
ALTER TABLE leads ADD COLUMN tipo_proposta TEXT; -- site, site_trafego
ALTER TABLE leads ADD COLUMN valor_proposta REAL;
ALTER TABLE leads ADD COLUMN condicao_pagamento TEXT;
ALTER TABLE leads ADD COLUMN prazo_implantacao TEXT;

-- Campos de triagem
ALTER TABLE leads ADD COLUMN data_triagem TEXT;
ALTER TABLE leads ADD COLUMN hora_triagem TEXT;
ALTER TABLE leads ADD COLUMN triagem_realizada INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN triagem_notes TEXT;

-- Campos de fechamento
ALTER TABLE leads ADD COLUMN valor_fechado REAL;
ALTER TABLE leads ADD COLUMN data_fechamento TEXT;
ALTER TABLE leads ADD COLUMN motivo_perda_id TEXT;
ALTER TABLE leads ADD COLUMN motivo_perda_notes TEXT;

-- Campos de nutrição
ALTER TABLE leads ADD COLUMN in_nurture_flow INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN nurture_started_at TEXT;
ALTER TABLE leads ADD COLUMN reactivate_at TEXT;

-- Índices para queries de cadência
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_cadence_status ON leads(cadence_status);
CREATE INDEX IF NOT EXISTS idx_leads_cadence_day ON leads(cadence_day);
CREATE INDEX IF NOT EXISTS idx_leads_cadence_next ON leads(cadence_next_action_at);
CREATE INDEX IF NOT EXISTS idx_leads_response_type ON leads(response_type);
CREATE INDEX IF NOT EXISTS idx_leads_status_digital ON leads(status_digital);

-- Tabela de Cadências (templates de fluxo)
CREATE TABLE IF NOT EXISTS cadences (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'outbound', -- outbound, inbound, nurture, reactivation
    target_icp TEXT, -- JSON: descrição do ICP alvo
    duration_days INTEGER DEFAULT 15,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,

    -- Configurações
    channels TEXT DEFAULT '["whatsapp", "email"]', -- JSON array
    business_hours_only INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'America/Sao_Paulo',

    -- Métricas
    total_leads_enrolled INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    avg_response_day REAL,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabela de Passos da Cadência
CREATE TABLE IF NOT EXISTS cadence_steps (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cadence_id TEXT NOT NULL,
    day INTEGER NOT NULL, -- D1, D2, D3...
    step_order INTEGER DEFAULT 1, -- ordem dentro do mesmo dia
    name TEXT NOT NULL,
    description TEXT,

    -- Configuração do passo
    channel TEXT NOT NULL, -- whatsapp, email, phone, task
    action_type TEXT NOT NULL, -- send_message, send_email, create_task, wait

    -- Timing
    send_time TEXT, -- horário preferencial (HH:MM)
    delay_hours INTEGER DEFAULT 0, -- delay após o horário base
    skip_weekends INTEGER DEFAULT 1,

    -- Conteúdo
    template_id TEXT, -- referência ao template de mensagem
    template_variant TEXT DEFAULT 'A', -- A/B testing
    subject TEXT, -- para emails
    content TEXT, -- conteúdo da mensagem/tarefa

    -- Condições
    condition_type TEXT, -- always, if_no_response, if_opened, if_clicked
    skip_if_responded INTEGER DEFAULT 1,

    -- Status
    is_active INTEGER DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (cadence_id) REFERENCES cadences(id) ON DELETE CASCADE
);

-- Tabela de Execuções de Cadência (log por lead)
CREATE TABLE IF NOT EXISTS cadence_enrollments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cadence_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'active', -- active, paused, completed, responded, converted, failed
    current_day INTEGER DEFAULT 0,
    current_step_id TEXT,

    -- Datas
    enrolled_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    paused_at TEXT,
    completed_at TEXT,
    responded_at TEXT,

    -- Métricas
    messages_sent INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,

    -- Resposta
    first_response_channel TEXT,
    first_response_day INTEGER,
    response_type TEXT,

    -- Metadados
    enrolled_by TEXT, -- user_id ou 'system'
    pause_reason TEXT,
    completion_reason TEXT,
    notes TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (cadence_id) REFERENCES cadences(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    UNIQUE(cadence_id, lead_id)
);

-- Tabela de Log de Ações da Cadência
CREATE TABLE IF NOT EXISTS cadence_actions_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    enrollment_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,

    -- Ação
    action_type TEXT NOT NULL, -- whatsapp_sent, email_sent, call_made, task_created
    channel TEXT,
    day INTEGER,

    -- Status
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, skipped
    error_message TEXT,

    -- Conteúdo enviado
    content_sent TEXT,
    template_variant TEXT,

    -- Resposta (se houver)
    response_received INTEGER DEFAULT 0,
    response_at TEXT,
    response_content TEXT,

    -- Timing
    scheduled_at TEXT,
    executed_at TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (enrollment_id) REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES cadence_steps(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cadence_steps_cadence ON cadence_steps(cadence_id);
CREATE INDEX IF NOT EXISTS idx_cadence_steps_day ON cadence_steps(cadence_id, day);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_lead ON cadence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_status ON cadence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_cadence ON cadence_enrollments(cadence_id);
CREATE INDEX IF NOT EXISTS idx_cadence_actions_enrollment ON cadence_actions_log(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cadence_actions_lead ON cadence_actions_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_actions_scheduled ON cadence_actions_log(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cadence_actions_status ON cadence_actions_log(status);

-- =====================================================
-- INSERIR CADÊNCIA PADRÃO: Outbound 15 Dias Energia Solar
-- =====================================================

INSERT INTO cadences (id, name, description, type, target_icp, duration_days, is_default, channels) VALUES
('cadence_outbound_solar_15d',
'Outbound 15 Dias - Energia Solar',
'Cadência de 15 dias para prospecção de integradoras de energia solar sem presença digital estruturada',
'outbound',
'{"segmento": "Integradoras de energia solar", "regiao": "Brasil", "caracteristicas": ["Operação ativa", "Sem site ou site fraco", "Dependência de indicação e redes sociais", "Sem canal digital claro de orçamento"]}',
15,
1,
'["whatsapp", "email"]');
