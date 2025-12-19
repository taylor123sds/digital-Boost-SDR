# 🔧 CORREÇÃO DO LOOP SDR ↔ SPECIALIST

## 🎯 Problema Identificado

O loop acontece porque o **estado BANT não é persistido** entre mensagens:

1. SDR faz handoff → Specialist configura `need` e `stage = 'budget'`
2. Lead responde → Specialist **perde** o estado e volta para `stage = 'initial'`
3. Specialist repergunta Need → **LOOP INFINITO**

---

## ✅ CORREÇÃO #1: Salvar Estado no `onHandoffReceived`

**Arquivo:** `src/agents/specialist_agent.js`

**Trocar:**
```javascript
async onHandoffReceived(leadPhone, leadState) {
  console.log(`\n🎯 [SPECIALIST] Recebendo handoff do SDR`);
  console.log(`📋 DOR identificada: ${leadState.painType}`);

  // Restaurar estado BANT se existir
  if (leadState.bant) {
    this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));

    if (leadState.bant.need || leadState.painDescription) {
      this.bantSystem.currentStage = 'budget';
      console.log(`🔧 [FIX] Iniciando em 'budget' pois Need já coletado`);
    } else {
      this.bantSystem.currentStage = leadState.state?.current || 'need';
    }
  }

  // Marcar Need como já coletado (foi identificado pelo SDR)
  this.bantSystem.collectedInfo.need = leadState.painDescription || 'DOR identificada pelo SDR';

  // Gerar primeira pergunta do Specialist (Budget)
  const firstQuestion = this.getFirstQuestion(leadState.painType, leadState);

  return {
    message: firstQuestion,
    metadata: {
      specialist: leadState.painType,
      bantStage: 'budget'
    }
  };
}
```

**Por:**
```javascript
async onHandoffReceived(leadPhone, leadState) {
  console.log(`\n🎯 [SPECIALIST] Recebendo handoff do SDR`);
  console.log(`📋 DOR identificada: ${leadState.painType}`);

  // Restaurar estado BANT se existir
  if (leadState.bant) {
    this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));
  }

  // ✅ CORREÇÃO CRÍTICA: Marcar Need como já coletado
  this.bantSystem.collectedInfo.need = leadState.painDescription || 'DOR identificada pelo SDR';

  // ✅ CORREÇÃO CRÍTICA: Começar em Budget (pois Need já foi coletado pelo SDR)
  this.bantSystem.currentStage = 'budget';

  console.log(`✅ [SPECIALIST] Need coletado: "${this.bantSystem.collectedInfo.need}"`);
  console.log(`✅ [SPECIALIST] Stage inicial: ${this.bantSystem.currentStage}`);

  // Gerar primeira pergunta do Specialist (Budget)
  const firstQuestion = this.getFirstQuestion(leadState.painType, leadState);

  // ✅ CORREÇÃO CRÍTICA: RETORNAR updateState para SALVAR o estado BANT
  return {
    message: firstQuestion,
    updateState: {
      bant: this.bantSystem.collectedInfo,  // ✅ Salvar need preenchido
      state: {
        current: this.bantSystem.currentStage,  // ✅ Salvar 'budget'
        lastUpdate: new Date().toISOString()
      }
    },
    metadata: {
      specialist: leadState.painType,
      bantStage: 'budget'
    }
  };
}
```

**O que muda:**
- ✅ Retorna `updateState` com `bant` e `state.current`
- ✅ AgentHub salva esses dados no banco
- ✅ Na próxima mensagem, estado é restaurado corretamente

---

## ✅ CORREÇÃO #2: Garantir Restauração Correta no `process`

**Arquivo:** `src/agents/specialist_agent.js` (linhas 78-100)

**Verificar que o código está assim:**

```javascript
// ✅ CORREÇÃO CRÍTICA #3: SEMPRE restaurar estado BANT completo do leadState
// O bantSystem perde estado entre mensagens, precisamos restaurar TUDO
if (leadState.bant) {
  this.bantSystem.collectedInfo = JSON.parse(JSON.stringify(leadState.bant));
  console.log(`🔧 [CRITICAL FIX] Estado BANT restaurado do leadState:`, this.bantSystem.collectedInfo);
}

// Restaurar stage atual
if (leadState.state?.current) {
  this.bantSystem.currentStage = leadState.state.current;
  console.log(`🔧 [CRITICAL FIX] Stage restaurado: ${this.bantSystem.currentStage}`);
}

// ✅ FALLBACK: Se Need não veio no bant mas tem painDescription, restaurar
if (!this.bantSystem.collectedInfo.need && leadState.painDescription) {
  this.bantSystem.collectedInfo.need = leadState.painDescription;
  console.log(`🔧 [FALLBACK] Need restaurado do painDescription: "${leadState.painDescription}"`);
}
```

**Se o código estiver diferente, substitua por este bloco acima.**

---

## ✅ CORREÇÃO #3: AgentHub Merge Correto do updateState

**Arquivo:** `src/agents/agent_hub.js` (linhas 84-87)

**Verificar que está assim:**

```javascript
// Mesclar dados adicionais do resultado
if (result.updateState) {
  Object.assign(leadState, result.updateState);
}
```

**Se estiver diferente, trocar por:**

```javascript
// ✅ MERGE PROFUNDO: Mesclar updateState corretamente
if (result.updateState) {
  // Merge especial para objetos aninhados (bant, state, etc)
  for (const [key, value] of Object.entries(result.updateState)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Objeto aninhado - fazer merge profundo
      leadState[key] = { ...(leadState[key] || {}), ...value };
    } else {
      // Valor primitivo - substituir
      leadState[key] = value;
    }
  }
  console.log(`✅ [HUB] Estado atualizado:`, JSON.stringify(result.updateState, null, 2));
}
```

---

## 🧪 COMO TESTAR

1. **Rodar o teste:**
```bash
cd Desktop/agent-js-starter
node test_sdr_specialist_handoff.js
```

2. **Verificar saída esperada:**

```
📊 ESTADO DO LEAD após MSG 2:
   - currentAgent: specialist
   - painType: growth_marketing
   - painDescription: Crescimento/Marketing/Vendas
   - bant: {
  "need": "Crescimento/Marketing/Vendas",  // ✅ DEVE ESTAR PREENCHIDO
  "budget": null,
  ...
}

📊 ESTADO DO LEAD após MSG 3:
   - currentAgent: specialist
   - bant.need: Crescimento/Marketing/Vendas  // ✅ PERSISTIDO
   - bant.budget: R$ 2000/mês                  // ✅ COLETADO
   - state.current: budget                      // ✅ OU 'authority'
```

3. **Se ver `bant.need: null` após MSG 2 = BUG NÃO CORRIGIDO**

---

## 📊 RESUMO

| Bug | Causa | Correção |
|-----|-------|----------|
| #1 | `onHandoffReceived` não salva estado | Adicionar `updateState` no retorno |
| #2 | Stage volta para 'initial' | Salvar `state.current = 'budget'` |
| #3 | Need perdido entre mensagens | Garantir merge correto no AgentHub |

---

## ✅ CHECKLIST DE APLICAÇÃO

- [ ] Aplicar CORREÇÃO #1 em `specialist_agent.js:onHandoffReceived`
- [ ] Verificar CORREÇÃO #2 em `specialist_agent.js:process` (linhas 78-100)
- [ ] Aplicar CORREÇÃO #3 em `agent_hub.js` (linhas 84-90)
- [ ] Rodar teste: `node test_sdr_specialist_handoff.js`
- [ ] Verificar que `bant.need` está preenchido após MSG 2
- [ ] Testar no WhatsApp real com fluxo completo

---

**Data:** 2025-10-21
**Autor:** Claude Code Analysis
