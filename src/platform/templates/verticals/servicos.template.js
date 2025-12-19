/**
 * VERTICAL: SERVICOS
 * Template para empresas de servicos B2B
 * (Consultoria, Agencias, SaaS, Prestacao de Servicos)
 */

export const SERVICOS_POLICIES = `
## POLITICAS - VERTICAL SERVICOS

### Caracteristicas do Segmento
- Venda consultiva (nao transacional)
- Ciclo de venda mais longo
- Decisao envolve multiplos stakeholders
- Relacionamento e confianca sao fundamentais
- Valor percebido > preco

### Posicionamento
- Foque em resultados e ROI
- Demonstre expertise e autoridade
- Use cases e provas sociais sao importantes
- Personalize a abordagem para cada cliente

### Precificacao
- NUNCA divulgue precos sem qualificacao
- Precos dependem de escopo
- Fale em "investimento", nao "custo"
- Justifique valor antes de discutir preco

### Obrigatorio Coletar
- Empresa e segmento
- Cargo do contato
- Tamanho da empresa
- Problema/necessidade principal
- Prazo para decisao
- Quem mais participa da decisao

### Nao Fazer
- Nao venda na primeira conversa
- Nao prometa resultados especificos sem analise
- Nao compare diretamente com concorrentes
- Nao pressione por decisao imediata
`;

export const SERVICOS_CONVERSATION_STATES = {
  initial: {
    name: 'Abertura',
    goal: 'Estabelecer rapport e contexto',
    maxMessages: 2,
    nextStates: ['discovery'],
  },
  discovery: {
    name: 'Discovery',
    goal: 'Entender contexto e necessidades',
    maxMessages: 5,
    nextStates: ['qualification', 'deepDive'],
  },
  deepDive: {
    name: 'Aprofundamento',
    goal: 'Explorar impactos e implicacoes (SPIN)',
    maxMessages: 4,
    nextStates: ['qualification'],
  },
  qualification: {
    name: 'Qualificacao',
    goal: 'Validar criterios BANT',
    maxMessages: 4,
    nextStates: ['scheduling', 'nurturing', 'disqualified'],
  },
  scheduling: {
    name: 'Agendamento',
    goal: 'Marcar reuniao com especialista',
    maxMessages: 3,
    nextStates: ['scheduled', 'followUp'],
  },
  scheduled: {
    name: 'Agendado',
    goal: 'Confirmar e preparar reuniao',
    maxMessages: 2,
    nextStates: ['completed'],
  },
  nurturing: {
    name: 'Nurturing',
    goal: 'Manter relacionamento para futuro',
    maxMessages: 2,
    nextStates: ['reactivation'],
  },
  disqualified: {
    name: 'Desqualificado',
    goal: 'Encerrar educadamente',
    maxMessages: 1,
    nextStates: ['completed'],
  },
};

export const SERVICOS_OBJECTIONS = {
  preco_alto: {
    response: 'Entendo a preocupacao com investimento. Antes de falar de valores, deixa eu entender melhor qual resultado voce espera. Assim consigo avaliar se realmente faz sentido para voces.',
    strategy: 'Retorne para valor antes de discutir preco',
  },
  ja_tem_fornecedor: {
    response: 'Otimo que ja tenham uma solucao. Como esta a experiencia? Muitas empresas nos procuram para ter uma segunda visao ou quando sentem que podem ter resultados melhores.',
    strategy: 'Explore insatisfacao, oferca comparativo',
  },
  preciso_pensar: {
    response: 'Faz total sentido refletir. O que especificamente voce precisa avaliar? Posso te ajudar com alguma informacao adicional?',
    strategy: 'Identifique objecao real por tras',
  },
  nao_e_prioridade: {
    response: 'Entendo que tem muitas demandas. O que te fez olhar para isso agora? Geralmente quando alguem pesquisa e porque sentiu algo...',
    strategy: 'Explore motivacao inicial',
  },
  envie_proposta: {
    response: 'Posso preparar sim. Mas para fazer uma proposta personalizada, preciso entender um pouco melhor [pontos pendentes]. Faz sentido uma conversa rapida de 15min?',
    strategy: 'Use proposta como gatilho para reuniao',
  },
};

export const SERVICOS_VALUE_PROPS = {
  roi: [
    'Empresas como a sua costumam ver resultados em [prazo]',
    'Nossos clientes reportam [metrica] de melhoria em [area]',
    'O investimento se paga em [periodo] baseado em [calculo]',
  ],
  prova_social: [
    'Trabalhamos com [clientes similares] no segmento de [segmento]',
    '[Cliente] conseguiu [resultado] em [prazo] com nossa solucao',
    'Temos [X] clientes ativos no seu segmento',
  ],
  diferencial: [
    'Nosso diferencial e [diferencial] que permite [beneficio]',
    'Diferente de [alternativa], nos focamos em [foco]',
    'O que nos diferencia e [USP]',
  ],
};

/**
 * Compila template de servicos
 */
export function compileServicosTemplate(config) {
  let template = SERVICOS_POLICIES;

  // Adiciona especificos do cliente
  if (config.catalogo?.length) {
    template += '\n\n### Servicos Oferecidos\n';
    config.catalogo.forEach(servico => {
      template += `- **${servico.nome}**: ${servico.descricao || ''}\n`;
    });
  }

  return template.trim();
}

/**
 * Retorna proximo estado baseado no contexto
 */
export function getNextState(currentState, context) {
  const state = SERVICOS_CONVERSATION_STATES[currentState];
  if (!state) return 'initial';

  // Logica de transicao
  if (currentState === 'qualification') {
    if (context.bantScore >= 70) return 'scheduling';
    if (context.bantScore >= 40) return 'nurturing';
    return 'disqualified';
  }

  return state.nextStates[0];
}

export default {
  SERVICOS_POLICIES,
  SERVICOS_CONVERSATION_STATES,
  SERVICOS_OBJECTIONS,
  SERVICOS_VALUE_PROPS,
  compileServicosTemplate,
  getNextState,
};
