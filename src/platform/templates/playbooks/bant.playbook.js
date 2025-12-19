/**
 * BANT PLAYBOOK
 * Metodologia de qualificacao de leads
 *
 * BANT = Budget, Authority, Need, Timeline
 */

export const BANT_PLAYBOOK = `
## METODOLOGIA BANT

### Fundamento
BANT e uma metodologia de qualificacao criada pela IBM nos anos 60.
Usada para determinar se um lead tem potencial real de compra.
Cada criterio contribui para o score de qualificacao.

### Quando Usar BANT
- Leads inbound que demonstraram interesse
- Apos SPIN identificar necessidades (combinar metodologias)
- Para priorizar pipeline de vendas
- Para decidir se escala para vendedor ou nurturing

---

## CRITERIOS BANT

### B - BUDGET (Orcamento)
**Objetivo:** Verificar se ha capacidade financeira

**Peso:** 20-30% do score

**Perguntas:**
- "Voces ja tem um investimento previsto para essa area?"
- "Qual a faixa de investimento que faz sentido?"
- "Como funciona o processo de aprovacao de budget ai?"
- "Ja investiram em solucoes similares antes? Quanto?"

**Sinais Positivos:**
- Menciona faixa de valores
- Tem budget aprovado ou em aprovacao
- Ja investiu em solucoes similares
- Conhece faixa de precos do mercado

**Sinais Negativos:**
- "Nao temos orcamento"
- "Precisamos de algo gratuito"
- "Nao sei quanto custa isso"
- Evita falar de valores

**Como Lidar com "Nao Tenho Budget":**
1. Explore se e falta de priorizacao ou realmente nao ha verba
2. Pergunte quando havera budget
3. Ofereca iniciar com escopo menor
4. Coloque em nurturing se for genuinamente sem budget

---

### A - AUTHORITY (Autoridade)
**Objetivo:** Verificar se esta falando com decisor

**Peso:** 25-35% do score

**Perguntas:**
- "Quem mais participa dessa decisao?"
- "Voce e responsavel por essa area?"
- "Quem da a palavra final nesse tipo de investimento?"
- "Precisaria envolver mais alguem na conversa?"

**Sinais Positivos:**
- E o decisor ou influenciador forte
- Pode aprovar ou tem acesso direto ao aprovador
- Conhece o processo de decisao
- Pode agendar reuniao com outros stakeholders

**Sinais Negativos:**
- "Vou ver com meu chefe"
- "Nao sei quem decide isso"
- "So estou pesquisando"
- Nao consegue comprometer proximo passo

**Como Lidar com Falta de Autoridade:**
1. Nao descarte - influenciadores sao importantes
2. Pergunte se pode incluir decisor na proxima conversa
3. Prepare o influenciador com argumentos
4. Peca para apresentar para o decisor

---

### N - NEED (Necessidade)
**Objetivo:** Verificar se ha problema real a resolver

**Peso:** 30-40% do score (mais importante)

**Perguntas:**
- "Qual o principal problema que precisa resolver?"
- "O que acontece se isso nao for resolvido?"
- "Ha quanto tempo enfrentam essa dificuldade?"
- "Ja tentaram resolver de outra forma?"

**Sinais Positivos:**
- Descreve problema especifico e claro
- Mostra urgencia ou dor real
- Problema se alinha com sua solucao
- Ja tentou resolver (mostra que e real)

**Sinais Negativos:**
- "So estou curioso"
- Problema vago ou generico
- Nao consegue articular impacto
- Problema nao se alinha com solucao

**Como Ampliar a Necessidade:**
- Use perguntas de Implicacao (SPIN)
- Conecte problema a impactos financeiros
- Explore consequencias de nao resolver
- Faca o cliente verbalizar a urgencia

---

### T - TIMELINE (Prazo)
**Objetivo:** Verificar quando pretendem decidir/implementar

**Peso:** 15-25% do score

**Perguntas:**
- "Quando pretendem resolver essa questao?"
- "Ha alguma data ou evento que cria urgencia?"
- "Qual o prazo para ter isso funcionando?"
- "O que acontece se demorar mais que [prazo]?"

**Sinais Positivos:**
- Tem prazo definido
- Ha evento que cria urgencia (lancamento, auditoria, etc)
- Quer comecar nos proximos 30-90 dias
- Processo de decisao ja iniciado

**Sinais Negativos:**
- "Talvez no ano que vem"
- "Sem pressa"
- "Quando der"
- Nao consegue definir prazo

**Como Criar Urgencia:**
- Explore custos de esperar
- Mencione janelas de oportunidade
- Conecte a eventos do mercado
- Mostre o que concorrentes estao fazendo

---

## SCORING BANT

### Sistema de Pontuacao (0-100)

| Criterio | Peso | Score Alto | Score Medio | Score Baixo |
|----------|------|------------|-------------|-------------|
| Budget | 25 | Tem verba definida | Precisa aprovar | Sem budget |
| Authority | 25 | Decisor | Influenciador | Pesquisador |
| Need | 35 | Dor clara e urgente | Interesse real | Curiosidade |
| Timeline | 15 | < 30 dias | 30-90 dias | > 90 dias |

### Interpretacao do Score

**80-100: SQL (Sales Qualified Lead)**
- Prioridade maxima
- Agenda reuniao com especialista
- Alto potencial de conversao

**60-79: MQL (Marketing Qualified Lead)**
- Bom potencial
- Precisa mais qualificacao
- Continue conversa para evoluir

**40-59: Nurturing**
- Potencial futuro
- Coloque em cadencia de conteudo
- Recontate em 30-60 dias

**< 40: Desqualificado**
- Nao e ICP ou momento errado
- Agradeca e mantenha porta aberta
- Nao invista mais tempo agora

---

## FLUXO DE QUALIFICACAO BANT

### Ordem Recomendada
1. **Need primeiro** - Sem necessidade, nada mais importa
2. **Authority** - Esta falando com quem pode decidir?
3. **Timeline** - Ha urgencia?
4. **Budget** - Ha capacidade financeira?

### Integracao com SPIN
- Use SPIN para **descobrir e ampliar** necessidades
- Use BANT para **qualificar e pontuar** o lead
- SPIN primeiro, depois BANT para validar

### Exemplo de Fluxo Combinado

1. **SPIN - Situation:** Entenda contexto
2. **SPIN - Problem:** Identifique dores
3. **BANT - Need:** Valide e pontue necessidade
4. **SPIN - Implication:** Amplie urgencia
5. **BANT - Timeline:** Valide e pontue prazo
6. **SPIN - Need-Payoff:** Faca cliente articular valor
7. **BANT - Authority:** Identifique decisor
8. **BANT - Budget:** Valide capacidade financeira
9. **Proposta/Agendamento:** Se score >= 60

---

## PERGUNTAS RAPIDAS BANT

### One-liners para Validacao Rapida

**Budget:**
"Em termos de investimento, ja tem uma ideia de faixa?"

**Authority:**
"Voce seria o responsavel por essa decisao ou envolve mais alguem?"

**Need:**
"Se eu entendi bem, o principal problema e [X]. Esta certo?"

**Timeline:**
"Pensando em resolver isso, qual seria o prazo ideal?"

---

## OBJECOES COMUNS

### "Nao tenho budget"
- "Entendo. E uma questao de nao ter verba ou de nao ser prioridade ainda?"
- "Se tivesse budget, seria algo que faria sentido?"
- "Quando voces costumam revisar orcamentos?"

### "Preciso falar com meu chefe"
- "Faz total sentido. O que voce acha que ele gostaria de saber?"
- "Posso te ajudar a apresentar para ele?"
- "Seria possivel incluir ele na nossa proxima conversa?"

### "So estou pesquisando"
- "Otimo que esteja se informando. O que motivou essa pesquisa agora?"
- "O que voce espera descobrir nessa pesquisa?"
- "Ha algum problema especifico que esta tentando resolver?"

### "Nao tenho pressa"
- "Entendo. O que te fez olhar para isso agora entao?"
- "O que acontece se continuar como esta por mais 6 meses?"
- "Ha algo que poderia criar urgencia, tipo um evento ou deadline?"
`;

/**
 * Perguntas BANT organizadas
 */
export const BANT_QUESTIONS = {
  budget: {
    discovery: [
      'Voces ja tem um investimento previsto para essa area?',
      'Qual a faixa de investimento que faz sentido para voces?',
      'Como funciona o processo de aprovacao de budget ai?',
    ],
    validation: [
      'Esse investimento se encaixa no que voces planejaram?',
      'Precisaria de aprovacao adicional para esse valor?',
    ],
    objection: [
      'E uma questao de nao ter verba ou de nao ser prioridade ainda?',
      'Quando voces costumam revisar orcamentos?',
    ],
  },

  authority: {
    discovery: [
      'Quem mais participa dessa decisao na empresa?',
      'Voce e responsavel por essa area?',
      'Quem da a palavra final nesse tipo de investimento?',
    ],
    validation: [
      'Podemos incluir [decisor] na proxima conversa?',
      'Voce tem autonomia para aprovar esse tipo de iniciativa?',
    ],
    objection: [
      'O que voce acha que seu gestor gostaria de saber?',
      'Posso te ajudar a apresentar para ele?',
    ],
  },

  need: {
    discovery: [
      'Qual o principal problema que precisa resolver?',
      'O que acontece se isso nao for resolvido?',
      'Ha quanto tempo enfrentam essa dificuldade?',
    ],
    validation: [
      'Se eu entendi bem, o principal problema e [X]. Esta certo?',
      'Isso e uma prioridade para voces neste momento?',
    ],
    amplification: [
      'Como isso afeta os resultados da empresa?',
      'Qual o custo de nao resolver esse problema?',
    ],
  },

  timeline: {
    discovery: [
      'Quando pretendem resolver essa questao?',
      'Ha alguma data ou evento que cria urgencia?',
      'Qual o prazo para ter isso funcionando?',
    ],
    validation: [
      'Entao o ideal seria comecar [prazo]. Correto?',
      'O que acontece se demorar mais que isso?',
    ],
    urgency: [
      'O que te fez olhar para isso agora?',
      'Ha algo que poderia acelerar essa decisao?',
    ],
  },
};

/**
 * Calcula score BANT
 */
export function calculateBANTScore(criteria) {
  const weights = {
    budget: 25,
    authority: 25,
    need: 35,
    timeline: 15,
  };

  const scores = {
    high: 1.0,
    medium: 0.6,
    low: 0.2,
    unknown: 0.4,
  };

  let totalScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const level = criteria[key] || 'unknown';
    totalScore += weight * (scores[level] || scores.unknown);
  }

  return Math.round(totalScore);
}

/**
 * Classifica lead baseado no score
 */
export function classifyLead(score) {
  if (score >= 80) return { status: 'SQL', action: 'agendar_reuniao', priority: 'alta' };
  if (score >= 60) return { status: 'MQL', action: 'continuar_qualificacao', priority: 'media' };
  if (score >= 40) return { status: 'nurturing', action: 'cadencia_conteudo', priority: 'baixa' };
  return { status: 'desqualificado', action: 'encerrar_educadamente', priority: 'nenhuma' };
}

/**
 * Compila playbook BANT
 */
export function compileBANTPlaybook(config) {
  let playbook = BANT_PLAYBOOK;

  playbook = playbook
    .replace(/\{\{agente\.nome\}\}/g, config.agente?.nome || 'Agente')
    .replace(/\{\{empresa\.nome\}\}/g, config.empresa?.nome || 'a empresa');

  // Adiciona criterios customizados
  if (config.qualificacao?.pontuacao_sql) {
    playbook += `\n\n### Configuracao do Cliente\n- Score minimo para SQL: ${config.qualificacao.pontuacao_sql}`;
  }

  return playbook.trim();
}

/**
 * Retorna perguntas BANT
 */
export function getBANTQuestions(criterio, tipo = 'discovery') {
  return BANT_QUESTIONS[criterio]?.[tipo] || BANT_QUESTIONS[criterio]?.discovery || [];
}

export default {
  BANT_PLAYBOOK,
  BANT_QUESTIONS,
  calculateBANTScore,
  classifyLead,
  compileBANTPlaybook,
  getBANTQuestions,
};
