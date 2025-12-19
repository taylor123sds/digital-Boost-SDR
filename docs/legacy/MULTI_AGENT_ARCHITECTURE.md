# Arquitetura Multi-Agente para ORBION

**Data:** 2025-10-21
**Status:** 📋 Proposta de Arquitetura
**Objetivo:** Dividir ORBION em agentes especializados com funções específicas

---

## 🎯 Visão Geral

Transformar o ORBION monolítico em um **sistema multi-agente colaborativo**, onde cada agente tem uma especialização e trabalha em conjunto para oferecer uma experiência superior.

---

## 🏗️ Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                       │
│          (Coordena e roteia para agentes corretos)          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│   SALES      │   │  SUPPORT        │   │ SCHEDULER  │
│   AGENT      │   │  AGENT          │   │ AGENT      │
└──────────────┘   └─────────────────┘   └────────────┘
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│ QUALIFICATION│   │  DOCUMENT       │   │  RESEARCH  │
│ SPECIALIST   │   │  ANALYZER       │   │  AGENT     │
└──────────────┘   └─────────────────┘   └────────────┘
```

---

## 🤖 Agentes Especializados

### 1. **Orchestrator Agent** (Coordenador Principal)
**Função:** Roteamento inteligente de mensagens para o agente correto

**Responsabilidades:**
- Receber todas as mensagens via webhook
- Classificar intenção do usuário
- Rotear para agente especializado
- Consolidar respostas multi-agente
- Gerenciar contexto entre agentes

**Arquivo:** `src/agents/orchestrator_agent.js`

**Exemplo de Classificação:**
```javascript
{
  intent: 'sales_inquiry',      → Roteia para SALES AGENT
  intent: 'schedule_meeting',   → Roteia para SCHEDULER AGENT
  intent: 'support_question',   → Roteia para SUPPORT AGENT
  intent: 'document_uploaded',  → Roteia para DOCUMENT ANALYZER
}
```

---

### 2. **Sales Agent** (Vendas e Qualificação)
**Função:** Qualificação BANT e condução de pipeline de vendas

**Responsabilidades:**
- Executar fluxo BANT consultivo
- Detectar arquétipos comportamentais
- Aplicar técnicas de persuasão
- Identificar objeções e contorná-las
- Escalar para agendamento quando qualificado (80%+)

**Arquivo:** `src/agents/sales_agent.js`

**Ferramentas que utiliza:**
- `bant_unified.js` - Framework BANT
- `archetypes.js` - Detecção de perfil
- `objection_handler.js` - Tratamento de objeções
- `persuasion_framework.js` - Técnicas persuasivas
- `lead_scoring_system.js` - Score de qualificação

**Handoff para outros agentes:**
- Score >= 80% → `SCHEDULER AGENT` (agendar reunião)
- Pergunta técnica → `SUPPORT AGENT` (esclarecer dúvida)
- Necessita pesquisa → `RESEARCH AGENT` (buscar informações)

---

### 3. **Support Agent** (Suporte e Informações)
**Função:** Responder dúvidas técnicas e fornecer informações sobre produtos/serviços

**Responsabilidades:**
- Responder perguntas sobre Growth Marketing, Sites, Audiovisual
- Consultar knowledge base (RAG)
- Explicar conceitos de forma didática
- Fornecer exemplos práticos
- Retornar para SALES AGENT após esclarecer dúvida

**Arquivo:** `src/agents/support_agent.js`

**Ferramentas que utiliza:**
- `search_knowledge.js` - RAG para docs internos
- `research_agent.js` - Pesquisa externa se necessário
- `digital_boost_explainer.js` - Explicações sobre a empresa

**Exemplo de fluxo:**
```
Lead: "O que é growth marketing?"
ORCHESTRATOR → SUPPORT AGENT
SUPPORT: Explica conceito + retorna contexto
ORCHESTRATOR → SALES AGENT (retoma qualificação)
SALES: "Faz sentido pra vocês essa linha?"
```

---

### 4. **Scheduler Agent** (Agendamento de Reuniões)
**Função:** Gerenciar agendamentos de reuniões com leads qualificados

**Responsabilidades:**
- Propor horários disponíveis
- Confirmar presença
- Sincronizar com Google Calendar
- Enviar lembretes
- Reagendar se necessário

**Arquivo:** `src/agents/scheduler_agent.js`

**Ferramentas que utiliza:**
- `meeting_scheduler.js` - Lógica de agendamento
- `calendar_google.js` - Integração Google Calendar
- `meeting_state_manager.js` - Estado das reuniões

**Critério de ativação:**
- Lead com score BANT >= 80%
- Timing = "urgente" ou "1-2 semanas"
- Explicitamente solicitou agendamento

---

### 5. **Document Analyzer Agent** (Análise de Documentos)
**Função:** Processar e analisar documentos/mídias enviados pelo WhatsApp

**Responsabilidades:**
- Analisar PDFs, imagens, áudios, vídeos
- Extrair informações relevantes
- Transcrever áudios (Whisper)
- Resumir conteúdo
- Identificar action items

**Arquivo:** `src/agents/document_analyzer_agent.js` (já existe como `multi_agent_processor.js`)

**Ferramentas que utiliza:**
- `document_analyzer.js` - Parser de documentos
- `audio.js` - Transcrição Whisper + TTS
- `research_agent.js` - Contexto adicional

**Fluxo existente (já implementado):**
```
1. Recebe documento
2. Analisa conteúdo (Agente 3)
3. Pesquisa contexto (Agente 2)
4. Gera resposta integrada (ORBION)
```

---

### 6. **Qualification Specialist** (Sub-agente de Vendas)
**Função:** Especialista em extrair informações BANT de forma sutil

**Responsabilidades:**
- Fazer perguntas consultivas sem ser invasivo
- Detectar sinais implícitos (budget, authority, need, timing)
- Reformular respostas evasivas
- Aplicar estratégias por arquétipo

**Arquivo:** `src/agents/qualification_specialist.js`

**Ferramentas que utiliza:**
- `consultive_approach.js` - Perguntas consultivas
- `emotion_detector.js` - Detectar resistência
- `urgency_detector.js` - Identificar timing

**Exemplo:**
```
Lead: "Tá caro"
QUALIFICATION SPECIALIST detecta: Objeção de budget
Estratégia: Reformular valor antes de revelar preço
Resposta: "Entendo. O que vocês consideram um investimento justo
pra resolver [DOR]? Assim ajusto a proposta."
```

---

### 7. **Research Agent** (Pesquisa Avançada)
**Função:** Buscar informações externas para enriquecer conversas

**Responsabilidades:**
- Pesquisar tendências de mercado
- Buscar informações sobre setor do lead
- Encontrar cases de sucesso
- Validar informações técnicas

**Arquivo:** `src/agents/research_agent.js` (já existe)

**Ferramentas que utiliza:**
- API de pesquisa (Google, Bing, etc)
- Web scraping controlado
- Banco de conhecimento externo

---

## 📋 Tabela Comparativa de Agentes

| Agente | Especialização | Ferramentas Principais | Handoff Para |
|--------|----------------|------------------------|--------------|
| **Orchestrator** | Roteamento | Intent classification | Todos |
| **Sales Agent** | Qualificação BANT | bant_unified, archetypes | Scheduler, Support |
| **Support Agent** | Informações | search_knowledge, RAG | Sales (retorno) |
| **Scheduler Agent** | Agendamento | calendar_google | Sales (confirmação) |
| **Document Analyzer** | Análise de mídia | document_analyzer, Whisper | Sales (contexto) |
| **Qualification Specialist** | Extração BANT | consultive_approach | Sales (dados) |
| **Research Agent** | Pesquisa externa | APIs de busca | Sales, Support |

---

## 🔄 Fluxo de Exemplo Completo

### Cenário: Lead envia "Quero crescer minha marca"

```
1. ORCHESTRATOR recebe mensagem
   ↓ Classifica: intent = 'sales_inquiry'

2. SALES AGENT assume
   ↓ Estado: opening → need
   ↓ Pergunta: "Como tem sido o crescimento da marca ultimamente?"

3. Lead: "Tá devagar, precisamos de ajuda com marketing digital"
   ↓ SALES detecta: need = "crescimento devagar"
   ↓ Avança: need → budget

4. Lead: "Quanto custa?"
   ↓ SALES detecta: objeção prematura de budget
   ↓ Handoff: QUALIFICATION SPECIALIST

5. QUALIFICATION SPECIALIST reformula
   ↓ "Antes de falar de valores, me conta: se nada mudasse
      nos próximos 6 meses, qual o impacto pra empresa?"

6. Lead: "Perderíamos muito mercado, é crítico"
   ↓ QUALIFICATION coleta: timing = "urgente"
   ↓ Retorna: SALES AGENT com dados

7. SALES avança: budget → authority
   ↓ "Legal! Quem mais costuma participar quando decidem
      investimentos em marketing?"

8. Lead: "Sou eu que decido, sou o dono"
   ↓ SALES coleta: authority = "decisor direto"
   ↓ Score = 85% (BANT quase completo)

9. SALES detecta: Lead qualificado
   ↓ Handoff: SCHEDULER AGENT

10. SCHEDULER propõe horários
    ↓ "Ótimo! Vamos agendar uma conversa estratégica.
       Você prefere terça às 10h ou quinta às 15h?"

11. Lead: "Terça às 10h tá ótimo"
    ↓ SCHEDULER cria evento no Google Calendar
    ↓ Envia confirmação

12. ORCHESTRATOR finaliza
    ↓ Salva toda interação no histórico
    ↓ Atualiza score do lead
```

---

## 🛠️ Implementação Técnica

### Estrutura de Pastas Proposta:

```
src/
├── agents/
│   ├── orchestrator_agent.js       ← NOVO: Roteamento principal
│   ├── sales_agent.js              ← NOVO: Qualificação BANT
│   ├── support_agent.js            ← NOVO: Suporte e informações
│   ├── scheduler_agent.js          ← NOVO: Agendamento
│   ├── qualification_specialist.js ← NOVO: Especialista BANT
│   ├── document_analyzer_agent.js  ← Renomear multi_agent_processor.js
│   └── research_agent.js           ← Já existe em tools/
│
├── tools/                          ← Ferramentas reutilizáveis
│   ├── bant_unified.js
│   ├── archetypes.js
│   ├── consultive_approach.js
│   └── ... (demais tools)
│
└── handlers/                       ← Handlers HTTP
    ├── webhook_handler.js
    ├── response_manager.js
    └── ... (demais handlers)
```

---

## 📝 Protocolo de Comunicação entre Agentes

### Formato de Mensagem Inter-Agente:

```javascript
{
  from: 'sales_agent',
  to: 'scheduler_agent',
  action: 'schedule_meeting',
  context: {
    leadPhone: '5511999999999',
    leadName: 'João Silva',
    bantData: {
      need: 'crescimento devagar',
      budget: 'R$ 5-10k/mês',
      authority: 'decisor direto',
      timing: 'urgente'
    },
    qualificationScore: 85,
    archetype: 'PRAGMATICO'
  },
  metadata: {
    timestamp: '2025-10-21T01:30:00Z',
    conversationId: 'conv_12345'
  }
}
```

---

## 🎯 Vantagens da Arquitetura Multi-Agente

### ✅ **Especialização**
Cada agente foca em uma tarefa específica e se torna expert nela

### ✅ **Escalabilidade**
Fácil adicionar novos agentes sem afetar os existentes

### ✅ **Manutenibilidade**
Código mais organizado, bugs mais fáceis de identificar

### ✅ **Testabilidade**
Cada agente pode ser testado isoladamente

### ✅ **Performance**
Agentes podem trabalhar em paralelo quando necessário

### ✅ **Flexibilidade**
Fácil alterar comportamento de um agente sem impactar outros

---

## 🚀 Roadmap de Implementação

### Fase 1: Estrutura Base (1 semana)
- [ ] Criar `orchestrator_agent.js` (roteamento básico)
- [ ] Refatorar `agent.js` → `sales_agent.js`
- [ ] Mover `multi_agent_processor.js` → `document_analyzer_agent.js`
- [ ] Criar protocolo de comunicação inter-agente

### Fase 2: Agentes Principais (2 semanas)
- [ ] Implementar `support_agent.js`
- [ ] Implementar `scheduler_agent.js`
- [ ] Integrar agentes com orchestrator
- [ ] Testar handoffs entre agentes

### Fase 3: Especialistas (1 semana)
- [ ] Implementar `qualification_specialist.js`
- [ ] Otimizar `research_agent.js`
- [ ] Adicionar lógica de fallback

### Fase 4: Otimização (1 semana)
- [ ] Implementar cache de decisões
- [ ] Adicionar métricas por agente
- [ ] Dashboard de performance por agente
- [ ] Testes end-to-end

---

## 📊 Métricas por Agente

### SALES AGENT
- Taxa de qualificação BANT completa
- Tempo médio para completar BANT
- Score médio de leads
- Taxa de conversão para agendamento

### SUPPORT AGENT
- Taxa de resolução de dúvidas
- Tempo médio de resposta
- Satisfação (via feedback implícito)

### SCHEDULER AGENT
- Taxa de agendamento concluído
- Taxa de no-show
- Tempo médio de negociação de horário

### DOCUMENT ANALYZER
- Tipos de documentos processados
- Taxa de transcrição bem-sucedida (áudio)
- Tempo médio de processamento

---

## 🔧 Exemplo de Código: Orchestrator Agent

```javascript
// src/agents/orchestrator_agent.js

import { classifyIntent } from './intent_classifier.js';
import SalesAgent from './sales_agent.js';
import SupportAgent from './support_agent.js';
import SchedulerAgent from './scheduler_agent.js';
import DocumentAnalyzerAgent from './document_analyzer_agent.js';

export class OrchestratorAgent {
  constructor() {
    this.agents = {
      sales: new SalesAgent(),
      support: new SupportAgent(),
      scheduler: new SchedulerAgent(),
      documentAnalyzer: new DocumentAnalyzerAgent()
    };

    this.activeConversations = new Map();
  }

  async processMessage(message, context) {
    const { fromContact, text, media } = message;

    // 1. Recuperar agente ativo para este contato
    let activeAgent = this.activeConversations.get(fromContact);

    // 2. Se tem mídia, sempre vai para DocumentAnalyzer
    if (media) {
      const result = await this.agents.documentAnalyzer.process(message, context);

      // Após análise, retorna para agente anterior ou inicia Sales
      activeAgent = activeAgent || 'sales';
      this.activeConversations.set(fromContact, activeAgent);

      return result;
    }

    // 3. Classificar intenção se não tem agente ativo
    if (!activeAgent) {
      const intent = await classifyIntent(text, context);
      activeAgent = this.routeByIntent(intent);
      this.activeConversations.set(fromContact, activeAgent);
    }

    // 4. Processar com agente ativo
    const agent = this.agents[activeAgent];
    const result = await agent.process(message, context);

    // 5. Verificar se precisa de handoff
    if (result.handoff) {
      const targetAgent = result.handoff.to;
      this.activeConversations.set(fromContact, targetAgent);

      // Processar com novo agente
      return await this.agents[targetAgent].process(message, {
        ...context,
        handoffData: result.handoff.data
      });
    }

    return result;
  }

  routeByIntent(intent) {
    const intentMap = {
      'sales_inquiry': 'sales',
      'product_question': 'support',
      'schedule_meeting': 'scheduler',
      'general_question': 'support',
      'pricing_question': 'sales'
    };

    return intentMap[intent] || 'sales'; // Default: sales
  }
}
```

---

## 🎯 Próximos Passos

1. **Validar Arquitetura** - Revisar proposta com stakeholders
2. **Priorizar Agentes** - Decidir quais implementar primeiro
3. **Criar Protótipo** - Implementar Orchestrator + Sales Agent
4. **Testar MVP** - Validar com conversas reais
5. **Expandir Gradualmente** - Adicionar agentes conforme necessidade

---

## 💡 Considerações Finais

**Esta arquitetura é:**
- ✅ **Escalável** - Fácil adicionar novos agentes
- ✅ **Modular** - Cada agente é independente
- ✅ **Testável** - Agentes podem ser testados isoladamente
- ✅ **Evolutiva** - Pode começar simples e crescer

**Compatível com:**
- Sistema BANT existente
- Ferramentas atuais (archetypes, persuasion, etc)
- Integrações (WhatsApp, Google Calendar, Sheets)

**Requer:**
- Refatoração gradual do código atual
- Definição clara de responsabilidades
- Protocolo de comunicação entre agentes
- Testes end-to-end

---

**Status**: 📋 Proposta pronta para implementação
**Próxima ação**: Decidir se implementa e qual prioridade dos agentes
