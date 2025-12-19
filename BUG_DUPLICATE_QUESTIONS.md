# BUG: Perguntas Duplicadas no Fluxo BANT

## Problema Identificado

O agente ORBION está enviando mensagens duplicadas durante o fluxo BANT:

```
[10:16 PM] ORBION: "Perda de clientes é uma consequência crítica que pode impactar severamente a receita e a reputação da Solutions Tech. Empresas do setor de marketing digital que enfrentam isso geralmente veem uma queda significativa na confiança do cliente.

E quanto ao faturamento mensal de vocês, qual é aproximadamente? (R$ 10k, R$ 50k, R$ 100k+)"

[10:21 PM] ORBION: "Perda de clientes é uma consequência crítica que pode impactar severamente a receita e o crescimento da Solutions Tech.

E sobre o faturamento mensal: qual é a receita aproximada da empresa? (R$ 10k, R$ 50k, R$ 100k+)"
```

## Causa Raiz

O problema está em `src/tools/bant_stages_v2.js`, linha 548:

```javascript
3. ${essenciaisFaltando.length > 0 ? '**ATENÇÃO**: Se a mensagem atual responder o ÚLTIMO campo essencial faltando, NÃO faça mais perguntas! Apenas reconheça brevemente. Caso contrário, **faça a próxima pergunta** do campo ESSENCIAL que falta' : '🚫 **PARE AQUI - NÃO FAÇA NENHUMA PERGUNTA** - Apenas diga algo como "Perfeito! Anotado." ou "Entendi, obrigado."'}
```

**O que está acontecendo:**

1. Lead responde "Perda de clientes" (campo `consequencias`)
2. GPT reconhece a resposta E faz a próxima pergunta sobre `receita_mensal`
3. O sistema detecta que todos os campos essenciais do stage NEED foram coletados
4. O sistema concatena OUTRA mensagem (mensagem de direcionamento) perguntando sobre `receita_mensal` novamente
5. Resultado: Pergunta duplicada sobre faturamento

## Onde Está o Erro

### Linha 548 - Instrução Ambígua
```javascript
'**ATENÇÃO**: Se a mensagem atual responder o ÚLTIMO campo essencial faltando, NÃO faça mais perguntas! Apenas reconheça brevemente. Caso contrário, **faça a próxima pergunta** do campo ESSENCIAL que falta'
```

**Problema REAL Identificado**: A instrução checa se há 1 campo faltando ANTES de processar a mensagem, mas não considera o cenário onde:
1. ANTES de processar: 3 campos faltam (`consequencias`, `receita_mensal`, `funcionarios`)
2. Lead responde "Perda de clientes" (preenchendo `consequencias`)
3. GPT extrai o campo E faz próxima pergunta sobre `receita_mensal` (porque ainda havia 2 campos)
4. DEPOIS de extrair: Sistema detecta que todos os 5 campos essenciais foram coletados
5. Sistema avança de stage e CONCATENA mensagem de transição
6. **Resultado**: GPT perguntou sobre `receita_mensal` E sistema pergunta novamente na transição

**Root Cause**: O GPT não sabe que APÓS ele extrair o campo atual, todos os essenciais estarão completos. Ele só vê quantos campos faltam ANTES da extração.

### Linhas 412-425 - Lógica de Transição
```javascript
if (essenciaisColetados) {
  // Avançar para próximo stage
  this.advanceStage();

  const transitionMessage = this.getNextStageOpening();

  return {
    stage: this.currentStage,
    message: this.replacePlaceholders(analysis.resposta_consultiva), // ✅ Substituir placeholders
    transitionMessage: this.replacePlaceholders(transitionMessage),   // ✅ Substituir placeholders na transição
    needsTransition: true,                   // ✅ Flag para indicar que há transição
    // ...
  };
}
```

**Problema**: O sistema retorna TANTO a `resposta_consultiva` do GPT (que já inclui uma pergunta) QUANTO a `transitionMessage` (que é outra pergunta de direcionamento).

## Solução Proposta

### Opção 1: Instruir GPT a NÃO Fazer Perguntas Quando Campos Essenciais Completos

Modificar linha 548 para:

```javascript
3. ${essenciaisFaltando.length > 0 ? '**faça a próxima pergunta** do campo ESSENCIAL que falta APENAS se ainda houver campos essenciais faltando APÓS esta resposta. Se esta resposta completar todos os campos essenciais do stage, NÃO faça perguntas - apenas reconheça brevemente ("Perfeito!", "Entendi!", "Anotado!")' : '🚫 **PARE AQUI - NÃO FAÇA NENHUMA PERGUNTA** - Apenas diga algo como "Perfeito! Anotado." ou "Entendi, obrigado."'}
```

### Opção 2: Lógica de Decisão Mais Inteligente (RECOMENDADO)

Modificar a lógica nas linhas 400-425 para:

```javascript
if (essenciaisColetados) {
  console.log(`➡️ [BANT-V2] Todos os essenciais coletados - avançando`);

  // Persistir estado ANTES de avançar
  await this.persistState();
  this.advanceStage();

  // ✅ FIX: Verificar se o GPT já incluiu pergunta na resposta
  const hasQuestion = analysis.resposta_consultiva.includes('?');

  if (hasQuestion) {
    // GPT já fez uma pergunta - NÃO concatenar transição
    console.log(`⚠️ [BANT-V2] GPT já incluiu pergunta - pulando transição`);
    return {
      stage: this.currentStage,
      message: this.replacePlaceholders(analysis.resposta_consultiva),
      needsTransition: false, // ✅ Não concatenar transição
      stageData: this.stageData,
      isComplete: this.isBANTComplete(),
      mode: 'stages_v2'
    };
  } else {
    // GPT não fez pergunta - adicionar transição
    const transitionMessage = this.getNextStageOpening();
    return {
      stage: this.currentStage,
      message: this.replacePlaceholders(analysis.resposta_consultiva),
      transitionMessage: this.replacePlaceholders(transitionMessage),
      needsTransition: true,
      stageData: this.stageData,
      isComplete: this.isBANTComplete(),
      mode: 'stages_v2'
    };
  }
}
```

### Opção 3: Sempre Separar Reconhecimento de Transição (MAIS SEGURO)

Modificar instrução do GPT (linha 548) para NUNCA fazer perguntas quando coletar último campo:

```javascript
3. ${essenciaisFaltando.length === 1 ? '**ATENÇÃO CRÍTICA**: Este é o ÚLTIMO campo essencial do stage. Quando o lead responder, APENAS reconheça brevemente ("Perfeito!", "Entendi!", "Anotado!") SEM fazer nenhuma pergunta adicional. O sistema avançará automaticamente para o próximo stage.' : essenciaisFaltando.length > 1 ? '**faça a próxima pergunta** do campo ESSENCIAL que falta' : '🚫 **PARE AQUI - NÃO FAÇA NENHUMA PERGUNTA** - Apenas diga algo como "Perfeito! Anotado." ou "Entendi, obrigado."'}
```

## Teste de Regressão

Após aplicar a correção, testar:

1. Lead responde campo intermediário (ex: `problema_principal: "Vendas"`)
   - ✅ ORBION deve reconhecer E fazer próxima pergunta (`intensidade_problema`)

2. Lead responde PENÚLTIMO campo essencial (ex: `consequencias: "Perda de clientes"`)
   - ✅ ORBION deve reconhecer E fazer próxima pergunta (`receita_mensal`)
   - ❌ NÃO deve fazer pergunta duplicada

3. Lead responde ÚLTIMO campo essencial (ex: `funcionarios: "1-5"`)
   - ✅ ORBION deve apenas reconhecer ("Perfeito! Anotado.")
   - ✅ Sistema deve avançar para próximo stage (BUDGET)
   - ✅ Mensagem de direcionamento do BUDGET deve aparecer

## Recomendação Final

**Implementar Opção 3 (Mais Seguro)** porque:
- Separa claramente reconhecimento de transição
- Evita lógica complexa de detecção de perguntas
- É mais previsível e fácil de debugar
- Melhora a experiência do usuário (reconhecimento → pausa → nova pergunta)

## Arquivos Afetados

- `src/tools/bant_stages_v2.js` (linha 548 e linhas 400-425)
- `src/agents/specialist_agent.js` (linhas 258-275 - lógica de envio)

## Prioridade

🔴 **ALTA** - Bug afeta experiência do usuário e profissionalismo do agente
