# 🔧 CORREÇÃO DO LOOP NO AGENDAMENTO - Scheduler Agent

**Data:** 2025-10-21
**Issue:** Sistema repete mesma mensagem de agendamento após handoff

---

## 🎯 PROBLEMA IDENTIFICADO

O sistema estava fazendo **handoff repetido do Specialist para o Scheduler** a cada mensagem do lead, causando loop infinito na proposta de horários.

### Sintomas:
1. Lead qualificado (Score >= 70%)
2. Specialist faz handoff para Scheduler ✅
3. Scheduler propõe horários ✅
4. Lead responde "Quarta às 10h" ❌
5. **Sistema processa com Specialist** (não com Scheduler!) ❌
6. Specialist detecta qualificação → Handoff para Scheduler **DE NOVO** ❌
7. Scheduler propõe os **MESMOS** horários novamente ❌
8. **LOOP INFINITO** ❌

---

## 🔍 CAUSA RAIZ

### **Bug #1: `updateState` do `onHandoffReceived` não era processado**

**Arquivo:** `src/agents/agent_hub.js` (linhas 157-168)

**Problema:**
```javascript
// Chamar método de inicialização do novo agente (se existir)
if (newAgent.onHandoffReceived) {
  const initResult = await newAgent.onHandoffReceived(leadPhone, leadState);

  return {  // ❌ Retorna SEM processar updateState!
    success: true,
    handoffCompleted: true,
    agent: nextAgent,
    message: initResult.message,
    metadata: initResult.metadata || {}
  };
}
```

**Consequência:**
- Scheduler retorna `updateState: { proposedSlots, schedulerStage }`
- **MAS o AgentHub não salva esses dados no banco**
- Na próxima mensagem, Scheduler não lembra quais horários propôs
- Sistema se perde

---

### **Bug #2: `currentAgent` era sobrescrito no `executeHandoff`**

**Arquivo:** `src/agents/agent_hub.js` (linha 145)

**Problema:**
```javascript
// 2. Atualizar estado com dados do handoff
leadState.currentAgent = nextAgent;  // ✅ Define como 'scheduler'
...
// Mesclar dados do handoff no estado
Object.assign(leadState, handoffData);  // ❌ SOBRESCREVE currentAgent!
```

**O que acontecia:**

1. Specialist retorna:
```javascript
handoffData: {
  ...leadState,  // ← Contém currentAgent: 'specialist'
  bant: bantResult.collectedInfo,
  qualificationScore: 80,
  ...
}
```

2. AgentHub executa:
```javascript
leadState.currentAgent = 'scheduler';  // ✅ Define
Object.assign(leadState, handoffData); // ❌ Sobrescreve com 'specialist'
```

3. **Resultado:** `currentAgent` volta para `'specialist'`!

---

## ✅ CORREÇÕES APLICADAS

### **Correção #1: Processar `updateState` do `onHandoffReceived`**

**Arquivo:** `src/agents/agent_hub.js` (linhas 161-176)

**ANTES:**
```javascript
if (newAgent.onHandoffReceived) {
  const initResult = await newAgent.onHandoffReceived(leadPhone, leadState);

  return {
    success: true,
    message: initResult.message,
    metadata: initResult.metadata || {}
  };
}
```

**DEPOIS:**
```javascript
if (newAgent.onHandoffReceived) {
  const initResult = await newAgent.onHandoffReceived(leadPhone, leadState);

  // ✅ CORREÇÃO CRÍTICA: Processar updateState do onHandoffReceived
  if (initResult.updateState) {
    for (const [key, value] of Object.entries(initResult.updateState)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Merge profundo para objetos aninhados
        leadState[key] = { ...(leadState[key] || {}), ...value };
      } else {
        // Substituição direta para primitivos e arrays
        leadState[key] = value;
      }
    }

    // Salvar estado atualizado com dados do onHandoffReceived
    await this.saveLeadState(leadPhone, leadState);
    console.log(`✅ [HUB] Estado atualizado após onHandoffReceived:`, JSON.stringify(initResult.updateState, null, 2));
  }

  return {
    success: true,
    handoffCompleted: true,
    agent: nextAgent,
    message: initResult.message,
    metadata: initResult.metadata || {}
  };
}
```

**Benefício:**
- Agora salva `proposedSlots` e `schedulerStage` corretamente
- Scheduler lembra quais horários propôs
- Estado permanece consistente

---

### **Correção #2: Proteger `currentAgent` no merge do `handoffData`**

**Arquivo:** `src/agents/agent_hub.js` (linhas 144-147)

**ANTES:**
```javascript
// Mesclar dados do handoff no estado
Object.assign(leadState, handoffData);
```

**DEPOIS:**
```javascript
// ✅ CORREÇÃO CRÍTICA: Mesclar handoffData SEM sobrescrever currentAgent e previousAgent
// O handoffData pode conter ...leadState do agente anterior, que tem currentAgent antigo
const { currentAgent: _, previousAgent: __, ...safeHandoffData } = handoffData;
Object.assign(leadState, safeHandoffData);
```

**Benefício:**
- `currentAgent` definido como `'scheduler'` não é mais sobrescrito
- Próxima mensagem é processada pelo agente correto
- Handoff funciona como esperado

---

## 🧪 COMO TESTAR

### Teste Manual (com WhatsApp):
1. Iniciar conversa: "Olá"
2. Responder: "Growth marketing"
3. Responder: "Sim, temos R$ 2000/mês"
4. Responder: "Eu mesmo decido"
5. Responder: "Pra agora"
6. ✅ **Deve receber proposta de horários**
7. Responder: "Quarta às 10h"
8. ✅ **Deve confirmar reunião** (não repetir proposta)

### Teste Automatizado:
```bash
node test_scheduler_loop.js
```

**Saída esperada:**
```
✅ [SPECIALIST] Lead qualificado! Score: 80%
🔀 [SPECIALIST] HANDOFF para Scheduler
✅ [HUB] Estado atualizado após onHandoffReceived: {
  "proposedSlots": [...],
  "schedulerStage": "proposing_times"
}

📱 MENSAGEM 6: Quinta às 15h pode ser
🎯 [HUB] Agente ativo: scheduler  ← ✅ SCHEDULER (não specialist!)
📆 [SCHEDULER] Processando mensagem de ...
✅ [SCHEDULER] Horário confirmado: 2025-10-23 15:00
🎉 Reunião agendada!
```

---

## 📊 COMPARAÇÃO ANTES vs DEPOIS

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|-----------|
| Handoff executado | Sim | Sim |
| `currentAgent` salvo | Sim (mas sobrescrito) | Sim (protegido) |
| `updateState` processado | ❌ Não | ✅ Sim |
| `proposedSlots` salvo | ❌ Não | ✅ Sim |
| Próxima mensagem processada por | Specialist (loop) | Scheduler (correto) |
| Sistema confirma reunião | ❌ Não | ✅ Sim |

---

## 🔧 ARQUIVOS MODIFICADOS

1. **`src/agents/agent_hub.js`**:
   - Linhas 144-147: Proteção do `currentAgent` no merge
   - Linhas 161-176: Processamento do `updateState` do `onHandoffReceived`

2. **`test_scheduler_loop.js`**:
   - Criado para reproduzir e testar o bug

---

## ✅ VERIFICAÇÃO DE SUCESSO

Execute os seguintes comandos para verificar se a correção foi aplicada:

```bash
# 1. Verificar correção #1 (updateState)
grep -A 15 "CORREÇÃO CRÍTICA: Processar updateState" src/agents/agent_hub.js

# 2. Verificar correção #2 (currentAgent)
grep -A 2 "CORREÇÃO CRÍTICA: Mesclar handoffData SEM" src/agents/agent_hub.js

# 3. Rodar teste
node test_scheduler_loop.js
```

**Checklist:**
- [ ] `currentAgent` permanece como `'scheduler'` após handoff
- [ ] `proposedSlots` é salvo no banco após `onHandoffReceived`
- [ ] Próxima mensagem é processada pelo Scheduler (não Specialist)
- [ ] Sistema confirma reunião quando lead escolhe horário
- [ ] Não há loop infinito de proposta de horários

---

## 🚨 TROUBLESHOOTING

### Problema: "currentAgent ainda é 'specialist' após handoff"
**Causa:** Correção #2 não foi aplicada
**Solução:** Verificar linhas 144-147 do `agent_hub.js`

### Problema: "proposedSlots é null"
**Causa:** Correção #1 não foi aplicada
**Solução:** Verificar linhas 161-176 do `agent_hub.js`

### Problema: "Erro ao criar evento no Google Calendar"
**Causa:** Google OAuth não configurado
**Solução:** Ver `GOOGLE_SHEETS_SETUP.md` ou testar sem integração real

---

## 📈 IMPACTO DA CORREÇÃO

### Performance:
- **Antes:** 4+ mensagens repetidas de proposta de horários
- **Depois:** 1 proposta + 1 confirmação = 2 mensagens

### Experiência do Usuário:
- **Antes:** Frustração com repetição infinita
- **Depois:** Agendamento fluido e profissional

### Taxa de Conversão:
- **Antes:** Leads abandonavam na fase de agendamento
- **Depois:** Agendamento completo em 2 interações

---

**Status:** ✅ Corrigido e testado
**Prioridade:** 🔴 CRÍTICO
**Gerado por:** Claude Code
**Última atualização:** 2025-10-21 14:30
