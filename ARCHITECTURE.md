# 🏗️ ORBION - Arquitetura Profissional V2.0

**Data:** 09/11/2025
**Status:** 📋 Em Planejamento
**Objetivo:** Refatorar para arquitetura clean, modular e escalável

---

## 📊 Análise da Estrutura Atual

### Estatísticas
- **Total de arquivos:** 119 arquivos JavaScript
- **Ferramentas (tools):** 71 arquivos
- **Arquivo principal:** `server.js` (85KB, ~2000 linhas)
- **Memória:** `memory.js` (41KB)
- **Diretórios:** 11 pastas

### Problemas Identificados

1. ❌ **server.js muito grande** (85KB, responsabilidades misturadas)
2. ❌ **71 tools sem organização clara** (muitos deprecated, duplicações)
3. ❌ **Lógica de negócio misturada com infraestrutura**
4. ❌ **Falta de separação de responsabilidades (SRP violation)**
5. ❌ **Dependências circulares potenciais**
6. ❌ **Falta de testes unitários**
7. ❌ **Configurações espalhadas** (hardcoded em múltiplos arquivos)

---

## 🎯 Nova Arquitetura Proposta

### Princípios Arquiteturais

1. **Clean Architecture** - Separação em camadas com dependências unidirecionais
2. **SOLID Principles** - Especialmente SRP, DIP e ISP
3. **Domain-Driven Design** - Organização por domínios de negócio
4. **Modularidade** - Módulos independentes e testáveis
5. **Dependency Injection** - Inversão de controle
6. **Configuration as Code** - Centralização de configs

### Estrutura de Pastas

```
agent-js-starter/
├── src/
│   ├── app.js                          # 🚀 Entry point (substituirá server.js)
│   │
│   ├── config/                         # ⚙️ CONFIGURAÇÕES
│   │   ├── index.js                    # Configurações centralizadas
│   │   ├── environment.js              # Validação de .env
│   │   ├── database.js                 # Config SQLite/Prisma
│   │   ├── integrations.js             # APIs externas (Evolution, OpenAI)
│   │   └── constants.js                # Constantes do sistema
│   │
│   ├── core/                           # 🧠 NÚCLEO DO SISTEMA
│   │   ├── agents/                     # Sistema de agentes
│   │   │   ├── AgentHub.js             # Orquestrador de agentes
│   │   │   ├── SDRAgent.js             # Agente SDR (primeiro contato)
│   │   │   ├── SpecialistAgent.js      # Agente Specialist (BANT)
│   │   │   ├── SchedulerAgent.js       # Agente Scheduler (reuniões)
│   │   │   └── BaseAgent.js            # Classe base abstrata
│   │   │
│   │   ├── bant/                       # Framework BANT
│   │   │   ├── BANTOrchestrator.js     # Orquestrador BANT
│   │   │   ├── stages/                 # Stages individuais
│   │   │   │   ├── NeedStage.js
│   │   │   │   ├── BudgetStage.js
│   │   │   │   ├── AuthorityStage.js
│   │   │   │   └── TimingStage.js
│   │   │   └── QualificationEngine.js  # Cálculo de score
│   │   │
│   │   ├── conversation/               # Gerenciamento de conversas
│   │   │   ├── ConversationManager.js  # Gerenciador principal
│   │   │   ├── MessageQueue.js         # Fila de mensagens
│   │   │   ├── ContextManager.js       # Contexto e histórico
│   │   │   └── ResponseOptimizer.js    # Otimização de respostas
│   │   │
│   │   └── intelligence/               # Inteligência e análise
│   │       ├── PersonalizationEngine.js
│   │       ├── SalesIntelligence.js
│   │       ├── ProfileAnalyzer.js
│   │       ├── ObjectionHandler.js
│   │       └── UrgencyDetector.js
│   │
│   ├── domain/                         # 📦 DOMÍNIOS DE NEGÓCIO
│   │   ├── leads/                      # Domínio de Leads
│   │   │   ├── Lead.entity.js          # Entidade Lead
│   │   │   ├── LeadRepository.js       # Repositório (DB)
│   │   │   ├── LeadService.js          # Lógica de negócio
│   │   │   └── LeadValidator.js        # Validações
│   │   │
│   │   ├── campaigns/                  # Domínio de Campanhas
│   │   │   ├── Campaign.entity.js
│   │   │   ├── CampaignRepository.js
│   │   │   ├── CampaignService.js
│   │   │   └── CampaignOrchestrator.js
│   │   │
│   │   ├── meetings/                   # Domínio de Reuniões
│   │   │   ├── Meeting.entity.js
│   │   │   ├── MeetingRepository.js
│   │   │   ├── MeetingService.js
│   │   │   └── SchedulerService.js
│   │   │
│   │   └── analytics/                  # Domínio de Análises
│   │       ├── Metric.entity.js
│   │       ├── MetricsRepository.js
│   │       ├── AnalyticsService.js
│   │       └── ConversationAnalytics.js
│   │
│   ├── infrastructure/                 # 🔧 INFRAESTRUTURA
│   │   ├── database/                   # Acesso a dados
│   │   │   ├── DatabaseConnection.js   # Singleton de conexão
│   │   │   ├── BaseRepository.js       # Repositório base
│   │   │   ├── migrations/             # Migrações SQL
│   │   │   └── seeds/                  # Seeds de desenvolvimento
│   │   │
│   │   ├── cache/                      # Sistema de cache
│   │   │   ├── CacheManager.js
│   │   │   └── IntelligentCache.js
│   │   │
│   │   ├── storage/                    # Armazenamento de arquivos
│   │   │   ├── FileStorage.js
│   │   │   └── AudioStorage.js
│   │   │
│   │   └── queue/                      # Sistema de filas
│   │       ├── QueueManager.js
│   │       └── JobProcessor.js
│   │
│   ├── integrations/                   # 🔌 INTEGRAÇÕES EXTERNAS
│   │   ├── whatsapp/                   # WhatsApp (Evolution API)
│   │   │   ├── WhatsAppClient.js       # Cliente principal
│   │   │   ├── WhatsAppWebhook.js      # Handler de webhook
│   │   │   ├── MessageSender.js        # Envio de mensagens
│   │   │   └── MediaHandler.js         # Manuseio de mídia
│   │   │
│   │   ├── openai/                     # OpenAI
│   │   │   ├── OpenAIClient.js         # Cliente GPT
│   │   │   ├── ChatCompletion.js       # Chat
│   │   │   ├── EmbeddingService.js     # Embeddings
│   │   │   ├── WhisperService.js       # Transcrição
│   │   │   └── TTSService.js           # Text-to-Speech
│   │   │
│   │   ├── google/                     # Google APIs
│   │   │   ├── GoogleAuthClient.js     # Autenticação OAuth
│   │   │   ├── SheetsService.js        # Google Sheets
│   │   │   └── CalendarService.js      # Google Calendar
│   │   │
│   │   └── elevenlabs/                 # ElevenLabs TTS
│   │       └── ElevenLabsClient.js
│   │
│   ├── api/                            # 🌐 CAMADA HTTP/API
│   │   ├── routes/                     # Rotas Express
│   │   │   ├── index.js                # Router principal
│   │   │   ├── webhook.routes.js       # /api/webhook/*
│   │   │   ├── whatsapp.routes.js      # /api/whatsapp/*
│   │   │   ├── leads.routes.js         # /api/leads/*
│   │   │   ├── campaigns.routes.js     # /api/campaigns/*
│   │   │   ├── analytics.routes.js     # /api/analytics/*
│   │   │   ├── sheets.routes.js        # /api/sheets/*
│   │   │   ├── calendar.routes.js      # /api/calendar/*
│   │   │   └── health.routes.js        # /health
│   │   │
│   │   ├── controllers/                # Controllers (lógica HTTP)
│   │   │   ├── WebhookController.js
│   │   │   ├── WhatsAppController.js
│   │   │   ├── LeadController.js
│   │   │   ├── CampaignController.js
│   │   │   └── AnalyticsController.js
│   │   │
│   │   ├── middleware/                 # Middlewares
│   │   │   ├── auth.middleware.js
│   │   │   ├── validation.middleware.js
│   │   │   ├── ratelimit.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── logging.middleware.js
│   │   │
│   │   └── validators/                 # Schemas de validação (Joi)
│   │       ├── webhook.validator.js
│   │       ├── lead.validator.js
│   │       └── campaign.validator.js
│   │
│   ├── shared/                         # 🔄 COMPARTILHADO
│   │   ├── utils/                      # Utilitários gerais
│   │   │   ├── logger.js               # Sistema de logs (Winston)
│   │   │   ├── errors.js               # Classes de erro customizadas
│   │   │   ├── validators.js           # Validadores reutilizáveis
│   │   │   ├── formatters.js           # Formatação de dados
│   │   │   └── crypto.js               # Criptografia/hash
│   │   │
│   │   ├── helpers/                    # Helpers de negócio
│   │   │   ├── date.helper.js
│   │   │   ├── phone.helper.js
│   │   │   ├── text.helper.js
│   │   │   └── score.helper.js
│   │   │
│   │   └── constants/                  # Constantes compartilhadas
│   │       ├── messages.js             # Templates de mensagens
│   │       ├── stages.js               # Definições de stages
│   │       └── statuses.js             # Status do sistema
│   │
│   └── types/                          # 📝 TIPOS (JSDoc/TypeScript)
│       ├── entities.d.js               # Definições de entidades
│       ├── dtos.d.js                   # DTOs
│       └── responses.d.js              # Response types
│
├── tests/                              # 🧪 TESTES
│   ├── unit/                           # Testes unitários
│   │   ├── core/
│   │   ├── domain/
│   │   └── shared/
│   │
│   ├── integration/                    # Testes de integração
│   │   ├── api/
│   │   ├── database/
│   │   └── integrations/
│   │
│   ├── e2e/                            # Testes end-to-end
│   │   └── flows/
│   │
│   └── fixtures/                       # Dados de teste
│       ├── leads.json
│       └── messages.json
│
├── scripts/                            # 📜 SCRIPTS AUXILIARES
│   ├── setup/                          # Scripts de setup
│   │   ├── init-database.js
│   │   └── setup-google-auth.js
│   │
│   ├── maintenance/                    # Manutenção
│   │   ├── backup-database.js
│   │   ├── clean-cache.js
│   │   └── sync-sheets.js
│   │
│   └── migration/                      # Migração de dados
│       └── migrate-from-v1.js
│
├── docs/                               # 📚 DOCUMENTAÇÃO
│   ├── architecture/                   # Arquitetura
│   │   ├── decisions.md                # ADRs (Architecture Decision Records)
│   │   ├── diagrams/                   # Diagramas (Mermaid)
│   │   └── flows.md                    # Fluxos de processo
│   │
│   ├── api/                            # Documentação API
│   │   ├── endpoints.md
│   │   ├── webhooks.md
│   │   └── postman/                    # Coleções Postman
│   │
│   └── guides/                         # Guias
│       ├── setup.md
│       ├── deployment.md
│       └── troubleshooting.md
│
├── public/                             # 🎨 ARQUIVOS ESTÁTICOS (sem mudanças)
├── data/                               # 📊 DADOS (sem mudanças)
├── logs/                               # 📋 LOGS (gerados)
│
├── .env.example                        # Exemplo de variáveis
├── .gitignore
├── package.json
├── jsconfig.json                       # Config JSDoc/IntelliSense
├── .eslintrc.json                      # ESLint config
├── .prettierrc                         # Prettier config
└── README.md
```

---

## 🔄 Camadas e Fluxo de Dados

```
┌─────────────────────────────────────────────────┐
│              API Layer (HTTP)                   │
│  routes → controllers → validators              │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│           Application Layer                     │
│  Services (orchestration & business logic)      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│            Domain Layer                         │
│  Entities, Value Objects, Domain Logic          │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│         Infrastructure Layer                    │
│  Database, External APIs, File System           │
└─────────────────────────────────────────────────┘
```

### Fluxo de Mensagem WhatsApp

```
Webhook → Route → Controller → Validator
                                  │
                                  ▼
                          WhatsAppClient
                                  │
                                  ▼
                           MessageQueue
                                  │
                                  ▼
                            AgentHub
                          ┌───────┴───────┐
                          ▼               ▼
                      SDRAgent    SpecialistAgent
                                      │
                                      ▼
                               BANTOrchestrator
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
               NeedStage        BudgetStage      AuthorityStage
```

---

## 📦 Módulos Principais

### 1. Core Modules (Núcleo)

#### AgentHub
```javascript
/**
 * Orquestrador central de agentes
 * Responsável por rotear mensagens e gerenciar handoffs
 */
class AgentHub {
  constructor(dependencies) {
    this.agents = new Map();
    this.leadRepository = dependencies.leadRepository;
    this.conversationManager = dependencies.conversationManager;
  }

  async handleMessage(message, context) {}
  async routeToAgent(leadId, agentType) {}
  async executeHandoff(from, to, data) {}
}
```

#### BaseAgent (Abstract)
```javascript
/**
 * Classe base abstrata para todos os agentes
 * Define interface comum e comportamento compartilhado
 */
class BaseAgent {
  constructor(config, dependencies) {
    if (new.target === BaseAgent) {
      throw new Error('Cannot instantiate abstract class');
    }
  }

  async process(message, context) {
    throw new Error('Method must be implemented');
  }

  async shouldHandoff(context) {
    throw new Error('Method must be implemented');
  }
}
```

### 2. Domain Modules (Domínio)

#### Lead.entity.js
```javascript
/**
 * Entidade Lead com validações e regras de negócio
 */
class Lead {
  constructor(data) {
    this.id = data.id;
    this.phone = this.validatePhone(data.phone);
    this.name = data.name;
    this.stage = data.stage || 'sdr';
    // ...
  }

  validatePhone(phone) {
    // Validação de telefone brasileiro
  }

  canTransitionTo(newStage) {
    // Regras de transição de stage
  }

  calculateQualificationScore() {
    // Cálculo de score baseado em BANT
  }
}
```

#### LeadRepository.js
```javascript
/**
 * Repositório de Leads (Data Access Layer)
 * Abstrai acesso ao banco de dados
 */
class LeadRepository extends BaseRepository {
  async findByPhone(phone) {}
  async findActiveLeads() {}
  async updateStage(leadId, newStage) {}
  async saveBantData(leadId, bantData) {}
}
```

#### LeadService.js
```javascript
/**
 * Serviço de Leads (Business Logic Layer)
 * Orquestra operações de negócio relacionadas a leads
 */
class LeadService {
  constructor(leadRepository, sheetsService, analyticsService) {
    this.leadRepo = leadRepository;
    this.sheets = sheetsService;
    this.analytics = analyticsService;
  }

  async createLead(data) {
    // Validação + criação + sincronização + analytics
  }

  async qualifyLead(leadId, bantData) {
    // Qualificação + atualização de score + notificações
  }
}
```

### 3. Integration Modules (Integrações)

#### WhatsAppClient.js
```javascript
/**
 * Cliente centralizado para Evolution API
 * Gerencia todas as comunicações WhatsApp
 */
class WhatsAppClient {
  constructor(config) {
    this.baseUrl = config.evolutionBaseUrl;
    this.apiKey = config.evolutionApiKey;
    this.instance = config.evolutionInstance;
    this.timeout = config.timeout || 30000;
  }

  async sendText(to, text) {}
  async sendAudio(to, audioBuffer) {}
  async sendMedia(to, mediaUrl, caption) {}
  async checkStatus() {}
}
```

#### OpenAIClient.js
```javascript
/**
 * Cliente OpenAI com circuit breaker e retry
 */
class OpenAIClient {
  constructor(config) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.circuitBreaker = new CircuitBreaker(config.breakerOptions);
  }

  async chat(messages, options) {
    return this.circuitBreaker.execute(() =>
      this.client.chat.completions.create({...})
    );
  }
}
```

---

## 🎯 Padrões de Design Aplicados

### 1. Repository Pattern
Separa lógica de acesso a dados da lógica de negócio

### 2. Service Layer Pattern
Encapsula lógica de negócio complexa

### 3. Dependency Injection
Facilita testes e reduz acoplamento

### 4. Factory Pattern
Criação de agentes e entidades

### 5. Strategy Pattern
Diferentes estratégias de qualificação/personalização

### 6. Observer Pattern
Sistema de eventos para analytics

### 7. Circuit Breaker
Resiliência em integrações externas

### 8. Message Queue
Processamento assíncrono e ordenado

---

## 🔧 Tecnologias e Bibliotecas

### Core
- **Express.js** - Framework HTTP
- **better-sqlite3** - Database (pode migrar para Prisma futuramente)
- **dotenv** - Gerenciamento de variáveis de ambiente
- **joi** - Validação de schemas

### Integrations
- **openai** - GPT, Whisper, TTS
- **googleapis** - Google Sheets, Calendar
- **axios** - HTTP client

### Dev Tools
- **ESLint** - Linting
- **Prettier** - Formatação de código
- **Nodemon** - Hot reload
- **Jest** (adicionar) - Testes
- **Supertest** (adicionar) - Testes de API

### Monitoring (futuro)
- **Winston** - Logging estruturado
- **Prometheus** (opcional) - Métricas
- **Sentry** (opcional) - Error tracking

---

## 📋 Plano de Migração

### Fase 1: Preparação (Sprint 1)
- [ ] Criar nova estrutura de pastas
- [ ] Configurar ESLint e Prettier
- [ ] Configurar jsconfig.json para JSDoc
- [ ] Criar BaseRepository e BaseService
- [ ] Criar sistema de configuração centralizado

### Fase 2: Infraestrutura (Sprint 2)
- [ ] Migrar DatabaseConnection
- [ ] Criar repositórios (Lead, Campaign, Meeting)
- [ ] Migrar integrações (WhatsApp, OpenAI, Google)
- [ ] Implementar sistema de logging estruturado

### Fase 3: Domínio (Sprint 3)
- [ ] Criar entidades de domínio
- [ ] Implementar services de domínio
- [ ] Migrar lógica de BANT para BANTOrchestrator
- [ ] Refatorar agentes (SDR, Specialist, Scheduler)

### Fase 4: API (Sprint 4)
- [ ] Quebrar server.js em rotas modulares
- [ ] Criar controllers
- [ ] Implementar validators
- [ ] Migrar middlewares

### Fase 5: Testes (Sprint 5)
- [ ] Configurar Jest
- [ ] Criar testes unitários para services
- [ ] Criar testes de integração para API
- [ ] Criar testes E2E para fluxos principais

### Fase 6: Finalização (Sprint 6)
- [ ] Documentação completa
- [ ] Migração de dados antigos
- [ ] Deploy e validação
- [ ] Deprecar código antigo

---

## ✅ Benefícios da Nova Arquitetura

### Manutenibilidade
- ✅ Código organizado por domínio e responsabilidade
- ✅ Fácil localização de bugs
- ✅ Redução de acoplamento

### Escalabilidade
- ✅ Fácil adição de novos agentes
- ✅ Fácil adição de novas integrações
- ✅ Possibilidade de microserviços no futuro

### Testabilidade
- ✅ Injeção de dependências facilita mocks
- ✅ Lógica de negócio isolada
- ✅ Testes unitários desacoplados de infraestrutura

### Performance
- ✅ Cache inteligente
- ✅ Lazy loading de módulos
- ✅ Message queue para processamento assíncrono

### Developer Experience
- ✅ Autocomplete com JSDoc
- ✅ Linting e formatação automática
- ✅ Documentação inline
- ✅ Hot reload em desenvolvimento

---

## 🚀 Próximos Passos

1. **Validar arquitetura** com stakeholders
2. **Criar branch** `refactor/v2-architecture`
3. **Implementar Fase 1** (estrutura base)
4. **Configurar CI/CD** para validar builds
5. **Migrar módulo por módulo** sem quebrar produção
6. **Escrever testes** conforme migra
7. **Documentar** cada decisão arquitetural (ADRs)

---

**Autor:** Claude Code
**Revisão:** Pendente
**Aprovação:** Pendente
