# RESUMO EXECUTIVO - MODIFICAÇÕES PARA REFATORAÇÃO DOS 3 AGENTES

## TL;DR - Pontos Críticos para Implementação

### 1. ESTRUTURA DE DADOS ATUAL
```
leadState (único estado por contato):
├── phoneNumber: "5584987654321"
├── currentAgent: "sdr|specialist|scheduler"
├── messageCount: 5
├── companyProfile: { nome, empresa, setor }  // Coletado pelo SDR
├── bantStages: { stageData: { need: { campos }, budget: {...}, ... } }
├── scheduler: { stage, leadEmail, proposedSlots, selectedSlot, meetingData }
└── metadata: { createdAt, updatedAt, conversationCompleted, ... }
```

**Armazenamento**: SQLite (`orbion.db`) - tabela `lead_states`
**Sincronização**: AgentHub.processMessage() → saveLeadState() → banco

---

## 2. FLUXOS DE HANDOFF (Pontos de Integração)

### 2.1 SDR → Specialist
```
SDR coleta dados brutos (rawResponse)
    ↓
Retorna: handoff=true, nextAgent='specialist'
         handoffData: { companyProfile: { rawResponse } }
    ↓
AgentHub.executeHandoff() chama specialist.onHandoffReceived()
    ↓
Specialist extrai com GPT: { nome, empresa, setor }
    ↓
Inicializa BANTStagesV2
    ↓
Retorna: message + updateState com bantStages e companyProfile
```

### 2.2 Specialist → Scheduler
```
Specialist coleta BANT (4 stages completos)
    ↓
Retorna: handoff=true, nextAgent='scheduler'
         handoffData: { bantStages: system.getState() }
    ↓
AgentHub.executeHandoff() chama scheduler.onHandoffReceived()
    ↓
Scheduler retorna: message pedindo email
    ↓
Scheduler coleta email → propõe horários → cria evento → cria Pipeline
```

---

## 3. ONDE DADOS SÃO ARMAZENADOS

### 3.1 SETOR/NICHO (CRÍTICO para personalização)

**Coletado pelo SDR**:
- `leadState.companyProfile.setor` - Detectado com GPT a partir do rawResponse

**Usado pelo Specialist**:
- `bantSystem.companyProfile.setor` - Para personalizar perguntas BANT
- `replacePlaceholders()` - Substitui [SETOR] nas mensagens
- GPT prompt context - "Em [SETOR], o problema geralmente é..."

**Exemplo de fluxo**:
```
Lead diz: "Tenho uma clínica, pacientes não aparecem"
    ↓
SDR armazena rawResponse
    ↓
Specialist extrai: setor = "Clínica"
    ↓
Specialist.bantSystem.setCompanyProfile({ setor: "Clínica" })
    ↓
GPT recebe context: "👤 SETOR: Clínica"
    ↓
GPT responde consultiva adaptada ao nicho
```

### 3.2 CAMPOS BANT (Armazenamento Canônico)

```
leadState.bantStages.stageData:
└── need
    └── campos: {
        problema_principal: "Pacientes não aparecem",
        servico_identificado: "crm",  // Auto-classificado
        intensidade_problema: "Crítico",
        consequencias: "Perda de receita",
        receita_mensal: "R$ 30.000",
        funcionarios: "3-5"
    }
└── budget
    └── campos: {
        faixa_investimento: "R$ 297",
        roi_esperado: "Reduzir no-shows",
        flexibilidade_budget: "Flexível"
    }
└── authority
    └── campos: {
        decisor_principal: "Dono",
        autonomia_decisao: "Autonomia total",
        processo_decisao: "Rápido"
    }
└── timing
    └── campos: {
        urgencia: "Urgente",
        prazo_ideal: "Esta semana"
    }
```

**Acesso no Scheduler**:
```javascript
const needData = leadState.bantStages.stageData.need.campos;
const budgetData = leadState.bantStages.stageData.budget.campos;
const authorityData = leadState.bantStages.stageData.authority.campos;
const timingData = leadState.bantStages.stageData.timing.campos;

// Para Pipeline:
opportunityData = {
  nome: leadState.companyProfile.nome,
  empresa: leadState.companyProfile.empresa,
  setor: leadState.companyProfile.setor,
  dor: needData.problema_principal,
  valor: budgetData.faixa_investimento,
  urgencia: timingData.urgencia,
  // ...
}
```

---

## 4. 5 MUDANÇAS PARA REFATORAÇÃO

### MUDANÇA A: Adicionar "NICHO" ao Stage NEED

**Objetivo**: Detectar nicho automaticamente para personalização

**Arquivo**: `src/tools/bant_stages_v2.js` - Linhas 30-60

**Mudanças**:
```javascript
// 1. Adicionar campo ao STAGE_REQUIREMENTS[need]:
camposEssenciais: [
  'nicho',  // ← NOVO - essencial
  'problema_principal',
  'servico_identificado',
  'intensidade_problema',
  'consequencias',
  'receita_mensal',
  'funcionarios'
],

// 2. Adicionar scoring:
scoring: {
  nicho: 15,  // ← NOVO
  problema_principal: 25,
  // ... resto
},

// 3. Atualizar scoreMinimo:
scoreMinimo: 115,  // 7 campos = 115 pts

// 4. Atualizar openingMessage:
openingMessage: `Show, obrigado por responder!

📝 Só pra eu entender melhor:
• Qual é seu nicho? (mercadinho, clínica, restaurante, etc)
• Você trabalha sozinho ou com mais gente?

E no financeiro, o que mais pega pra você?`,

// 5. Adicionar descrição:
descricaoCampos: {
  nicho: 'Qual é o seu nicho/ramo de atuação?',
  // ... resto
}
```

**Impacto**:
- Schema: Nenhum (nicho já existirá em `companyProfile.setor`)
- BANTSystem: Novo campo no stage NEED
- Especialização: Enables personalização por nicho

---

### MUDANÇA B: Personalizar BUDGET com Contexto do Lead

**Objetivo**: Ajustar preço proposto baseado em nicho e receita

**Arquivo**: `src/tools/bant_stages_v2.js` - Método `analyzeWithGPT()` (~linha 467)

**Mudanças**:
```javascript
// 1. ANTES de preparar prompt, extrair contexto:
const nicho = this.stageData['need'].campos.nicho;
const receita = this.stageData['need'].campos.receita_mensal;
const problema = this.stageData['need'].campos.problema_principal;

let budgetContext = '';
if (stage === 'budget' && nicho && receita) {
  budgetContext = `
📊 CONTEXTO DO LEAD:
• Nicho: ${nicho}
• Faturamento: ${receita}
• Problema: ${problema}

SUGESTÃO POR NICHO:
Mercadinho: R$ 197-297
Clínica: R$ 297-497
Restaurante: R$ 497-997
`;
}

// 2. Incluir no prompt (que vai para GPT):
const prompt = `${historyContext}${profileContext}${budgetContext}...`;
```

**Impacto**:
- GPT recebe contexto de preço por nicho
- Respostas personalizadas por setor
- Facilita venda e ROI cálculo

---

### MUDANÇA C: Adicionar Roteiro de Objeção de Preço

**Objetivo**: Responder "é caro" com ROI da solução

**Novo Arquivo**: `src/tools/price_objection_handler.js`

**Estrutura**:
```javascript
export class PriceObjectionHandler {
  static detectPriceObjection(message) {
    // Regex para detectar "caro", "apertado", etc
    return /caro|muito caro|apertado/i.test(message);
  }

  static async handleObjection(leadState, message) {
    // 1. Extrair contexto
    const receita = leadState.bantStages.stageData.need.campos.receita_mensal;
    const nicho = leadState.bantStages.stageData.need.campos.nicho;
    const problema = leadState.bantStages.stageData.need.campos.problema_principal;

    // 2. Calcular ROI estimado
    const roiEstimado = this.calculateROI(receita, nicho, problema);
    // Ex: Se problema custa 5% da receita (2.500/mês) e plano custa R$ 197
    // ROI = 12.7x (paga em 2 dias)

    // 3. Usar GPT para responder consultivo
    const response = await gpti_response("Responda objeção de preço...");
    return response;
  }

  static calculateROI(receita, nicho, problema) {
    // Lógica: estimar quanto o problema custa
    // Por exemplo:
    // - "Não sabe lucro" + Faturamento R$ 50k = estimado custo 5% = R$ 2.500
    // - Plano R$ 197 = ROI 12.7x
  }
}
```

**Integração em bant_stages_v2.js**:
```javascript
// Na função analyzeWithGPT(), após receber resultado do GPT:
if (stage === 'budget') {
  const isPriceObjection = PriceObjectionHandler.detectPriceObjection(userMessage);
  if (isPriceObjection) {
    const objectionResponse = await PriceObjectionHandler.handleObjection(leadState, userMessage);
    analysis.resposta_consultiva = objectionResponse;
  }
}
```

**Impacto**:
- Lidia com objeções mais naturalmente
- Mostra ROI tangível
- Aumenta taxa de conversão

---

### MUDANÇA D: Regra "1 Pergunta por Mensagem"

**Objetivo**: Validar que GPT nunca faz 2+ perguntas

**Arquivo**: `src/tools/bant_stages_v2.js` - Método `analyzeWithGPT()` (~linha 600)

**Mudanças**:
```javascript
// Após receber resposta do GPT:
const response = await openaiClient.chat.completions.create({...});
let consultiveResponse = response.choices[0].message.content.trim();

// ✅ VALIDAÇÃO: Garantir máximo 1 pergunta
const questionCount = (consultiveResponse.match(/\?/g) || []).length;

if (questionCount > 1) {
  console.warn(`⚠️ [BANT] GPT retornou ${questionCount} perguntas - removendo extras`);
  
  // Remover pergunta secundária (padrão: "E você...", "Como...")
  consultiveResponse = consultiveResponse
    .replace(/\n\n(E |Você |Como |Qual ).+\?/i, '');
  
  // Se ainda tiver múltiplas, manter apenas primeira
  const parts = consultiveResponse.split('?');
  if (parts.length > 2) {
    consultiveResponse = parts[0] + '?';
  }
}

return {
  campos_coletados: {...},
  resposta_consultiva: consultiveResponse
};
```

**Impacto**:
- Respostas mais naturais
- Sem "pergunta dupla" confundindo lead
- Melhor UX

---

### MUDANÇA E: Limite de Tamanho de Mensagem

**Objetivo**: Truncar respostas muito longas

**Arquivo**: `src/tools/bant_stages_v2.js` - Método `analyzeWithGPT()` (~linha 620)

**Mudanças**:
```javascript
// Após validação de pergunta:
const MAX_MESSAGE_SIZE = 500;  // caracteres

if (consultiveResponse.length > MAX_MESSAGE_SIZE) {
  console.warn(`⚠️ [BANT] Mensagem longa (${consultiveResponse.length} chars)`);
  
  // Truncar mantendo pergunta
  const lastQuestion = consultiveResponse.lastIndexOf('?');
  if (lastQuestion > MAX_MESSAGE_SIZE) {
    // Truncar antes da pergunta e adicionar ?
    consultiveResponse = consultiveResponse
      .substring(0, MAX_MESSAGE_SIZE)
      .trim() + '?';
  }
}

return {
  campos_coletados: {...},
  resposta_consultiva: consultiveResponse
};
```

**Impacto**:
- WhatsApp UI melhor (mensagens longas são desagradáveis)
- Força respostas concisos
- Melhora engagement

---

## 5. MATRIZ DE IMPLEMENTAÇÃO

| ID | Mudança | Arquivo | Método | Tipo | Complexidade | Dependências |
|----|---------|---------|--------|------|--------------|--------------|
| A | Adicionar nicho | bant_stages_v2.js | STAGE_REQUIREMENTS | Config | Baixa | - |
| - | Schema update | leadState.schema.js | LEAD_STATE_SCHEMA | Config | Baixa | - |
| B | Budget personalizado | bant_stages_v2.js | analyzeWithGPT() | Logic | Média | A |
| C | Objeção preço | price_objection_handler.js (NEW) | - | New | Média | A, B |
| D | 1 pergunta | bant_stages_v2.js | analyzeWithGPT() | Logic | Baixa | - |
| E | Tamanho máx | bant_stages_v2.js | analyzeWithGPT() | Logic | Baixa | - |

---

## 6. ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Fundamentação (Mudança A)
1. Adicionar campo `nicho` ao STAGE_REQUIREMENTS[need]
2. Atualizar schema em leadState.schema.js
3. Testar: Lead coleta nicho no NEED

### Fase 2: Personalização (Mudança B)
1. Implementar budgetContext em analyzeWithGPT()
2. Testar: BUDGET oferece preço diferente por nicho

### Fase 3: Tratamento de Objeções (Mudança C)
1. Criar price_objection_handler.js
2. Integrar em bant_stages_v2.js
3. Testar: Objeção de preço detectada e respondida

### Fase 4: Qualidade de Resposta (Mudanças D, E)
1. Implementar validação de pergunta (D)
2. Implementar validação de tamanho (E)
3. Testar: Mensagens têm no máx 1 pergunta e 500 chars

---

## 7. CHECKLIST DE VALIDAÇÃO

### Dados Corretos
- [ ] leadState.companyProfile.setor populado pelo SDR
- [ ] bantStages.stageData.need.campos contém nicho após NEED
- [ ] bantStages.stageData.budget.campos contém faixa_investimento
- [ ] scheduler.meetingData preenchido ao agendar

### Handoffs Funcionando
- [ ] SDR → Specialist: companyProfile.rawResponse coletado
- [ ] Specialist → Scheduler: bantStages.isComplete = true
- [ ] Scheduler: meetingData.eventId preenchido

### Personalização
- [ ] BUDGET message varia por nicho
- [ ] GPT recebe budgetContext com sugestão de preço
- [ ] Objeção de preço detectada e tratada

### Qualidade
- [ ] Respostas têm exatamente 1 pergunta
- [ ] Resposta nunca ultrapassa 500 caracteres
- [ ] No máximo 1 emoji por mensagem

### Persistência
- [ ] leadState salvo após cada mudança
- [ ] Google Sheets sincroniza com setor e nicho
- [ ] Pipeline criado com todos os dados BANT

---

## 8. ARQUIVOS ESPECÍFICOS A MODIFICAR

### 8.1 Necessários
```
src/tools/bant_stages_v2.js        (4 mudanças: A, B, D, E)
src/schemas/leadState.schema.js    (1 mudança: A - reflex no schema)
src/tools/price_objection_handler.js (NOVO - mudança C)
```

### 8.2 Teste
```
test/test_bant_nicho.js            (NOVO - testar mudança A)
test/test_budget_personalization.js (NOVO - testar mudança B)
test/test_price_objection.js       (NOVO - testar mudança C)
test/test_message_quality.js       (NOVO - testar mudanças D, E)
```

### 8.3 Não Modificar (Mantém compatibilidade)
```
src/agents/sdr_agent.js
src/agents/specialist_agent.js
src/agents/scheduler_agent.js
src/agents/agent_hub.js
src/utils/stateManager.js
src/handlers/UnifiedMessageCoordinator.js
```

---

## 9. EXEMPLO DE FLUXO COMPLETO COM MUDANÇAS

```
LEAD: "Oi, tenho uma clínica"

SDR: "Show, qual seu nome e empresa?"
LEAD: "João, Clínica Nova"
SDR → SPECIALIST (handoff com rawResponse)

SPECIALIST (após extrair com GPT):
setCompanyProfile({ nome: "João", empresa: "Clínica Nova", setor: "Clínica" })
Mensagem NEED:
"E aí João, entendi que Clínica Nova atua em Clínica.
📝 Qual é seu principal desafio: pacientes que não aparecem, convênio atrasado, ou gestão de horários?"

LEAD: "Pacientes não aparecem"

SPECIALIST (GPT com contexto):
profileContext = "Setor: Clínica"
análise extrai: problema_principal = "Pacientes não aparecem"
classificacao = "crm" (CRM detectado)
servico_identificado = "crm"

Mensagem nextagem:
"No-show em clínica é prejuízo duplo: perde o horário E tem custo fixo.
E aí, quantos pacientes por dia vocês atendem?"

LEAD: "15 a 20"

SPECIALIST avança para BUDGET...
budgetContext = "Setor: Clínica, Receita: ~15-20 pacientes = ~R$ 15-30k/mês"
openingMessage oferece: R$ 297 (clínica) ao invés de R$ 197

LEAD: "É muito caro"

SPECIALIST detecta objeção:
PriceObjectionHandler.detectPriceObjection() = true
ROI calculado: Se perdem 2 pacientes/dia × R$ 100 = R$ 2.000/mês
R$ 297 se paga em 5 dias

Resposta: "Entendo que R$ 297 é um custo. Mas pensa: 
se você tá perdendo 2 pacientes/dia por falta de lembrete, 
são R$ 2.000 perdidos por mês. R$ 297 se paga em 5 dias. Topa?"

LEAD: "Vamo isso"

SPECIALIST continua e completa BANT...
SPECIALIST → SCHEDULER (handoff)

SCHEDULER coleta email → propõe horários → cria Google Calendar + Pipeline

PIPELINE (Google Sheets):
nome: João
empresa: Clínica Nova
setor: Clínica          ← De companyProfile
dor: Pacientes não aparecem  ← De need.campos.problema_principal
valor: R$ 297          ← De budget.campos.faixa_investimento
decisor: João          ← De authority.campos.decisor_principal
urgencia: Alta         ← De timing.campos.urgencia
data_reuniao: 2024-11-20
```

---

## 10. VALIDAÇÃO PÓS-IMPLEMENTAÇÃO

### Testes Manuais
1. Lead novo completa fluxo SDR → Specialist → Scheduler
2. Verificar que nicho é coletado no NEED
3. Verificar que BUDGET oferece preço por nicho
4. Verificar que objeção de preço é detectada
5. Verificar que cada mensagem tem no máx 1 pergunta
6. Verificar que nenhuma mensagem ultrapassa 500 chars

### Testes Automatizados
- [ ] test_bant_nicho.js - Nicho coletado corretamente
- [ ] test_budget_personalization.js - Preço varia por nicho
- [ ] test_price_objection.js - Objeção detectada e respondida
- [ ] test_message_quality.js - 1 pergunta, máx 500 chars

### Validação de Dados
- [ ] Google Sheets tem coluna "setor" preenchida
- [ ] Pipeline mostra nicho, faturamento, dor
- [ ] Todas as linhas de oportunidade têm dados BANT completos

