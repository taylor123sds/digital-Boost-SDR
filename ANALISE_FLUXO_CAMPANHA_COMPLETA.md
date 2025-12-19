# 🔍 ANÁLISE COMPLETA: Fluxo de Dados para Leads de Campanha

**Data:** 2025-11-11  
**Objetivo:** Entender linha por linha onde está sendo salvo, como está sendo salvo, e como SDR/BANT são chamados para leads de campanha.

---

## ❌ PROBLEMA CRÍTICO IDENTIFICADO

**O código de `saveEnhancedState` em campaign_manager.js EXISTE mas NÃO está sendo executado corretamente!**

**Evidência:**
- ✅ Código EXISTE em campaign_manager.js (linhas 862-886)
- ❌ Database NÃO tem dados que deveriam vir desse código
- ❌ Database TEM dados de SDR Agent que sobrescrevem a campanha

---

## 📊 FLUXO LINHA POR LINHA

### 🎯 PASSO 1: Campanha envia mensagem

**Arquivo:** `src/tools/campaign_manager.js`

**Linhas 850-899:**
```javascript
850: const normalizedPhone = normalizePhone(lead.phone.toString());
852: messageTimingStore.recordOutgoingMessage(normalizedPhone);
856: await saveWhatsAppMessage(normalizedPhone, message, true, 'text');

862-881: await saveEnhancedState(normalizedPhone, {
  phone: normalizedPhone,
  metadata: {
    introduction_sent: true,           // ← Flag crítica
    introduction_sent_at: new Date().toISOString(),
    origin: 'campaign',               // ← Identifica origem
    campaign_id: await getMemory('current_campaign_id') || 'default',
    sdr_initial_data_stage: 'collecting_profile',
    lead_data: {                      // ← DEVERIA SALVAR ISSO
      name: lead.Nome || lead.nome,
      company: lead.Empresa || lead.empresa,
      sector: lead.Segmento || lead.setor || lead.Setor
    }
  },
  conversationHistory: [{
    role: 'assistant',
    content: message,
    timestamp: new Date().toISOString()
  }]
});

882: console.log(`   ✅ Estado do lead ${normalizedPhone} salvo no banco`);
```

**O QUE DEVERIA ACONTECER:**
1. ✅ Mensagem é enviada via Evolution API
2. ✅ Mensagem é salva no histórico (`whatsapp_messages` table)
3. ✅ Estado é salvo em `enhanced_conversation_states` com `lead_data`
4. ✅ Log confirma salvamento

**O QUE REALMENTE ACONTECE:**
1. ✅ Mensagem é enviada
2. ✅ Mensagem é salva no histórico
3. ❓ Estado é salvo MAS...
4. ❌ Quando lead RESPONDE, o SDR Agent sobrescreve tudo!

---

### 🎯 PASSO 2: saveEnhancedState em memory.js

**Arquivo:** `src/memory.js`

**Linhas 710-774 - Função saveEnhancedState:**

```javascript
710: export async function saveEnhancedState(phoneNumber, enhancedState) {
711:   try {
712:     if (!phoneNumber || !enhancedState) {
713:       throw new Error('phoneNumber e enhancedState são obrigatórios');
714:     }
715: 
716:     const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');
717:     const now = Date.now();
718:     const cacheTTL = now + (30 * 60 * 1000); // 30 minutos
719: 
720:     // ✅ CORREÇÃO CRÍTICA: Incluir currentAgent, painType, etc...
721:     const stmt = db.prepare(`
722:       INSERT OR REPLACE INTO enhanced_conversation_states (
723:         phone_number, current_state, sub_state, qualification_score,
724:         ...
725:       ) VALUES (?, ?, ?, ?, ...)
726:     `);
```

**❌ PROBLEMA CRÍTICO - Linha 722:**
```sql
INSERT OR REPLACE INTO enhanced_conversation_states (...)
```

**O que `INSERT OR REPLACE` faz:**
- Se `phone_number` NÃO existe → `INSERT` (cria novo registro) ✅
- Se `phone_number` JÁ existe → `REPLACE` (APAGA registro antigo e cria novo) ❌

**ISSO SIGNIFICA:**
1. **Campanha salva primeiro:**
   ```json
   {
     "metadata": {
       "origin": "campaign",
       "lead_data": { "name": "Taylor", "company": "Solutions Tech" }
     }
   }
   ```

2. **SDR Agent processa resposta do lead e salva:**
   ```json
   {
     "metadata": {
       "origin": "sdr_greeting",
       "lead_info": { "name": "TAYLOR", "company": "TAYLOR" }
     }
   }
   ```

3. **`REPLACE` APAGA os dados da campanha!**
   - ❌ `lead_data` perdido
   - ❌ `origin: "campaign"` perdido
   - ❌ Informação correta (Solutions Tech) substituída por dados extraídos incorretamente (TAYLOR)

---

### 🎯 PASSO 3: Lead responde → SDR Agent processa

**Quando um lead de campanha responde, o que acontece:**

1. **Webhook recebe mensagem** (src/handlers/webhook_handler.js)
2. **MessageCoordinator processa** (src/handlers/MessageCoordinator.js)
3. **SDR Agent é chamado** (src/agents/sdr_agent.js)
4. **SDR Agent:**
   - Busca estado com `getEnhancedState(phone)`
   - Vê que `metadata.introduction_sent === true`
   - Deveria pular introdução e processar resposta
   - **MAS:** Salva NOVAMENTE com `saveEnhancedState()`
   - **REPLACE apaga os dados da campanha!**

---

## 🔎 ONDE ESTÁ O `lead_info`?

**Investigação:**
```bash
grep -rn "lead_info" src/ --include="*.js"
```

**Resultado:** 
- `src/tools/whatsapp.js:1347` - Apenas retorno de função, NÃO salva no banco

**Conclusão:**
- `lead_info` NÃO está sendo salvo por whatsapp.js
- `lead_info` está vindo de **SDR Agent ou Specialist Agent**
- O problema é que `INSERT OR REPLACE` apaga tudo que veio antes

---

## 💡 ROOT CAUSE

### Problema: `INSERT OR REPLACE` não faz MERGE de dados

**memory.js linha 722-744:**
```javascript
// Salva metadata INTEIRO que foi passado
JSON.stringify(enhancedState.metadata || {})
```

**Se campaign_manager passa:**
```javascript
{
  metadata: {
    introduction_sent: true,
    lead_data: { name: "Taylor", company: "Solutions Tech" }
  }
}
```

**E depois SDR Agent passa:**
```javascript
{
  metadata: {
    sdr_greeted: true,
    lead_info: { name: "TAYLOR", company: "TAYLOR" }
  }
}
```

**O banco fica com:** (APENAS o último)
```json
{
  "metadata": {
    "sdr_greeted": true,
    "lead_info": { "name": "TAYLOR", "company": "TAYLOR" }
  }
}
```

**❌ Perdeu:**
- `introduction_sent: true`
- `lead_data` com informações corretas da campanha
- `origin: "campaign"`

---

## ✅ SOLUÇÃO

### Opção 1: Fazer MERGE de metadata (RECOMENDADO)

**Modificar memory.js linha 710-774:**

```javascript
export async function saveEnhancedState(phoneNumber, enhancedState) {
  // ... validações ...
  
  // ✅ BUSCAR ESTADO EXISTENTE ANTES DE SALVAR
  const existingState = await getEnhancedState(phoneNumber);
  
  // ✅ FAZER MERGE DO METADATA
  const mergedMetadata = {
    ...(existingState?.metadata || {}),
    ...(enhancedState.metadata || {})
  };
  
  // ✅ MERGE ESPECIAL PARA lead_data e lead_info
  if (existingState?.metadata?.lead_data && enhancedState.metadata?.lead_info) {
    // Priorizar lead_data da campanha sobre lead_info do SDR
    mergedMetadata.lead_data = existingState.metadata.lead_data;
  }
  
  // Salvar com metadata mesclado
  const stmt = db.prepare(`...`);
  stmt.run(
    cleanNumber,
    ...
    JSON.stringify(mergedMetadata), // ← Metadata MESCLADO
    ...
  );
}
```

### Opção 2: SDR Agent não sobrescrever dados de campanha

**Modificar SDR Agent para:**
1. Checar se `metadata.origin === 'campaign'`
2. Se for campanha, NÃO sobrescrever `lead_data`
3. Apenas adicionar novos campos (`sdr_greeted`, etc)

---

## 📋 RESUMO DO FLUXO ATUAL (BUGADO)

```
T0: Campanha envia mensagem
    └─> saveEnhancedState({ metadata: { lead_data: {...} } })
    └─> DB: { metadata: { lead_data } } ✅

T1: Lead responde "Olá"
    └─> SDR Agent processa
    └─> saveEnhancedState({ metadata: { lead_info: {...} } })
    └─> DB: { metadata: { lead_info } } ✅ (REPLACE apagou lead_data!) ❌

T2: ORBION responde
    └─> Usa lead_info (dados errados) ao invés de lead_data ❌
    └─> Menciona empresa errada (Dipolo em vez de Solutions Tech) ❌
```

---

## 📋 FLUXO ESPERADO (APÓS CORREÇÃO)

```
T0: Campanha envia mensagem
    └─> saveEnhancedState({ metadata: { lead_data: {...} } })
    └─> DB: { metadata: { lead_data } } ✅

T1: Lead responde "Olá"
    └─> SDR Agent processa
    └─> saveEnhancedState({ metadata: { sdr_greeted: true } })
    └─> MERGE: { metadata: { lead_data, sdr_greeted } } ✅

T2: ORBION responde
    └─> Usa lead_data (dados corretos da campanha) ✅
    └─> Menciona Solutions Tech corretamente ✅
```

---

## 🎯 CONCLUSÃO

**O problema NÃO é:**
- ❌ Campaign Manager não salvar estado (código existe!)
- ❌ SDR Agent não processar (ele processa!)
- ❌ Dados não existirem (eles existem!)

**O problema É:**
- ✅ **`INSERT OR REPLACE` apaga dados anteriores**
- ✅ **Não há MERGE de metadata**
- ✅ **Dados corretos da campanha são perdidos quando SDR salva**

**Prioridade:** 🔴 **CRÍTICA**  
**Solução:** Implementar merge de metadata em `saveEnhancedState`

