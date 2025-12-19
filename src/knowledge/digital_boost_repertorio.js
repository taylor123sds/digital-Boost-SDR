// digital_boost_repertorio.js
//  REPERTÓRIO COMPLETO DA DIGITAL BOOST - SOLAR v4.0
// Canal Digital de Orçamento para Integradoras de Energia Solar

/**
 *  SOBRE A DIGITAL BOOST - SOLAR v4.0
 */
export const SOBRE_EMPRESA = {
  nome: "Digital Boost",
  localizacao: "Natal, Rio Grande do Norte",
  agentName: "Leadly",

  // SOLAR v4.0 - Sem credenciais externas, foco em competência
  especialidade: "Canal Digital de Orçamento para Integradoras de Energia Solar",

  missao: "Transformar integradoras que dependem de indicação em empresas com canal digital claro que capta orçamentos.",

  visao: "Ser referência em canal digital de captação para o setor solar no Nordeste.",

  valores: [
    "Resultados mensuráveis - Entregamos canal estruturado, não promessas de ranking",
    "Transparência total - Você vê exatamente o que está sendo feito",
    "Foco em conversão - Site que capta, não site institucional",
    "Simplicidade - Sem enrolação, direto ao ponto",
    "Honestidade - Não prometemos posição no Google nem quantidade de leads"
  ],

  diferenciais: [
    "Foco exclusivo em integradoras de energia solar",
    "Entendemos a jornada do cliente solar (busca  orçamento  fechamento)",
    "Site focado em conversão, não institucional",
    "SEO local para aparecer na região que você atende",
    "Integração WhatsApp + Formulário para não perder lead"
  ]
};

/**
 *  SOLUÇÕES OFERECIDAS - SOLAR v4.0
 */
export const SOLUCOES = {
  // Solução única: Canal Digital de Orçamento
  canal_digital: {
    nome: "Canal Digital de Orçamento",
    descricao: "Site focado em captação + SEO local + integração WhatsApp para integradoras de energia solar receberem pedidos de orçamento online",

    componentes: [
      "Landing page de orçamento (design focado em conversão)",
      "Páginas SEO por região/cidade atendida",
      "Formulário de solicitação de orçamento",
      "Botão WhatsApp integrado",
      "Prova social (fotos de projetos, avaliações)",
      "Tracking básico (Pixel Meta + GA4)"
    ],

    beneficios: [
      "Receber pedidos de orçamento mesmo quando está em instalação",
      "Aparecer no Google da região que você atende",
      "Canal próprio (não depender só de indicação)",
      "Profissionalizar a presença online"
    ],

    nao_prometemos: [
      "Posição específica no Google (SEO leva tempo)",
      "Quantidade de leads por mês (depende de mercado)",
      "Resultado imediato (canal precisa indexar)",
      "Milagres sem investimento em tráfego"
    ],

    ideal_para: [
      "Integradoras que dependem de indicação",
      "Quem tem Instagram mas não converte",
      "Quem não tem site ou tem site institucional",
      "Quem quer ter canal de captação próprio"
    ]
  },

  // Opcional: SEO Local avançado
  seo_local: {
    nome: "SEO Local para Solar",
    descricao: "Páginas otimizadas para aparecer nas buscas da região que você atende",

    o_que_fazemos: [
      "Página por cidade/região atendida",
      "Otimização para termos como 'energia solar [cidade]'",
      "Google Perfil da Empresa configurado",
      "Estrutura técnica correta para SEO"
    ],

    disclaimer: "SEO é trabalho de médio/longo prazo. Resultados aparecem em 3-6 meses, não em dias."
  }
};

/**
 *  ARGUMENTOS DE VENDA - SOLAR v4.0
 */
export const ARGUMENTOS_VENDA = {
  // Argumento 1: Dependência de indicação
  dependencia_indicacao: {
    titulo: "Indicação é ótima, mas limita crescimento",
    argumento: "Indicação é a melhor fonte de leads (cliente já vem confiando). Mas depender só disso deixa a demanda irregular. Um canal digital complementa a indicação - você continua recebendo indicações E começa a captar quem busca no Google.",
    quando_usar: "Quando lead diz que só trabalha com indicação"
  },

  // Argumento 2: Instagram não converte
  instagram_limitado: {
    titulo: "Instagram é vitrine, não captação",
    argumento: "Instagram é ótimo pra mostrar trabalho, mas quem precisa de orçamento urgente busca no Google, não no Instagram. O algoritmo decide quem vê seu conteúdo. Com site SEO, você aparece pra quem está procurando ativamente.",
    quando_usar: "Quando lead diz que usa só Instagram"
  },

  // Argumento 3: Site institucional não converte
  site_nao_converte: {
    titulo: "Site bonito não é site que converte",
    argumento: "Muita integradora tem site institucional - bonito, mas sem foco em conversão. Não tem call-to-action clara, não aparece no Google, não tem integração com WhatsApp. Nosso foco é diferente: site que capta orçamento.",
    quando_usar: "Quando lead já tem site mas não gera leads"
  },

  // Argumento 4: Honestidade sobre resultados
  honestidade: {
    titulo: "Não prometemos milagres",
    argumento: "Muita agência promete 'primeira página do Google' ou 'X leads por mês'. A verdade: SEO leva tempo (3-6 meses), quantidade de leads depende do mercado local. O que garantimos é um canal bem estruturado - o resto depende de fatores que não controlamos.",
    quando_usar: "Quando lead pede garantias de resultado"
  }
};

/**
 *  VARIAÇÕES DE ABORDAGEM - SOLAR v4.0
 */
export const VARIACOES_CONTEXTO = {
  // Lead só tem indicação
  so_indicacao: [
    "Indicação é a melhor fonte - cliente já vem confiando. A questão é: quando indicação tá baixa, como vocês fazem? Com canal digital, você tem uma segunda fonte que não depende de terceiros.",
    "Faz sentido. Indicação funciona bem. O canal digital não substitui - complementa. Quando alguém busca 'energia solar [sua cidade]' no Google, você aparece?"
  ],

  // Lead só tem Instagram
  so_instagram: [
    "Instagram é ótimo pra mostrar o trabalho. Mas quem precisa de orçamento urgente geralmente busca no Google, não rola o feed. O canal digital pega essa demanda.",
    "Instagram é vitrine. Google é prateleira - quem tá lá já quer comprar. Site SEO te coloca na prateleira certa."
  ],

  // Lead já tentou antes
  ja_tentou_antes: [
    "Entendo. Muita integradora teve experiência ruim com agência que prometeu muito e entregou pouco. Por isso não prometemos ranking nem quantidade de leads - prometemos estrutura de captação bem feita.",
    "Faz sentido a desconfiança. O que diferencia nosso trabalho: foco em conversão (não em site bonito) e honestidade sobre o que dá pra entregar."
  ],

  // Lead acha caro
  questiona_preco: [
    "Entendo. A pergunta é: quanto vale um orçamento que vira projeto? Se o canal gerar 2-3 projetos por mês, já se paga. E é investimento único, não mensalidade.",
    "Faz sentido avaliar. Considera que hoje você provavelmente perde clientes que buscam no Google e não te encontram. O canal digital é pra captar esse público."
  ],

  // Lead não tem pressa
  sem_pressa: [
    "Tranquilo, sem pressão. Quando fizer sentido, é só chamar. Enquanto isso, fica a reflexão: quantos orçamentos você tá perdendo de pessoas que buscam no Google e não te encontram?",
    "Ok! Uma coisa pra pensar: a cada mês sem canal digital estruturado, você depende 100% de indicação. Quando quiser montar o seu, é só avisar."
  ]
};

/**
 *  CASES DE SUCESSO - SOLAR v4.0
 */
export const CASES_SUCESSO = {
  integradora_natal: {
    setor: "Integradora de Energia Solar",
    regiao: "Natal/RN",
    problema: "Só trabalhava com indicação, demanda irregular",
    solucao: "Landing page de orçamento + páginas SEO por bairro + WhatsApp integrado",
    resultados: [
      "4 solicitações de orçamento no primeiro mês após indexação",
      "Passou a aparecer para 'energia solar natal'",
      "Canal próprio complementando indicações"
    ],
    disclaimer: "Resultados variam por região e competição local",
    quando_usar: "Lead de Natal ou região metropolitana"
  },

  integradora_interior: {
    setor: "Integradora de Energia Solar",
    regiao: "Interior do RN",
    problema: "Instagram com 2k seguidores mas sem conversão",
    solucao: "Site focado em orçamento + SEO para cidades do interior",
    resultados: [
      "Primeiros orçamentos pelo site no mês 2",
      "Menos dependência do Instagram",
      "Profissionalização da presença online"
    ],
    disclaimer: "Interior geralmente tem menos busca, mas também menos concorrência",
    quando_usar: "Lead de cidade menor"
  }
};

/**
 *  GATILHOS - SOLAR v4.0 (COM ÉTICA)
 */
export const GATILHOS_MENTAIS = {
  // Sem falsa urgência ou escassez artificial
  reflexao: [
    "A cada mês sem presença digital, você depende 100% de indicação. Quando fizer sentido estruturar, é só chamar.",
    "Quantas pessoas buscaram 'energia solar [sua cidade]' esse mês? Se você não aparece, o concorrente aparece.",
    "O melhor momento pra plantar uma árvore foi 10 anos atrás. O segundo melhor é agora. Com canal digital é parecido."
  ],

  // Prova social honesta
  prova_social: [
    "Trabalhamos exclusivamente com integradoras de energia solar.",
    "Nosso foco é conversão, não site bonito. Site bonito que não converte não serve.",
    "Somos de Natal/RN - entendemos o mercado solar do Nordeste."
  ]
};

/**
 * Função auxiliar para buscar conteúdo relevante por contexto - SOLAR v4.0
 */
export function getRepertorioRelevante(contexto) {
  const { stage, painType, objection } = contexto;

  let repertorio = {
    sobre_empresa: SOBRE_EMPRESA,
    valores: SOBRE_EMPRESA.valores,
    diferenciais: SOBRE_EMPRESA.diferenciais,
    solucao: SOLUCOES.canal_digital
  };

  // Adicionar case mais relevante
  repertorio.case = CASES_SUCESSO.integradora_natal;

  // Adicionar argumentos relevantes por objeção
  if (objection === 'preco' || objection === 'caro') {
    repertorio.argumento = ARGUMENTOS_VENDA.honestidade;
    repertorio.variacoes = VARIACOES_CONTEXTO.questiona_preco;
  } else if (objection === 'ja_tentou' || objection === 'desconfianca') {
    repertorio.argumento = ARGUMENTOS_VENDA.honestidade;
    repertorio.variacoes = VARIACOES_CONTEXTO.ja_tentou_antes;
  } else if (painType === 'so_indicacao') {
    repertorio.argumento = ARGUMENTOS_VENDA.dependencia_indicacao;
    repertorio.variacoes = VARIACOES_CONTEXTO.so_indicacao;
  } else if (painType === 'so_instagram') {
    repertorio.argumento = ARGUMENTOS_VENDA.instagram_limitado;
    repertorio.variacoes = VARIACOES_CONTEXTO.so_instagram;
  } else if (painType === 'sem_pressa') {
    repertorio.variacoes = VARIACOES_CONTEXTO.sem_pressa;
  }

  return repertorio;
}

export default {
  SOBRE_EMPRESA,
  SOLUCOES,
  ARGUMENTOS_VENDA,
  VARIACOES_CONTEXTO,
  CASES_SUCESSO,
  GATILHOS_MENTAIS,
  getRepertorioRelevante
};
