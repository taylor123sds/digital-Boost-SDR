# 🎨 FLUXO VISUAL COMPLETO - SISTEMA MULTI-AGENTE

## 📊 DIAGRAMA DE SEQUÊNCIA COMPLETO

```
LEAD                    AGENT HUB               SDR AGENT           SPECIALIST AGENT      SCHEDULER AGENT      GOOGLE CALENDAR
  │                         │                       │                       │                      │                    │
  │─────"Olá"──────────────>│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[Criar Estado]───────>│                       │                      │                    │
  │                         │  currentAgent: 'sdr'  │                       │                      │                    │
  │                         │  messageCount: 1      │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Primeira Mensagem]   │                      │                    │
  │                         │                       │ ✅ first_template_sent │                      │                    │
  │<────────────────────────│<──────────────────────│                       │                      │                    │
  │ "Olá! Sou a ORBION..."  │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"Escolha opção: 1)..."─>│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 2]────>│                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Detecta Bot]         │                      │                    │
  │                         │                       │ 🤖 4 sinais detectados│                      │                    │
  │                         │                       │ • menu_detected       │                      │                    │
  │                         │                       │ • classic_bot_phrase  │                      │                    │
  │                         │                       │ • multiple_options    │                      │                    │
  │                         │                       │ • repetitive_format   │                      │                    │
  │<────────────────────────│<──────────────────────│                       │                      │                    │
  │ "Oi! Parece sistema..." │  [Bridge Message]     │                       │                      │                    │
  │ "Responda: HUMANO OK"   │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"HUMANO OK"────────────>│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 3]────>│                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Verifica Signal]     │                      │                    │
  │                         │                       │ ✅ isHumanSignal()    │                      │                    │
  │                         │                       │ ✅ clearBotState()    │                      │                    │
  │<────────────────────────│<──────────────────────│                       │                      │                    │
  │ "Perfeito! Confirmado"  │                       │                       │                      │                    │
  │ "Me conta o desafio?"   │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"Preciso urgente de────>│                       │                       │                      │                    │
  │  ajuda com marketing"   │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 4]────>│                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Detecta DOR]         │                      │                    │
  │                         │                       │ 📊 Padrões:           │                      │                    │
  │                         │                       │   growth: 2 ✅        │                      │                    │
  │                         │                       │   sites: 0            │                      │                    │
  │                         │                       │   audio: 0            │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Mede Interesse]      │                      │                    │
  │                         │                       │ 📊 Keywords:          │                      │                    │
  │                         │                       │   preciso ✅          │                      │                    │
  │                         │                       │   urgente ✅          │                      │                    │
  │                         │                       │   ajuda ✅            │                      │                    │
  │                         │                       │ 📈 3/15 = 0.20 (20%)  │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │─[Decisão Handoff]     │                      │                    │
  │                         │                       │ ✅ DOR: growth_mkt    │                      │                    │
  │                         │                       │ ✅ Interesse: 20%     │                      │                    │
  │                         │                       │ ✅ HANDOFF!           │                      │                    │
  │                         │<──────────────────────│                       │                      │                    │
  │                         │  handoff: true        │                       │                      │                    │
  │                         │  nextAgent: specialist│                       │                      │                    │
  │                         │  handoffData: {       │                       │                      │                    │
  │                         │    painType: 'growth' │                       │                      │                    │
  │                         │    interestLevel: 0.2 │                       │                      │                    │
  │                         │  }                    │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[EXECUTE HANDOFF]─────────────────────────────>│                      │                    │
  │                         │  currentAgent: 'specialist' ✅                 │                      │                    │
  │                         │  previousAgent: 'sdr'                          │                      │                    │
  │                         │  handoffHistory: [sdr → specialist]            │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │─[onHandoffReceived]  │                    │
  │                         │                       │                       │ 🎯 DOR: growth_mkt   │                    │
  │                         │                       │                       │ 💼 BANT iniciado     │                    │
  │                         │                       │                       │    need: ✅ (do SDR) │                    │
  │                         │                       │                       │    budget: null      │                    │
  │                         │                       │                       │    authority: null   │                    │
  │                         │                       │                       │    timing: null      │                    │
  │<────────────────────────│<──────────────────────────────────────────────│                      │                    │
  │ "Entendi! Crescimento"  │                       │                       │                      │                    │
  │ "Vocês têm orçamento?"  │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"R$ 8 mil por mês"─────>│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 5]─────────────────────────────>│                      │                    │
  │                         │  currentAgent: 'specialist' ✅                 │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │─[Processa BANT]      │                    │
  │                         │                       │                       │ 💰 Budget: "R$ 8"    │                    │
  │                         │                       │                       │ 📊 Score: 55%        │                    │
  │                         │                       │                       │ 📋 Pilares: 2/4      │                    │
  │                         │                       │                       │ ❌ NÃO qualificado   │                    │
  │<────────────────────────│<──────────────────────────────────────────────│                      │                    │
  │ "Como tem sido o"       │                       │                       │                      │                    │
  │ "crescimento?"          │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"Sou o dono, decido"───>│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 6]─────────────────────────────>│                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │─[Processa BANT]      │                    │
  │                         │                       │                       │ 👤 Authority: "Sou"  │                    │
  │                         │                       │                       │ 📊 Score: 80% ✅     │                    │
  │                         │                       │                       │ 📋 Pilares: 3/4 ✅   │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │─[Verifica Handoff]   │                    │
  │                         │                       │                       │ ✅ Score ≥ 70%       │                    │
  │                         │                       │                       │ ✅ Pilares ≥ 3       │                    │
  │                         │                       │                       │ ✅ HANDOFF!          │                    │
  │                         │<──────────────────────────────────────────────│                      │                    │
  │                         │  handoff: true        │                       │                      │                    │
  │                         │  nextAgent: scheduler │                       │                      │                    │
  │                         │  handoffData: {       │                       │                      │                    │
  │                         │    bant: {...}        │                       │                      │                    │
  │                         │    score: 80          │                       │                      │                    │
  │                         │  }                    │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[EXECUTE HANDOFF]──────────────────────────────────────────────────>│                    │
  │                         │  currentAgent: 'scheduler' ✅                  │                      │                    │
  │                         │  previousAgent: 'specialist'                   │                      │                    │
  │                         │  handoffHistory: [sdr→specialist, specialist→scheduler]               │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │─[onHandoffReceived]│
  │                         │                       │                       │                      │ 🎯 Score: 80%      │
  │                         │                       │                       │                      │ 📅 Gera horários   │
  │                         │                       │                       │                      │    1. Seg 10h      │
  │                         │                       │                       │                      │    2. Seg 11h      │
  │                         │                       │                       │                      │    3. Ter 10h      │
  │                         │                       │                       │                      │    4. Ter 14h      │
  │                         │                       │                       │                      │    5. Qua 10h      │
  │<────────────────────────│<───────────────────────────────────────────────────────────────────│                    │
  │ "Perfeito! Vejo que"    │                       │                       │                      │                    │
  │ "vocês têm necessidade" │                       │                       │                      │                    │
  │ "Propostas de horário:" │                       │                       │                      │                    │
  │ "1. Segunda 10h..."     │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │─"Terça às 10h perfeito">│                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[messageCount: 7]──────────────────────────────────────────────────>│                    │
  │                         │  currentAgent: 'scheduler' ✅                  │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │─[Detecta Confirm]  │
  │                         │                       │                       │                      │ ✅ "Terça às 10h"  │
  │                         │                       │                       │                      │ 📅 Date: 2025-10-28│
  │                         │                       │                       │                      │ ⏰ Time: 10:00     │
  │                         │                       │                       │                      │                    │
  │                         │                       │                       │                      │─[Cria Evento]─────>│
  │                         │                       │                       │                      │  Summary: "Reunião"│
  │                         │                       │                       │                      │  Start: 2025-10-28 │
  │                         │                       │                       │                      │         10:00 BRT  │
  │                         │                       │                       │                      │  conferenceData:   │
  │                         │                       │                       │                      │    createRequest   │
  │                         │                       │                       │                      │<──[Event Created]──│
  │                         │                       │                       │                      │  eventId: abc123   │
  │                         │                       │                       │                      │  meetLink: meet... │
  │<────────────────────────│<───────────────────────────────────────────────────────────────────│                    │
  │ "🎉 Perfeito! Agendado!"│                       │                       │                      │                    │
  │ "📅 Data: 28/10/2025"   │                       │                       │                      │                    │
  │ "⏰ Horário: 10:00"     │                       │                       │                      │                    │
  │ "🔗 Link: meet.goo..." │                       │                       │                      │                    │
  │                         │                       │                       │                      │                    │
  │                         │─[Salva Estado Final]──────────────────────────────────────────────>│                    │
  │                         │  scheduledMeeting: {  │                       │                      │                    │
  │                         │    eventId: 'abc123'  │                       │                      │                    │
  │                         │    meetLink: 'meet...'│                       │                      │                    │
  │                         │  }                    │                       │                      │                    │
  │                         │                       │                       │                      │                    │
```

---

## 🔄 TABELA DE TRANSIÇÕES DE ESTADO

| # | Mensagem do Lead | Agente Ativo | Ação Executada | Próximo Agente | Dados Salvos |
|---|------------------|--------------|----------------|----------------|--------------|
| 1 | "Olá" | SDR | Envia primeira mensagem | SDR | `first_template_sent: true` |
| 2 | "Escolha opção: 1)..." | SDR | Detecta bot (4 sinais) | SDR | `botBridgeSent: true` |
| 3 | "HUMANO OK" | SDR | Verifica humano | SDR | `humanConfirmed: true` |
| 4 | "Preciso urgente marketing" | SDR | Detecta DOR + interesse → **HANDOFF** | **Specialist** | `painType: 'growth_marketing'`, `interestLevel: 0.20` |
| 5 | "R$ 8 mil por mês" | Specialist | Coleta Budget (Score: 55%) | Specialist | `bant.budget: 'R$ 8 mil'` |
| 6 | "Sou o dono" | Specialist | Coleta Authority (Score: 80%) → **HANDOFF** | **Scheduler** | `bant.authority: 'Sou'`, `qualificationScore: 80` |
| 7 | "Terça às 10h" | Scheduler | Cria evento Google Calendar | Scheduler | `scheduledMeeting: {...}`, `eventId: 'abc123'` |

---

## 🎯 MATRIZ DE DECISÃO - KEYWORDS

### **Detecção de DOR (Pain Type)**

| Categoria | Keywords (Regex) | Exemplo de Match | Score Mínimo |
|-----------|------------------|------------------|--------------|
| **Growth Marketing** | `/cresc/i`, `/marketing/i`, `/leads?/i`, `/vendas/i`, `/conversão/i` | "crescimento em vendas" | 1+ |
| **Sites** | `/site/i`, `/página/i`, `/landing/i`, `/lento/i`, `/design/i` | "site está lento" | 1+ |
| **Audiovisual** | `/v[íi]deo/i`, `/reels/i`, `/tiktok/i`, `/edição/i`, `/stories/i` | "vídeos para TikTok" | 1+ |

**Lógica de Decisão:**
```javascript
if (growthMatches > sitesMatches && growthMatches > audioMatches) {
  painType = 'growth_marketing';
} else if (sitesMatches > growthMatches && sitesMatches > audioMatches) {
  painType = 'sites';
} else if (audioMatches > 0) {
  painType = 'audiovisual';
}
```

---

### **Detecção de Interesse**

| Palavra-chave | Regex | Peso |
|---------------|-------|------|
| preciso | `/preciso/i` | 1/15 |
| quero | `/quero/i` | 1/15 |
| urgente | `/urgente/i` | 1/15 |
| ajuda | `/ajud(a\|ar)/i` | 1/15 |
| solução | `/solução/i` | 1/15 |
| resolver | `/resolver/i` | 1/15 |
| problema | `/problema/i` | 1/15 |
| dificuldade | `/dificuldade/i` | 1/15 |
| desafio | `/desafio/i` | 1/15 |
| melhorar | `/melhorar/i` | 1/15 |
| crescer | `/crescer/i` | 1/15 |
| aumentar | `/aumentar/i` | 1/15 |
| vender | `/vender/i` | 1/15 |
| ... | ... | ... |

**Threshold de Handoff:** `interestLevel >= 0.05` (5% = 1+ keyword de 15)

---

## 📊 MATRIZ DE HANDOFF

### **Handoff 1: SDR → Specialist**

| Condição | Threshold | Resultado |
|----------|-----------|-----------|
| DOR identificada | `painType !== null` | ✅ Necessário |
| Interesse detectado | `interestLevel >= 0.05` (5%) | ✅ Necessário |
| É humano | `isHuman === true` | ✅ Necessário |

**OU:**

| Condição Alternativa | Threshold | Resultado |
|---------------------|-----------|-----------|
| Interesse genérico sem DOR | `interestLevel >= 0.05` | ✅ HANDOFF com `painType: 'growth_marketing'` padrão |

**Dados Transferidos:**
- `painType` (ex: 'growth_marketing')
- `painDescription` (ex: 'Crescimento/Marketing/Vendas')
- `painKeywords` (array de keywords encontradas)
- `interestLevel` (0.00 - 1.00)
- `isHuman` (true/false)
- `sdrQualified` (true)
- `requiresPainRefinement` (true se DOR genérica)

---

### **Handoff 2: Specialist → Scheduler**

| Condição | Threshold | Resultado |
|----------|-----------|-----------|
| Score de qualificação | `qualificationScore >= 70` | ✅ Necessário |
| Pilares BANT coletados | `collectedCount >= 3` (de 4) | ✅ Necessário |

**Pilares BANT:**
1. **Need** (Necessidade) - coletado pelo SDR ✅
2. **Budget** (Orçamento) - coletado pelo Specialist
3. **Authority** (Decisor) - coletado pelo Specialist
4. **Timing** (Urgência) - coletado pelo Specialist

**Dados Transferidos:**
- `bant` completo (need, budget, authority, timing)
- `qualificationScore` (0-100)
- `archetype` (ex: 'PRAGMATICO')
- `persona` (opcional)
- `readyToSchedule` (true)

---

## 🤖 MATRIZ DE DETECÇÃO DE BOT

### **Sinais de Bot (precisa 2+ para detectar)**

| Sinal | Regex/Lógica | Exemplo | Peso |
|-------|--------------|---------|------|
| **1. Menu numerado** | `/\d+\)\s+/g`, `/\d+\.\s+/g` | "1) Vendas\n2) Suporte" | 1 |
| **2. Assinatura automática** | `/mensagem\s+automática/gi`, `/chatbot/gi` | "Mensagem automática" | 1 |
| **3. Protocolo/código** | `/protocolo[\s:]+\d+/gi` | "Protocolo: 12345" | 1 |
| **4. Frases clássicas** | `/como\s+posso\s+ajudar/gi`, `/escolha\s+uma\s+opção/gi` | "Como posso ajudar?" | 1-3 |
| **5. Múltiplas opções** | `optionMatches.length >= 3` | "1. 2. 3." (3+ opções) | 1 |
| **6. Formatação repetitiva** | `numberedLines.length >= 3` | 3+ linhas começando com número | 1 |

**Threshold:** `signalCount >= 2` → Bot detectado

**Ação quando bot detectado:**
1. Primeira vez: Envia **bridge message** ("Oi! Parece que estou falando com um sistema automático...")
2. Marca `botBridgeSent: true` no tracker
3. Segunda vez (se persistir): Pede novamente "HUMANO OK"
4. Quando lead responde "HUMANO OK": Limpa estado de bot e continua conversa normal

---

## 📈 FLUXO DE SCORE DE QUALIFICAÇÃO

```
Score Inicial: 25% (Need coletado pelo SDR)
       ↓
[Budget coletado]
       ↓
Score: 55% (2/4 pilares)
❌ NÃO qualificado (precisa ≥70% + 3/4 pilares)
       ↓
[Authority coletado]
       ↓
Score: 80% (3/4 pilares)
✅ QUALIFICADO → HANDOFF PARA SCHEDULER
       ↓
[Timing coletado - opcional]
       ↓
Score: 100% (4/4 pilares)
✅ SUPER QUALIFICADO
```

**Cálculo de Score:**
```javascript
// src/tools/bant_unified.js

const weights = {
  need: 0.25,      // 25%
  budget: 0.30,    // 30%
  authority: 0.25, // 25%
  timing: 0.20     // 20%
};

qualificationScore = Object.keys(weights).reduce((score, key) => {
  if (collectedInfo[key]) {
    return score + (weights[key] * 100);
  }
  return score;
}, 0);

// Exemplo:
// Need ✅ + Budget ✅ + Authority ✅ = 25 + 30 + 25 = 80%
```

---

## 🔐 PERSISTÊNCIA DE ESTADO (SQLite)

```sql
-- Tabela: enhanced_state (em memory.js)

CREATE TABLE IF NOT EXISTS enhanced_state (
  contact_id TEXT PRIMARY KEY,
  state_data TEXT NOT NULL,  -- JSON stringificado
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exemplo de state_data (JSON):
{
  "contactId": "5511991234567",
  "currentAgent": "scheduler",
  "previousAgent": "specialist",
  "messageCount": 7,
  "handoffHistory": [
    {"from": "sdr", "to": "specialist", "timestamp": "2025-10-21T13:04:35Z"},
    {"from": "specialist", "to": "scheduler", "timestamp": "2025-10-21T13:04:40Z"}
  ],
  "painType": "growth_marketing",
  "bant": {
    "need": "Crescimento/Marketing/Vendas",
    "budget": "R$ 8 mil",
    "authority": "Sou o dono",
    "timing": null
  },
  "qualificationScore": 80,
  "scheduledMeeting": {
    "eventId": "abc123",
    "date": "2025-10-28",
    "time": "10:00",
    "meetLink": "https://meet.google.com/xyz"
  }
}
```

---

## 🎯 RESUMO EXECUTIVO

### **Fluxo Simplificado:**
```
1. Lead → SDR: "Preciso ajuda com marketing"
   ↓
2. SDR detecta: DOR = growth_marketing, Interesse = 20%
   ↓ HANDOFF (DOR + interesse ≥5%)
   ↓
3. Specialist pergunta: "Vocês têm orçamento?"
   ↓
4. Lead → Specialist: "R$ 8 mil por mês"
   ↓ Score: 55% (2/4 pilares)
   ↓
5. Specialist pergunta: "Quem decide?"
   ↓
6. Lead → Specialist: "Sou o dono"
   ↓ Score: 80% (3/4 pilares) ✅ QUALIFICADO
   ↓ HANDOFF (score ≥70% + 3/4 pilares)
   ↓
7. Scheduler propõe: "Terça 10h, Quarta 14h..."
   ↓
8. Lead → Scheduler: "Terça às 10h"
   ↓
9. Scheduler cria evento no Google Calendar
   ↓
10. Scheduler confirma: "🎉 Reunião agendada! Link: meet.google.com/xyz"
```

### **Thresholds Críticos:**
- **Bot Detection:** 2+ sinais de 6 → Bot detectado
- **Interest Level:** ≥5% (1+ de 15 keywords) → Handoff SDR → Specialist
- **BANT Score:** ≥70% + 3/4 pilares → Handoff Specialist → Scheduler

### **Agentes e Responsabilidades:**
- **SDR:** Filtra bots, identifica DOR, mede interesse
- **Specialist:** Coleta BANT, qualifica lead (score)
- **Scheduler:** Propõe horários, cria evento, envia Meet Link

---

**Arquivo gerado em:** 2025-10-21
**Versão:** 1.0
**Sistema:** ORBION Multi-Agent Architecture
