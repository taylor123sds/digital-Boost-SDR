# Arquitetura ORBION - 3 Agentes Funcionais

**Data:** 2025-10-21
**Status:** 🚀 Implementação Funcional
**Objetivo:** Sistema de 3 agentes que trabalham em sequência sem conflitos

---

## 🎯 Visão Geral

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  AGENTE 1   │  ───→ │  AGENTE 2   │  ───→ │  AGENTE 3   │
│  SDR AGENT  │       │ SPECIALIST  │       │  SCHEDULER  │
│             │       │   AGENT     │       │   AGENT     │
└─────────────┘       └─────────────┘       └─────────────┘
     │                      │                      │
     ├─ Bot Detection       ├─ Growth Marketing    ├─ Agendar reunião
     ├─ Primeira abordagem  ├─ Sites               ├─ Confirmar horário
     └─ Qualificar interesse├─ Audiovisual         └─ Google Calendar
                            └─ BANT Consultivo
```

---

## 🤖 AGENTE 1: SDR Agent (Prospecção)

### 📋 Função Principal:
**Primeiro contato com o lead + Detecção de bots + Identificação de dor**

### 🎯 Responsabilidades:

1. **Detectar se é bot ou humano**
   - Usar `bot_detector.js`
   - Analisar padrões de resposta
   - Verificar timing de mensagens
   - Se for bot → Bloquear ou pedir verificação

2. **Enviar primeira mensagem consultiva**
   - Usar `first_message_builder.js`
   - Tom natural e curioso
   - Sem pitch agressivo

3. **Identificar DOR principal**
   - Crescimento lento → Growth Marketing
   - Site que não vende → Sites
   - Falta de autoridade → Audiovisual
   - Problema misto → Permitir lead escolher

4. **Coletar informação básica**
   - Nome/empresa
   - Setor/nicho
   - Contexto da dor

### 🔄 Handoff (Passagem de Bastão):

**Quando passar para Agente 2:**
- ✅ Confirmado como humano (não-bot)
- ✅ DOR principal identificada
- ✅ Lead demonstrou interesse real

**O que envia:**
```javascript
{
  leadPhone: '5511999999999',
  leadName: 'João Silva',
  company: 'Empresa XYZ',
  sector: 'construção',
  painType: 'growth_marketing', // ou 'sites' ou 'audiovisual'
  painDescription: 'Crescimento está devagar',
  isHuman: true,
  botScore: 0.05, // probabilidade de ser bot (0-1)
  initialContext: '...'
}
```

### 🛠️ Ferramentas que usa:
- `bot_detector.js` - Detecção de bots
- `first_message_builder.js` - Template primeira mensagem
- `emotion_detector.js` - Detectar interesse real
- `exit_detector.js` - Identificar desistência

### 📝 Arquivo: `src/agents/sdr_agent.js`

---

## 🎯 AGENTE 2: Specialist Agent (Atendimento Especializado)

### 📋 Função Principal:
**Atendimento consultivo especializado por DOR (Growth/Sites/Audiovisual)**

### 🎯 Responsabilidades:

1. **Receber contexto do SDR Agent**
   - Lead já validado como humano
   - DOR principal já identificada
   - Contexto inicial disponível

2. **Carregar especialista correto:**

   **Se `painType = 'growth_marketing'`:**
   - Foco: Estratégias de crescimento previsível
   - Perguntas: Sobre funil, conversão, canais
   - Objetivo: Descobrir gargalo de crescimento

   **Se `painType = 'sites'`:**
   - Foco: Performance, conversão, SEO
   - Perguntas: Sobre velocidade, design, usabilidade
   - Objetivo: Identificar problemas do site atual

   **Se `painType = 'audiovisual'`:**
   - Foco: Autoridade, engajamento, storytelling
   - Perguntas: Sobre conteúdo visual, vídeos, branding
   - Objetivo: Entender necessidade de produção

3. **Executar BANT Consultivo**
   - **N**eed (já coletado pelo SDR) → Aprofundar
   - **B**udget → "Vocês já têm verba pra marketing?"
   - **A**uthority → "Quem mais participa dessa decisão?"
   - **T**iming → "Quando precisam dessa solução?"

4. **Usar tom consultivo específico**
   - Perguntas de `consultive_approach.js`
   - Adaptar por arquétipo (Pragmático/Relacional/etc)
   - Reformular objeções com empatia

### 🔄 Handoff (Passagem de Bastão):

**Quando passar para Agente 3:**
- ✅ BANT completo (Need, Budget, Authority, Timing)
- ✅ Score de qualificação >= 70%
- ✅ Lead demonstrou timing urgente ou confirmou interesse

**O que envia:**
```javascript
{
  ...dadosDoSDR, // Dados recebidos do Agente 1
  bantData: {
    need: 'Crescimento devagar + falta de previsibilidade',
    budget: 'R$ 5-10k/mês',
    authority: 'Sou o dono, decido sozinho',
    timing: 'Preciso resolver isso em 1 mês'
  },
  qualificationScore: 85,
  archetype: 'PRAGMATICO',
  painDetails: {
    specificPain: 'Site lento + falta de leads orgânicos',
    currentSituation: 'Dependem 100% de mídia paga',
    desiredOutcome: 'Crescimento orgânico + previsível'
  },
  readyToSchedule: true
}
```

### 🛠️ Ferramentas que usa:
- `bant_unified.js` - Framework BANT
- `consultive_approach.js` - Perguntas consultivas
- `archetypes.js` - Detecção de perfil
- `objection_handler.js` - Contornar objeções
- `persuasion_framework.js` - Técnicas persuasivas

### 📝 Arquivo: `src/agents/specialist_agent.js`

---

## 📅 AGENTE 3: Scheduler Agent (Agendamento)

### 📋 Função Principal:
**Agendar reunião estratégica com leads qualificados**

### 🎯 Responsabilidades:

1. **Receber lead qualificado**
   - BANT completo
   - Score >= 70%
   - Timing definido

2. **Propor agendamento**
   - "Ótimo! Vamos agendar uma conversa estratégica?"
   - "Você prefere terça às 10h ou quinta às 15h?"

3. **Negociar horário**
   - Oferecer 2-3 opções
   - Flexibilizar conforme disponibilidade
   - Confirmar fuso horário

4. **Criar evento no Google Calendar**
   - Usar `calendar_google.js`
   - Enviar convite automático
   - Adicionar detalhes da reunião (DOR, BANT, contexto)

5. **Confirmar agendamento**
   - "✅ Agendado! Terça, 10h"
   - "Te enviei o convite por e-mail"
   - "Prepara as dúvidas que conversamos: [resumo DOR]"

6. **Enviar lembretes**
   - 1 dia antes: "Lembrete: amanhã às 10h temos nossa reunião"
   - 1 hora antes: "Em 1h temos nossa conversa!"

### 🔄 Finalização:

**Após agendar:**
- ✅ Salvar evento no banco de dados
- ✅ Marcar lead como "Reunião Agendada"
- ✅ Enviar notificação para time comercial
- ✅ Criar lembrete automático

**O que salva:**
```javascript
{
  ...dadosCompletos, // Dados do SDR + Specialist
  meeting: {
    status: 'scheduled',
    date: '2025-10-25T10:00:00Z',
    duration: 60, // minutos
    googleEventId: 'evt_123456',
    notes: 'Lead com dor em Growth Marketing. Budget: R$ 5-10k/mês',
    remindersSent: []
  }
}
```

### 🛠️ Ferramentas que usa:
- `meeting_scheduler.js` - Lógica de agendamento
- `calendar_google.js` - Google Calendar API
- `meeting_state_manager.js` - Gerenciar estado

### 📝 Arquivo: `src/agents/scheduler_agent.js`

---

## 🔗 Hub de Comunicação (Agent Hub)

### 📋 Função:
**Gerenciar passagem de bastão entre agentes SEM CONFLITOS**

### 🎯 Responsabilidades:

1. **Controlar qual agente está ativo**
   ```javascript
   activeAgents = {
     '5511999999999': {
       current: 'specialist_agent',
       stage: 'collecting_budget',
       data: {...}
     }
   }
   ```

2. **Garantir transição limpa**
   - SDR finaliza → Marca `handoff: true`
   - Hub verifica → Ativa Specialist
   - Specialist finaliza → Hub ativa Scheduler

3. **Evitar conflitos**
   - ❌ Dois agentes respondendo ao mesmo tempo
   - ❌ Agente respondendo fora de hora
   - ❌ Perda de contexto na transição

4. **Persistir estado**
   - Salvar estado após cada interação
   - Recuperar estado ao receber nova mensagem
   - Permitir retrocesso se necessário

### 📝 Arquivo: `src/agents/agent_hub.js`

---

## 🔄 Fluxo Completo (Exemplo Real)

### 📱 **Mensagem 1: Primeira Interação**

**Lead:** [Primeira mensagem] "Olá"

**→ AGENTE 1 (SDR)**
1. Detecta bot: `botScore = 0.1` (baixo, é humano)
2. Envia primeira mensagem consultiva:
```
Oi! Vi o perfil de vocês e achei interessante.

Me conta uma coisa: como tem sido o crescimento da marca
nos últimos meses? Tá do jeito que esperavam?
```

---

### 📱 **Mensagem 2: Lead responde**

**Lead:** "Tá meio devagar, não tá crescendo como esperava"

**→ AGENTE 1 (SDR)**
1. Analisa resposta: Detecta dor de "crescimento devagar"
2. Identifica: `painType = 'growth_marketing'`
3. Pergunta confirmatória:
```
Entendi. Quando você fala que tá devagar, é mais falta
de visibilidade, de conversão ou de consistência nas vendas?
```

---

### 📱 **Mensagem 3: Lead detalha**

**Lead:** "É falta de leads mesmo, só conseguimos via mídia paga"

**→ AGENTE 1 (SDR)**
1. Confirma: DOR = growth_marketing (geração de leads orgânicos)
2. **HANDOFF para Agente 2**
3. Envia contexto:
```javascript
{
  painType: 'growth_marketing',
  painDescription: 'Falta de leads orgânicos, dependência de mídia paga',
  isHuman: true
}
```

**→ HUB**
1. Recebe handoff do SDR
2. Ativa **AGENTE 2 (Specialist Growth Marketing)**
3. Carrega perguntas BANT para Growth

---

### 📱 **Mensagem 4: Specialist assume**

**→ AGENTE 2 (Specialist - Growth)**
1. Recebe contexto do SDR
2. Inicia BANT consultivo (Need já coletado)
3. Avança para Budget:
```
Entendi perfeitamente. Vocês dependem muito de mídia paga e
precisam de canais orgânicos.

Me conta: vocês já têm uma verba separada pra marketing ou
decidem conforme o projeto?
```

---

### 📱 **Mensagem 5-7: BANT Consultivo**

**Lead:** "Temos uns R$ 8 mil por mês pra marketing"
→ Specialist coleta: `budget = 'R$ 8k/mês'`

**Lead:** "Sou o dono, decido sozinho"
→ Specialist coleta: `authority = 'decisor direto'`

**Lead:** "Preciso resolver isso rápido, em 1-2 meses"
→ Specialist coleta: `timing = 'urgente (1-2 meses)'`

---

### 📱 **Mensagem 8: BANT Completo**

**→ AGENTE 2 (Specialist)**
1. BANT completo: Need ✅ Budget ✅ Authority ✅ Timing ✅
2. Calcula score: **85%** (altamente qualificado)
3. **HANDOFF para Agente 3**
4. Envia contexto completo

**→ HUB**
1. Recebe handoff do Specialist
2. Ativa **AGENTE 3 (Scheduler)**

---

### 📱 **Mensagem 9: Scheduler propõe**

**→ AGENTE 3 (Scheduler)**
```
Perfeito! Vejo que vocês precisam estruturar canais orgânicos
pra reduzir dependência de mídia paga.

Vamos agendar uma conversa estratégica pra montar um plano?
Você prefere terça às 10h ou quinta às 15h?
```

---

### 📱 **Mensagem 10: Lead confirma**

**Lead:** "Terça às 10h tá ótimo"

**→ AGENTE 3 (Scheduler)**
1. Cria evento no Google Calendar
2. Envia convite por e-mail
3. Confirma:
```
✅ Agendado!

📅 Terça-feira, 25/10, às 10h
⏱️ Duração: 1 hora
📧 Convite enviado para seu e-mail

Vamos conversar sobre estratégias de crescimento orgânico
pra reduzir sua dependência de mídia paga.

Te envio um lembrete 1 dia antes! 😊
```

4. Salva no banco:
```javascript
{
  leadStatus: 'MEETING_SCHEDULED',
  meetingDate: '2025-10-25T10:00:00Z',
  bantScore: 85,
  painType: 'growth_marketing'
}
```

---

## ✅ Garantias Anti-Conflito

### 1. **Um agente por vez**
```javascript
// agent_hub.js controla
if (activeAgent === 'sdr' && !sdr.handoffReady) {
  return sdrAgent.process(message);
}
if (activeAgent === 'specialist' && !specialist.handoffReady) {
  return specialistAgent.process(message);
}
// etc...
```

### 2. **Estado persistido**
```javascript
// Após cada mensagem
await saveAgentState(leadPhone, {
  currentAgent: 'specialist',
  stage: 'collecting_budget',
  data: {...}
});
```

### 3. **Handoff explícito**
```javascript
// Agente só passa bastão quando pronto
return {
  message: '...',
  handoff: true,
  nextAgent: 'scheduler',
  data: {...}
};
```

### 4. **Rollback se necessário**
```javascript
// Se lead voltar a falar de DOR diferente
if (newPainDetected && currentAgent === 'specialist') {
  rollbackTo('sdr');
}
```

---

## 📁 Estrutura de Arquivos

```
src/agents/
├── agent_hub.js              ← Hub de comunicação (orquestrador)
├── sdr_agent.js              ← Agente 1: Prospecção + bot detection
├── specialist_agent.js       ← Agente 2: Atendimento especializado
│   ├── growth_specialist.js  ← Sub: Growth Marketing
│   ├── sites_specialist.js   ← Sub: Sites
│   └── audio_specialist.js   ← Sub: Audiovisual
└── scheduler_agent.js        ← Agente 3: Agendamento
```

---

## 🚀 Implementação (5 semanas)

### Semana 1: Hub + SDR Agent
- [x] Criar `agent_hub.js` (roteamento)
- [ ] Implementar `sdr_agent.js` (bot detection + primeira abordagem)
- [ ] Integrar com `bot_detector.js` existente
- [ ] Testar handoff SDR → Specialist

### Semana 2: Specialist Agent (Growth)
- [ ] Criar `specialist_agent.js` base
- [ ] Implementar `growth_specialist.js`
- [ ] Integrar BANT consultivo
- [ ] Testar handoff Specialist → Scheduler

### Semana 3: Specialist Agent (Sites + Audiovisual)
- [ ] Implementar `sites_specialist.js`
- [ ] Implementar `audio_specialist.js`
- [ ] Testar roteamento por `painType`

### Semana 4: Scheduler Agent
- [ ] Implementar `scheduler_agent.js`
- [ ] Integrar Google Calendar
- [ ] Sistema de lembretes
- [ ] Confirmação de agendamento

### Semana 5: Testes + Ajustes
- [ ] Testar fluxo completo: SDR → Specialist → Scheduler
- [ ] Validar anti-conflito
- [ ] Ajustar tom e perguntas
- [ ] Documentar edge cases

---

## 🎯 Status

✅ **Arquitetura definida**
✅ **Fluxo mapeado**
✅ **Ferramentas identificadas**
⏳ **Aguardando implementação**

**Próximo passo:** Criar `agent_hub.js` e `sdr_agent.js`
