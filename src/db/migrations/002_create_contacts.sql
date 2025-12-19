-- Migration: Create contacts table
-- Description: Individual contacts (people) within accounts
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT,

  -- Personal Information
  nome TEXT NOT NULL,
  sobrenome TEXT,
  cargo TEXT,
  departamento TEXT,
  senioridade TEXT, -- estagiario, junior, pleno, senior, coordenador, gerente, diretor, c-level

  -- Contact Information
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  linkedin TEXT,

  -- LGPD Compliance
  consentimento_email INTEGER DEFAULT 0,
  consentimento_whatsapp INTEGER DEFAULT 0,
  consentimento_sms INTEGER DEFAULT 0,
  lgpd_base_legal TEXT, -- consentimento, legitimo_interesse, contrato, obrigacao_legal
  lgpd_data_consentimento TEXT,
  lgpd_ip_consentimento TEXT,

  -- Engagement
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo', -- ativo, inativo, bloqueado, opt_out
  ultimo_contato TEXT,

  -- Decisor Information
  is_decisor INTEGER DEFAULT 0,
  poder_decisao TEXT, -- nenhum, influenciador, aprovador, decisor_final

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Custom Fields (JSON)
  custom_fields TEXT DEFAULT '{}',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notas TEXT,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp ON contacts(whatsapp);
CREATE INDEX IF NOT EXISTS idx_contacts_senioridade ON contacts(senioridade);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON contacts(score);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_is_decisor ON contacts(is_decisor);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS contacts_updated_at
AFTER UPDATE ON contacts
BEGIN
  UPDATE contacts SET updated_at = datetime('now') WHERE id = NEW.id;
END;
