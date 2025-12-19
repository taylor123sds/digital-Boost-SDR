# 🔴 PROBLEMA IDENTIFICADO: FLUXO BANT NÃO ESTÁ SENDO SEGUIDO

## 🎯 O QUE O USUÁRIO REPORTOU

"pq pelas mensagens, ele nao seguiu o fluxo certo"

Isso indica que ao testar o sistema, o ORBION **não seguiu** o fluxo BANT estruturado:
- Opening → Budget → Authority → Need → Timing → Closing

---

## 🔍 ANÁLISE DOS PROMPTS

### ✅ O que ESTÁ BOM:

1. **Prompts BANT detalhados** (bant_framework.js)
   - Cada estágio tem estrutura obrigatória
   - Exemplos claros
   - Instruções específicas

2. **Detecção de estágios inteligente**
   - Baseada em BANT coletado
   - Avança automaticamente

3. **Regras críticas ajustadas**
   - Agora dizem "SIGA O FLUXO BANT"
   - Removido "máximo 4 mensagens"

### ❌ O que ESTÁ CAUSANDO O PROBLEMA:

#### **Problema #1: PROMPTS MUITO LONGOS**

Os prompts BANT têm **150+ linhas cada**, exemplo:

```
💰 ESTÁGIO: BUDGET (Orçamento)

OBJETIVO: Descobrir budget sem travar conversa

ESTRUTURA OBRIGATÓRIA:
1️⃣ Perguntar gasto atual...
2️⃣ Fazer REFRAME...
3️⃣ Mostrar que orçamento...
4️⃣ Conectar ao benefício...
5️⃣ NÃO mencionar preços...

EXEMPLO:
"E hoje, quanto vocês gastam..."

VARIAÇÕES:
- "Vocês têm alguém dedicado..."
- "Qual o custo de um lead..."
- "Se pudesse realocar..."

⚠️ NÃO FAZER:
- Perguntar valores de forma invasiva
- Mencionar preços da Digital Boost
- Assustar com investimento alto
- Julgar budget do cliente

✅ FAZER:
- Tom consultivo
- Reframing de custo → investimento
- Mostrar que budget já existe
- Conectar ao valor gerado
```

**Resultado:** O GPT se perde no meio de tanto texto.

---

#### **Problema #2: INSTRUÇÕES CONTRADITÓRIAS**

Mesmo ajustadas, as REGRAS CRÍTICAS podem conflitar:

```javascript
// Linha 167 (agent.js):
"1. SIGA O FLUXO BANT: Não pule etapas"

// Linha 168:
"2. Quando lead mencionar DOR: Reconheça e APROFUNDE com pergunta BANT"

// Linha 182:
"📏 ESTILO: Perguntas naturais e consultivas, 2-3 frases"
```

**O que pode estar acontecendo:**
- GPT lê "2-3 frases" e tenta condensar tudo
- Não consegue seguir TODOS os passos do prompt BANT em 2-3 frases
- Acaba pulando etapas para ser conciso

---

#### **Problema #3: FALTA DE REFORÇO NO FINAL**

O prompt termina com:

```javascript
"Responda em português brasileiro, tom natural e consultivo, como consultor experiente."
```

**Falta:** Um lembrete final forte do tipo:

```
🚨 CRÍTICO: VOCÊ ESTÁ NO ESTÁGIO [X]. FAÇA A PERGUNTA ESPECÍFICA DESTE ESTÁGIO.
NÃO pule para o próximo estágio. NÃO proponha reunião ainda.
```

---

## ✅ SOLUÇÕES PROPOSTAS

### **Solução 1: SIMPLIFICAR PROMPTS BANT (Alta Prioridade)**

Reduzir de 150 linhas para 30-40 linhas, focando no essencial:

**ANTES:**
```
ESTRUTURA OBRIGATÓRIA:
1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣
EXEMPLO: [longo]
VARIAÇÕES: [3 opções]
⚠️ NÃO FAZER: [5 itens]
✅ FAZER: [4 itens]
```

**DEPOIS:**
```
PERGUNTA OBRIGATÓRIA:
"[Pergunta específica]"

SE NECESSÁRIO, ADAPTE PARA:
"[Variação 1]" OU "[Variação 2]"

NÃO faça [X]. NÃO mencione [Y].
```

---

### **Solução 2: ADICIONAR REFORÇO FINAL FORTE**

Após as regras críticas, adicionar:

```javascript
🚨 LEMBRETE CRÍTICO DO ESTÁGIO ATUAL:
ESTÁGIO: ${bant.currentStage}
PERGUNTA OBRIGATÓRIA: ${getSimpleQuestionForStage(bant.currentStage)}
NÃO pule para o próximo estágio.
${bant.currentStage !== 'closing' ? 'NÃO proponha reunião ainda.' : 'AGORA proponha reunião com resumo BANT.'}
```

---

### **Solução 3: REMOVER CONFLITO "2-3 FRASES"**

```javascript
// REMOVER:
"📏 ESTILO: 2-3 frases curtas (WhatsApp)"

// SUBSTITUIR POR:
"📏 ESTILO: Perguntas claras e diretas seguindo o estágio BANT"
```

---

### **Solução 4: USAR SYSTEM MESSAGE SEPARADA**

Ao invés de colocar tudo no mesmo prompt, usar mensagens system separadas:

```javascript
messages = [
  { role: "system", content: "Prompt base do ORBION" },
  { role: "system", content: `🚨 ESTÁGIO ATUAL: ${stage}. FAÇA: ${question}` },
  ...history,
  { role: "user", content: userText }
]
```

Isso força o GPT a dar atenção ao estágio atual.

---

## 🎯 IMPLEMENTAÇÃO RECOMENDADA

### **Curto Prazo (15 minutos):**
1. Adicionar reforço final forte (Solução 2)
2. Remover "2-3 frases" (Solução 3)

### **Médio Prazo (30 minutos):**
3. Simplificar prompts BANT (Solução 1)

### **Longo Prazo (1 hora):**
4. Usar system messages separadas (Solução 4)

---

## 📊 TESTE MANUAL RECOMENDADO

Para testar sem API key, verificar se os prompts estão sendo gerados corretamente:

```bash
node -e "import('./src/tools/bant_framework.js').then(m => {
  const ctx = m.getBANTContext([{role:'user',content:'oi'}], {});
  console.log('ESTÁGIO:', ctx.currentStage);
  console.log('PROMPT:', ctx.stagePrompt);
})"
```

Verificar se o prompt está conciso e direto.

---

## ✅ CONCLUSÃO

**Problema raiz:** Prompts BANT muito verbosos + conflito de instruções

**Solução:** Simplificar e reforçar o estágio atual no final do prompt

**Próximo passo:** Implementar Soluções 2 e 3 primeiro (rápido) para teste.
