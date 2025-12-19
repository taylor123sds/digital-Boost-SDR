# 🚨 CORREÇÕES URGENTES - BOT DETECTOR QUEBRADO

## PROBLEMA IDENTIFICADO
Sistema de detecção de bots COMPLETAMENTE quebrado, causando loops infinitos com **415+ mensagens** trocadas com um único bot.

## CAUSA RAIZ
1. ❌ Mensagens vazias recebem texto genérico `[Mensagem sem texto]` que NÃO é detectado como bot
2. ❌ Padrões de bot INCOMPLETOS - não detectam frases comuns como "Desculpe! Não entendi"
3. ❌ Circuit breaker muito fraco (10% do score) - NÃO previne loops

---

## SOLUÇÃO #1: BLOQUEAR MENSAGENS VAZIAS IMEDIATAMENTE (CRÍTICO)

### Arquivo: `src/handlers/webhook_handler.js`
### Linhas: 84-88

**ANTES (ERRADO - CAUSA LOOP)**:
```javascript
// Aceitar mensagens mesmo sem texto (pode ser mídia, status, etc.)
if (!messageData.text && !['image', 'video', 'audio', 'document'].includes(messageData.messageType)) {
  // Atribuir texto padrão para mensagens sem conteúdo
  messageData.text = '[Mensagem sem texto]';
}
```

**DEPOIS (CORRETO - BLOQUEIA BOT)**:
```javascript
// 🚨 BLOQUEIO CRÍTICO: Mensagens vazias = BOT AUTO-RESPONDER
if (!messageData.text && !['image', 'video', 'audio', 'document'].includes(messageData.messageType)) {
  console.log(`🚫 [BOT-BLOCKER] Mensagem vazia detectada de ${messageData.from} - PROVÁVEL BOT`);
  console.log(`🚫 [BOT-BLOCKER] MessageType: ${messageData.messageType} - BLOQUEANDO para prevenir loop`);

  return {
    status: 'ignored',
    reason: 'empty_message_bot_suspected',
    from: messageData.from,
    botDetected: true,
    preventLoop: true
  };
}
```

**RAZÃO**: Mensagens completamente vazias (sem texto, sem mídia) são **SEMPRE** de bots/auto-responders. Humanos não enviam mensagens vazias repetidamente.

---

## SOLUÇÃO #2: EXPANDIR PADRÕES DE BOT (CRÍTICO)

### Arquivo: `src/utils/bot_detector.js`
### Linhas: 47-67 (adicionar no array `classicPhrases`)

**ADICIONAR os seguintes padrões**:
```javascript
classicPhrases: [
  // EXISTENTES...
  /como\s+(posso|podemos)\s+ajudar(\s+você)?(\s+hoje)?/gi,
  // ... outros existentes ...

  // 🆕 NOVOS PADRÕES CRÍTICOS (adicionar):
  /desculpe[,!]?\s+(não|nao)\s+entend/gi,              // "Desculpe! Não entendi"
  /(não|nao)\s+entend(i|emos)\s+(sua|a)\s+resposta/gi, // "Não entendi sua resposta"
  /escolha\s+uma\s+opção\s+válida/gi,                  // "Escolha uma opção válida"
  /vamos\s+tentar\s+novamente/gi,                       // "Vamos tentar novamente"
  /opção\s+inválida/gi,                                 // "Opção inválida"
  /resposta\s+inválida/gi,                              // "Resposta inválida"
  /digite\s+(novamente|outra\s+vez)/gi,                 // "Digite novamente"
  /tente\s+(novamente|outra\s+vez)/gi,                  // "Tente novamente"
  /não\s+(consegui|consigo)\s+entender/gi,              // "Não consegui entender"
  /por\s+favor,?\s+(tente\s+novamente|escolha)/gi,      // "Por favor, tente novamente"
  /mensagem\s+(não\s+reconhecida|inválida)/gi           // "Mensagem não reconhecida"
]
```

---

## SOLUÇÃO #3: AUMENTAR PESO DO CIRCUIT BREAKER (IMPORTANTE)

### Arquivo: `src/utils/bot_detector.js`
### Linhas: 292-298

**ANTES**:
```javascript
const SCORING_WEIGHTS = {
  messageFrequency: 0.25,
  responsePattern: 0.20,
  contentEntropy: 0.15,
  contentSignals: 0.30,
  circuitBreaker: 0.10       // ❌ MUITO FRACO
};
```

**DEPOIS**:
```javascript
const SCORING_WEIGHTS = {
  messageFrequency: 0.20,    // Reduzido de 0.25
  responsePattern: 0.15,     // Reduzido de 0.20
  contentEntropy: 0.10,      // Reduzido de 0.15
  contentSignals: 0.30,      // Mantido
  circuitBreaker: 0.25       // ✅ AUMENTADO de 0.10 para 0.25
};
```

**RAZÃO**: Circuit breaker deve ter peso MAIOR para prevenir loops mesmo quando outros sinais não detectam.

---

## SOLUÇÃO #4: REDUZIR LIMITE DO CIRCUIT BREAKER (IMPORTANTE)

### Arquivo: `src/utils/bot_detector.js`
### Linhas: 507-513

**ANTES**:
```javascript
if (tracker.turnCount > 8) {
  circuitScore = 1.0;
  tracker.circuitBreakerTriggered = true;
} else if (tracker.turnCount > 5) {
  circuitScore = 0.5;
}
```

**DEPOIS**:
```javascript
if (tracker.turnCount > 6) {  // ✅ Reduzido de 8 para 6
  circuitScore = 1.0;
  tracker.circuitBreakerTriggered = true;
  console.log(`🚨 [CIRCUIT-BREAKER] ATIVADO para ${contactId} - ${tracker.turnCount} mensagens!`);
} else if (tracker.turnCount > 4) {  // ✅ Reduzido de 5 para 4
  circuitScore = 0.5;
  console.log(`⚠️ [CIRCUIT-BREAKER] Alerta para ${contactId} - ${tracker.turnCount} mensagens`);
}
```

**RAZÃO**: 6 mensagens já é suficiente para detectar loop. BANT normal usa 12-18 msgs mas nunca em segundos.

---

## SOLUÇÃO #5: DETECÇÃO DE MENSAGENS REPETITIVAS (CRÍTICO)

### Arquivo: `src/utils/bot_detector.js`
### Após linha 401 (adicionar nova função)

```javascript
/**
 * 🚨 DETECTOR DE LOOP INFINITO
 * Detecta quando mesmo contato envia MUITAS mensagens em POUCO TEMPO
 * @param {string} contactId
 * @returns {boolean}
 */
function detectInfiniteLoop(contactId) {
  const tracker = behaviorTracker.get(contactId);
  if (!tracker || tracker.timingHistory.length < 5) {
    return false;
  }

  // Verificar últimas 5 mensagens
  const recentTimes = tracker.timingHistory.slice(-5);
  const timeSpan = recentTimes[recentTimes.length - 1] - recentTimes[0];

  // Se 5 mensagens em menos de 10 segundos = BOT LOOP
  if (timeSpan < 10000) {
    console.log(`🚨 [LOOP-DETECTOR] LOOP INFINITO detectado para ${contactId}!`);
    console.log(`🚨 [LOOP-DETECTOR] 5 mensagens em ${timeSpan}ms = BOT AUTO-RESPONDER`);
    return true;
  }

  return false;
}
```

### Adicionar chamada desta função em `calculateBotScore()` (linha 442):

```javascript
function calculateBotScore(contactId, messageText) {
  const tracker = behaviorTracker.get(contactId);
  if (!tracker) {
    return { totalScore: 0, riskLevel: 'low', breakdown: {} };
  }

  // 🚨 VERIFICAÇÃO IMEDIATA DE LOOP INFINITO
  if (detectInfiniteLoop(contactId)) {
    console.log(`🚨 [BOT-SCORE] Loop infinito detectado - BLOQUEANDO ${contactId} imediatamente`);
    return {
      totalScore: 1.0,  // Score máximo = bloqueio garantido
      riskLevel: 'critical',
      action: 'block',
      breakdown: {
        frequency: 1.0,
        pattern: 1.0,
        entropy: 1.0,
        content: 1.0,
        circuit: 1.0
      },
      circuitBreakerTriggered: true,
      infiniteLoopDetected: true  // ✅ Flag especial
    };
  }

  // ... resto da função normal
```

---

## SOLUÇÃO #6: BLOQUEAR CONTATOS JÁ EM LOOP (URGENTE)

### Criar arquivo: `src/utils/blacklist.js`

```javascript
/**
 * 🚫 BLACKLIST DE CONTATOS EM LOOP INFINITO
 * Lista temporária de contatos bloqueados por loop detectado
 */

class Blacklist {
  constructor() {
    this.blocked = new Map(); // contactId → { blockedAt, reason, messageCount }
    this.TTL = 3600000; // 1 hora
  }

  block(contactId, reason, messageCount) {
    this.blocked.set(contactId, {
      blockedAt: Date.now(),
      reason,
      messageCount
    });

    console.log(`🚫 [BLACKLIST] ${contactId} BLOQUEADO - ${reason} (${messageCount} msgs)`);

    // Auto-remoção após TTL
    setTimeout(() => {
      this.blocked.delete(contactId);
      console.log(`✅ [BLACKLIST] ${contactId} removido da blacklist após 1h`);
    }, this.TTL);
  }

  isBlocked(contactId) {
    return this.blocked.has(contactId);
  }

  getBlockedInfo(contactId) {
    return this.blocked.get(contactId);
  }

  unblock(contactId) {
    const wasBlocked = this.blocked.has(contactId);
    this.blocked.delete(contactId);
    if (wasBlocked) {
      console.log(`✅ [BLACKLIST] ${contactId} desbloqueado manualmente`);
    }
    return wasBlocked;
  }

  getAll() {
    return Array.from(this.blocked.entries()).map(([contactId, info]) => ({
      contactId,
      ...info
    }));
  }
}

export const blacklist = new Blacklist();
export default blacklist;
```

### Integrar no webhook_handler.js (após linha 82):

```javascript
// Verificar blacklist ANTES de processar
import { blacklist } from '../utils/blacklist.js';

if (blacklist.isBlocked(messageData.from)) {
  const blockInfo = blacklist.getBlockedInfo(messageData.from);
  console.log(`🚫 [BLACKLIST] ${messageData.from} está bloqueado: ${blockInfo.reason}`);
  return {
    status: 'ignored',
    reason: 'blacklisted',
    from: messageData.from,
    blockInfo
  };
}
```

### Adicionar ao bot_detector.js (quando detectar loop):

```javascript
// Em isProbableBot() após linha 107
if (shouldBlock && tracker.turnCount > 10) {
  // Bloquear na blacklist se muito loop
  blacklist.block(contactId, 'infinite_loop_detected', tracker.turnCount);
}
```

---

## TESTE DAS CORREÇÕES

### Testar Solução #1 (Mensagens vazias):
```bash
# Simular mensagem vazia
curl -X POST http://localhost:3000/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": { "remoteJid": "5584999999999@s.whatsapp.net" },
      "message": {}
    }
  }'
```
**Resultado esperado**: Mensagem ignorada, log "Mensagem vazia detectada - BLOQUEANDO"

### Testar Solução #2 (Novos padrões):
```bash
# Simular mensagem de bot
curl -X POST http://localhost:3000/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": { "remoteJid": "5584999999999@s.whatsapp.net" },
      "message": {
        "conversation": "Desculpe! Não entendi sua resposta. Escolha uma opção válida."
      }
    }
  }'
```
**Resultado esperado**: Bot detectado, score alto de conteúdo

---

## PRIORIDADE DE IMPLEMENTAÇÃO

1. ✅ **SOLUÇÃO #1** (CRÍTICO) - Bloquear mensagens vazias
2. ✅ **SOLUÇÃO #5** (CRÍTICO) - Detector de loop infinito
3. ✅ **SOLUÇÃO #6** (URGENTE) - Blacklist temporária
4. ✅ **SOLUÇÃO #2** (IMPORTANTE) - Novos padrões
5. ✅ **SOLUÇÃO #3** (IMPORTANTE) - Peso do circuit breaker
6. ✅ **SOLUÇÃO #4** (OPCIONAL) - Limite do circuit breaker

---

## LIMPAR CONTATOS EM LOOP

```sql
-- Ver contatos em loop (>50 msgs)
SELECT phone_number, COUNT(*) as msg_count
FROM whatsapp_messages
GROUP BY phone_number
HAVING msg_count > 50
ORDER BY msg_count DESC;

-- Deletar mensagens do bot problemático (558496791624 com 415 msgs)
DELETE FROM whatsapp_messages
WHERE phone_number = '558496791624';

-- Limpar estado dele também
DELETE FROM enhanced_conversation_states
WHERE phone_number = '558496791624';
```

---

## MONITORAMENTO PÓS-CORREÇÃO

Adicionar endpoint de monitoramento:

```javascript
// server.js
app.get('/api/bot-detector/status', (req, res) => {
  const blacklisted = blacklist.getAll();
  const stats = {
    blacklisted,
    blacklistCount: blacklisted.length
  };

  res.json(stats);
});
```

---

Implementar AGORA nesta ordem:
1. Solução #1
2. Solução #5
3. Solução #6
4. Soluções #2, #3, #4
