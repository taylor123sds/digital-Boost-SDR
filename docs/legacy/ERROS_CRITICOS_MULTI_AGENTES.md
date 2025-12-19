# ❌ ERROS CRÍTICOS DO SISTEMA MULTI-AGENTE

## 🔍 PROBLEMAS IDENTIFICADOS

### ❌ ERRO #1: BANT System preso em `opening` stage (CRÍTICO)

**Arquivo:** `src/tools/bant_unified.js:770-771`

**Problema:**
```javascript
// Linha 770-771
if (this.conversationHistory.length < 2) return 'opening';
```

**Causa Raiz:**
- O `conversationHistory` passado para o BANT vem de `getRecentMessages(fromContact, 10)`
- Quando Specialist recebe handoff do SDR, o histórico pode ter < 2 mensagens
- Sistema fica travado em `opening` indefinidamente
- Não avança para `budget`, `authority`, `timing`

**Impacto:** 🔴 **ALTÍSSIMO**
- Specialist nunca coleta BANT completo
- Nunca atinge score ≥70%
- Nunca faz handoff para Scheduler
- **Sistema travado no Specialist**

**Solução:**
```javascript
// ANTES (ERRADO):
if (this.conversationHistory.length < 2) return 'opening';

// DEPOIS (CORRETO):
// Remover check de conversationHistory.length
// OU usar flag inicial em vez de contar mensagens
```

---

### ❌ ERRO #2: Need não persiste entre chamadas

**Arquivo:** `src/agents/specialist_agent.js:31-37`

**Problema:**
```javascript
// Linha 31-37
if (leadState.bant) {
  this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));
  this.bantSystem.currentStage = leadState.state?.current || 'need';
}

// Marcar Need como já coletado (foi identificado pelo SDR)
this.bantSystem.collectedInfo.need = leadState.painDescription || 'DOR identificada pelo SDR';
```

**Causa Raiz:**
- `onHandoffReceived()` seta `need` corretamente
- **MAS** cada `process()` subsequente do Specialist chama `processMessage()` do BANT
- O BANT **NÃO** restaura o `need` do `leadState` nas chamadas seguintes
- O `need` é perdido após primeira mensagem

**Impacto:** 🔴 **ALTO**
- BANT volta para stage `need` (linha 774)
- Specialist fica fazendo perguntas de `need` infinitamente
- Loop de perguntas sem avançar

**Solução:**
```javascript
// specialist_agent.js - Método process() linha 76

// ANTES (ERRADO):
const bantResult = await this.bantSystem.processMessage(text, historyTexts);

// DEPOIS (CORRETO):
// Restaurar need antes de processar
if (!this.bantSystem.collectedInfo.need && leadState.painDescription) {
  this.bantSystem.collectedInfo.need = leadState.painDescription;
}
const bantResult = await this.bantSystem.processMessage(text, historyTexts);
```

---

### ❌ ERRO #3: conversationHistory não reflete conversa real

**Arquivo:** `src/agents/specialist_agent.js:72`

**Problema:**
```javascript
// Linha 72
const conversationHistory = await getRecentMessages(fromContact, 10);
const historyTexts = conversationHistory.map(m => m.text || '');
```

**Causa Raiz:**
- `getRecentMessages()` retorna mensagens do banco `whatsapp_messages`
- **MAS** se mensagens não foram salvas ainda, retorna vazio ou incompleto
- BANT recebe `conversationHistory.length < 2` → volta para `opening`

**Impacto:** 🟡 **MÉDIO**
- Contribui para Erro #1
- BANT não tem contexto completo da conversa
- Detecção de arquétipo imprecisa

**Solução:**
```javascript
// Construir histórico do leadState em vez de banco

// ANTES:
const conversationHistory = await getRecentMessages(fromContact, 10);

// DEPOIS:
const conversationHistory = leadState.conversationHistory || [];
// OU manter mensagens em memory cache
```

---

### ❌ ERRO #4: Specialist não salva BANT no estado

**Arquivo:** `src/agents/specialist_agent.js:116-127`

**Problema:**
```javascript
// Linha 116-127
return {
  message: nextQuestion,
  updateState: {
    bant: bantResult.collectedInfo,  // ✅ Salva bant
    qualification: {
      score: bantResult.qualificationScore,
      archetype: bantResult.archetype,
      persona: bantResult.persona
    },
    state: {
      current: bantResult.stage,  // ❌ MAS stage não persiste
      lastUpdate: new Date().toISOString()
    }
  }
};
```

**Causa Raiz:**
- `updateState.state.current` é salvo
- **MAS** quando restaura (linha 33), usa `leadState.state?.current || 'need'`
- Se `state.current` não existir, volta para `'need'`
- **E** `onHandoffReceived` não seta `currentStage` corretamente no bantSystem

**Impacto:** 🟡 **MÉDIO**
- Contribui para loop de estágios
- Specialist pode ficar alternando entre `opening` e `need`

**Solução:**
```javascript
// specialist_agent.js linha 33

// ANTES:
this.bantSystem.currentStage = leadState.state?.current || 'need';

// DEPOIS:
// Se tem bant e need coletado, começar em budget
if (leadState.bant?.need) {
  this.bantSystem.currentStage = 'budget';
} else {
  this.bantSystem.currentStage = leadState.state?.current || 'need';
}
```

---

### ❌ ERRO #5: Handoff Specialist → Scheduler muito rigoroso

**Arquivo:** `src/agents/specialist_agent.js:159`

**Problema:**
```javascript
// Linha 159
const isQualified = qualificationScore >= 70 && collectedPillars >= 3;
```

**Análise:**
- Threshold 70% + 3 pilares é **muito rigoroso**
- Considerando que:
  - Need: 25 pontos (veio do SDR)
  - Budget: 30 pontos
  - Authority: 25 pontos
  - = 80 pontos (3 pilares)
- **MAS** em conversas reais, budget e authority podem ser vagos
- Validação GPT pode rejeitar respostas válidas

**Impacto:** 🟡 **MÉDIO**
- Specialist raramente faz handoff
- Fica coletando indefinidamente

**Solução (OPCIONAL):**
```javascript
// Reduzir threshold OU aceitar 2 pilares se score alto

// OPÇÃO 1: Threshold mais baixo
const isQualified = qualificationScore >= 60 && collectedPillars >= 3;

// OPÇÃO 2: Aceitar 2 pilares se score alto
const isQualified =
  (qualificationScore >= 70 && collectedPillars >= 3) ||
  (qualificationScore >= 80 && collectedPillars >= 2);
```

---

## 🔧 CORREÇÕES PRIORITÁRIAS

### 🔴 PRIORIDADE 1 (CRÍTICAS - Sistema travado):

#### **Correção #1: Remover check de conversationHistory.length**

```javascript
// Arquivo: src/tools/bant_unified.js linha 770-771

// ❌ ANTES:
determineCurrentStage() {
  // Primeiras 2 mensagens = fase opening (rapport inicial)
  if (this.conversationHistory.length < 2) return 'opening';

  if (!this.collectedInfo.need) return 'need';
  // ...
}

// ✅ DEPOIS:
determineCurrentStage() {
  // ✅ CORREÇÃO: Remover check de conversationHistory para evitar travar em opening
  // Se Need não está coletado, perguntar Need
  if (!this.collectedInfo.need) return 'need';

  // Resto do código continua igual...
}
```

---

#### **Correção #2: Restaurar Need antes de processar BANT**

```javascript
// Arquivo: src/agents/specialist_agent.js linha 76

// ❌ ANTES:
const bantResult = await this.bantSystem.processMessage(text, historyTexts);

// ✅ DEPOIS:
// ✅ CORREÇÃO: Restaurar Need do leadState antes de processar
if (!this.bantSystem.collectedInfo.need && leadState.painDescription) {
  this.bantSystem.collectedInfo.need = leadState.painDescription;
  console.log(`🔧 [FIX] Need restaurado do leadState: "${leadState.painDescription}"`);
}

const bantResult = await this.bantSystem.processMessage(text, historyTexts);
```

---

#### **Correção #3: Iniciar em stage correto após handoff**

```javascript
// Arquivo: src/agents/specialist_agent.js linha 33

// ❌ ANTES:
if (leadState.bant) {
  this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));
  this.bantSystem.currentStage = leadState.state?.current || 'need';
}

// ✅ DEPOIS:
if (leadState.bant) {
  this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));

  // ✅ CORREÇÃO: Se já tem Need coletado, começar em Budget
  if (leadState.bant.need || leadState.painDescription) {
    this.bantSystem.currentStage = 'budget';
    console.log(`🔧 [FIX] Iniciando em 'budget' pois Need já coletado`);
  } else {
    this.bantSystem.currentStage = leadState.state?.current || 'need';
  }
}
```

---

### 🟡 PRIORIDADE 2 (Melhorias):

#### **Melhoria #1: Reduzir threshold de qualificação**

```javascript
// Arquivo: src/agents/specialist_agent.js linha 159

// ANTES:
const isQualified = qualificationScore >= 70 && collectedPillars >= 3;

// DEPOIS (OPCIONAL):
// Aceitar score 60% ou 2 pilares com score alto
const isQualified =
  (qualificationScore >= 60 && collectedPillars >= 3) ||
  (qualificationScore >= 80 && collectedPillars >= 2);
```

---

#### **Melhoria #2: Construir histórico do leadState**

```javascript
// Arquivo: src/agents/specialist_agent.js linha 72

// ANTES:
const conversationHistory = await getRecentMessages(fromContact, 10);
const historyTexts = conversationHistory.map(m => m.text || '');

// DEPOIS:
// Construir histórico do leadState se disponível
const conversationHistory = leadState.conversationHistory ||
                            await getRecentMessages(fromContact, 10);
const historyTexts = conversationHistory.map(m =>
  typeof m === 'string' ? m : (m.text || '')
);
```

---

## 🧪 TESTES PARA VALIDAR CORREÇÕES

### Teste 1: Verificar se sai de `opening`
```bash
node -e "
import('./src/tools/bant_unified.js').then(m => {
  const bant = new m.BANTUnifiedSystem();
  bant.collectedInfo.need = 'Crescimento';
  bant.conversationHistory = []; // Vazio

  const stage = bant.determineCurrentStage();
  console.log('Stage:', stage);
  console.log('Esperado: budget (não opening)');

  if (stage === 'budget') {
    console.log('✅ PASSOU');
  } else {
    console.log('❌ FALHOU - ainda preso em opening');
  }
});
"
```

### Teste 2: Verificar restauração de Need
```bash
node test_handoffs_only.js
# Verificar logs:
# - Deve mostrar "🔧 [FIX] Need restaurado"
# - Stage deve ser 'budget' ou 'authority', NÃO 'opening' ou 'need'
```

---

## 📊 RESUMO DOS ERROS

| # | Erro | Severidade | Status | Arquivo |
|---|------|------------|--------|---------|
| 1 | BANT travado em `opening` | 🔴 CRÍTICO | Identificado | `bant_unified.js:770` |
| 2 | Need não persiste | 🔴 CRÍTICO | Identificado | `specialist_agent.js:76` |
| 3 | conversationHistory vazio | 🟡 MÉDIO | Identificado | `specialist_agent.js:72` |
| 4 | Stage não persiste | 🟡 MÉDIO | Identificado | `specialist_agent.js:33` |
| 5 | Threshold muito alto | 🟡 MÉDIO | Opcional | `specialist_agent.js:159` |

---

## ✅ PLANO DE CORREÇÃO

1. **Aplicar Correção #1** (remover check conversationHistory.length)
2. **Aplicar Correção #2** (restaurar Need antes de processMessage)
3. **Aplicar Correção #3** (iniciar em stage correto)
4. **Testar com** `test_handoffs_only.js`
5. **Verificar logs** mostram stage avançando (budget → authority → timing)
6. **Confirmar handoff** Specialist → Scheduler acontece

---

**Relatório gerado em:** 2025-10-21
**Prioridade:** 🔴 URGENTE
**Impacto:** Sistema multi-agente completamente travado no Specialist
