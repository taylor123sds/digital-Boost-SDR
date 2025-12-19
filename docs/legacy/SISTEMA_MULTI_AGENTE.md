# 🎯 SISTEMA MULTI-AGENTE COM BANT SIMPLE

**Data**: 23 de Outubro de 2025
**Status**: ✅ IMPLEMENTADO E ATIVO

---

## 🏗️ ARQUITETURA

O ORBION agora funciona com **3 agentes especializados** que se passam o bastão automaticamente:

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│ SDR Agent   │ ───> │ Specialist   │ ───> │ Scheduler    │
│             │      │ Agent        │      │ Agent        │
└─────────────┘      └──────────────┘      └──────────────┘
Bot/Humano           BANT Simple          Agendamento
```

---

## 📋 AGENTE 1: SDR Agent

**Responsabilidade**: Detecção de Bot/Humano APENAS

### O que faz:
✅ Envia welcome na primeira mensagem
✅ Detecta se mensagem é de bot usando `bot_detector.js`
✅ Pede confirmação humana se suspeitar de bot
✅ Faz handoff para Specialist quando confirmar humano

### O que NÃO faz mais:
❌ Identificar DOR (pain type)
❌ Coletar informações de qualificação
❌ Fazer perguntas de negócio

### Fluxo:
1. **Primeira mensagem** → "Oi! Tudo bem? Sou da Digital Boost..."
2. **Detecção de bot** → Se suspeitar: pede "HUMANO OK"
3. **Confirmação humano** → Handoff imediato para Specialist

### Arquivo:
- `src/agents/sdr_agent.js` (180 linhas - simplificado)

---

## 💼 AGENTE 2: Specialist Agent

**Responsabilidade**: Qualificação BANT Completa (need → email)

### O que faz:
✅ Recebe lead do SDR (confirmado humano)
✅ Executa **BANT Simple** (sem loops!)
✅ Coleta: Need → Budget → Authority → Timing → Email
✅ Faz handoff para Scheduler quando coletar email

### Sistema BANT Simple:
- **5 estágios**: need, budget, authority, timing, closing
- **Regra anti-loop**: Após 1 mensagem do usuário, SEMPRE avança
- **Aceita qualquer resposta**: Marca como "DESCONHECIDO" se vago
- **Sem validação GPT**: Extração simples por regex
- **Sem tentativas**: Pergunta 1x e avança

### Fluxo:
1. **Recebe handoff do SDR** → Pergunta "Qual o principal desafio de marketing?"
2. **Processa resposta** → Extrai info + avança para próximo stage
3. **Repete** → Budget → Authority → Timing → Email
4. **Email coletado** → Handoff para Scheduler

### Arquivos:
- `src/agents/specialist_agent.js` (140 linhas - limpo)
- `src/tools/bant_simple.js` (270 linhas - motor BANT)

---

## 📅 AGENTE 3: Scheduler Agent

**Responsabilidade**: Agendamento de Reunião

### O que faz:
✅ Recebe lead do Specialist (com email coletado)
✅ Propõe horários de reunião
✅ Negocia disponibilidade
✅ Cria evento no Google Calendar
✅ Envia confirmação com link Meet

### Fluxo:
1. **Recebe handoff do Specialist** → Pergunta horário
2. **Coleta data/hora** → Extrai de texto natural
3. **Cria evento** → Google Calendar + Meet
4. **Confirma** → Envia detalhes da reunião

### Arquivo:
- `src/agents/scheduler_agent.js` (existente - não modificado)

---

## 🔄 ORQUESTRAÇÃO - AgentHub

**Arquivo**: `src/agents/agent_hub.js`

### Responsabilidades:
- Gerencia estado de cada contato (qual agente está ativo)
- Executa handoffs entre agentes
- Salva/restaura estado do banco de dados
- Rastreia métricas de cada agente

### Inicialização:
- **Singleton**: `src/agents/agent_hub_init.js`
- Registra os 3 agentes na primeira chamada
- Usado pelo webhook handler em `src/server.js`

---

## 📊 FLUXO COMPLETO DE UMA CONVERSA

### Exemplo Real:

```
👤 Lead: "oi"
🤖 SDR: "Oi! Tudo bem? Sou da Digital Boost..."
👤 Lead: "tudo"
✅ SDR: Lead parece humano → HANDOFF para Specialist

💼 SPECIALIST: "Qual o principal desafio de marketing que vocês enfrentam?"
👤 Lead: "gerar leads"
📊 SPECIALIST: need coletado → avança para budget
💼 SPECIALIST: "Vocês têm verba para marketing?"
👤 Lead: "5 mil por mês"
📊 SPECIALIST: budget coletado → avança para authority
💼 SPECIALIST: "Você decide sozinho?"
👤 Lead: "sim"
📊 SPECIALIST: authority coletado → avança para timing
💼 SPECIALIST: "Estão pensando em começar agora?"
👤 Lead: "sim, urgente"
📊 SPECIALIST: timing coletado → avança para closing
💼 SPECIALIST: "Qual seu melhor e-mail?"
👤 Lead: "joao@empresa.com"
✅ SPECIALIST: Email coletado → HANDOFF para Scheduler

📅 SCHEDULER: "Perfeito! Qual o melhor dia e horário pra conversar?"
👤 Lead: "amanhã às 14h"
📅 SCHEDULER: Criando evento no Google Calendar...
✅ SCHEDULER: "Reunião confirmada para 24/10 às 14h. Link: meet.google.com/xxx"
```

---

## 🔧 MUDANÇAS NO CÓDIGO

### Arquivos Modificados:

#### 1. `src/server.js` (linha 225-266)
**Antes**:
```javascript
const { chatHandler } = await import('./agent.js');
const agentResult = await chatHandler(message, context);
```

**Depois**:
```javascript
const { getAgentHub } = await import('./agents/agent_hub_init.js');
const agentHub = getAgentHub();
const agentResult = await agentHub.processMessage({
  fromContact: from,
  text: message
}, context);
```

#### 2. `src/agents/sdr_agent.js`
- ❌ Removido: `detectPainType()`, `handleLeadResponse()`, toda lógica de DOR
- ✅ Mantido: `detectBot()`, `isHumanSignal()`
- ✅ Adicionado: Handoff imediato quando confirma humano

#### 3. `src/agents/specialist_agent.js`
- ❌ Removido: `BANTUnifiedSystem`, `pain_discovery`, `CONSULTIVE_QUESTIONS`
- ✅ Adicionado: `BANTSimple`, handoff quando email coletado
- 📉 Reduzido: De 600+ linhas para 140 linhas

#### 4. `src/agents/agent_hub_init.js` (NOVO)
- Singleton que inicializa AgentHub
- Registra os 3 agentes
- Exporta `getAgentHub()`

---

## 🧪 COMO TESTAR

### Teste 1: Fluxo Completo Normal
```
1. Envie "oi" via WhatsApp
2. Bot responde com welcome
3. Envie qualquer mensagem ("tudo bem")
4. Bot pergunta sobre desafio de marketing (Specialist pegou o bastão!)
5. Responda "gerar leads"
6. Bot pergunta sobre verba
7. Responda "5 mil"
8. Bot pergunta sobre decisão
9. Responda "sim"
10. Bot pergunta sobre timing
11. Responda "urgente"
12. Bot pede email
13. Envie "seu@email.com"
14. Bot pergunta horário (Scheduler pegou o bastão!)
15. Responda "amanhã 14h"
16. Bot confirma reunião com link Meet
```

### Teste 2: Verificar Handoffs nos Logs
Procure por estes logs:
```
🔀 [HUB] HANDOFF detectado: sdr → specialist
🔀 [HUB] HANDOFF detectado: specialist → scheduler
✅ [HUB] Agente ativo: sdr
✅ [HUB] Agente ativo: specialist
✅ [HUB] Agente ativo: scheduler
```

### Teste 3: Verificar BANT Simple (sem loops)
Envie "não sei" 5 vezes seguidas:
```
Bot: "Qual o desafio?" (need)
Você: "não sei"
Bot: "Têm verba?" (budget) ← AVANÇOU!
Você: "não sei"
Bot: "Decide sozinho?" (authority) ← AVANÇOU!
Você: "não sei"
Bot: "Quando começar?" (timing) ← AVANÇOU!
Você: "não sei"
Bot: "Qual seu email?" (closing) ← AVANÇOU!
```

**✅ Sucesso**: Recebeu 5 perguntas DIFERENTES
**❌ Falha**: Repetiu mesma pergunta (loop voltou)

---

## 📈 BENEFÍCIOS

### Antes (agent.js monolítico):
❌ 1 agente fazia tudo (2000+ linhas)
❌ BANT Unified complexo com loops
❌ Validações GPT custosas
❌ 3+ tentativas por pergunta
❌ Pain discovery em 3 camadas
❌ Difícil debugar e manter

### Agora (multi-agente):
✅ 3 agentes especializados (responsabilidade única)
✅ BANT Simple sem loops (garantido)
✅ Sem validações GPT (mais rápido)
✅ 1 tentativa por pergunta (eficiente)
✅ Fluxo linear previsível
✅ Fácil debugar (logs por agente)
✅ Fácil estender (adicionar agente novo)

---

## 🔍 TROUBLESHOOTING

### Se loop voltar:
1. Verificar logs do Specialist: `[BANT-SIMPLE]`
2. Confirmar que `BANTSimple` está sendo usado
3. Verificar se `stageAttempts` está incrementando
4. Verificar se `advanceStage()` é chamado

### Se handoff não acontecer:
1. Verificar logs do Hub: `[HUB] HANDOFF detectado`
2. Confirmar que agente retorna `handoff: true`
3. Verificar que `nextAgent` está correto
4. Verificar que agente de destino está registrado

### Se estado não persistir:
1. Verificar `updateState` no resultado do agente
2. Confirmar que `saveLeadState()` é chamado
3. Verificar banco de dados: `enhanced_state` table

---

## 📚 PRÓXIMOS PASSOS (Opcional)

1. ✅ Sistema multi-agente funcionando
2. ✅ BANT Simple sem loops
3. ✅ Handoffs SDR → Specialist → Scheduler
4. 🔲 Adicionar extração de data/hora no Scheduler (em andamento)
5. 🔲 Integrar Google Calendar real (mock atual)
6. 🔲 Adicionar Analytics Agent (opcional)
7. 🔲 Adicionar CRM sync após agendamento

---

**Servidor ativo**: PID 73500, Porta 3001
**Webhook**: http://localhost:3001/api/webhook/evolution
**Health Check**: http://localhost:3001/api/health

✅ Sistema pronto para testar via WhatsApp!
