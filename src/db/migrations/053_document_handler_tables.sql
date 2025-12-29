-- Document Handler Tables Migration
-- Supports document versioning, packages, structured extraction, and reports

-- Documents table (base entity)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  name TEXT,
  origin TEXT DEFAULT 'upload',  -- 'upload', 'email', 'whatsapp'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'error'
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_agent_id ON documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Document versions (for versioning/updates)
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  file_name TEXT,
  file_hash TEXT,
  storage_path TEXT,
  storage_url TEXT,
  mime_type TEXT,
  file_size INTEGER,
  page_count INTEGER,
  text_content TEXT,
  ocr_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_file_hash ON document_versions(file_hash);

-- Document packages (grouping related documents)
CREATE TABLE IF NOT EXISTS document_packages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  name TEXT,
  process_number TEXT,
  organization TEXT,
  package_type TEXT,  -- 'licitacao', 'contrato', 'custom'
  status TEXT DEFAULT 'draft',  -- 'draft', 'processing', 'review', 'completed', 'distributed'
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_packages_tenant_id ON document_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_packages_agent_id ON document_packages(agent_id);
CREATE INDEX IF NOT EXISTS idx_document_packages_process_number ON document_packages(process_number);
CREATE INDEX IF NOT EXISTS idx_document_packages_type ON document_packages(package_type);
CREATE INDEX IF NOT EXISTS idx_document_packages_status ON document_packages(status);

-- Package documents junction (links documents to packages with roles)
CREATE TABLE IF NOT EXISTS package_documents (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  document_version_id TEXT NOT NULL,
  role TEXT,  -- 'edital', 'termo_referencia', 'minuta', 'anexo_tecnico', 'anexo_economico', etc
  position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES document_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_package_documents_package_id ON package_documents(package_id);
CREATE INDEX IF NOT EXISTS idx_package_documents_version_id ON package_documents(document_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_package_documents_unique ON package_documents(package_id, document_version_id);

-- Extraction runs (tracking each extraction attempt)
CREATE TABLE IF NOT EXISTS extraction_runs (
  id TEXT PRIMARY KEY,
  document_version_id TEXT,
  package_id TEXT,
  schema_type TEXT NOT NULL,  -- 'licitacao', 'contrato', 'custom'
  model TEXT,
  prompt_version TEXT,
  status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed'
  error_message TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd REAL,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES document_packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_extraction_runs_document_id ON extraction_runs(document_version_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_package_id ON extraction_runs(package_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_status ON extraction_runs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_schema_type ON extraction_runs(schema_type);

-- Extracted fields (individual field values with evidence)
CREATE TABLE IF NOT EXISTS extracted_fields (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_path TEXT,  -- JSON path like 'partes.contratante.nome'
  field_value JSON,
  value_type TEXT,  -- 'string', 'date', 'currency', 'array', 'object', 'boolean'
  evidence JSON,  -- { doc_id, page, section, quote, confidence }
  confidence REAL,
  validated INTEGER DEFAULT 0,
  validated_by TEXT,
  validated_at TIMESTAMP,
  conflicts JSON,  -- [{ source, value, page }] for conflicting values
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (extraction_run_id) REFERENCES extraction_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_run_id ON extracted_fields(extraction_run_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_field_name ON extracted_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_validated ON extracted_fields(validated);

-- Document reports (generated outputs)
CREATE TABLE IF NOT EXISTS document_reports (
  id TEXT PRIMARY KEY,
  package_id TEXT,
  extraction_run_id TEXT,
  tenant_id TEXT NOT NULL,
  report_type TEXT NOT NULL,  -- 'resumo_executivo', 'checklist', 'riscos', 'cronograma', 'comparativo'
  title TEXT,
  content JSON,
  format TEXT DEFAULT 'json',  -- 'json', 'markdown', 'html', 'pdf'
  recipients JSON,  -- [{ type: 'email'|'whatsapp', destination, sent_at }]
  status TEXT DEFAULT 'draft',  -- 'draft', 'sent', 'viewed'
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES document_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (extraction_run_id) REFERENCES extraction_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_document_reports_package_id ON document_reports(package_id);
CREATE INDEX IF NOT EXISTS idx_document_reports_run_id ON document_reports(extraction_run_id);
CREATE INDEX IF NOT EXISTS idx_document_reports_tenant_id ON document_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_reports_type ON document_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_document_reports_status ON document_reports(status);

-- Document processing queue (async processing)
CREATE TABLE IF NOT EXISTS document_processing_queue (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_version_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'extract_text', 'ocr', 'classify', 'extract_fields', 'generate_report'
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_queue_status ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_doc_queue_priority ON document_processing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_doc_queue_scheduled ON document_processing_queue(scheduled_at);
