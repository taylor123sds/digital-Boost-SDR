# 🔄 Diagrama de Fluxo de Estados do ORBION

## 📊 Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ORBION AI SDR AGENT                            │
│                      Multi-Agent System com BANT                         │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
         ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
         │             │     │             │     │             │
         │ SDR Agent   │────▶│ Specialist  │────▶│  Scheduler  │
         │             │     │   Agent     │     │    Agent    │
         └─────────────┘     └─────────────┘     └─────────────┘
          (Discovery)        (Qualification)        (Booking)
```

---

## 🎯 AGENTE 1: SDR Agent (Discovery)

### Estados Possíveis
```
┌─────────────┐
│  DISCOVERY  │ ← Estado único
└─────────────┘
```

### Fluxo Interno
```
Lead envia mensagem
        │
        ▼
┌─────────────────┐
│ Detecta DOR?    │
│ - Marketing     │
│ - Sites         │
│ - Audiovisual   │
└────┬────────────┘
     │ SIM
     ▼
┌─────────────────┐
│ Valida Lead?    │
│ - Localização   │
│ - Interesse     │
└────┬────────────┘
     │ SIM
     ▼
┌─────────────────┐
│ HANDOFF para    │
│ Specialist      │
└─────────────────┘
```

### Dados Passados no Handoff
```json
{
  "painType": "growth_marketing" | "sites" | "audiovisual",
  "painDescription": "descrição da dor mencionada",
  "leadName": "João",
  "leadLocation": "Natal/RN",
  "leadInterest": "alto"
}
```

---

## 🎯 AGENTE 2: Specialist Agent (Qualification + BANT)

### ✨ NOVO: Estados Expandidos

```
┌──────────────────┐
│ pain_discovery   │ ← ✅ NOVA FASE
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     budget       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   authority      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     timing       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ qualified (70%+) │
└────────┬─────────┘
         │
         ▼
   HANDOFF para
    Scheduler
```

### Fluxo Detalhado

#### Fase 1: Pain Discovery (✅ NOVA)

```
Recebe handoff do SDR
        │
        ▼
┌─────────────────────────────────────┐
│ Estado: pain_discovery              │
│                                     │
│ Pergunta: "Qual é a principal       │
│ trava?"                             │
│                                     │
│ Opções:                             │
│ • Visibilidade                      │
│ • Conversão                         │
│ • CAC                               │
│ • Previsibilidade                   │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "Conversão"
              │
              ▼
┌─────────────────────────────────────┐
│ extractPainDetails()                │
│                                     │
│ Detecta keywords:                   │
│ - "conversão" ✓                     │
│ - "não fecha" ✓                     │
│                                     │
│ Categoria: "conversão"              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ getPainToBudgetTransition()         │
│                                     │
│ Mensagem consultiva específica:     │
│ "Perfeito! Conversão baixa é..."    │
│                                     │
│ [valida] → [explica] → [solução]   │
│                                     │
│ Transição para Budget               │
└─────────────┬───────────────────────┘
              │
              ▼
        Estado: budget
```

#### Fase 2: Budget

```
┌─────────────────────────────────────┐
│ Estado: budget                      │
│                                     │
│ Pergunta consultiva sobre budget    │
│ adaptada à dor detectada            │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "Conforme projeto"
              │
              ▼
┌─────────────────────────────────────┐
│ bantSystem.extractBudget()          │
│                                     │
│ Detecta:                            │
│ - Pattern: "conforme projeto"       │
│ - Valida com GPT-4o-mini            │
│                                     │
│ Budget: "Flexível"                  │
└─────────────┬───────────────────────┘
              │
              ▼
      Estado: authority
```

#### Fase 3: Authority

```
┌─────────────────────────────────────┐
│ Estado: authority                   │
│                                     │
│ Pergunta sobre decisores            │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "Eu e meu sócio"
              │
              ▼
┌─────────────────────────────────────┐
│ bantSystem.extractAuthority()       │
│                                     │
│ Detecta:                            │
│ - "sócio" → Decisor direto          │
│                                     │
│ Authority: "Decisor"                │
└─────────────┬───────────────────────┘
              │
              ▼
       Estado: timing
```

#### Fase 4: Timing

```
┌─────────────────────────────────────┐
│ Estado: timing                      │
│                                     │
│ Pergunta sobre urgência             │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "O mais rápido possível"
              │
              ▼
┌─────────────────────────────────────┐
│ bantSystem.extractTiming()          │
│                                     │
│ Detecta:                            │
│ - "rápido" → Urgente                │
│                                     │
│ Timing: "Imediato"                  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Calcula Score de Qualificação       │
│                                     │
│ Need: ✓                             │
│ Budget: ✓                           │
│ Authority: ✓                        │
│ Timing: ✓                           │
│                                     │
│ Score: 85%                          │
└─────────────┬───────────────────────┘
              │
              ▼ (Score >= 70%)
┌─────────────────────────────────────┐
│ isReadyToSchedule() = TRUE          │
│                                     │
│ HANDOFF para Scheduler              │
└─────────────────────────────────────┘
```

---

## 🎯 AGENTE 3: Scheduler Agent (Booking)

### Estados do Scheduler

```
┌──────────────────┐
│ collecting_email │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ proposing_times  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   confirmed      │
└──────────────────┘
```

### Fluxo Detalhado

#### Fase 1: Collecting Email

```
Recebe handoff do Specialist
        │
        ▼
┌─────────────────────────────────────┐
│ Estado: collecting_email            │
│                                     │
│ "Antes de propor horários, preciso │
│ do seu email..."                    │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "joao@empresa.com.br"
              │
              ▼
┌─────────────────────────────────────┐
│ detectEmail()                       │
│                                     │
│ Regex: /[\w\.-]+@[\w\.-]+\.\w+/    │
│                                     │
│ Email válido: ✓                     │
└─────────────┬───────────────────────┘
              │
              ▼
    Estado: proposing_times
```

#### Fase 2: Proposing Times

```
┌─────────────────────────────────────┐
│ Estado: proposing_times             │
│                                     │
│ "Vou te propor alguns horários..."  │
│                                     │
│ 📅 Quinta, 24/10                    │
│    • 10:00                          │
│    • 14:00                          │
│    • 16:00                          │
└─────────────┬───────────────────────┘
              │
              ▼
       Lead responde
       "Quinta às 14h"
              │
              ▼
┌─────────────────────────────────────┐
│ detectTimeConfirmation()            │
│                                     │
│ Detecta:                            │
│ - "quinta" → 2025-10-24             │
│ - "14h" → 14:00                     │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ createCalendarEvent()               │
│                                     │
│ Google Calendar API:                │
│ - Título: "Reunião - João"          │
│ - Data: 2025-10-24T14:00:00         │
│ - Email: joao@empresa.com.br        │
│ - Meet: meet.google.com/xxx         │
└─────────────┬───────────────────────┘
              │
              ▼
      Estado: confirmed
```

#### Fase 3: Confirmed

```
┌─────────────────────────────────────┐
│ Estado: confirmed                   │
│                                     │
│ "✅ Reunião agendada!"              │
│                                     │
│ Envia:                              │
│ - Confirmação por WhatsApp          │
│ - Convite por email                 │
│ - Link do Google Meet               │
└─────────────────────────────────────┘
```

---

## 📊 Tabela de Estados Completa

| Agente     | Estado             | Próximo Estado         | Condição de Transição                    |
|------------|-------------------|------------------------|------------------------------------------|
| SDR        | discovery         | → Specialist           | DOR identificada + Lead válido           |
| Specialist | pain_discovery    | → budget               | Dor específica detectada                 |
| Specialist | budget            | → authority            | Budget coletado                          |
| Specialist | authority         | → timing               | Authority coletado                       |
| Specialist | timing            | → Scheduler            | Score >= 70% + 3 pilares BANT           |
| Scheduler  | collecting_email  | → proposing_times      | Email válido detectado                   |
| Scheduler  | proposing_times   | → confirmed            | Horário confirmado + Evento criado       |
| Scheduler  | confirmed         | [FIM]                  | Reunião confirmada                       |

---

## 🗄️ Estrutura de Dados no leadState

### Durante Pain Discovery
```json
{
  "phoneNumber": "5584996791624",
  "currentAgent": "specialist",
  "currentState": "pain_discovery",  // ✅ NOVO
  "painType": "growth_marketing",
  "painDescription": "escalar crescimento",
  "painDetails": null,  // ✅ Será preenchido
  "bant": {
    "need": "Escalar crescimento"
  }
}
```

### Após Pain Discovery
```json
{
  "phoneNumber": "5584996791624",
  "currentAgent": "specialist",
  "currentState": "budget",
  "painType": "growth_marketing",
  "painDescription": "escalar crescimento",
  "painDetails": {  // ✅ NOVO
    "rawResponse": "Conversão baixa mesmo, trazemos leads mas não fecham",
    "category": "conversão",
    "painType": "growth_marketing",
    "timestamp": "2025-10-22T01:00:00.000Z"
  },
  "bant": {
    "need": "Conversão baixa - leads não fecham"
  }
}
```

### Após BANT Completo
```json
{
  "phoneNumber": "5584996791624",
  "currentAgent": "scheduler",
  "currentState": "collecting_email",
  "painType": "growth_marketing",
  "painDetails": {
    "category": "conversão"
  },
  "bant": {
    "need": "Conversão baixa - leads não fecham",
    "budget": "Flexível - conforme projeto",
    "authority": "Decisor direto (sócio)",
    "timing": "Urgente (2-4 semanas)"
  },
  "qualificationScore": 85,
  "archetype": "Pragmático",
  "persona": "Executor",
  "readyToSchedule": true
}
```

### Após Agendamento
```json
{
  "phoneNumber": "5584996791624",
  "currentAgent": "scheduler",
  "currentState": "confirmed",
  "leadEmail": "joao@empresa.com.br",  // ✅ Coletado
  "scheduledMeeting": {  // ✅ Criado
    "eventId": "abc123def456",
    "dateTime": "2025-10-24T14:00:00-03:00",
    "meetLink": "https://meet.google.com/xxx-yyyy-zzz",
    "confirmed": true
  }
}
```

---

## 🔍 Comparação Visual: Antes vs. Depois

### ❌ Fluxo ANTERIOR (Direto)

```
SDR Agent
    │
    ▼
Specialist Agent
    │
    ├─ Budget    (pergunta direta)
    │
    ├─ Authority (pergunta direta)
    │
    ├─ Timing    (pergunta direta)
    │
    ▼
Scheduler Agent
```

**Problema**: Muito objetivo, sem explorar a dor

---

### ✅ Fluxo ATUAL (Consultivo)

```
SDR Agent
    │
    ▼
Specialist Agent
    │
    ├─ Pain Discovery  (✅ NOVO - explora dor específica)
    │    │
    │    ├─ Oferece 4 opções
    │    ├─ Lead escolhe "Conversão"
    │    └─ Valida e demonstra expertise
    │
    ├─ Budget    (transição consultiva)
    │
    ├─ Authority (mantém tom consultivo)
    │
    ├─ Timing    (mantém tom consultivo)
    │
    ▼
Scheduler Agent
```

**Solução**: Consultivo, demonstra expertise, entende a dor profundamente

---

## 🎯 Métricas de Qualificação

```
┌────────────────────────────────────────┐
│ Score de Qualificação (0-100%)        │
├────────────────────────────────────────┤
│                                        │
│ Need (25%)      ✓ Coletado pelo SDR   │
│ Budget (25%)    ✓ Detectado por regex │
│ Authority (25%) ✓ Validado por GPT    │
│ Timing (25%)    ✓ Urgência definida   │
│                                        │
├────────────────────────────────────────┤
│ Score Total: 85%                       │
│                                        │
│ Threshold: >= 70%                      │
│ Pilares mínimos: 3/4                   │
│                                        │
│ ✅ QUALIFICADO para agendamento        │
└────────────────────────────────────────┘
```

---

## 🚀 Benefícios da Nova Arquitetura

### Antes
- ❌ 3 mensagens (Budget → Authority → Timing)
- ❌ Tom transacional
- ❌ Sem demonstração de expertise

### Agora
- ✅ 5 mensagens (Pain Discovery → Transição → Budget → Authority → Timing)
- ✅ Tom consultivo
- ✅ 12 mensagens específicas por dor
- ✅ Validação + Expertise + Solução antes de perguntar comercial

---

**Documento criado em**: 22/10/2025
**Versão**: 1.0
**Status**: ✅ Implementado e ativo
