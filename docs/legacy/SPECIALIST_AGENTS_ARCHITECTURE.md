# Arquitetura Multi-Agente por Especialização de Serviço

**Data:** 2025-10-21
**Versão:** 2.0 - Agentes Especialistas por Serviço
**Objetivo:** Dividir ORBION em agentes especialistas (Growth, Sites, Audiovisual) que conversam entre si

---

## 🎯 Conceito Central

Cada **serviço da Digital Boost** tem seu próprio **agente especialista**:

1. 🚀 **Growth Marketing Agent** - Expert em estratégias de crescimento
2. 💻 **Sites Agent** - Expert em desenvolvimento web e performance
3. 🎥 **Audiovisual Agent** - Expert em produção de vídeo e storytelling

Todos se comunicam via **Agent Hub** (centro de comunicação) e podem **transferir leads** entre si.

---

## 🏗️ Arquitetura Visual

```
                    ┌─────────────────────────┐
                    │     AGENT HUB           │
                    │  (Centro de Comunicação)│
                    │  - Roteamento           │
                    │  - Handoffs             │
                    │  - Contexto compartilhado│
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐   ┌──────────▼─────────┐   ┌────────▼───────┐
│  GROWTH        │   │   SITES            │   │  AUDIOVISUAL   │
│  MARKETING     │◄──┤   AGENT            │──►│  AGENT         │
│  AGENT         │   │                    │   │                │
└────────────────┘   └────────────────────┘   └────────────────┘
     │                        │                        │
     └────────────────────────┴────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  AGENTES SUPORTE  │
                    │  - Scheduler      │
                    │  - Document       │
                    │  - Research       │
                    └───────────────────┘
```

---

## 🤖 Agentes Especialistas por Serviço

### 1. 🚀 Growth Marketing Agent

**Especialização:** Estratégias de crescimento, marketing digital, previsibilidade de vendas

**Conhecimento Profundo:**
- Funis de conversão e otimização
- Estratégias de Growth Hacking
- Marketing de conteúdo e SEO
- Automações de marketing
- Analytics e métricas de crescimento
- Testes A/B e experimentação
- CRM e automação de vendas

**Pain Points que resolve:**
- Crescimento lento ou estagnado
- Falta de previsibilidade nas vendas
- Dependência excessiva de mídia paga
- Dificuldade em converter público em cliente

**Perguntas BANT específicas:**
```javascript
need: "Qual a maior dificuldade com crescimento hoje: atrair, converter ou reter?"
budget: "Vocês têm uma verba recorrente pra marketing ou é por projeto?"
authority: "Quem participa das decisões de estratégia de crescimento?"
timing: "Quando vocês precisam ver resultados? Tá urgente?"
```

**Quando transfere para outros agentes:**
- Lead menciona "site lento" → 💻 **Sites Agent**
- Lead pergunta "preciso de vídeos" → 🎥 **Audiovisual Agent**
- Lead qualificado (80%+) → 📅 **Scheduler Agent**

**Arquivo:** `src/agents/specialists/growth_marketing_agent.js`

---

### 2. 💻 Sites Agent

**Especialização:** Desenvolvimento web, performance, UX/UI, SEO técnico

**Conhecimento Profundo:**
- Arquitetura de sites de alta performance
- UX/UI e design de conversão
- SEO técnico e otimização
- Core Web Vitals
- E-commerce e vendas online
- Landing pages otimizadas
- Integrações técnicas (CRM, Analytics, etc)

**Pain Points que resolve:**
- Site institucional que não gera vendas
- Site lento ou desatualizado
- Baixo posicionamento no Google
- Perda de leads por má estrutura
- Mobile não responsivo

**Perguntas BANT específicas:**
```javascript
need: "O site atual tá convertendo bem ou tá mais como um cartão de visitas?"
budget: "Já tem ideia de investimento pra site ou ainda tá explorando?"
authority: "Quem toma decisão sobre tecnologia e design no time de vocês?"
timing: "Precisam de site urgente ou dá pra planejar melhor?"
```

**Quando transfere para outros agentes:**
- Lead menciona "estratégia de marketing" → 🚀 **Growth Marketing Agent**
- Lead pergunta "vídeos pro site" → 🎥 **Audiovisual Agent**
- Lead qualificado (80%+) → 📅 **Scheduler Agent**

**Arquivo:** `src/agents/specialists/sites_agent.js`

---

### 3. 🎥 Audiovisual Agent

**Especialização:** Produção de vídeo, storytelling, conteúdo visual

**Conhecimento Profundo:**
- Produção de vídeos institucionais
- Vídeos para redes sociais (Reels, TikTok, YouTube)
- Storytelling visual
- Animações e motion graphics
- Vídeos publicitários
- Edição e pós-produção
- Estratégia de conteúdo visual

**Pain Points que resolve:**
- Falta de autoridade da marca
- Dificuldade em gerar conexão com público
- Material antigo ou genérico
- Baixo engajamento em campanhas
- Necessidade de humanizar a marca

**Perguntas BANT específicas:**
```javascript
need: "Vocês já produzem vídeo hoje ou tá tudo parado nisso?"
budget: "Vídeos podem variar muito de valor. Tá pensando em algo pontual ou recorrente?"
authority: "Quem costuma aprovar conteúdo criativo e vídeos aí?"
timing: "Tem alguma campanha ou lançamento vindo? Qual a urgência?"
```

**Quando transfere para outros agentes:**
- Lead menciona "estratégia pra divulgar vídeos" → 🚀 **Growth Marketing Agent**
- Lead pergunta "onde hospedar vídeos no site" → 💻 **Sites Agent**
- Lead qualificado (80%+) → 📅 **Scheduler Agent**

**Arquivo:** `src/agents/specialists/audiovisual_agent.js`

---

## 🔄 Agent Hub - Centro de Comunicação

**Função:** Coordenar todos os agentes e gerenciar handoffs

**Responsabilidades:**
1. **Roteamento Inteligente**
   - Detectar serviço de interesse do lead
   - Rotear para agente especialista correto

2. **Gestão de Handoffs**
   - Transferir lead entre agentes
   - Preservar contexto completo (BANT, arquétipo, histórico)
   - Notificar agentes sobre transferências

3. **Contexto Compartilhado**
   - Manter histórico unificado
   - Sincronizar informações BANT entre agentes
   - Evitar perguntas repetidas

4. **Orquestração de Respostas**
   - Combinar insights de múltiplos agentes
   - Gerar respostas colaborativas
   - Detectar oportunidades de cross-sell

**Arquivo:** `src/agents/agent_hub.js`

---

## 📋 Protocolo de Comunicação entre Agentes

### Formato de Mensagem Inter-Agente:

```javascript
{
  messageType: 'AGENT_HANDOFF',
  from: 'growth_marketing_agent',
  to: 'sites_agent',
  timestamp: '2025-10-21T01:30:00Z',

  leadData: {
    phone: '5511999999999',
    name: 'João Silva',
    company: 'Tech Startup LTDA'
  },

  conversationContext: {
    currentStage: 'need',
    bantData: {
      need: 'crescimento lento, site não converte',
      budget: 'R$ 10-15k/mês',
      authority: 'decisor direto (CEO)',
      timing: 'urgente (2-4 semanas)'
    },
    qualificationScore: 65,
    archetype: 'PRAGMATICO',
    conversationHistory: [
      { role: 'user', message: 'Preciso crescer minha marca' },
      { role: 'growth_agent', message: 'Como tem sido o crescimento?' }
    ]
  },

  handoffReason: 'LEAD_MENTIONED_SITE_ISSUE',
  handoffContext: {
    trigger: 'Lead mencionou: "site lento, não converte"',
    suggestedAction: 'Aprofundar em problemas técnicos do site',
    returnCondition: 'Após esclarecer questões técnicas, retornar para estratégia geral'
  },

  metadata: {
    conversationId: 'conv_12345',
    sessionId: 'sess_67890',
    handoffCount: 1
  }
}
```

---

## 🔀 Cenários de Handoff (Transferência)

### Cenário 1: Lead com múltiplos interesses

**Situação:** Lead quer Growth + Site

```
Lead: "Preciso de marketing digital e refazer meu site"
  ↓
AGENT HUB detecta: 2 serviços mencionados
  ↓
Estratégia: Começar com o que é mais urgente
  ↓
HUB: "Legal! Deixa eu te perguntar: o que tá travando mais hoje -
      a estratégia de crescimento ou o site em si?"
  ↓
Lead: "O site tá muito lento, perco muita gente"
  ↓
AGENT HUB roteia: SITES AGENT (prioridade)
  ↓
SITES AGENT qualifica problema técnico
  ↓
Após coletar Need sobre site → Transfer para GROWTH AGENT
  ↓
GROWTH AGENT completa BANT considerando ambos serviços
```

---

### Cenário 2: Descoberta de necessidade adicional durante conversa

**Situação:** Lead começou com Growth, mas precisa de Audiovisual

```
GROWTH AGENT: "Vocês já têm conteúdo visual ou tá tudo parado?"
  ↓
Lead: "Não, a gente precisa urgente de vídeos pro Instagram"
  ↓
GROWTH AGENT detecta: nova necessidade (audiovisual)
  ↓
GROWTH envia mensagem ao HUB:
{
  messageType: 'REQUEST_SPECIALIST_INPUT',
  specialist: 'audiovisual_agent',
  question: 'Lead precisa de vídeos para Instagram - urgente'
}
  ↓
AUDIOVISUAL AGENT entra na conversa
  ↓
AUDIOVISUAL: "Entendi que vocês precisam de vídeos pro Instagram.
               Que tipo de conteúdo faria sentido pra vocês?"
  ↓
Lead responde sobre vídeos...
  ↓
AUDIOVISUAL coleta Need sobre audiovisual
  ↓
AUDIOVISUAL retorna contexto para GROWTH:
{
  messageType: 'SPECIALIST_RESPONSE',
  audiovisualNeed: 'vídeos curtos para Instagram Reels',
  estimatedBudget: 'R$ 3-5k/mês',
  urgency: 'alta'
}
  ↓
GROWTH AGENT integra ambas necessidades:
"Entendi! Então vocês precisam de:
 1️⃣ Estratégia de growth pra escalar
 2️⃣ Vídeos pro Instagram

 Faz sentido começarmos com um plano integrado?"
```

---

### Cenário 3: Cross-sell identificado

**Situação:** Lead quer só Site, mas Growth detecta oportunidade

```
Lead: "Preciso de um site novo"
  ↓
AGENT HUB: SITES AGENT assume
  ↓
SITES AGENT: "O site atual não tá convertendo bem?"
  ↓
Lead: "Não, tenho pouquíssimo tráfego"
  ↓
SITES AGENT detecta: problema não é técnico, é de tráfego
  ↓
SITES consulta GROWTH AGENT via HUB:
{
  messageType: 'REQUEST_CROSS_SELL_OPINION',
  situation: 'Site tecnicamente ok, mas zero tráfego',
  suggestedAction: 'Growth Marketing pode resolver melhor'
}
  ↓
GROWTH AGENT entra:
"Interessante! O site pode até ser refeito, mas pelo que você
 trouxe, parece que o maior desafio é trazer gente, né?

 Podemos pensar numa estratégia integrada: site otimizado +
 growth pra trazer tráfego qualificado. Faz sentido?"
  ↓
Lead: "Sim, faz sentido!"
  ↓
Ambos agentes colaboram na qualificação
```

---

## 💬 Exemplos de Respostas Colaborativas

### Resposta combinando 2 agentes (Growth + Sites):

```
GROWTH + SITES (via HUB):

"Pelo que você trouxe, vejo duas oportunidades claras:

🚀 *Growth Marketing*
Criar estratégias pra trazer tráfego qualificado e previsível,
sem depender só de mídia paga.

💻 *Novo Site*
Refazer a arquitetura pra converter melhor e ser mais rápido.

A gente pode começar com um diagnóstico gratuito dos dois pontos
pra você ter clareza de onde atacar primeiro. Topa?"
```

---

### Resposta combinando 3 agentes (Growth + Sites + Audiovisual):

```
GROWTH + SITES + AUDIOVISUAL (via HUB):

"Show! Vejo que vocês precisam de uma transformação digital completa.

Pelo que entendi, os pontos são:
🚀 Estratégia de crescimento escalável
💻 Site que venda 24/7
🎥 Vídeos pra gerar conexão

A Digital Boost tem uma abordagem integrada exatamente pra isso.

Posso montar um plano customizado considerando os 3 pilares?
Te envio em 24h pra você avaliar, sem custo."
```

---

## 🧠 Base de Conhecimento por Agente

### Growth Marketing Agent - Conhecimento:
```javascript
{
  frameworks: [
    'Funil AARRR (Pirate Metrics)',
    'Growth Loops',
    'Jobs to be Done',
    'Value Proposition Canvas'
  ],

  strategies: [
    'Content Marketing',
    'SEO orgânico',
    'Email Marketing automation',
    'Social Media orgânico',
    'Partnerships & Co-marketing',
    'Referral programs',
    'Community building'
  ],

  tools: [
    'Google Analytics',
    'Hotjar/Clarity',
    'RD Station/HubSpot',
    'Kommo CRM',
    'Meta Business Suite',
    'Google Search Console'
  ],

  metrics: [
    'CAC (Customer Acquisition Cost)',
    'LTV (Lifetime Value)',
    'Taxa de conversão por funil',
    'Churn rate',
    'NPS',
    'MRR/ARR'
  ]
}
```

### Sites Agent - Conhecimento:
```javascript
{
  technologies: [
    'React/Next.js',
    'WordPress otimizado',
    'Shopify (e-commerce)',
    'Webflow',
    'Jamstack architecture'
  ],

  optimizations: [
    'Core Web Vitals (LCP, FID, CLS)',
    'Image optimization (WebP, lazy loading)',
    'Code splitting',
    'CDN configuration',
    'Caching strategies',
    'Mobile-first design'
  ],

  seo: [
    'Structured data (Schema.org)',
    'Meta tags otimizadas',
    'XML Sitemaps',
    'Robots.txt',
    'Canonical URLs',
    'Internal linking strategy'
  ],

  conversion: [
    'A/B testing',
    'Heatmaps',
    'CTA optimization',
    'Form optimization',
    'Social proof',
    'Trust signals'
  ]
}
```

### Audiovisual Agent - Conhecimento:
```javascript
{
  formats: [
    'Vídeos institucionais',
    'Reels/TikTok (vertical 9:16)',
    'YouTube (horizontal 16:9)',
    'Stories',
    'Animações/Motion graphics',
    'Vídeos publicitários',
    'Testimonials de clientes'
  ],

  storytelling: [
    'Hero\'s Journey',
    'Problem-Agitate-Solve',
    'Before-After-Bridge',
    'Feature-Advantage-Benefit',
    'Emotional hooks'
  ],

  production: [
    'Roteirização',
    'Storyboarding',
    'Direção de fotografia',
    'Edição e pós-produção',
    'Motion graphics',
    'Sound design',
    'Color grading'
  ],

  distribution: [
    'YouTube SEO',
    'Instagram/TikTok best practices',
    'LinkedIn video strategy',
    'Video ads (Meta, Google)',
    'Email video marketing',
    'Video landing pages'
  ]
}
```

---

## 📊 Métricas por Agente Especialista

### Growth Marketing Agent
- Leads qualificados no funil de growth
- Taxa de conversão para diagnóstico de growth
- Score médio BANT (growth)
- Handoffs realizados (para Sites/Audiovisual)
- Cross-sells identificados

### Sites Agent
- Leads qualificados no funil de sites
- Problemas técnicos identificados (performance, SEO, etc)
- Score médio BANT (sites)
- Handoffs realizados (para Growth/Audiovisual)

### Audiovisual Agent
- Leads qualificados no funil de audiovisual
- Tipos de conteúdo mais demandados
- Score médio BANT (audiovisual)
- Handoffs realizados (para Growth/Sites)

### Agent Hub
- Total de handoffs por dia
- Handoffs bem-sucedidos vs. falhados
- Tempo médio de handoff
- Respostas colaborativas geradas
- Cross-sells concretizados

---

## 🛠️ Estrutura de Arquivos

```
src/
├── agents/
│   ├── agent_hub.js                 ← Hub de comunicação central
│   │
│   ├── specialists/                 ← Agentes especialistas
│   │   ├── growth_marketing_agent.js
│   │   ├── sites_agent.js
│   │   └── audiovisual_agent.js
│   │
│   ├── support/                     ← Agentes de suporte
│   │   ├── scheduler_agent.js
│   │   ├── document_analyzer_agent.js
│   │   └── research_agent.js
│   │
│   └── shared/                      ← Código compartilhado
│       ├── base_agent.js            ← Classe base para todos agentes
│       ├── agent_communication.js   ← Protocolo de comunicação
│       └── handoff_manager.js       ← Gerenciador de transferências
│
├── knowledge/                       ← Base de conhecimento
│   ├── growth_marketing_kb.js
│   ├── sites_kb.js
│   └── audiovisual_kb.js
│
└── config/
    └── agent_routing_rules.js       ← Regras de roteamento
```

---

## 🚀 Implementação: Código Base

### 1. Base Agent Class (Classe Base)

```javascript
// src/agents/shared/base_agent.js

export class BaseAgent {
  constructor(specialty, knowledgeBase) {
    this.specialty = specialty;
    this.knowledgeBase = knowledgeBase;
    this.hub = null; // Será injetado
  }

  // Método principal de processamento
  async process(message, context) {
    throw new Error('Método process() deve ser implementado pelo agente especialista');
  }

  // Solicitar transferência para outro agente
  async requestHandoff(targetAgent, reason, context) {
    if (!this.hub) {
      throw new Error('Agent Hub não configurado');
    }

    return await this.hub.handoff({
      from: this.specialty,
      to: targetAgent,
      reason,
      context
    });
  }

  // Solicitar opinião de outro agente (sem transferir)
  async consultAgent(targetAgent, question, context) {
    if (!this.hub) {
      throw new Error('Agent Hub não configurado');
    }

    return await this.hub.requestConsultation({
      from: this.specialty,
      to: targetAgent,
      question,
      context
    });
  }

  // Detectar se precisa de outro agente
  detectCrossSellOpportunity(userMessage, context) {
    // Implementado por cada agente especialista
    return null;
  }

  // Gerar resposta consultiva baseada no conhecimento
  async generateResponse(userMessage, bantStage, context) {
    // Implementado por cada agente especialista
    throw new Error('Método generateResponse() deve ser implementado');
  }
}
```

---

### 2. Growth Marketing Agent (Exemplo Completo)

```javascript
// src/agents/specialists/growth_marketing_agent.js

import { BaseAgent } from '../shared/base_agent.js';
import { BANTUnifiedSystem } from '../../tools/bant_unified.js';
import { CONSULTIVE_QUESTIONS } from '../../config/consultive_approach.js';
import growthKnowledgeBase from '../../knowledge/growth_marketing_kb.js';

export class GrowthMarketingAgent extends BaseAgent {
  constructor() {
    super('growth_marketing', growthKnowledgeBase);
    this.bantSystem = new BANTUnifiedSystem();
  }

  async process(message, context) {
    const { text, fromContact } = message;

    console.log(`🚀 [GROWTH AGENT] Processando: "${text}"`);

    // 1. Detectar se precisa transferir para outro agente
    const crossSell = this.detectCrossSellOpportunity(text, context);

    if (crossSell) {
      console.log(`🔄 [GROWTH AGENT] Cross-sell detectado: ${crossSell.targetAgent}`);
      return await this.requestHandoff(crossSell.targetAgent, crossSell.reason, context);
    }

    // 2. Processar BANT específico de Growth
    const bantResult = await this.bantSystem.processMessage(text, context.history);

    // 3. Gerar resposta consultiva focada em Growth
    const response = await this.generateResponse(text, bantResult.stage, {
      ...context,
      bantData: bantResult.collectedInfo,
      archetype: bantResult.archetype
    });

    return {
      success: true,
      agent: 'growth_marketing',
      response,
      bantData: bantResult.collectedInfo,
      qualificationScore: bantResult.qualificationScore,
      nextAction: bantResult.qualificationScore >= 80 ? 'SCHEDULE_MEETING' : 'CONTINUE_QUALIFICATION'
    };
  }

  detectCrossSellOpportunity(userMessage, context) {
    const lowerMsg = userMessage.toLowerCase();

    // Detectar menção a SITES
    if (lowerMsg.match(/site|website|página|landing|portal|web|lento|carrega/i)) {
      return {
        targetAgent: 'sites',
        reason: 'Lead mencionou problemas/necessidades relacionadas a site',
        trigger: userMessage
      };
    }

    // Detectar menção a AUDIOVISUAL
    if (lowerMsg.match(/vídeo|video|filmagem|gravação|edição|animação|reels|tiktok|youtube/i)) {
      return {
        targetAgent: 'audiovisual',
        reason: 'Lead mencionou necessidade de conteúdo audiovisual',
        trigger: userMessage
      };
    }

    return null;
  }

  async generateResponse(userMessage, bantStage, context) {
    const { bantData, archetype } = context;

    // Usar perguntas consultivas de Growth Marketing
    const questions = CONSULTIVE_QUESTIONS.need.growth_marketing;

    // Selecionar pergunta baseada no estágio BANT
    let question = '';

    switch (bantStage) {
      case 'need':
        question = questions[0]; // "Como tem sido o crescimento da marca ultimamente?"
        break;
      case 'budget':
        question = "Vocês já têm uma verba fixa pra marketing ou decidem conforme o projeto?";
        break;
      case 'authority':
        question = "Quem mais costuma participar quando decidem investimentos em marketing?";
        break;
      case 'timing':
        question = "Quando vocês precisam ver resultados? Tá urgente?";
        break;
      default:
        question = questions[0];
    }

    return question;
  }
}
```

---

## 🎯 Exemplo de Fluxo Completo com 3 Agentes

### Lead: "Preciso de marketing digital, site novo e vídeos pro Instagram"

```
1. AGENT HUB recebe mensagem
   ↓ Detecta 3 serviços mencionados: Growth + Sites + Audiovisual

2. HUB decide prioridade: Perguntar qual é mais urgente
   ↓
   HUB: "Legal! Vi que vocês precisam de várias coisas.
         Pra eu direcionar melhor, qual tá travando mais hoje:
         a estratégia de marketing, o site ou os vídeos?"

3. Lead: "O site, ele tá muito ruim"
   ↓
   HUB roteia: SITES AGENT assume (prioridade)

4. SITES AGENT qualifica necessidade de site
   ↓
   SITES: "O que mais incomoda no site atual? Performance, design, ou vendas?"

5. Lead: "É lento e não vende nada"
   ↓
   SITES coleta: need_sites = "lento + não converte"
   ↓
   SITES detecta: problema de conversão → pode ser Growth também

6. SITES consulta GROWTH AGENT (via HUB)
   ↓
   {
     messageType: 'REQUEST_CONSULTATION',
     from: 'sites_agent',
     to: 'growth_agent',
     question: 'Lead tem site lento + não converte. Pode ser estratégia?'
   }

7. GROWTH responde consulta
   ↓
   {
     response: 'Sim, site pode estar ok tecnicamente mas sem tráfego qualificado'
   }

8. SITES + GROWTH geram resposta COLABORATIVA (via HUB)
   ↓
   "Entendi! Vejo dois pontos aqui:

    💻 *Site* - Precisa ser mais rápido e otimizado pra conversão
    🚀 *Growth* - Estratégias pra trazer tráfego qualificado

    Faz sentido pensarmos nos dois juntos?"

9. Lead: "Sim! E os vídeos?"
   ↓
   AUDIOVISUAL AGENT entra na conversa

10. AUDIOVISUAL: "Show! E sobre vídeos - vocês já têm conteúdo ou tá do zero?"
    ↓
    Lead responde...

11. HUB consolida dados dos 3 agentes:
    ↓
    - SITES: need = "site lento + não converte"
    - GROWTH: need = "tráfego qualificado"
    - AUDIOVISUAL: need = "vídeos para Instagram"

12. HUB gera proposta integrada:
    ↓
    "Perfeito! Então o plano seria:

     💻 Novo site otimizado e rápido
     🚀 Estratégia de growth pra trazer público
     🎥 Vídeos pro Instagram pra engajar

     A gente tem um pacote integrado que junta os 3.
     Posso te enviar uma proposta customizada?"

13. Lead qualificado nos 3 serviços → SCHEDULER AGENT
    ↓
    Agendar reunião estratégica
```

---

## ✅ Checklist de Implementação

### Fase 1: Infraestrutura (Semana 1)
- [ ] Criar `BaseAgent` class
- [ ] Criar `AgentHub` com roteamento básico
- [ ] Implementar protocolo de handoff
- [ ] Configurar regras de roteamento

### Fase 2: Agentes Especialistas (Semana 2-3)
- [ ] Implementar `GrowthMarketingAgent`
- [ ] Implementar `SitesAgent`
- [ ] Implementar `AudiovisualAgent`
- [ ] Criar bases de conhecimento

### Fase 3: Comunicação Inter-Agente (Semana 4)
- [ ] Sistema de handoff completo
- [ ] Consultas entre agentes
- [ ] Respostas colaborativas
- [ ] Detecção de cross-sell

### Fase 4: Testes e Ajustes (Semana 5)
- [ ] Testes de handoff
- [ ] Testes de respostas colaborativas
- [ ] Ajustes baseados em conversas reais
- [ ] Dashboard de métricas por agente

---

**Status:** 📋 Arquitetura completa definida
**Próximo passo:** Implementar AgentHub + BaseAgent
**Vantagem:** Agentes especialistas com conhecimento profundo que colaboram entre si
