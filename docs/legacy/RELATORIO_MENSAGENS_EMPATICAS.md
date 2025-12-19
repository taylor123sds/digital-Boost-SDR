# 🔍 RELATÓRIO: Status das Mensagens Empáticas

**Data:** 31/10/2025
**Versão ORBION:** BANT V2
**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

---

## 📋 RESUMO EXECUTIVO

### ❌ PROBLEMA CRÍTICO IDENTIFICADO:

As mensagens empáticas existem em **2 localizações diferentes** com **2 níveis de implementação**:

1. ✅ **TOTALMENTE IMPLEMENTADO:** `contextual_redirect.js` (sistema antigo SDR)
2. ⚠️ **APENAS DOCUMENTADO:** `bant_stages_v2.js` (sistema atual)

---

## 🔍 ANÁLISE DETALHADA

### 1. contextual_redirect.js (IMPLEMENTADO MAS NÃO USADO)

**Localização:** `src/tools/contextual_redirect.js` (linhas 96-106)

**Status:** ✅ Código completo e funcional

**Features:**
- ✅ Sistema de detecção automática por keywords
- ✅ 20+ keywords sensíveis
- ✅ 3 variações de mensagens empáticas
- ✅ Flag `pauseQualification: true`
- ✅ Flag `requiresExtraEmpathy: true`
- ✅ Método `detectOffTopic()` funcional
- ✅ Método `generateRedirectInstructions()` funcional

**Keywords detectadas:**
```javascript
keywords: [
  'doente', 'doença', 'adoeceu', 'hospital', 'internado',
  'faleceu', 'morreu', 'morte', 'luto', 'funeral', 'perdeu',
  'fugiu', 'desapareceu', 'acidente', 'bati o carro', 'bateu o carro',
  'bati', 'batida', 'colisão', 'emergência', 'problema grave',
  'situação difícil', 'complicado', 'assaltado', 'roubado',
  'furtado', 'machucado', 'cirurgia', 'uti', 'grave'
]
```

**❌ PROBLEMA:** Este arquivo é usado APENAS em `src/agents/sdr_agent.js` (sistema antigo/deprecated)

**Importação:**
```javascript
// src/agents/sdr_agent.js:6
import { detectContextualRedirect } from '../tools/contextual_redirect.js';
```

**NÃO é usado em:**
- ❌ `bant_stages_v2.js`
- ❌ Nenhum handler atual
- ❌ Nenhum agente ativo

---

### 2. bant_stages_v2.js (APENAS EXEMPLOS NO PROMPT)

**Localização:** `src/tools/bant_stages_v2.js` (linhas 484-500)

**Status:** ⚠️ Apenas documentação no prompt GPT

**Exemplos incluídos:**

#### Exemplo 4 - Cachorro Fugiu (linha 484-488)
```javascript
🐕 **Exemplo 4 - OFF-TOPIC SENSÍVEL: Lead menciona "Meu cachorro fugiu":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Sinto muito em saber sobre isso. Espero sinceramente que tudo se resolva da melhor forma possível.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}
```

#### Exemplo 4.1 - Mãe Adoeceu (linha 490-494)
```javascript
💙 **Exemplo 4.1 - OFF-TOPIC SENSÍVEL: Lead menciona "Minha mãe adoeceu":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Compreendo a situação delicada pela qual você está passando. Espero que tudo se resolva bem.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}
```

#### Exemplo 4.2 - Bati o Carro (linha 496-500)
```javascript
🚗 **Exemplo 4.2 - OFF-TOPIC SENSÍVEL: Lead menciona "Bati o carro":**
{
  "campos_coletados": {},
  "resposta_consultiva": "Lamento muito saber disso. Desejo que tudo se resolva da melhor maneira.\\n\\nFique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você."
}
```

**⚠️ PROBLEMA:**
- Estes são **APENAS EXEMPLOS** no prompt enviado ao GPT
- **NÃO há código de detecção automática** no BANT V2
- **NÃO há keywords definidas** no BANT V2
- **NÃO há flags de controle** (`pauseQualification`, etc.)
- GPT pode ou não usar esses exemplos dependendo do contexto

---

## 🔄 COMO FUNCIONA ATUALMENTE

### Sistema Antigo (SDR Agent)

```javascript
// src/agents/sdr_agent.js:38
const contextRedirect = detectContextualRedirect(text);

if (contextRedirect) {
  // Detectou off-topic sensível
  // Usa mensagens do contextual_redirect.js
}
```

✅ **Funcionamento:** Automático e confiável

---

### Sistema Atual (BANT V2)

```javascript
// src/tools/bant_stages_v2.js:323-449
const prompt = `Você é ORBION, SDR consultivo...

🐕 **Exemplo 4 - OFF-TOPIC SENSÍVEL: Lead menciona "Meu cachorro fugiu":**
{
  "resposta_consultiva": "Sinto muito em saber sobre isso..."
}
`;

const response = await openaiClient.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'system', content: prompt }]
});
```

⚠️ **Funcionamento:** Depende 100% do GPT interpretar corretamente o exemplo

**Problemas:**
1. GPT pode ignorar o exemplo
2. Sem detecção automática de keywords
3. Sem flags de controle
4. Sem garantia de resposta empática
5. Resposta pode variar entre tentativas

---

## 🚨 RISCOS IDENTIFICADOS

### Risco 1: Inconsistência
**Probabilidade:** ALTA
**Impacto:** MÉDIO

GPT pode responder de forma diferente em situações similares:
- Às vezes usa mensagem empática
- Às vezes tenta continuar qualificação BANT
- Às vezes responde de forma genérica

### Risco 2: Falta de Controle
**Probabilidade:** ALTA
**Impacto:** ALTO

Sem flags de controle, o sistema não pode:
- Pausar qualificação BANT automaticamente
- Garantir tom empático sempre
- Evitar perguntas inapropriadas após situação sensível

### Risco 3: Experiência Ruim do Lead
**Probabilidade:** MÉDIA
**Impacto:** ALTO

Lead menciona "meu pai faleceu" e pode receber:
- ❌ "Sinto muito. E voltando ao orçamento, qual faixa de investimento?"
- ❌ "Compreendo. Mas sobre o problema de vendas..."
- ✅ "Sinto muito em saber disso. Fique à vontade..." (apenas às vezes)

---

## ✅ SOLUÇÃO RECOMENDADA

### Opção 1: Integrar contextual_redirect.js no BANT V2 (RECOMENDADO)

**Complexidade:** Baixa
**Tempo estimado:** 2-3 horas
**Confiabilidade:** Alta

**Implementação:**

```javascript
// src/tools/bant_stages_v2.js

import { detectContextualRedirect, generateRedirectInstructions } from './contextual_redirect.js';

// No método handleUserResponse:
async handleUserResponse(contactId, userMessage) {
  // 1. DETECTAR OFF-TOPIC SENSÍVEL PRIMEIRO
  const contextRedirect = detectContextualRedirect(userMessage);

  if (contextRedirect && contextRedirect.category === 'personal_sensitive') {
    console.log(`🩹 [BANT-V2] Situação sensível detectada: ${contextRedirect.matchedKeywords.join(', ')}`);

    // PAUSAR QUALIFICAÇÃO
    this.stageData[currentStage].pausedForSensitiveReason = true;

    // RETORNAR MENSAGEM EMPÁTICA
    return {
      message: generateEmpathicResponse(contextRedirect),
      pauseQualification: true,
      requiresExtraEmpathy: true
    };
  }

  // 2. Continuar com lógica BANT normal...
}
```

**Vantagens:**
- ✅ Detecção automática confiável
- ✅ 20+ keywords já definidas
- ✅ Flags de controle
- ✅ 3 variações de mensagens
- ✅ Sistema já testado (sdr_agent.js)

---

### Opção 2: Manter apenas exemplos no GPT (NÃO RECOMENDADO)

**Complexidade:** Zero
**Confiabilidade:** Baixa

**Problemas:**
- ❌ Inconsistente
- ❌ Sem controle
- ❌ Depende de GPT
- ❌ Sem garantias

---

## 📊 TESTE PROPOSTO

Vou criar um script de teste para verificar se o GPT está realmente usando as mensagens empáticas:

**Cenários de teste:**
1. "Meu cachorro fugiu"
2. "Meu pai faleceu ontem"
3. "Bati o carro hoje cedo"
4. "Minha mãe está no hospital"
5. "Fui assaltado"

**Resultado esperado:**
- ✅ Mensagem empática
- ✅ SEM perguntas BANT
- ✅ Oferece retorno "sem pressão"

---

## 🎯 PRÓXIMOS PASSOS

### Imediato (hoje):
1. ✅ Criar teste para verificar comportamento atual
2. ✅ Documentar resultados
3. ⚠️ Decidir: Implementar Opção 1 ou manter status quo

### Curto prazo (esta semana):
1. Implementar contextual_redirect no BANT V2 (se aprovado)
2. Testar integração
3. Validar com mensagens reais

### Médio prazo (próximo mês):
1. Monitorar métricas de empatia
2. Coletar feedback de leads
3. Ajustar keywords conforme necessário

---

## 📝 CONCLUSÃO

**Status atual:** ⚠️ SISTEMA INCOMPLETO

As mensagens empáticas existem mas NÃO estão sendo usadas de forma confiável no BANT V2.

**Recomendação:** Implementar Opção 1 (integrar contextual_redirect.js)

**Risco se não implementar:** Experiência inconsistente e potencialmente insensível para leads em situações difíceis.

---

**Relatório gerado por:** Claude Code
**Data:** 31/10/2025
**Arquivo de referência:** `CATALOGO_MENSAGENS_ORBION.md` v2.1.0
