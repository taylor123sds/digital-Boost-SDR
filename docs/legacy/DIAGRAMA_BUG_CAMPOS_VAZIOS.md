# DIAGRAMA: Por Que GPT Retorna `campos_coletados: {}`

## FLUXO NORMAL (Esperado)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LEAD RESPONDE                                            │
│    "R$ 2.000"                                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. processMessage() RECEBE                                  │
│    userMessage = "R$ 2.000"                                 │
│    stage = 'budget'                                         │
│    conversationHistory = [últimas 6 mensagens]              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. analyzeWithGPT() ENVIA PROMPT                           │
│    - Histórico da conversa                                  │
│    - Campos que faltam no stage budget                      │
│    - Última mensagem: "R$ 2.000"                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GPT RETORNA                                              │
│    {                                                        │
│      "campos_coletados": {                                  │
│        "faixa_investimento": "R$ 2.000/mês"                │
│      },                                                     │
│      "resposta_consultiva": "R$ 2.000/mês é uma faixa..." │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FILTRO DE SEGURANÇA (linha 697-705)                     │
│    ✅ "R$ 2.000/mês" !== null                              │
│    ✅ "R$ 2.000/mês" !== undefined                         │
│    ✅ "R$ 2.000/mês" !== 'null'                            │
│    ✅ "R$ 2.000/mês" !== ''                                │
│    → ACEITO!                                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ATUALIZA stageData (linha 173-177)                      │
│    this.stageData.budget.campos = {                         │
│      faixa_investimento: "R$ 2.000/mês"                    │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. VERIFICA SE PODE AVANÇAR (linha 189)                    │
│    checkEssenciaisColetados('budget')                       │
│    → Verifica se faixa_investimento existe                  │
│    → true ✅                                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. AVANÇA PARA PRÓXIMO STAGE                                │
│    advanceStage() → currentStage = 'authority'              │
└─────────────────────────────────────────────────────────────┘
```

---

## FLUXO BUGADO (O Que Está Acontecendo)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LEAD RESPONDE                                            │
│    "R$ 2.000"                                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. processMessage() RECEBE                                  │
│    userMessage = "R$ 2.000"                                 │
│    stage = 'budget'                                         │
│    🐛 BUG #2: conversationHistory = []  ← VAZIO!           │
│              (foi limpo em advanceStage anterior)           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. analyzeWithGPT() ENVIA PROMPT                           │
│    🐛 BUG #2: SEM histórico da conversa                    │
│    🐛 BUG #3: Prompt com CONTRADIÇÕES                      │
│    - "Aceite respostas de 1 palavra como válidas"          │
│    - MAS "Só preencha se EXPLICITAMENTE mencionado"        │
│    - "Use linguagem informal (putz)"                        │
│    - MAS "Evite gírias como putz"                          │
│    - "Proibido começar com 'Entendo'"                      │
│    - MAS exemplos começam com "Entendo"                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GPT FICA CONFUSO                                         │
│    - Sem contexto → não sabe o que já foi perguntado       │
│    - Contradições → entra em "modo seguro"                  │
│    - Retorna estrutura mínima:                              │
│    {                                                        │
│      "campos_coletados": {},  ← VAZIO! 🐛                  │
│      "resposta_consultiva": "Me conta mais sobre isso..."  │
│    }                                                        │
│                                                             │
│    OU às vezes retorna com campos mas valores "problemáticos":│
│    {                                                        │
│      "campos_coletados": {                                  │
│        "faixa_investimento": null  ← OU "" OU undefined    │
│      },                                                     │
│      "resposta_consultiva": "..."                          │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FILTRO DE SEGURANÇA (linha 697-705)                     │
│    🐛 BUG #1: Filtro MUITO RESTRITIVO                      │
│                                                             │
│    if (valor && valor !== null && valor !== 'null') {      │
│                                                             │
│    Testa:                                                   │
│    - null        && ... → ❌ REJEITADO                     │
│    - undefined   && ... → ❌ REJEITADO                     │
│    - ""          && ... → ❌ REJEITADO (string vazia)      │
│    - 0           && ... → ❌ REJEITADO (número zero)       │
│    - false       && ... → ❌ REJEITADO (boolean)           │
│                                                             │
│    Resultado: camposColetados = {}  ← VAZIO! 🐛            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ATUALIZA stageData (linha 173-177)                      │
│    Object.keys({}).forEach(campo => {  ← NADA!            │
│      // Loop não executa - objeto vazio                    │
│    })                                                       │
│                                                             │
│    this.stageData.budget.campos = {}  ← CONTINUA VAZIO! 🐛 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. VERIFICA SE PODE AVANÇAR (linha 189)                    │
│    checkEssenciaisColetados('budget')                       │
│    → Verifica se faixa_investimento existe                  │
│    → this.stageData.budget.campos.faixa_investimento        │
│    → undefined ❌                                           │
│    → false                                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. NÃO AVANÇA - CONTINUA NO MESMO STAGE                    │
│    Retorna: analysis.resposta_consultiva                    │
│    "Me conta mais sobre isso..."  ← GENÉRICO! 🐛           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. LEAD VÊ RESPOSTA GENÉRICA                                │
│    Lead: "R$ 2.000"                                         │
│    Bot: "Me conta mais sobre isso..."                       │
│    Lead: "???" (confuso - já respondeu!)                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. LOOP INFINITO                                           │
│     Sistema fica preso no mesmo stage                       │
│     Faz perguntas genéricas repetidas                       │
│     Lead desiste ou responde "sair"                         │
└─────────────────────────────────────────────────────────────┘
```

---

## EXEMPLO REAL (Logs do Servidor)

### Conversa Real Bugada

```
[TURNO 1]
Bot: "Pra resolver o problema que vocês têm, qual faixa de investimento
      mensal cabe no orçamento? (R$ 2-5k, R$ 5-10k, ou mais)"
Lead: "Até 2.000 reais"

[LOGS]:
📊 [BANT-V2] Stage: budget | Tentativa: 1
📋 [BANT-V2] Campos coletados: {}  ← VAZIO ANTES
📊 [BANT-V2] Análise GPT: {}       ← GPT RETORNOU VAZIO! 🐛
💬 [BANT-V2] Resposta consultiva: "Investir até R$ 2.000..."
📋 [BANT-V2] Campos coletados: {}  ← CONTINUA VAZIO! 🐛
✅ [BANT-V2] Pode avançar: NÃO     ← NÃO AVANÇA! 🐛

Bot: "Investir até R$ 2.000 por mês é um ponto de partida inteligente..."

─────────────────────────────────────────────────────────────

[TURNO 2]
Lead: (espera resposta relevante)
Bot: "qual é o principal desafio que vocês enfrentam"  ← PERGUNTA ERRADA! 🐛
     (pergunta de NEED stage - stage errado!)

─────────────────────────────────────────────────────────────

❌ PROBLEMA:
- Lead respondeu "R$ 2.000" mas sistema não coletou
- Sistema pergunta sobre "desafio" (stage NEED) quando está em BUDGET
- Lead fica confuso e frustra-se
```

---

## OS 5 BUGS QUE CAUSAM O PROBLEMA

```
┌─────────────────────────────────────────────────────────────┐
│ BUG #1: FILTRO EXCESSIVO (linha 699)                       │
│                                                             │
│ if (valor && valor !== null && valor !== 'null') {         │
│                                                             │
│ PROBLEMA: Rejeita valores falsy válidos                    │
│ - Strings vazias: ""                                        │
│ - Número zero: 0                                            │
│ - Boolean false: false                                      │
│                                                             │
│ CORREÇÃO:                                                   │
│ if (valor !== null && valor !== undefined &&               │
│     valor !== 'null' && valor !== '') {                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BUG #2: PERDA DE CONTEXTO (linha 855)                      │
│                                                             │
│ advanceStage() {                                            │
│   this.conversationHistory = [];  ← APAGA TUDO! 🐛         │
│   this.stageIndex++;                                        │
│ }                                                           │
│                                                             │
│ PROBLEMA: GPT não sabe o que já foi conversado             │
│                                                             │
│ CORREÇÃO:                                                   │
│ advanceStage() {                                            │
│   // NÃO LIMPAR - manter contexto                          │
│   this.stageIndex++;                                        │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BUG #3: CONTRADIÇÕES NO PROMPT (linha 294-661)             │
│                                                             │
│ "Use linguagem informal (putz)"                             │
│ MAS                                                         │
│ "Evite gírias como putz"                                    │
│                                                             │
│ "Proibido começar com: Entendo"                             │
│ MAS                                                         │
│ Exemplo: "Entendo. Perda de clientes..."                    │
│                                                             │
│ PROBLEMA: GPT entra em "modo seguro" com contradições       │
│                                                             │
│ CORREÇÃO: Remover todas as contradições                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BUG #4: PROGRESSÃO INCORRETA (linha 189-206)               │
│                                                             │
│ if (essenciaisColetados) {                                  │
│   this.advanceStage(); // ← Avança imediatamente           │
│   return {                                                  │
│     message: getNextStageOpening() ← Próximo stage         │
│   };                                                        │
│ }                                                           │
│                                                             │
│ PROBLEMA: GPT resposta fala do stage ATUAL                 │
│           Mas opening é do stage PRÓXIMO                    │
│           Lead vê mistura confusa                           │
│                                                             │
│ CORREÇÃO: Reconhecer campo coletado ANTES de avançar       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BUG #5: ERROR HANDLING FRÁGIL (linha 717-733)              │
│                                                             │
│ } catch (error) {                                           │
│   return {                                                  │
│     campos_coletados: {},  ← VAZIO! 🐛                     │
│     resposta_consultiva: getFallbackQuestion(stage)         │
│   };                                                        │
│ }                                                           │
│                                                             │
│ PROBLEMA:                                                   │
│ - Qualquer erro OpenAI → retorna vazio                     │
│ - Timeout, rate limit, JSON parse → todos = vazio          │
│ - Sem retry, sem diferenciação                              │
│                                                             │
│ CORREÇÃO: Retry 3x + fallback inteligente                  │
└─────────────────────────────────────────────────────────────┘
```

---

## QUICK FIXES (Aplicar Agora)

### Fix #1: Corrigir Filtro (Issue #1)

**Arquivo**: `src/tools/bant_stages_v2.js`
**Linha**: 699

```javascript
// ❌ ANTES:
if (valor && valor !== null && valor !== 'null') {
  camposColetados[campo] = valor;
}

// ✅ DEPOIS:
if (valor !== null && valor !== undefined && valor !== 'null' && valor !== '') {
  camposColetados[campo] = valor;
}
```

### Fix #2: Não Limpar Histórico (Issue #2)

**Arquivo**: `src/tools/bant_stages_v2.js`
**Linha**: 855

```javascript
// ❌ ANTES:
advanceStage() {
  this.conversationHistory = [];  // ← REMOVER ESTA LINHA

// ✅ DEPOIS:
advanceStage() {
  // NÃO LIMPAR - manter contexto entre stages
```

### Fix #3: Simplificar Prompt (Issue #3)

**Arquivo**: `src/tools/bant_stages_v2.js`
**Linhas**: 294-661

```javascript
// ❌ REMOVER contradições:

// Linha 410: "Use linguagem informal (putz, beleza, tranquilo)"
// Linha 608: "evite gírias como 'putz'"
// → ESCOLHER UM!

// Linha 379: "🚫 PROIBIDO COMEÇAR COM: 'Entendo', 'Compreendo'"
// Linha 394: "Exemplo: 'Compreendo. Perda de clientes...'"
// → PERMITIR "Entendo/Compreendo"

// ✅ MANTER APENAS:
"TOM: Consultivo e profissional. Use 'Entendo' para empatia, mas evite repetir sempre.
EXTRAÇÃO: Se lead respondeu ao campo perguntado com QUALQUER palavra/frase → extrair.
          ÚNICO CASO null: lead mudou de assunto ou fez pergunta (off-topic)."
```

---

## COMO TESTAR SE OS FIXES FUNCIONARAM

### Teste 1: Resposta Curta

```bash
# Antes do fix:
Lead: "Vendas"
Logs: 📊 [BANT-V2] Análise GPT: {}  ← VAZIO
Bot: "Me conta mais sobre isso..."  ← GENÉRICO

# Depois do fix:
Lead: "Vendas"
Logs: 📊 [BANT-V2] Análise GPT: { problema_principal: "Vendas" }  ← COLETADO!
Bot: "Vendas travadas geralmente têm raiz em..."  ← CONSULTIVO
```

### Teste 2: Progressão Entre Stages

```bash
# Antes do fix:
[BUDGET] Lead: "R$ 2.000"
Bot: "qual é o principal desafio?"  ← STAGE ERRADO!

# Depois do fix:
[BUDGET] Lead: "R$ 2.000"
Bot: "R$ 2.000/mês é uma faixa boa..."  ← RECONHECE
     "Ótimo! Agora sobre decisão..."    ← TRANSIÇÃO NATURAL
```

### Teste 3: Contexto Preservado

```bash
# Antes do fix:
[NEED] Lead: "Perco leads por atendimento lento"
[BUDGET] Lead: "R$ 5k"
[AUTHORITY] Bot: "Você decide sozinho?"  ← SEM CONTEXTO

# Depois do fix:
[NEED] Lead: "Perco leads por atendimento lento"
[BUDGET] Lead: "R$ 5k"
[AUTHORITY] Bot: "Para resolver atendimento lento com R$ 5k,
                  você decide sozinho ou precisa alinhar?"  ← COM CONTEXTO!
```

---

## PRÓXIMOS PASSOS

1. ✅ **Aplicar Quick Fixes** (30 minutos)
   - Fix #1: Linha 699
   - Fix #2: Linha 855
   - Fix #3: Linhas 294-661

2. ✅ **Testar Localmente** (1 hora)
   - Teste 1: Respostas curtas
   - Teste 2: Progressão stages
   - Teste 3: Contexto preservado

3. ✅ **Deploy em Staging** (se testes passarem)

4. ✅ **Monitorar Logs** (24 horas)
   - Verificar se `campos_coletados: {}` diminuiu
   - Verificar se loops infinitos sumiram

5. ⏭️ **Aplicar Fixes Médios/Baixos** (próxima semana)
   - Issue #6: Limitar histórico
   - Issue #7: Validar stage index
   - Issue #9: Retry mechanism

---

**FIM DO DIAGRAMA**
