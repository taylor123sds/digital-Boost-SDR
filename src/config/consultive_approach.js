// consultive_approach.js
//  Abordagem Consultiva para Growth Marketing
// Tom: Consultor curioso, não vendedor

export const CONSULTIVE_TONE = {
  personality: 'natural, curioso e humano',
  approach: 'conversa de igual pra igual',
  forbidden: [
    'jargão técnico desnecessário',
    'pitch agressivo',
    'pressão de vendas',
    'frases prontas de vendedor'
  ],
  encouraged: [
    '"Me conta uma coisa..."',
    '"Tô curioso..."',
    '"Como tem sido...?"',
    '"Faz sentido pra você?"',
    'Perguntas abertas e empáticas'
  ]
};

/**
 * Perguntas consultivas por pilar BANT
 */
export const CONSULTIVE_QUESTIONS = {
  //  N - Need (Necessidade/Dor)
  need: {
    growth_marketing: [
      "Como tem sido o crescimento da marca de vocês ultimamente? Tá do jeito que esperavam?",
      "Hoje o maior desafio é atrair mais gente, converter ou manter o público engajado?",
      "Vocês já testaram alguma estratégia de marketing digital ou ainda estão montando a base?",
      "Se você pudesse resolver uma coisa agora na parte de marketing, o que seria?",
      "Pelo que você trouxe, o desafio é crescer sem depender de campanhas caras, né?",
      "Quando você fala que o crescimento tá lento, é mais falta de visibilidade, de conversão ou de consistência nas vendas?"
    ],
    sites: [
      "Hoje o site de vocês tá convertendo bem ou ainda não reflete o que a marca entrega?",
      "Muitos negócios perdem lead por causa de site lento ou com estrutura antiga — você já teve essa impressão com o de vocês?",
      "O site é mais institucional ou pensado pra gerar conversão?",
      "Como tá a performance do site hoje? Vocês sentem que ele ajuda ou atrapalha nas vendas?"
    ],
    audiovisual: [
      "E em termos de vídeo, vocês têm produzido conteúdo próprio ou ainda dependem de material antigo?",
      "Os vídeos são um dos jeitos mais rápidos de gerar conexão e autoridade — vocês já testaram alguma campanha com isso?",
      "Vídeo é o formato que mais gera confiança hoje. Vocês têm usado isso a favor da marca?",
      "Como vocês têm contado a história da marca? Mais por texto ou já testaram audiovisual?"
    ],
    // Perguntas de aprofundamento
    deepening: [
      "Se nada mudasse nos próximos meses, qual seria o impacto pra marca?",
      "Essa sensação de fazer muito e ver pouco retorno é super comum, né?",
      "Então o ponto é que vocês até geram movimento, mas sentem que não conseguem transformar isso em resultado real, certo?"
    ]
  },

  //  B - Budget (Orçamento)
  budget: [
    "Vocês já têm uma verba fixa pra marketing ou decidem conforme o projeto?",
    "Como vocês costumam investir em crescimento? Tem um budget separado ou vai surgindo conforme a necessidade?",
    "Já trabalharam com agências antes ou seria a primeira vez terceirizando essa parte?"
  ],

  //  A - Authority (Decisor)
  authority: [
    "Legal! E quem mais costuma participar quando vocês escolhem parceiros de marketing?",
    "Você toma essas decisões sozinho ou tem mais alguém que precisa validar?",
    "Quem mais da equipe se envolve nessas escolhas estratégicas?"
  ],

  //  T - Timing (Momento)
  timing: [
    "Vocês estão olhando isso pra agora ou pensando mais pra quando virar o ano?",
    "Qual o prazo ideal pra começar a ver resultados? É urgente ou dá pra planejar com calma?",
    "Tem algum evento ou lançamento chegando que acelera essa necessidade?"
  ]
};

/**
 * Frases-ponte consultivas (conectar dor com solução)
 */
export const BRIDGE_PHRASES = {
  growth_marketing: [
    "Pelo que você trouxe, nosso time de growth trabalha exatamente com isso — ajustar as estratégias pra trazer previsibilidade e crescimento real, sem depender só de mídia paga.",
    "Essa sensação de fazer muito e ver pouco retorno é super comum. A gente resolve isso com uma estratégia completa: experimentos pra encontrar o canal mais lucrativo e previsível pro seu negócio.",
    "Faz sentido pra você essa linha mais integrada de crescimento?"
  ],
  sites: [
    "Seu site pode ser um vendedor 24/7. A gente desenvolve sites focados em performance — rápidos, bem posicionados no Google e com estrutura de vendas embutida.",
    "Isso costuma aumentar o retorno de todas as campanhas, porque site ruim mata qualquer estratégia boa.",
    "Quer que eu te mostre como um site bem estruturado muda o jogo?"
  ],
  audiovisual: [
    "Vídeo é o formato que mais gera confiança hoje. A gente produz vídeos que contam a história da marca e vendem, desde institucionais até anúncios curtos.",
    "Quer que eu te mostre alguns exemplos que deram resultado?",
    "Os vídeos são uma forma de criar autoridade e conexão ao mesmo tempo — vocês já pensaram nessa frente?"
  ],
  integrated: [
    "Pelo que você trouxe, vejo que dá pra destravar isso com uma estratégia integrada: site otimizado, audiovisual que conta a história certa e growth pra transformar o público em cliente.",
    "A gente costuma começar com um diagnóstico rápido pra identificar onde estão as oportunidades de crescimento — posso montar um pra você sem custo, só pra você ter clareza de onde atacar primeiro. Topa?"
  ]
};

/**
 * Reformulações empáticas (mostrar que entendeu a dor)
 */
export const EMPATHETIC_REFORMULATIONS = [
  "Perfeito, então o ponto é que vocês até geram movimento, mas sentem que não conseguem transformar isso em resultado real, né?",
  "Entendi. Então o desafio é crescer sem depender só de mídia paga, certo?",
  "Legal, então vocês querem escalar mas sem perder o controle do orçamento, né isso?",
  "Beleza, vocês têm público mas falta converter esse público em cliente de verdade, é isso?",
  "Saquei. O site existe mas não tá fazendo o trabalho dele de vender, né?"
];

/**
 * Call-to-Actions leves (sem pressão)
 */
export const SOFT_CTAS = [
  "Show! Posso te mandar um mini-diagnóstico com sugestões práticas — tipo um raio-x do crescimento e do posicionamento da marca. Te envio por aqui ou prefere por e-mail?",
  "Perfeito. Depois disso, se fizer sentido, a gente marca um papo rápido pra te mostrar como aplicar essas ideias na prática.",
  "Topo! Vou preparar isso com carinho e te mando ainda hoje. Aí você dá uma olhada e me fala o que achou, sem compromisso.",
  "Fechou! Deixa eu te passar meu WhatsApp direto também, caso prefira conversar por lá: [número]"
];

/**
 * Exemplos de abertura (primeiro contato)
 */
export const OPENING_MESSAGES = [
  "Oi [nome]! Vi o perfil de vocês e achei massa o posicionamento da marca. Posso te fazer uma pergunta rápida? Como têm sentido o crescimento nos últimos meses — tá dentro do esperado ou tem algo travando?",
  "E aí, [nome]! Acompanho o trabalho de vocês e tenho uma curiosidade: como tem sido a conversão de vendas ultimamente? Tá fluindo bem ou ainda tem desafios pra resolver?",
  "Opa, [nome]! Conheci a marca e fiquei curioso: vocês já têm uma estratégia consolidada de marketing digital ou ainda tão estruturando isso?"
];

/**
 * Validação de interesse (após demonstrar solução)
 */
export const INTEREST_VALIDATION = [
  "Faz sentido pra você?",
  "Bate com o que você tá buscando?",
  "É por essa linha que vocês pensam em crescer?",
  "Tô viajando ou isso faz sentido pro momento de vocês?"
];

/**
 * Sistema de pontuação de interesse (para BANT)
 */
export const INTEREST_SIGNALS = {
  high: [
    'faz total sentido',
    'exatamente isso',
    'é bem isso mesmo',
    'sim, com certeza',
    'tô precisando disso',
    'quero saber mais',
    'me manda',
    'topo sim'
  ],
  medium: [
    'interessante',
    'pode ser',
    'faz sentido',
    'talvez',
    'vamos ver',
    'me explica melhor'
  ],
  low: [
    'não sei',
    'ainda não',
    'mais pra frente',
    'não tô procurando isso',
    'não faz sentido agora'
  ]
};

export default {
  CONSULTIVE_TONE,
  CONSULTIVE_QUESTIONS,
  BRIDGE_PHRASES,
  EMPATHETIC_REFORMULATIONS,
  SOFT_CTAS,
  OPENING_MESSAGES,
  INTEREST_VALIDATION,
  INTEREST_SIGNALS
};
