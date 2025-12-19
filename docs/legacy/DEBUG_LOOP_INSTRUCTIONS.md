# 🔍 INSTRUÇÕES DE DEBUG PARA LOOP INFINITO

**Data**: 22 de Outubro de 2025
**Status**: ⚠️ Loop persistindo - Debug logs adicionados

---

## 🎯 O QUE FAZER AGORA

Adicionei **logs de debug extensivos** no código para identificar onde exatamente o `stageAttempts` está sendo perdido.

### PASSO 1: REINICIAR O SERVIDOR

**CRÍTICO**: As mudanças no código SÓ vão funcionar depois de reiniciar o servidor!

```bash
# Parar servidor atual (Ctrl+C ou kill process)
# Depois iniciar novamente:
cd /Users/taylorlpticloud.com/Desktop/agent-js-starter
npm start
```

### PASSO 2: TESTAR CONVERSA COM LOGS

Envie esta sequência de mensagens via WhatsApp e **copie TODOS os logs do console**:

**Mensagem 1**: "oi" (primeira mensagem)
**Mensagem 2**: "não sei"
**Mensagem 3**: "não sei"
**Mensagem 4**: "não sei"

### PASSO 3: PROCURAR ESTAS LINHAS NOS LOGS

Os logs de debug vão mostrar:

```
🔍 ========== DEBUG ENHANCED STATE ==========
📋 Top-level keys: [...]
🎯 stageAttempts (top-level): {"need":1,"budget":0,...}  ← DEVE TER VALORES!
💼 bant object: {...}
🔢 state.current: need
==========================================

🔍 [CRITICAL-BEFORE-RESTORE] enhancedState.stageAttempts: {"need":1,...}
🔍 [CRITICAL-BEFORE-RESTORE] Type: object
🔍 [CRITICAL-BEFORE-RESTORE] Is null? false  ← DEVE SER FALSE!
🔍 [CRITICAL-BEFORE-RESTORE] Is undefined? false  ← DEVE SER FALSE!

🔄 [BANT] Estado restaurado: need | Tentativas: {"need":1,"budget":0,...}
```

---

## 📊 O QUE OS LOGS VÃO REVELAR

### CENÁRIO A: stageAttempts é `null` ou `undefined`

Se você ver:
```
🔍 [CRITICAL-BEFORE-RESTORE] Is null? true
```

**Significa**: O banco NÃO está salvando `stageAttempts` corretamente, OU `getEnhancedState()` não está retornando.

**Ação**: Verifique se `saveEnhancedState()` foi chamado corretamente na mensagem anterior. Procure por:
```
💾 [ESTADO] Salvo: need | Score: 0% | Tentativas: {"need":1,...}
```

---

### CENÁRIO B: stageAttempts tem valores mas contador não incrementa

Se você ver:
```
🔄 [BANT] Estado restaurado: need | Tentativas: {"need":1,...}
```
Mas na próxima mensagem aparece:
```
🔄 [BANT] Estado restaurado: need | Tentativas: {"need":1,...}  ← AINDA É 1!
```

**Significa**: O incremento está acontecendo mas NÃO está sendo salvo no banco.

**Ação**: Verifique se há algum erro no `saveEnhancedState()` - procure por erros de SQL ou database.

---

### CENÁRIO C: stageAttempts incrementa mas stage não avança

Se você ver:
```
🔄 [BANT] Estado restaurado: need | Tentativas: {"need":3,...}
```
Mas ainda permanece em `stage: need`:

**Significa**: A função `determineCurrentStage()` não está respeitando o contador, OU `collectedInfo.need` ainda está `null`.

**Ação**: Verifique se esta linha apareceu:
```
✅ [FALLBACK] Aceitando need="PARCIAL: Cliente não forneceu" após 3 tentativa(s)
```

---

## 🚨 POSSÍVEIS CAUSAS RAIZ

### Causa #1: Servidor não foi reiniciado
**Sintoma**: Logs antigos ainda aparecem, novos logs de debug não aparecem
**Solução**: Parar processo Node.js completamente e iniciar novamente

### Causa #2: Múltiplos servidores rodando
**Sintoma**: Logs aparecem duplicados ou inconsistentes
**Solução**:
```bash
# Matar TODOS os processos Node
pkill -f node
# Iniciar apenas um servidor
npm start
```

### Causa #3: Banco de dados não está sendo escrito
**Sintoma**: Logs mostram salvamento mas `stageAttempts` volta a 0
**Solução**: Verificar permissões do arquivo `orbion.db`
```bash
ls -la orbion.db
# Deve mostrar permissões de escrita (rw)
```

### Causa #4: Cache do Evolution API
**Sintoma**: Mensagens antigas sendo reprocessadas
**Solução**: Limpar cache do Evolution API ou reiniciar container Docker

### Causa #5: Erro silencioso no saveEnhancedState
**Sintoma**: Nenhum log de salvamento aparece
**Solução**: Verificar se há try-catch engolindo erros

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Antes de reportar os logs, verifique:

- [ ] ✅ Servidor foi reiniciado COMPLETAMENTE (não só refresh)
- [ ] ✅ Apenas UM processo Node.js está rodando (`ps aux | grep node`)
- [ ] ✅ Arquivo `orbion.db` existe e tem permissões de escrita
- [ ] ✅ Evolution API está rodando e enviando webhooks
- [ ] ✅ Webhook está chegando no endpoint correto (`/api/webhook/evolution`)
- [ ] ✅ Não há erros de sintaxe JavaScript no console

---

## 📤 O QUE ENVIAR DE VOLTA

Por favor, envie:

1. **TODOS os logs do console** desde o início da conversa até o loop acontecer
2. **Screenshot** da conversa no WhatsApp mostrando as mensagens
3. **Responda estas perguntas**:
   - O servidor foi reiniciado? (Sim/Não)
   - Quantos processos Node estão rodando? (`ps aux | grep node`)
   - Qual é o último log que aparece antes do loop?
   - Você vê os logs de DEBUG (`🔍 ========== DEBUG...`)?

---

## 🔬 LOGS ESPECÍFICOS PARA PROCURAR

### LOG CRÍTICO #1: Estado sendo carregado
Procure por:
```
🔍 ========== DEBUG ENHANCED STATE ==========
```

Se NÃO aparecer: O `enhancedState` é null na segunda mensagem.

### LOG CRÍTICO #2: Restauração de tentativas
Procure por:
```
🔍 [CRITICAL-BEFORE-RESTORE] enhancedState.stageAttempts:
```

Se mostrar `null` ou `undefined`: O problema está no `getEnhancedState()` ou `saveEnhancedState()`.

### LOG CRÍTICO #3: Salvamento de estado
Procure por:
```
💾 [ESTADO] Salvo: need | Score: 0% | Tentativas: {"need":1,...}
```

Se NÃO aparecer: O `saveEnhancedState()` não está sendo chamado.

### LOG CRÍTICO #4: Fallback sendo ativado
Procure por:
```
✅ [FALLBACK] Aceitando need="PARCIAL: Cliente não forneceu"
```

Se NÃO aparecer após 3 tentativas: O contador não está incrementando corretamente.

---

## 💡 TESTE ALTERNATIVO: Verificar Banco Diretamente

Se quiser verificar se o banco está sendo escrito:

```bash
cd /Users/taylorlpticloud.com/Desktop/agent-js-starter

# Abrir banco SQLite
sqlite3 orbion.db

# Ver estados salvos
SELECT phone_number, agent_state_data FROM enhanced_state ORDER BY updated_at DESC LIMIT 5;

# Procurar por stageAttempts no JSON
.mode json
SELECT phone_number, json_extract(agent_state_data, '$.stageAttempts') as attempts
FROM enhanced_state
WHERE phone_number LIKE '%5584%'  -- Seu número de teste
ORDER BY updated_at DESC
LIMIT 1;

# Sair
.exit
```

Se `attempts` for `null` no banco: O problema está no `saveEnhancedState()`.
Se `attempts` tiver valores: O problema está no `getEnhancedState()`.

---

## 🎯 PRÓXIMOS PASSOS

Depois que você me enviar os logs, vou:

1. Identificar em qual CENÁRIO (A, B ou C) você está
2. Implementar fix específico para esse cenário
3. Adicionar testes automatizados para evitar regressão

**IMPORTANTE**: Não faça mais mudanças no código até me enviar os logs! Cada mudança pode mascarar o problema real.

---

**Aguardando seus logs!** 🔍
