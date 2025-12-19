-- Migration: Create scoring rules and lead scores tables
-- Description: Lead scoring engine
-- Created: 2025-12-01

-- Scoring rules configuration
CREATE TABLE IF NOT EXISTS scoring_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'profile' CHECK (category IN ('profile', 'engagement', 'behavior', 'custom')),
    field TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN (
        'equals', 'not_equals',
        'contains', 'not_contains',
        'greater_than', 'less_than', 'between',
        'is_empty', 'is_not_empty',
        'in_list', 'not_in_list'
    )),
    value TEXT NOT NULL,
    value_secondary TEXT,
    points INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Calculated lead scores
CREATE TABLE IF NOT EXISTS lead_scores (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT NOT NULL UNIQUE,
    total_score INTEGER DEFAULT 0,
    grade TEXT DEFAULT 'D' CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
    profile_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    behavior_score INTEGER DEFAULT 0,
    custom_score INTEGER DEFAULT 0,
    rules_matched TEXT DEFAULT '[]',
    last_activity TEXT,
    calculated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Score history for tracking changes
CREATE TABLE IF NOT EXISTS score_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    lead_id TEXT NOT NULL,
    old_score INTEGER,
    new_score INTEGER,
    old_grade TEXT,
    new_grade TEXT,
    change_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scoring_rules_active ON scoring_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_category ON scoring_rules(category);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_field ON scoring_rules(field);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_grade ON lead_scores(grade);
CREATE INDEX IF NOT EXISTS idx_lead_scores_total ON lead_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_score_history_lead ON score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_score_history_created ON score_history(created_at);

-- Auto-update triggers
CREATE TRIGGER IF NOT EXISTS scoring_rules_updated_at
AFTER UPDATE ON scoring_rules
BEGIN
    UPDATE scoring_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS lead_scores_updated_at
AFTER UPDATE ON lead_scores
BEGIN
    UPDATE lead_scores SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default scoring rules
INSERT OR IGNORE INTO scoring_rules (id, name, description, category, field, operator, value, points, priority) VALUES
('rule_bant_high', 'BANT Score Alto', 'Lead com BANT >= 75', 'profile', 'bant_score', 'greater_than', '74', 25, 1),
('rule_bant_medium', 'BANT Score Médio', 'Lead com BANT entre 50-74', 'profile', 'bant_score', 'between', '50', 15, 2),
('rule_decisor', 'É Decisor', 'Contato é tomador de decisão', 'profile', 'is_decisor', 'equals', '1', 20, 3),
('rule_empresa_grande', 'Empresa Grande', 'Empresa com mais de 50 funcionários', 'profile', 'num_funcionarios', 'greater_than', '50', 10, 4),
('rule_resposta_rapida', 'Resposta Rápida', 'Respondeu em menos de 1 hora', 'engagement', 'response_time', 'less_than', '60', 15, 5),
('rule_multiplas_interacoes', 'Múltiplas Interações', 'Mais de 5 mensagens trocadas', 'engagement', 'message_count', 'greater_than', '5', 10, 6),
('rule_meeting_agendado', 'Meeting Agendado', 'Tem reunião marcada', 'behavior', 'has_meeting', 'equals', '1', 20, 7),
('rule_proposta_enviada', 'Proposta Enviada', 'Já recebeu proposta comercial', 'behavior', 'proposal_sent', 'equals', '1', 15, 8);
