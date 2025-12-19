-- Migration: Create accounts table
-- Description: Core table for company/organization accounts (B2B focus)
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  razao_social TEXT,

  -- Contact Information
  telefone TEXT,
  email TEXT,
  website TEXT,

  -- Address
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  pais TEXT DEFAULT 'Brasil',

  -- Business Classification
  setor TEXT, -- tecnologia, financeiro, saude, educacao, etc
  segmento TEXT, -- enterprise, mid-market, smb, startup
  porte TEXT, -- MEI, ME, EPP, grande
  num_funcionarios INTEGER,
  receita_anual REAL,

  -- Relationship
  tipo TEXT DEFAULT 'prospect', -- prospect, cliente, parceiro, concorrente
  origem TEXT, -- inbound, outbound, indicacao, evento, etc
  owner_id TEXT, -- ID do vendedor responsavel

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Custom Fields (JSON)
  custom_fields TEXT DEFAULT '{}',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notas TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_cnpj ON accounts(cnpj);
CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_setor ON accounts(setor);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS accounts_updated_at
AFTER UPDATE ON accounts
BEGIN
  UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
END;
