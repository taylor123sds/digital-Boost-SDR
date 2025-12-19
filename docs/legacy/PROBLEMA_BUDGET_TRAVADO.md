# 🐛 Problema: Lead Travado no Budget

## 📋 Sintoma Reportado

> "o fluxo do orbion estava otimo, esta consultivo, mas quando chega no budget ele trava"

## 🔍 Investigação

### Estado do Lead Travado (558496791624)

```sql
SELECT phone_number, current_agent, current_state, pain_type,
       json_extract(agent_state_data, '$.painDetails.category') as pain_category,
       json_extract(bant_data, '$.budget') as budget
FROM enhanced_conversation_states
WHERE phone_number = '558496791624';
```

**Resultado:**
```
558496791624 | specialist | budget | growth_marketing | (vazio) | (vazio)
```

### Problema Identificado

O lead está:
- ✅ No agente correto: `specialist`
- ✅ No estágio: `budget`
- ❌ **SEM `painDetails.category`** → Não passou pelo Pain Discovery!
- ❌ **Budget vazio** → Está enviando pergunta genérica sem contexto

## 🔎 Causa Raiz

O **Pain Discovery não está sendo ativado** para leads que já estavam no sistema antes da implementação.

### Fluxo Esperado (✅ NOVO)
```
SDR Agent
    ↓ handoff
Specialist Agent
    ↓ onHandoffReceived()
    ├─ state.current = 'pain_discovery'  ✅
    ├─ painDetails = null
    └─ Envia pergunta de Pain Discovery
    ↓ Lead responde
Specialist Agent process()
    ├─ Detecta state.current === 'pain_discovery'
    ├─ extractPainDetails()  ✅
    ├─ getPainToBudgetTransition()  ✅
    ├─ state.current = 'budget'
    └─ Envia mensagem consultiva
```

### Fluxo Antigo (❌ PROBLEMA)
```
SDR Agent
    ↓ handoff (antes da mudança)
Specialist Agent
    ├─ state.current = 'budget'  ❌ Direto pro Budget
    ├─ painDetails = (não existe)
    └─ Envia pergunta genérica de Budget
```

## 🎯 Leads Afetados

Leads que receberam handoff do SDR **ANTES** da implementação do Pain Discovery ficam presos porque:

1. Estão em `current_state: 'budget'`
2. Não têm `painDetails`
3. Sistema envia pergunta genérica de Budget
4. Lead responde mas **detecção de Budget falha** (porque a resposta não corresponde aos padrões esperados)
5. Sistema **reenvia a mesma pergunta** → **LOOP INFINITO**

## 🔧 Solução Implementada

### Solução Imediata: Limpar Leads Travados

```bash
sqlite3 orbion.db "DELETE FROM enhanced_conversation_states WHERE phone_number = '558496791624';"
```

Isso força o lead a recomeçar do SDR, que fará handoff correto para o Specialist com Pain Discovery.

### Solução de Longo Prazo: Migração Automática

Adicionar lógica no `specialist_agent.js` para detectar leads sem `painDetails` e forçar Pain Discovery:

```javascript
async process(message, context) {
  const { leadState } = context;

  // ✅ MIGRAÇÃO: Se está em budget mas NÃO passou pelo Pain Discovery
  if (leadState.state?.current === 'budget' && !leadState.painDetails) {
    console.log(`🔧 [SPECIALIST] Lead sem painDetails - forçando Pain Discovery`);

    // Mudar estado para pain_discovery
    return {
      message: this.getFirstQuestion(leadState.painType, leadState),
      updateState: {
        state: {
          current: 'pain_discovery',
          lastUpdate: new Date().toISOString()
        },
        painDetails: null
      },
      metadata: {
        migration: true,
        bantStage: 'pain_discovery'
      }
    };
  }

  // Continua fluxo normal...
}
```

## 📊 Verificar Quantos Leads Estão Afetados

```sql
SELECT
    COUNT(*) as total_afetados,
    GROUP_CONCAT(phone_number) as phones
FROM enhanced_conversation_states
WHERE current_agent = 'specialist'
  AND current_state = 'budget'
  AND (agent_state_data IS NULL OR agent_state_data NOT LIKE '%painDetails%');
```

## 🚀 Aplicar Correção

### Opção 1: Reset Manual (Recomendado para poucos leads)

```bash
# Ver leads afetados
sqlite3 orbion.db "
SELECT phone_number, current_state, pain_type
FROM enhanced_conversation_states
WHERE current_agent = 'specialist'
  AND current_state = 'budget'
  AND (agent_state_data IS NULL OR agent_state_data NOT LIKE '%painDetails%');
"

# Resetar cada um
sqlite3 orbion.db "DELETE FROM enhanced_conversation_states WHERE phone_number = 'PHONE_HERE';"
```

### Opção 2: Migração em Massa (Para muitos leads)

```sql
UPDATE enhanced_conversation_states
SET current_state = 'pain_discovery',
    agent_state_data = json_set(COALESCE(agent_state_data, '{}'), '$.painDetails', NULL),
    updated_at = datetime('now')
WHERE current_agent = 'specialist'
  AND current_state = 'budget'
  AND (agent_state_data IS NULL OR agent_state_data NOT LIKE '%painDetails%');
```

### Opção 3: Código Automático (Melhor para produção)

Adicionar no início do `process()` do `specialist_agent.js`:

```javascript
// ✅ MIGRAÇÃO AUTOMÁTICA: Forçar Pain Discovery para leads sem painDetails
if (leadState.state?.current === 'budget' && !leadState.painDetails) {
  console.log(`🔧 [MIGRATION] Lead ${fromContact} sem painDetails - redirecionando para Pain Discovery`);

  return {
    message: this.getFirstQuestion(leadState.painType, leadState),
    updateState: {
      state: {
        current: 'pain_discovery',
        lastUpdate: new Date().toISOString()
      },
      painDetails: null
    },
    metadata: {
      migrated: true,
      bantStage: 'pain_discovery'
    }
  };
}
```

## ✅ Verificação Pós-Correção

Após aplicar a correção, verificar:

```bash
# Ver estado do lead
sqlite3 orbion.db "
SELECT phone_number, current_agent, current_state, pain_type,
       json_extract(agent_state_data, '$.painDetails') as pain_details
FROM enhanced_conversation_states
WHERE phone_number = '558496791624';
"

# Ver últimas mensagens
sqlite3 orbion.db "
SELECT datetime(created_at, 'localtime') as time, from_me,
       substr(message_text, 1, 80) as message
FROM whatsapp_messages
WHERE phone_number = '558496791624'
ORDER BY created_at DESC
LIMIT 5;
"
```

## 📝 Checklist de Resolução

- [x] Problema identificado: Leads sem `painDetails` travados em Budget
- [x] Causa raiz: Handoff antigo (antes do Pain Discovery)
- [ ] Aplicar migração automática no código
- [ ] Verificar quantos leads afetados
- [ ] Resetar ou migrar leads travados
- [ ] Testar fluxo completo com lead novo
- [ ] Monitorar logs para novos casos

---

**Status**: ✅ Causa identificada, solução proposta
**Lead limpo**: 558496791624
**Próximo passo**: Implementar migração automática no código

**Criado em**: 22/10/2025
**Versão**: 1.0
