# DIAGRAMA DA ARQUITETURA - 3 AGENTES

## 1. FLUXO GERAL COM PONTOS DE ARMAZENAMENTO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USUÁRIO (WhatsApp)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENTE HUB (agent_hub.js)                            │
│  • Recupera leadState do banco                                          │
│  • Roteia para agente correto (SDR → Specialist → Scheduler)           │
│  • Salva estado após cada mensagem                                      │
│  • Sincroniza com Google Sheets (background)                            │
└─────────────────────────────────────────────────────────────────────────┘
           ↓                        ↓                         ↓
      ┌────────────┐           ┌───────────┐            ┌──────────────┐
      │ SDR Agent  │           │ Specialist│            │   Scheduler  │
      │            │           │   Agent   │            │    Agent     │
      │ Coleta:    │           │           │            │              │
      │ • nome     │           │ Executa:  │            │ Coleta:      │
      │ • empresa  │──────────→│ BANT V2   │──────────→ │ • email      │
      │ • setor    │ handoff   │ (4 stages)│ handoff    │ Propõe:      │
      │            │           │           │            │ • horários   │
      └────────────┘           │ Persiste: │            │ Cria:        │
                                │ BANTSystem│            │ • evento Cal │
                                │ em memory │            │ • Pipeline   │
                                └───────────┘            └──────────────┘
                                      ↓
                    ┌─────────────────────────────────┐
                    │     leadState no Banco (DB)     │
                    │                                 │
                    │  Tabela: lead_states            │
                    │  Colunas JSON:                  │
                    │  - company_profile              │
                    │  - bant_stages                  │
                    │  - scheduler                    │
                    │  - metadata                     │
                    └─────────────────────────────────┘
```

---

## 2. ESTRUTURA DE DADOS - leadState (Canonical Schema)

```
leadState {
  ┌─ Identidade
  │  ├─ phoneNumber: "5584987654321" ← Primary Key
  │  ├─ currentAgent: "sdr|specialist|scheduler"
  │  └─ messageCount: 5
  │
  ├─ Perfil da Empresa (Coletado pelo SDR, Usado pelo Specialist)
  │  └─ companyProfile {
  │     ├─ nome: "João Silva"
  │     ├─ empresa: "Clínica Nova"
  │     └─ setor: "Clínica" ← CRÍTICO para personalização
  │
  ├─ BANT Qualification (Gerenciado pelo Specialist)
  │  └─ bantStages {
  │     ├─ currentStage: "need|budget|authority|timing"
  │     ├─ stageIndex: 0-3
  │     ├─ isComplete: false
  │     │
  │     └─ stageData {
  │        │
  │        ├─ need {
  │        │  └─ campos {
  │        │     ├─ nicho: "Clínica" ← NOVO (para especialização)
  │        │     ├─ problema_principal: "Pacientes não aparecem"
  │        │     ├─ servico_identificado: "crm"
  │        │     ├─ intensidade_problema: "Crítico"
  │        │     ├─ consequencias: "Perda de receita"
  │        │     ├─ receita_mensal: "R$ 30.000"
  │        │     └─ funcionarios: "3-5"
  │        │  └─ tentativas: 2
  │        │  └─ lastUpdate: 1700000000000
  │        │
  │        ├─ budget {
  │        │  └─ campos {
  │        │     ├─ faixa_investimento: "R$ 297"  ← PERSONALIZADO
  │        │     ├─ roi_esperado: "Reduzir no-shows"
  │        │     └─ flexibilidade_budget: "Flexível"
  │        │  └─ tentativas: 2
  │        │
  │        ├─ authority {
  │        │  └─ campos {
  │        │     ├─ decisor_principal: "Dono"
  │        │     ├─ autonomia_decisao: "Autonomia total"
  │        │     └─ processo_decisao: "Rápido"
  │        │
  │        └─ timing {
  │           └─ campos {
  │              ├─ urgencia: "Urgente"
  │              ├─ prazo_ideal: "Esta semana"
  │              └─ motivo_urgencia: "Novo ano fiscal"
  │
  ├─ Scheduler (Gerenciado pelo Scheduler Agent)
  │  └─ scheduler {
  │     ├─ stage: "collecting_email|proposing_times|confirmed"
  │     ├─ leadEmail: "joao@clinica.com"
  │     ├─ proposedSlots: [...]
  │     ├─ selectedSlot: { date, time, label }
  │     └─ meetingData {
  │        ├─ eventId: "abc123"
  │        ├─ meetLink: "https://meet.google.com/..."
  │        └─ confirmedAt: "2024-11-18T10:00:00Z"
  │
  └─ Metadata
     └─ metadata {
        ├─ createdAt: "2024-11-18T09:00:00Z"
        ├─ updatedAt: "2024-11-18T10:30:00Z"
        ├─ lastMessageAt: "2024-11-18T10:30:00Z"
        ├─ handoffHistory: [...]
        ├─ introductionSent: true
        ├─ bantComplete: true
        ├─ meetingScheduled: true
        ├─ conversationCompleted: true
        ├─ lastSheetSync: "2024-11-18T10:30:00Z"
        └─ sheetSyncErrors: 0
}
```

---

## 3. FLUXO SDR AGENT

```
LEAD NOVO
   ↓
┌──────────────────────────────────┐
│ SDR.process(message, context)    │
│                                  │
│ 1. Detecta início (/start)       │
│    → Envia mensagem introdução   │
│    → Atualiza: metadata.intro... │
│                                  │
│ 2. Lead envia dados              │
│    → SDR.companyProfile.rawResp..│
│    → Prepara handoff             │
│                                  │
│ 3. Faz handoff                   │
│    → nextAgent: 'specialist'     │
│    → handoffData: { companyPr... │
│                                  │
└──────────────────────────────────┘
           ↓
    AgentHub.executeHandoff()
           ↓
┌──────────────────────────────────────┐
│ Specialist.onHandoffReceived()       │
│                                      │
│ 1. Extrai com GPT:                  │
│    rawResponse → { nome, empresa,   │
│    setor } ← AQUI DETECTA SETOR!   │
│                                      │
│ 2. Inicializa BANTStagesV2          │
│    bantSystem.setCompanyProfile()   │
│                                      │
│ 3. Prepara message NEED             │
│    message = getNextStageOpening()  │
│                                      │
│ 4. Retorna estado com BANT          │
│    updateState: {                   │
│      bantStages: system.getState(),  │
│      companyProfile: {...}          │
│    }                                 │
└──────────────────────────────────────┘
```

---

## 4. FLUXO SPECIALIST AGENT - BANT V2

```
STAGE NEED (Coletando Necessidade)
┌─────────────────────────────────────────────────┐
│ Campos Essenciais (7):                          │
│ ✓ nicho (NOVO)              → 15 pts           │
│ ✓ problema_principal         → 25 pts           │
│ ✓ servico_identificado       → 25 pts           │
│ ✓ intensidade_problema       → 15 pts           │
│ ✓ consequencias              → 15 pts           │
│ ✓ receita_mensal             → 10 pts           │
│ ✓ funcionarios               → 10 pts           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Score Mínimo: 115 pts                           │
│                                                 │
│ Quando coletados → Avançar para BUDGET          │
└─────────────────────────────────────────────────┘
           ↓
STAGE BUDGET (Coletando Orçamento)
┌─────────────────────────────────────────────────┐
│ Campos Essenciais (3):                          │
│ ✓ faixa_investimento     → 40 pts              │
│   (Personalizado por NICHO ← MUDANÇA B)        │
│ ✓ roi_esperado           → 30 pts              │
│ ✓ flexibilidade_budget   → 30 pts              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Score Mínimo: 100 pts                           │
│                                                 │
│ Objeção de Preço?                               │
│ ← Detecta "caro" e responde com ROI (MUDANÇA C)│
│                                                 │
│ Quando coletados → Avançar para AUTHORITY       │
└─────────────────────────────────────────────────┘
           ↓
STAGE AUTHORITY (Coletando Decisor)
┌─────────────────────────────────────────────────┐
│ Campos Essenciais (3):                          │
│ ✓ decisor_principal      → 40 pts              │
│ ✓ autonomia_decisao      → 30 pts              │
│ ✓ processo_decisao       → 30 pts              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Score Mínimo: 100 pts                           │
│                                                 │
│ Quando coletados → Avançar para TIMING          │
└─────────────────────────────────────────────────┘
           ↓
STAGE TIMING (Coletando Urgência)
┌─────────────────────────────────────────────────┐
│ Campos Essenciais (2):                          │
│ ✓ urgencia               → 50 pts              │
│ ✓ prazo_ideal            → 50 pts              │
│ Opcionais: motivo_urgencia                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Score Mínimo: 100 pts                           │
│                                                 │
│ Quando coletados → BANT COMPLETO!               │
└─────────────────────────────────────────────────┘
           ↓
    BANT COMPLETO → Handoff para Scheduler
```

---

## 5. FLUXO SPECIALIST - PROCESSAMENTO DE MENSAGEM

```
Input: userMessage (texto do lead)
   ↓
┌────────────────────────────────────────────┐
│ 1. Recuperar BANTSystem                    │
│    • Da memória (Map por contato) OU       │
│    • Carregar estado persistido            │
│    • Restaurar estado do leadState         │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 2. Análise com GPT (analyzeWithGPT)       │
│                                            │
│ Inputs para GPT:                           │
│ ├─ userMessage (texto atual)              │
│ ├─ conversationHistory (últimas msgs)     │
│ ├─ profileContext (setor, empresa)        │
│ ├─ budgetContext (receita, nicho) ← B    │
│ └─ currentStage (need/budget/...)         │
│                                            │
│ Saídas:                                    │
│ ├─ campos_coletados {...}                 │
│ └─ resposta_consultiva "..."              │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 3. Classificação de Serviço                │
│    Se stage=need e problema_principal:    │
│    ├─ classificarServicoPorDor()          │
│    └─ Atualizar: servico_identificado    │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 4. Scoring e Validação                     │
│    ├─ calculateStageScore()                │
│    ├─ checkEssenciaisColetados()           │
│    └─ Comparar com scoreMinimo             │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 5. Decisão: Avançar ou Continuar?         │
│                                            │
│ SE essenciais coletados:                  │
│  └─ persistState() → Salvar estado        │
│  └─ advanceStage() → ir próximo           │
│  └─ getNextStageOpening() → msg transição │
│                                            │
│ SENÃO:                                     │
│  └─ Continuar no mesmo stage              │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 6. Validação de Qualidade (NOVO!)         │
│    ├─ Máximo 1 pergunta (MUDANÇA D)       │
│    └─ Máximo 500 chars (MUDANÇA E)        │
└────────────────────────────────────────────┘
   ↓
┌────────────────────────────────────────────┐
│ 7. Retorna resultado                       │
│    ├─ message: resposta_consultiva        │
│    ├─ updateState: { bantStages: ... }   │
│    └─ handoff: true|false                 │
└────────────────────────────────────────────┘
```

---

## 6. FLUXO SCHEDULER AGENT

```
ETAPA 1: Coletando Email
┌────────────────────────────────────┐
│ Input: "joao@clinica.com"          │
│                                    │
│ 1. detectEmail(text) → válido?    │
│ 2. Se SIM:                         │
│    ├─ getAvailableTimeSlots()      │
│    ├─ proposeTimeSlots()           │
│    └─ scheduler.stage = 'proposing'│
│ 3. Se NÃO:                         │
│    └─ Pedir email novamente        │
└────────────────────────────────────┘
          ↓
ETAPA 2: Propondo Horários
┌────────────────────────────────────┐
│ Input: "Terça, 10h"                │
│                                    │
│ 1. detectTimeConfirmation(text)   │
│ 2. Se confirmou:                   │
│    ├─ createCalendarEvent()        │
│    ├─ addPipelineOpportunity()     │ ← NOVO!
│    └─ scheduler.stage = 'confirmed'│
│ 3. Se negociando:                  │
│    └─ negotiateTimeSlot()          │
└────────────────────────────────────┘
          ↓
ETAPA 3: Criando Oportunidade no Pipeline
┌────────────────────────────────────────────┐
│ opportunityData = {                        │
│   nome: lead.companyProfile.nome,         │
│   empresa: lead.companyProfile.empresa,   │
│   setor: lead.companyProfile.setor,       │ ← NICHO
│   dor: lead.bantStages.need.problema,     │ ← NEED
│   valor: lead.bantStages.budget.faixa,    │ ← BUDGET
│   decisor: lead.bantStages.authority...,  │ ← AUTHORITY
│   urgencia: lead.bantStages.timing...,    │ ← TIMING
│   data_reuniao: confirmation.date,        │
│   meet_link: eventResult.meetLink,        │
│   pipeline_stage: 'qualification',        │
│   origem: 'BANT Completo'                 │
│ }                                         │
│                                           │
│ addPipelineOpportunity(opportunityData)  │ ← Google Sheets
└────────────────────────────────────────────┘
          ↓
    REUNIÃO AGENDADA + PIPELINE CRIADO
```

---

## 7. FLUXO DE PERSISTÊNCIA

```
┌──────────────────────────────────────────────────────┐
│              Após cada mensagem                      │
│                                                      │
│  AgentHub.processMessage()                           │
│    ↓                                                 │
│  agent.process(message, context) → result           │
│    ↓                                                 │
│  SE result.updateState:                             │
│    leadState = deepMerge(leadState, result.update..)│
│    ↓                                                 │
│  saveLeadState(leadState)                           │
│    ↓                                                 │
│  ┌────────────────────────────────────────┐         │
│  │ StateValidator.validate(state)         │         │
│  │ • Verificar phoneNumber                │         │
│  │ • Verificar currentAgent               │         │
│  │ • Verificar bantStages.currentStage   │         │
│  │ • Verificar scheduler.stage            │         │
│  └────────────────────────────────────────┘         │
│    ↓                                                 │
│  ┌────────────────────────────────────────┐         │
│  │ SQLite Database (orbion.db)            │         │
│  │                                        │         │
│  │ INSERT/UPDATE lead_states              │         │
│  │   phone_number: "5584987654321"        │         │
│  │   current_agent: "specialist"          │         │
│  │   company_profile: JSON {...}          │         │
│  │   bant_stages: JSON {...}              │         │
│  │   scheduler: JSON {...}                │         │
│  │   metadata: JSON {...}                 │         │
│  │   updated_at: CURRENT_TIMESTAMP        │         │
│  └────────────────────────────────────────┘         │
│                                                      │
│  EM BACKGROUND:                                     │
│    syncLeadToSheets(leadState)                      │
│    └─ Sincroniza com Google Sheets                  │
└──────────────────────────────────────────────────────┘
```

---

## 8. MAPA DE PERSONALIZAÇÃO POR NICHO

```
┌─────────────────────────────────────────────────────┐
│                    NICHO DETECTADO                   │
│            (companyProfile.setor)                    │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │Mercadinho│    │ Clínica  │    │Restaurante│
   └─────────┘    └──────────┘    └──────────┘
        ↓               ↓               ↓
        │               │               │
    NEED:           NEED:           NEED:
    "Caixa          "Pacientes      "CMV +
     negativo"      não aparecem"   Desperdício"
        ↓               ↓               ↓
    Serviço:        Serviço:        Serviço:
    fluxo_caixa     crm             estoque
        ↓               ↓               ↓
        │               │               │
    BUDGET:         BUDGET:         BUDGET:
    R$ 197-297      R$ 297-497      R$ 497-997
        ↓               ↓               ↓
    Contexto:       Contexto:       Contexto:
    "Margem          "Agendamento     "Custo
     apertada"       automático"      variável"
```

---

## 9. DETECÇÃO E FLUXO DE OBJEÇÃO DE PREÇO

```
GPT responde: "É R$ 197"
   ↓
Lead: "Mas é caro demais"
   ↓
┌─────────────────────────────────────────┐
│ PriceObjectionHandler.detect()          │
│ Regex: /caro|muito caro|apertado/i     │
│ Result: true ← Objeção detectada!       │
└─────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────┐
│ PriceObjectionHandler.handleObjection() │
│                                         │
│ Extrai contexto:                        │
│ ├─ receita: "R$ 30.000"                │
│ ├─ nicho: "Clínica"                    │
│ └─ problema: "Pacientes não aparecem"  │
│                                         │
│ Calcula ROI:                            │
│ ├─ Perda/mês: ~R$ 2.000 (2 x R$100)   │
│ ├─ Custo solução: R$ 297               │
│ └─ ROI: 6.7x (paga em ~5 dias)        │
│                                         │
│ Resposta com GPT:                       │
│ "Entendo que R$ 297 é um custo.        │
│  Mas se você tá perdendo 2 pacientes   │
│  por dia, são R$ 2.000 perdidos/mês.   │
│  R$ 297 se paga em 5 dias. Topa?"     │
└─────────────────────────────────────────┘
   ↓
Lead: "Certo, vamos lá"
   ↓
Prossegue com BANT...
```

---

## 10. MATRIZ DE ENDPOINTS E ARMAZENAMENTO

```
┌────────────────────────────────────────────────────────┐
│                  WEBH OOK ENTRADA                      │
│  /api/webhook/evolution (WhatsApp message)             │
└────────────────────────────────────────────────────────┘
            ↓
   ┌───────────────────────┐
   │  AgentHub.processMsg  │
   │  • getLeadState()     │
   │  • agent.process()    │
   │  • saveLeadState()    │
   │  • syncToSheets()     │
   └───────────────────────┘
            ↓
   ┌───────────────────────────────────┐
   │  ARMAZENAMENTO (leadState)        │
   │  • SQLite (orbion.db)             │
   │  • Memory.js (conversação)        │
   │  • Google Sheets (Pipeline)       │
   └───────────────────────────────────┘
            ↓
   ┌───────────────────────┐
   │  RESPOSTA ENVIADA     │
   │  Volta para WhatsApp  │
   └───────────────────────┘
```

