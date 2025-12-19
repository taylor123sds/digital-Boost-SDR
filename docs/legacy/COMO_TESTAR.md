# 🧪 Como Testar o Sistema ORBION

## ⚠️ Importante: Endpoints Diferentes

O ORBION possui **2 sistemas diferentes**:

### 1. Sistema LEGADO (❌ NÃO usar para teste)
- **Endpoint**: `/api/chat`
- **Arquivo**: `src/agent.js`
- **Problema**: Sistema antigo sem multi-agent, sem Pain Discovery
- **Erro conhecido**: `ReferenceError: bantSystem is not defined`

### 2. Sistema MULTI-AGENT (✅ Usar para teste)
- **Endpoint**: `/api/webhook/evolution`
- **Arquivos**: `src/agents/sdr_agent.js`, `src/agents/specialist_agent.js`, `src/agents/scheduler_agent.js`
- **Funcionalidades**: Multi-agent, Pain Discovery, BANT consultivo
- **Status**: ✅ **Este é o sistema com as melhorias implementadas!**

---

## 🎯 Método 1: Teste via WhatsApp (Recomendado)

### Pré-requisitos
1. Evolution API rodando (porta 8080)
2. Instância "orbion" conectada no Evolution
3. Webhook configurado: `http://localhost:3001/api/webhook/evolution`

### Passo a Passo
1. Envie mensagem via WhatsApp para o número conectado
2. Sistema responde automaticamente
3. Fluxo completo: SDR → Specialist (Pain Discovery) → BANT → Scheduler

### Mensagens de Teste
```
Você: "Olá, quero melhorar meu marketing"
ORBION: [SDR pergunta sobre necessidade]

Você: "Sou de Natal, quero trazer mais leads"
ORBION: [SDR passa para Specialist]
ORBION: [Specialist mostra Pain Discovery com 4 opções]

Você: "Conversão baixa"
ORBION: [Specialist valida dor e demonstra expertise]
ORBION: [Transição consultiva para Budget]

Você: "Decidimos conforme o projeto"
ORBION: [Budget detectado, pergunta Authority]

Você: "Eu e meu sócio"
ORBION: [Authority detectado, pergunta Timing]

Você: "O mais rápido possível"
ORBION: [Timing detectado, passa para Scheduler]
ORBION: [Scheduler pede email]

Você: "teste@empresa.com.br"
ORBION: [Email coletado, propõe horários]

Você: "Quinta às 14h"
ORBION: [Reunião agendada!]
```

---

## 🎯 Método 2: Teste via Webhook Direto

### Simular mensagem do Evolution API

```bash
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "orbion",
    "data": {
      "key": {
        "remoteJid": "5584999888777@s.whatsapp.net",
        "fromMe": false,
        "id": "3EB0TESTE123"
      },
      "message": {
        "conversation": "Olá, quero melhorar meu marketing"
      },
      "messageType": "conversation",
      "messageTimestamp": 1729560000,
      "pushName": "Teste Claude"
    }
  }'
```

### Payload completo do Evolution API

```json
{
  "event": "messages.upsert",
  "instance": "orbion",
  "data": {
    "key": {
      "remoteJid": "5584999888777@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0TESTE123"
    },
    "pushName": "Teste Claude",
    "message": {
      "conversation": "Sua mensagem aqui"
    },
    "messageType": "conversation",
    "messageTimestamp": 1729560000
  }
}
```

---

## 🎯 Método 3: Testar Pain Discovery Diretamente

Para testar apenas a fase de Pain Discovery sem passar pelo SDR:

### 1. Criar estado manualmente no banco

```sql
INSERT INTO enhanced_conversation_states (
    phone_number,
    current_agent,
    current_state,
    pain_type,
    pain_description,
    state,
    bant_data
) VALUES (
    '5584999888777',
    'specialist',
    'pain_discovery',
    'growth_marketing',
    'escalar crescimento',
    '{"current":"pain_discovery","lastUpdate":"2025-10-22T01:00:00.000Z"}',
    '{"need":"Escalar crescimento"}'
);
```

### 2. Enviar mensagem de teste

```bash
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "orbion",
    "data": {
      "key": {
        "remoteJid": "5584999888777@s.whatsapp.net",
        "fromMe": false
      },
      "message": {
        "conversation": "Conversão baixa, os leads não fecham"
      },
      "messageType": "conversation",
      "pushName": "Teste"
    }
  }'
```

### 3. Verificar resposta

Sistema deve:
1. Detectar keyword "conversão"
2. Extrair `painDetails.category = "conversão"`
3. Retornar mensagem consultiva específica sobre conversão
4. Fazer transição para Budget

---

## 📊 Verificar Estado no Banco de Dados

### Ver estado atual de um lead

```bash
sqlite3 orbion.db "
SELECT
    phone_number,
    current_agent,
    json_extract(state, '$.current') as current_state,
    pain_type,
    json_extract(pain_details, '$.category') as pain_category,
    json_extract(bant_data, '$.budget') as budget,
    json_extract(bant_data, '$.authority') as authority,
    json_extract(bant_data, '$.timing') as timing
FROM enhanced_conversation_states
WHERE phone_number = '5584999888777';
"
```

### Ver últimas mensagens

```bash
sqlite3 orbion.db "
SELECT
    datetime(created_at, 'localtime') as time,
    from_me,
    substr(message_text, 1, 50) as message
FROM whatsapp_messages
WHERE phone_number = '5584999888777'
ORDER BY created_at DESC
LIMIT 10;
"
```

### Limpar estado para novo teste

```bash
sqlite3 orbion.db "
DELETE FROM enhanced_conversation_states WHERE phone_number = '5584999888777';
DELETE FROM whatsapp_messages WHERE phone_number = '5584999888777';
DELETE FROM memory WHERE key LIKE '%5584999888777%';
"
```

---

## 🔍 Debug: Ver Logs em Tempo Real

### Terminal 1: Servidor
```bash
tail -f /tmp/orbion.log
```

### Terminal 2: Filtrar por agente específico
```bash
tail -f /tmp/orbion.log | grep SPECIALIST
```

### Terminal 3: Filtrar por phone
```bash
tail -f /tmp/orbion.log | grep 5584999888777
```

---

## ✅ Checklist de Teste Completo

### Fase 1: SDR Agent
- [ ] Mensagem inicial detecta interesse em marketing/sites/audiovisual
- [ ] SDR identifica localização (Natal)
- [ ] SDR faz handoff para Specialist com `painType` correto

### Fase 2: Specialist - Pain Discovery
- [ ] Specialist envia mensagem com 4 opções de dor
- [ ] Sistema detecta resposta do lead (ex: "conversão")
- [ ] `extractPainDetails()` identifica categoria correta
- [ ] Estado atualiza: `current_state: 'pain_discovery'` → `'budget'`
- [ ] `painDetails` armazenado no banco

### Fase 3: Specialist - Transição Consultiva
- [ ] Mensagem valida a dor: "Perfeito! **Conversão baixa**..."
- [ ] Explica impacto e demonstra expertise
- [ ] Faz transição natural para Budget
- [ ] Pergunta de Budget é contextualizada à dor

### Fase 4: Specialist - BANT
- [ ] Budget detectado (ex: "conforme projeto")
- [ ] Authority detectado (ex: "eu e meu sócio")
- [ ] Timing detectado (ex: "o mais rápido")
- [ ] Score >= 70% calculado
- [ ] Handoff para Scheduler

### Fase 5: Scheduler - Email
- [ ] Scheduler pede email
- [ ] Email validado com regex
- [ ] Estado: `collecting_email` → `proposing_times`

### Fase 6: Scheduler - Horários
- [ ] Scheduler propõe horários
- [ ] Horário confirmado pelo lead
- [ ] Evento criado no Google Calendar (ou mock)
- [ ] Estado: `proposing_times` → `confirmed`

### Fase 7: Confirmação
- [ ] Mensagem de confirmação enviada
- [ ] `scheduledMeeting` armazenado no banco
- [ ] Email com convite enviado (se integrado)

---

## 🐛 Problemas Comuns

### Problema 1: "Desculpe, tive um problema técnico"
**Causa**: Usando endpoint `/api/chat` (legado)
**Solução**: Usar endpoint `/api/webhook/evolution`

### Problema 2: "bantSystem is not defined"
**Causa**: Sistema legado em `agent.js`
**Solução**: Usar sistema multi-agent via webhook

### Problema 3: Pain Discovery não funciona
**Causa**: Lead não está no estado `pain_discovery`
**Solução**: Verificar estado no banco e garantir que handoff do SDR funcionou

### Problema 4: Keywords não detectadas
**Causa**: Resposta do lead não contém keywords esperadas
**Solução**: Ver `extractPainDetails()` em `specialist_agent.js:379-421`

### Problema 5: Servidor não responde
**Causa**: Servidor travou ou não está rodando
**Solução**:
```bash
node start-orbion.js kill
node start-orbion.js start --force
```

---

## 📝 Exemplo de Teste Manual Completo

```bash
# 1. Limpar estado
sqlite3 orbion.db "DELETE FROM enhanced_conversation_states WHERE phone_number = '5584999888777';"

# 2. Mensagem 1: SDR
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","instance":"orbion","data":{"key":{"remoteJid":"5584999888777@s.whatsapp.net","fromMe":false},"message":{"conversation":"Olá, quero melhorar meu marketing"},"messageType":"conversation","pushName":"Teste"}}'

# 3. Aguardar resposta do SDR (verificar logs)

# 4. Mensagem 2: Localização
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","instance":"orbion","data":{"key":{"remoteJid":"5584999888777@s.whatsapp.net","fromMe":false},"message":{"conversation":"Sou de Natal"},"messageType":"conversation","pushName":"Teste"}}'

# 5. Specialist deve enviar Pain Discovery (verificar logs)

# 6. Mensagem 3: Responder Pain Discovery
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","instance":"orbion","data":{"key":{"remoteJid":"5584999888777@s.whatsapp.net","fromMe":false},"message":{"conversation":"Conversão baixa"},"messageType":"conversation","pushName":"Teste"}}'

# 7. Verificar transição consultiva (verificar logs)

# 8. Continuar com Budget, Authority, Timing...
```

---

## 🎯 Resumo

**✅ Sistema Correto**: `/api/webhook/evolution` (multi-agent)
**❌ Sistema Legado**: `/api/chat` (antigo, não usar)

**Para testar Pain Discovery**:
1. Use WhatsApp real (recomendado)
2. OU simule webhook do Evolution API
3. Verifique logs em `/tmp/orbion.log`
4. Confira estado no banco: `enhanced_conversation_states`

---

**Documento criado em**: 22/10/2025
**Versão**: 1.0
**Status**: ✅ Pronto para uso
