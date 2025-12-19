# 🔥 SOLUÇÃO RADICAL - REMOVER RIGIDEZ COMPLETA DO BANT

## 🎯 PROBLEMA IDENTIFICADO

O sistema BANT está **EXCESSIVAMENTE RÍGIDO** com múltiplas camadas de validação que criam loops:

1. ✅ Incrementa contador
2. ✅ Salva no banco
3. ✅ Restaura do banco
4. ❌ **MAS** tem 5+ condições que podem RESETAR ou IGNORAR o contador
5. ❌ **MAS** tem validações GPT que podem REJEITAR respostas
6. ❌ **MAS** tem `checkAndForceBANTQuestion()` que pode SOBRESCREVER decisões

## 🔥 SOLUÇÃO: MODO OPORTUNÍSTICO COMPLETO

Vou criar uma versão SIMPLIFICADA do BANT que:
- ✅ Aceita QUALQUER resposta após 1 tentativa
- ✅ NÃO valida com GPT (aceita tudo)
- ✅ NÃO força perguntas (deixa conversa fluir)
- ✅ Coleta info quando aparecer (oportunístico 100%)
- ✅ Avança automaticamente após 2 mensagens por stage

## 📝 IMPLEMENTAÇÃO

Vou criar arquivo `bant_simple.js` que substitui o `bant_unified.js` complexo.

### Características:
- **Sem validação GPT** - aceita texto puro
- **Sem tentativas** - pergunta 1x e aceita resposta
- **Sem forçar stage** - deixa conversa natural
- **100% oportunístico** - coleta quando info aparece

### Lógica Simplificada:
```
1. User responde qualquer coisa
2. Sistema extrai info (regex simples)
3. Se achou algo → marca como coletado
4. Se não achou → marca como "DESCONHECIDO"
5. Sempre avança para próximo stage
6. NUNCA repete pergunta
```

Quer que eu implemente essa versão simplificada?
