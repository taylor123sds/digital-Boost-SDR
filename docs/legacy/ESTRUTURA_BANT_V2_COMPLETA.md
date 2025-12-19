# 📊 ESTRUTURA COMPLETA: BANT STAGES V2

**Status**: ✅ IMPLEMENTADO E RODANDO
**Servidor**: PID 90696, Porta 3001

---

## 🎯 RESUMO DO SISTEMA

Cada estágio tem:
1. ✅ **Pergunta de Direcionamento** (mensagem de abertura)
2. ✅ **Pontos Principais** (campos essenciais + opcionais)
3. ✅ **Sistema de Pontos** (para saber quando avançar)

---

## 📋 STAGE 1: NEED (Descoberta de Dor)

### 🎯 Pergunta de Direcionamento:
```
Vamos começar pelo mais importante: **entender o desafio de vocês**. 🎯

Me conta: qual o principal problema que vocês enfrentam hoje em marketing/vendas?
```

### 📊 Pontos Principais:

#### ESSENCIAL (obrigatório para avançar):
- **`problema_principal`** (100 pontos)
  - O que coletar: Principal desafio/problema de marketing ou vendas
  - Exemplos: "falta de leads", "baixa conversão", "dificuldade em vender"

#### OPCIONAL (bônus):
- **`impacto_negocio`** (50 pontos bônus)
  - O que coletar: Como isso impacta o negócio
  - Exemplos: "vendas caindo", "perdendo mercado", "crescimento travado"

### 📈 Sistema de Pontos:
- **Mínimo para avançar**: 100 pontos (problema_principal coletado)
- **Máximo possível**: 150 pontos (problema + impacto)
- **Conversão**: 100 pontos = AVANÇA / < 100 = CONTINUA no stage

---

## 📋 STAGE 2: BUDGET (Investimento)

### 🎯 Pergunta de Direcionamento:
```
Perfeito! Agora vamos falar sobre **investimento**. 💰

Vocês têm uma verba separada para marketing ou avaliam por projeto?
Pode ser uma faixa aproximada.
```

### 📊 Pontos Principais:

#### ESSENCIAL:
- **`verba_disponivel`** (100 pontos)
  - O que coletar: Quanto podem investir
  - Exemplos: "R$ 3-5 mil/mês", "depende do ROI", "até R$ 10k"

#### OPCIONAL:
- **`flexibilidade`** (50 pontos bônus)
  - O que coletar: Se budget é fixo ou flexível
  - Exemplos: "fixo", "flexível dependendo resultado", "pode aumentar"

### 📈 Sistema de Pontos:
- **Mínimo para avançar**: 100 pontos
- **Máximo possível**: 150 pontos

---

## 📋 STAGE 3: AUTHORITY (Decisão)

### 🎯 Pergunta de Direcionamento:
```
Show! Agora sobre o **processo de decisão**. 👔

Você toma essas decisões sozinho ou tem mais alguém envolvido
(sócio, diretor, etc)?
```

### 📊 Pontos Principais:

#### ESSENCIAL:
- **`decisor_principal`** (100 pontos)
  - O que coletar: Quem decide sobre investimentos
  - Exemplos: "eu decido", "preciso consultar sócio", "decisão em comitê"

#### OPCIONAL:
- **`processo_decisao`** (50 pontos bônus)
  - O que coletar: Como funciona aprovação
  - Exemplos: "rápido", "precisa aprovação formal", "analiso e decido"

### 📈 Sistema de Pontos:
- **Mínimo para avançar**: 100 pontos
- **Máximo possível**: 150 pontos

---

## 📋 STAGE 4: TIMING (Urgência)

### 🎯 Pergunta de Direcionamento:
```
Ótimo! Agora sobre **timing**. ⏰

Vocês estão pensando em começar quando? É algo urgente ou podem aguardar?
```

### 📊 Pontos Principais:

#### ESSENCIAL:
- **`urgencia`** (100 pontos)
  - O que coletar: Quando querem começar
  - Exemplos: "agora", "próximo mês", "próximo trimestre", "avaliando"

#### OPCIONAL:
- **`prazo_ideal`** (50 pontos bônus)
  - O que coletar: Data-limite ou evento importante
  - Exemplos: "preciso antes do natal", "sem prazo específico", "até março"

### 📈 Sistema de Pontos:
- **Mínimo para avançar**: 100 pontos
- **Máximo possível**: 150 pontos

---

## 📋 STAGE 5: CLOSING (Fechamento)

### 🎯 Pergunta de Direcionamento:
```
Perfeito! Última etapa: vou preparar um **diagnóstico personalizado** pra você. 📊

Qual seu melhor e-mail para eu enviar?
```

### 📊 Pontos Principais:

#### ESSENCIAL:
- **`email`** (100 pontos)
  - O que coletar: E-mail válido do lead
  - Exemplos: "joao@empresa.com", "maria.silva@gmail.com"
  - VALIDAÇÃO: Deve conter @ e domínio válido

#### OPCIONAL: nenhum

### 📈 Sistema de Pontos:
- **Mínimo para avançar**: 100 pontos (email coletado)
- **Máximo possível**: 100 pontos

---

## 📊 SCORE GERAL DO BANT

### Cálculo:
```
Score Total = (pontos_need + pontos_budget + pontos_authority + pontos_timing + pontos_closing) / 5

Mínimo para completar BANT: 500 pontos (100 por stage)
Máximo possível: 650 pontos (130 por stage em média)
```

### Interpretação:
- **500-549 pontos** (77-84%): Qualificação Básica ✅
- **550-599 pontos** (85-92%): Qualificação Boa ✅✅
- **600-650 pontos** (92-100%): Qualificação Excelente ✅✅✅

---

## 🔄 LÓGICA DE AVANÇO

```javascript
// Para cada stage:
1. GPT analisa mensagem do lead
2. Extrai campos essenciais e opcionais
3. Calcula pontos:
   - ESSENCIAL coletado = 100 pontos
   - OPCIONAL coletado = +50 pontos

4. Verifica se pode avançar:
   if (pontos >= 100) {
     // ✅ AVANÇAR para próximo stage
     mostrar_mensagem_de_transicao()
     abrir_proximo_stage()
   } else {
     // ❌ CONTINUAR no stage atual
     gpt_faz_pergunta_diferente()
   }
```

---

## 📈 EXEMPLO DE CONVERSA COM SCORES

```
[SDR confirma humano]

ORBION (NEED): "Vamos começar pelo mais importante: **entender o desafio de vocês**. 🎯

Me conta: qual o principal problema que vocês enfrentam hoje?"

LEAD: "Quero mais clientes"

[GPT extrai:]
- problema_principal: "aumentar base de clientes" → 100 pontos ✅
- impacto_negocio: null
[Score NEED: 100/150 → AVANÇA]

ORBION: "Entendi! Vou te ajudar com isso.

Perfeito! Agora vamos falar sobre **investimento**. 💰

Vocês têm uma verba separada para marketing?"

LEAD: "Depende do resultado mas posso investir uns 5 mil"

[GPT extrai:]
- verba_disponivel: "R$ 5 mil/mês (flexível ROI)" → 100 pontos ✅
- flexibilidade: "depende do resultado" → 50 pontos ✅
[Score BUDGET: 150/150 → AVANÇA]

ORBION: "Perfeito, faz sentido investir com base em resultado!

Show! Agora sobre o **processo de decisão**. 👔

Você decide sozinho ou tem mais alguém envolvido?"

LEAD: "Eu decido"

[GPT extrai:]
- decisor_principal: "eu decido (decisor único)" → 100 pontos ✅
- processo_decisao: null
[Score AUTHORITY: 100/150 → AVANÇA]

ORBION: "Ótimo, decisão rápida!

Agora sobre **timing**. ⏰

Vocês estão pensando em começar quando?"

LEAD: "Quero começar logo"

[GPT extrai:]
- urgencia: "início imediato" → 100 pontos ✅
- prazo_ideal: null
[Score TIMING: 100/150 → AVANÇA]

ORBION: "Perfeito! Vamos agilizar então.

Última etapa: **diagnóstico personalizado**. 📊

Qual seu e-mail?"

LEAD: "joao@empresa.com"

[GPT extrai:]
- email: "joao@empresa.com" → 100 pontos ✅
[Score CLOSING: 100/100 → COMPLETO]

[SCORE TOTAL: 550/650 (85%) → QUALIFICAÇÃO BOA ✅✅]
[HANDOFF para Scheduler]
```

---

## 📊 LOGS ESPERADOS

```
🎯 [BANT-V2] Stage: need | Tentativa: 1
📋 [BANT-V2] Campos coletados: {}
📊 [BANT-V2] Análise GPT: {problema_principal: "aumentar clientes", impacto_negocio: null}
✅ [BANT-V2] Essenciais coletados: SIM
📈 [BANT-V2] Score do stage: 100/150 (67%)
➡️ [BANT-V2] Avançando para: budget

🎯 [BANT-V2] Stage: budget | Tentativa: 1
📋 [BANT-V2] Campos coletados: {}
📊 [BANT-V2] Análise GPT: {verba_disponivel: "R$ 5k/mês", flexibilidade: "ROI"}
✅ [BANT-V2] Essenciais coletados: SIM
📈 [BANT-V2] Score do stage: 150/150 (100%)
➡️ [BANT-V2] Avançando para: authority

... [continua]

🏁 [BANT-V2] COMPLETO!
📊 [BANT-V2] Score Final: 550/650 (85%)
📝 [BANT-V2] Qualificação: BOA ✅✅
🔀 [SPECIALIST] Fazendo handoff para Scheduler
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Cada stage tem pergunta direcionada
- [x] Campos ESSENCIAIS definidos (100 pontos cada)
- [x] Campos OPCIONAIS definidos (+50 pontos cada)
- [x] Lógica de avanço (≥ 100 pontos)
- [x] GPT extrai campos automaticamente
- [x] SEM limite de tentativas (evita loops)
- [ ] **PENDENTE**: Adicionar logs de score nos processos

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Sistema implementado e rodando
2. 🔲 **Adicionar cálculo de score** nos logs
3. 🔲 **Testar via WhatsApp** para validar fluxo
4. 🔲 **Ajustar prompts GPT** se necessário

---

**Sistema Pronto**: Cada stage tem direcionamento, pontos principais e sistema de pontos! 🎯
