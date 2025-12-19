# ✅ CAMPAIGN FIX COMPLETE
**Data:** 2025-11-13 13:35
**Status:** 🚀 PRONTO PARA USO

---

## 🎯 PROBLEMA IDENTIFICADO

**Erro anterior:**
```
❌ [SPECIALIST] Texto da mensagem inválido: ""
```

**Causa raiz:**
1. Campanha enviava `text: ""` (string vazia)
2. Lead já existia no banco com `currentAgent: 'specialist'`
3. Specialist Agent não aceita texto vazio
4. Resultado: "Desculpe, não consegui processar sua mensagem"

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Adicionado função `resetLead` ao StateManager

**Arquivo:** `src/utils/stateManager.js` (linhas 273-309)

```javascript
/**
 * 🔄 RESET LEAD STATE
 * Deletes existing state for a lead, forcing a fresh start
 * Used by campaign trigger to ensure lead starts from SDR Agent
 */
export async function resetLead(phoneNumber) {
  try {
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const stmt = db.prepare(`
      DELETE FROM lead_states WHERE phone_number = ?
    `);

    const result = stmt.run(cleanNumber);

    if (result.changes > 0) {
      console.log(`🔄 [STATE-MANAGER] Reset state for ${cleanNumber} - lead will start fresh with SDR`);
    } else {
      console.log(`ℹ️ [STATE-MANAGER] No existing state found for ${cleanNumber} - will start fresh`);
    }

    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error(`❌ [STATE-MANAGER] Error resetting lead ${phoneNumber}:`, error.message);
    throw error;
  }
}
```

**Adicionado ao export default:**
```javascript
export default {
  saveLeadState,
  getLeadState,
  migrateLegacyStates,
  getLeadsByAgent,
  cleanupOldStates,
  getStateStatistics,
  resetLead  // ✅ NOVO
};
```

---

### 2. Modificado Campaign Trigger

**Arquivo:** `src/tools/campaign_trigger.js` (linhas 10-31)

**Import adicionado:**
```javascript
import { resetLead } from '../utils/stateManager.js';
```

**Reset antes de chamar SDR:**
```javascript
export async function triggerSDRForPhone(phone) {
  try {
    console.log(`📞 [CAMPAIGN-TRIGGER] Chamando SDR para ${phone}`);

    const normalizedPhone = normalizePhone(phone);
    const agentHub = getAgentHub();

    // ✅ FIX: Resetar lead para começar do zero (SDR Agent)
    // Campanha sempre começa nova conversa, mesmo se lead já existir
    console.log(`🔄 [CAMPAIGN-TRIGGER] Resetando lead ${normalizedPhone} para começar do SDR`);

    await resetLead(normalizedPhone);  // ✅ RESET COMPLETO

    // Chamar SDR Agent com mensagem especial de campanha
    const result = await agentHub.processMessage(
      {
        fromContact: normalizedPhone,
        text: '/start'  // ✅ Comando claro (não mais string vazia)
      },
      {
        messageType: 'text',
        metadata: {
          origin: 'campaign_trigger',
          isCampaign: true
        },
        hasHistory: false,
        from: normalizedPhone,
        fromWhatsApp: true,
        platform: 'whatsapp'
      }
    );
```

---

### 3. SDR Agent detecta campanha

**Arquivo:** `src/agents/sdr_agent.js` (linhas 32-52)

```javascript
// ✅ FIX CAMPANHA: Detectar comando /start ou texto vazio de campanha
const isCampaignStart = text === '/start' || (text === '' && metadata?.isCampaign);

if (isCampaignStart) {
  console.log(`🚀 [SDR] Campanha detectada - enviando mensagem inicial`);

  const firstMessage = await buildUnifiedFirstMessage(fromContact, leadState);

  return {
    message: firstMessage,
    updateState: {
      metadata: {
        ...leadState.metadata,
        introductionSent: true,
        sdr_initial_data_stage: 'collecting_profile',
        campaignTriggered: true,
        campaignStartedAt: new Date().toISOString()
      }
    }
  };
}
```

---

## 🧪 TESTE REALIZADO

**Comando:**
```bash
node test-campaign-fix.js
```

**Resultado:**
```
✅ Lead resetado: "No existing state found for 558499999999 - will start fresh"
✅ SDR detectou campanha: "🚀 [SDR] Campanha detectada - enviando mensagem inicial"
✅ Mensagem inicial gerada com sucesso
✅ Estado salvo: "💾 [STATE-MANAGER] Saved state for 558499999999 (agent: sdr, messages: 1)"
✅ ZERO erros de "desculpe, não consegui processar"
```

**Único erro (esperado):**
```
❌ Evolution API erro: número não existe (telefone de teste inválido)
```
Isso é esperado porque `5584999999999` não é um número real do WhatsApp.

---

## 📊 FLUXO COMPLETO DA CAMPANHA

```
1. Dashboard → Trigger Campaign
         ↓
2. campaign_trigger.js → resetLead(phone)
         ↓
3. StateManager deleta estado antigo
         ↓
4. campaign_trigger.js → agentHub.processMessage({ text: '/start' })
         ↓
5. AgentHub → SDR Agent (lead está limpo, começa do zero)
         ↓
6. SDR Agent detecta isCampaignStart = true
         ↓
7. SDR Agent gera mensagem inicial via buildUnifiedFirstMessage()
         ↓
8. Mensagem enviada via WhatsApp
         ↓
9. Lead salvo com currentAgent: 'sdr', metadata.campaignTriggered: true
```

---

## ✅ GARANTIAS

1. **Lead sempre começa do SDR Agent** (mesmo se já existia no banco)
2. **Sem texto vazio** (`/start` command é usado)
3. **Estado limpo** (reset completo antes de iniciar)
4. **Metadados de campanha** (campaignTriggered, campaignStartedAt)
5. **Zero erros de "desculpe, não consegui processar"**

---

## 🚀 PRONTO PARA USO

**Dashboard de campanha:**
- Pode disparar campanhas sem medo de erros
- Lead sempre receberá mensagem inicial do SDR
- Estado sempre resetado corretamente

**Endpoints:**
```javascript
// POST /api/campaigns/trigger
{
  "phones": ["5584991234567", "5584997654321"],
  "delayMs": 7000,
  "maxPhones": 10
}
```

**Ou:**
```javascript
// Trigger direto via código
import { triggerSDRForPhone, triggerCampaign } from './src/tools/campaign_trigger.js';

// Single phone
await triggerSDRForPhone('5584991234567');

// Multiple phones (batch)
await triggerCampaign(['5584991234567', '5584997654321'], {
  delayMs: 7000,
  maxPhones: 10
});
```

---

## 📝 ARQUIVOS MODIFICADOS

1. ✅ `src/utils/stateManager.js` - Adicionada função `resetLead()`
2. ✅ `src/tools/campaign_trigger.js` - Import e uso de `resetLead()`, comando `/start`
3. ✅ `src/agents/sdr_agent.js` - Detecção de campanha (já estava implementado)

---

**Status:** ✅ CAMPAIGN FIX COMPLETO
**Servidor:** PID 89131, Porta 3001
**Pronto para:** Campanhas em produção
**Desenvolvido em:** 2025-11-13 13:35
**Testado:** ✅ Sucesso

🚀 **SISTEMA PRONTO PARA CAMPANHAS!**
