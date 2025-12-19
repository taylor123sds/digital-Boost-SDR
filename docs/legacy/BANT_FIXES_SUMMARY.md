# 🔧 CORREÇÕES IMPLEMENTADAS - LOOPS BANT

## 1. ✅ Melhorar Regex de Extração de Need
**Arquivo**: `src/tools/bant_unified.js`
**Método**: `extractBANTInfo()` - linha 612

**Mudança**:
```javascript
// ANTES: Apenas retornava texto completo sem extração inteligente
need: text.trim()

// DEPOIS: Adicionar detecção de palavras-chave de necessidades
extractNeed(text) {
  const lowerText = text.toLowerCase();

  // 🎯 Padrões de necessidades comuns
  const needPatterns = [
    /(vendas? (paradas?|baixas?|caindo|diminuindo))/i,
    /(n[ãa]o consigo (atrair|vender|converter))/i,
    /(falta(m)? (clientes?|leads?|visibilidade))/i,
    /(preciso (crescer|aumentar|melhorar))/i,
    /(problema é|maior desafio|dificuldade com)/i,
    /(atendimento|marketing|site|conversão|tráfego)/i
  ];

  for (const pattern of needPatterns) {
    if (pattern.test(lowerText)) {
      return text.trim();
    }
  }

  return null;
}
```

---

## 2. ✅ Sistema de Perguntas Progressivas
**Arquivo**: `src/tools/bant_unified.js`
**Método**: `generateNextQuestion()` - adicionar novo método

**Mudança**: Criar perguntas diferentes baseadas no número de tentativas:

```javascript
getProgressiveQuestion(stage, attemptNumber) {
  const progressiveQuestions = {
    need: [
      // Tentativa 1 - Direta
      "Hoje o maior desafio é atrair mais gente, converter ou manter o público engajado?",
      // Tentativa 2 - Consultiva
      "Sei que nem sempre é fácil identificar o problema principal... Se você pudesse resolver UMA coisa agora, qual seria?",
      // Tentativa 3+ - Empática
      "Entendo que pode ser difícil falar sobre isso. Vou te ajudar: o que mais te preocupa quando pensa no crescimento da empresa?"
    ],
    budget: [
      // Tentativa 1 - Direta
      "Vocês já têm uma verba fixa pra marketing ou decidem conforme o projeto?",
      // Tentativa 2 - Consultiva
      "Sei que budget é um assunto delicado, mas preciso entender: vocês costumam investir quanto por mês em marketing?",
      // Tentativa 3+ - Empática
      "Sem compromisso - só pra eu te ajudar melhor: existe um valor que vocês conseguiriam investir, nem que seja algo simbólico?"
    ],
    authority: [
      // Tentativa 1 - Direta
      "Legal! E quem mais costuma participar quando vocês escolhem parceiros de marketing?",
      // Tentativa 2 - Consultiva
      "Entendo. Normalmente você decide sozinho ou tem mais alguém envolvido na aprovação?",
      // Tentativa 3+ - Empática
      "Tranquilo! Só pra eu não te fazer perder tempo: você é a pessoa certa pra falar sobre isso ou tem alguém que deveria estar nessa conversa?"
    ],
    timing: [
      // Tentativa 1 - Direta
      "Vocês estão olhando isso pra agora ou pensando mais pra quando virar o ano?",
      // Tentativa 2 - Consultiva
      "Entendo que timing é importante. Existe algum prazo ou evento que torna isso mais urgente?",
      // Tentativa 3+ - Empática
      "Sem pressão! Só pra eu organizar: isso é pra começar logo ou vocês preferem avaliar com calma?"
    ]
  };

  const questions = progressiveQuestions[stage] || [];
  const index = Math.min(attemptNumber, questions.length - 1);
  return questions[index] || questions[questions.length - 1];
}
```

---

## 3. ✅ Corrigir Contador de Tentativas
**Arquivo**: `src/tools/bant_unified.js`
**Método**: `processMessage()` - linhas 370-392

**Mudança**:
```javascript
// ANTES: Incrementava SEMPRE
if (['pain_discovery', 'need', 'budget', 'authority', 'timing'].includes(currentStageBeforeCheck)) {
  this.stageAttempts[currentStageBeforeCheck] = (this.stageAttempts[currentStageBeforeCheck] || 0) + 1;
}

// DEPOIS: Só incrementa se campo CONTINUA null após processar
const fieldBeforeExtraction = {
  pain_discovery: this.painDiscoveryCompleted,
  need: this.collectedInfo.need,
  budget: this.collectedInfo.budget,
  authority: this.collectedInfo.authority,
  timing: this.collectedInfo.timing
};

// ... [código de extração] ...

// Só incrementar se campo AINDA está vazio
if (['pain_discovery', 'need', 'budget', 'authority', 'timing'].includes(currentStageBeforeCheck)) {
  const fieldAfterExtraction = {
    pain_discovery: this.painDiscoveryCompleted,
    need: this.collectedInfo.need,
    budget: this.collectedInfo.budget,
    authority: this.collectedInfo.authority,
    timing: this.collectedInfo.timing
  };

  // Se campo continua null/false, incrementar tentativa
  if (!fieldAfterExtraction[currentStageBeforeCheck] &&
      !fieldBeforeExtraction[currentStageBeforeCheck]) {
    this.stageAttempts[currentStageBeforeCheck] = (this.stageAttempts[currentStageBeforeCheck] || 0) + 1;
    console.log(`🔄 [ANTI-LOOP] Tentativa ${this.stageAttempts[currentStageBeforeCheck]} no estágio ${currentStageBeforeCheck} (campo ainda vazio)`);
  } else if (fieldAfterExtraction[currentStageBeforeCheck]) {
    console.log(`✅ [ANTI-LOOP] Campo ${currentStageBeforeCheck} preenchido - resetando contador`);
    this.stageAttempts[currentStageBeforeCheck] = 0;
  }
}
```

---

## 4. ✅ Adicionar Lógica de Conclusão para pain_discovery
**Arquivo**: `src/tools/bant_unified.js`
**Método**: `processMessage()` - após extração de informações

**Mudança**:
```javascript
// DEPOIS da extração, verificar se pain_discovery deve ser concluído
if (this.currentStage === 'pain_discovery' && !this.painDiscoveryCompleted) {
  // Condições para concluir pain_discovery:
  // 1. Coletou qualquer informação sobre dor/problema
  // 2. OU passou por 2 tentativas sem progressão
  const hasAnyPainInfo = extracted.need ||
                         this.conversationHistory.some(msg =>
                           /problema|desafio|dificuldade|dor/i.test(msg)
                         );

  if (hasAnyPainInfo || this.stageAttempts.pain_discovery >= 2) {
    this.painDiscoveryCompleted = true;
    console.log(`✅ [PAIN-DISCOVERY] Concluído - hasInfo: ${hasAnyPainInfo}, tentativas: ${this.stageAttempts.pain_discovery}`);
  }
}
```

---

## 🎯 RESULTADO ESPERADO

### Antes:
```
1. ORBION: "Qual seu maior desafio?"
2. Lead: "Vendas estão paradas"
3. ORBION: "Qual seu maior desafio?" ❌ (repete)
4. Lead: "Já falei, vendas!"
5. ORBION: "Qual seu maior desafio?" ❌ (repete)
```

### Depois:
```
1. ORBION: "Qual seu maior desafio?"
2. Lead: "Vendas estão paradas"
3. ORBION: "Vocês já têm uma verba fixa pra marketing?" ✅ (avança para budget)
4. Lead: "Não sei ainda"
5. ORBION: "Sei que budget é delicado, mas preciso entender..." ✅ (pergunta consultiva)
```

---

## 📝 PRÓXIMOS PASSOS

1. Aplicar todas as mudanças no arquivo `bant_unified.js`
2. Testar com `test_full_conversations.sh`
3. Validar que:
   - ✅ Perguntas mudam a cada tentativa
   - ✅ Sistema avança quando coleta info parcial
   - ✅ Contador só incrementa se campo continua vazio
   - ✅ pain_discovery conclui automaticamente
