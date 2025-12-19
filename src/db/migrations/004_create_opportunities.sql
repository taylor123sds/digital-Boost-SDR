-- Migration: Create opportunities table
-- Description: Qualified sales opportunities in the pipeline
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Relationships
  account_id TEXT NOT NULL,
  contact_id TEXT,
  lead_id TEXT, -- Original lead if converted

  -- Opportunity Details
  nome TEXT NOT NULL,
  descricao TEXT,
  valor REAL, -- Deal value in BRL
  moeda TEXT DEFAULT 'BRL',

  -- Pipeline Stage
  stage TEXT DEFAULT 'prospeccao', -- prospeccao, qualificacao, proposta, negociacao, fechamento
  probabilidade INTEGER DEFAULT 0, -- 0-100%

  -- Timing
  data_fechamento_prevista TEXT, -- Expected close date
  data_fechamento_real TEXT, -- Actual close date
  ciclo_venda_dias INTEGER, -- Sales cycle length

  -- Status
  status TEXT DEFAULT 'aberta', -- aberta, ganha, perdida, cancelada
  motivo_perda TEXT, -- Reason if lost
  concorrente TEXT, -- Competitor if lost

  -- Products/Services
  produtos TEXT DEFAULT '[]', -- JSON array of product IDs

  -- Assignment
  owner_id TEXT, -- Sales rep responsible

  -- BANT Data (inherited from lead or collected)
  bant_budget TEXT,
  bant_authority TEXT,
  bant_need TEXT,
  bant_timing TEXT,
  bant_score INTEGER DEFAULT 0,

  -- Next Steps
  proxima_acao TEXT,
  data_proxima_acao TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  ultimo_contato TEXT,

  -- Custom Fields (JSON)
  custom_fields TEXT DEFAULT '{}',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notas TEXT,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_account ON opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_valor ON opportunities(valor);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(data_fechamento_prevista);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS opportunities_updated_at
AFTER UPDATE ON opportunities
BEGIN
  UPDATE opportunities SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set data_fechamento_real when status changes to 'ganha'
CREATE TRIGGER IF NOT EXISTS opportunities_set_close_date
AFTER UPDATE OF status ON opportunities
WHEN NEW.status = 'ganha' AND OLD.status != 'ganha'
BEGIN
  UPDATE opportunities
  SET data_fechamento_real = datetime('now'),
      ciclo_venda_dias = CAST((julianday(datetime('now')) - julianday(created_at)) AS INTEGER)
  WHERE id = NEW.id;
END;
