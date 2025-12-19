# 🤖 LÓGICA COMPLETA DO SISTEMA MULTI-AGENTE ORBION

## 📋 ÍNDICE
1. [Visão Geral da Arquitetura](#visão-geral)
2. [Fluxo Completo Passo a Passo](#fluxo-completo)
3. [Keywords e Detecção de DOR](#keywords-e-detecção)
4. [Sistema de Handoffs](#sistema-de-handoffs)
5. [Detecção de Bot](#detecção-de-bot)
6. [Sistema BANT](#sistema-bant)
7. [Estados e Persistência](#estados-e-persistência)

---

## 🏗️ VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT HUB (Orquestrador)                  │
│                                                                   │
│  • Recebe todas as mensagens                                     │
│  • Roteia para o agente correto                                  │
│  • Gerencia handoffs (passagem de bastão)                        │
│  • Persiste estado em SQLite via memory.js                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  SDR AGENT   │       │ SPECIALIST   │       │  SCHEDULER   │
│   (Agente 1) │  ───> │    AGENT     │  ───> │    AGENT     │
│              │       │  (Agente 2)  │       │  (Agente 3)  │
└──────────────┘       └──────────────┘       └──────────────┘
  Prospecção           BANT Consultivo        Agendamento
  + Bot Detection      + Qualificação         + Google Calendar
```

---

## 🔄 FLUXO COMPLETO PASSO A PASSO

### 📱 **ETAPA 1: MENSAGEM CHEGA NO SISTEMA**

```javascript
// server.js recebe webhook do WhatsApp
POST /api/webhook/evolution
  ↓
agentHub.processMessage(message, context)
```

**O que acontece no Hub:**
```javascript
// 1. Recupera estado do lead
let leadState = await getEnhancedState(leadPhone);

// 2. Se não existe, cria estado inicial
if (!leadState) {
  leadState = {
    contactId: leadPhone,
    currentAgent: 'sdr',        // ← SEMPRE COMEÇA NO SDR
    messageCount: 0,
    metadata: {},
    handoffHistory: []
  };
}

// 3. Incrementa contador de mensagens
leadState.messageCount++;

// 4. Roteia para agente ativo
const agent = this.agents[leadState.currentAgent]; // 'sdr', 'specialist' ou 'scheduler'
const result = await agent.process(message, { leadState });
```

---

### 🎯 **ETAPA 2: SDR AGENT - PROSPECÇÃO**

**Responsabilidades:**
1. ✅ Detectar se é bot ou humano
2. ✅ Enviar primeira mensagem consultiva
3. ✅ Identificar DOR (Growth Marketing / Sites / Audiovisual)
4. ✅ Medir nível de interesse
5. ✅ Fazer HANDOFF para Specialist quando DOR + interesse detectados

#### 🤖 **2.1 - DETECÇÃO DE BOT**

```javascript
// src/agents/sdr_agent.js - Método process()

// PASSO 1: Verifica se é primeira mensagem
const isFirstMessage = !leadState.metadata?.first_template_sent;

if (isFirstMessage) {
  // Envia primeira mensagem consultiva
  return {
    message: buildFirstMessage(contactName, sector),
    updateState: {
      metadata: { first_template_sent: true }
    }
  };
}

// PASSO 2: Verifica se está respondendo "HUMANO OK"
if (isHumanSignal(text)) {  // Regex: /humano\s+ok/gi
  console.log(`✅ Lead confirmou que é humano`);

  botDetectionTracker.clearBotState(fromContact);

  return {
    message: "Perfeito! Confirmado. Agora sim, vamos conversar. 😊\n\nMe conta: qual o principal desafio que vocês enfrentam hoje?",
    updateState: {
      metadata: {
        humanConfirmed: true,
        humanConfirmedAt: new Date().toISOString()
      }
    },
    metadata: { humanVerified: true }
  };
}

// PASSO 3: Detectar se é bot
const botCheck = await this.detectBot(leadPhone, text, leadState);

if (botCheck.isBot) {  // ← 4+ sinais de bot detectados
  const bridgeAlreadySent = botDetectionTracker.wasBridgeSent(fromContact);

  if (bridgeAlreadySent) {
    // Bot persistente
    return {
      message: "Por favor, confirme que você é uma pessoa real respondendo: HUMANO OK"
    };
  }

  // Primeira detecção
  botDetectionTracker.markBridgeSent(fromContact);

  return {
    message: getBridgeMessage(), // "Oi! Parece que estou falando com um sistema automático..."
    metadata: { botDetected: true, bridgeSent: true }
  };
}
```

**Sinais de Bot (precisa 2+ para detectar):**
```javascript
// src/utils/bot_detector.js

const botSignals = [
  '1) Menu numerado',           // Menus tipo: "1) Vendas\n2) Suporte\n3) Financeiro"
  '2) Assinatura automática',   // "Mensagem automática", "Chatbot", etc
  '3) Protocolo/código',        // "Protocolo: 12345", "Ticket: 678"
  '4) Frases clássicas de bot', // "Como posso ajudar?", "Escolha uma opção"
  '5) Múltiplas opções (≥3)',   // "1. Opção\n2. Opção\n3. Opção"
  '6) Formatação repetitiva'    // Múltiplas linhas começando com número
];

// Exemplo de mensagem detectada como bot:
"Escolha uma opção:
1) Vendas
2) Suporte
3) Financeiro

Digite o número da opção"
// ✅ Detecta: menu (1), frase clássica (4), múltiplas opções (5), formatação (6) = 4 sinais = BOT!
```

---

#### 🎯 **2.2 - IDENTIFICAÇÃO DE DOR (PAIN TYPE)**

```javascript
// src/agents/sdr_agent.js - Método detectPainType()

// KEYWORDS GROWTH MARKETING:
const growthPatterns = [
  /cresc(er|imento|endo)/i,           // "crescimento", "crescer", "crescendo"
  /vendas? (baixa|caindo|devagar)/i,   // "vendas baixas", "vendas caindo"
  /marketing/i,                        // "marketing"
  /leads?/i,                           // "leads", "lead"
  /(falta|poucos?) cliente/i,          // "falta cliente", "poucos clientes"
  /conversão/i,                        // "conversão"
  /funil/i,                            // "funil"
  /mídia paga/i,                       // "mídia paga"
  /tráfego/i,                          // "tráfego"
  /seo/i,                              // "SEO"
  /(visibilidade|divulgação)/i         // "visibilidade", "divulgação"
];

// KEYWORDS SITES:
const sitesPatterns = [
  /site/i,                             // "site"
  /página/i,                           // "página"
  /landing/i,                          // "landing page"
  /portal/i,                           // "portal"
  /web/i,                              // "web"
  /lento/i,                            // "lento"
  /carrega/i,                          // "carrega devagar"
  /design/i,                           // "design"
  /(não|nao) (vende|converte)/i,       // "não vende", "não converte"
  /performance/i,                      // "performance"
  /mobile/i,                           // "mobile"
  /responsiv/i                         // "responsivo"
];

// KEYWORDS AUDIOVISUAL:
const audioPatterns = [
  /v[íi]deo/i,                         // "vídeo", "video"
  /gravação/i,                         // "gravação"
  /filmagem/i,                         // "filmagem"
  /edição/i,                           // "edição"
  /animação/i,                         // "animação"
  /motion/i,                           // "motion"
  /reels?/i,                           // "reels", "reel"
  /tiktok/i,                           // "TikTok"
  /youtube/i,                          // "YouTube"
  /instagram/i,                        // "Instagram"
  /stories/i,                          // "stories"
  /autoridade/i,                       // "autoridade"
  /engajamento/i                       // "engajamento"
];

// EXEMPLO REAL:
const mensagem = "Preciso urgente de ajuda com marketing digital e crescimento";

// Análise:
// ✅ "marketing" → growthPatterns
// ✅ "crescimento" → growthPatterns
// ✅ "urgente" → interestKeyword
// ✅ "preciso" → interestKeyword
// ✅ "ajuda" → interestKeyword

const result = {
  painType: 'growth_marketing',              // ← DOR IDENTIFICADA
  description: 'Crescimento/Marketing/Vendas',
  keywords: ['marketing', 'crescimento'],
  interestLevel: 0.20,                        // ← 3 keywords de 15 = 20%
  scores: {
    growth: 2,  // ← MAIOR SCORE
    sites: 0,
    audio: 0
  }
};
```

---

#### 📊 **2.3 - DECISÃO DE HANDOFF (SDR → SPECIALIST)**

```javascript
// src/agents/sdr_agent.js - Método handleLeadResponse()

// CONDIÇÃO 1: DOR específica + interesse ≥ 5%
if (painDetection.painType && painDetection.interestLevel >= 0.05) {
  console.log(`✅ [SDR] DOR confirmada + interesse detectado → HANDOFF para Specialist`);

  return {
    message: this.getTransitionMessage(painDetection.painType),
    handoff: true,              // ← ATIVA HANDOFF
    nextAgent: 'specialist',    // ← DESTINO
    handoffData: {              // ← DADOS PASSADOS
      painType: painDetection.painType,           // 'growth_marketing'
      painDescription: painDetection.description, // 'Crescimento/Marketing/Vendas'
      painKeywords: painDetection.keywords,       // ['marketing', 'crescimento']
      interestLevel: painDetection.interestLevel, // 0.20
      isHuman: true,
      sdrQualified: true
    }
  };
}

// CONDIÇÃO 2: Interesse genérico ≥ 5% SEM DOR específica
// ✅ NOVA LÓGICA (linha 215-238): Evita loops infinitos
if (painDetection.interestLevel >= 0.05) {
  console.log(`✅ [SDR] Interesse genérico sem DOR → HANDOFF com 'growth_marketing' padrão`);

  return {
    message: "Entendi! Vou te fazer algumas perguntas pra entender melhor sua necessidade...",
    handoff: true,
    nextAgent: 'specialist',
    handoffData: {
      painType: 'growth_marketing',          // ← PADRÃO quando DOR não identificada
      painDescription: 'Interesse genérico - DOR a ser refinada pelo Specialist',
      requiresPainRefinement: true,          // ← FLAG para Specialist refinar
      isHuman: true,
      sdrQualified: true
    }
  };
}

// CONDIÇÃO 3: Interesse baixo < 5%
// Faz pergunta de aprofundamento
return {
  message: "Me conta uma coisa: qual é a maior dificuldade que vocês enfrentam hoje com a marca?"
};
```

**Keywords de Interesse (expandido para 15 keywords):**
```javascript
const interestKeywords = [
  /preciso/i,       /quero/i,       /gostaria/i,    /interesse/i,
  /urgente/i,       /rápido/i,      /logo/i,
  /ajud(a|ar)/i,    /solução/i,     /resolver/i,
  /problema/i,      /dificuldade/i, /desafio/i,     /questão/i,  // ✅ NOVOS
  /melhorar/i,      /crescer/i,     /aumentar/i,    /vender/i    // ✅ NOVOS
];

// Cálculo:
interestLevel = (keywords encontradas) / 15

// Exemplos:
"Preciso urgente de ajuda" → 3/15 = 0.20 → 20% ✅ HANDOFF
"Quero melhorar vendas"    → 2/15 = 0.13 → 13% ✅ HANDOFF
"Olá tudo bem?"            → 0/15 = 0.00 →  0% ❌ SEM HANDOFF (pergunta aprofundamento)
```

---

### 💼 **ETAPA 3: SPECIALIST AGENT - BANT CONSULTIVO**

**Responsabilidades:**
1. ✅ Receber DOR do SDR
2. ✅ Executar BANT consultivo (Budget, Authority, Need, Timing)
3. ✅ Calcular score de qualificação
4. ✅ Fazer HANDOFF para Scheduler quando score ≥ 70% + 3/4 pilares

#### 📥 **3.1 - RECEBIMENTO DO HANDOFF**

```javascript
// src/agents/specialist_agent.js - Método onHandoffReceived()

async onHandoffReceived(leadPhone, leadState) {
  console.log(`🎯 [SPECIALIST] Recebendo handoff do SDR`);
  console.log(`📋 DOR identificada: ${leadState.painType}`); // 'growth_marketing'

  // Marcar Need como já coletado (veio do SDR)
  this.bantSystem.collectedInfo.need = leadState.painDescription;

  // Começar em Budget (Need já está coletado)
  const firstQuestion = this.getFirstQuestion(leadState.painType, leadState);

  return {
    message: firstQuestion,
    metadata: { bantStage: 'budget' }
  };
}
```

**Primeira pergunta por especialidade:**
```javascript
// src/agents/specialist_agent.js - Método getFirstQuestion()

getFirstQuestion(painType, leadState) {
  const questions = {
    growth_marketing: `Entendi! Vejo que o foco é crescimento e marketing.

Crescimento exige investimento estratégico. Vocês já têm algum orçamento separado pra marketing digital? Quanto costumam investir por mês?`,

    sites: `Show! Vejo que o site é uma preocupação.

Site de alta performance exige investimento. Vocês têm orçamento separado pra isso? Quanto podem investir?`,

    audiovisual: `Legal! Produção de vídeo é super importante hoje.

Conteúdo visual de qualidade exige investimento. Vocês têm orçamento para produção audiovisual? Quanto pensam investir mensalmente?`
  };

  return questions[painType] || questions.growth_marketing;
}
```

---

#### 💰 **3.2 - SISTEMA BANT (Budget, Authority, Need, Timing)**

O Specialist usa o **BANTUnifiedSystem** (`src/tools/bant_unified.js`) para coletar informações consultivas:

```javascript
// ESTRUTURA BANT:
{
  need: "Crescimento/Marketing/Vendas",        // ← Veio do SDR
  budget: null,                                 // ← A coletar
  authority: null,                              // ← A coletar
  timing: null                                  // ← A coletar
}
```

**Fluxo de Coleta BANT:**

```javascript
// src/agents/specialist_agent.js - Método process()

// 1. Processar mensagem com BANT
const bantResult = await this.bantSystem.processMessage(text, conversationHistory);

console.log(`📊 Score: ${bantResult.qualificationScore}%`);
console.log(`📊 Collected:`, bantResult.collectedInfo);

// 2. Verificar se está pronto para agendamento
if (this.isReadyToSchedule(bantResult)) {
  // Score ≥ 70% E 3/4 pilares coletados
  return {
    handoff: true,
    nextAgent: 'scheduler',
    handoffData: {
      bant: bantResult.collectedInfo,
      qualificationScore: bantResult.qualificationScore,
      readyToSchedule: true
    }
  };
}

// 3. Se não, gera próxima pergunta
const nextQuestion = await this.bantSystem.getNextQuestion(leadState);
return { message: nextQuestion };
```

**Critérios para HANDOFF Specialist → Scheduler:**
```javascript
// src/agents/specialist_agent.js - Método isReadyToSchedule()

isReadyToSchedule(bantResult) {
  const { qualificationScore, collectedInfo } = bantResult;

  // Contar pilares coletados
  const pilars = ['need', 'budget', 'authority', 'timing'];
  const collectedCount = pilars.filter(p => collectedInfo[p] !== null).length;

  // CONDIÇÕES:
  // ✅ Score ≥ 70%
  // ✅ 3 ou mais pilares coletados (de 4)

  const isReady = qualificationScore >= 70 && collectedCount >= 3;

  console.log(`🎯 [SPECIALIST] Qualificado? ${isReady ? 'SIM' : 'NÃO'}`);
  console.log(`   - Score: ${qualificationScore}% (mín: 70%)`);
  console.log(`   - Pilares: ${collectedCount}/4 (mín: 3)`);

  return isReady;
}
```

**Exemplo de Conversa BANT:**

```
👤 Lead: "Preciso urgente de ajuda com marketing digital e crescimento"
   ↓
🤖 SDR: [Detecta DOR growth_marketing + interesse 20%]
   ↓ HANDOFF SDR → SPECIALIST
   ↓
🤖 Specialist: "Entendi! Vejo que o foco é crescimento e marketing.
                Crescimento exige investimento estratégico. Vocês já têm
                algum orçamento separado pra marketing digital?"
   ↓
👤 Lead: "Temos R$ 8 mil por mês para marketing"
   ↓
🤖 Specialist: [Coleta Budget: "R$ 8"] → Score: 55%
                "Como tem sido o crescimento da marca de vocês ultimamente?"
   ↓
👤 Lead: "Sou o dono, decido sozinho"
   ↓
🤖 Specialist: [Coleta Authority: "Sou"] → Score: 80% (3/4 pilares)
   ↓ HANDOFF SPECIALIST → SCHEDULER (Score ≥ 70% + 3/4 pilares) ✅
```

---

### 📅 **ETAPA 4: SCHEDULER AGENT - AGENDAMENTO**

**Responsabilidades:**
1. ✅ Receber lead qualificado (score ≥ 70%)
2. ✅ Propor horários disponíveis
3. ✅ Negociar disponibilidade
4. ✅ Criar evento no Google Calendar
5. ✅ Enviar confirmação com Meet Link

#### 📥 **4.1 - RECEBIMENTO DO HANDOFF**

```javascript
// src/agents/scheduler_agent.js - Método onHandoffReceived()

async onHandoffReceived(leadPhone, leadState) {
  console.log(`📅 [SCHEDULER] Recebendo handoff do Specialist`);
  console.log(`🎯 Score: ${leadState.qualificationScore}%`);
  console.log(`📊 BANT:`, leadState.bant);

  // Gerar horários disponíveis
  const slots = this.getAvailableTimeSlots();

  // Salvar no estado
  leadState.proposedSlots = slots;
  leadState.schedulerStage = 'proposing_times';

  // Propor horários
  const timeProposal = await this.proposeTimeSlots(leadState, slots);

  return {
    message: timeProposal,
    metadata: {
      stage: 'proposing_times',
      qualified: true,
      score: leadState.qualificationScore
    },
    updateState: {
      proposedSlots: slots,
      schedulerStage: 'proposing_times'
    }
  };
}
```

#### ⏰ **4.2 - PROPOSTA DE HORÁRIOS**

```javascript
// src/agents/scheduler_agent.js - Método proposeTimeSlots()

async proposeTimeSlots(leadState, slots) {
  const { contactProfileName, painType, bant, qualificationScore } = leadState;

  // Prompt para GPT gerar proposta personalizada
  const prompt = `Você é o Scheduler Agent da ORBION.

Lead qualificado:
- Nome: ${contactProfileName || 'Lead'}
- DOR: ${painType}
- Budget: ${bant.budget}
- Authority: ${bant.authority}
- Score: ${qualificationScore}%

Horários disponíveis:
${slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}

Tarefa: Propor horários de forma consultiva e natural.`;

  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300
  });

  return completion.choices[0].message.content;
}
```

**Horários gerados automaticamente:**
```javascript
// src/agents/scheduler_agent.js - Método getAvailableTimeSlots()

getAvailableTimeSlots() {
  const today = new Date();
  const slots = [];

  // Próximos 5 dias úteis
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const date = new Date(today);
    date.setDate(date.getDate() + daysAhead);

    // Pular fins de semana
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Horários comerciais
    const times = ['10:00', '11:00', '14:00', '15:00', '16:00'];

    times.forEach(time => {
      slots.push({
        date: date.toISOString().split('T')[0],
        time: time,
        label: `${this.getDayName(date)} às ${time}`
      });
    });

    if (slots.length >= 10) break; // Limitar a 10 opções
  }

  return slots.slice(0, 5); // Retornar top 5
}
```

---

#### ✅ **4.3 - CONFIRMAÇÃO E CRIAÇÃO DO EVENTO**

```javascript
// src/agents/scheduler_agent.js - Método process()

async process(message, context) {
  const { fromContact, text } = message;
  const { leadState } = context;

  // Verificar se já tem reunião agendada (prevenir duplicatas)
  if (leadState.scheduledMeeting?.eventId) {
    return {
      message: `Sua reunião já está agendada para ${leadState.scheduledMeeting.date} às ${leadState.scheduledMeeting.time}.\n\nLink: ${leadState.scheduledMeeting.meetLink}`
    };
  }

  // Detectar confirmação de horário
  const timeConfirmation = this.detectTimeConfirmation(text, leadState.proposedSlots);

  if (timeConfirmation.confirmed) {
    console.log(`✅ [SCHEDULER] Horário confirmado: ${timeConfirmation.date} ${timeConfirmation.time}`);

    // Criar evento no Google Calendar
    const event = await this.createCalendarEvent(leadState, timeConfirmation);

    if (event.success) {
      return {
        message: `🎉 Perfeito! Reunião agendada!

📅 Data: ${timeConfirmation.date}
⏰ Horário: ${timeConfirmation.time}
🔗 Link: ${event.meetLink}

Vou enviar um convite por e-mail também. Nos vemos lá! 👋`,

        updateState: {
          scheduledMeeting: {
            eventId: event.eventId,
            date: timeConfirmation.date,
            time: timeConfirmation.time,
            meetLink: event.meetLink
          }
        },

        metadata: {
          meetingScheduled: true,
          eventId: event.eventId,
          meetLink: event.meetLink
        }
      };
    }
  }

  // Se não confirmou, continuar negociação
  return {
    message: "Qual desses horários funciona melhor pra você?"
  };
}
```

**Detecção de confirmação de horário:**
```javascript
// src/agents/scheduler_agent.js - Método detectTimeConfirmation()

detectTimeConfirmation(text, proposedSlots) {
  const lowerText = text.toLowerCase();

  // Padrões de confirmação
  const confirmationPatterns = [
    /\b(segunda|terça|quarta|quinta|sexta)[\s-]+(feira)?\s*(às|as)?\s*(\d{1,2})[h:]?(\d{2})?\b/i,
    /\b(\d{1,2})[h:](\d{2})?\s*(da)?\s*(manhã|tarde)\b/i,
    /\b(amanhã|hoje)\s*(às|as)?\s*(\d{1,2})[h:]?(\d{2})?\b/i
  ];

  // Tentar extrair data e hora
  for (const pattern of confirmationPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Parse e retorna data/hora
      return {
        confirmed: true,
        date: '2025-10-28',  // Calculado dinamicamente
        time: '10:00'
      };
    }
  }

  // Verificar escolha por número (1, 2, 3...)
  const numberMatch = text.match(/\b([1-5])\b/);
  if (numberMatch && proposedSlots) {
    const index = parseInt(numberMatch[1]) - 1;
    if (proposedSlots[index]) {
      return {
        confirmed: true,
        date: proposedSlots[index].date,
        time: proposedSlots[index].time
      };
    }
  }

  return { confirmed: false };
}
```

---

## 🔄 SISTEMA DE HANDOFFS (PASSAGEM DE BASTÃO)

### **Como Funciona o Handoff:**

```javascript
// agent_hub.js - Método executeHandoff()

async executeHandoff(leadPhone, fromAgent, result) {
  const { nextAgent, handoffData } = result;

  console.log(`🔀 [HUB] ===== EXECUTANDO HANDOFF =====`);
  console.log(`📤 De: ${fromAgent}`);
  console.log(`📥 Para: ${nextAgent}`);

  // 1. Recuperar estado atual
  let leadState = await this.getLeadState(leadPhone);

  // 2. Atualizar estado com dados do handoff
  leadState.currentAgent = nextAgent;          // ← TROCA O AGENTE ATIVO
  leadState.previousAgent = fromAgent;

  // 3. Registrar no histórico
  leadState.handoffHistory = leadState.handoffHistory || [];
  leadState.handoffHistory.push({
    from: fromAgent,
    to: nextAgent,
    timestamp: new Date().toISOString(),
    data: handoffData
  });

  // 4. Mesclar dados do handoff
  Object.assign(leadState, handoffData);

  // 5. Salvar estado
  await this.saveLeadState(leadPhone, leadState);

  // 6. Processar primeira mensagem do novo agente
  const newAgent = this.agents[nextAgent];

  if (newAgent.onHandoffReceived) {
    const initResult = await newAgent.onHandoffReceived(leadPhone, leadState);

    return {
      success: true,
      handoffCompleted: true,
      agent: nextAgent,              // ← AGENTE AGORA É O NOVO
      message: initResult.message
    };
  }
}
```

### **Dados Transferidos no Handoff:**

#### **SDR → Specialist:**
```javascript
handoffData: {
  painType: 'growth_marketing',
  painDescription: 'Crescimento/Marketing/Vendas',
  painKeywords: ['marketing', 'crescimento'],
  interestLevel: 0.20,
  isHuman: true,
  sdrQualified: true,
  requiresPainRefinement: false  // true se DOR genérica
}
```

#### **Specialist → Scheduler:**
```javascript
handoffData: {
  contactId: '5511991234567',
  painType: 'growth_marketing',
  bant: {
    need: 'Crescimento/Marketing/Vendas',
    budget: 'R$ 8 mil',
    authority: 'Sou o dono',
    timing: 'urgente, 1 mês'
  },
  qualificationScore: 80,
  archetype: 'PRAGMATICO',
  persona: null,
  readyToSchedule: true
}
```

---

## 📊 ESTADOS E PERSISTÊNCIA

### **Estrutura do Estado (SQLite via memory.js):**

```javascript
// Estado completo de um lead
{
  // Identificação
  contactId: '5511991234567',

  // Roteamento
  currentAgent: 'specialist',        // 'sdr', 'specialist', 'scheduler'
  previousAgent: 'sdr',

  // Histórico
  messageCount: 5,
  lastMessage: 'Temos R$ 8 mil por mês',
  lastUpdate: '2025-10-21T13:04:40.000Z',

  // Handoffs
  handoffHistory: [
    {
      from: 'sdr',
      to: 'specialist',
      timestamp: '2025-10-21T13:04:35.954Z',
      data: { painType: 'growth_marketing', ... }
    }
  ],

  // DOR
  painType: 'growth_marketing',
  painDescription: 'Crescimento/Marketing/Vendas',
  painKeywords: ['marketing', 'crescimento'],
  interestLevel: 0.20,

  // BANT
  bant: {
    need: 'Crescimento/Marketing/Vendas',
    budget: 'R$ 8 mil',
    authority: 'Sou o dono',
    timing: null
  },

  // Qualificação
  qualificationScore: 80,
  archetype: 'PRAGMATICO',

  // Agendamento
  proposedSlots: [...],
  scheduledMeeting: {
    eventId: 'abc123',
    date: '2025-10-28',
    time: '10:00',
    meetLink: 'https://meet.google.com/xyz'
  },

  // Metadata
  metadata: {
    origin: 'organic',
    first_contact_at: '2025-10-21T12:39:14.003Z',
    first_template_sent: true,
    isHuman: true,
    humanConfirmed: true,
    botBridgeSent: false
  }
}
```

---

## 🎯 RESUMO DO FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. LEAD ENVIA MENSAGEM                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                2. SDR AGENT (PROSPECÇÃO)                         │
│                                                                   │
│  ✅ Detecta bot? → Pede "HUMANO OK"                              │
│  ✅ Primeira mensagem? → Envia template consultivo               │
│  ✅ Detecta DOR (Growth/Sites/Audio)?                            │
│  ✅ Mede interesse (≥5% keywords)?                               │
│                                                                   │
│  SE DOR + interesse ≥5% → HANDOFF PARA SPECIALIST               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             3. SPECIALIST AGENT (BANT CONSULTIVO)                │
│                                                                   │
│  ✅ Recebe DOR do SDR                                            │
│  ✅ Coleta Budget (orçamento)                                    │
│  ✅ Coleta Authority (decisor)                                   │
│  ✅ Coleta Timing (urgência)                                     │
│  ✅ Calcula score (0-100%)                                       │
│                                                                   │
│  SE score ≥70% + 3/4 pilares → HANDOFF PARA SCHEDULER          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            4. SCHEDULER AGENT (AGENDAMENTO)                      │
│                                                                   │
│  ✅ Propõe 5 horários disponíveis                                │
│  ✅ Negocia disponibilidade                                      │
│  ✅ Detecta confirmação ("Terça às 10h")                         │
│  ✅ Cria evento Google Calendar                                  │
│  ✅ Envia Meet Link                                              │
│                                                                   │
│  RESULTADO: REUNIÃO AGENDADA ✅                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 KEYWORDS-CHAVE RESUMIDAS

### **Keywords para DOR (Pain Type):**

| DOR | Keywords Principais | Threshold |
|-----|---------------------|-----------|
| **Growth Marketing** | crescimento, marketing, leads, vendas, conversão, funil, tráfego, SEO | 1+ match |
| **Sites** | site, página, landing, portal, web, lento, design, performance, mobile | 1+ match |
| **Audiovisual** | vídeo, gravação, edição, reels, TikTok, YouTube, stories, engajamento | 1+ match |

### **Keywords para Interesse:**

```
preciso, quero, gostaria, interesse, urgente, rápido, logo,
ajuda, solução, resolver, problema, dificuldade, desafio,
melhorar, crescer, aumentar, vender
```

**Threshold:** ≥ 5% (1+ de 15 keywords)

### **Critérios de Handoff:**

| Handoff | Condição | Dados Transferidos |
|---------|----------|-------------------|
| **SDR → Specialist** | DOR identificada + interesse ≥5% | painType, painDescription, keywords, interestLevel |
| **Specialist → Scheduler** | Score ≥70% + 3/4 pilares BANT | bant completo, qualificationScore, archetype |

---

## 📌 CONCLUSÃO

O sistema multi-agente ORBION funciona como uma **esteira de produção**:

1. **SDR** = Porteiro (filtra bots, identifica necessidade)
2. **Specialist** = Consultor (qualifica, coleta BANT)
3. **Scheduler** = Secretário (agenda reunião)

Cada agente tem responsabilidades claras e passa o bastão apenas quando critérios objetivos são atingidos (keywords, scores, flags).

---

**Arquivo gerado em:** 2025-10-21
**Versão:** 1.0
**Sistema:** ORBION Multi-Agent Architecture
