# 🔑 KEYWORDS E THRESHOLDS - SISTEMA ORBION

## 📋 ÍNDICE RÁPIDO
- [Keywords de DOR (Pain Type)](#keywords-de-dor)
- [Keywords de Interesse](#keywords-de-interesse)
- [Keywords de Bot Detection](#keywords-de-bot-detection)
- [Thresholds de Handoff](#thresholds-de-handoff)
- [Thresholds de Qualificação](#thresholds-de-qualificação)
- [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 KEYWORDS DE DOR (PAIN TYPE)

### **Growth Marketing** (`painType: 'growth_marketing'`)

```javascript
// Arquivo: src/agents/sdr_agent.js - Linha 233-245

const growthPatterns = [
  /cresc(er|imento|endo)/i,           // "crescimento", "crescer", "crescendo"
  /vendas? (baixa|caindo|devagar|lenta|estagnada)/i,  // "vendas baixas", "vendas caindo"
  /marketing/i,                        // "marketing"
  /leads?/i,                           // "leads", "lead"
  /(falta|poucos?) cliente/i,          // "falta cliente", "poucos clientes"
  /conversão/i,                        // "conversão"
  /funil/i,                            // "funil"
  /mídia paga/i,                       // "mídia paga", "media paga"
  /tráfego/i,                          // "tráfego"
  /seo/i,                              // "SEO"
  /(visibilidade|divulgação)/i         // "visibilidade", "divulgação"
];
```

**Exemplos de mensagens que detectam Growth Marketing:**
- ✅ "Preciso de ajuda com **crescimento** da empresa"
- ✅ "Nossas **vendas estão baixas**"
- ✅ "Quero melhorar **marketing** digital"
- ✅ "Precisamos de mais **leads** qualificados"
- ✅ "**Tráfego** do site está muito fraco"
- ✅ "Problema com **conversão** no funil"

---

### **Sites** (`painType: 'sites'`)

```javascript
// Arquivo: src/agents/sdr_agent.js - Linha 248-262

const sitesPatterns = [
  /site/i,                             // "site"
  /página/i,                           // "página"
  /landing/i,                          // "landing", "landing page"
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
```

**Exemplos de mensagens que detectam Sites:**
- ✅ "Meu **site** está muito **lento**"
- ✅ "Preciso melhorar o **design** da **página**"
- ✅ "**Site não converte** visitantes em clientes"
- ✅ "**Landing page** precisa de melhorias"
- ✅ "**Performance** no **mobile** está ruim"
- ✅ "**Portal** demora pra **carregar**"

---

### **Audiovisual** (`painType: 'audiovisual'`)

```javascript
// Arquivo: src/agents/sdr_agent.js - Linha 264-278

const audioPatterns = [
  /v[íi]deo/i,                         // "vídeo", "video"
  /gravação/i,                         // "gravação"
  /filmagem/i,                         // "filmagem"
  /edição/i,                           // "edição"
  /animação/i,                         // "animação"
  /motion/i,                           // "motion", "motion graphics"
  /reels?/i,                           // "reels", "reel"
  /tiktok/i,                           // "TikTok"
  /youtube/i,                          // "YouTube"
  /instagram/i,                        // "Instagram"
  /stories/i,                          // "stories"
  /autoridade/i,                       // "autoridade"
  /engajamento/i                       // "engajamento"
];
```

**Exemplos de mensagens que detectam Audiovisual:**
- ✅ "Preciso de **vídeos** para **TikTok**"
- ✅ "Quero fazer **reels** pro **Instagram**"
- ✅ "Preciso melhorar **edição** dos **vídeos**"
- ✅ "Quero criar **autoridade** com conteúdo no **YouTube**"
- ✅ "Preciso de **animação** e **motion graphics**"
- ✅ "**Engajamento** no **Instagram stories** está baixo"

---

## 💡 KEYWORDS DE INTERESSE

```javascript
// Arquivo: src/agents/sdr_agent.js - Linha 290-297

const interestKeywords = [
  // Necessidade/Urgência (4 keywords)
  /preciso/i,                          // "preciso"
  /quero/i,                            // "quero"
  /gostaria/i,                         // "gostaria"
  /interesse/i,                        // "interesse", "interessado"

  // Tempo (3 keywords)
  /urgente/i,                          // "urgente"
  /rápido/i,                           // "rápido"
  /logo/i,                             // "logo"

  // Solução (3 keywords)
  /ajud(a|ar)/i,                       // "ajuda", "ajudar"
  /solução/i,                          // "solução"
  /resolver/i,                         // "resolver"

  // Problema (4 keywords) - ✅ NOVOS
  /problema/i,                         // "problema"
  /dificuldade/i,                      // "dificuldade"
  /desafio/i,                          // "desafio"
  /questão/i,                          // "questão"

  // Objetivo (4 keywords) - ✅ NOVOS
  /melhorar/i,                         // "melhorar"
  /crescer/i,                          // "crescer"
  /aumentar/i,                         // "aumentar"
  /vender/i                            // "vender"
];

// TOTAL: 18 keywords
```

**Cálculo do Interest Level:**
```javascript
interestLevel = (keywords encontradas) / 18

// Exemplos:
"Preciso urgente de ajuda"               → 3/18 = 0.167 = 16.7% ✅
"Quero melhorar vendas"                  → 2/18 = 0.111 = 11.1% ✅
"Gostaria de resolver esse problema"     → 3/18 = 0.167 = 16.7% ✅
"Olá tudo bem?"                          → 0/18 = 0.000 =  0.0% ❌
```

---

## 🤖 KEYWORDS DE BOT DETECTION

### **1. Padrões de Menu**
```javascript
// src/utils/bot_detector.js - Linha 14-26

const menuPatterns = [
  /\d+\)\s+/g,                         // "1) Opção"
  /\d+\.\s+/g,                         // "1. Opção"
  /\d+\s*-\s+/g,                       // "1 - Opção"
  /[0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟]\s*-/g,      // "1️⃣ - Opção"
  /digite\s+\d+/gi,                    // "Digite 1"
  /escolha\s+uma\s+opção/gi,           // "Escolha uma opção"
  /selecione\s+uma\s+opção/gi,         // "Selecione uma opção"
  /opções:/gi,                         // "Opções:"
  /menu:/gi                            // "Menu:"
];
```

**Exemplo que detecta menu:**
```
Escolha uma opção:
1) Vendas
2) Suporte
3) Financeiro
Digite o número da opção
```
✅ Detecta: `menu_detected` + `classic_bot_phrase` + `multiple_numbered_options` + `repetitive_formatting` = **4 sinais** = **BOT**

---

### **2. Assinaturas Automáticas**
```javascript
// src/utils/bot_detector.js - Linha 29-38

const signatures = [
  /mensagem\s+automática/gi,           // "Mensagem automática"
  /robô\s+de\s+atendimento/gi,         // "Robô de atendimento"
  /atendimento\s+automático/gi,        // "Atendimento automático"
  /sistema\s+automático/gi,            // "Sistema automático"
  /auto[\s-]?resposta/gi,              // "Auto-resposta", "Auto resposta"
  /bot\s+de\s+atendimento/gi,          // "Bot de atendimento"
  /assistente\s+virtual/gi,            // "Assistente virtual"
  /chatbot/gi                          // "Chatbot"
];
```

---

### **3. Protocolos e Códigos**
```javascript
// src/utils/bot_detector.js - Linha 41-47

const protocols = [
  /protocolo[\s:]+\d+/gi,              // "Protocolo: 12345"
  /código[\s:]+\d+/gi,                 // "Código: 678"
  /número[\s:]+\d+/gi,                 // "Número: 999"
  /ticket[\s:]+\d+/gi,                 // "Ticket: 111"
  /chamado[\s:]+\d+/gi                 // "Chamado: 222"
];
```

---

### **4. Frases Clássicas de Bot**
```javascript
// src/utils/bot_detector.js - Linha 50-82

const classicPhrases = [
  /como\s+(posso|podemos)\s+ajudar/gi,              // "Como posso ajudar?"
  /em\s+que\s+(posso|podemos)\s+ajudar/gi,          // "Em que posso ajudar?"
  /digite\s+\d+\s+para/gi,                          // "Digite 1 para"
  /não\s+entendi\s+(sua\s+)?solicitação/gi,         // "Não entendi sua solicitação"
  /escolha\s+uma\s+opção/gi,                        // "Escolha uma opção"
  /por\s+favor,?\s+digite/gi,                       // "Por favor, digite"
  /aguarde,?\s+estamos\s+transferindo/gi,           // "Aguarde, estamos transferindo"
  /você\s+será\s+atendido/gi,                       // "Você será atendido"
  /bem\s+vind[oa]\s+(a|ao)\s+/gi,                   // "Bem vindo a..."
  /nossa\s+equipe\s+já\s+entrou\s+em\s+contato/gi,  // "Nossa equipe já entrou em contato"
  /agradece\s+(o\s+)?(seu\s+)?contato/gi,           // "Agradece seu contato"
  /obrigad[oa]\s+por\s+entrar\s+em\s+contato/gi,    // "Obrigado por entrar em contato"
  /recebemos\s+(o\s+)?(seu|sua)\s+(contato|mensagem)/gi, // "Recebemos seu contato"

  // ✅ Padrões críticos para prevenir loops:
  /desculpe[,!]?\s+(não|nao)\s+entend/gi,           // "Desculpe! Não entendi"
  /(não|nao)\s+entend(i|emos)\s+(sua|a)\s+resposta/gi, // "Não entendi sua resposta"
  /escolha\s+uma\s+opção\s+válida/gi,               // "Escolha uma opção válida"
  /vamos\s+tentar\s+novamente/gi,                   // "Vamos tentar novamente"
  /opção\s+inválida/gi,                             // "Opção inválida"
  /tente\s+(novamente|outra\s+vez)/gi,              // "Tente novamente"
  /(não|nao)\s+(consegui|consigo)\s+entender/gi,    // "Não consegui entender"
  /mensagem\s+(não\s+reconhecida|inválida)/gi       // "Mensagem não reconhecida"
];
```

---

### **Threshold de Detecção de Bot:**
```javascript
const isBot = signalCount >= 2;  // ≥2 sinais de 6 possíveis
```

**Exemplo de análise:**
```
Mensagem: "Escolha uma opção:\n1) Vendas\n2) Suporte\n3) Financeiro\n\nDigite o número"

Sinais detectados:
✅ 1. menu_detected (padrão /escolha\s+uma\s+opção/)
✅ 2. classic_bot_phrase (1 frase detectada)
✅ 3. multiple_numbered_options (3 opções: "1)", "2)", "3)")
✅ 4. repetitive_formatting (3 linhas começando com número)

Total: 4 sinais ≥ 2 → BOT DETECTADO ✅
```

---

## 🔄 THRESHOLDS DE HANDOFF

### **Handoff 1: SDR → Specialist**

| Condição | Código | Threshold | Arquivo:Linha |
|----------|--------|-----------|---------------|
| **DOR identificada** | `painDetection.painType !== null` | 1+ keyword de DOR | `sdr_agent.js:193` |
| **Interesse detectado** | `painDetection.interestLevel >= 0.05` | ≥5% (1+ de 18 keywords) | `sdr_agent.js:193` |

**OU (Fallback):**

| Condição Alternativa | Código | Threshold | Arquivo:Linha |
|---------------------|--------|-----------|---------------|
| **Interesse genérico** | `painDetection.interestLevel >= 0.05` | ≥5% sem DOR específica | `sdr_agent.js:217` |
| **Ação** | `painType = 'growth_marketing'` | DOR padrão quando não identificada | `sdr_agent.js:225` |

**Exemplos:**

```javascript
// CENÁRIO 1: DOR + Interesse ✅
painDetection = {
  painType: 'growth_marketing',    // ← DOR identificada
  interestLevel: 0.167             // ← 16.7% (3/18 keywords)
};
// Resultado: HANDOFF com DOR específica

// CENÁRIO 2: Interesse sem DOR ✅
painDetection = {
  painType: null,                  // ← DOR NÃO identificada
  interestLevel: 0.111             // ← 11.1% (2/18 keywords)
};
// Resultado: HANDOFF com painType: 'growth_marketing' (padrão)

// CENÁRIO 3: DOR sem Interesse ❌
painDetection = {
  painType: 'sites',               // ← DOR identificada
  interestLevel: 0.0               // ← 0% (0/18 keywords)
};
// Resultado: SEM HANDOFF - Pergunta de aprofundamento
```

---

### **Handoff 2: Specialist → Scheduler**

| Condição | Código | Threshold | Arquivo:Linha |
|----------|--------|-----------|---------------|
| **Score de qualificação** | `bantResult.qualificationScore >= 70` | ≥70% | `specialist_agent.js:151` |
| **Pilares BANT coletados** | `collectedCount >= 3` | ≥3 de 4 pilares | `specialist_agent.js:152` |

**Pilares BANT:**
```javascript
const pilars = ['need', 'budget', 'authority', 'timing'];

// Contagem:
collectedCount = pilars.filter(p => collectedInfo[p] !== null).length;
```

**Peso de cada pilar no score:**
```javascript
// src/tools/bant_unified.js

const weights = {
  need: 0.25,       // 25 pontos
  budget: 0.30,     // 30 pontos
  authority: 0.25,  // 25 pontos
  timing: 0.20      // 20 pontos
};

// Cálculo:
qualificationScore = (need ? 25 : 0) + (budget ? 30 : 0) + (authority ? 25 : 0) + (timing ? 20 : 0);
```

**Exemplos:**

```javascript
// CENÁRIO 1: Qualificado ✅
bant = {
  need: 'Crescimento',      // +25 = 25
  budget: 'R$ 8 mil',       // +30 = 55
  authority: 'Sou o dono',  // +25 = 80
  timing: null              //  +0 = 80
};
// Score: 80%, Pilares: 3/4 → HANDOFF ✅

// CENÁRIO 2: Parcialmente qualificado ❌
bant = {
  need: 'Sites',            // +25 = 25
  budget: 'R$ 3 mil',       // +30 = 55
  authority: null,          //  +0 = 55
  timing: null              //  +0 = 55
};
// Score: 55%, Pilares: 2/4 → SEM HANDOFF ❌

// CENÁRIO 3: Super qualificado ✅
bant = {
  need: 'Audiovisual',      // +25 = 25
  budget: 'R$ 10 mil',      // +30 = 55
  authority: 'Dono + CMO',  // +25 = 80
  timing: '1 mês'           // +20 = 100
};
// Score: 100%, Pilares: 4/4 → HANDOFF ✅
```

---

## 📊 THRESHOLDS DE QUALIFICAÇÃO

### **Níveis de Qualificação por Score:**

| Score | Nível | Descrição | Ação |
|-------|-------|-----------|------|
| **0-39%** | ❌ **Baixo** | 0-1 pilares coletados | Continuar coleta BANT |
| **40-69%** | ⚠️ **Médio** | 2 pilares coletados | Continuar coleta BANT |
| **70-89%** | ✅ **Alto** | 3 pilares coletados | **HANDOFF para Scheduler** |
| **90-100%** | 🏆 **Excelente** | 4 pilares coletados | **HANDOFF para Scheduler** |

### **Matriz de Decisão:**

```javascript
// specialist_agent.js - Método isReadyToSchedule()

function isReadyToSchedule(bantResult) {
  const { qualificationScore, collectedInfo } = bantResult;

  const pilars = ['need', 'budget', 'authority', 'timing'];
  const collectedCount = pilars.filter(p => collectedInfo[p] !== null).length;

  // REGRA: Score ≥70% E Pilares ≥3
  const isReady = qualificationScore >= 70 && collectedCount >= 3;

  return isReady;
}
```

**Tabela de Combinações:**

| Need | Budget | Authority | Timing | Score | Pilares | Handoff? |
|------|--------|-----------|--------|-------|---------|----------|
| ✅ | ✅ | ✅ | ✅ | 100% | 4/4 | ✅ SIM |
| ✅ | ✅ | ✅ | ❌ | 80% | 3/4 | ✅ SIM |
| ✅ | ✅ | ❌ | ✅ | 75% | 3/4 | ✅ SIM |
| ✅ | ❌ | ✅ | ✅ | 70% | 3/4 | ✅ SIM |
| ✅ | ✅ | ❌ | ❌ | 55% | 2/4 | ❌ NÃO |
| ✅ | ❌ | ✅ | ❌ | 50% | 2/4 | ❌ NÃO |
| ✅ | ❌ | ❌ | ✅ | 45% | 2/4 | ❌ NÃO |
| ✅ | ❌ | ❌ | ❌ | 25% | 1/4 | ❌ NÃO |

---

## 💼 EXEMPLOS PRÁTICOS

### **Exemplo 1: Conversa Completa (SDR → Specialist → Scheduler)**

```
👤 Lead: "Preciso urgente de ajuda com marketing digital e crescimento"

🤖 SDR analisa:
   - DOR: growth_marketing ✅ (keywords: "marketing", "crescimento")
   - Interesse: 0.167 (16.7%) ✅ (keywords: "preciso", "urgente", "ajuda")
   - Threshold: 0.05 (5%) ✅ ATINGIDO
   → HANDOFF para Specialist

🤖 Specialist: "Entendi! Crescimento exige investimento. Vocês têm orçamento?"

👤 Lead: "Temos R$ 8 mil por mês"

🤖 Specialist analisa:
   - BANT: need ✅, budget ✅
   - Score: 55% (2/4)
   - Threshold: 70% + 3/4 ❌ NÃO ATINGIDO
   → Continua coleta

🤖 Specialist: "Quem toma decisões sobre investimento aí?"

👤 Lead: "Sou o dono, decido sozinho"

🤖 Specialist analisa:
   - BANT: need ✅, budget ✅, authority ✅
   - Score: 80% (3/4)
   - Threshold: 70% + 3/4 ✅ ATINGIDO
   → HANDOFF para Scheduler

🤖 Scheduler: "Perfeito! Propostas de horário:
   1. Segunda 10h
   2. Terça 10h
   3. Terça 14h"

👤 Lead: "Terça às 10h está perfeito"

🤖 Scheduler:
   - Detecta confirmação ✅
   - Cria evento Google Calendar ✅
   - Envia Meet Link ✅

🤖 Scheduler: "🎉 Reunião agendada!
   📅 28/10/2025 às 10:00
   🔗 meet.google.com/xyz"
```

---

### **Exemplo 2: Bot Detection → Verificação Humana**

```
👤 Lead: "Escolha uma opção:
         1) Vendas
         2) Suporte
         3) Financeiro
         Digite o número"

🤖 SDR analisa:
   - Sinal 1: menu_detected ✅
   - Sinal 2: classic_bot_phrase ✅
   - Sinal 3: multiple_numbered_options ✅
   - Sinal 4: repetitive_formatting ✅
   - Total: 4 sinais ≥ 2 → BOT DETECTADO

🤖 SDR: "Oi! Parece que estou falando com um sistema automático.
         Para seguirmos, preciso de um humano.
         Se for você, responda: HUMANO OK"

👤 Lead: "HUMANO OK"

🤖 SDR analisa:
   - Regex match: /humano\s+ok/gi ✅
   - clearBotState() ✅
   - humanConfirmed: true ✅

🤖 SDR: "Perfeito! Confirmado. Agora sim, vamos conversar. 😊
         Me conta: qual o principal desafio que vocês enfrentam?"

[Conversa normal continua...]
```

---

### **Exemplo 3: DOR Não Identificada (Handoff com Padrão)**

```
👤 Lead: "Quero melhorar meu negócio"

🤖 SDR analisa:
   - DOR: null ❌ (nenhuma keyword de growth/sites/audio)
   - Interesse: 0.111 (11.1%) ✅ (keywords: "quero", "melhorar")
   - Threshold: 0.05 (5%) ✅ ATINGIDO

🤖 SDR decisão:
   - Interesse ≥5% mas SEM DOR específica
   - Ativa fallback: painType = 'growth_marketing' (padrão) ✅
   - requiresPainRefinement: true ✅
   → HANDOFF para Specialist com DOR genérica

🤖 Specialist: "Entendi! Vou te fazer algumas perguntas pra entender
                melhor sua necessidade..."

[Specialist refina DOR durante conversa BANT]
```

---

## 📌 RESUMO EXECUTIVO DOS THRESHOLDS

| Sistema | Threshold | Valor | Impacto |
|---------|-----------|-------|---------|
| **Bot Detection** | Sinais de bot | ≥2 de 6 | Envia bridge message |
| **Interest Level** | Keywords de interesse | ≥5% (1+/18) | Ativa handoff SDR → Specialist |
| **BANT Score** | Pontos de qualificação | ≥70% | Permite handoff Specialist → Scheduler |
| **BANT Pilares** | Pilares coletados | ≥3 de 4 | Exigido junto com score para handoff |

---

## 🎯 CHECKLIST RÁPIDO

### ✅ Para SDR fazer Handoff:
- [ ] DOR identificada (growth/sites/audio) **OU** interesse ≥5%
- [ ] Interest level ≥5% (1+ keyword de 18)
- [ ] Lead confirmado como humano (se houve suspeita de bot)

### ✅ Para Specialist fazer Handoff:
- [ ] Score ≥70%
- [ ] Pilares BANT ≥3 de 4
- [ ] Lead qualificado (readyToSchedule: true)

### ✅ Para Scheduler criar reunião:
- [ ] Confirmação de horário detectada
- [ ] Não existe reunião prévia (scheduledMeeting === null)
- [ ] Google Calendar acessível

---

**Arquivo gerado em:** 2025-10-21
**Versão:** 1.0
**Sistema:** ORBION Multi-Agent Architecture
**Última atualização:** Threshold de interesse ajustado para 5% (antes era 20%)
