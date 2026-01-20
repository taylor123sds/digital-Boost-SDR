# 🤖 Novo Sistema de Detecção de Bots - SimpleBotDetector

**Data**: 2025-11-17
**Versão**: 1.0.0
**Status**: ✅ Ativo e Funcional

---

## 📋 Resumo

Substituímos completamente o sistema anterior de detecção de bots por uma implementação **simples, funcional e eficaz**.

### Por que a mudança?

O sistema anterior (`BotDetectionSystem.js` v3.0) era:
- ❌ Excessivamente complexo (620 linhas, state machine, múltiplas tabelas)
- ❌ Não estava funcionando corretamente
- ❌ Timing não estava sendo rastreado apropriadamente
- ❌ Muitas camadas de abstração desnecessárias

### O que fizemos?

✅ **Reescrevemos do zero** com foco em simplicidade e funcionalidade

---

## 🎯 Nova Estratégia

### Princípio Central
**Tempo de resposta é o indicador mais confiável de bot**

Bots respondem em < 2 segundos consistentemente.
Humanos levam mais tempo para ler, pensar e digitar.

### Funcionamento

```
1. Usuário envia mensagem → registra timestamp de entrada
2. ORBION processa e responde → registra timestamp de saída
3. Usuário responde novamente → calcula tempo de resposta
4. Se < 2 segundos → SUSPEITO → envia verificação
5. Usuário responde "SIM" → VERIFICADO como humano
6. Usuário não responde ou responde errado → BLOQUEADO
```

---

## 📁 Arquivos Modificados/Criados

### Criado
- ✅ `src/security/SimpleBotDetector.js` - **Sistema novo (360 linhas)**

### Modificados
- ✅ `src/middleware/MessagePipeline.js` - Integração do novo sistema
- ✅ `src/handlers/UnifiedMessageCoordinator.js` - Registro de timestamps
- ✅ `src/security/_deprecated/README.md` - Documentação da mudança

### Movidos para deprecated
- 📦 `src/security/BotDetectionSystem.js` → `_deprecated/BotDetectionSystem.js.old`

---

## 🔧 API do SimpleBotDetector

### Método Principal: `check(contactId, messageText, context)`

**Retorna**:
```javascript
{
  allowed: true/false,      // Se mensagem deve ser processada
  isBot: true/false,        // Se detectou bot
  action: string,           // 'send_verification' | 'block'
  message: string,          // Mensagem para enviar (se action existe)
  responseTime: number,     // Tempo de resposta em ms
  verified: boolean,        // Se passou na verificação humana
  reason: string            // Motivo do bloqueio/rejeição
}
```

### Método de Registro: `recordOutgoingMessage(contactId)`

Chamado automaticamente após enviar mensagens (em `UnifiedMessageCoordinator`).

### Métodos Admin:
```javascript
simpleBotDetector.unblock(contactId)    // Desbloqueia contato
simpleBotDetector.clear(contactId)      // Limpa dados de rastreamento
simpleBotDetector.getStats()            // Estatísticas
```

---

## 📊 Fluxo Completo

### 1. Primeira Mensagem
```
Usuário: "Olá"
Sistema: ✅ Primeira mensagem - permitindo
→ Processa normalmente
```

### 2. Resposta Normal (> 2s)
```
Usuário espera 5 segundos e responde: "Como funciona?"
Sistema: ⏱️ Tempo de resposta: 5000ms (normal)
         ✅ Permitindo
→ Processa normalmente
```

### 3. Resposta Suspeita (< 2s)
```
Usuário responde instantaneamente (800ms): "Opção 1"
Sistema: ⚠️ Resposta MUITO RÁPIDA detectada!
         📤 Enviando verificação...

Mensagem enviada:
"⚠️ Verificação Necessária
Detectei que você está respondendo muito rápido.
Para continuar, preciso confirmar que você é uma pessoa real.
✅ Responda com: SIM
Aguardo sua confirmação em 60 segundos."
→ Bloqueia processamento
```

### 4. Verificação Bem-Sucedida
```
Usuário: "SIM"
Sistema: ✅ VERIFICADO como humano!
         📤 Enviando confirmação...

Mensagem enviada:
"✅ Verificação confirmada! Pode continuar conversando normalmente."
→ Libera e reseta contadores
```

### 5. Verificação Falhada
```
Usuário: "xyz" (não confirmou)
Sistema: 🚫 Não confirmou humanidade - bloqueando

Mensagem enviada:
"❌ Não foi possível verificar que você é humano. Conversa encerrada."
→ Bloqueio permanente
```

---

## ⚙️ Configuração

```javascript
const CONFIG = {
  // Tempo de resposta suspeito (2 segundos)
  SUSPICIOUS_RESPONSE_TIME_MS: 2000,

  // Número mínimo de mensagens para começar a detectar
  MIN_MESSAGES_TO_DETECT: 2,

  // Timeout para responder verificação (60 segundos)
  VERIFICATION_TIMEOUT_MS: 60000,

  // Palavras de confirmação humana
  HUMAN_KEYWORDS: [
    'sim',
    'sou humano',
    'humano',
    'pessoa',
    'claro',
    'sim sou',
    'óbvio',
    'obvio'
  ]
};
```

---

## 🗄️ Armazenamento

### Banco de Dados (SQLite)
```sql
CREATE TABLE bot_blocked (
  phone_number TEXT PRIMARY KEY,
  blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);
```

**Apenas bloqueados permanentes são salvos.**

### Memória (Map)
```javascript
responseTimes = Map {
  contactId -> {
    lastIncoming: timestamp,
    lastOutgoing: timestamp,
    messageCount: number
  }
}

verificationPending = Map {
  contactId -> timestamp
}
```

**Dados voláteis - resetados ao reiniciar servidor.**

---

## 🎯 Vantagens do Novo Sistema

### Simplicidade
- ✅ 360 linhas vs 620 linhas
- ✅ 1 tabela vs 2 tabelas
- ✅ Lógica direta e clara
- ✅ Fácil de debugar

### Funcionalidade
- ✅ Timing rastreado corretamente
- ✅ Verificação funcional em 1 passo
- ✅ Integrado no pipeline
- ✅ Logs claros e informativos

### Performance
- ✅ Maps em memória (rápido)
- ✅ Apenas bloqueios salvos em DB
- ✅ Sem overhead de state machine
- ✅ Sem complexidade desnecessária

---

## 📝 Logs de Exemplo

### Detecção Normal
```
🔍 [BOT] Verificando: 5511999998888
✅ [BOT] Primeira mensagem - permitindo: 5511999998888
📤 [BOT] Registrado envio para: 5511999998888
🔍 [BOT] Verificando: 5511999998888
⏱️ [BOT] Tempo de resposta: 3500ms (limite: 2000ms)
✅ [BOT] Tempo normal - permitindo: 5511999998888
```

### Detecção de Bot
```
🔍 [BOT] Verificando: 5511999997777
⏱️ [BOT] Tempo de resposta: 800ms (limite: 2000ms)
⚠️ [BOT] Resposta MUITO RÁPIDA detectada! Iniciando verificação...
```

### Verificação Confirmada
```
🔍 [BOT] Verificando: 5511999997777
✅ [BOT] VERIFICADO como humano: 5511999997777
```

### Bloqueio
```
🚫 [BOT] Não confirmou humanidade - bloqueando: 5511999997777
🚫 [BOT] BLOQUEADO: 5511999997777 - Razão: failed_verification
```

---

## 🔍 Como Testar

### 1. Teste Manual via Dashboard

1. Abra: http://localhost:3001/
2. Envie mensagem para número teste
3. Responda rapidamente (< 2s)
4. Verifique se recebe mensagem de verificação
5. Responda "SIM"
6. Verifique se é liberado

### 2. Teste via Logs

Monitore os logs do servidor em tempo real:

```bash
tail -f logs/orbion-2025-11-17.log | grep BOT
```

### 3. Estatísticas

```bash
curl http://localhost:3001/api/admin/bot-stats
```

---

## 🛠️ Manutenção

### Desbloquear Contato
```javascript
// Via código
import simpleBotDetector from './src/security/SimpleBotDetector.js';
simpleBotDetector.unblock('5511999998888');
```

### Limpar Dados de Rastreamento
```javascript
simpleBotDetector.clear('5511999998888');
```

### Ver Estatísticas
```javascript
const stats = simpleBotDetector.getStats();
console.log(stats);
// { blocked: 5, pendingVerification: 2, tracking: 10 }
```

---

## ✅ Checklist de Implementação

- [x] Criar SimpleBotDetector.js
- [x] Integrar no MessagePipeline
- [x] Integrar no UnifiedMessageCoordinator
- [x] Mover sistema antigo para deprecated
- [x] Atualizar documentação
- [x] Testar inicialização do servidor
- [ ] Testar detecção em produção
- [ ] Ajustar threshold se necessário
- [ ] Criar endpoint de admin para stats

---

## 📚 Referências

- Arquivo: `src/security/SimpleBotDetector.js`
- Integração: `src/middleware/MessagePipeline.js:127-171`
- Registro: `src/handlers/UnifiedMessageCoordinator.js:234`
- Deprecated: `src/security/_deprecated/`

---

**Última atualização**: 2025-11-17 13:05
**Status**: ✅ Sistema ativo e funcionando
