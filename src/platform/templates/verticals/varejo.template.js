/**
 * VERTICAL: VAREJO
 * Template para empresas de varejo e e-commerce
 * (Lojas, E-commerce, Produtos Fisicos)
 */

export const VAREJO_POLICIES = `
## POLITICAS - VERTICAL VAREJO

### Caracteristicas do Segmento
- Venda transacional (rapida)
- Cliente sabe o que quer (maioria)
- Preco e disponibilidade sao decisivos
- Experiencia de compra importa
- Volume e recorrencia

### Posicionamento
- Seja direto e objetivo
- Foque em disponibilidade e entrega
- Destaque promocoes e beneficios
- Facilite a decisao de compra

### Precificacao
- Precos podem ser informados diretamente
- Destaque promocoes ativas
- Mencione formas de pagamento
- Frete e prazos sao importantes

### Obrigatorio Coletar
- Nome do cliente
- Produto de interesse
- CEP (para frete)
- Urgencia/prazo de entrega

### Nao Fazer
- Nao demore para informar precos
- Nao complique o processo de compra
- Nao pressione excessivamente
- Nao prometa prazos que nao pode cumprir
`;

export const VAREJO_CONVERSATION_STATES = {
  initial: {
    name: 'Boas-vindas',
    goal: 'Identificar interesse do cliente',
    maxMessages: 2,
    nextStates: ['productDiscovery', 'faq'],
  },
  productDiscovery: {
    name: 'Descoberta de Produto',
    goal: 'Entender o que o cliente procura',
    maxMessages: 3,
    nextStates: ['productPresentation', 'unavailable'],
  },
  productPresentation: {
    name: 'Apresentacao',
    goal: 'Mostrar produtos relevantes',
    maxMessages: 2,
    nextStates: ['priceNegotiation', 'shipping', 'objections'],
  },
  shipping: {
    name: 'Frete/Entrega',
    goal: 'Informar frete e prazos',
    maxMessages: 2,
    nextStates: ['checkout', 'objections'],
  },
  priceNegotiation: {
    name: 'Negociacao',
    goal: 'Lidar com questoes de preco',
    maxMessages: 3,
    nextStates: ['checkout', 'abandoned'],
  },
  objections: {
    name: 'Objecoes',
    goal: 'Resolver duvidas e objecoes',
    maxMessages: 3,
    nextStates: ['checkout', 'abandoned'],
  },
  checkout: {
    name: 'Checkout',
    goal: 'Finalizar a compra',
    maxMessages: 2,
    nextStates: ['completed', 'abandoned'],
  },
  faq: {
    name: 'FAQ',
    goal: 'Responder duvidas gerais',
    maxMessages: 3,
    nextStates: ['productDiscovery', 'completed'],
  },
  unavailable: {
    name: 'Indisponivel',
    goal: 'Lidar com produto esgotado',
    maxMessages: 2,
    nextStates: ['alternatives', 'waitlist', 'completed'],
  },
  alternatives: {
    name: 'Alternativas',
    goal: 'Oferecer produtos similares',
    maxMessages: 2,
    nextStates: ['productPresentation', 'completed'],
  },
  abandoned: {
    name: 'Abandono',
    goal: 'Tentar recuperar venda',
    maxMessages: 1,
    nextStates: ['completed'],
  },
};

export const VAREJO_OBJECTIONS = {
  preco_alto: {
    response: 'Entendo! Esse produto tem [diferencial]. Temos tambem opcoes a partir de R$ [valor]. Quer que eu mostre?',
    strategy: 'Justifique valor ou ofereca alternativa',
  },
  frete_caro: {
    response: 'O frete para sua regiao fica R$ [valor]. Acima de R$ [minimo] o frete e gratis! Falta pouco para voce conseguir.',
    strategy: 'Incentive valor minimo para frete gratis',
  },
  prazo_longo: {
    response: 'O prazo padrao e [prazo]. Temos opcao expressa que chega em [prazo_expresso] por mais R$ [valor]. Prefere?',
    strategy: 'Ofereca upgrade de frete',
  },
  nao_encontrou: {
    response: 'Vou verificar outras opcoes para voce! Pode me dar mais detalhes do que precisa? Cor, tamanho, faixa de preco...',
    strategy: 'Colete mais informacoes para buscar',
  },
  comparando_preco: {
    response: 'Nosso diferencial e [diferencial]. Alem disso, voce tem [garantias/beneficios]. Posso reservar com esse preco por [tempo]?',
    strategy: 'Destaque diferenciais, crie urgencia',
  },
  sem_estoque: {
    response: 'Esse produto esta temporariamente indisponivel. Posso avisar quando chegar? Temos tambem [alternativa] que pode te atender.',
    strategy: 'Capture interesse futuro, ofereca alternativa',
  },
};

export const VAREJO_SCRIPTS = {
  boas_vindas: 'Oi! Bem-vindo a {{empresa.nome}}! Como posso ajudar voce hoje?',
  produto_encontrado: 'Achei! Temos o {{produto.nome}} por R$ {{produto.preco}}. Quer mais detalhes?',
  frete_calculado: 'Para o CEP {{cep}}, o frete fica R$ {{frete.valor}} com entrega em {{frete.prazo}} dias uteis.',
  promocao: 'Voce viu? Esse produto esta com {{desconto}}% OFF! Por tempo limitado.',
  checkout: 'Otimo escolha! Para finalizar, como prefere pagar? Cartao, PIX ou boleto?',
  confirmacao: 'Pedido confirmado! Numero #{{pedido.numero}}. Voce vai receber atualizacoes por aqui. Obrigado pela compra!',
  abandono: 'Vi que voce estava interessado em {{produto.nome}}. Posso ajudar com alguma duvida?',
};

/**
 * Compila template de varejo
 */
export function compileVarejoTemplate(config) {
  let template = VAREJO_POLICIES;

  // Adiciona categorias de produtos
  if (config.catalogo?.length) {
    const categorias = [...new Set(config.catalogo.map(p => p.categoria))];
    template += `\n\n### Categorias Disponiveis\n${categorias.join(', ')}`;
  }

  return template.trim();
}

/**
 * Gera mensagem de script
 */
export function getVarejoScript(scriptType, data = {}) {
  let script = VAREJO_SCRIPTS[scriptType] || '';

  return script.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || match;
  });
}

/**
 * Calcula frete (placeholder)
 */
export function calculateShipping(cep, config) {
  // Logica de calculo de frete seria integrada aqui
  return {
    valor: 'A calcular',
    prazo: '5-10',
    freteGratisMinimo: config.frete_gratis_minimo || 299,
  };
}

export default {
  VAREJO_POLICIES,
  VAREJO_CONVERSATION_STATES,
  VAREJO_OBJECTIONS,
  VAREJO_SCRIPTS,
  compileVarejoTemplate,
  getVarejoScript,
  calculateShipping,
};
