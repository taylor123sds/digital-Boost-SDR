# FAQ LOGIC ANALYSIS - Problema Identificado
**Data:** 2025-11-13 11:58
**Issue:** FAQ detectado incorretamente durante conversa BANT

---

## 🐛 PROBLEMA IDENTIFICADO

### Cenário Real:
```
SPECIALIST: "E sobre flexibilidade: o budget de R$ 4 mil é fixo
             ou vocês considerariam aumentar com resultados positivos?"

LEAD: "Podemos aumentar"

SISTEMA: ❌ Detectou keyword "demo" → Disparou FAQ de demonstração
```

**Resultado:** Interrompeu fluxo BANT e enviou resposta de FAQ fora de contexto.

---

## 📊 ANÁLISE DA LÓGICA ATUAL

### 1. Pipeline de Processamento

```
MessagePipeline.js
├── Layer 1: Security (bot detection)
├── Layer 2: Interceptors (opt-out)
├── Layer 3: Intent Classification ← PROBLEMA AQUI
│   ├── detectFAQ()
│   │   ├── isExplicitQuestion() ← Verifica se é pergunta
│   │   └── keyword matching
│   └── detectGeneralIntent()
└── Layer 4: Agent Processing (SDR/Specialist/Scheduler)
```

### 2. Lógica de Detecção de FAQ (IntentClassifier.js)

```javascript
// Linha 24-31: isExplicitQuestion()
function isExplicitQuestion(text) {
  // 1. Contém "?"
  if (text.includes('?')) return true;

  // 2. Começa com palavra interrogativa
  const questionStarters = /^(o que|qual|quanto|quem|como|onde|quando|por que|pode|tem|vocês|vcs|voce|você)/i;
  return questionStarters.test(text.trim());
}
```

**PROBLEMA:** "Podemos aumentar" começa com "pode" → detectado como pergunta!

### 3. Keywords de FAQ (faq_responses.js)

```javascript
// Linha 172-174
contato_demo: {
  keywords: ['quero falar com alguém', 'tem whatsapp', 'telefone',
             'como falo', 'demonstração', 'demo', 'ver funcionando'],
  // ...
}
```

**Obs:** "demo" não está na mensagem "Podemos aumentar", mas o log diz que encontrou!

---

## 🔍 ANÁLISE DO LOG

```log
🎯 [INTENT] Classificando: "Podemos aumentar..."
🎯 [INTENT] Contexto: currentAgent=sdr  ← ERRO: Deveria ser 'specialist'!
📚 [FAQ] Analisando mensagem: "Podemos aumentar..."
✅ [FAQ] É pergunta explícita - verificando keywords
📚 [FAQ] Match encontrado: contato_demo (keywords: demo)
```

### ⚠️ PROBLEMAS IDENTIFICADOS:

**1. currentAgent está errado**
- Log diz: `currentAgent=sdr`
- Deveria ser: `currentAgent=specialist` (estava no stage BUDGET do BANT)

**2. "demo" não está em "Podemos aumentar"**
- Como encontrou match de "demo"?
- Possível: está buscando "demo" em outro lugar (histórico? metadata?)

**3. isExplicitQuestion() está incorreto**
- "Podemos aumentar" começa com "pode" (palavra interrogativa)
- Mas NÃO é uma pergunta, é uma RESPOSTA ao BANT!
- Pattern: `^(pode|...)` match qualquer frase começando com "pode"

---

## 🎯 RAIZ DO PROBLEMA

### Problema #1: isExplicitQuestion() Muito Amplo

```javascript
// ❌ ATUAL (linha 29)
const questionStarters = /^(o que|qual|quanto|quem|como|onde|quando|por que|pode|tem|vocês|vcs|voce|você)/i;

// Exemplos que quebram:
"Podemos aumentar" → true (começa com "pode")
"Pode me enviar" → true (começa com "pode")
"Tem interesse" → true (começa com "tem")
```

**Root cause:** Pattern muito genérico captura respostas BANT como perguntas.

### Problema #2: Falta de Contexto de Agente

```javascript
// Linha 146: detectFAQ() não considera currentAgent
const faqMatch = detectFAQ(messageText, context);
// mas dentro de detectFAQ(), context não é usado!
```

**Root cause:** FAQ detection ignora se lead está em conversa BANT ativa.

### Problema #3: currentAgent Incorreto no Log

Log mostra `currentAgent=sdr` mas lead estava no Specialist (BANT budget stage).

**Possível causa:**
- Context não sendo propagado corretamente
- Pipeline recebe context errado do webhook handler

---

## ✅ SOLUÇÕES PROPOSTAS

### Solução #1: Melhorar isExplicitQuestion()

```javascript
// ✅ MELHORADO
function isExplicitQuestion(text) {
  // 1. Contém "?"
  if (text.includes('?')) return true;

  const textLower = text.toLowerCase().trim();

  // 2. Começa com palavra interrogativa COMPLETA (não fragmento)
  const questionStarters = [
    /^o que\s+/,       // "o que é"
    /^qual\s+/,        // "qual o"
    /^quanto\s+/,      // "quanto custa"
    /^quem\s+/,        // "quem são"
    /^como\s+/,        // "como funciona"
    /^onde\s+/,        // "onde fica"
    /^quando\s+/,      // "quando começa"
    /^por que\s+/,     // "por que escolher"
    /^pode\s+(me|nos|você|vocês|vc|vcs)\s+/, // "pode ME enviar"
    /^tem\s+(como|algum|alguma|um|uma)\s+/,  // "tem COMO fazer"
    /^vocês\s+(tem|têm|fazem|oferecem)\s+/,  // "vocês TEM serviço"
    /^você\s+(tem|faz|oferece|pode)\s+/      // "você TEM demo"
  ];

  return questionStarters.some(pattern => pattern.test(textLower));
}
```

**Exemplos:**
```javascript
"Podemos aumentar" → false ✅ (não match)
"Pode me enviar demo?" → true ✅ (match "pode me")
"Tem interesse" → false ✅ (não match)
"Tem como agendar?" → true ✅ (match "tem como")
```

### Solução #2: Context-Aware FAQ Detection

```javascript
function detectFAQ(messageText, context = {}) {
  console.log(`📚 [FAQ] Analisando mensagem: "${messageText.substring(0, 50)}..."`);

  // ✅ NOVO: Bloquear FAQ durante fluxo BANT ativo
  if (context.currentAgent === 'specialist') {
    console.log(`❌ [FAQ] Specialist Agent ativo - FAQ bloqueado durante BANT`);
    return null;
  }

  // ✅ FIX: FAQ detection APENAS para perguntas EXPLÍCITAS
  if (!isExplicitQuestion(messageText)) {
    console.log(`❌ [FAQ] Não é pergunta explícita - pulando FAQ detection`);
    return null;
  }

  // ... resto do código
}
```

### Solução #3: Passar Context Corretamente

Verificar onde context é criado e garantir que `currentAgent` está correto:

```javascript
// Em webhook.routes.js ou similar
const context = {
  currentAgent: leadState.currentAgent, // ← garantir que vem do leadState
  leadState: leadState,
  metadata: message.metadata
};

const pipelineResult = await messagePipeline.process(message, context);
```

---

## 🔧 IMPLEMENTAÇÃO RECOMENDADA

### Priority P0 (Crítico):

**1. Bloquear FAQ durante BANT ativo**
- **Arquivo:** `src/intelligence/IntentClassifier.js`
- **Linha:** 36 (dentro de detectFAQ)
- **Mudança:**
```javascript
// Adicionar logo após linha 37
if (context.currentAgent === 'specialist') {
  console.log(`❌ [FAQ] BANT ativo - FAQ bloqueado`);
  return null;
}
```

**2. Melhorar isExplicitQuestion()**
- **Arquivo:** `src/intelligence/IntentClassifier.js`
- **Linha:** 24-31
- **Mudança:** Usar patterns mais específicos com `\s+` (espaço obrigatório)

### Priority P1 (Alto):

**3. Verificar propagação de context**
- **Arquivo:** `src/api/routes/webhook.routes.js`
- **Verificar:** Se `context.currentAgent` vem de `leadState.currentAgent`
- **Debug:** Adicionar log antes de chamar pipeline

---

## 📋 TESTES RECOMENDADOS

### Cenários de Teste:

**1. FAQ Legítimo (Deveria funcionar):**
```
Lead: "Qual o preço?"
✅ Esperado: FAQ de valores
```

**2. Resposta BANT (NÃO deveria disparar FAQ):**
```
Lead: "Podemos aumentar"  (durante BANT budget)
❌ Atual: FAQ demo
✅ Esperado: Continuar BANT
```

**3. Frase começando com "pode" (NÃO é pergunta):**
```
Lead: "Podemos conversar amanhã"
❌ Atual: Detecta como pergunta
✅ Esperado: Statement (não é pergunta)
```

**4. Pergunta real com "pode":**
```
Lead: "Pode me enviar uma demo?"
✅ Esperado: FAQ demo
```

---

## 📊 IMPACTO DAS MUDANÇAS

### Antes (Problema):
- ❌ "Podemos aumentar" → FAQ demo (interrompe BANT)
- ❌ Qualquer frase com "pode/tem" no início → pergunta
- ❌ FAQ dispara mesmo durante BANT ativo

### Depois (Solução):
- ✅ "Podemos aumentar" → Continua BANT
- ✅ Apenas perguntas REAIS detectadas
- ✅ FAQ bloqueado durante Specialist Agent (BANT)

---

## 🎯 DECISÃO DE DESIGN

### Opção A: Bloquear FAQ totalmente no Specialist ✅ RECOMENDADO
**Vantagem:** Nunca interrompe fluxo BANT
**Desvantagem:** Lead precisa esperar BANT terminar para FAQ

### Opção B: Permitir FAQ com confiança > 0.95
**Vantagem:** FAQ muito óbvio ainda funciona
**Desvantagem:** Pode ainda interromper BANT

**Recomendação:** Opção A. Durante BANT, foco total na qualificação. FAQ pode esperar.

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Implementar bloqueio de FAQ no Specialist Agent
- [ ] Melhorar regex de isExplicitQuestion()
- [ ] Verificar propagação de context.currentAgent
- [ ] Testar cenários listados acima
- [ ] Monitorar logs após deploy
- [ ] Criar testes unitários para isExplicitQuestion()

---

**Status:** ANÁLISE COMPLETA - AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO

**Gerado em:** 2025-11-13 11:58
**Analisado por:** Claude Code (Dev Senior)
