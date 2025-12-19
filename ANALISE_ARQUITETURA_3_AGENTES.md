# ANALISE DETALHADA DA ARQUITETURA DE 3 AGENTES

## 1. FLUXO GERAL E HANDOFFS

### 1.1 Fluxo de Mensagem Completo
```
Usuário envia mensagem
    ↓
AgentHub.processMessage()
    ↓
Recupera leadState do banco (stateManager.js)
    ↓
Roteia para agente ativo (SDR → Specialist → Scheduler)
    ↓
Agente processa e retorna resultado
    ↓
Verifica se há handoff
    ↓
Se SIM: executeHandoff() chama onHandoffReceived do próximo agente
Se NÃO: Atualiza leadState e salva
    ↓
Sincroniza com Google Sheets (background)
```

### 1.2 Handoff Points
- **SDR → Specialist**: Quando dados iniciais coletados (nome, empresa, setor)
- **Specialist → Scheduler**: Quando BANT completo (todos 4 stages com campos essenciais)
- **Scheduler → Fim**: Quando reunião agendada

---

## 2. ARMAZENAMENTO DE DADOS - CANONICAL LEAD STATE

### 2.1 Estrutura de Dados (leadState.schema.js)

```javascript
{
  // ===== IDENTIDADE =====
  phoneNumber: "5584987654321",              // Primary key
  currentAgent: "sdr|specialist|scheduler",   // Roteamento
  messageCount: 5,                            // Contador de mensagens

  // ===== PERFIL DA EMPRESA (coletado pelo SDR) =====
  companyProfile: {
    nome: "João Silva",                      // Nome da pessoa
    empresa: "João Eletrônicos",             // Nome da empresa
    setor: "Comércio eletrônico"             // Setor (IMPORTANTE: usado para personalização)
  },

  // ===== BANT STAGES (gerenciado pelo Specialist) =====
  bantStages: {
    currentStage: "need|budget|authority|timing",
    stageIndex: 0-3,
    isComplete: false,

    stageData: {
      need: {
        campos: {
          problema_principal: "Não sabe se dá lucro",
          servico_identificado: "dre",        // Novo: qual módulo resolve
          intensidade_problema: "Crítico",
          consequencias: "Decisões erradas",
          receita_mensal: "R$ 50.000",
          funcionarios: "5-10"
        },
        tentativas: 2,
        lastUpdate: 1700000000000
      },
      budget: {
        campos: {
          faixa_investimento: "R$ 197",
          roi_esperado: "Economizar tempo",
          flexibilidade_budget: "Flexível"
        }
      },
      authority: {
        campos: {
          decisor_principal: "Decisor único",
          autonomia_decisao: "Autonomia total",
          processo_decisao: "Decisão rápida"
        }
      },
      timing: {
        campos: {
          urgencia: "Urgente",
          prazo_ideal: "Esta semana",
          motivo_urgencia: "Fechamento trimestral"  // Opcional
        }
      }
    },

    conversationHistory: [
      { role: "user", content: "..." },
      { role: "assistant", content: "..." }
    ]
  },

  // ===== SCHEDULER (gerenciado pelo Scheduler Agent) =====
  scheduler: {
    stage: "collecting_email|proposing_times|negotiating|confirmed",
    leadEmail: "joao@empresa.com",
    proposedSlots: [...],
    selectedSlot: { date: "2024-11-20", time: "10:00", label: "terça" },
    meetingData: {
      eventId: "abc123",
      meetLink: "https://meet.google.com/...",
      confirmedAt: "2024-11-18T10:00:00Z"
    }
  },

  // ===== METADATA =====
  metadata: {
    createdAt: "2024-11-18T09:00:00Z",
    updatedAt: "2024-11-18T10:30:00Z",
    lastMessageAt: "2024-11-18T10:30:00Z",
    handoffHistory: [
      { from: "sdr", to: "specialist", at: "2024-11-18T09:15:00Z" },
      { from: "specialist", to: "scheduler", at: "2024-11-18T10:00:00Z" }
    ],
    introductionSent: true,
    bantComplete: true,
    meetingScheduled: true,
    lastSheetSync: "2024-11-18T10:30:00Z",
    sheetSyncErrors: 0
  }
}
```

### 2.2 Persistência
- **Banco de dados**: SQLite (`orbion.db`)
- **Tabela**: `lead_states` (única tabela para estado do lead)
- **Colunas JSON**: company_profile, bant_stages, scheduler, metadata
- **Index**: `current_agent`, `updated_at` para queries rápidas

---

## 3. SDR AGENT - Coleta de Dados Iniciais

### 3.1 Responsabilidades
1. Enviar mensagem de introdução
2. Coletar dados iniciais: nome, empresa, setor
3. Fazer handoff para Specialist após coleta

### 3.2 Estados (metadata.sdr_initial_data_stage)
```
INICIAL → collecting_profile → completed → [HANDOFF para Specialist]
```

### 3.3 Fluxo Detalhado
```javascript
// sdr_agent.js - process()

// 1. Detectar início de campanha
if (text === '/start' || (text === '' && metadata.isCampaign)) {
  // Enviar primeiro mensagem usando buildUnifiedFirstMessage()
  // Atualizar: metadata.introductionSent = true
  // Atualizar: metadata.sdr_initial_data_stage = 'collecting_profile'
  return { message, updateState }
}

// 2. Se dados já coletados
if (metadata.sdr_initial_data_collected) {
  // HANDOFF direto para specialist
  return { handoff: true, nextAgent: 'specialist' }
}

// 3. Se coletando dados
if (metadata.sdr_initial_data_stage === 'collecting_profile') {
  // Preparar handoff com dados brutos
  return {
    handoff: true,
    nextAgent: 'specialist',
    handoffData: {
      companyProfile: {
        rawResponse: text,  // Texto bruto fornecido pelo lead
        collectedAt: new Date().toISOString()
      }
    }
  }
}

// 4. Se nunca enviou introdução
if (!introductionSent) {
  // Enviar mensagem inicial com pedido de dados
  return { 
    message: firstMessage,
    updateState: {
      metadata: {
        introductionSent: true,
        sdr_initial_data_stage: 'collecting_profile'
      }
    }
  }
}
```

### 3.4 Dados Armazenados no Handoff
```javascript
{
  companyProfile: {
    rawResponse: "João Silva, eletrônicos, 50k por mês",
    collectedAt: "2024-11-18T09:15:00Z"
  },
  metadata: {
    sdr_initial_data_collected: true,
    sdr_initial_data_stage: 'completed'
  }
}
```

---

## 4. SPECIALIST AGENT - Qualificação BANT V2

### 4.1 Responsabilidades
1. Receber lead do SDR (confirmar humano via FAQ)
2. Executar BANT Stages V2 (sem loops)
3. Passar para Scheduler quando BANT completo

### 4.2 Inicialização (onHandoffReceived)
```javascript
// specialist_agent.js - onHandoffReceived()

// 1. Extrair perfil da empresa usando GPT
const companyProfile = await extractCompanyProfile(leadState.companyProfile.rawResponse);
// Resultado: { nome: "João Silva", empresa: "...", setor: "..." }

// 2. Inicializar BANTStagesV2 do ZERO
const bantSystem = new BANTStagesV2(leadPhone);

// 3. Definir perfil para personalização
bantSystem.setCompanyProfile(companyProfile);

// 4. Obter mensagem de abertura do stage NEED
const openingMessage = bantSystem.getNextStageOpening();

return {
  message: openingMessage,
  updateState: {
    bantStages: bantSystem.getState(),
    companyProfile
  }
}
```

### 4.3 Processamento de Mensagem (process)
```javascript
// specialist_agent.js - process()

// 1. Recuperar ou criar BANTSystem por contato
let bantSystem = this.bantSystemByContact.get(fromContact);
if (!bantSystem) {
  bantSystem = new BANTStagesV2(fromContact);
  this.bantSystemByContact.set(fromContact, bantSystem);
  await bantSystem.loadPersistedState();  // Carregar se havia estado anterior
}

// 2. Restaurar estado do leadState
if (leadState.bantStages) {
  bantSystem.restoreState(leadState.bantStages);
}

// 3. Processar mensagem com BANT V2
const bantResult = await bantSystem.processMessage(text);

// 4. Se BANT completo
if (bantResult.isComplete) {
  return {
    handoff: true,
    nextAgent: 'scheduler',
    handoffData: {
      bantStages: bantSystem.getState()
    }
  }
}

// 5. Se há transição (mudança de stage)
if (bantResult.needsTransition) {
  return {
    message: bantResult.transitionMessage,
    updateState: {
      bantStages: bantSystem.getState()
    }
  }
}

// 6. Continuar no mesmo stage
return {
  message: bantResult.message,
  updateState: {
    bantStages: bantSystem.getState()
  }
}
```

### 4.4 Persistência do BANTSystem (bant_stages_v2.js)

#### getState() - Para salvar
```javascript
return {
  currentStage: this.currentStage,
  stageIndex: this.stageIndex,
  stageData: this.stageData,
  conversationHistory: this.conversationHistory,
  companyProfile: this.companyProfile
}
```

#### restoreState() - Para recuperar
```javascript
restoreState(savedState) {
  if (savedState.stageData) this.stageData = { ...this.stageData, ...savedState.stageData };
  if (savedState.currentStage) this.currentStage = savedState.currentStage;
  if (savedState.conversationHistory) this.conversationHistory = savedState.conversationHistory;
  if (savedState.companyProfile) this.companyProfile = savedState.companyProfile;
}
```

#### persistState() - Salvar em memory.js
```javascript
async persistState() {
  const stateKey = `bant_state_${this.phoneNumber}`;
  const state = this.getState();
  await setMemory(stateKey, state);
}
```

### 4.5 BANT V2 - Configuração de Stages

#### STAGE 1: NEED
```
Campos Essenciais (6):
  ✓ problema_principal      (25 pts) - Qual problema financeiro
  ✓ servico_identificado    (25 pts) - Qual módulo resolve [NOVO]
  ✓ intensidade_problema    (15 pts) - Quão grave
  ✓ consequencias          (15 pts) - O que causa
  ✓ receita_mensal         (10 pts) - Faturamento
  ✓ funcionarios           (10 pts) - Número de pessoas

Score Mínimo: 100 pontos (todos os 6 essenciais)

Classificação Automática de Serviço:
  - Problema "lucro" → dre
  - Problema "caixa" → fluxo_caixa
  - Problema "estoque" → estoque
  - etc (classificarServicoPorDor())
```

#### STAGE 2: BUDGET
```
Campos Essenciais (3):
  ✓ faixa_investimento     (40 pts) - Qual plano (197, 497, 997+)
  ✓ roi_esperado           (30 pts) - Que retorno esperam
  ✓ flexibilidade_budget   (30 pts) - Budget é flexível?

Score Mínimo: 100 pontos (todos os 3 essenciais)
```

#### STAGE 3: AUTHORITY
```
Campos Essenciais (3):
  ✓ decisor_principal      (40 pts) - Quem decide
  ✓ autonomia_decisao      (30 pts) - Tem autonomia?
  ✓ processo_decisao       (30 pts) - Como decide?

Score Mínimo: 100 pontos (todos os 3 essenciais)
```

#### STAGE 4: TIMING
```
Campos Essenciais (2):
  ✓ urgencia               (50 pts) - Quando começar?
  ✓ prazo_ideal            (50 pts) - Data ideal?

Campos Opcionais (1):
  ○ motivo_urgencia        (20 pts) - Por quê?

Score Mínimo: 100 pontos (urgencia + prazo_ideal)
```

### 4.6 Algoritmo de Processamento BANT V2 (processMessage)

```javascript
async processMessage(userMessage) {
  // 1. PROTEÇÃO: Detectar loop infinito
  if (tentativas >= 10) {
    console.error('LOOP DETECTADO - forçando avanço');
    this.advanceStage();
    return { stage: nextStage, ... };
  }

  // 2. HISTÓRICO: Carregar mensagens reais do banco
  const dbMessages = await getRecentMessages(this.phoneNumber, 10);
  const historyForGPT = dbMessages.map(msg => ({
    role: msg.from_me ? 'assistant' : 'user',
    content: msg.text
  }));

  // 3. ANÁLISE: Usar GPT para extrair campos BANT
  const analysis = await analyzeWithGPT(userMessage, historyForGPT);
  // Retorna: { campos_coletados: {...}, resposta_consultiva: "..." }

  // 4. CLASSIFICAÇÃO: Se novo campo problema_principal, classificar serviço
  if (stage === 'need' && analysis.campos_coletados.problema_principal) {
    const classificacao = classificarServicoPorDor(problema);
    // Atualizar: servico_identificado, confianca_servico, servico_detalhes
  }

  // 5. SCORING: Calcular score do stage
  const currentScore = this.calculateStageScore(stage);
  const essenciaisColetados = this.checkEssenciaisColetados(stage);

  // 6. DECISÃO: Avançar ou continuar?
  if (essenciaisColetados) {
    // TODOS os campos essenciais foram coletados
    await this.persistState();  // Salvar ANTES de avançar
    this.advanceStage();

    // Verificar se GPT já perguntou algo (evitar duplicação)
    if (analysis.resposta_consultiva.includes('?')) {
      // Não concatenar transição
      return { message: analysis.resposta_consultiva, ... };
    } else {
      // Concatenar mensagem de transição
      const transitionMessage = this.getNextStageOpening();
      return {
        message: analysis.resposta_consultiva,
        transitionMessage: transitionMessage,
        needsTransition: true,
        ...
      };
    }
  } else {
    // Faltam campos - continuar no mesmo stage
    return { message: analysis.resposta_consultiva, ... };
  }

  // 7. BANT COMPLETO?
  if (this.isBANTComplete()) {
    return { isComplete: true, ... };
  }
}
```

### 4.7 Substituição de Placeholders
```javascript
replacePlaceholders(message) {
  // [EMPRESA] → empresa do lead
  // [NOME] → nome da pessoa
  // [SETOR] → setor da empresa
  
  // Exemplo de mensagem com placeholders:
  // "E aí [NOME], entendi que [EMPRESA] atua em [SETOR]..."
}
```

---

## 5. SCHEDULER AGENT - Agendamento de Reunião

### 5.1 Responsabilidades
1. Coletar email do lead
2. Propor horários de reunião
3. Negociar disponibilidade
4. Criar evento no Google Calendar
5. Sincronizar com Pipeline do Google Sheets

### 5.2 Estados (scheduler.stage)
```
collecting_email → proposing_times → negotiating → confirmed
```

### 5.3 Fluxo Detalhado

#### Etapa 1: Coletando Email
```javascript
// scheduler_agent.js - process() quando stage === 'collecting_email'

// 1. Detectar email na mensagem
const emailDetection = this.detectEmail(text);

if (emailDetection.found) {
  // 2. Propostas de horários
  const slots = this.getAvailableTimeSlots();
  const timeProposal = await this.proposeTimeSlots(leadState, slots);

  return {
    message: timeProposal,
    updateState: {
      scheduler: {
        stage: 'proposing_times',
        leadEmail: emailDetection.email,
        proposedSlots: slots
      }
    }
  };
} else {
  // Pedir novamente
  return { message: "Qual seu email?" };
}
```

#### Etapa 2: Propondo Horários
```javascript
// scheduler_agent.js - process() quando stage === 'proposing_times'

// 1. Detectar se lead confirmou horário
const confirmation = this.detectTimeConfirmation(text, historyTexts);

if (confirmation.confirmed) {
  // 2. Criar evento no Google Calendar
  const eventResult = await this.createCalendarEvent(
    leadState,
    confirmation,
    fromContact
  );

  // 3. Criar oportunidade no Pipeline
  const opportunityData = {
    nome: leadState.companyProfile?.nome,
    empresa: leadState.companyProfile?.empresa,
    email: leadState.scheduler.leadEmail,
    telefone: fromContact,
    setor: leadState.companyProfile?.setor,
    dor: leadState.bantStages?.stageData?.need?.campos?.problema_principal,
    intensidade_dor: leadState.bantStages?.stageData?.need?.campos?.intensidade_problema,
    valor: leadState.bantStages?.stageData?.budget?.campos?.faixa_investimento,
    decisor: leadState.bantStages?.stageData?.authority?.campos?.decisor_principal,
    urgencia: leadState.bantStages?.stageData?.timing?.campos?.urgencia,
    data_reuniao: confirmation.date,
    hora_reuniao: confirmation.time,
    meet_link: eventResult.meetLink,
    event_id: eventResult.eventId,
    pipeline_stage: 'qualification',
    probability: 20,
    origem: 'BANT Completo'
  };
  const pipelineResult = await addPipelineOpportunity(opportunityData);

  return {
    message: this.getConfirmationMessage(eventResult, leadState.painType),
    updateState: {
      scheduler: {
        stage: 'confirmed',
        leadEmail: leadState.scheduler.leadEmail,
        selectedSlot: {
          date: confirmation.date,
          time: confirmation.time,
          label: confirmation.label
        },
        meetingData: {
          eventId: eventResult.eventId,
          meetLink: eventResult.meetLink,
          confirmedAt: new Date().toISOString()
        }
      },
      metadata: {
        meetingScheduled: true,
        conversationCompleted: true,
        completedAt: new Date().toISOString()
      }
    }
  };
}
```

---

## 6. DETECÇÃO E PASSAGEM DE NICHO/SETOR

### 6.1 Fluxo de Detecção do Setor

**SDR Agent**:
```javascript
// sdr_agent.js - onHandoffReceived()
// Recebe texto bruto do lead sobre empresa

// Exemplo: "João Silva, João Eletrônicos, 50k por mês"
// Este texto é armazenado como:
handoffData: {
  companyProfile: {
    rawResponse: "João Silva, João Eletrônicos, 50k por mês"
  }
}
```

**Specialist Agent**:
```javascript
// specialist_agent.js - onHandoffReceived()
// Recebe o rawResponse e extrai com GPT

const companyProfile = await extractCompanyProfile(rawResponse);
// GPT retorna:
{
  nome: "João Silva",
  empresa: "João Eletrônicos",
  setor: "Comércio eletrônico"  // ← SETOR DETECTADO
}

// Armazena em leadState.companyProfile
// E passa para BANT system
bantSystem.setCompanyProfile(companyProfile);

// BANT sistema usa setor para:
// 1. Personalizar perguntas (replacePlaceholders)
// 2. Selecionar serviço correto (classificarServicoPorDor)
// 3. Gerar exemplos específicos do nicho
```

**Exemplos de Personalização por Setor**:
```javascript
// bant_stages_v2.js - analyzeWithGPT()

// Perfil enviado para GPT:
const profileContext = `
👤 PERFIL DO LEAD:
• Nome: João Silva
• Empresa: João Eletrônicos
• Setor: Comércio eletrônico
`;

// GPT usa setor para adaptar resposta:
// "Em comércio eletrônico, o problema geralmente é entre:
//  - Margem apertada por concorrência
//  - Estoque descoordenado com vendas
//  - Clientes devendo"
```

---

## 7. CAMPOS BANT E ARMAZENAMENTO

### 7.1 Mapeamento de Armazenamento

```
leadState.bantStages.stageData:
  ├── need
  │   └── campos
  │       ├── problema_principal: "Não sabe lucro"
  │       ├── servico_identificado: "dre"  [NOVO]
  │       ├── intensidade_problema: "Crítico"
  │       ├── consequencias: "Decisões erradas"
  │       ├── receita_mensal: "R$ 50.000"
  │       └── funcionarios: "5-10"
  │
  ├── budget
  │   └── campos
  │       ├── faixa_investimento: "R$ 197"
  │       ├── roi_esperado: "Economizar tempo"
  │       └── flexibilidade_budget: "Flexível"
  │
  ├── authority
  │   └── campos
  │       ├── decisor_principal: "Decisor único"
  │       ├── autonomia_decisao: "Autonomia total"
  │       └── processo_decisao: "Decisão rápida"
  │
  └── timing
      └── campos
          ├── urgencia: "Urgente"
          ├── prazo_ideal: "Esta semana"
          └── motivo_urgencia: "Fechamento trimestral"
```

### 7.2 Acesso aos Campos

```javascript
// No Scheduler, para criar oportunidade:
const needData = leadState.bantStages.stageData.need.campos;
const budgetData = leadState.bantStages.stageData.budget.campos;
const authorityData = leadState.bantStages.stageData.authority.campos;
const timingData = leadState.bantStages.stageData.timing.campos;

// Para gerar notas da reunião:
notes += `🔴 NEED: ${needData.problema_principal}\n`;
notes += `💰 BUDGET: ${budgetData.faixa_investimento}\n`;
notes += `👔 AUTHORITY: ${authorityData.decisor_principal}\n`;
notes += `⏰ TIMING: ${timingData.urgencia}\n`;
```

---

## 8. MUDANÇAS NECESSÁRIAS PARA REFATORAÇÃO

### 8.1 MUDANÇA A: Adicionar "NICHO" no Stage NEED

**Arquivo**: `src/tools/bant_stages_v2.js`
**Linha**: 31-34

**Antes**:
```javascript
need: {
  camposEssenciais: [
    'problema_principal',
    'servico_identificado',
    'intensidade_problema',
    'consequencias',
    'receita_mensal',
    'funcionarios'
  ],
```

**Depois**:
```javascript
need: {
  camposEssenciais: [
    'nicho',                      // ← NOVO (essencial, antes de problema)
    'problema_principal',
    'servico_identificado',
    'intensidade_problema',
    'consequencias',
    'receita_mensal',
    'funcionarios'
  ],
```

**Adicionar scoring** (linha 35-42):
```javascript
scoring: {
  nicho: 15,                       // ← NOVO (15 pontos)
  problema_principal: 25,
  servico_identificado: 25,
  intensidade_problema: 15,
  consequencias: 15,
  receita_mensal: 10,
  funcionarios: 10
},
```

**Atualizar scoreMinimo** (linha 43):
```javascript
scoreMinimo: 115,  // 7 campos essenciais = 115 pontos
```

**Adicionar descrição** (linha 53-54):
```javascript
descricaoCampos: {
  nicho: 'Qual é o seu nicho/ramo de atuação mais específico?',
  problema_principal: 'Qual o principal desafio financeiro...',
  // ... resto
}
```

**Atualizar opening message** (linha 45-51):
```javascript
openingMessage: `Show, obrigado por responder!

📝 Só pra eu entender melhor:
• Qual é seu nicho? (mercadinho, clínica, restaurante, serviço, etc)
• Você trabalha sozinho ou com mais gente?

E no financeiro, hoje, o que mais pega pra você: não saber se dá lucro, caixa apertado ou cliente devendo?`,
```

### 8.2 MUDANÇA B: Personalizar BUDGET com Contexto do Lead

**Arquivo**: `src/tools/bant_stages_v2.js`
**Método**: `analyzeWithGPT()` (linha ~467)

**Adicionar contexto personalizado por nicho**:
```javascript
// Após preparar profileContext, adicionar:

const nicho = this.stageData['need'].campos.nicho || null;
const problema = this.stageData['need'].campos.problema_principal || null;
const receita = this.stageData['need'].campos.receita_mensal || null;

let budgetContext = '';
if (stage === 'budget' && nicho && receita) {
  budgetContext = `
📊 CONTEXTO FINANCEIRO DO LEAD:
• Nicho: ${nicho}
• Faturamento: ${receita}
• Problema Principal: ${problema}

SUGESTÃO DE PREÇO por nicho:
  Mercadinho: R$ 197-297 (margem apertada)
  Clínica: R$ 297-497 (volume fixo)
  Restaurante: R$ 497-997 (custos variáveis altos)
  Serviço/Autônomo: R$ 197 (apenas básico)
`;
}

// Adicionar ao prompt:
const prompt = `...${historyContext}${profileContext}${budgetContext}...`;
```

**Atualizar message de BUDGET opening** (linha 74-85):
```javascript
openingMessage: (state) => {
  // Gerar dinamicamente baseado no nicho
  if (state.nicho === 'mercadinho') {
    return `Pelo que você falou, em mercadinho o gargalo é sempre entre boleto e cartão.

A gente faz isso no plano **Starter**: R$ 197/mês
✅ Fluxo de caixa organizado
✅ Margem por produto
✅ Alertas de liquidez

Se não economizar pelo menos R$ 200/mês em erro, nem faz sentido. Cabe no orçamento?`;
  } else if (state.nicho === 'clínica') {
    // ... variação para clínica
  }
  // ... mais nichos
}
```

### 8.3 MUDANÇA C: Adicionar Roteiro de Objeção de Preço

**Novo arquivo**: `src/tools/price_objection_handler.js`

```javascript
export class PriceObjectionHandler {
  static detectPriceObjection(message) {
    const patterns = [
      /caro|muito caro|alto|apertado|não cabe|não posso/i,
      /é muito|é bastante|é puxado/i,
      /como assim|quanto custa|qual o preço/i
    ];
    return patterns.some(p => p.test(message));
  }

  static async handleObjection(leadState, message) {
    // Extrair contexto do lead
    const receita = leadState.bantStages.stageData.need.campos.receita_mensal;
    const nicho = leadState.bantStages.stageData.need.campos.nicho;
    const problema = leadState.bantStages.stageData.need.campos.problema_principal;
    const budgetMencionado = leadState.bantStages.stageData.budget.campos.faixa_investimento;

    // ROI calculation
    let roiResponse = '';
    if (receita && problem) {
      // Se ganha 50k/mês e o problema custa 5% da receita = R$ 2.500
      // Nosso sistema custa R$ 197, ROI = 2500/197 = 12x
      roiResponse = this.calculateROI(receita, problema, budgetMencionado);
    }

    // Usar GPT para responder objeção de forma consultiva
    const prompt = `Você é consultor de gestão financeira respondendo objeção de preço.

PERFIL DO LEAD:
• Nicho: ${nicho}
• Faturamento: ${receita}
• Problema: ${problema}
• Preço mencionado: ${budgetMencionado}

RESPOSTA DO LEAD (OBJEÇÃO): "${message}"

CONTEXTO FINANCEIRO:
${roiResponse}

Seu objetivo é não VENDER, mas CALCULAR junto com o lead se o investimento faz sentido.
Responda em 2-3 linhas, focando em:
1. Reconhecer a preocupação
2. Calcular quanto o problema custa por mês
3. Comparar com o valor do plano

Exemplo:
"Entendo que R$ 197 é um custo. Mas pensa: se você tá perdendo R$ 2.000/mês por não saber o lucro,
R$ 197 se paga em 2 dias. Concorda?"`;

    // ... usar openAI para responder
  }

  static calculateROI(receita, problema, custo) {
    // Lógica para calcular quanto o problema custa
    // Baseado em receita, nicho, tipo de problema
  }
}
```

**Integrar no Specialist Agent** (bant_stages_v2.js):
```javascript
// Após analyzeWithGPT():

if (stage === 'budget') {
  // Verificar se há objeção de preço
  const { isPriceObjection } = await import('../tools/price_objection_handler.js');
  
  if (isPriceObjection(userMessage)) {
    console.log(`💰 [BANT] Objeção de preço detectada`);
    const objectionResponse = await handlePriceObjection(leadState, userMessage);
    analysis.resposta_consultiva = objectionResponse;
  }
}
```

### 8.4 MUDANÇA D: Adicionar Regra "1 Pergunta por Mensagem"

**Arquivo**: `src/tools/bant_stages_v2.js`
**Função**: `analyzeWithGPT()` (linha ~467)

**Adicionar validação pós-GPT**:
```javascript
// Após receber resposta do GPT:
const response = await openaiClient.chat.completions.create({...});
let consultiveResponse = response.choices[0].message.content.trim();

// ✅ VALIDAÇÃO: Garantir máximo 1 pergunta
const questions = (consultiveResponse.match(/\?/g) || []).length;

if (questions > 1) {
  console.warn(`⚠️ [BANT] GPT retornou ${questions} perguntas - ajustando`);
  
  // Tentar remover pergunta secundária
  // Padrão: geralmente vem no final com "E você..."
  consultiveResponse = consultiveResponse.replace(
    /\n\n(E |Você |Como |Qual |Quantos ).+\?/i,
    ''
  );
  
  // Se ainda tiver múltiplas, manter apenas a primeira
  if (consultiveResponse.match(/\?/g).length > 1) {
    consultiveResponse = consultiveResponse.split('?')[0] + '?';
  }
}

return {
  campos_coletados: {...},
  resposta_consultiva: consultiveResponse
};
```

### 8.5 MUDANÇA E: Adicionar Limite de Tamanho de Mensagem

**Arquivo**: `src/tools/bant_stages_v2.js`
**Função**: `analyzeWithGPT()`

**Adicionar validação de tamanho**:
```javascript
// Após validação de pergunta:

const MAX_MESSAGE_SIZE = 500;  // caracteres

if (consultiveResponse.length > MAX_MESSAGE_SIZE) {
  console.warn(`⚠️ [BANT] Mensagem muito longa (${consultiveResponse.length} chars)`);
  
  // Truncar mantendo a pergunta
  const lastQuestion = consultiveResponse.lastIndexOf('?');
  if (lastQuestion > MAX_MESSAGE_SIZE) {
    consultiveResponse = consultiveResponse.substring(0, MAX_MESSAGE_SIZE) + '?';
  }
}

return {
  campos_coletados: {...},
  resposta_consultiva: consultiveResponse
};
```

---

## 9. PONTOS DE MODIFICAÇÃO EXATOS PARA REFATORAÇÃO

### 9.1 Matriz de Arquivos Afetados

| Mudança | Arquivo | Método | Linhas | Tipo |
|---------|---------|--------|--------|------|
| A (Nicho) | bant_stages_v2.js | STAGE_REQUIREMENTS | 30-60 | Config |
| A (Nicho) | leadState.schema.js | LEAD_STATE_SCHEMA | - | Schema |
| B (Budget) | bant_stages_v2.js | analyzeWithGPT | 467+ | Logic |
| B (Budget) | bant_stages_v2.js | openingMessage | 74-85 | Message |
| C (Objeção) | price_objection_handler.js | NEW FILE | - | New |
| C (Objeção) | bant_stages_v2.js | processMessage | 300+ | Logic |
| D (1 pergunta) | bant_stages_v2.js | analyzeWithGPT | 600+ | Logic |
| E (Tamanho) | bant_stages_v2.js | analyzeWithGPT | 600+ | Logic |

### 9.2 Ordem de Implementação Recomendada

1. **Mudança A (Nicho)** - Fundamentação para outras mudanças
2. **Atualizar Schema** - Refletir nicho no estado
3. **Mudança B (Budget Personalizado)** - Usar nicho para adaptar
4. **Mudança C (Objeção de Preço)** - Handler novo
5. **Mudança D (1 pergunta)** - Validação de resposta
6. **Mudança E (Tamanho)** - Última validação

---

## 10. CHECKLIST DE TESTES

### 10.1 Testes por Agente

**SDR Agent**:
- [ ] Lead novo recebe mensagem de introdução
- [ ] Dados são coletados corretamente
- [ ] Handoff para Specialist funciona

**Specialist Agent**:
- [ ] Recebe handoff com perfil bruto
- [ ] Extrai nicho corretamente
- [ ] Faz perguntas NEED com contexto do nicho
- [ ] Valida 1 pergunta por mensagem
- [ ] Valida tamanho máximo
- [ ] Detecta objeção de preço
- [ ] Avança para próximo stage quando essenciais coletados
- [ ] Detecta loop infinito e força avanço

**Scheduler Agent**:
- [ ] Coleta email
- [ ] Propõe horários
- [ ] Cria evento no Google Calendar
- [ ] Cria oportunidade no Pipeline com dados BANT corretos

### 10.2 Testes de Integração

- [ ] Lead completa fluxo: SDR → Specialist → Scheduler
- [ ] Dados persistem corretamente entre mensagens
- [ ] Google Sheets sincroniza com todos os campos BANT
- [ ] Pipeline mostra nicho e faturamento
