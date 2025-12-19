# Relatório de Implementação: Apresentação de Planos e Reagendamento Granular

**Data**: 2025-11-20
**Status**: ✅ Concluído
**Versão**: 1.0.0

---

## 📋 Sumário Executivo

Implementação completa de duas funcionalidades críticas no sistema ORBION/LEADLY:

1. **Apresentação Inteligente de Planos**: Sistema detecta quando lead pede para ver planos e apresenta todos com recomendação personalizada baseada em painType e porte da empresa
2. **Reagendamento Granular**: Permite alterar email, horário ou data da reunião separadamente, sem precisar remarcar tudo

---

## 🎯 Requisitos Atendidos

### Requisito 1: Apresentação de Planos
**Origem**: "quando for mandando o plano para a pessoa apos o timing se a pessoa pedir para conhecer os outros, deve ser mandado os planos"

**Comportamento Esperado**:
- Lead recebe recomendação de um plano específico após completar BANT
- Se pedir "quero conhecer os outros planos", sistema apresenta todos os 3 planos
- Apresentação deve ser clara, consultiva e incluir recomendação personalizada

**Status**: ✅ Implementado

### Requisito 2: Reagendamento Granular
**Origem**: "precisamos colocar para caso a pessoa peca para mudar o e-mail, horario e dia da reuniao, o agente deve reconhcer isso e mudar"

**Comportamento Esperado**:
- Lead pode pedir para mudar apenas o email
- Lead pode pedir para mudar apenas o horário (mantendo data)
- Lead pode pedir para mudar apenas a data (mantendo horário)
- Lead pode pedir para remarcar completamente

**Status**: ✅ Implementado

---

## 🏗️ Arquitetura da Solução

### Princípios de Design Seguidos
1. **Separação de Responsabilidades**: Lógica separada em módulos utilitários
2. **Modularidade**: Cada função tem responsabilidade única e bem definida
3. **Reutilizabilidade**: Detectores e formatadores podem ser usados por qualquer agente
4. **Escalabilidade**: Fácil adicionar novos padrões de detecção ou planos
5. **Manutenibilidade**: Código documentado com JSDoc completo

### Estrutura de Arquivos

```
src/
├── utils/
│   ├── intent_detectors.js       ← NOVO: Detectores de intenção
│   └── plan_presenter.js          ← NOVO: Apresentador de planos
├── agents/
│   ├── specialist_agent.js        ← MODIFICADO: Integração de planos
│   └── scheduler_agent.js         ← MODIFICADO: Reagendamento granular
└── tools/
    └── calendar_enhanced.js       ← MODIFICADO: Função updateEvent
```

---

## 📦 Deliverables Criados

### 1. `src/utils/intent_detectors.js` (203 linhas)

**Propósito**: Centralizar toda lógica de detecção de intenções do usuário

**Funções Exportadas**:

#### `detectShowPlansIntent(message)`
Detecta se usuário quer ver todos os planos disponíveis.

**Padrões Detectados**:
- "quero conhecer os outros planos"
- "quais são os planos disponíveis?"
- "me mostre todos os planos"
- "quanto custa cada plano?"
- "preços dos pacotes"
- "comparar planos"

**Retorno**: `boolean`

**Exemplo**:
```javascript
detectShowPlansIntent("quero conhecer os outros planos")
// => true

detectShowPlansIntent("quanto custa?")
// => true
```

#### `detectChangeType(message)`
Detecta tipo específico de alteração solicitada.

**Tipos Detectados**:
- `'email'`: "preciso mudar o email", "email errado"
- `'time'`: "pode mudar o horário?", "tem mais cedo?"
- `'date'`: "mudar a data", "outro dia"
- `'full'`: "remarcar", "não vou conseguir"

**Retorno**: `{ type: string|null, detected: boolean }`

**Exemplo**:
```javascript
detectChangeType("preciso mudar o email")
// => { type: 'email', detected: true }

detectChangeType("pode mudar o horário?")
// => { type: 'time', detected: true }
```

#### Funções Helper
- `detectConfirmation(message)`: Detecta confirmações (sim, ok, beleza)
- `detectNegation(message)`: Detecta negações (não, nunca)

---

### 2. `src/utils/plan_presenter.js` (347 linhas)

**Propósito**: Formatar e apresentar planos com recomendação inteligente

**Funções Exportadas**:

#### `formatPlansPresentation(context)`
Apresentação completa dos 3 planos com recomendação personalizada.

**Parâmetros**:
```javascript
{
  painType: string,              // 'dre', 'fluxo_caixa', 'estoque', etc
  companySize: string,           // '1-5', '6-10', '11+'
  monthlyRevenue: number,        // Receita mensal
  includeRecommendation: boolean // Default: true
}
```

**Saída Formatada**:
```
📦 Planos Leadly Sistema Financeiro:

💼 Plano Básico - R$ 400/mês (anual)
   Mensal: R$ 550
   ✅ Dashboard de gestão financeira
   ✅ DRE completo
   ✅ Fluxo de caixa
   📊 Ideal para: MEIs e micro empresas (1-5 funcionários)

💎 Plano Médio - R$ 600/mês (anual)
   Mensal: R$ 800
   ✅ Tudo do Básico +
   ✅ Controle de estoque
   ✅ CRM integrado
   📊 Ideal para: Pequenas empresas (6-10 funcionários)

🚀 Plano Pro - R$ 800/mês (anual)
   Mensal: R$ 1.100
   ✅ Tudo do Médio +
   ✅ Régua de cobrança automática
   ✅ Score de clientes
   📊 Ideal para: Empresas em crescimento (11+ funcionários)

💡 Recomendado para você: Plano Médio
   Controle de estoque completo com integração ao DRE

Qual desses se encaixa melhor no que você precisa?
```

#### `getRecommendedPlan(painType, companySize, monthlyRevenue)`
Lógica de recomendação inteligente baseada em:

**Prioridade 1 - Porte da Empresa**:
- 11+ funcionários → Pro (sempre)
- 6-10 funcionários → Médio ou Pro (depende de painType)
- 1-5 funcionários → Básico ou Médio (depende de painType)

**Prioridade 2 - PainType**:
- `dre` / `fluxo_caixa` → Básico (já resolve)
- `estoque` / `indicadores` / `crm` → Médio (funcionalidades avançadas)
- `receitas` / `clientes` → Pro (automações completas)

**Retorno**:
```javascript
{
  planKey: 'basico' | 'medio' | 'pro',
  planName: 'Plano Básico' | 'Plano Médio' | 'Plano Pro',
  reason: 'DRE já está incluído e resolve seu principal desafio'
}
```

#### Funções Alternativas
- `formatPlansShort(painType)`: Versão resumida (3 linhas)
- `formatPlansWithROI(painType, revenue)`: Com cálculo de ROI

---

### 3. Modificações em `src/agents/specialist_agent.js`

**Linha de Importação Adicionada**:
```javascript
import { detectShowPlansIntent } from '../utils/intent_detectors.js';
import { formatPlansPresentation } from '../utils/plan_presenter.js';
```

**Lógica Adicionada** (após linha 172):
```javascript
// Detectar pedido para ver planos (após timing ou durante BANT)
if (detectShowPlansIntent(text)) {
  const currentStage = leadState.bantStages?.currentStage;
  const painType = leadState.painType || 'dre';
  const companySize = leadState.bantStages?.stageData?.need?.campos?.funcionarios;
  const monthlyRevenue = leadState.bantStages?.stageData?.need?.campos?.receita_mensal;

  console.log(`📦 [SPECIALIST] Lead pediu para ver planos - stage: ${currentStage}`);
  console.log(`   📊 Dados: painType=${painType}, companySize=${companySize}, revenue=${monthlyRevenue}`);

  // Formatar apresentação de planos
  const plansMessage = formatPlansPresentation({
    painType,
    companySize,
    monthlyRevenue
  });

  return {
    message: plansMessage,
    metadata: {
      showedPlans: true,
      stage: currentStage,
      painType
    }
  };
}
```

**Fluxo de Execução**:
1. Após intelligence check
2. Antes de processar BANT stages
3. Se detectar intenção de ver planos → apresenta imediatamente
4. Caso contrário → continua fluxo normal BANT

---

### 4. Modificações em `src/agents/scheduler_agent.js`

#### 4.1 Imports Adicionados
```javascript
import { createEvent, updateEvent } from '../tools/calendar_enhanced.js';
import { detectChangeType } from '../utils/intent_detectors.js';
```

#### 4.2 Substituição de Detecção Simples (linha 66)
**ANTES**:
```javascript
const wantsReschedule = /\b(remarcar|mudar|cancelar|outro horário)\b/i.test(text);
```

**DEPOIS**:
```javascript
const changeType = detectChangeType(text);

if (changeType.detected) {
  console.log(`🔄 [SCHEDULER] Mudança detectada - tipo: ${changeType.type}`);

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
```

#### 4.3 Handlers Criados (4 métodos após linha 944)

##### `handleEmailChange(leadState)`
Solicita novo email e atualiza apenas attendee do evento.

**Fluxo**:
1. Pergunta novo email
2. Atualiza estado para `stage: 'updating_email'`
3. Aguarda resposta com email
4. Chama `updateEvent(eventId, { attendees: [newEmail] })`

**Exemplo de Conversa**:
```
Lead: "preciso mudar o email"
Agent: "Claro! Qual o novo email que você quer usar?
       📧 Pode enviar no formato: seu@email.com"

Lead: "joao@empresa.com.br"
Agent: "✅ Email atualizado!
       Agora você vai receber o convite em: joao@empresa.com.br"
```

##### `handleTimeChange(leadState)`
Mantém data, propõe horários alternativos.

**Fluxo**:
1. Busca data atual da reunião
2. Gera horários disponíveis para aquela data
3. Atualiza estado para `stage: 'updating_time'`
4. Aguarda escolha
5. Chama `updateEvent(eventId, { date: sameDate, time: newTime })`

**Exemplo de Conversa**:
```
Lead: "pode mudar o horário?"
Agent: "Sem problemas! Para segunda-feira (25/11), tenho disponível:
       • 10:00
       • 15:00

       Qual prefere?"

Lead: "15:00"
Agent: "✅ Horário atualizado!
       Reunião agora é segunda-feira (25/11) às 15:00."
```

##### `handleDateChange(leadState)`
Mantém horário, propõe datas alternativas.

**Fluxo**:
1. Busca horário atual da reunião
2. Gera datas disponíveis para aquele horário
3. Atualiza estado para `stage: 'updating_date'`
4. Aguarda escolha
5. Chama `updateEvent(eventId, { date: newDate, time: sameTime })`

**Exemplo de Conversa**:
```
Lead: "preciso mudar a data"
Agent: "Beleza! Para 15:00, posso encaixar:
       • Terça-feira (26/11)
       • Quarta-feira (27/11)

       Qual funciona melhor?"

Lead: "terça"
Agent: "✅ Data atualizada!
       Reunião agora é terça-feira (26/11) às 15:00."
```

##### `handleFullReschedule(leadState)`
Recomeça agendamento do zero (mantém email).

**Fluxo**:
1. Gera novos slots disponíveis
2. Reseta estado para `stage: 'proposing_times'`
3. Mantém `leadEmail` (não perde o email já coletado)
4. Limpa `selectedSlot` e `meetingData`

#### 4.4 Funções Helper Criadas (2 métodos)

##### `getAvailableTimesForDate(date)`
Retorna horários disponíveis para data específica.

**Lógica**: Manhã (10:00) e tarde (15:00)

**Retorno**: `['10:00', '15:00']`

##### `getAvailableDatesForTime(time)`
Retorna próximas 2 datas disponíveis para horário específico (pula finais de semana).

**Retorno**:
```javascript
[
  {
    date: '2025-11-26',
    time: '15:00',
    label: 'Terça-feira (26/11)',
    dayName: 'terça-feira',
    dayMonth: '26/11'
  },
  {
    date: '2025-11-27',
    time: '15:00',
    label: 'Quarta-feira (27/11)',
    dayName: 'quarta-feira',
    dayMonth: '27/11'
  }
]
```

#### 4.5 Novos Estágios Adicionados (3 processadores)

##### Estágio: `updating_email` (linhas 325-360)
Processa nova resposta após solicitar email.

**Lógica**:
1. Detecta email com `this.detectEmail(text)`
2. Se encontrado → chama `updateEvent(eventId, { attendees: [email] })`
3. Se sucesso → confirma e volta para `stage: 'confirmed'`
4. Se falha → pede para tentar novamente

##### Estágio: `updating_time` (linhas 362-415)
Processa escolha de novo horário.

**Lógica**:
1. Busca `availableTimes` do estado
2. Detecta qual horário foi escolhido (palavras-chave: "10", "manhã", "15", "tarde")
3. Chama `updateEvent(eventId, { date: currentDate, time: newTime })`
4. Se sucesso → confirma e atualiza `selectedSlot.time`

##### Estágio: `updating_date` (linhas 417-470)
Processa escolha de nova data.

**Lógica**:
1. Busca `availableDates` do estado
2. Detecta qual data foi escolhida (palavra-chave: dia da semana)
3. Chama `updateEvent(eventId, { date: newDate, time: currentTime })`
4. Se sucesso → confirma e atualiza `selectedSlot.date`

---

### 5. Modificações em `src/tools/calendar_enhanced.js`

#### Nova Função: `updateEvent(eventId, updates)` (linhas 234-426)

**Propósito**: Atualizar evento existente no Google Calendar sem recriá-lo

**Parâmetros**:
```javascript
{
  eventId: string,           // ID do evento no Google Calendar
  updates: {
    attendees?: string[],    // Lista de emails
    date?: string,           // YYYY-MM-DD (pode vir sozinho)
    time?: string,           // HH:MM (pode vir sozinho)
    duration?: number        // Minutos (default: 30)
  }
}
```

**Retorno**:
```javascript
{
  success: boolean,
  eventId?: string,
  eventLink?: string,
  meetLink?: string,
  error?: string
}
```

**Lógica de Atualização Inteligente**:

1. **Atualizar apenas attendees**:
   ```javascript
   updateEvent('abc123', { attendees: ['novo@email.com'] })
   // Mantém data/hora, atualiza só o participante
   ```

2. **Atualizar apenas horário** (mantém data):
   ```javascript
   updateEvent('abc123', { time: '15:00' })
   // Extrai data do evento atual, aplica novo horário
   ```

3. **Atualizar apenas data** (mantém horário):
   ```javascript
   updateEvent('abc123', { date: '2025-11-26' })
   // Extrai horário do evento atual, aplica nova data
   ```

4. **Atualizar data E horário**:
   ```javascript
   updateEvent('abc123', { date: '2025-11-26', time: '15:00' })
   // Cria nova data/hora completa
   ```

**Fluxo de Execução**:
```
1. Carregar tokens OAuth do google_token.json
2. GET evento atual do Google Calendar
3. Criar updateBody copiando evento atual
4. Aplicar updates:
   - Se attendees → atualizar lista de participantes
   - Se date+time → criar novo dateTime completo
   - Se só date → manter hora atual, mudar data
   - Se só time → manter data atual, mudar hora
5. PUT evento atualizado
6. Se 401 (token expirado) → refresh token e retry
7. Retornar { success, eventId, eventLink, meetLink }
```

**Tratamento de Erros**:
- Token expirado → Refresh automático com `refresh_token`
- Evento não encontrado → Retorna `{ success: false, error: 'Event not found' }`
- Erro de rede → Retorna `{ success: false, error: error.message }`

---

## 🔄 Fluxos de Uso

### Fluxo 1: Lead Pede para Ver Planos

```
┌─────────────────────────────────────────────────────────────┐
│ BANT Stage: TIMING                                          │
│ Specialist Agent está coletando disponibilidade            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead: "antes de marcar, quero conhecer os outros planos"   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Specialist Agent                                            │
│ 1. detectShowPlansIntent(text) → true                       │
│ 2. Busca painType do leadState                              │
│ 3. Busca companySize do BANT                                │
│ 4. formatPlansPresentation({ painType, companySize })       │
│ 5. Retorna mensagem formatada com todos os planos           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead recebe:                                                │
│                                                             │
│ 📦 Planos Leadly Sistema Financeiro:                        │
│                                                             │
│ 💼 Plano Básico - R$ 400/mês                                │
│    ✅ DRE completo                                          │
│    ✅ Fluxo de caixa                                        │
│                                                             │
│ 💎 Plano Médio - R$ 600/mês                                 │
│    ✅ Tudo do Básico + Estoque + CRM                        │
│                                                             │
│ 🚀 Plano Pro - R$ 800/mês                                   │
│    ✅ Completo + Automações                                 │
│                                                             │
│ 💡 Recomendado: Plano Médio                                 │
│    Controle de estoque que você precisa está aqui          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead escolhe plano e continua agendamento                  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo 2: Mudança de Email

```
┌─────────────────────────────────────────────────────────────┐
│ Stage: CONFIRMED                                            │
│ Reunião agendada para 25/11 às 10:00                       │
│ Email: joao@gmail.com                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead: "preciso mudar o email"                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Scheduler Agent                                             │
│ 1. detectChangeType(text) → { type: 'email', detected: true }│
│ 2. handleEmailChange(leadState)                             │
│ 3. Solicita novo email                                      │
│ 4. Atualiza stage → 'updating_email'                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Agent: "Claro! Qual o novo email que você quer usar?"      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead: "joao@empresa.com.br"                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Scheduler Agent - Stage: updating_email                     │
│ 1. detectEmail(text) → joao@empresa.com.br                  │
│ 2. updateEvent(eventId, { attendees: [joao@empresa.com.br] })│
│ 3. Atualiza leadState.scheduler.leadEmail                   │
│ 4. Volta para stage: 'confirmed'                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Agent: "✅ Email atualizado!                                │
│         Agora você vai receber o convite em:               │
│         joao@empresa.com.br"                                │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo 3: Mudança de Horário (Mantém Data)

```
┌─────────────────────────────────────────────────────────────┐
│ Stage: CONFIRMED                                            │
│ Reunião: Segunda-feira (25/11) às 10:00                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead: "pode mudar o horário? Mais tarde seria melhor"      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Scheduler Agent                                             │
│ 1. detectChangeType(text) → { type: 'time', detected: true }│
│ 2. handleTimeChange(leadState)                              │
│ 3. Busca data atual: '2025-11-25'                          │
│ 4. getAvailableTimesForDate('2025-11-25') → ['10:00','15:00']│
│ 5. Atualiza stage → 'updating_time'                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Agent: "Sem problemas! Para segunda-feira (25/11),         │
│         tenho disponível:                                   │
│         • 10:00                                             │
│         • 15:00                                             │
│                                                             │
│         Qual prefere?"                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Lead: "15:00 funciona melhor"                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Scheduler Agent - Stage: updating_time                      │
│ 1. Detecta escolha: "15" → newTime = '15:00'               │
│ 2. updateEvent(eventId, {                                   │
│      date: '2025-11-25',  // Mesma data                     │
│      time: '15:00',       // Novo horário                   │
│      duration: 30                                           │
│    })                                                        │
│ 3. Atualiza leadState.scheduler.selectedSlot.time           │
│ 4. Volta para stage: 'confirmed'                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Agent: "✅ Horário atualizado!                              │
│         Reunião agora é segunda-feira (25/11) às 15:00."   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Cenários de Teste

### Teste 1: Apresentação de Planos Durante BANT

**Setup**: Lead no stage TIMING do BANT

**Input**: "antes de marcar, quero conhecer os outros planos"

**Resultado Esperado**:
- `detectShowPlansIntent()` retorna `true`
- Lead recebe apresentação dos 3 planos
- Recomendação baseada em painType detectado no NEED
- Metadata inclui `showedPlans: true`

### Teste 2: Mudança de Email

**Setup**: Reunião confirmada (stage: confirmed)

**Sequência**:
1. Lead: "preciso mudar o email"
2. Agent: "Qual o novo email?"
3. Lead: "novo@email.com"
4. Agent: "✅ Email atualizado!"

**Validações**:
- `detectChangeType()` detectou `type: 'email'`
- Stage mudou para `updating_email`
- `updateEvent()` foi chamado com `{ attendees: ['novo@email.com'] }`
- `leadState.scheduler.leadEmail` foi atualizado

### Teste 3: Mudança de Horário Apenas

**Setup**: Reunião para 25/11 às 10:00

**Sequência**:
1. Lead: "pode mudar o horário?"
2. Agent: "Para segunda (25/11), tenho: 10:00 / 15:00"
3. Lead: "15:00"
4. Agent: "✅ Horário atualizado! Segunda (25/11) às 15:00"

**Validações**:
- `detectChangeType()` detectou `type: 'time'`
- Data mantida: 2025-11-25
- Horário mudou: 10:00 → 15:00
- `updateEvent()` recebeu `{ date: '2025-11-25', time: '15:00' }`

### Teste 4: Mudança de Data Apenas

**Setup**: Reunião para 25/11 às 15:00

**Sequência**:
1. Lead: "preciso mudar a data"
2. Agent: "Para 15:00, posso: Terça (26/11) / Quarta (27/11)"
3. Lead: "terça"
4. Agent: "✅ Data atualizada! Terça (26/11) às 15:00"

**Validações**:
- `detectChangeType()` detectou `type: 'date'`
- Horário mantido: 15:00
- Data mudou: 25/11 → 26/11
- `updateEvent()` recebeu `{ date: '2025-11-26', time: '15:00' }`

### Teste 5: Remarcar Completo

**Setup**: Reunião agendada

**Sequência**:
1. Lead: "preciso remarcar, não vou conseguir"
2. Agent: "Sem problemas! Qual horário funciona: Seg 10:00 / Ter 15:00?"
3. [Fluxo normal de agendamento recomeça]

**Validações**:
- `detectChangeType()` detectou `type: 'full'`
- Stage resetou para `proposing_times`
- `selectedSlot` e `meetingData` foram limpos
- `leadEmail` foi mantido (não perde)

---

## 📊 Métricas de Código

### Arquivos Criados
- `intent_detectors.js`: 203 linhas
- `plan_presenter.js`: 347 linhas
- **Total**: 550 linhas novas

### Arquivos Modificados
- `specialist_agent.js`: +30 linhas
- `scheduler_agent.js`: +350 linhas
- `calendar_enhanced.js`: +193 linhas
- **Total**: +573 linhas modificadas

### Complexidade
- **Funções criadas**: 14
- **Padrões regex**: 25+
- **Novos stages**: 3 (updating_email, updating_time, updating_date)
- **Handlers**: 4 (email, time, date, full)

### Documentação
- JSDoc completo em todas as funções
- Comentários inline explicativos
- Exemplos de uso em cada JSDoc
- Este relatório de implementação

---

## ✅ Checklist de Qualidade

### Arquitetura
- [x] Separação de responsabilidades (utils vs agents)
- [x] Funções modulares e reutilizáveis
- [x] Single Responsibility Principle
- [x] DRY (Don't Repeat Yourself)
- [x] Naming conventions claras

### Código
- [x] ES6 modules (import/export)
- [x] JSDoc completo
- [x] Error handling com try/catch
- [x] Logging apropriado (console.log)
- [x] Validação de inputs

### Funcionalidades
- [x] Detecção de intenção robusta (múltiplos padrões)
- [x] Apresentação formatada profissional
- [x] Recomendação inteligente baseada em dados
- [x] Reagendamento granular (4 tipos)
- [x] Atualização de Google Calendar

### Integração
- [x] Integração com Specialist Agent
- [x] Integração com Scheduler Agent
- [x] Integração com Calendar Enhanced
- [x] Sincronização de estado (leadState)
- [x] Metadata para tracking

---

## 🚀 Como Usar

### Para Desenvolvedores

#### Adicionar Novo Padrão de Detecção de Planos
```javascript
// Em: src/utils/intent_detectors.js

const patterns = [
  // ... padrões existentes
  /\bnovo padrão aqui\b/i
];
```

#### Adicionar Novo Plano
```javascript
// Em: src/tools/bant_stages_v2.js (assumindo que PLANS está lá)

export const PLANS = {
  // ... planos existentes
  enterprise: {
    nome: 'Enterprise',
    precoAnual: 1500,
    precoMensal: 2000,
    features: [
      'Tudo do Pro',
      'Suporte dedicado 24/7',
      'Customizações'
    ],
    criterios: {
      funcionariosMin: 50
    }
  }
};
```

#### Customizar Horários Disponíveis
```javascript
// Em: src/agents/scheduler_agent.js

getAvailableTimesForDate(date) {
  // Adicionar mais horários
  return ['09:00', '10:00', '14:00', '15:00', '16:00'];
}
```

### Para Usuários (Leads)

#### Como Ver Todos os Planos
Diga qualquer uma destas frases:
- "quero conhecer os outros planos"
- "quais são os planos disponíveis?"
- "me mostre todos os planos"
- "quanto custa cada plano?"

#### Como Mudar Apenas o Email
- "preciso mudar o email"
- "email errado"
- "outro email"

#### Como Mudar Apenas o Horário
- "pode mudar o horário?"
- "tem mais tarde?"
- "pode ser mais cedo?"

#### Como Mudar Apenas a Data
- "preciso mudar a data"
- "outro dia"
- "outra data"

#### Como Remarcar Tudo
- "preciso remarcar"
- "não vou conseguir"
- "cancelar e remarcar"

---

## 🐛 Debugging

### Logs Importantes

#### Detecção de Planos
```bash
📦 [SPECIALIST] Lead pediu para ver planos - stage: timing
   📊 Dados: painType=estoque, companySize=6-10, revenue=50000
```

#### Detecção de Mudança
```bash
🔄 [SCHEDULER] Mudança detectada - tipo: email
🔄 [SCHEDULER] Mudança detectada - tipo: time
🔄 [SCHEDULER] Mudança detectada - tipo: date
🔄 [SCHEDULER] Mudança detectada - tipo: full
```

#### Atualização de Evento
```bash
📅 [CALENDAR] Atualizando evento abc123
   ✅ Novos attendees: joao@empresa.com.br
   ✅ Nova data: 2025-11-26
   ✅ Novo horário: 15:00
```

### Problemas Comuns

#### Problema: Planos não são apresentados
**Possível Causa**: Padrão não detectado por `detectShowPlansIntent()`

**Solução**:
1. Verificar log: "Lead pediu para ver planos" não aparece
2. Adicionar novo padrão em `intent_detectors.js`
3. Testar com regex online (regex101.com)

#### Problema: Mudança não é detectada
**Possível Causa**: Padrão não detectado por `detectChangeType()`

**Solução**:
1. Verificar log: "Mudança detectada" não aparece
2. Adicionar novo padrão no detector específico (email/time/date/full)
3. Verificar se há conflito (ex: mensagem tem "dia" E "hora")

#### Problema: Evento não é atualizado
**Possível Causa**: Token OAuth expirado ou eventId inválido

**Solução**:
1. Verificar se `google_token.json` existe
2. Verificar se `eventId` não é null
3. Checar se token tem `refresh_token`
4. Ver logs do Google Calendar API

---

## 📚 Referências

### Arquivos Relacionados
- `src/tools/bant_stages_v2.js` - Sistema BANT e constante PLANS
- `src/config/services_catalog.js` - Catálogo de serviços
- `src/agents/sdr_agent.js` - Primeiro agente (handoff para Specialist)
- `src/handlers/UnifiedMessageCoordinator.js` - Coordenador de mensagens

### Padrões de Código
- ES6 Modules (import/export)
- JSDoc para documentação
- Singleton pattern para agents
- Stage-based state machines
- Async/await para operações assíncronas

### APIs Externas
- Google Calendar API v3
- OAuth 2.0 para autenticação
- WhatsApp via Evolution API

---

## 🎯 Próximos Passos Recomendados

### P0 (Crítico)
1. **Testar em Produção**: Validar fluxos com usuários reais
2. **Monitorar Métricas**: Taxa de uso de cada funcionalidade
3. **Ajustar Padrões**: Adicionar novos padrões baseado em casos reais não detectados

### P1 (Importante)
1. **A/B Testing**: Comparar taxa de conversão com/sem apresentação de planos
2. **Analytics**: Trackear qual plano é mais escolhido após apresentação
3. **Feedback Loop**: Coletar razões quando lead não escolhe plano recomendado

### P2 (Desejável)
1. **UI Melhorias**: Adicionar botões interativos (se WhatsApp suportar)
2. **Personalização**: Ajustar mensagens baseado em histórico do lead
3. **Integrações**: Conectar com CRM para automatizar follow-up

---

## ✨ Conclusão

Implementação completa e profissional de duas funcionalidades críticas:

1. **Apresentação Inteligente de Planos**: Sistema robusto que detecta quando lead quer ver opções, formata apresentação consultiva e recomenda plano ideal baseado em perfil.

2. **Reagendamento Granular**: Permite mudanças cirúrgicas (email, horário ou data) sem precisar remarcar tudo, melhorando UX drasticamente.

**Qualidade de Código**: Modular, documentado, testável e escalável.

**Próximo Marco**: Validação em produção com usuários reais.

---

**Documento criado por**: Claude Code
**Data**: 2025-11-20
**Versão**: 1.0.0
**Status**: ✅ Concluído
