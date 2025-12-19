# Análise de Lógicas Faltantes

**Data:** 2025-11-20
**Solicitação:** Verificar e implementar lógicas para apresentação de planos e reagendamento de reunião

---

## 📋 Resumo Executivo

Foram identificadas **2 lógicas importantes** que precisam ser implementadas ou melhoradas:

1. ✅ **Apresentação de Planos** - ❌ FALTANDO (parcialmente)
2. ✅ **Reagendamento de Reunião** - ⚠️ PARCIAL (precisa melhorias)

---

## 🔍 Análise Detalhada

### 1. Apresentação de Planos após BANT/Timing

#### 🎯 Requisito
Quando a pessoa pedir para "conhecer os outros planos" ou "ver todos os planos" após completar o BANT (especialmente após timing), o agente deve apresentar os planos disponíveis.

#### 📍 Estado Atual

**Planos Existentes:**
- Documentados em `src/config/services_catalog.js`:
  ```javascript
  planos: {
    starter: {
      nome: 'Starter',
      preco: 197,
      modulos: ['DRE', 'Fluxo de Caixa']
    },
    profissional: {
      nome: 'Profissional',
      preco: 497,
      modulos: ['Todos os módulos']
    },
    enterprise: {
      nome: 'Enterprise',
      preco: 997,
      modulos: ['Todos + Customizações']
    }
  }
  ```

- Também em `src/tools/bant_stages_v2.js` (linhas 144-194):
  ```javascript
  export const PLANS = {
    basico: {
      nome: 'Básico',
      precoMensal: 550,
      precoAnual: 400,
      features: ['Dashboard', 'DRE completo', 'Indicadores', 'Fluxo de caixa']
    },
    medio: {
      nome: 'Médio',
      precoMensal: 750,
      precoAnual: 600,
      features: ['Tudo do Básico', 'Estoque', 'Funil de clientes', 'Funcionalidades avançadas']
    },
    pro: {
      nome: 'Pro',
      precoMensal: 1000,
      precoAnual: 800,
      features: ['Tudo do Médio', 'Automações completas', 'Integrações avançadas', 'Suporte prioritário']
    }
  }
  ```

**Problema Identificado:**
- ❌ **NÃO existe lógica** que detecta quando o lead pede para ver os planos
- ❌ **NÃO existe função** que formata e apresenta os planos de forma estruturada
- ❌ **NÃO existe detecção** de frases como:
  - "quero conhecer os outros planos"
  - "quais são os planos disponíveis?"
  - "me mostre todos os planos"
  - "quanto custa cada plano?"

#### ✅ Solução Proposta

**1. Criar detector de intenção de ver planos:**
```javascript
// Adicionar em src/tools/intent_detectors.js
export function detectShowPlansIntent(message) {
  const patterns = [
    /\b(conhecer|ver|mostrar|quero|me mostre)\b.*\b(outros?|todos?|demais)\b.*\b(planos?|opções?)\b/i,
    /\bquais\b.*\b(planos?|opções?|pacotes?)\b/i,
    /\b(preços?|valores?|quanto custa)\b.*\b(planos?|pacotes?)\b/i,
    /\b(planos?|pacotes?)\b.*\b(disponíveis?|tem)\b/i
  ];

  return patterns.some(p => p.test(message));
}
```

**2. Criar formatador de apresentação de planos:**
```javascript
// Adicionar em src/tools/plan_presenter.js
export function formatPlansPresentation(plans, painType) {
  let message = `📦 **Planos Disponíveis Leadly:**\n\n`;

  // Plano Básico
  message += `💼 **Plano Básico** - R$ 400/mês (anual)\n`;
  message += `   ✅ Dashboard de gestão financeira\n`;
  message += `   ✅ DRE completo\n`;
  message += `   ✅ Indicadores de performance\n`;
  message += `   ✅ Fluxo de caixa\n`;
  message += `   📊 Ideal para: MEIs e micro empresas (1-5 funcionários)\n\n`;

  // Plano Médio
  message += `💎 **Plano Médio** - R$ 600/mês (anual)\n`;
  message += `   ✅ Tudo do Básico +\n`;
  message += `   ✅ Controle de estoque\n`;
  message += `   ✅ Funil de clientes\n`;
  message += `   ✅ Funcionalidades avançadas de gestão\n`;
  message += `   📊 Ideal para: Pequenas empresas (6-10 funcionários)\n\n`;

  // Plano Pro
  message += `🚀 **Plano Pro** - R$ 800/mês (anual)\n`;
  message += `   ✅ Tudo do Médio +\n`;
  message += `   ✅ Automações completas\n`;
  message += `   ✅ Integrações avançadas\n`;
  message += `   ✅ Suporte prioritário\n`;
  message += `   📊 Ideal para: Empresas em crescimento (11+ funcionários)\n\n`;

  // Recomendação baseada no painType
  message += `💡 **Recomendado para você:** ${getRecommendedPlan(painType)}\n\n`;
  message += `Qual desses se encaixa melhor no que você precisa?`;

  return message;
}

function getRecommendedPlan(painType) {
  const recommendations = {
    dre: 'Plano Básico - DRE já resolve seu problema principal',
    fluxo_caixa: 'Plano Básico - Fluxo de caixa incluído',
    estoque: 'Plano Médio - Controle de estoque completo',
    indicadores: 'Plano Médio - KPIs e dashboards avançados',
    crm: 'Plano Médio - CRM integrado',
    receitas: 'Plano Pro - Régua de cobrança automática',
    clientes: 'Plano Pro - Segmentação e análise completa'
  };

  return recommendations[painType] || 'Plano Médio - Mais completo e popular';
}
```

**3. Integrar no fluxo do SDR Agent:**
```javascript
// Adicionar em src/agents/sdr_agent.js (método process)

// Após BANT completo (timing stage)
if (currentStage === 'timing' && isStageComplete) {
  // Detectar se lead quer ver planos
  if (detectShowPlansIntent(text)) {
    const plansMessage = formatPlansPresentation(PLANS, leadState.painType);

    return {
      message: plansMessage,
      metadata: {
        stage: 'timing',
        showedPlans: true
      }
    };
  }
}
```

---

### 2. Reagendamento de Reunião

#### 🎯 Requisito
Permitir que o lead possa:
1. Mudar o **e-mail** da reunião
2. Mudar o **horário** da reunião
3. Mudar o **dia** da reunião
4. Cancelar e reagendar completamente

#### 📍 Estado Atual

**Lógica Existente (src/agents/scheduler_agent.js:66-88):**
```javascript
// ✅ DETECTA pedido de remarcar
const wantsReschedule = /\b(remarcar|mudar|cancelar|outro horário)\b/i.test(text.toLowerCase());

if (wantsReschedule) {
  console.log(`🔄 [SCHEDULER] Lead quer remarcar`);
  // Reset scheduler to proposing_times
  const newSlots = this.getAvailableTimeSlots();
  return {
    message: `Sem problemas! Vamos remarcar.\n\nQual horário funciona melhor pra você:\n• ${newSlots[0].label}\n• ${newSlots[1].label}?`,
    // ...
  };
}
```

**Problemas Identificados:**
- ✅ Detecta intenção de remarcar
- ✅ Propõe novos horários
- ❌ **NÃO detecta** pedido para mudar APENAS email
- ❌ **NÃO detecta** pedido para mudar APENAS horário (mantendo data)
- ❌ **NÃO detecta** pedido para mudar APENAS data (mantendo horário)
- ❌ **NÃO permite** edição granular da reunião

#### ✅ Solução Proposta

**1. Melhorar detector de intenções de alteração:**
```javascript
// Adicionar em src/agents/scheduler_agent.js

/**
 * Detecta tipo específico de alteração solicitada
 */
detectChangeType(text) {
  const lowerText = text.toLowerCase();

  // 1. Mudança de email
  const emailChange = /\b(mudar|alterar|trocar|corrigir)\b.*\b(email|e-mail)\b/i.test(lowerText);
  if (emailChange) {
    return { type: 'email', detected: true };
  }

  // 2. Mudança de horário (mas não data)
  const timeChange = /\b(mudar|alterar|trocar)\b.*\b(hora|horário|hora)\b/i.test(lowerText) &&
                     !/\b(dia|data)\b/i.test(lowerText);
  if (timeChange) {
    return { type: 'time', detected: true };
  }

  // 3. Mudança de dia/data (mas não horário)
  const dateChange = /\b(mudar|alterar|trocar)\b.*\b(dia|data)\b/i.test(lowerText) &&
                     !/\b(hora|horário)\b/i.test(lowerText);
  if (dateChange) {
    return { type: 'date', detected: true };
  }

  // 4. Mudança completa (remarcar tudo)
  const fullReschedule = /\b(remarcar|cancelar|outro horário|mudar reunião)\b/i.test(lowerText);
  if (fullReschedule) {
    return { type: 'full', detected: true };
  }

  return { type: null, detected: false };
}
```

**2. Implementar handlers específicos:**
```javascript
/**
 * Handler para mudança de email
 */
async handleEmailChange(leadState) {
  return {
    message: `Claro! Qual o novo email que você quer usar?\n\n📧 Pode enviar no formato: seu@email.com`,
    metadata: { changingEmail: true },
    updateState: {
      scheduler: {
        ...leadState.scheduler,
        stage: 'updating_email'
      }
    }
  };
}

/**
 * Handler para mudança de horário
 */
async handleTimeChange(leadState) {
  const currentDate = leadState.scheduler.selectedSlot?.date;

  // Buscar horários disponíveis para o mesmo dia
  const availableTimes = this.getAvailableTimesForDate(currentDate);

  return {
    message: `Sem problemas! Para ${this.formatDateBR(currentDate)}, tenho disponível:\n• ${availableTimes[0]}\n• ${availableTimes[1]}\n\nQual prefere?`,
    metadata: { changingTime: true },
    updateState: {
      scheduler: {
        ...leadState.scheduler,
        stage: 'updating_time',
        availableTimes
      }
    }
  };
}

/**
 * Handler para mudança de data
 */
async handleDateChange(leadState) {
  const currentTime = leadState.scheduler.selectedSlot?.time;

  // Buscar datas disponíveis para o mesmo horário
  const availableDates = this.getAvailableDatesForTime(currentTime);

  return {
    message: `Beleza! Para ${currentTime}, posso encaixar:\n• ${availableDates[0].label}\n• ${availableDates[1].label}\n\nQual funciona melhor?`,
    metadata: { changingDate: true },
    updateState: {
      scheduler: {
        ...leadState.scheduler,
        stage: 'updating_date',
        availableDates
      }
    }
  };
}

/**
 * Handler para reagendamento completo
 */
async handleFullReschedule(leadState) {
  const newSlots = this.getAvailableTimeSlots();

  return {
    message: `Sem problemas! Vamos remarcar.\n\nQual horário funciona melhor pra você:\n• ${newSlots[0].label}\n• ${newSlots[1].label}?`,
    metadata: { rescheduling: true },
    updateState: {
      scheduler: {
        stage: 'proposing_times',
        leadEmail: leadState.scheduler.leadEmail, // Keep email
        proposedSlots: newSlots,
        selectedSlot: null,
        meetingData: {
          eventId: null,
          meetLink: null,
          confirmedAt: null
        }
      }
    }
  };
}
```

**3. Integrar no fluxo principal:**
```javascript
// Modificar src/agents/scheduler_agent.js:process()

// Verificar se já tem reunião agendada
if (leadState.scheduler?.meetingData?.eventId) {
  // Detectar tipo de mudança solicitada
  const changeType = this.detectChangeType(text);

  if (changeType.detected) {
    switch (changeType.type) {
      case 'email':
        return await this.handleEmailChange(leadState);

      case 'time':
        return await this.handleTimeChange(leadState);

      case 'date':
        return await this.handleDateChange(leadState);

      case 'full':
        return await this.handleFullReschedule(leadState);
    }
  }

  // Mostrar info da reunião atual
  const slotDate = leadState.scheduler.selectedSlot?.date || 'a data agendada';
  const slotTime = leadState.scheduler.selectedSlot?.time || 'o horário agendado';
  return {
    message: `Sua reunião está agendada para ${slotDate} às ${slotTime}.\n\nLink: ${leadState.scheduler.meetingData.meetLink}\n\nPrecisa mudar algo? (email, horário, data)`,
    metadata: { alreadyScheduled: true }
  };
}
```

**4. Processar estágios de atualização:**
```javascript
// Adicionar novos estágios

// ESTÁGIO: Atualizando email
if (currentStage === 'updating_email') {
  const emailDetection = this.detectEmail(text);

  if (emailDetection.found) {
    // Atualizar evento no Google Calendar
    await this.updateCalendarEvent(
      leadState.scheduler.meetingData.eventId,
      { attendees: [emailDetection.email] }
    );

    return {
      message: `✅ Email atualizado!\n\nAgora você vai receber o convite em: ${emailDetection.email}`,
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          leadEmail: emailDetection.email,
          stage: 'confirmed'
        }
      }
    };
  }
}

// ESTÁGIO: Atualizando horário
if (currentStage === 'updating_time') {
  // Processar escolha de novo horário
  const newTime = this.extractTime(text);

  if (newTime) {
    // Atualizar evento no Google Calendar
    await this.updateCalendarEvent(
      leadState.scheduler.meetingData.eventId,
      {
        date: leadState.scheduler.selectedSlot.date,
        time: newTime
      }
    );

    return {
      message: `✅ Horário atualizado!\n\nReunião agora é às ${newTime}.`,
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          selectedSlot: {
            ...leadState.scheduler.selectedSlot,
            time: newTime
          },
          stage: 'confirmed'
        }
      }
    };
  }
}

// ESTÁGIO: Atualizando data
if (currentStage === 'updating_date') {
  // Processar escolha de nova data
  const newDate = this.extractDate(text, leadState.scheduler.availableDates);

  if (newDate) {
    // Atualizar evento no Google Calendar
    await this.updateCalendarEvent(
      leadState.scheduler.meetingData.eventId,
      {
        date: newDate,
        time: leadState.scheduler.selectedSlot.time
      }
    );

    return {
      message: `✅ Data atualizada!\n\nReunião agora é ${this.formatDateBR(newDate)}.`,
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          selectedSlot: {
            ...leadState.scheduler.selectedSlot,
            date: newDate
          },
          stage: 'confirmed'
        }
      }
    };
  }
}
```

**5. Criar função de atualização de evento:**
```javascript
/**
 * Atualiza evento existente no Google Calendar
 */
async updateCalendarEvent(eventId, updates) {
  try {
    const { updateEvent } = await import('../tools/calendar_enhanced.js');

    const result = await updateEvent(eventId, updates);

    if (result.success) {
      console.log(`✅ [SCHEDULER] Evento atualizado: ${eventId}`);
      return result;
    } else {
      throw new Error(result.error || 'Falha ao atualizar evento');
    }
  } catch (error) {
    console.error(`❌ [SCHEDULER] Erro ao atualizar evento:`, error);
    throw error;
  }
}
```

---

## 📊 Tabela de Comparação

| Funcionalidade | Estado Atual | Solução Proposta |
|----------------|--------------|------------------|
| **Apresentar planos quando solicitado** | ❌ Não existe | ✅ Detector + Formatador |
| **Detectar "ver planos"** | ❌ Não detecta | ✅ Regex patterns |
| **Formatar lista de planos** | ❌ Não existe | ✅ Função formatadora |
| **Recomendar plano por dor** | ❌ Não existe | ✅ Lógica de recomendação |
| **Reagendar reunião** | ⚠️ Parcial (só completo) | ✅ Completo + granular |
| **Mudar email da reunião** | ❌ Não permite | ✅ Handler específico |
| **Mudar horário (mesma data)** | ❌ Não permite | ✅ Handler específico |
| **Mudar data (mesmo horário)** | ❌ Não permite | ✅ Handler específico |
| **Atualizar evento no Calendar** | ❌ Não existe | ✅ Função updateEvent |

---

## ✅ Plano de Implementação

### Prioridade 1: Apresentação de Planos
1. Criar `src/utils/intent_detectors.js`
2. Criar `src/utils/plan_presenter.js`
3. Integrar em `src/agents/sdr_agent.js`
4. Testar com frases variadas

### Prioridade 2: Reagendamento Granular
1. Adicionar `detectChangeType()` em `scheduler_agent.js`
2. Implementar handlers específicos (email, time, date, full)
3. Adicionar novos estágios (updating_email, updating_time, updating_date)
4. Criar função `updateCalendarEvent()`
5. Adicionar função `updateEvent()` em `calendar_enhanced.js`
6. Testar todos os cenários de alteração

---

## 🧪 Casos de Teste

### Apresentação de Planos
```
Usuario: "quero conhecer os outros planos"
Agente: [Mostra lista formatada de todos os planos com preços e features]

Usuario: "quais são as opções disponíveis?"
Agente: [Mostra lista formatada de todos os planos]

Usuario: "quanto custa cada plano?"
Agente: [Mostra lista formatada com destaque nos preços]
```

### Reagendamento
```
Usuario: "preciso mudar o email"
Agente: "Claro! Qual o novo email que você quer usar? 📧"

Usuario: "quero mudar o horário"
Agente: "Sem problemas! Para [data], tenho disponível: ..."

Usuario: "pode mudar para outro dia?"
Agente: "Beleza! Para [horário], posso encaixar: ..."

Usuario: "preciso remarcar tudo"
Agente: "Sem problemas! Vamos remarcar. Qual horário funciona melhor?"
```

---

## 📌 Conclusão

**Resumo:**
- ✅ Identificadas 2 funcionalidades faltantes/incompletas
- ✅ Solução detalhada proposta para cada uma
- ✅ Plano de implementação definido
- ✅ Casos de teste especificados

**Próximos Passos:**
1. Aprovar plano de implementação
2. Implementar Prioridade 1 (Apresentação de Planos)
3. Implementar Prioridade 2 (Reagendamento Granular)
4. Testar todos os cenários
5. Deploy em produção

**Arquivos a Criar/Modificar:**
- ✅ `src/utils/intent_detectors.js` (NOVO)
- ✅ `src/utils/plan_presenter.js` (NOVO)
- ✅ `src/agents/sdr_agent.js` (MODIFICAR)
- ✅ `src/agents/scheduler_agent.js` (MODIFICAR - adicionar métodos)
- ✅ `src/tools/calendar_enhanced.js` (MODIFICAR - adicionar updateEvent)
