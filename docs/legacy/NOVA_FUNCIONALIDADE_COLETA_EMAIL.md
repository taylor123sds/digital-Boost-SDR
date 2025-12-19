# 📧 NOVA FUNCIONALIDADE: Coleta de Email no Scheduler

**Data:** 2025-10-21
**Feature:** Sistema de coleta de email antes do agendamento

---

## 🎯 OBJETIVO

Garantir que **todo lead agendado** tenha um email válido registrado, permitindo:
1. ✅ Envio do convite do Google Calendar
2. ✅ Comunicação futura por email
3. ✅ Rastreamento de presença na reunião
4. ✅ Follow-up pós-reunião

---

## 🔄 NOVO FLUXO DO SCHEDULER

### ANTES (Fluxo Antigo):
```
Specialist → Handoff → Scheduler
  ↓
Scheduler propõe horários imediatamente
  ↓
Lead escolhe horário
  ↓
❌ Erro: Email inválido ("sócio" não é email)
```

### DEPOIS (Fluxo Novo):
```
Specialist → Handoff → Scheduler
  ↓
📧 Scheduler solicita EMAIL
  ↓
Lead envia: "taylor@email.com"
  ↓
✅ Email validado e salvo
  ↓
⏰ Scheduler propõe horários
  ↓
Lead escolhe horário
  ↓
✅ Evento criado com email REAL
  ↓
📅 Lead recebe convite no email + link via WhatsApp
```

---

## 📊 ESTÁGIOS DO SCHEDULER

O Scheduler Agent agora possui **3 estágios** bem definidos:

### **1. collecting_email**
**Quando:** Logo após receber handoff do Specialist
**O que faz:** Solicita email do lead
**Mensagem:** _"Perfeito! Pra confirmar a reunião e enviar o convite do Google Calendar, preciso do seu email. Qual email você usa? 📧"_

**Validação:**
- Usa regex: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/`
- Se email válido → Salva em `leadState.leadEmail` e avança
- Se email inválido → Repete pergunta

### **2. proposing_times**
**Quando:** Após email coletado
**O que faz:** Propõe horários disponíveis
**Mensagem:** _"Vamos agendar uma conversa estratégica pra montar um plano? Tenho disponibilidade: • quarta (22/10) às 10h • quinta (23/10) às 15h"_

**Validação:**
- Detecta confirmação de horário
- Se confirmado → Cria evento no Google Calendar
- Se não confirmado → Negocia outros horários

### **3. confirmed**
**Quando:** Após reunião agendada
**O que faz:** Mantém relacionamento até a reunião
**Mensagem:** _"Sua reunião está confirmada para 2025-10-23 às 15:00. Link: [Google Meet] Qualquer dúvida, é só chamar! 😊"_

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### **Arquivo Modificado:** `src/agents/scheduler_agent.js`

### **1. Método `onHandoffReceived()` (linhas 26-45)**

**ANTES:**
```javascript
async onHandoffReceived(leadPhone, leadState) {
  const slots = this.getAvailableTimeSlots();
  const timeProposal = await this.proposeTimeSlots(leadState, slots);

  return {
    message: timeProposal,
    updateState: {
      proposedSlots: slots,
      schedulerStage: 'proposing_times'
    }
  };
}
```

**DEPOIS:**
```javascript
async onHandoffReceived(leadPhone, leadState) {
  const emailRequest = this.getEmailRequestMessage(leadState.painType);

  return {
    message: emailRequest,
    metadata: {
      stage: 'collecting_email',
      qualified: true,
      score: leadState.qualificationScore
    },
    updateState: {
      schedulerStage: 'collecting_email'  // ✅ NOVO ESTÁGIO
    }
  };
}
```

**Mudança:** Primeiro solicita email, depois propõe horários.

---

### **2. Método `process()` (linhas 50-188)**

Agora processa baseado em **3 estágios**:

```javascript
async process(message, context) {
  const currentStage = leadState.schedulerStage || 'collecting_email';

  // ESTÁGIO 1: Coletando email
  if (currentStage === 'collecting_email') {
    const emailDetection = this.detectEmail(text);

    if (emailDetection.found) {
      // Salvar email e avançar para propor horários
      return {
        message: timeProposal,
        updateState: {
          leadEmail: emailDetection.email,  // ✅ Salva email
          proposedSlots: slots,
          schedulerStage: 'proposing_times'  // ✅ Avança estágio
        }
      };
    } else {
      // Email não detectado - pedir novamente
      return {
        message: "Não consegui identificar o email. Pode enviar no formato: seu@email.com?"
      };
    }
  }

  // ESTÁGIO 2: Propondo horários
  if (currentStage === 'proposing_times') {
    // Detectar confirmação e criar evento
    // ...
  }

  // ESTÁGIO 3: Reunião confirmada
  if (currentStage === 'confirmed') {
    // Manter relacionamento
    // ...
  }
}
```

---

### **3. Novos Métodos Criados**

#### **`getEmailRequestMessage(painType)` (linhas 474-484)**
Retorna mensagem personalizada por tipo de dor:

```javascript
getEmailRequestMessage(painType) {
  const messages = {
    growth_marketing: `Perfeito! Pra confirmar a reunião e enviar o convite do Google Calendar, preciso do seu email.\n\nQual email você usa? 📧`,
    sites: `Show! Pra te enviar o convite da reunião com os detalhes do projeto, preciso do seu email.\n\nQual email posso usar? 📧`,
    audiovisual: `Fechou! Vou te enviar o convite da reunião no Google Calendar.\n\nQual seu email? 📧`
  };

  return messages[painType] || `Ótimo! Pra enviar o convite da reunião, preciso do seu email.\n\nQual email você usa? 📧`;
}
```

#### **`detectEmail(text)` (linhas 489-504)**
Detecta e valida email na mensagem:

```javascript
detectEmail(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const match = text.match(emailRegex);

  if (match) {
    return {
      found: true,
      email: match[0].toLowerCase()
    };
  }

  return {
    found: false,
    email: null
  };
}
```

**Características:**
- ✅ Detecta emails mesmo em meio a outras palavras
- ✅ Normaliza para lowercase
- ✅ Valida formato básico (usuario@dominio.ext)

---

### **4. Método `createCalendarEvent()` Atualizado (linhas 383-412)**

**ANTES:**
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const authorityEmail = leadState.bant?.authority;  // ❌ "sócio"
const isValidEmail = authorityEmail && emailRegex.test(authorityEmail);
const leadEmail = isValidEmail ? authorityEmail : null;

const eventData = {
  attendees: leadEmail ? [leadEmail] : []  // ❌ Array vazio
};
```

**DEPOIS:**
```javascript
const leadEmail = leadState.leadEmail || null;  // ✅ Email coletado

console.log(`📧 [SCHEDULER] Email do lead: ${leadEmail || 'ERRO: Email não coletado!'}`);

// ⚠️ VALIDAÇÃO: Email DEVE existir neste ponto
if (!leadEmail) {
  throw new Error('Email não foi coletado antes de criar evento. Estado inconsistente.');
}

const eventData = {
  attendees: [leadEmail]  // ✅ Email SEMPRE presente
};
```

**Mudanças:**
1. ✅ Usa `leadState.leadEmail` (coletado no estágio 1)
2. ✅ Valida presença do email (erro se não existir)
3. ✅ Garante que evento SEMPRE tem attendee

---

## 🧪 COMO TESTAR

### Teste Completo do Fluxo:

```
1. Lead: "Olá"
   Bot: [Boas-vindas do SDR]

2. Lead: "Preciso de marketing"
   Bot: [SDR detecta pain + handoff para Specialist]

3. Lead: "R$ 2000/mês"
   Bot: [Specialist coleta Budget]

4. Lead: "Eu decido"
   Bot: [Specialist coleta Authority]

5. Lead: "Pra agora"
   Bot: [Specialist coleta Timing + handoff para Scheduler]

6. 📧 Bot: "Perfeito! Pra confirmar a reunião e enviar o convite do Google Calendar, preciso do seu email. Qual email você usa? 📧"

7. Lead: "taylor@email.com"
   Bot: [Valida email ✅ + propõe horários]
   Bot: "Vamos agendar uma conversa estratégica pra montar um plano? Tenho disponibilidade: • quarta (22/10) às 10h • quinta (23/10) às 15h"

8. Lead: "Quinta às 15h"
   Bot: [Cria evento + envia confirmação]
   Bot: "🎉 Pronto! Reunião agendada para 2025-10-23 às 15:00. 📹 Link da reunião: https://meet.google.com/... 💡 Já vou preparar insights personalizados pro seu caso."
```

### Teste de Validação de Email:

```
Bot: "Qual email você usa?"
Lead: "meu email é o fulano"
Bot: "Não consegui identificar o email. Pode enviar no formato: seu@email.com?"

Lead: "fulano@teste.com"
Bot: ✅ [Email detectado e salvo] "Vamos agendar uma conversa estratégica..."
```

---

## 📊 ESTADO DO LEAD (Novo Campo)

```javascript
{
  contactId: "558496791624",
  currentAgent: "scheduler",

  // ✅ NOVO: Email coletado
  leadEmail: "taylor@email.com",

  // Estágios do Scheduler
  schedulerStage: "proposing_times",  // collecting_email → proposing_times → confirmed
  proposedSlots: [...],

  // Reunião agendada
  scheduledMeeting: {
    eventId: "abc123",
    date: "2025-10-23",
    time: "15:00",
    meetLink: "https://meet.google.com/...",
    scheduledAt: "2025-10-21T17:30:00.000Z"
  }
}
```

---

## ✅ BENEFÍCIOS DA IMPLEMENTAÇÃO

### Para o Lead:
1. ✅ Recebe convite oficial do Google Calendar
2. ✅ Lembrete automático da reunião (Google Calendar)
3. ✅ Pode adicionar ao calendário com 1 clique
4. ✅ Menos chance de esquecer a reunião

### Para a Digital Boost:
1. ✅ Base de emails qualificados (leads >= 70% score)
2. ✅ Rastreamento de presença na reunião
3. ✅ Follow-up pós-reunião via email
4. ✅ Integração com ferramentas de marketing (Kommo, RD Station, etc.)

### Para o Sistema:
1. ✅ Dados consistentes (email sempre presente)
2. ✅ Sem erros "Invalid attendee email"
3. ✅ Eventos criados corretamente no Google Calendar
4. ✅ Fluxo previsível e testável

---

## 🔍 LOGS ESPERADOS

### Handoff do Specialist para Scheduler:
```
📅 [SCHEDULER] Recebendo handoff do Specialist
🎯 Score de qualificação: 80%
📊 BANT: {
  "need": "Crescimento/Marketing/Vendas",
  "budget": "R$ 2000/mês",
  "authority": "sócio",
  "timing": "agora"
}
```

### Coleta de Email:
```
📆 [SCHEDULER] Processando mensagem de 558496791624
📊 [SCHEDULER] Stage atual: collecting_email
📧 [SCHEDULER] Processando coleta de email
✅ [SCHEDULER] Email detectado: taylor@email.com
```

### Proposta de Horários:
```
📊 [SCHEDULER] Stage atual: proposing_times
⏰ [SCHEDULER] Processando escolha de horário
```

### Criação de Evento:
```
✅ [SCHEDULER] Horário confirmado: 2025-10-23 15:00
📅 [SCHEDULER] Criando evento no Google Calendar...
📧 [SCHEDULER] Email do lead: taylor@email.com
✅ [SCHEDULER] Evento criado: abc123xyz
🔗 [SCHEDULER] Link: https://calendar.google.com/...
📹 [SCHEDULER] Meet: https://meet.google.com/...
```

---

## 🚨 TRATAMENTO DE ERROS

### Erro 1: Email não fornecido
```
Lead: "Pode marcar pra quarta"
Bot: "Não consegui identificar o email. Pode enviar no formato: seu@email.com?"
```

### Erro 2: Email inválido
```
Lead: "fulanogmail.com"
Bot: "Não consegui identificar o email. Pode enviar no formato: seu@email.com?"
```

### Erro 3: Estado inconsistente (email não coletado mas está em proposing_times)
```
❌ [SCHEDULER] ERRO: Email não foi coletado antes de criar evento. Estado inconsistente.
```
**Solução:** Sistema deve sempre coletar email antes de avançar para `proposing_times`.

---

## 📁 ARQUIVOS MODIFICADOS

1. **`src/agents/scheduler_agent.js`**:
   - Linhas 26-45: `onHandoffReceived()` → solicita email
   - Linhas 50-188: `process()` → 3 estágios
   - Linhas 383-412: `createCalendarEvent()` → usa `leadState.leadEmail`
   - Linhas 474-484: `getEmailRequestMessage()` → novo método
   - Linhas 489-504: `detectEmail()` → novo método

2. **`NOVA_FUNCIONALIDADE_COLETA_EMAIL.md`** (este arquivo):
   - Documentação completa da feature

---

## 🎓 APRENDIZADOS

1. **Separação de Responsabilidades**: Cada estágio tem uma responsabilidade clara
2. **Validação em Camadas**: Email validado no frontend (regex) + backend (Google Calendar API)
3. **Estado como Single Source of Truth**: `leadState.schedulerStage` controla o fluxo
4. **UX Conversacional**: Mensagens adaptadas por `painType` (growth_marketing, sites, audiovisual)

---

## 🔗 ARQUIVOS RELACIONADOS

- `CORRECAO_LOOP_SCHEDULER.md` - Correção do loop de handoff
- `CORRECAO_EMAIL_GOOGLE_CALENDAR.md` - Primeira tentativa (validação de `bant.authority`)
- `src/agents/scheduler_agent.js` - Agente de agendamento
- `src/tools/calendar_google.js` - Integração com Google Calendar API

---

**Status:** ✅ Implementado e testado
**Prioridade:** 🔴 CRÍTICO
**Gerado por:** Claude Code
**Última atualização:** 2025-10-21 14:46
