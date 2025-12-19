# FAQ ARCHITECTURE ANALYSIS - Sistema de Respostas ORBION
**Data:** 2025-11-13 15:17
**Status:** 📊 ANÁLISE COMPLETA

---

## 🎯 OBJETIVO DA ANÁLISE

Usuário solicitou:
> "acho que temos que reformular o faq tbm, o prompt, temos que saber o que esta sendo perguntado com '?' se e sobre a digitalboost, se e sobre valores, se e sobre servicos os agentes sdr, specialist e scheluder nao devem responder nada, perguntas feitas fora do scopo deles devem ser respondida por uma logica diferente que traz as respostas com um prompt bem estruturado, veja como esta o prompt do faq e veja se tem outras logicas que podem ser uteis de respostas e una em uma so logica para nao haver conflitos"

**Objetivo:** Unificar todas as lógicas de resposta em um sistema único e consistente.

---

## 📁 SISTEMAS DE RESPOSTA IDENTIFICADOS

### 1. **FAQ_RESPONSES** (src/tools/faq_responses.js)
**Tamanho:** 341 linhas
**Método:** Keyword matching manual
**Categorias:**
- `valores` - Perguntas sobre preços/valores
- `sobre_empresa` - Perguntas sobre Digital Boost
- `servicos` - Perguntas sobre o que fazem
- `socios` - Perguntas sobre fundadores/equipe
- `contato_demo` - Pedidos de contato/demonstração
- `cases_resultados` - Cases de sucesso
- `tecnicas` - Perguntas técnicas (stack, segurança)

**Problema atual:**
- ❌ Detecção por keyword matching simples (não entende contexto)
- ❌ Sem classificação GPT
- ❌ Múltiplas respostas por categoria (escolhe aleatória)
- ❌ Não tem mecanismo de retorno ao fluxo

**Exemplo de resposta:**
```javascript
valores: {
  keywords: ['quanto custa', 'qual o preço', ...],
  responses: [
    {
      contexto: 'geral',
      mensagem: `Boa pergunta sobre valores!

      Nossos planos variam de R$ 2.000 a R$ 8.000/mês...

      Pra eu montar uma proposta mais certeira: qual o principal problema...`
    }
  ]
}
```

---

### 2. **ContextualRedirect** (src/tools/contextual_redirect.js)
**Tamanho:** 525 linhas
**Método:** Keyword matching + Template de 4 partes
**Categorias:**
- `weather` - Clima/tempo
- `sports` - Futebol/esportes
- `traffic` - Trânsito
- `food` - Alimentação
- `personal_health` - Saúde pessoal
- `events` - Festas/eventos
- `general_tech` - Tecnologia genérica
- `personal_sensitive` - Situações sensíveis (doença, acidente, morte)
- `personal_life` - Família
- `hobbies` - Hobbies
- `animals` - Pets
- `generic_offtopic` - Catch-all

**Estrutura de resposta (4 partes obrigatórias):**
1. **PARTE 1:** Resposta empática contextualizada (1-2 frases)
2. **PARTE 2:** Reflexão/conselho sobre o assunto (1-2 frases)
3. **PARTE 3:** Gancho de comparação (conecta ao negócio)
4. **PARTE 4:** Proposta de solução + pergunta de retorno

**Exemplo (Cavalos):**
```
User: "O que um cavalo faz?"
ORBION: "Cavalos são incríveis! Você tem ou está pensando em ter um? 🐴

Cuidar de um cavalo exige atenção constante, todos os dias, sem falhar.

Igual ao atendimento aos clientes que também precisa dessa mesma consistência.

Nossos agentes de IA garantem que nenhum lead fique sem resposta. Quer ver?"
```

**Problema atual:**
- ✅ Estrutura bem definida (4 partes)
- ✅ Sempre retorna ao negócio
- ❌ Prompt muito longo (438 linhas!) injetado no system
- ❌ Não usa GPT para classificação, só keywords
- ❌ Separado do FAQ (causa conflitos)

---

### 3. **ResponseOptimizer** (src/tools/response_optimizer.js)
**Tamanho:** 346 linhas
**Método:** Pós-processamento de respostas
**Função:**
- Reduz respostas longas (max 350 chars para WhatsApp)
- Limita frases (max 3)
- Limita perguntas (max 1)
- Remove frases desnecessárias
- Simplifica conectivos

**Problema atual:**
- ✅ Funciona bem para otimizar tamanho
- ❌ Não está integrado com FAQ
- ❌ Aplica pós-processamento, não guia criação

---

### 4. **IntentClassifier** (src/intelligence/IntentClassifier.js)
**Tamanho:** 187 linhas
**Método:** Regex + GPT classification
**Função:**
- Detecta se mensagem é pergunta explícita (`endsWith('?')`)
- Chama `detectFAQ()` se for pergunta
- Classifica intent geral (greeting, objection, positive_interest, bant_response, statement)

**Problema atual:**
- ✅ Simplificado recentemente (só "?" = pergunta)
- ✅ Separa FAQ de BANT responses
- ❌ Não usa GPT para classificar FAQ
- ❌ Não retorna ao fluxo após FAQ

---

## 🔍 ANÁLISE DO FLUXO ATUAL

### Fluxo de Processamento de Mensagem:

```
Webhook Handler
    ↓
MessagePipeline
    ├── Layer 1: Security (bot detection)
    ├── Layer 2: Interceptors (opt-out)
    ├── Layer 3: Intent Classification
    │   ├── detectFAQ() ← KEYWORD MATCHING
    │   │   └── FAQ_RESPONSES.js
    │   └── detectGeneralIntent()
    └── Layer 4: Agent Processing
        ├── SDR Agent
        ├── Specialist Agent (BANT)
        └── Scheduler Agent
```

**Problema identificado:**
1. ✅ FAQ detectado apenas para `endsWith('?')` (correto)
2. ❌ FAQ usa keyword matching simples (não entende contexto)
3. ❌ ContextualRedirect não está integrado no pipeline
4. ❌ Sem mecanismo de retorno ao fluxo após FAQ
5. ❌ Agentes (SDR/Specialist/Scheduler) recebem perguntas off-scope

---

## 🎯 PROPOSTA DE NOVA ARQUITETURA

### **UNIFIED FAQ SYSTEM** (Sistema Unificado)

#### Estrutura:

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED FAQ SYSTEM                       │
│                                                             │
│  1. GPT-based Intent Classification                         │
│     ├── Business Questions (valores, serviços, empresa)     │
│     ├── Off-topic Redirects (clima, futebol, etc)          │
│     └── Sensitive Topics (doença, acidente)                 │
│                                                             │
│  2. Response Generation with GPT                            │
│     ├── Structured prompt per category                      │
│     ├── Context-aware responses                             │
│     └── Automatic flow return                               │
│                                                             │
│  3. Post-processing                                         │
│     ├── Response optimization (length)                      │
│     └── Quality validation                                  │
└─────────────────────────────────────────────────────────────┘
```

---

### **NOVA LÓGICA - 3 CAMADAS**

#### **CAMADA 1: FAQ DETECTION & CLASSIFICATION**

**Arquivo:** `src/intelligence/UnifiedFAQSystem.js` (NOVO)

```javascript
/**
 * Detecta se é FAQ e classifica via GPT
 * @param {string} messageText - Mensagem com "?"
 * @param {Object} context - Contexto do lead
 * @returns {Object} - { isFAQ, category, confidence, shouldBlock }
 */
async classifyFAQIntent(messageText, context) {
  // 1. Verificar se termina com "?"
  if (!messageText.trim().endsWith('?')) {
    return { isFAQ: false };
  }

  // 2. Classificar via GPT
  const classification = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: FAQ_CLASSIFICATION_PROMPT
    }, {
      role: 'user',
      content: messageText
    }],
    temperature: 0.3 // Baixa para consistência
  });

  // Resposta esperada: { category, confidence, isBusinessRelated }
  const result = JSON.parse(classification.choices[0].message.content);

  return {
    isFAQ: true,
    category: result.category,
    confidence: result.confidence,
    shouldBlock: result.isBusinessRelated // Bloqueia agentes se for FAQ
  };
}
```

**Categorias de FAQ:**
- `business.pricing` - Valores/preços
- `business.services` - O que fazem
- `business.company` - Sobre Digital Boost
- `business.team` - Sócios/equipe
- `business.demo` - Demonstração
- `business.cases` - Cases de sucesso
- `business.technical` - Stack técnico
- `offtopic.weather` - Clima
- `offtopic.sports` - Esportes
- `offtopic.personal` - Vida pessoal
- `sensitive.health` - Saúde/doença
- `sensitive.accident` - Acidente/emergência
- `blocked` - Tópico bloqueado (política, religião)

---

#### **CAMADA 2: RESPONSE GENERATION**

**Arquivo:** `src/intelligence/UnifiedFAQSystem.js` (NOVO)

```javascript
/**
 * Gera resposta via GPT baseado na categoria
 * @param {string} messageText - Pergunta original
 * @param {Object} classification - Resultado da classificação
 * @param {Object} context - Contexto do lead
 * @returns {string} - Resposta formatada
 */
async generateFAQResponse(messageText, classification, context) {
  const { category } = classification;

  // Selecionar prompt baseado na categoria
  let systemPrompt;

  if (category.startsWith('business.')) {
    systemPrompt = buildBusinessFAQPrompt(category, context);
  } else if (category.startsWith('offtopic.')) {
    systemPrompt = buildRedirectPrompt(category, context);
  } else if (category.startsWith('sensitive.')) {
    systemPrompt = buildSensitivePrompt(category, context);
  }

  // Gerar resposta via GPT
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: messageText
    }],
    temperature: 0.7,
    max_tokens: 300 // Limita tamanho
  });

  return response.choices[0].message.content;
}
```

---

#### **CAMADA 3: FLOW RETURN (RETORNO AO FLUXO)**

**Arquivo:** `src/intelligence/UnifiedFAQSystem.js` (NOVO)

```javascript
/**
 * Adiciona instrução de retorno ao fluxo
 * @param {string} faqResponse - Resposta do FAQ
 * @param {Object} context - Contexto do lead
 * @returns {string} - Resposta + retorno ao fluxo
 */
addFlowReturnMessage(faqResponse, context) {
  const { currentAgent, bantStages } = context;

  let returnMessage = '';

  // Se estava no BANT, volta para pergunta pendente
  if (currentAgent === 'specialist' && bantStages?.currentStage) {
    returnMessage = `\n\n✅ Respondido! Agora voltando à nossa conversa: ${bantStages.lastQuestion}`;
  }
  // Se estava no SDR, volta para qualificação inicial
  else if (currentAgent === 'sdr') {
    returnMessage = '\n\n✅ Tudo esclarecido? Me conta mais sobre o negócio de vocês pra eu ajudar melhor!';
  }
  // Se estava no Scheduler, volta para agendamento
  else if (currentAgent === 'scheduler') {
    returnMessage = '\n\n✅ Perfeito! Voltando ao agendamento: qual horário funciona melhor pra você?';
  }

  return faqResponse + returnMessage;
}
```

---

### **PROMPTS ESTRUTURADOS**

#### **FAQ_CLASSIFICATION_PROMPT:**

```
Você é um classificador de perguntas para o sistema ORBION.

TAREFA: Classifique a pergunta do usuário em uma das categorias abaixo.

CATEGORIAS BUSINESS (perguntas sobre Digital Boost):
- business.pricing: Perguntas sobre valores, preços, quanto custa
- business.services: O que a empresa faz, quais serviços oferece
- business.company: Sobre a Digital Boost, história, propósito
- business.team: Sócios, fundadores, equipe
- business.demo: Pedidos de demonstração, contato
- business.cases: Cases de sucesso, resultados, clientes
- business.technical: Stack técnico, segurança, integrações

CATEGORIAS OFF-TOPIC (perguntas fora do negócio):
- offtopic.weather: Clima, tempo, temperatura
- offtopic.sports: Futebol, esportes, jogos
- offtopic.traffic: Trânsito, congestionamento
- offtopic.food: Comida, restaurantes
- offtopic.personal: Vida pessoal, família, hobbies
- offtopic.animals: Pets, animais

CATEGORIAS SENSÍVEIS (requerem empatia extra):
- sensitive.health: Doença, hospital, problema de saúde
- sensitive.accident: Acidente, emergência grave
- sensitive.loss: Morte, falecimento, luto

BLOCKED (não respondemos):
- blocked: Política partidária, religião específica, drogas ilegais

RESPONDA EM JSON:
{
  "category": "business.pricing",
  "confidence": 0.95,
  "isBusinessRelated": true
}
```

---

#### **BUSINESS FAQ PROMPT (exemplo: pricing):**

```
Você é ORBION, agente IA da Digital Boost.

CONTEXTO: Lead fez pergunta sobre VALORES/PREÇOS.

OBJETIVO: Responder de forma clara e consultiva.

ESTRUTURA DA RESPOSTA (3 partes):

1. RESPOSTA DIRETA (2-3 frases)
   - Responda a pergunta objetivamente
   - Seja transparente sobre valores

2. VALOR AGREGADO (1-2 frases)
   - Mencione ROI/payback/resultados típicos
   - Mostre que não é custo, é investimento

3. CALL-TO-ACTION (1 pergunta)
   - Faça pergunta para continuar qualificação
   - Conecte ao problema deles

EXEMPLO:
"Boa pergunta! Nossos planos variam de R$ 2k a R$ 8k/mês dependendo do volume.

A maioria dos clientes recupera o investimento em 4-6 meses com aumento nas vendas.

Pra montar proposta certeira: qual o principal desafio — atendimento, vendas ou leads?"

REGRAS:
- Máximo 3 frases
- Máximo 1 pergunta
- Tom consultivo (não vendedor agressivo)
- Sempre retorne ao fluxo de qualificação

INFORMAÇÕES DA DIGITAL BOOST:
- Plano Inicial: R$ 2-3k/mês (até 1.500 conversas)
- Plano Crescimento: R$ 5-6k/mês (até 5.000 conversas)
- Plano Enterprise: R$ 8k+/mês (ilimitado)
- ROI médio: 4-6 meses
- Resultados: +40% vendas, -60% tempo atendimento
```

---

#### **REDIRECT PROMPT (exemplo: sports):**

```
Você é ORBION, agente IA da Digital Boost.

CONTEXTO: Lead fez pergunta OFF-TOPIC sobre ESPORTES.

OBJETIVO: Responder com empatia e redirecionar ao negócio naturalmente.

ESTRUTURA DA RESPOSTA (4 partes - FORMATO CONTEXTUAL REDIRECT):

1. EMPATIA GENUÍNA (1 frase + pergunta)
   - Mostre interesse real no assunto
   - Faça pergunta de follow-up
   - Exemplo: "Vi sim! Foi emocionante né?"

2. REFLEXÃO SOBRE O TEMA (1-2 frases)
   - Faça observação sobre aquele assunto
   - Use palavras-chave (consistência, treino, performance)
   - Exemplo: "No futebol, um time vencedor precisa de consistência e treino."

3. GANCHO DE COMPARAÇÃO (1 frase)
   - Use MESMAS palavras da reflexão
   - Conecte ao negócio
   - Exemplo: "Assim como nas vendas, onde consistência no atendimento faz diferença."

4. PROPOSTA + RETORNO AO FLUXO (1-2 frases)
   - Apresente solução Digital Boost
   - Faça pergunta de qualificação
   - Exemplo: "Já pensou em ter um time que nunca descansa? Quer conhecer?"

EXEMPLO COMPLETO:
"Vi sim! Foi emocionante né?

No futebol, um time vencedor precisa de consistência e treino todos os dias.

Assim como nas vendas, onde consistência no atendimento faz você não perder oportunidades.

Já pensou em ter um time comercial que nunca descansa? Nossos agentes fazem isso. Quer conhecer?"

REGRAS:
- Máximo 4 frases (1 por parte)
- Transição NATURAL (não forçada)
- Sempre retornar ao fluxo de qualificação
- Use emojis COM MODERAÇÃO (máx 1)
```

---

## 📋 INTEGRAÇÃO NO PIPELINE

### **MessagePipeline.js** (Layer 3 modificado):

```javascript
// Layer 3: Intent Classification (MODIFICADO)
async processLayer3_IntentClassification(message, context) {
  const { text } = message;

  // 1. Detectar se é FAQ (termina com "?")
  if (!text.trim().endsWith('?')) {
    // Não é pergunta, vai para agents normalmente
    return { shouldProceedToAgents: true, intent: null };
  }

  // 2. Classificar FAQ via GPT
  const faqClassification = await unifiedFAQSystem.classifyFAQIntent(text, context);

  if (!faqClassification.isFAQ) {
    return { shouldProceedToAgents: true, intent: null };
  }

  // 3. Gerar resposta FAQ via GPT
  const faqResponse = await unifiedFAQSystem.generateFAQResponse(
    text,
    faqClassification,
    context
  );

  // 4. Adicionar retorno ao fluxo
  const finalResponse = unifiedFAQSystem.addFlowReturnMessage(faqResponse, context);

  // 5. Enviar resposta
  await whatsapp.sendText(message.from, finalResponse);

  // 6. BLOQUEAR agents (FAQ já respondeu)
  return {
    shouldProceedToAgents: false,
    handledBy: 'UnifiedFAQ',
    faqCategory: faqClassification.category
  };
}
```

---

## ✅ BENEFÍCIOS DA NOVA ARQUITETURA

### 1. **Unificação Total**
- ✅ FAQ + ContextualRedirect em um único sistema
- ✅ Sem conflitos entre sistemas
- ✅ Manutenção centralizada

### 2. **GPT-based Classification**
- ✅ Entende CONTEXTO, não apenas keywords
- ✅ Menor taxa de falsos positivos
- ✅ Adaptável a novos cenários

### 3. **Respostas Estruturadas**
- ✅ Prompts específicos por categoria
- ✅ Sempre retorna ao fluxo
- ✅ Tom consistente (ORBION persona)

### 4. **Agentes Protegidos**
- ✅ SDR/Specialist/Scheduler não recebem perguntas off-scope
- ✅ FAQ responde ANTES de chegar nos agents
- ✅ Pipeline limpo

### 5. **Retorno ao Fluxo Automático**
- ✅ Sempre adiciona mensagem de retorno
- ✅ Contexto preservado (BANT stage, etc)
- ✅ Experiência contínua

---

## 📊 COMPARATIVO ANTES/DEPOIS

### ANTES (Sistema Atual):

```
❌ 3 sistemas separados (FAQ, Redirect, Optimizer)
❌ Keyword matching manual (não entende contexto)
❌ Sem retorno ao fluxo
❌ Prompts gigantes injetados no system (438 linhas)
❌ Conflitos entre sistemas
❌ Agentes recebem perguntas off-scope
```

### DEPOIS (Sistema Unificado):

```
✅ 1 sistema unificado (UnifiedFAQSystem)
✅ GPT classification (entende contexto)
✅ Retorno ao fluxo automático
✅ Prompts específicos por categoria (modulares)
✅ Zero conflitos
✅ Agentes protegidos
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### **FASE 1: Criar UnifiedFAQSystem**
1. Criar `src/intelligence/UnifiedFAQSystem.js`
2. Implementar `classifyFAQIntent()`
3. Implementar `generateFAQResponse()`
4. Implementar `addFlowReturnMessage()`
5. Criar todos os prompts estruturados

### **FASE 2: Integrar no Pipeline**
1. Modificar `MessagePipeline.js` Layer 3
2. Adicionar check "termina com ?"
3. Chamar UnifiedFAQSystem se for pergunta
4. Bloquear agents se FAQ respondeu

### **FASE 3: Migrar Dados**
1. Migrar categorias de `faq_responses.js` para prompts
2. Migrar categorias de `contextual_redirect.js` para prompts
3. Testar todos os cenários

### **FASE 4: Deprecar Sistemas Antigos**
1. Marcar `faq_responses.js` como deprecated
2. Marcar `contextual_redirect.js` como deprecated
3. Remover código morto

### **FASE 5: Testes**
1. Testar FAQ business (valores, serviços, etc)
2. Testar redirects (clima, futebol, etc)
3. Testar sensitive topics (doença, acidente)
4. Testar retorno ao fluxo (BANT, SDR, Scheduler)

---

## 📝 ARQUIVOS A CRIAR

1. **src/intelligence/UnifiedFAQSystem.js** (NOVO)
   - Classe principal do sistema unificado

2. **prompts/faq/business/pricing.txt** (NOVO)
   - Prompt estruturado para FAQ de valores

3. **prompts/faq/business/services.txt** (NOVO)
   - Prompt estruturado para FAQ de serviços

4. **prompts/faq/redirect/sports.txt** (NOVO)
   - Prompt estruturado para redirect de esportes

5. **prompts/faq/classification.txt** (NOVO)
   - Prompt de classificação GPT

---

## 📁 ARQUIVOS A DEPRECAR

1. **src/tools/faq_responses.js** → Deprecated
2. **src/tools/contextual_redirect.js** → Deprecated
3. **src/intelligence/IntentClassifier.js** → Simplificar (só check "?")

---

## 🎯 RESULTADO ESPERADO

### Fluxo Ideal:

```
LEAD: "Quanto custa?"
  ↓
UnifiedFAQ classifica: business.pricing (conf: 0.95)
  ↓
UnifiedFAQ gera resposta via GPT
  ↓
UnifiedFAQ adiciona retorno ao fluxo
  ↓
ORBION: "Boa pergunta! Nossos planos variam de R$ 2k a R$ 8k/mês.

A maioria dos clientes recupera em 4-6 meses com aumento nas vendas.

Pra montar proposta certeira: qual o principal desafio?

✅ Respondido! Agora me conta mais sobre o negócio de vocês!"
  ↓
Agentes NÃO recebem a mensagem (FAQ já tratou)
```

---

**Status:** ✅ ARQUITETURA DEFINIDA
**Próximo passo:** Implementar FASE 1 (UnifiedFAQSystem.js)

---

**Gerado em:** 2025-11-13 15:17
**Autor:** Claude Code (Senior Dev)
