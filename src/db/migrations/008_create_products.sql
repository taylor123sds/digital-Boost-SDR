-- Migration: Create products table
-- Description: Product/service catalog for opportunities
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Product Information
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE, -- SKU or product code
  descricao TEXT,
  categoria TEXT,
  subcategoria TEXT,

  -- Pricing
  preco_base REAL,
  moeda TEXT DEFAULT 'BRL',
  tipo_preco TEXT DEFAULT 'fixo', -- fixo, variavel, sob_consulta
  modelo_cobranca TEXT, -- unico, mensal, anual, por_uso

  -- Product Type
  tipo TEXT DEFAULT 'servico', -- servico, produto, assinatura, consultoria

  -- Status
  ativo INTEGER DEFAULT 1,
  disponivel_venda INTEGER DEFAULT 1,

  -- Inventory (if applicable)
  controla_estoque INTEGER DEFAULT 0,
  quantidade_estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER,

  -- Sales Information
  ciclo_venda_medio INTEGER, -- Average sales cycle in days
  margem_lucro REAL, -- Profit margin percentage
  comissao_vendedor REAL, -- Sales commission percentage

  -- Documentation
  ficha_tecnica TEXT,
  url_documentacao TEXT,
  url_imagem TEXT,

  -- Bundling
  is_bundle INTEGER DEFAULT 0,
  produtos_inclusos TEXT DEFAULT '[]', -- JSON array of product IDs if bundle

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  discontinued_at TEXT,

  -- Custom Fields (JSON)
  custom_fields TEXT DEFAULT '{}',

  -- Metadata
  tags TEXT DEFAULT '[]',
  notas TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_ativo ON products(ativo);
CREATE INDEX IF NOT EXISTS idx_products_tipo ON products(tipo);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS products_updated_at
AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Opportunity Products Junction Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS opportunity_products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  opportunity_id TEXT NOT NULL,
  product_id TEXT NOT NULL,

  -- Product-specific details for this opportunity
  quantidade INTEGER DEFAULT 1,
  preco_unitario REAL NOT NULL,
  desconto REAL DEFAULT 0, -- Discount percentage
  preco_final REAL,

  -- Additional info
  descricao_customizada TEXT,
  notas TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE(opportunity_id, product_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_opp_products_opportunity ON opportunity_products(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_products_product ON opportunity_products(product_id);

-- Trigger to calculate final price
CREATE TRIGGER IF NOT EXISTS opportunity_products_calculate_price
AFTER INSERT ON opportunity_products
BEGIN
  UPDATE opportunity_products
  SET preco_final = (quantidade * preco_unitario * (1 - desconto / 100.0))
  WHERE id = NEW.id;
END;

-- Trigger to update final price on changes
CREATE TRIGGER IF NOT EXISTS opportunity_products_update_price
AFTER UPDATE OF quantidade, preco_unitario, desconto ON opportunity_products
BEGIN
  UPDATE opportunity_products
  SET preco_final = (quantidade * preco_unitario * (1 - desconto / 100.0))
  WHERE id = NEW.id;
END;
