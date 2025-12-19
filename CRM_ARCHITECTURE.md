# 🚀 ORBION Mini CRM - Arquitetura e Plano de Implementação

**Data:** 2025-11-10
**Versão:** 1.0
**Status:** Planejamento

---

## 📋 Visão Geral

Transformar o dashboard ORBION em um **Mini CRM completo** com funcionalidades essenciais de gestão de relacionamento com clientes, integrado com WhatsApp, Google Sheets e IA.

---

## 🎯 Núcleo de Entidades (Database Schema)

### 1. Contas (Empresas) - `accounts`
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  cnpj TEXT UNIQUE,
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  setor TEXT,
  tamanho TEXT, -- pequeno, medio, grande, enterprise
  tecnologias TEXT, -- JSON array
  endereco TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  dominio TEXT,
  website TEXT,
  status TEXT DEFAULT 'prospect', -- prospect, cliente, inativo
  proprietario_id TEXT,
  score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_fields TEXT -- JSON para campos personalizados
);
```

### 2. Contatos (Pessoas) - `contacts`
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  nome TEXT NOT NULL,
  cargo TEXT,
  senioridade TEXT, -- estagiario, junior, pleno, senior, coordenador, gerente, diretor, c-level
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  linkedin TEXT,
  origem TEXT, -- campanha, indicacao, site, evento
  temperatura TEXT DEFAULT 'frio', -- frio, morno, quente
  consentimento_email BOOLEAN DEFAULT 0,
  consentimento_whatsapp BOOLEAN DEFAULT 0,
  consentimento_telefone BOOLEAN DEFAULT 0,
  lgpd_base_legal TEXT, -- consentimento, legitimo_interesse, contrato
  lgpd_data DATETIME,
  proprietario_id TEXT,
  score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_fields TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

### 3. Leads - `leads`
```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  empresa TEXT,
  cargo TEXT,
  origem TEXT, -- campanha, utm_source, formulario
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  temperatura TEXT DEFAULT 'frio',
  score INTEGER DEFAULT 0,
  ultimo_toque DATETIME,
  proprietario_id TEXT,
  status TEXT DEFAULT 'novo', -- novo, trabalhando, qualificado, desqualificado, convertido
  motivo_desqualificacao TEXT,
  convertido_para_contact_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_fields TEXT
);
```

### 4. Oportunidades (Deals) - `opportunities`
```sql
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  contact_id TEXT,
  titulo TEXT NOT NULL,
  valor REAL DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  probabilidade INTEGER DEFAULT 0, -- 0-100%
  fase TEXT NOT NULL, -- prospecção, qualificação, proposta, negociação, fechamento
  fase_ordem INTEGER, -- para ordenação no kanban
  data_prevista_fechamento DATE,
  data_fechamento REAL DATE,
  motivo_perda TEXT,
  origem TEXT,
  proprietario_id TEXT,
  produtos TEXT, -- JSON array de produtos
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_fields TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);
```

### 5. Atividades - `activities`
```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL, -- tarefa, ligacao, email, whatsapp, reuniao
  titulo TEXT NOT NULL,
  descricao TEXT,
  relacionado_tipo TEXT, -- lead, contact, account, opportunity
  relacionado_id TEXT,
  status TEXT DEFAULT 'pendente', -- pendente, concluida, cancelada
  prioridade TEXT DEFAULT 'media', -- baixa, media, alta, urgente
  prazo DATETIME,
  responsavel_id TEXT,
  resultado TEXT, -- sucesso, sem_resposta, reagendar, nao_interessado
  duracao_minutos INTEGER,
  custo_tokens INTEGER, -- para rastrear uso de IA
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

### 6. Mensagens (Timeline) - `messages`
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT, -- agrupar mensagens da mesma conversa
  canal TEXT NOT NULL, -- email, whatsapp, sms
  direcao TEXT NOT NULL, -- inbound, outbound
  relacionado_tipo TEXT, -- lead, contact, account
  relacionado_id TEXT NOT NULL,
  remetente TEXT,
  destinatario TEXT,
  assunto TEXT,
  corpo TEXT,
  corpo_html TEXT,
  anexos TEXT, -- JSON array
  status TEXT, -- enviado, entregue, lido, respondido, bounce, spam
  intencao TEXT, -- interessado, preco, objecao, remover, ooo
  sentimento TEXT, -- positivo, neutro, negativo
  classificacao_ia TEXT, -- JSON com análise da IA
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  replied_at DATETIME
);
```

### 7. Reuniões - `meetings`
```sql
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATETIME NOT NULL,
  data_fim DATETIME NOT NULL,
  local TEXT,
  link_videochamada TEXT,
  relacionado_tipo TEXT,
  relacionado_id TEXT,
  organizador_id TEXT,
  participantes TEXT, -- JSON array de contact_ids
  status TEXT DEFAULT 'agendada', -- agendada, confirmada, realizada, cancelada
  resultado TEXT,
  transcricao TEXT,
  highlights TEXT, -- JSON: objecoes, precos_mencionados, proxima_acao
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 8. Produtos/Planos - `products`
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  preco REAL DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  recorrencia TEXT, -- mensal, anual, unico
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9. Campos Personalizados - `custom_fields`
```sql
CREATE TABLE custom_fields (
  id TEXT PRIMARY KEY,
  entidade TEXT NOT NULL, -- account, contact, lead, opportunity
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL, -- text, number, date, select, multiselect, boolean, currency
  opcoes TEXT, -- JSON array para select/multiselect
  obrigatorio BOOLEAN DEFAULT 0,
  ordem INTEGER,
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 10. Workflows/Automações - `workflows`
```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  trigger_tipo TEXT NOT NULL, -- lead_created, score_changed, stage_changed
  trigger_condicoes TEXT, -- JSON
  acoes TEXT NOT NULL, -- JSON array: [{ tipo: 'send_whatsapp', template_id: '...' }]
  ativo BOOLEAN DEFAULT 1,
  versao INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎨 Estrutura de Telas (UI/UX)

### 1. **Dashboard Home** (Meu Dia)
**Rota:** `/`
**Componentes:**
- Hero com métricas principais (pipeline, atividades, conversões)
- Tarefas do dia (vencidas em vermelho)
- Próximas reuniões (3 horas)
- Leads quentes (score > 70)
- Últimas respostas WhatsApp/Email

### 2. **Pipeline Kanban**
**Rota:** `/pipeline`
**Componentes:**
- Colunas arrastáveis por fase
- Cards de oportunidades com:
  - Valor, probabilidade, dias na fase
  - Próxima atividade agendada
  - Cor por temperatura do contato
- Somatório por coluna (valor total e ponderado)
- Filtros: proprietário, período, valor mínimo

### 3. **Leads**
**Rota:** `/leads`
**Componentes:**
- Tabela com filtros avançados
- Ações em massa: atribuir, mudar status, adicionar tag
- Importar CSV
- Converter para contato
- Score visual (barra de progresso)

### 4. **Contatos**
**Rota:** `/contacts`
**Componentes:**
- Lista com busca global
- Filtros salvos (segmentos)
- Visão 360° ao clicar

### 5. **Contas**
**Rota:** `/accounts`
**Componentes:**
- Cards com logo (buscar via Clearbit/similar)
- Hierarquia (conta → contatos → oportunidades)

### 6. **Visão 360°** (Registro Individual)
**Rota:** `/contact/:id`, `/account/:id`, `/opportunity/:id`
**Layout:**
- **Header:** Nome, cargo, empresa, tags, score
- **Tabs:**
  - Detalhes (campos principais + custom fields)
  - Timeline 360° (atividades + mensagens + automações)
  - Oportunidades relacionadas
  - Documentos/Anexos
  - Debug IA (tokens, custos, decisões)
- **Composer rápido:** enviar email/WhatsApp/criar tarefa

### 7. **Funil BANT**
**Rota:** `/funil-bant`
**Componentes:**
- Cards por stage: NEED → BUDGET → AUTHORITY → TIMING
- Arrastar entre stages
- Formulário inline para preencher campos BANT
- Integração com Google Sheets (sync bidirecional)

### 8. **Atividades**
**Rota:** `/activities`
**Componentes:**
- Lista/Calendário (toggle)
- Filtros: tipo, status, responsável, prazo
- Criar tarefa/reunião/ligação rápida

### 9. **Relatórios**
**Rota:** `/reports`
**Dashboards:**
- Pipeline: funil, taxa de conversão, velocidade
- Atividades: toques, tempo de resposta
- Conversões: leads → contatos → oportunidades → ganhos
- Entregabilidade: bounce rate, spam score
- Cohorts: por origem/campanha

### 10. **Configurações**
**Rota:** `/settings`
**Seções:**
- Campos personalizados
- Fases do pipeline
- Workflows (drag-and-drop builder)
- Integrações (Google, Evolution API, OpenAI)
- Usuários & Permissões (RBAC)
- LGPD (logs de consentimento, exportar/apagar dados)

---

## 🔌 APIs Necessárias (Backend)

### CRM Core
```
GET    /api/crm/accounts          - Listar contas
POST   /api/crm/accounts          - Criar conta
GET    /api/crm/accounts/:id      - Detalhes da conta
PUT    /api/crm/accounts/:id      - Atualizar conta
DELETE /api/crm/accounts/:id      - Deletar conta

GET    /api/crm/contacts          - Listar contatos
POST   /api/crm/contacts          - Criar contato
GET    /api/crm/contacts/:id      - Detalhes + timeline 360°
PUT    /api/crm/contacts/:id      - Atualizar contato
DELETE /api/crm/contacts/:id      - Deletar contato

GET    /api/crm/leads             - Listar leads
POST   /api/crm/leads             - Criar lead
POST   /api/crm/leads/:id/convert - Converter lead em contato
PUT    /api/crm/leads/:id         - Atualizar lead

GET    /api/crm/opportunities     - Listar oportunidades (Kanban)
POST   /api/crm/opportunities     - Criar oportunidade
PUT    /api/crm/opportunities/:id/stage - Mover de fase
PUT    /api/crm/opportunities/:id - Atualizar oportunidade

GET    /api/crm/activities        - Listar atividades
POST   /api/crm/activities        - Criar atividade
PUT    /api/crm/activities/:id/complete - Marcar como concluída

GET    /api/crm/timeline/:tipo/:id - Timeline 360° (todas atividades + mensagens)
```

### Automação
```
GET    /api/crm/workflows         - Listar workflows
POST   /api/crm/workflows         - Criar workflow
PUT    /api/crm/workflows/:id     - Atualizar workflow
POST   /api/crm/workflows/:id/test - Testar workflow (dry run)
```

### Relatórios
```
GET    /api/crm/reports/pipeline  - Métricas do pipeline
GET    /api/crm/reports/activities - Atividades por período
GET    /api/crm/reports/conversions - Funil de conversão
GET    /api/crm/reports/cohorts   - Análise por cohort
```

### LGPD
```
GET    /api/crm/lgpd/consents/:contactId - Listar consentimentos
POST   /api/crm/lgpd/consents             - Registrar consentimento
POST   /api/crm/lgpd/export/:contactId    - Exportar dados (DSR)
POST   /api/crm/lgpd/delete/:contactId    - Apagar dados (DSR)
```

---

## 🏗️ Plano de Implementação (Fases)

### **FASE 1: Fundação (Semana 1-2)** 🟢
**Objetivo:** Estrutura base do CRM

1. **Database Schema**
   - [ ] Criar migrations para todas as tabelas
   - [ ] Popular com dados de exemplo
   - [ ] Migrar dados existentes do Google Sheets

2. **APIs Core**
   - [ ] CRUD de Contas (`/api/crm/accounts`)
   - [ ] CRUD de Contatos (`/api/crm/contacts`)
   - [ ] CRUD de Leads (`/api/crm/leads`)
   - [ ] CRUD de Oportunidades (`/api/crm/opportunities`)

3. **UI Base**
   - [ ] Layout com sidebar navegação
   - [ ] Dashboard home com métricas
   - [ ] Lista de leads (tabela básica)
   - [ ] Lista de contatos (tabela básica)

### **FASE 2: Pipeline & Atividades (Semana 3-4)** 🟡
**Objetivo:** Gestão de oportunidades e tarefas

1. **Pipeline Kanban**
   - [ ] Drag-and-drop entre fases
   - [ ] Edição inline de valores
   - [ ] Somatório por coluna

2. **Atividades**
   - [ ] CRUD de atividades
   - [ ] Calendário de atividades
   - [ ] Notificações de vencimento

3. **Timeline 360°**
   - [ ] Agregar atividades + mensagens
   - [ ] Filtros por tipo e data
   - [ ] Composer rápido (email/WhatsApp)

### **FASE 3: Omnichannel (Semana 5-6)** 🟡
**Objetivo:** Integrar canais de comunicação

1. **WhatsApp**
   - [ ] Histórico de conversas na timeline
   - [ ] Enviar mensagem diretamente do CRM
   - [ ] Templates aprovados
   - [ ] Opt-in/out tracking

2. **Email**
   - [ ] Conectar caixas Gmail/Outlook
   - [ ] Rastreio de abertura/clique
   - [ ] Templates de email

3. **Telefonia**
   - [ ] Registrar ligações
   - [ ] Transcrição (Whisper API)
   - [ ] Highlights de objeções

### **FASE 4: Automação & IA (Semana 7-8)** 🔴
**Objetivo:** Workflows e inteligência artificial

1. **Workflows**
   - [ ] Builder no-code (drag-and-drop)
   - [ ] Triggers: lead criado, score mudou, stage mudou
   - [ ] Ações: enviar mensagem, criar tarefa, notificar

2. **Score de Lead**
   - [ ] Pontuação por ICP
   - [ ] Pontos por engajamento
   - [ ] Auto-atualização

3. **Classificador de Respostas**
   - [ ] Analisar intenção (interessado/objeção/etc)
   - [ ] Próximas ações sugeridas

### **FASE 5: Relatórios & LGPD (Semana 9-10)** 🔴
**Objetivo:** Analytics e conformidade

1. **Relatórios**
   - [ ] Dashboard de pipeline
   - [ ] Funil de conversão
   - [ ] Cohorts por origem

2. **LGPD**
   - [ ] Registro de consentimentos
   - [ ] Opt-in/out por canal
   - [ ] Exportar/apagar dados (DSR)

3. **Permissões (RBAC)**
   - [ ] Roles: Admin, Gestor, SDR, Compliance
   - [ ] Escopo por carteira

---

## 🎨 Design System (Componentes)

### Cores (Já definidas)
```css
--cyan: #18c5ff
--violet: #7c5cff
--success: #10b981
--warning: #f59e0b
--danger: #ef4444
```

### Componentes Reutilizáveis
- **Card:** Container glassmorphism
- **Button:** Primary, secondary, ghost, danger
- **Input:** Text, select, date, phone, currency
- **Table:** Sortable, filterable, paginação
- **Modal:** Para formulários e confirmações
- **Toast:** Notificações de sucesso/erro
- **Badge:** Status, tags, scores
- **Timeline:** Vertical com ícones por tipo
- **Kanban Board:** Drag-and-drop
- **Chart:** Line, bar, pie, donut

---

## 📊 Métricas de Sucesso

1. **Adoção:**
   - 100% dos leads no CRM (migração completa do Sheets)
   - 80% das atividades registradas no CRM

2. **Performance:**
   - < 100ms para queries de listagem
   - < 500ms para timeline 360°

3. **Conversão:**
   - Taxa de lead → contato mensurada
   - Taxa de contato → oportunidade mensurada
   - Taxa de win rate por fase

4. **Automação:**
   - 50%+ dos toques via workflows automáticos
   - Classificação IA com 80%+ de acurácia

---

## 🚀 Próximos Passos

1. **Aprovar arquitetura** com stakeholders
2. **Criar migrations** do banco de dados
3. **Implementar APIs** da Fase 1
4. **Desenvolver UI** base (sidebar + dashboard home)
5. **Iterar** com feedback dos usuários

---

**Última atualização:** 2025-11-10
**Responsável:** ORBION Team
**Status:** 📋 Aguardando aprovação
