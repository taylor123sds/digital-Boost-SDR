# 📚 CATÁLOGO DE MENSAGENS REALMENTE USADAS - ORBION

**Versão:** 2.1.0 (Mensagens Empáticas Completas)
**Última Atualização:** 31/10/2025
**Status:** Documentação COMPLETA - Mensagens Ativas + Empáticas + Gap Analysis

---

## ⚠️ IMPORTANTE

Este catálogo contém **APENAS** as mensagens que estão **realmente sendo usadas** no código ativo do ORBION.

Mensagens de arquivos como `question_variations.js` e `sector_pain_messages.js` **NÃO estão incluídas** pois não são utilizadas no fluxo atual.

---

## 📋 ÍNDICE

1. [Mensagens Opening BANT V2 (Hard-coded)](#1-mensagens-opening-bant-v2-hard-coded)
2. [Regras de Mensagens Consultivas GPT (BANT V2)](#2-regras-de-mensagens-consultivas-gpt-bant-v2)
3. [Mensagens Persona (Referência)](#3-mensagens-persona-referência)
4. [Mensagens de Sistema e Empáticas](#4-mensagens-de-sistema-e-empáticas)
   - Bot Detection
   - Opt-Out
   - Escalation
   - Re-engagement (48h)
   - Erro Técnico
   - Casos Especiais (Budget, Decisor, etc.)
   - **🩹 Situações Pessoais Sensíveis** (Cachorro Fugiu, Bati Carro, Familiar Adoeceu)
   - **GAP Analysis** (mensagens não implementadas)

---

## 1. MENSAGENS OPENING BANT V2 (Hard-coded)

### Fonte: `src/tools/bant_stages_v2.js` (linhas 40-116)

Estas são as **4 mensagens fixas** enviadas ao iniciar cada stage do BANT V2:

### 🎯 NEED Stage Opening

**Quando:** Início do stage NEED (descoberta de problema)

```
Perfeito! Vamos começar entendendo **o que tá travando o crescimento de vocês**. 🎯

Nossos dados mostram que 70% dos problemas vêm de: (1) geração de leads, (2) conversão, ou (3) retenção de clientes.

No caso de vocês, qual dessas áreas tá mais crítica hoje?
```

**Campos coletados neste stage:**
- problema_principal (40 pts)
- intensidade_problema (30 pts)
- consequencias (30 pts)

---

### 💰 BUDGET Stage Opening

**Quando:** Transição de NEED → BUDGET (após coletar 100 pts)

```
Show! Agora vamos falar de **investimento**. 💰

Nossos clientes de PME geralmente investem entre R$ 2-8k/mês e recuperam o investimento em 4-6 meses.

Pra resolver o problema que vocês têm, qual faixa de investimento mensal cabe no orçamento? (R$ 2-5k, R$ 5-10k, ou mais)
```

**Campos coletados neste stage:**
- faixa_investimento (40 pts)
- roi_esperado (30 pts)
- flexibilidade_budget (30 pts)

---

### 👔 AUTHORITY Stage Opening

**Quando:** Transição de BUDGET → AUTHORITY (após coletar 100 pts)

```
Ótimo! Agora sobre **decisão**. 👔

Nas PMEs que atendemos, 60% das decisões envolvem 2-3 pessoas (dono + sócio/CFO).

No caso de vocês: você decide sozinho ou precisa alinhar com alguém?
```

**Campos coletados neste stage:**
- decisor_principal (40 pts)
- autonomia_decisao (30 pts)
- processo_decisao (30 pts)

---

### ⏰ TIMING Stage Opening

**Quando:** Transição de AUTHORITY → TIMING (após coletar 100 pts)

```
Beleza! Última pergunta: **timing**. ⏰

A maioria dos clientes que fecham conosco começam em 2-4 semanas.

No caso de vocês, precisam de algo pra agora, próximo mês, ou estão só avaliando pra depois?
```

**Campos coletados neste stage:**
- urgencia_atual (40 pts)
- prazo_implementacao (30 pts)
- eventos_importantes (30 pts)

---

## 2. REGRAS DE MENSAGENS CONSULTIVAS GPT (BANT V2)

### Fonte: `src/tools/bant_stages_v2.js` (linhas 323-449)

O BANT V2 **gera mensagens dinamicamente** usando GPT-4o-mini com regras estritas.

### 🎯 Estrutura da Resposta Consultiva

Todas as respostas seguem este formato:

**PASSO 1: RECONHECIMENTO ESPECÍFICO** (1-2 linhas)
- Pegar EXATAMENTE o que o lead disse
- Se lead diz "vendas", falar sobre vendas especificamente
- Se lead diz "R$ 5k", contextualizar esse valor
- ❌ **PROIBIDO:** "Entendo o desafio", "Faz sentido", "Compreendo"

**PASSO 2: DADO/CASE RELEVANTE** (1 linha)
- Mencionar dado ou case da Digital Boost relevante
- Conectar com o que o lead disse

**PASSO 3: TRANSIÇÃO NATURAL**
- ❌ NÃO usar "voltando ao assunto" ou "mas voltando"
- ✅ Usar: "No caso de vocês", "Especificamente", "Pra eu entender melhor"

**PASSO 4: PERGUNTA DO PRÓXIMO CAMPO**
- Pergunta específica do campo BANT que falta

---

### 📝 Exemplos de Respostas Corretas (GPT)

#### Exemplo 1: Lead responde "Vendas"

**Campo coletado:** problema_principal

**Resposta GPT:**
```
Vendas travadas geralmente têm raiz em 3 pontos: falta de leads qualificados, funil desorganizado, ou follow-up inconsistente.

No caso de vocês, quão grave é isso: crítico, impacta bastante, ou moderado?
```

---

#### Exemplo 2: Lead responde "Abertos a aumentar conforme resultados"

**Campo coletado:** flexibilidade_budget

**Resposta GPT:**
```
Ótimo! Clientes que escalam investimento com resultados crescem 3x mais rápido.

E sobre quem decide: você decide sozinho ou precisa alinhar com alguém?
```

---

#### Exemplo 3: Lead responde "R$ 5k/mês"

**Campo coletado:** faixa_investimento

**Resposta GPT:**
```
R$ 5k/mês é uma faixa comum para PMEs que estão começando com automação. Nossos clientes nessa faixa geralmente veem payback em 4-5 meses.

E qual ROI vocês precisam ver pra valer a pena? Tipo, quanto a mais de faturamento?
```

---

### ⚠️ Regras de Extração de Campos

**EXTRAIR quando:**
- Lead respondeu DIRETAMENTE a pergunta
- Resposta de 1 palavra É válida ("Vendas", "Crítico", "R$ 5k")
- Lead menciona espontaneamente informação de campo

**NÃO EXTRAIR quando:**
- Lead responde vago ("Sim", "Ok", "Talvez")
- Lead muda de assunto sem responder
- Não tem certeza do que ele quis dizer

---

## 3. MENSAGENS PERSONA (Referência)

### Fonte: `prompts/core/persona.md`

Estas mensagens servem como **referência de tom e estilo**, mas não são hard-coded.

### Example 7: Out-of-Scope Redirect (USADA)

**Lead:** "Vocês fazem impressão de materiais gráficos?"

**ORBION:**
```
Boa pergunta! Impressão gráfica não é nossa especialidade — a gente foca mais na parte digital: sites, marketing online e vídeos.

Mas se você precisar de design digital ou campanha online pra divulgar esses materiais, aí sim podemos ajudar! Faz sentido?
```

**Análise:**
- ✅ Honesta sobre limitações
- ✅ Redireciona para serviço relevante
- ✅ Tom positivo mantido
- ✅ Consultivo até o fim

---

### Template Geral de Redirecionamento

```
Boa pergunta! [Assunto mencionado] não é nossa especialidade — a gente foca mais na parte digital: sites, marketing online e vídeos.

Mas se você precisar de [alternativa relevante dentro do escopo], aí sim podemos ajudar! Faz sentido?
```

---

## 4. MENSAGENS DE SISTEMA E EMPÁTICAS

### Fonte: `prompts/core/policies.md` + `src/utils/bot_detector.js` + `src/handlers/message_orchestrator.js`

### 🤖 Bot Detection - Bridge Message

**Quando:** Bot score ≥ 0.40 (suspeita de bot)

```
Opa! Antes de continuar, preciso confirmar que estou falando com uma pessoa real.

Por favor, responda exatamente assim: HUMANO OK
```

**Verificação aceita:**
- "HUMANO OK" (case insensitive)
- "humano ok"

**Após verificação:**
- Limpa flag de bot
- Continua conversa normalmente

---

### 🚫 Opt-Out - Confirmação

**Quando:** Lead envia "REMOVER", "CANCELAR", "PARAR", "SAIR"

```
Entendido! Você foi removido da nossa lista de contatos.

Obrigado pelo seu tempo. Se mudar de ideia no futuro, é só nos chamar!
```

**Ação:**
- Adiciona à blacklist imediatamente
- Nunca mais envia mensagens
- Bloqueia permanentemente

---

### 👤 Escalation para Humano

**Quando:**
- Questão complexa fora do escopo
- Cliente frustrado
- Loop conversacional detectado
- Pedido específico de falar com humano

```
Essa é uma excelente questão que merece atenção especial.

Vou conectar você com um especialista da nossa equipe que pode te ajudar melhor com isso.

Pode deixar seu melhor e-mail e telefone? Entramos em contato em até 24h.
```

---

### 📬 Re-engagement (após 48h sem resposta)

**Quando:** Conversa pausada por 48h+ (definido em policies)

**Status:** ⚠️ DOCUMENTADO mas NÃO IMPLEMENTADO no código

```
Oi [nome]! Vi que nossa conversa ficou pausada.

Sem pressão nenhuma - se agora não é o momento, tudo bem!

Mas se ainda tiver interesse, estou por aqui pra continuar. 😊
```

**Política (após 7 dias):**
- Marcar como "cold lead"
- Parar engajamento ativo
- Não enviar mais mensagens

**Localização no código:** Apenas em `prompts/core/policies.md` (linhas 567-581) - não implementado em BANT V2

---

### 🔧 Mensagem de Erro Técnico

**Quando:** Erro no processamento de mensagem (MessageOrchestrator)

**Fonte:** `src/handlers/message_orchestrator.js:106`

```
Desculpe, tive um problema técnico. Pode repetir sua mensagem em alguns segundos?
```

**Características:**
- Tom empático e honesto
- Não culpa o usuário
- Fornece solução clara (repetir mensagem)
- Menciona timeframe (alguns segundos)

---

### 💼 Mensagens de Casos Especiais (policies.md)

#### Case 1: Lead Sem Budget Agora

**Quando:** Lead demonstra interesse mas não tem orçamento no momento

```
Entendo perfeitamente! Muitos clientes nossos começaram assim também.

Vamos fazer o seguinte: guardo seu contato e daqui a [timeframe que o lead mencionou] te mando uma mensagem pra ver se faz sentido retomar. Sem compromisso.

Enquanto isso, posso te mandar alguns materiais que já ajudam a resolver [problema mencionado]?
```

**Tom:** Empático, sem pressão, oferece valor imediato

---

#### Case 2: Lead Não é Decisor

**Quando:** Pessoa não tem poder de decisão

```
Entendi! Normalmente quem decide esse tipo de investimento em vocês é quem? O dono? Sócio? Diretor de Marketing?

Se você quiser, posso preparar um material explicativo que facilita você apresentar internamente. Tipo um "business case" pronto.

Ou se preferir, posso conversar direto com a pessoa que decide - aí você só faz a ponte. O que acha que funciona melhor?"
```

**Tom:** Consultivo, facilita o processo, oferece 2 caminhos

---

#### Case 3: Lead Precisa Convencer Alguém

**Quando:** Lead gosta mas precisa convencer sócio/gerente

```
Super comum! 70% dos nossos clientes precisam alinhar com alguém antes de fechar.

Olha, vou te ajudar. Posso preparar um material explicativo que você pode mostrar pra pessoa que decide, facilitando a conversa. Te mando por e-mail, pode ser?
```

**Tom:** Validador, oferece suporte concreto

---

#### Case 4: Lead Quer Reunião Mas BANT Score Baixo

**Quando:** Lead pede reunião mas qualificação insuficiente

```
Claro! Vamos marcar uma conversa.

Só pra alinhar expectativa: essa primeira conversa é pra entender melhor a situação de vocês e ver se faz sentido trabalharmos juntos. É mais uma consultoria gratuita do que apresentação comercial.

Funciona assim pra você? [Propose slots]
```

**Tom:** Transparente sobre objetivo, posiciona valor (consultoria grátis)

---

### 🩹 Mensagens Empáticas para Situações Pessoais Sensíveis

**Fonte:** `src/tools/bant_stages_v2.js` (linhas 484-500) + `src/tools/contextual_redirect.js` (linhas 96-106)

**Status:** ✅ **IMPLEMENTADAS** no código

#### 🐕 Situação: Cachorro Fugiu

**Quando:** Lead menciona "meu cachorro fugiu", "cachorro desapareceu"

**Keywords detectadas:** fugiu, desapareceu

```
Sinto muito em saber sobre isso. Espero sinceramente que tudo se resolva da melhor forma possível.

Fique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você.
```

**Comportamento:**
- ✅ Pausa qualificação BANT completamente
- ✅ Não faz mais perguntas
- ✅ Tom extremamente empático
- ✅ Oferece retorno sem pressão

---

#### 🚗 Situação: Bati o Carro

**Quando:** Lead menciona "bati o carro", "bateu o carro", "acidente", "colisão", "batida"

**Keywords detectadas:** bati o carro, bateu, batida, acidente, colisão

```
Lamento muito saber disso. Desejo que tudo se resolva da melhor maneira.

Fique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você.
```

**Comportamento:**
- ✅ Pausa qualificação BANT completamente
- ✅ Não faz mais perguntas
- ✅ Tom extremamente empático
- ✅ Oferece retorno sem pressão

---

#### 💙 Situação: Mãe Adoeceu (ou Familiar)

**Quando:** Lead menciona "minha mãe adoeceu", "familiar doente", "hospital", "internado"

**Keywords detectadas:** doente, doença, adoeceu, hospital, internado, grave

```
Compreendo a situação delicada pela qual você está passando. Espero que tudo se resolva bem.

Fique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que foi mais conveniente para você.
```

**Comportamento:**
- ✅ Pausa qualificação BANT completamente
- ✅ Não faz mais perguntas
- ✅ Tom extremamente empático
- ✅ Oferece retorno sem pressão

---

#### 🆘 Lista Completa de Keywords Sensíveis (contextual_redirect.js:97)

**Situações que ativam resposta empática automática:**

- Saúde: doente, doença, adoeceu, hospital, internado, cirurgia, uti, grave, machucado
- Luto: faleceu, morreu, morte, luto, funeral, perdeu
- Emergências: fugiu, desapareceu, acidente, bati o carro, bateu o carro, batida, colisão, emergência
- Violência: assaltado, roubado, furtado
- Situações difíceis: problema grave, situação difícil, complicado

**Variações de Bridge Messages (contextual_redirect.js:98-101):**

1. "Sinto muito em saber sobre isso. Espero sinceramente que tudo se resolva da melhor forma possível."
2. "Compreendo a situação delicada pela qual você está passando. Espero que tudo se resolva bem."
3. "Lamento muito saber disso. Desejo que tudo se resolva da melhor maneira."

**Flow Return (sempre o mesmo):**
```
Fique à vontade para cuidar do que for necessário neste momento. Quando estiver mais tranquilo(a), podemos retomar nossa conversa. Estarei à disposição para seguir no momento que for mais conveniente para você.
```

**Flags Especiais:**
- `requiresExtraEmpathy: true` - Resposta ainda mais cuidadosa
- `pauseQualification: true` - Para qualificação BANT completamente

---

### ⚠️ GAP IDENTIFICADO

**MENSAGENS DOCUMENTADAS mas NÃO IMPLEMENTADAS:**

1. **Re-engagement após 48h** - Existe em policies mas não há código que envia esta mensagem
2. **Cold lead após 7 dias** - Política existe mas não há implementação
3. **Mensagens de casos especiais** - São referências em policies mas não estão no fluxo BANT V2

**PRÓXIMA AÇÃO RECOMENDADA:**
Implementar sistema de re-engagement automático que:
- Detecta conversas pausadas por 48h+
- Envia mensagem empática de retorno
- Marca como cold lead após 7 dias
- Usa tom "sem pressão" conforme policies

---

## 📊 FLUXO COMPLETO BANT V2

### Exemplo de Conversa Real:

```
[NEED Opening]
ORBION: Perfeito! Vamos começar entendendo o que tá travando o crescimento de vocês. 🎯
        Nossos dados mostram que 70% dos problemas vêm de: (1) geração de leads,
        (2) conversão, ou (3) retenção de clientes.
        No caso de vocês, qual dessas áreas tá mais crítica hoje?

LEAD: Vendas

[GPT Resposta]
ORBION: Vendas travadas geralmente têm raiz em 3 pontos: falta de leads qualificados,
        funil desorganizado, ou follow-up inconsistente.
        No caso de vocês, quão grave é isso: crítico, impacta bastante, ou moderado?

LEAD: Crítico

[GPT Resposta]
ORBION: Entendi. Quando o problema é crítico, geralmente significa que tá impactando
        o caixa e o crescimento diretamente.
        O que isso causa no negócio? Tipo, clientes sendo perdidos, faturamento caindo...?

LEAD: Perdemos clientes pros concorrentes

[Transição NEED → BUDGET - 100 pts coletados]
[GPT Reconhece]
ORBION: Perder clientes pra concorrência é sinal de que precisamos agir rápido.

[BUDGET Opening]
ORBION: Show! Agora vamos falar de investimento. 💰
        Nossos clientes de PME geralmente investem entre R$ 2-8k/mês e recuperam
        o investimento em 4-6 meses.
        Pra resolver o problema que vocês têm, qual faixa de investimento mensal
        cabe no orçamento? (R$ 2-5k, R$ 5-10k, ou mais)

[... continua pelos 4 stages até TIMING completar ...]
```

---

## ✅ PRINCÍPIOS DE TODAS AS MENSAGENS

### Tom e Estilo (Mantidos em TODAS as mensagens)

1. **Consultivo** - Nunca agressivo ou vendedor
2. **Específico** - Não usar genéricos vagos
3. **Validador** - Reconhecer sentimentos/situações
4. **Regional** - Linguagem do Nordeste brasileiro
5. **Honesto** - Admitir limitações
6. **Focado em Valor** - Sempre oferecer algo útil
7. **Conciso** - 2-4 frases típicas
8. **Acionável** - Terminar com próximo passo claro

### Frases Proibidas (NUNCA usar)

❌ "Entendo o desafio"
❌ "Faz sentido"
❌ "Compreendo a situação"
❌ "Voltando ao assunto"
❌ "Temos a solução perfeita"
❌ "Oferta exclusiva"

### Frases Encorajadas (Usar quando apropriado)

✅ "No caso de vocês..."
✅ "Especificamente..."
✅ "Pra eu entender melhor..."
✅ "Me conta uma coisa..."
✅ "Pelo que você trouxe..."

---

## 🔧 COMO ATUALIZAR MENSAGENS

### Opening Messages (Hard-coded)

**Arquivo:** `src/tools/bant_stages_v2.js`
**Localização:** Linhas 40-116
**Como alterar:** Editar diretamente o `openingMessage` de cada stage

**Exemplo:**
```javascript
need: {
  openingMessage: `SUA NOVA MENSAGEM AQUI`,
  // ...
}
```

### Regras GPT (Comportamento consultivo)

**Arquivo:** `src/tools/bant_stages_v2.js`
**Localização:** Linhas 323-449 (prompt system)
**Como alterar:** Modificar o prompt enviado ao GPT

**Exemplo de alteração:**
- Adicionar novos exemplos de resposta
- Mudar regras de extração
- Alterar tom das respostas

### Mensagens de Sistema

**Bot Detection:** `src/utils/bot_detector.js`
**Opt-Out:** Configurado em `src/handlers/response_manager.js`
**Policies:** `prompts/core/policies.md` (referência)

---

## 📈 MÉTRICAS DE QUALIDADE

### Mensagens Opening

- Taxa de resposta após opening: **≥60%**
- Clareza da pergunta: **100% dos leads entendem**
- Dados mencionados: **Sempre contextualizados**

### Mensagens Consultivas GPT

- Especificidade: **≥90%** (não genérico)
- Conexão com resposta anterior: **100%**
- Pergunta clara do próximo campo: **100%**
- Sem redundância: **≥95%**

### Mensagens de Sistema

- Bot detection accuracy: **≥95%**
- Opt-out respeitado: **100%**
- Escalação apropriada: **≥90%**

---

---

## 📋 RESUMO EXECUTIVO

### Mensagens Implementadas (ATIVAS)

1. **4 Opening Messages** - BANT V2 hard-coded (Need, Budget, Authority, Timing)
2. **Respostas Consultivas Dinâmicas** - GPT-4o-mini com regras estritas
3. **Bot Detection Bridge** - "HUMANO OK" verification
4. **Opt-Out** - Confirmação de remoção
5. **Erro Técnico** - Mensagem de fallback do MessageOrchestrator
6. **Out-of-Scope Redirect** - Template de redirecionamento consultivo
7. **🩹 Mensagens Empáticas Sensíveis** - 3 situações (Cachorro Fugiu, Bati Carro, Familiar Adoeceu) com 20+ keywords

### Mensagens Documentadas (NÃO IMPLEMENTADAS)

1. **Re-engagement 48h** - Conversa pausada (policies.md)
2. **Cold Lead 7 dias** - Marcação automática (policies.md)
3. **Case 1-4 Especiais** - Budget/Decisor/Convencimento/BANT baixo (policies.md)

### Tom Empático Mantido Em

✅ **GPT Prompt Rules** (bant_stages_v2.js:323-449)
- Reconhecimento específico (não genérico)
- Conexão com resposta anterior
- Dados contextualizados
- Pergunta clara do próximo campo

✅ **Fallback Messages** (message_orchestrator.js:106)
- Honesto sobre problema técnico
- Não culpa usuário
- Fornece solução

✅ **Policy Guidelines** (policies.md)
- Tom consultivo sempre
- Sem pressão
- Validação de sentimentos
- Oferece valor imediato

---

**Versão:** 2.1.0
**Última revisão:** 31/10/2025
**Mantido por:** ORBION Core Team
**Próxima revisão:** Mensal ou após implementação de re-engagement

**Changelog v2.1.0:**
- ✅ Adicionadas mensagens empáticas de casos especiais (policies.md)
- ✅ Adicionada mensagem de erro técnico (MessageOrchestrator)
- ✅ **ENCONTRADAS: Mensagens Empáticas Sensíveis** (bant_stages_v2.js + contextual_redirect.js)
  - 🐕 Cachorro Fugiu
  - 🚗 Bati o Carro
  - 💙 Familiar Adoeceu
  - 20+ keywords de detecção automática
  - Sistema de pausa de qualificação
  - 3 variações de bridge messages
- ✅ Identificado GAP: Re-engagement não implementado
- ✅ Documentadas TODAS as mensagens de temas sensíveis
- ✅ Gap Analysis completo
