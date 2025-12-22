# 🤖 ORBION - AI Sales Agent V2.1

> **Agente de vendas inteligente com WhatsApp, BANT qualificação e Google Sheets**

[![Status](https://img.shields.io/badge/status-wave1--complete-green)](./REFACTORING_STATUS.md)
[![Wave](https://img.shields.io/badge/wave-1%2F7-blue)](./WAVE1_IMPLEMENTATION_COMPLETE.md)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](./test_wave1.js)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-blue)]()

**Digital Boost - Natal/RN, Brasil**

---

## 🎉 Wave 1: Foundation Layer Complete! ✅

**New in v2.1.0:**
- ✅ Centralized configuration system
- ✅ Structured logging with Winston
- ✅ Custom error classes (20+ types)
- ✅ Dependency injection container
- ✅ 100% test coverage for foundation layer

See [`WAVE1_IMPLEMENTATION_COMPLETE.md`](./WAVE1_IMPLEMENTATION_COMPLETE.md) for details.

---

## 📋 Índice

- [Sobre](#-sobre)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Documentação](#-documentação)
- [Desenvolvimento](#-desenvolvimento)
- [Contribuindo](#-contribuindo)

---

## 🎯 Sobre

ORBION é um sistema de **AI Sales Development Representative (SDR)** que automatiza a qualificação de leads via WhatsApp usando:

- 🧠 **OpenAI GPT-4o-mini** - Conversas naturais e inteligentes
- 📱 **Evolution API** - Integração WhatsApp Business
- 📊 **Google Sheets** - CRM simplificado e funil de vendas
- 🎯 **BANT Framework** - Qualificação profissional de leads
- 🗓️ **Google Calendar** - Agendamento automatizado
- 📈 **Analytics** - Métricas e insights de conversas

### Agentes Especializados

```
┌─────────────────────────────────────────────────┐
│              ORBION Agent System                │
├─────────────────────────────────────────────────┤
│                                                 │
│  SDR Agent         →  Primeiro contato         │
│  Specialist Agent  →  Qualificação BANT        │
│  Scheduler Agent   →  Agendamento reuniões     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitetura

### V2.0 - Clean Architecture (Em Desenvolvimento)

Estamos refatorando para uma arquitetura profissional baseada em:

- **Clean Architecture** - Separação clara de camadas
- **Domain-Driven Design** - Organização por domínios de negócio
- **SOLID Principles** - Código sustentável e testável
- **Repository Pattern** - Abstração de dados
- **Service Layer** - Lógica de negócio isolada

```
src/v2/
├── config/           # ⚙️  Configurações centralizadas
├── core/             # 🧠 Núcleo (agentes, BANT, conversação)
├── domain/           # 📦 Domínios (leads, campaigns, meetings)
├── infrastructure/   # 🔧 Infraestrutura (DB, cache, queue)
├── integrations/     # 🔌 APIs externas (WhatsApp, OpenAI, Google)
├── api/              # 🌐 Camada HTTP (routes, controllers)
└── shared/           # 🔄 Código compartilhado (utils, helpers)
```

📖 **Documentação Completa:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## ✨ Funcionalidades

### 🤖 Sistema de Agentes
- [x] **SDR Agent** - Primeiro contato e descoberta
- [x] **Specialist Agent** - Qualificação BANT profunda
- [x] **Scheduler Agent** - Agendamento de reuniões
- [x] **Handoffs inteligentes** - Transição suave entre agentes

### 📊 Qualificação BANT
- [x] **Need** - Identificação de necessidades
- [x] **Budget** - Orçamento disponível
- [x] **Authority** - Poder de decisão
- [x] **Timing** - Urgência e prazo

### 🔗 Integrações
- [x] **WhatsApp** (Evolution API) - Envio/recebimento de mensagens
- [x] **OpenAI** - GPT-4o-mini, Whisper, TTS, Embeddings
- [x] **Google Sheets** - Sincronização automática de leads
- [x] **Google Calendar** - Agendamento de reuniões
- [x] **ElevenLabs** - Text-to-Speech premium (opcional)

### 📈 Analytics
- [x] Métricas de conversação
- [x] Taxa de qualificação
- [x] Performance de agentes
- [x] Análise de sentimento

### 🛡️ Segurança e Confiabilidade
- [x] Rate limiting
- [x] Input validation
- [x] Circuit breaker
- [x] Retry com backoff exponencial
- [x] Message queue (evita race conditions)

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Docker** (para Evolution API)
- **FFmpeg** (instalado automaticamente)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/agent-js-starter.git
cd agent-js-starter
```

### 2. Instale dependências

```bash
npm install
```

### 3. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 4. Inicie Evolution API (WhatsApp)

```bash
docker-compose up -d
```

### 5. Configure Google OAuth

```bash
cp google_credentials.json.example google_credentials.json
# Adicione suas credenciais do Google Cloud Console
```

---

## ⚙️ Configuração

### Variáveis de Ambiente Essenciais

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Evolution API (WhatsApp)
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave
EVOLUTION_INSTANCE=orbion

# Google Sheets
GOOGLE_LEADS_SHEET_ID=1EMk...
GOOGLE_FUNIL_SHEET_ID=1EMk...

# Servidor
PORT=3001
NODE_ENV=development
```

📖 **Configuração Completa:** Veja `.env.example`

---

## 💻 Uso

### Iniciar o servidor

```bash
npm start
```

O servidor estará disponível em `http://localhost:3001`

### Dashboards

- **Desktop:** http://localhost:3001 (redireciona para dashboard-pro.html)
- **Mobile:** http://localhost:3001/mobile-dashboard.html
- **Sales:** http://localhost:3001/sales-dashboard.html
- **Archetypes:** http://localhost:3001/archetypes-dashboard.html

### API Endpoints Principais

```bash
# Webhook WhatsApp
POST /api/webhook/evolution

# Enviar mensagem
POST /api/whatsapp/send
{
  "to": "5584999999999",
  "message": "Olá!"
}

# Buscar leads
GET /api/leads?q=empresa

# Analytics
GET /api/analytics/overview
```

### Scripts Úteis

```bash
# Forçar sincronização com Sheets
node force_sync_leads.js

# Testar integração Sheets
node test_sheets.js

# Verificar status
npm run status

# Reiniciar servidor
npm run restart
```

---

## 📚 Documentação

### 🎯 Wave 1 Documentation (NEW)

- [✅ Wave 1 Complete](./WAVE1_IMPLEMENTATION_COMPLETE.md) - Implementação detalhada
- [📊 Refactoring Status](./REFACTORING_STATUS.md) - Status geral do projeto
- [📋 Wave 2 Next Steps](./WAVE2_NEXT_STEPS.md) - Próximos passos
- [⚡ Quick Reference](./QUICK_REFERENCE.md) - Guia de referência rápida
- [🏗️ Architecture Assessment](./ARCHITECTURE_ASSESSMENT_2025-11-11.md) - Análise completa

### Documentos Principais

- [📖 ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura V2.0 completa
- [🗺️ MIGRATION_PLAN.md](./MIGRATION_PLAN.md) - Plano de refatoração
- [📊 REFACTOR_PROGRESS.md](./REFACTOR_PROGRESS.md) - Progresso da migração
- [🔍 DIAGNOSTICO_SHEETS.md](./DIAGNOSTICO_SHEETS.md) - Fix integração Sheets
- [🛠️ CLAUDE.md](./CLAUDE.md) - Guia para Claude Code

### Guias de Setup

- [Google Sheets Setup](./GOOGLE_SHEETS_SETUP.md)
- [Evolution API Setup](./docs/evolution-setup.md) *(criar)*

---

## 🛠️ Desenvolvimento

### Estrutura do Projeto (V2.0)

```
agent-js-starter/
├── src/
│   ├── v2/                    # 🆕 Nova arquitetura
│   │   ├── config/            # Configurações
│   │   ├── core/              # Agentes, BANT, Conversação
│   │   ├── domain/            # Leads, Campaigns, Meetings
│   │   ├── infrastructure/    # Database, Cache, Queue
│   │   ├── integrations/      # WhatsApp, OpenAI, Google
│   │   ├── api/               # Routes, Controllers
│   │   └── shared/            # Utils, Helpers
│   │
│   ├── server.js              # Entry point atual
│   ├── agents/                # Agentes (V1 - a deprecar)
│   ├── tools/                 # Ferramentas (V1 - a deprecar)
│   └── ...
│
├── public/                    # Dashboards e arquivos estáticos
├── data/                      # Dados e planilhas
├── logs/                      # Logs do sistema
├── docs/                      # Documentação adicional
├── tests/                     # Testes (próxima fase)
│
├── .env                       # Variáveis de ambiente
├── .eslintrc.json             # ESLint config
├── .prettierrc                # Prettier config
├── jsconfig.json              # JSDoc/IntelliSense
└── package.json
```

### Padrões de Código

#### ESLint
```bash
npm run lint        # Verificar
npm run lint:fix    # Corrigir automaticamente
npm run lint:stacks # Bloquear novas rotas fora do stack canonico
```

#### Prettier
```bash
npm run format      # Formatar código
```

### Stack Canonico (Governanca)

- HTTP routes: `src/api/routes`
- Migrations/schema: `src/db/migrations`
- Agents/personalizacao: `src/agents` + `src/services`
- Stacks deprecated (read-only): `src/scalable`, `src/platform`, `src/v2`

Mais detalhes em `docs/STACKS_GOVERNANCE.md`.

#### Commits
```bash
# Formato: type(scope): subject
git commit -m "feat(agents): add SDRAgent class"
git commit -m "fix(sheets): resolve sync timeout"
git commit -m "docs(architecture): update diagram"
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Testes (Próxima Fase)

```bash
npm test                    # Todos os testes
npm run test:unit           # Testes unitários
npm run test:integration    # Testes de integração
npm run test:e2e            # Testes end-to-end
npm run test:coverage       # Cobertura
```

---

## 🔄 Migração para V2.0

Estamos em processo de refatoração para uma arquitetura profissional.

### Status Atual
- ✅ **Planejamento** - 100%
- ✅ **Ferramentas** - 100%
- ✅ **Estrutura** - 100%
- 🟡 **Config Layer** - 40%
- ⏳ **Infraestrutura** - 0%
- ⏳ **Domínio** - 0%
- ⏳ **Core** - 0%

📊 **Progresso Detalhado:** [REFACTOR_PROGRESS.md](./REFACTOR_PROGRESS.md)

### Estratégia
- **Migração gradual** - Módulo por módulo
- **Coexistência** - Código antigo e novo funcionando juntos
- **Zero downtime** - Sistema não para durante migração
- **Testes first** - Criar testes antes de refatorar

---

## 🤝 Contribuindo

### Workflow

1. Crie uma branch: `git checkout -b feature/minha-feature`
2. Implemente seguindo padrões ESLint/Prettier
3. Adicione testes
4. Commit: `git commit -m "feat(scope): description"`
5. Push: `git push origin feature/minha-feature`
6. Abra Pull Request

### Code Review Checklist
- [ ] Código formatado (Prettier)
- [ ] Sem warnings (ESLint)
- [ ] JSDoc completo
- [ ] Testes passando
- [ ] Documentação atualizada

---

## 📊 Métricas

### Sistema Atual (V1)
- **Arquivos:** 119 arquivos JavaScript
- **Linhas de código:** ~15.000
- **Tamanho:** server.js (85KB), memory.js (41KB)
- **Testes:** 0% cobertura
- **Tech Debt:** Alto

### Meta (V2)
- **Arquivos:** ~150 arquivos (mais modulares)
- **Linhas por arquivo:** < 300 (média)
- **Cobertura de testes:** >= 80%
- **Tech Debt:** Baixo

---

## 🏆 Conquistas Recentes

- ✅ **Integração Google Sheets funcionando** 100%
- ✅ **Arquitetura V2.0 planejada** - Clean Architecture + DDD
- ✅ **Plano de migração completo** - 8 sprints detalhados
- ✅ **Ferramentas configuradas** - ESLint, Prettier, JSDoc
- ✅ **Estrutura criada** - 30+ diretórios organizados

---

## 🐛 Problemas Conhecidos

- ⚠️ 1 vulnerabilidade npm (high severity) - Em revisão
- ⚠️ Código V1 sem testes unitários
- ⚠️ server.js muito grande (85KB)

---

## 📞 Suporte

- **Issues:** https://github.com/seu-usuario/agent-js-starter/issues
- **Email:** contato@digitalboost.com.br
- **Docs:** Este README e arquivos .md na raiz

---

## 📄 Licença

Proprietary - Digital Boost © 2025

---

## 🙏 Agradecimentos

- **Sebrae** - Reconhecimento como Top 15 startups tech Brasil
- **OpenAI** - GPT-4o-mini e APIs
- **Evolution API** - Integração WhatsApp
- **Google** - Sheets e Calendar APIs

---

## 🚀 Roadmap

### Q4 2025
- [x] Sistema BANT completo
- [x] Google Sheets integração
- [ ] Arquitetura V2.0 (em progresso)
- [ ] Testes >= 80%

### Q1 2026
- [ ] Microserviços (opcional)
- [ ] Dashboard analytics avançado
- [ ] Multi-language support
- [ ] API pública documentada

---

**Desenvolvido com ❤️ pela Digital Boost em Natal/RN**

[![Digital Boost](https://img.shields.io/badge/Digital-Boost-blue)](https://digitalboost.com.br)
[![Natal/RN](https://img.shields.io/badge/Made%20in-Natal%2FRN-green)]()
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple)]()
