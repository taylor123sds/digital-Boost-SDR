-- Migration: Create leads table
-- Description: Potential customers not yet qualified as opportunities
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Lead Information
  nome TEXT NOT NULL,
  empresa TEXT,
  cargo TEXT,

  -- Contact Information
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,

  -- Lead Source
  origem TEXT, -- website, whatsapp, google_sheets, evento, indicacao, cold_call
  campanha TEXT,
  midia TEXT, -- organic, paid_social, paid_search, email, etc

  -- Qualification
  status TEXT DEFAULT 'novo', -- novo, contatado, qualificado, desqualificado, convertido
  score INTEGER DEFAULT 0,
  segmento TEXT,
  interesse TEXT, -- Produto/servico de interesse

  -- BANT Framework
  bant_budget TEXT, -- Budget: verba disponivel
  bant_authority TEXT, -- Authority: decisor identificado
  bant_need TEXT, -- Need: problema/necessidade
  bant_timing TEXT, -- Timing: urgencia/timeline
  bant_score INTEGER DEFAULT 0, -- Score BANT (0-100)

  -- Assignment
  owner_id TEXT, -- SDR/vendedor responsavel

  -- Conversion
  converted INTEGER DEFAULT 0,
  converted_at TEXT,
  opportunity_id TEXT, -- ID da oportunidade quando convertido
  account_id TEXT, -- ID da conta quando convertido
  contact_id TEXT, -- ID do contato quando convertido

  -- LGPD
  consentimento_email INTEGER DEFAULT 0,
  consentimento_whatsapp INTEGER DEFAULT 0,
  lgpd_base_legal TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  ultimo_contato TEXT,

  -- Custom Fields (JSON)
  custom_fields TEXT DEFAULT '{}',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notas TEXT,

  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_origem ON leads(origem);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS leads_updated_at
AFTER UPDATE ON leads
BEGIN
  UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id;
END;
