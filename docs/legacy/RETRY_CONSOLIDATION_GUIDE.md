# 🔄 Guia de Consolidação de Retry Logic

## 🎯 Objetivo

Consolidar 4 sistemas diferentes de retry em um sistema unificado usando `retry.js` + `retry.config.js`.

## 📊 Status Atual

### Sistemas de Retry Existentes

| Sistema | Localização | Configuração | Status |
|---------|-------------|--------------|--------|
| **1. retry.js** | `src/utils/retry.js` | Genérico | ✅ PADRÃO |
| **2. circuit-breaker.js** | `src/utils/circuit-breaker.js` | Circuit breaking | ⚠️ Especializado |
| **3. Coordinator inline** | `UnifiedMessageCoordinator._sendWithRetry()` | 3x, exponential | 🔄 MIGRAR |
| **4. Persistence inline** | `persistence_manager.saveIndividual()` | 3x, linear | 🔄 MIGRAR |

## 🚀 Plano de Consolidação

### FASE 1: Configuração Centralizada ✅

- [x] Criado `src/config/retry.config.js`
- [x] Definidas configurações para cada tipo de operação
- [x] Funções helper (calculateDelay, isRetryableError)

### FASE 2: Migrar UnifiedMessageCoordinator

**Arquivo:** `src/handlers/UnifiedMessageCoordinator.js`

**ANTES (linhas ~450-490):**
```javascript
async _sendWithRetry(from, text, options, attempt = 1) {
  const MAX_ATTEMPTS = this.config.MAX_RETRIES || 3;

  try {
    // ... send logic ...
    return result;
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return this._sendWithRetry(from, text, options, attempt + 1);
    }
    throw error;
  }
}
```

**DEPOIS:**
```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';

async _sendWithRetry(from, text, options) {
  const config = getRetryConfig('whatsapp');

  return retry(
    async () => {
      const { sendWhatsAppMessage } = await import('../tools/whatsapp.js');
      return await sendWhatsAppMessage(from, text, options);
    },
    config
  );
}
```

**Benefícios:**
- ✅ Configuração centralizada
- ✅ Jitter automático no backoff
- ✅ Timeout por tentativa
- ✅ Melhor tratamento de erros

---

### FASE 3: Migrar PersistenceManager

**Arquivo:** `src/handlers/persistence_manager.js`

**ANTES (linhas ~60-90):**
```javascript
async saveIndividual(from, message, isFromBot, messageType, retries = 3) {
  try {
    // ... save logic ...
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.saveIndividual(from, message, isFromBot, messageType, retries - 1);
    }
    throw error;
  }
}
```

**DEPOIS:**
```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';

async saveIndividual(from, message, isFromBot, messageType) {
  const config = getRetryConfig('database');

  return retry(
    () => this._doSave(from, message, isFromBot, messageType),
    config
  );
}

_doSave(from, message, isFromBot, messageType) {
  // Original save logic here (sem retry)
}
```

---

### FASE 4: Manter Circuit Breaker para Casos Especiais

**Quando Usar:**
- APIs externas com histórico de instabilidade
- Operações que precisam de "fast fail"
- Sistemas que beneficiam de circuit opening

**Quando NÃO Usar:**
- Operações internas (database, file system)
- Retry simples é suficiente

O circuit-breaker.js **MANTÉM-SE ATIVO** para casos específicos.

---

## 📖 Exemplos de Uso

### Exemplo 1: WhatsApp Message

```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';

async function sendMessage(to, text) {
  const config = getRetryConfig('whatsapp');

  return retry(
    async () => {
      const { sendWhatsAppMessage } = await import('../tools/whatsapp.js');
      return await sendWhatsAppMessage(to, text);
    },
    config
  );
}
```

### Exemplo 2: Database Operation

```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';

async function saveToDatabase(data) {
  const config = getRetryConfig('database');

  return retry(
    () => db.prepare('INSERT ...').run(data),
    config
  );
}
```

### Exemplo 3: OpenAI API

```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';

async function getChatCompletion(messages) {
  const config = getRetryConfig('openai');

  return retry(
    () => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages
    }),
    config
  );
}
```

### Exemplo 4: Custom Config

```javascript
import { retry } from '../utils/retry.js';

async function customOperation() {
  const customConfig = {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoff: 'linear',
    timeout: 15000,
    retryableErrors: ['MY_CUSTOM_ERROR']
  };

  return retry(
    () => myOperation(),
    customConfig
  );
}
```

---

## 🔧 Implementação de retry.js

**Localização:** `src/utils/retry.js`

```javascript
import { calculateDelay, isRetryableError } from '../config/retry.config.js';

export async function retry(fn, config) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 5000,
    backoff = 'exponential',
    timeout = 10000,
    retryableErrors = []
  } = config;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Execute com timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeout)
        )
      ]);

      return result; // Sucesso!

    } catch (error) {
      lastError = error;

      // Última tentativa?
      if (attempt === maxAttempts) {
        throw error;
      }

      // Erro não é retryable?
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }

      // Calcular delay e aguardar
      const delay = calculateDelay(attempt, backoff, initialDelay, maxDelay);
      console.log(`Retry ${attempt}/${maxAttempts} após ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

---

## 📋 Checklist de Migração

### UnifiedMessageCoordinator
- [ ] Adicionar imports (retry.js, retry.config.js)
- [ ] Substituir _sendWithRetry
- [ ] Remover lógica inline de retry
- [ ] Testar envio de mensagens
- [ ] Verificar logs de retry

### PersistenceManager
- [ ] Adicionar imports
- [ ] Refatorar saveIndividual
- [ ] Extrair _doSave (sem retry)
- [ ] Testar salvamento com retry
- [ ] Verificar performance

### Outros Arquivos
- [ ] Buscar `for.*attempt` em todo código
- [ ] Buscar `retries.*>.*0`
- [ ] Buscar `setTimeout.*retry`
- [ ] Substituir por retry.js

---

## ⏱️ Estimativa de Tempo

- **UnifiedMessageCoordinator:** 1 hora
- **PersistenceManager:** 1 hora
- **Busca e substituição:** 2 horas
- **Testes:** 2 horas

**Total:** ~6 horas

---

## 🎯 Benefícios

### Antes (4 sistemas)
- ❌ Configurações inconsistentes (3x vs 5x vs infinito)
- ❌ Backoff diferente (exponential vs linear)
- ❌ Sem timeout por tentativa
- ❌ Sem jitter (pode causar thundering herd)
- ❌ Difícil de manter

### Depois (1 sistema)
- ✅ Configuração centralizada
- ✅ Backoff consistente com jitter
- ✅ Timeout configurável
- ✅ Erros retryable bem definidos
- ✅ Fácil de testar e manter
- ✅ Logs padronizados

---

## 📊 Configurações Recomendadas

| Operação | Attempts | Initial Delay | Backoff | Razão |
|----------|----------|---------------|---------|-------|
| **WhatsApp** | 3 | 1s | Exponential | API externa, crítico |
| **Database** | 5 | 500ms | Linear | WAL mode, rápido |
| **OpenAI** | 2 | 2s | Exponential | Rate limits, caro |
| **Sheets** | 2 | 3s | Exponential | Não crítico, async |
| **Audio** | 2 | 2s | Exponential | Pode ser lento |

---

## 🚀 Quick Start

Para migrar um arquivo:

1. Adicionar imports:
```javascript
import { retry } from '../utils/retry.js';
import { getRetryConfig } from '../config/retry.config.js';
```

2. Substituir retry inline:
```javascript
// ANTES
async function sendMessage(to, text, attempt = 1) {
  try {
    return await send(to, text);
  } catch (error) {
    if (attempt < 3) {
      await sleep(1000 * attempt);
      return sendMessage(to, text, attempt + 1);
    }
    throw error;
  }
}

// DEPOIS
async function sendMessage(to, text) {
  const config = getRetryConfig('whatsapp');
  return retry(() => send(to, text), config);
}
```

3. Testar!

---

**Última Atualização:** 2025-11-13
**Status:** Configuração criada, migração pendente
**Próximo Passo:** Migrar UnifiedMessageCoordinator
