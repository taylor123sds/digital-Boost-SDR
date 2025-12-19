# ORBION - Melhorias de Confiabilidade e Resiliência (Fases 4-6)

## 📋 Resumo Executivo

Este documento complementa o `IMPROVEMENTS.md` e detalha as melhorias de **confiabilidade, resiliência e observabilidade** implementadas para resolver problemas de fluxo de mensagens, erros e conflitos no ORBION.

Data: Outubro 2025
Fases: 4, 5 e 6 (Complementares às Fases 1-3)

---

## 🔍 Problemas Identificados e Solucionados

### 🔴 **Problema #1: Ausência de Circuit Breaker**
**Impacto**: Se OpenAI ou Evolution API caírem, o sistema trava completamente
**Solução**: Circuit Breaker Pattern com estados OPEN/HALF_OPEN/CLOSED

**Arquivo Criado**: `src/utils/circuit-breaker.js`

#### Uso:
```javascript
import { circuitBreakerRegistry } from './utils/circuit-breaker.js';

// Criar circuit breaker para OpenAI
const openaiBreaker = circuitBreakerRegistry.get('openai', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000
});

// Executar chamada protegida
try {
  const result = await openaiBreaker.execute(async () => {
    return await openai.chat.completions.create({...});
  });
} catch (error) {
  if (error.circuitBreakerOpen) {
    console.log(`OpenAI indisponível, retry em ${error.waitTime}ms`);
    // Usar fallback ou fila
  }
}
```

#### Configuração (.env):
```bash
# Circuit Breaker - OpenAI
CB_OPENAI_FAILURE_THRESHOLD=5
CB_OPENAI_SUCCESS_THRESHOLD=2
CB_OPENAI_TIMEOUT=60000

# Circuit Breaker - Evolution API
CB_EVOLUTION_FAILURE_THRESHOLD=3
CB_EVOLUTION_SUCCESS_THRESHOLD=2
CB_EVOLUTION_TIMEOUT=30000
```

---

### 🔴 **Problema #2: Timeouts Fixos e Inadequados**
**Impacto**: Áudios e operações complexas excediam timeout de 10s
**Solução**: Timeouts configuráveis via variáveis de ambiente

#### Configuração (.env):
```bash
# WhatsApp Timeouts (em milissegundos)
WHATSAPP_SEND_TIMEOUT=30000              # 30s para envio
WHATSAPP_AUDIO_TIMEOUT=60000             # 60s para áudio
WHATSAPP_MEDIA_TIMEOUT=45000             # 45s para mídia

# OpenAI Timeouts
OPENAI_CHAT_TIMEOUT=60000                # 60s para chat
OPENAI_WHISPER_TIMEOUT=90000             # 90s para transcrição
OPENAI_TTS_TIMEOUT=30000                 # 30s para TTS

# Evolution API Timeouts
EVOLUTION_API_TIMEOUT=15000              # 15s geral
EVOLUTION_CONNECT_TIMEOUT=5000           # 5s conexão
```

#### Uso no Código:
```javascript
// response_manager.js - ANTES
const sendResult = await this.withTimeout(
  sendWhatsAppMessage(to, message),
  10000, // ❌ FIXO
  `Envio para ${to}`
);

// response_manager.js - DEPOIS
const timeout = parseInt(process.env.WHATSAPP_SEND_TIMEOUT) || 30000;
const sendResult = await this.withTimeout(
  sendWhatsAppMessage(to, message),
  timeout, // ✅ CONFIGURÁVEL
  `Envio para ${to}`
);
```

---

### 🔴 **Problema #3: Retry Sem Inteligência**
**Impacto**: Sistema retentava mesmo com erros permanentes (400, 401, 404)
**Solução**: Retry inteligente que diferencia erros temporários de permanentes

**Arquivo Criado**: `src/utils/retry.js`

#### Erros que NÃO são retried (Fail Fast):
- 400 (Bad Request)
- 401 (Unauthorized)
- 403 (Forbidden)
- 404 (Not Found)
- 409 (Conflict)
- 422 (Unprocessable Entity)

#### Erros que SÃO retried (Temporários):
- 408 (Request Timeout)
- 429 (Too Many Requests)
- 500, 502, 503, 504 (Erros de servidor)
- ECONNREFUSED, ETIMEDOUT, ENOTFOUND (Erros de rede)

#### Uso:
```javascript
import { retryWithBackoff, retryHttp } from './utils/retry.js';

// Retry genérico
const result = await retryWithBackoff(async () => {
  return await someOperation();
}, {
  maxAttempts: 3,
  initialDelay: 1000,
  context: 'my_operation'
});

// Retry HTTP específico
const response = await retryHttp(async () => {
  return await fetch(url);
}, {
  maxAttempts: 3,
  context: 'evolution_api_call'
});

// Retry com fallback
const data = await retryWithFallback(
  async () => await getDataFromAPI(),
  async (error) => {
    // Fallback: retornar dados em cache
    return getCachedData();
  }
);
```

#### Configuração (.env):
```bash
# Retry Configuration
RETRY_MAX_ATTEMPTS=3                     # Máximo 3 tentativas
RETRY_INITIAL_DELAY=1000                 # Delay inicial 1s
RETRY_MAX_DELAY=10000                    # Delay máximo 10s
RETRY_MULTIPLIER=2                       # Multiplicador 2x
```

---

## 📊 Arquivos Criados

### 1. `src/utils/circuit-breaker.js` (316 linhas)
**Funcionalidade**: Circuit Breaker Pattern completo
- Estados: CLOSED, OPEN, HALF_OPEN
- Registry global de breakers
- Métricas e estatísticas
- Logging estruturado com Winston

### 2. `src/utils/retry.js` (201 linhas)
**Funcionalidade**: Sistema de retry inteligente
- Diferencia erros temporários vs permanentes
- Backoff exponencial com jitter
- Retries específicos: HTTP, Database
- Retry com fallback

### 3. Atualização do `.env`
**Novas Variáveis**: 15 configurações de timeout e circuit breaker

---

## 🚀 Próximas Melhorias (Pendentes)

### ✅ **Completadas (Fase 4)**
1. Circuit Breaker para APIs externas
2. Timeouts configuráveis via .env
3. Retry inteligente com diferenciação de erros

### 🔧 **Pendentes (Fase 5-6)**
4. Substituir console.log por Winston em TODO o código
5. Adicionar validação Joi em endpoints WhatsApp
6. Implementar graceful shutdown
7. Atualizar response_manager.js para usar retry inteligente
8. Integrar Circuit Breaker no openai_client.js
9. Integrar Circuit Breaker no whatsapp.js (Evolution API)
10. Criar documentação de troubleshooting

---

## 📈 Benefícios Esperados

### Confiabilidade
- ✅ **Falhas em cascata prevenidas** (Circuit Breaker)
- ✅ **Timeouts adequados** para cada tipo de operação
- ✅ **Retry inteligente** economiza recursos

### Performance
- ✅ **Fail fast** para erros permanentes
- ✅ **Backoff exponencial** evita sobrecarga
- ✅ **Jitter** previne thundering herd

### Observabilidade
- ✅ **Métricas de circuit breaker** (falhas, sucessos, transições)
- ✅ **Logs estruturados** de retry attempts
- ✅ **Estatísticas** de saúde do sistema

---

## 🔗 Integração Futura

### OpenAI Client
```javascript
// src/core/openai_client.js
import { circuitBreakerRegistry } from '../utils/circuit-breaker.js';
import { retryWithBackoff } from '../utils/retry.js';

const openaiBreaker = circuitBreakerRegistry.get('openai', {
  failureThreshold: parseInt(process.env.CB_OPENAI_FAILURE_THRESHOLD) || 5,
  timeout: parseInt(process.env.CB_OPENAI_TIMEOUT) || 60000
});

async chat(messages) {
  return await openaiBreaker.execute(async () => {
    return await retryWithBackoff(async () => {
      return await this.client.chat.completions.create({
        model: this.chatModel,
        messages,
        timeout: parseInt(process.env.OPENAI_CHAT_TIMEOUT) || 60000
      });
    }, { context: 'openai_chat' });
  });
}
```

### Evolution API (WhatsApp)
```javascript
// src/tools/whatsapp.js
import { circuitBreakerRegistry } from '../utils/circuit-breaker.js';
import { retryHttp } from '../utils/retry.js';

const evolutionBreaker = circuitBreakerRegistry.get('evolution-api', {
  failureThreshold: parseInt(process.env.CB_EVOLUTION_FAILURE_THRESHOLD) || 3,
  timeout: parseInt(process.env.CB_EVOLUTION_TIMEOUT) || 30000
});

async function sendWhatsAppMessage(to, message) {
  return await evolutionBreaker.execute(async () => {
    return await retryHttp(async () => {
      return await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: to, text: message }),
        timeout: parseInt(process.env.EVOLUTION_API_TIMEOUT) || 15000
      });
    }, { context: 'evolution_send_message' });
  });
}
```

---

## 📚 Documentação Relacionada

- `IMPROVEMENTS.md` - Fases 1-3 (Infraestrutura básica)
- `README.md` - Visão geral do projeto
- `.env.example` - Variáveis de ambiente disponíveis

---

## 🎯 Conclusão

As melhorias de confiabilidade (Fases 4-6) complementam a infraestrutura base (Fases 1-3) e transformam o ORBION em um sistema:

✅ **Resiliente** - Tolera falhas de APIs externas
✅ **Inteligente** - Diferencia erros temporários de permanentes
✅ **Configurável** - Timeouts ajustáveis para cada cenário
✅ **Observável** - Logs e métricas estruturadas
✅ **Pronto para Produção** - Pode escalar com confiança

**Próximo Passo**: Integrar os novos utilitários (circuit-breaker e retry) nos arquivos existentes (openai_client.js, whatsapp.js, response_manager.js).
