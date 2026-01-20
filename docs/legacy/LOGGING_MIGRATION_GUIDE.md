# 📝 Guia de Migração de Logging

## 🎯 Objetivo

Padronizar logging em toda a aplicação, migrando de `console.log` para logger estruturado.

## 📊 Status Atual

- **Total de console.log:** 1.562 ocorrências
- **Arquivos com logger estruturado:** 17
- **Cobertura:** ~1%

## 🚀 Como Migrar

### 1. Import do Logger

```javascript
// ANTES
// Nenhum import

// DEPOIS
import log from '../utils/logger-wrapper.js';
```

### 2. Substituir console.log

```javascript
// ANTES
console.log('Processando mensagem');
console.log(`✅ Sucesso para ${contactId}`);

// DEPOIS
log.info('Processando mensagem');
log.success(`Sucesso para ${contactId}`);
```

### 3. Substituir console.error

```javascript
// ANTES
console.error('❌ Erro:', error);
console.error('Falha ao processar:', error.message);

// DEPOIS
log.error('Erro ao processar', error);
log.error('Falha ao processar', error, { contactId, step: 'processing' });
```

### 4. Adicionar Contexto

```javascript
// ANTES
console.log('Mensagem recebida de', from);

// DEPOIS
log.info('Mensagem recebida', {
  from,
  messageType: type,
  timestamp: Date.now()
});
```

## 📋 Prioridade de Migração

### FASE 1 - Crítico (Handlers)
- [ ] `src/handlers/UnifiedMessageCoordinator.js`
- [ ] `src/handlers/webhook_handler.js`
- [ ] `src/handlers/persistence_manager.js`
- [ ] `src/handlers/audio_processor.js`

### FASE 2 - Alto (Agents)
- [ ] `src/agents/agent_hub.js`
- [ ] `src/agents/sdr_agent.js`
- [ ] `src/agents/specialist_agent.js`
- [ ] `src/agents/scheduler_agent.js`

### FASE 3 - Médio (Tools principais)
- [ ] `src/tools/whatsapp.js`
- [ ] `src/tools/strategic_qualification.js`
- [ ] `src/tools/meeting_scheduler.js`
- [ ] `src/tools/conversation_manager.js`

### FASE 4 - Baixo (Demais tools e utils)
- [ ] Todos os outros arquivos em tools/
- [ ] Arquivos em utils/

## 🔧 Comandos Úteis

### Contar console.log em um arquivo
```bash
grep -c "console\." src/handlers/UnifiedMessageCoordinator.js
```

### Listar todos os console.log
```bash
grep -n "console\." src/handlers/UnifiedMessageCoordinator.js
```

### Substituir automaticamente (com cuidado!)
```bash
# Backup primeiro!
cp arquivo.js arquivo.js.backup

# Substituições simples
sed -i '' 's/console\.log(/log.info(/g' arquivo.js
sed -i '' 's/console\.error(/log.error(/g' arquivo.js
sed -i '' 's/console\.warn(/log.warn(/g' arquivo.js
```

**⚠️ ATENÇÃO:** Revisar manualmente após substituições automáticas!

## 📖 Exemplos Completos

### Exemplo 1: Handler Simples

**ANTES:**
```javascript
export function processMessage(message) {
  console.log('Processando mensagem:', message.text);

  try {
    const result = doSomething(message);
    console.log('✅ Processamento completo');
    return result;
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    throw error;
  }
}
```

**DEPOIS:**
```javascript
import log from '../utils/logger-wrapper.js';

export function processMessage(message) {
  log.info('Processando mensagem', {
    text: message.text.substring(0, 50),
    from: message.from
  });

  try {
    const result = doSomething(message);
    log.success('Processamento completo', { messageId: message.id });
    return result;
  } catch (error) {
    log.error('Erro ao processar mensagem', error, {
      messageId: message.id,
      from: message.from
    });
    throw error;
  }
}
```

### Exemplo 2: Coordinator com Métricas

**ANTES:**
```javascript
console.log(`[COORDINATOR] Mensagem ${messageId} processada em ${duration}ms`);
```

**DEPOIS:**
```javascript
log.info('Mensagem processada', {
  messageId,
  duration: `${duration}ms`,
  contactId,
  success: true
});
```

### Exemplo 3: Webhook Handler

**ANTES:**
```javascript
console.log(`🎯 [WEBHOOK] #${webhookId} recebido`);
console.log(`📱 [WEBHOOK] Processando ${messageType} de ${from}`);
```

**DEPOIS:**
```javascript
log.start('Webhook recebido', {
  webhookId,
  event: webhookData.event
});

log.info('Processando mensagem', {
  messageType,
  from,
  webhookId
});
```

## 🎨 Convenções

### Prefixos de Emojis (manter por enquanto)
- 🎯 Eventos importantes
- ✅ Sucesso
- ❌ Erro
- ⚠️ Aviso
- 📱 WhatsApp
- 🎤 Áudio
- 📊 Estatísticas

Esses serão gradualmente substituídos por níveis de log estruturados.

### Níveis de Log
- `log.info()` - Informações gerais
- `log.success()` - Operações bem-sucedidas
- `log.error()` - Erros
- `log.warn()` - Avisos
- `log.debug()` - Debug (apenas dev)
- `log.start()` - Início de operação

## 📈 Progresso

Acompanhe o progresso da migração:

```bash
# Total de console.*
grep -r "console\." --include="*.js" --exclude-dir=node_modules src/ | wc -l

# Total de log.*
grep -r "log\." --include="*.js" --exclude-dir=node_modules src/ | grep -v "console.log" | wc -l

# Percentual migrado
# (log.* / (log.* + console.*)) * 100
```

## ⏱️ Estimativa de Tempo

- **Handlers (4 arquivos):** ~4 horas
- **Agents (4 arquivos):** ~3 horas
- **Tools principais (4 arquivos):** ~2 horas
- **Restante:** ~8 horas

**Total:** ~17 horas para migração completa

## 🚀 Quick Start

Para começar migração de um arquivo:

```bash
# 1. Abrir arquivo
code src/handlers/UnifiedMessageCoordinator.js

# 2. Adicionar import no topo
# import log from '../utils/logger-wrapper.js';

# 3. Substituir primeiro console.log
# console.log(...) → log.info(...)

# 4. Testar
npm start

# 5. Continuar com próximos console.log
```

## 📞 Dúvidas?

- Consulte exemplos em: `src/utils/logger.enhanced.js`
- Veja logger-wrapper: `src/utils/logger-wrapper.js`
- Teste manualmente antes de commit

---

**Última Atualização:** 2025-11-13
**Status:** Wrapper criado, migração pendente
**Próximo Passo:** Migrar handlers/
