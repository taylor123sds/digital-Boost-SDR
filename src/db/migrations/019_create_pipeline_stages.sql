-- Migration 019: Pipeline de 10 Estágios para Outbound Energia Solar
-- Cria estrutura de pipeline configurável com estágios específicos

-- Tabela de Pipelines (pode ter múltiplos pipelines)
CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'outbound', -- outbound, inbound, upsell
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabela de Estágios do Pipeline
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pipeline_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- identificador único: lead_novo, em_cadencia, etc
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'circle',
    position INTEGER NOT NULL, -- ordem no pipeline

    -- Configurações do estágio
    is_entry_stage INTEGER DEFAULT 0, -- estágio de entrada (Lead Novo)
    is_won_stage INTEGER DEFAULT 0, -- estágio de ganho
    is_lost_stage INTEGER DEFAULT 0, -- estágio de perda
    is_nurture_stage INTEGER DEFAULT 0, -- estágio de nutrição

    -- Automações do estágio
    auto_action TEXT, -- JSON: ação automática ao entrar no estágio
    required_fields TEXT, -- JSON: campos obrigatórios neste estágio

    -- Métricas
    probability INTEGER DEFAULT 0, -- probabilidade de conversão (0-100)
    expected_days INTEGER, -- dias esperados neste estágio

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

-- Tabela de Motivos de Perda
CREATE TABLE IF NOT EXISTS loss_reasons (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- preco, timing, concorrencia, fit, outro
    is_active INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tabela de Histórico de Movimentação no Pipeline
CREATE TABLE IF NOT EXISTS pipeline_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT NOT NULL,
    from_stage_id TEXT,
    to_stage_id TEXT NOT NULL,
    moved_by TEXT, -- user_id ou 'system'
    reason TEXT, -- motivo da movimentação
    loss_reason_id TEXT, -- se for perda
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id),
    FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id),
    FOREIGN KEY (loss_reason_id) REFERENCES loss_reasons(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_slug ON pipeline_stages(slug);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position ON pipeline_stages(pipeline_id, position);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_lead ON pipeline_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_date ON pipeline_history(created_at);

-- =====================================================
-- INSERIR PIPELINE PADRÃO: Outbound - Sites Energia Solar
-- =====================================================

INSERT INTO pipelines (id, name, description, type, is_default, is_active) VALUES
('pipeline_outbound_solar', 'Outbound - Sites Energia Solar', 'Pipeline para prospecção outbound de integradoras de energia solar', 'outbound', 1, 1);

-- Inserir os 10 estágios do pipeline
INSERT INTO pipeline_stages (id, pipeline_id, name, slug, description, color, icon, position, is_entry_stage, is_won_stage, is_lost_stage, is_nurture_stage, probability, expected_days, auto_action, required_fields) VALUES

-- 1. Lead Novo
('stage_lead_novo', 'pipeline_outbound_solar', 'Lead Novo', 'lead_novo',
'Lead qualificado importado da lista, ainda não contatado. Ao criar o lead aqui, dispara automaticamente D1 da cadência.',
'#6366f1', 'user-plus', 1, 1, 0, 0, 0, 5, 1,
'{"trigger": "start_cadence", "cadence": "outbound_15_dias"}',
'["empresa", "nome", "telefone", "cidade", "origem", "status_digital"]'),

-- 2. Em Cadência
('stage_em_cadencia', 'pipeline_outbound_solar', 'Em Cadência', 'em_cadencia',
'Lead que já recebeu D1/D2 e ainda não respondeu. Está no meio do fluxo de 15 dias.',
'#f59e0b', 'clock', 2, 0, 0, 0, 0, 10, 15,
NULL,
'["empresa", "nome", "telefone"]'),

-- 3. Respondeu / Em Interação
('stage_respondeu', 'pipeline_outbound_solar', 'Respondeu / Em Interação', 'respondeu',
'Lead que respondeu algo no WhatsApp ou e-mail. Objetivo: converter em ligação de triagem.',
'#10b981', 'comments', 3, 0, 0, 0, 0, 25, 3,
'{"trigger": "create_task", "task_type": "agendar_triagem", "priority": "high"}',
'["canal_resposta", "perfil_contato", "interessado_digital"]'),

-- 4. Triagem Agendada
('stage_triagem_agendada', 'pipeline_outbound_solar', 'Triagem Agendada', 'triagem_agendada',
'Lead com horário de micro-ligação marcado (5-10 min). Descobrir se vira oportunidade.',
'#3b82f6', 'phone', 4, 0, 0, 0, 0, 40, 2,
'{"trigger": "create_reminder", "minutes_before": 15}',
'["data_triagem", "hora_triagem"]'),

-- 5. Oportunidade - Diagnóstico
('stage_oportunidade', 'pipeline_outbound_solar', 'Oportunidade - Diagnóstico', 'oportunidade',
'Lead passou na triagem e topou ver o diagnóstico visual (reunião de 20 min).',
'#8b5cf6', 'chart-bar', 5, 0, 0, 0, 0, 55, 5,
NULL,
'["ticket_estimado", "volume_projetos", "dependencia_principal", "dor_principal"]'),

-- 6. Proposta Enviada
('stage_proposta', 'pipeline_outbound_solar', 'Proposta Enviada', 'proposta_enviada',
'Lead recebeu proposta clara (Site / Site + Tráfego). Trabalhar follow-up e objeções.',
'#ec4899', 'file-invoice', 6, 0, 0, 0, 0, 70, 7,
NULL,
'["tipo_proposta", "valor_proposta", "condicao_pagamento", "prazo_implantacao"]'),

-- 7. Negociação
('stage_negociacao', 'pipeline_outbound_solar', 'Negociação', 'negociacao',
'Discutindo preço, prazo, condições. Objetivo: fechar o contrato.',
'#14b8a6', 'handshake', 7, 0, 0, 0, 0, 85, 5,
NULL,
'["tipo_proposta", "valor_proposta"]'),

-- 8. Fechado - Ganhou
('stage_ganhou', 'pipeline_outbound_solar', 'Fechado - Ganhou', 'fechado_ganhou',
'Cliente fechado! Handoff para implantação/entrega.',
'#22c55e', 'trophy', 8, 0, 1, 0, 0, 100, NULL,
'{"trigger": "create_project", "notify_team": true}',
'["valor_total", "tipo_pacote", "prazo_entrega"]'),

-- 9. Fechado - Perdido
('stage_perdeu', 'pipeline_outbound_solar', 'Fechado - Perdido', 'fechado_perdeu',
'Lead perdido. Registrar motivo para aprendizado.',
'#ef4444', 'times-circle', 9, 0, 0, 1, 0, 0, NULL,
'{"trigger": "add_to_nurture", "reactivate_days": 90}',
'["motivo_perda"]'),

-- 10. Sem Resposta - Nutrição
('stage_nutricao', 'pipeline_outbound_solar', 'Sem Resposta - Nutrição', 'sem_resposta_nutricao',
'Lead que passou pelos 15 dias sem responder. Base para remarketing e reativação futura.',
'#64748b', 'seedling', 10, 0, 0, 0, 1, 5, NULL,
'{"trigger": "add_to_nurture_flow", "reactivate_days": 90}',
NULL);

-- Inserir motivos de perda padrão
INSERT INTO loss_reasons (id, name, description, category, position) VALUES
('loss_sem_prioridade', 'Sem prioridade agora', 'Lead disse que não é prioridade no momento', 'timing', 1),
('loss_outro_fornecedor', 'Fechou com outro fornecedor', 'Lead fechou com concorrente', 'concorrencia', 2),
('loss_sem_fit', 'Sem fit / não é ICP', 'Lead não se encaixa no perfil ideal', 'fit', 3),
('loss_curiosidade', 'Apenas curiosidade', 'Lead estava apenas pesquisando, sem intenção real', 'fit', 4),
('loss_preco', 'Problema de preço', 'Proposta acima do orçamento do lead', 'preco', 5),
('loss_interno', 'Problema interno', 'Lead sem tempo, equipe ou estrutura para avançar', 'timing', 6),
('loss_sem_resposta', 'Sem resposta após cadência', 'Lead não respondeu durante todo o fluxo', 'timing', 7),
('loss_desistiu', 'Desistiu durante negociação', 'Lead desistiu após iniciar negociação', 'outro', 8);
