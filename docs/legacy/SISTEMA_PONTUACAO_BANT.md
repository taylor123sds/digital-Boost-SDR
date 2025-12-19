# Sistema de Pontuação BANT Stages V2

## 📊 Visão Geral

Cada stage do BANT possui **100 pontos possíveis** divididos entre **3 campos essenciais**. O sistema só avança para o próximo stage quando atingir exatamente **100 pontos** (todos os campos essenciais coletados).

### Regras Fundamentais

✅ **Todos os campos são ESSENCIAIS** - não há campos opcionais  
✅ **SEM limite de tentativas** - evita avançar com dados incompletos  
✅ **Score mínimo: 100 pontos** para cada stage  
✅ **Valores null ou "DESCONHECIDO"** não somam pontos  

---

## 1️⃣ Stage: NEED (Necessidade)

### Campos e Pontuação

| Campo | Pontos | Descrição | Exemplos |
|-------|--------|-----------|----------|
| **problema_principal** | 40 pts | Qual o principal desafio/problema | "vendas", "leads", "atendimento" |
| **intensidade_problema** | 30 pts | Quão grave/sério é o problema | "crítico", "impacta bastante", "moderado" |
| **consequencias** | 30 pts | O que esse problema causa | "perda de clientes", "não cresce" |

**Score Mínimo:** 100 pontos  
**Próximo Stage:** BUDGET

### Mensagem de Abertura
```
Perfeito! Vamos começar entendendo o que tá travando o crescimento de vocês. 🎯

Nossos dados mostram que 70% dos problemas vêm de: 
(1) geração de leads, (2) conversão, ou (3) retenção de clientes.

No caso de vocês, qual dessas áreas tá mais crítica hoje?
```

---

## 2️⃣ Stage: BUDGET (Orçamento)

### Campos e Pontuação

| Campo | Pontos | Descrição | Exemplos |
|-------|--------|-----------|----------|
| **faixa_investimento** | 40 pts | Quanto podem investir por mês ou inicial | "R$ 5-10k/mês", "R$ 15k inicial" |
| **roi_esperado** | 30 pts | Que retorno/resultado esperam | "payback 4 meses", "dobrar vendas" |
| **flexibilidade_budget** | 30 pts | Budget fixo ou pode aumentar | "fixo", "flexível", "pode dobrar" |

**Score Mínimo:** 100 pontos  
**Próximo Stage:** AUTHORITY

### ⚠️ Detecção Especial para `flexibilidade_budget`

Se o lead disser:
- "aberto"
- "flexível"
- "pode aumentar"
- "conforme resultados"

→ O sistema marca automaticamente como **"Flexível"**

### Mensagem de Abertura
```
Show! Agora vamos falar de investimento. 💰

Nossos clientes de PME geralmente investem entre R$ 2-8k/mês 
e recuperam o investimento em 4-6 meses.

Pra resolver o problema que vocês têm, qual faixa de investimento 
mensal cabe no orçamento? (R$ 2-5k, R$ 5-10k, ou mais)
```

---

## 3️⃣ Stage: AUTHORITY (Autoridade)

### Campos e Pontuação

| Campo | Pontos | Descrição | Exemplos |
|-------|--------|-----------|----------|
| **decisor_principal** | 40 pts | Quem decide sobre investimentos | "eu", "eu + sócio", "comitê" |
| **autonomia_decisao** | 30 pts | Tem autonomia ou precisa aprovação | "eu decido", "preciso CFO aprovar" |
| **processo_decisao** | 30 pts | Como funciona o processo | "rápido", "várias etapas" |

**Score Mínimo:** 100 pontos  
**Próximo Stage:** TIMING

### Mensagem de Abertura
```
Ótimo! Agora sobre decisão. 👔

Nas PMEs que atendemos, 60% das decisões envolvem 2-3 pessoas 
(dono + sócio/CFO).

No caso de vocês: você decide sozinho ou precisa alinhar com alguém?
```

---

## 4️⃣ Stage: TIMING (Urgência)

### Campos e Pontuação

| Campo | Pontos | Descrição | Exemplos |
|-------|--------|-----------|----------|
| **urgencia** | 40 pts | Quando querem começar | "agora/urgente", "1-2 meses" |
| **motivo_urgencia** | 30 pts | Por que esse timing? | "Black Friday", "fechando ano" |
| **prazo_ideal** | 30 pts | Data ideal para ter rodando | "até 15/12", "antes de janeiro" |

**Score Mínimo:** 100 pontos  
**Próximo Step:** Handoff para Scheduler Agent

### Mensagem de Abertura
```
Perfeito! E sobre urgência? ⏰

Empresas que começam em até 30 dias geralmente veem ROI mais rápido 
(resolvem antes de perder mais receita).

Vocês querem começar com urgência ou é algo pra próximos 2-3 meses?
```

---

## 🎯 Lógica de Cálculo

### Função: `calculateStageScore(stage)`

```javascript
calculateStageScore(stage) {
  const requirements = STAGE_REQUIREMENTS[stage];
  const camposColetados = this.stageData[stage].campos;
  const scoring = requirements.scoring;

  let score = 0;

  // Somar pontos dos campos coletados
  for (const campo in camposColetados) {
    const valorColetado = camposColetados[campo];
    if (valorColetado && valorColetado !== 'DESCONHECIDO' && scoring[campo]) {
      score += scoring[campo];
    }
  }

  return score;
}
```

### Passos:
1. Percorre todos os campos coletados no stage atual
2. Para cada campo com valor válido (não nulo, não "DESCONHECIDO"):
   - Soma os pontos definidos no `scoring` do campo
3. Retorna total de pontos

---

## 📈 Exemplo Prático - Stage NEED

### Cenário 1: Incompleto (70 pontos)

```javascript
Campos coletados:
{
  problema_principal: "vendas",       // +40 pontos ✅
  intensidade_problema: "crítico",    // +30 pontos ✅
  consequencias: null                 // +0 pontos  ❌
}

Score: 70/100 pontos
Status: INCOMPLETO → Continua no stage NEED
```

### Cenário 2: Completo (100 pontos)

```javascript
Campos coletados:
{
  problema_principal: "vendas",           // +40 pontos ✅
  intensidade_problema: "crítico",        // +30 pontos ✅
  consequencias: "perdemos clientes"      // +30 pontos ✅
}

Score: 100/100 pontos
Status: COMPLETO ✅ → Avança para BUDGET
```

---

## 🔍 Função de Verificação

### Função: `checkEssenciaisColetados(stage)`

```javascript
checkEssenciaisColetados(stage) {
  const requirements = STAGE_REQUIREMENTS[stage];
  const currentScore = this.calculateStageScore(stage);
  const scoreMinimo = requirements.scoreMinimo;  // Sempre 100

  return currentScore >= scoreMinimo;  // true = pode avançar
}
```

---

## 📊 Progressão Completa do BANT

```
Stage 1: NEED      (100 pts) → 3 campos essenciais
   ↓
Stage 2: BUDGET    (100 pts) → 3 campos essenciais
   ↓
Stage 3: AUTHORITY (100 pts) → 3 campos essenciais
   ↓
Stage 4: TIMING    (100 pts) → 3 campos essenciais
   ↓
BANT COMPLETO ✅   (400 pts totais)
   ↓
Handoff → Scheduler Agent
```

---

## ⚠️ Regras Importantes

1. ❌ **NÃO avança** se score < 100 (evita dados incompletos)
2. ✅ **SEM limite de tentativas** (evita loop de avançar/voltar)
3. ✅ **TODOS os campos são essenciais** (100% necessários)
4. ✅ Valores **null** ou **"DESCONHECIDO"** NÃO somam pontos
5. ✅ Stage só completa quando **100/100 pontos** atingidos

---

## 🔧 Implementação

**Arquivo:** `src/tools/bant_stages_v2.js`

**Principais funções:**
- `calculateStageScore(stage)` - Calcula pontuação do stage
- `checkEssenciaisColetados(stage)` - Verifica se pode avançar
- `isBANTComplete()` - Verifica se BANT completo (timing finalizado)

**Constantes:**
- `STAGES` = ['need', 'budget', 'authority', 'timing']
- `STAGE_REQUIREMENTS` - Define campos, pontuação e mensagens

---

**Última atualização:** 2025-10-27  
**Versão:** BANT Stages V2 (com otimizações de prompt e ROI realistas)
