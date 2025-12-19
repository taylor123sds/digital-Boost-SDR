-- Migration: Create meeting analysis tables
-- Description: Transcription analysis and sales methodology validation
-- Created: 2025-11-13
-- Purpose: Analyze Google Meet transcriptions with GPT-4 for sales performance metrics

-- ============================================================================
-- Table 1: meeting_transcriptions
-- Purpose: Store raw transcription data from Google Meet
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_transcriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  meeting_id TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  opportunity_id TEXT,

  -- Google Meet Integration (READ-ONLY - transcrição automática do Google Meet)
  google_event_id TEXT UNIQUE,
  google_drive_file_id TEXT, -- Transcription file in Google Drive (READ via Drive API)
  google_doc_url TEXT -- Direct URL to Google Doc with transcription

  -- Transcription Data
  texto_completo TEXT NOT NULL,
  idioma TEXT DEFAULT 'pt-BR',
  duracao_segundos INTEGER,
  num_palavras INTEGER,

  -- Participants Detection
  participantes TEXT DEFAULT '[]', -- JSON: [{"nome": "Taylor", "tempo_fala_segundos": 300}, ...]
  num_participantes INTEGER DEFAULT 0,

  -- Timing
  data_reuniao TEXT NOT NULL,
  transcrito_em TEXT,

  -- Processing Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TEXT,
  error_message TEXT,

  -- Source
  source_type TEXT DEFAULT 'google_meet', -- google_meet, manual_upload
  source_url TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  metadata TEXT DEFAULT '{}', -- JSON for additional data

  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- ============================================================================
-- Table 2: meeting_analysis
-- Purpose: Store GPT-4 analysis results (sentiment, talk ratio, objections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_analysis (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  transcription_id TEXT NOT NULL UNIQUE,
  meeting_id TEXT NOT NULL,

  -- Sentiment Analysis
  sentimento_geral TEXT, -- muito_positivo, positivo, neutro, negativo, muito_negativo
  sentimento_score REAL, -- -1.0 to 1.0
  confianca_sentimento REAL, -- 0.0 to 1.0

  -- Talk Ratio (% of conversation time)
  talk_ratio_vendedor REAL, -- 0-100%
  talk_ratio_cliente REAL, -- 0-100%
  talk_ratio_ideal REAL DEFAULT 30.0, -- Baseline: seller should talk ~30%
  talk_ratio_deviation REAL, -- How far from ideal

  -- Engagement Metrics
  num_perguntas_vendedor INTEGER DEFAULT 0,
  num_perguntas_cliente INTEGER DEFAULT 0,
  num_interrupcoes INTEGER DEFAULT 0,
  silencio_desconfortavel INTEGER DEFAULT 0, -- Pauses > 5 seconds

  -- Objection Handling
  objecoes_detectadas TEXT DEFAULT '[]', -- JSON: [{"tipo": "preco", "texto": "...", "respondida": true}, ...]
  num_objecoes INTEGER DEFAULT 0,
  taxa_resolucao_objecoes REAL, -- % of objections successfully handled

  -- Outcome Prediction
  resultado_previsto TEXT, -- venda_provavel, followup_necessario, perdido, neutro
  probabilidade_fechamento REAL, -- 0-100%
  confianca_predicao REAL, -- 0-100%

  -- Key Moments
  momentos_chave TEXT DEFAULT '[]', -- JSON: [{"timestamp": "00:15:30", "tipo": "objecao_preco", "texto": "..."}, ...]

  -- GPT-4 Processing
  model_usado TEXT DEFAULT 'gpt-4',
  prompt_version TEXT DEFAULT 'v1.0',
  tokens_usados INTEGER,
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  metadata TEXT DEFAULT '{}',

  FOREIGN KEY (transcription_id) REFERENCES meeting_transcriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- ============================================================================
-- Table 3: meeting_scores
-- Purpose: Sales methodology validation (SPIN, BANT, Challenger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  analysis_id TEXT NOT NULL UNIQUE,
  meeting_id TEXT NOT NULL,

  -- Overall Score
  score_total REAL NOT NULL, -- 0-100
  nota_geral TEXT, -- excelente (90-100), bom (70-89), regular (50-69), ruim (<50)

  -- SPIN Selling Methodology (25 points each)
  spin_situation_score REAL DEFAULT 0, -- 0-25: Questions about current state
  spin_problem_score REAL DEFAULT 0, -- 0-25: Questions about pain points
  spin_implication_score REAL DEFAULT 0, -- 0-25: Questions about consequences
  spin_needpayoff_score REAL DEFAULT 0, -- 0-25: Questions about solution value
  spin_total_score REAL DEFAULT 0, -- 0-100
  spin_seguiu_metodologia INTEGER DEFAULT 0, -- Boolean: followed SPIN?

  -- BANT Qualification (25 points each)
  bant_budget_score REAL DEFAULT 0, -- 0-25: Discussed budget/investment
  bant_authority_score REAL DEFAULT 0, -- 0-25: Identified decision maker
  bant_need_score REAL DEFAULT 0, -- 0-25: Understood business need
  bant_timeline_score REAL DEFAULT 0, -- 0-25: Established timeline
  bant_total_score REAL DEFAULT 0, -- 0-100
  bant_qualificado INTEGER DEFAULT 0, -- Boolean: lead is qualified?

  -- Challenger Sale (Teach, Tailor, Take Control)
  challenger_teach_score REAL DEFAULT 0, -- 0-33: Taught new insights
  challenger_tailor_score REAL DEFAULT 0, -- 0-33: Tailored to customer
  challenger_control_score REAL DEFAULT 0, -- 0-34: Took control of conversation
  challenger_total_score REAL DEFAULT 0, -- 0-100
  challenger_seguiu_metodologia INTEGER DEFAULT 0, -- Boolean: followed Challenger?

  -- Methodology Detection
  metodologia_primaria TEXT, -- spin, bant, challenger, consultiva, mista, nenhuma
  metodologia_secundaria TEXT,
  confianca_deteccao REAL, -- 0-100%

  -- Weighted Final Score (configurable weights)
  peso_spin REAL DEFAULT 0.30,
  peso_bant REAL DEFAULT 0.40,
  peso_challenger REAL DEFAULT 0.30,

  -- Evidence (examples from transcript)
  evidencias TEXT DEFAULT '{}', -- JSON: {"spin_situation": ["pergunta 1", ...], ...}

  -- GPT-4 Processing
  model_usado TEXT DEFAULT 'gpt-4',
  prompt_version TEXT DEFAULT 'v1.0',

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  metadata TEXT DEFAULT '{}',

  FOREIGN KEY (analysis_id) REFERENCES meeting_analysis(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- ============================================================================
-- Table 4: meeting_insights
-- Purpose: Actionable recommendations and coaching points
-- ============================================================================
CREATE TABLE IF NOT EXISTS meeting_insights (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  analysis_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,

  -- Insight Classification
  tipo TEXT NOT NULL, -- melhoria, alerta, destaque, coaching, proximo_passo
  categoria TEXT, -- metodologia, objecao, engajamento, comunicacao, timing
  prioridade TEXT DEFAULT 'media', -- alta, media, baixa

  -- Insight Content
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  exemplo_transcricao TEXT, -- Quote from transcript as evidence

  -- Recommendation
  acao_recomendada TEXT,
  impacto_esperado TEXT, -- alto, medio, baixo

  -- Status
  status TEXT DEFAULT 'nova', -- nova, revisada, aplicada, ignorada
  revisada_em TEXT,
  aplicada_em TEXT,

  -- Auto-generated vs Manual
  origem TEXT DEFAULT 'auto', -- auto (GPT-4), manual (user added)

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  metadata TEXT DEFAULT '{}',

  FOREIGN KEY (analysis_id) REFERENCES meeting_analysis(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- meeting_transcriptions indexes
CREATE INDEX IF NOT EXISTS idx_mt_meeting ON meeting_transcriptions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mt_google_event ON meeting_transcriptions(google_event_id);
CREATE INDEX IF NOT EXISTS idx_mt_status ON meeting_transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_mt_data_reuniao ON meeting_transcriptions(data_reuniao);
CREATE INDEX IF NOT EXISTS idx_mt_created ON meeting_transcriptions(created_at);

-- meeting_analysis indexes
CREATE INDEX IF NOT EXISTS idx_ma_transcription ON meeting_analysis(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ma_meeting ON meeting_analysis(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ma_resultado ON meeting_analysis(resultado_previsto);
CREATE INDEX IF NOT EXISTS idx_ma_sentimento ON meeting_analysis(sentimento_geral);
CREATE INDEX IF NOT EXISTS idx_ma_created ON meeting_analysis(created_at);

-- meeting_scores indexes
CREATE INDEX IF NOT EXISTS idx_ms_analysis ON meeting_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ms_meeting ON meeting_scores(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ms_score_total ON meeting_scores(score_total);
CREATE INDEX IF NOT EXISTS idx_ms_metodologia ON meeting_scores(metodologia_primaria);
CREATE INDEX IF NOT EXISTS idx_ms_created ON meeting_scores(created_at);

-- meeting_insights indexes
CREATE INDEX IF NOT EXISTS idx_mi_analysis ON meeting_insights(analysis_id);
CREATE INDEX IF NOT EXISTS idx_mi_meeting ON meeting_insights(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mi_tipo ON meeting_insights(tipo);
CREATE INDEX IF NOT EXISTS idx_mi_prioridade ON meeting_insights(prioridade);
CREATE INDEX IF NOT EXISTS idx_mi_status ON meeting_insights(status);
CREATE INDEX IF NOT EXISTS idx_mi_created ON meeting_insights(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for all tables
CREATE TRIGGER IF NOT EXISTS mt_updated_at
AFTER UPDATE ON meeting_transcriptions
BEGIN
  UPDATE meeting_transcriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS ma_updated_at
AFTER UPDATE ON meeting_analysis
BEGIN
  UPDATE meeting_analysis SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS ms_updated_at
AFTER UPDATE ON meeting_scores
BEGIN
  UPDATE meeting_scores SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS mi_updated_at
AFTER UPDATE ON meeting_insights
BEGIN
  UPDATE meeting_insights SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-calculate num_palavras on insert
CREATE TRIGGER IF NOT EXISTS mt_calculate_palavras
AFTER INSERT ON meeting_transcriptions
BEGIN
  UPDATE meeting_transcriptions
  SET num_palavras = (LENGTH(texto_completo) - LENGTH(REPLACE(texto_completo, ' ', '')) + 1)
  WHERE id = NEW.id AND num_palavras IS NULL;
END;

-- Auto-calculate total scores in meeting_scores
CREATE TRIGGER IF NOT EXISTS ms_calculate_totals
AFTER INSERT ON meeting_scores
BEGIN
  UPDATE meeting_scores
  SET
    spin_total_score = (spin_situation_score + spin_problem_score + spin_implication_score + spin_needpayoff_score),
    bant_total_score = (bant_budget_score + bant_authority_score + bant_need_score + bant_timeline_score),
    challenger_total_score = (challenger_teach_score + challenger_tailor_score + challenger_control_score),
    score_total = (
      (spin_situation_score + spin_problem_score + spin_implication_score + spin_needpayoff_score) * peso_spin +
      (bant_budget_score + bant_authority_score + bant_need_score + bant_timeline_score) * peso_bant +
      (challenger_teach_score + challenger_tailor_score + challenger_control_score) * peso_challenger
    )
  WHERE id = NEW.id;
END;

-- Auto-set nota_geral based on score_total
CREATE TRIGGER IF NOT EXISTS ms_set_nota_geral
AFTER UPDATE OF score_total ON meeting_scores
BEGIN
  UPDATE meeting_scores
  SET nota_geral = CASE
    WHEN NEW.score_total >= 90 THEN 'excelente'
    WHEN NEW.score_total >= 70 THEN 'bom'
    WHEN NEW.score_total >= 50 THEN 'regular'
    ELSE 'ruim'
  END
  WHERE id = NEW.id;
END;

-- Set processed_at when transcription status changes to 'completed'
CREATE TRIGGER IF NOT EXISTS mt_set_processed_at
AFTER UPDATE OF status ON meeting_transcriptions
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
  UPDATE meeting_transcriptions SET processed_at = datetime('now') WHERE id = NEW.id;
END;
