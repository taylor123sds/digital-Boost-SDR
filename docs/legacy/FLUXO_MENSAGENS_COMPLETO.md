# 🔄 Fluxo Completo de Mensagens do ORBION

## 📊 Arquitetura do Sistema

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌───────────────┐
│  SDR Agent  │ ───> │  Specialist  │ ───> │ Scheduler   │ ───> │ Google Meet   │
│  (Discovery)│      │   (BANT)     │      │ (Booking)   │      │  (Meeting)    │
└─────────────┘      └──────────────┘      └─────────────┘      └───────────────┘
     Lead               ✅ NOVO                Email               Reunião
  Qualification      Pain Discovery          Collection          Confirmada
```

## 🎯 FASE 1: SDR Agent (Discovery)

### Objetivo
Identificar a DOR inicial e qualificar se é lead válido.

### Exemplo de Conversa

**Lead:** "Olá, quero melhorar meu marketing"

**SDR Agent:**
```
Olá! 👋 Sou Orbion, assistente da Digital Boost.

Que legal que você quer melhorar o marketing! Me conta um pouco mais:
quando você fala em "melhorar marketing", você tá pensando mais em:

• Aumentar visibilidade e trazer mais leads
• Melhorar conversão dos leads que já chegam
• Estruturar um sistema previsível de vendas
• Reduzir custo de aquisição

Qual desses é o mais crítico hoje?
```

**Lead:** "Quero trazer mais leads, a gente não tem visibilidade"

**SDR Agent:**
```
Entendi! Falta de visibilidade é um dos desafios mais comuns em empresas
que estão crescendo. Antes de te conectar com nosso especialista, me
confirma uma coisa: vocês são uma empresa local aqui em Natal/RN ou
atendem outras regiões?
```

**Lead:** "Somos de Natal"

**SDR Agent:**
```
Perfeito! Vou te conectar com nosso especialista em Growth Marketing
que vai entender melhor sua situação e ver exatamente como a gente
pode te ajudar.

🔀 [HANDOFF PARA SPECIALIST AGENT]
```

---

## 🎯 FASE 2: Specialist Agent (BANT Consultivo)

### ✨ NOVA FASE: Pain Discovery

O Specialist Agent agora começa com **Pain Discovery** antes de perguntar sobre Budget/Authority/Timing.

### Subfase 2.1: Pain Discovery

**Specialist Agent recebe handoff do SDR:**
- painType: `growth_marketing`
- painDescription: "falta de visibilidade"
- Inicia em estado: `pain_discovery`

**Specialist Agent (Mensagem 1):**
```
Entendi! Pelo que você trouxe, vejo que o foco é escalar o crescimento.

Isso é super comum em empresas que estão naquele momento de estruturar
o marketing de verdade — não só fazer campanha pontual, mas construir
um sistema previsível de aquisição.

**Me conta uma coisa:** quando você pensa em crescimento hoje, qual é
a principal trava? É mais:

• Falta de visibilidade (poucos leads chegando)
• Conversão baixa (leads chegam mas não fecham)
• Custo de aquisição muito alto
• Falta de previsibilidade (não sabe quanto vai vender no mês)

Qual desses te incomoda mais?
```

**Lead:** "Conversão baixa mesmo, trazemos leads mas não fecham"

**Sistema detecta:**
- Categoria: `conversão`
- Keywords detectadas: ["conversão", "não fecham"]
- Armazena em `painDetails`:
  ```json
  {
    "rawResponse": "Conversão baixa mesmo, trazemos leads mas não fecham",
    "category": "conversão",
    "painType": "growth_marketing",
    "timestamp": "2025-10-22T01:00:00.000Z"
  }
  ```

### Subfase 2.2: Transição Consultiva para Budget

**Specialist Agent (Mensagem 2 - Transição):**
```
Perfeito! **Conversão baixa** é um problema clássico — e frustrante.

Você investe tempo e dinheiro pra trazer leads, mas na hora H eles não
fecham. Isso geralmente acontece por 3 motivos: proposta não conecta,
processo de venda confuso, ou follow-up fraco.

A boa notícia? Conversão é totalmente otimizável. Com funil bem
estruturado, CRM funcionando e argumentação afinada, dá pra dobrar ou
triplicar a taxa de fechamento sem precisar aumentar o volume de leads.

**Me conta:** como vocês costumam estruturar investimento em otimização
de vendas? Já têm um orçamento separado pra isso ou decidem conforme
o projeto?

Isso muda completamente a abordagem — se tem budget recorrente, montamos
um processo de melhoria contínua. Se é pontual, focamos em implementar
as principais correções rápido.
```

**Composição da Mensagem:**
1. ✅ **Validação da dor**: "Perfeito! Conversão baixa é um problema clássico"
2. ✅ **Explicação do impacto**: "você investe tempo e dinheiro... mas não fecham"
3. ✅ **Demonstração de expertise**: "3 motivos: proposta, processo, follow-up"
4. ✅ **Solução técnica**: "Com funil bem estruturado, CRM..."
5. ✅ **Transição natural para Budget**: "Me conta: como vocês estruturam investimento..."
6. ✅ **Explicação do porquê**: "Isso muda a abordagem..."

**Lead:** "A gente decide conforme o projeto mesmo"

**Sistema detecta:**
- Budget: "conforme o projeto" → Budget flexível detectado
- Avança para: `authority`

### Subfase 2.3: Authority

**Specialist Agent (Mensagem 3):**
```
Legal! Agora me tira uma dúvida:

Quando vocês contratam parceiros estratégicos (tipo: agência, consultor,
etc), você decide sozinho ou tem mais gente na mesa? CEO, sócio, time
de marketing?

Pergunto porque gosto de entender o processo de decisão pra alinhar a
proposta certinho com quem precisa validar.
```

**Lead:** "Sou eu e meu sócio que decidimos"

**Sistema detecta:**
- Authority: "eu e meu sócio" → Decisor direto
- Avança para: `timing`

### Subfase 2.4: Timing

**Specialist Agent (Mensagem 4):**
```
Perfeito! Última pergunta pra eu entender o contexto completo:

Vocês estão olhando isso pra começar agora (tipo: próximas 2-4 semanas)
ou ainda estão mapeando e planejando pra um prazo maior?

Pergunto porque se for urgente, a gente monta um plano de quick wins
pra gerar resultado rápido. Se tiver mais tempo, conseguimos estruturar
algo mais robusto.
```

**Lead:** "Queremos começar o mais rápido possível"

**Sistema detecta:**
- Timing: "o mais rápido possível" → Timing urgente
- **Qualification Score: 85%**
- **BANT Completo**: ✅ Need ✅ Budget ✅ Authority ✅ Timing
- **Lead qualificado para agendamento!**

### Subfase 2.5: Transição para Scheduler

**Specialist Agent (Mensagem 5):**
```
Perfeito! Pelo que você trouxe, vejo que vocês têm:

✅ Uma necessidade real de escalar o crescimento
✅ Clareza sobre investimento
✅ Timing definido pra começar

Isso é exatamente o perfil de cliente que a gente consegue gerar
resultado rápido.

Vou te propor o seguinte: vamos agendar uma conversa estratégica de
30-40 minutos onde eu te mostro:

• Diagnóstico inicial do seu posicionamento
• 3-5 oportunidades rápidas de crescimento
• Roadmap de 90 dias pra estruturar marketing previsível

Sem compromisso, só pra você ter clareza do caminho. Faz sentido?

🔀 [HANDOFF PARA SCHEDULER AGENT]
```

---

## 🎯 FASE 3: Scheduler Agent (Booking)

### Subfase 3.1: Coleta de Email

**Scheduler Agent (Mensagem 1):**
```
Show! Vamos agendar então 🗓️

Antes de propor horários, preciso do seu email pra enviar o convite
do Google Meet e os materiais da reunião.

Qual email você prefere usar?
```

**Lead:** "joao@empresa.com.br"

**Sistema valida:**
- Regex email: ✅ Válido
- Armazena: `leadEmail: "joao@empresa.com.br"`
- Avança para: `proposing_times`

### Subfase 3.2: Proposta de Horários

**Scheduler Agent (Mensagem 2):**
```
Perfeito! Email registrado: joao@empresa.com.br

Vou te propor alguns horários esta semana:

📅 **Quinta, 24/10**
   • 10:00
   • 14:00
   • 16:00

📅 **Sexta, 25/10**
   • 09:00
   • 11:00
   • 15:00

Qual horário funciona melhor pra você?
```

**Lead:** "Quinta às 14h"

**Sistema detecta:**
- Data: "quinta" → 2025-10-24
- Hora: "14h" → 14:00
- Cria evento no Google Calendar (ou mock)

### Subfase 3.3: Confirmação

**Scheduler Agent (Mensagem 3):**
```
✅ Reunião agendada com sucesso!

📅 Data: Quinta, 24 de outubro
⏰ Horário: 14:00 (30-40 minutos)
📧 Email: joao@empresa.com.br
🔗 Link: https://meet.google.com/abc-defg-hij

Você vai receber:
• Convite no seu email
• Lembrete 1 dia antes
• Lembrete 1 hora antes

Nos vemos quinta! Se precisar reagendar, é só avisar 👍
```

---

## 📊 Comparação: Antes vs. Depois

### ❌ ANTES (Direto demais)

```
SDR: "Vou te conectar com especialista"
          ↓
Specialist: "Como vocês estruturam investimento em marketing?"
          ↓
Lead: [respondia mas não sentia que foi compreendido]
```

### ✅ AGORA (Consultivo)

```
SDR: "Vou te conectar com especialista"
          ↓
Specialist: "Quando pensa em crescimento, qual é a principal trava?
             • Visibilidade
             • Conversão
             • CAC
             • Previsibilidade"
          ↓
Lead: "Conversão baixa"
          ↓
Specialist: "Perfeito! Conversão baixa é um problema clássico...
             [explica impacto]
             [demonstra expertise]
             [oferece solução]

             Agora me conta: como estruturam investimento?"
          ↓
Lead: [responde sentindo que foi compreendido]
```

---

## 🎨 Estrutura das Mensagens Consultivas

Todas as mensagens de transição seguem este padrão:

```
┌─────────────────────────────────────────┐
│ 1. VALIDAÇÃO DA DOR                     │
│    "Perfeito! [DOR] é um problema..."   │
├─────────────────────────────────────────┤
│ 2. EXPLICAÇÃO DO IMPACTO                │
│    "Isso causa... porque..."            │
├─────────────────────────────────────────┤
│ 3. DEMONSTRAÇÃO DE EXPERTISE           │
│    "Isso geralmente acontece por..."    │
├─────────────────────────────────────────┤
│ 4. SOLUÇÃO TÉCNICA                      │
│    "A solução é... com isso consegue..."│
├─────────────────────────────────────────┤
│ 5. TRANSIÇÃO PARA BUDGET                │
│    "Me conta: como vocês estruturam..." │
├─────────────────────────────────────────┤
│ 6. EXPLICAÇÃO DO PORQUÊ                 │
│    "Pergunto porque isso muda..."       │
└─────────────────────────────────────────┘
```

---

## 📋 Todas as Categorias de Dor Implementadas

### Growth Marketing (4 categorias)
1. **Visibilidade** - poucos leads chegando
2. **Conversão** - leads não fecham
3. **CAC** - custo de aquisição alto
4. **Previsibilidade** - não sabe quanto vai vender

### Sites (4 categorias)
1. **SEO** - site não aparece no Google
2. **Velocidade** - site lento
3. **Design** - não reflete a marca
4. **Conversão** - não converte visitante em lead

### Audiovisual (4 categorias)
1. **Autoridade** - gerar confiança e credibilidade
2. **Vendas** - vídeos comerciais
3. **Educação** - conteúdo educativo
4. **Escala** - automatizar comunicação

**Total**: 12 mensagens consultivas diferentes + 3 mensagens genéricas (fallback)

---

## 🔍 Detecção Inteligente de Dor

### Keywords por Categoria

```javascript
growth_marketing: {
  'visibilidade': ['visibilidade', 'poucos leads', 'não aparecer', 'divulgação'],
  'conversão': ['conversão', 'não fecha', 'não converte', 'proposta'],
  'cac': ['custo', 'caro', 'cac', 'aquisição'],
  'previsibilidade': ['previsível', 'não sei quanto', 'instável', 'meta']
}

sites: {
  'seo': ['google', 'seo', 'não aparece', 'busca', 'ranquear'],
  'velocidade': ['lento', 'demora', 'carrega', 'performance'],
  'design': ['design', 'visual', 'aparência', 'marca'],
  'conversão': ['converte', 'lead', 'venda', 'formulário']
}

audiovisual: {
  'autoridade': ['autoridade', 'confiança', 'credibilidade'],
  'vendas': ['venda', 'vender', 'anúncio', 'comercial'],
  'educação': ['educar', 'ensinar', 'conteúdo', 'tutorial'],
  'escala': ['escala', 'automação', 'produção', 'volume']
}
```

---

## 💾 Dados Armazenados no Sistema

### Estado do Lead após Pain Discovery

```json
{
  "phoneNumber": "5584996791624",
  "currentAgent": "specialist",
  "currentState": "budget",
  "painType": "growth_marketing",
  "painDescription": "falta de visibilidade",
  "painDetails": {
    "rawResponse": "Conversão baixa mesmo, trazemos leads mas não fecham",
    "category": "conversão",
    "painType": "growth_marketing",
    "timestamp": "2025-10-22T01:00:00.000Z"
  },
  "bant": {
    "need": "Conversão baixa - leads não fecham",
    "budget": "Decidem conforme o projeto",
    "authority": "Decisor direto (sócio)",
    "timing": "Urgente - o mais rápido possível"
  },
  "qualificationScore": 85,
  "archetype": "Pragmático",
  "persona": "Executor",
  "readyToSchedule": true
}
```

---

## 🚀 Benefícios da Nova Abordagem

1. **Mais Consultivo** - Demonstra compreensão profunda antes de perguntas comerciais
2. **Mais Personalizado** - 12 mensagens diferentes para dores específicas
3. **Mais Técnico** - Explica impacto, causas e soluções
4. **Melhor Conexão** - Lead sente que foi ouvido
5. **Transição Natural** - Budget surge naturalmente após validar dor

---

**Documento atualizado em**: 22/10/2025
**Status do Servidor**: ✅ Rodando (PID 84780, porta 3001)
**Versão**: 1.0
