-- Migration: Create workflows tables
-- Description: Workflow automation system (triggers and actions)
-- Created: 2025-11-10

-- Workflow Definitions
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Workflow Info
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Trigger Configuration
  trigger_entidade TEXT NOT NULL, -- 'lead', 'contact', 'opportunity', 'activity', 'meeting'
  trigger_evento TEXT NOT NULL, -- 'criado', 'atualizado', 'campo_alterado', 'status_alterado'
  trigger_campo TEXT, -- Specific field if trigger_evento = 'campo_alterado'
  trigger_condicoes TEXT DEFAULT '[]', -- JSON array of conditions

  -- Workflow Status
  ativo INTEGER DEFAULT 1,

  -- Execution Control
  execucao_unica INTEGER DEFAULT 0, -- Execute only once per record
  prioridade INTEGER DEFAULT 0, -- Higher priority workflows execute first

  -- Timing
  atraso_minutos INTEGER DEFAULT 0, -- Delay before execution

  -- Statistics
  execucoes_total INTEGER DEFAULT 0,
  execucoes_sucesso INTEGER DEFAULT 0,
  execucoes_erro INTEGER DEFAULT 0,
  ultima_execucao TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Metadata
  tags TEXT DEFAULT '[]'
);

-- Workflow Actions
CREATE TABLE IF NOT EXISTS workflow_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workflow_id TEXT NOT NULL,

  -- Action Configuration
  tipo TEXT NOT NULL, -- 'enviar_email', 'enviar_whatsapp', 'criar_atividade', 'atualizar_campo', 'criar_tarefa', 'notificar_usuario', 'webhook'
  ordem INTEGER DEFAULT 0, -- Execution order

  -- Action Parameters (JSON)
  parametros TEXT DEFAULT '{}',
  -- Examples:
  -- enviar_email: {"destinatario": "{{contact.email}}", "assunto": "...", "corpo": "..."}
  -- atualizar_campo: {"campo": "status", "valor": "qualificado"}
  -- criar_atividade: {"tipo": "tarefa", "assunto": "...", "owner_id": "..."}

  -- Conditions for this specific action
  condicoes TEXT DEFAULT '[]', -- Optional conditions for this action

  -- Status
  ativo INTEGER DEFAULT 1,

  -- Error Handling
  continuar_em_erro INTEGER DEFAULT 0, -- Continue workflow if this action fails
  max_tentativas INTEGER DEFAULT 1,

  -- Statistics
  execucoes_total INTEGER DEFAULT 0,
  execucoes_sucesso INTEGER DEFAULT 0,
  execucoes_erro INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Workflow Execution Log
CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  workflow_id TEXT NOT NULL,

  -- Execution Context
  entidade_tipo TEXT NOT NULL,
  entidade_id TEXT NOT NULL,

  -- Execution Status
  status TEXT DEFAULT 'pendente', -- pendente, executando, sucesso, erro, cancelado
  inicio_execucao TEXT,
  fim_execucao TEXT,
  duracao_ms INTEGER,

  -- Results
  acoes_executadas INTEGER DEFAULT 0,
  acoes_sucesso INTEGER DEFAULT 0,
  acoes_erro INTEGER DEFAULT 0,

  -- Error Tracking
  erro_mensagem TEXT,
  erro_stack TEXT,

  -- Execution Data
  dados_entrada TEXT, -- JSON snapshot of entity data at execution time
  dados_saida TEXT, -- JSON results of actions

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_entidade ON workflows(trigger_entidade);
CREATE INDEX IF NOT EXISTS idx_workflows_ativo ON workflows(ativo);
CREATE INDEX IF NOT EXISTS idx_workflows_prioridade ON workflows(prioridade);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow ON workflow_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_ordem ON workflow_actions(ordem);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_ativo ON workflow_actions(ativo);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_entidade ON workflow_executions(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created ON workflow_executions(created_at);

-- Triggers
CREATE TRIGGER IF NOT EXISTS workflows_updated_at
AFTER UPDATE ON workflows
BEGIN
  UPDATE workflows SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS workflow_actions_updated_at
AFTER UPDATE ON workflow_actions
BEGIN
  UPDATE workflow_actions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS workflow_executions_updated_at
AFTER UPDATE ON workflow_executions
BEGIN
  UPDATE workflow_executions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to calculate execution duration
CREATE TRIGGER IF NOT EXISTS workflow_executions_calculate_duration
AFTER UPDATE OF fim_execucao ON workflow_executions
WHEN NEW.inicio_execucao IS NOT NULL AND NEW.fim_execucao IS NOT NULL
BEGIN
  UPDATE workflow_executions
  SET duracao_ms = CAST((julianday(NEW.fim_execucao) - julianday(NEW.inicio_execucao)) * 24 * 60 * 60 * 1000 AS INTEGER)
  WHERE id = NEW.id;
END;
