# Exit Detectors - Guia de Uso

## 📋 Arquivos Disponíveis

### 1. `exit_detector.js` (Completo - 11KB)
**Quando Usar:** Detecção completa com blacklist, análise de contexto e histórico

**Funcionalidades:**
- ✅ Detecção de intenção de saída por keywords
- ✅ Análise de contexto da conversa
- ✅ Verificação de blacklist de números
- ✅ Geração de respostas contextualizadas
- ✅ Histórico de interações

**Exemplo:**
```javascript
import { isExitIntent, generateExitResponse, isBlacklisted } from './exit_detector.js';

const text = "não quero mais, tchau";
const blacklisted = isBlacklisted(phoneNumber);

if (blacklisted || isExitIntent(text)) {
  const response = generateExitResponse({
    reason: 'exit_intent',
    context: conversationHistory
  });
  // Enviar response
}
```

---

### 2. `exit_detector_simple.js` (Simples - 956B)
**Quando Usar:** Detecção rápida sem contexto ou blacklist

**Funcionalidades:**
- ✅ Detecção básica por keywords
- ✅ Respostas aleatórias genéricas
- ❌ Sem blacklist
- ❌ Sem análise de contexto

**Exemplo:**
```javascript
import { isExitIntent, generateExitResponse } from './exit_detector_simple.js';

if (isExitIntent(text)) {
  const response = generateExitResponse();
  // Enviar response
}
```

---

## 🎯 Quando Usar Cada Um

| Cenário | Recomendação |
|---------|--------------|
| **Produção com leads** | `exit_detector.js` |
| **Testes rápidos** | `exit_detector_simple.js` |
| **Sistema com blacklist** | `exit_detector.js` |
| **Performance crítica** | `exit_detector_simple.js` |
| **Análise de contexto necessária** | `exit_detector.js` |

---

## 📊 Comparação

| Feature | exit_detector.js | exit_detector_simple.js |
|---------|------------------|------------------------|
| Keywords | 15+ | 13 |
| Blacklist | ✅ | ❌ |
| Context Analysis | ✅ | ❌ |
| Response Types | 6 tipos | 3 tipos |
| Tamanho | 11KB | 956B |
| Performance | Médio | Rápido |

---

## 🔧 Status Atual

**Sistema Ativo:** Nenhum dos dois está sendo usado atualmente.

O sistema atual de opt-out usa:
- `src/tools/intelligent_opt_out.js` (classificação via OpenAI)
- `src/security/OptOutInterceptor.js` (interceptação no pipeline)

**Se precisar ativar:**
1. Importar no `OptOutInterceptor.js`
2. Adicionar verificação antes de processar agente
3. Testar com casos de saída

---

## 💡 Recomendação

Para o sistema ORBION atual:
- **Manter ambos** para casos de uso diferentes
- **Usar exit_detector.js** se precisar de blacklist
- **Usar exit_detector_simple.js** para fallback rápido

**Não deletar** - podem ser úteis em features futuras.

---

**Última Atualização:** 2025-11-13
**Autor:** ORBION Team
