/**
 * @file unified_segments.js
 * @description P2-3: Mapeamento unificado de segmentos → templates de mensagem
 *
 * PROPÓSITO:
 * - Centralizar configuração de segmentos/nichos
 * - Mapear cada segmento para templates de mensagem personalizados
 * - Fornecer prompts SPIN customizados por segmento
 * - Integrar com DynamicConsultativeEngine e Campaign System
 *
 * @version 1.0.0
 */

/**
 * SEGMENTOS DISPONÍVEIS
 * Cada segmento tem:
 * - Templates de mensagem para cada fase
 * - Palavras-chave para detecção automática
 * - Configurações específicas de abordagem
 */
export const SEGMENTS = {
  // =========================================================================
  // ENERGIA SOLAR
  // =========================================================================
  energia_solar: {
    id: 'energia_solar',
    name: 'Energia Solar',
    icon: '☀️',

    // Keywords para detecção automática
    keywords: [
      'solar', 'fotovoltaico', 'fotovoltaica', 'energia', 'painel',
      'inversor', 'instalador', 'integrador', 'geração distribuída'
    ],

    // ICP (Ideal Customer Profile)
    icp: {
      sizes: ['pequeno', 'medio'],
      minEmployees: 2,
      maxEmployees: 50,
      regions: ['nordeste', 'sudeste', 'sul'],
      decisionMaker: ['dono', 'sócio', 'gerente comercial']
    },

    // Templates por fase SPIN
    templates: {
      opening: {
        text: 'E aí! Vi que você trabalha com energia solar. Deixa eu perguntar: como os clientes chegam até vocês hoje pra pedir orçamento?',
        variations: [
          'Opa! Vocês são do ramo solar, né? De onde vem a maioria dos leads de vocês?',
          'Fala! Vi que vocês são integradores. Tão conseguindo manter o fluxo de orçamentos constante?'
        ]
      },
      situation: {
        painPoints: [
          'dependência de indicação',
          'sazonalidade (verão forte, inverno fraco)',
          'concorrência com preço baixo',
          'leads sem qualificação'
        ],
        questions: [
          'A maioria dos leads vem por indicação ou têm outro canal?',
          'Vocês já investiram em tráfego pago ou marketing digital?',
          'Quando o cliente pesquisa energia solar na região de vocês, quem aparece?'
        ]
      },
      problem: {
        tensions: [
          'Cada mês sem lead previsível é faturamento deixado na mesa',
          'Enquanto você espera indicação, o concorrente que aparece no Google fecha o contrato',
          'Depender de indicação é ficar refém - pode vir 10 num mês e zero no outro'
        ],
        questions: [
          'Quantos orçamentos você DEIXA de fazer por mês por falta de lead?',
          'Tem mês que sobra pedido e mês que você fica esperando indicação?',
          'Se um projeto médio vale R$ X, quanto você perde por mês em oportunidades?'
        ]
      },
      implication: {
        cascadeEffects: [
          'Hoje são 2 projetos perdidos, mas em 6 meses a concorrência domina a região',
          'Instalador parado hoje é instalador procurando outro integrador amanhã',
          'Cada mês assim, mais difícil fica recuperar o terreno perdido'
        ],
        questions: [
          'Se continuar assim por mais 6 meses, como fica a operação?',
          'Isso te impede de contratar mais instaladores? De crescer?',
          'Quanto você deixou de faturar no último ano por falta de lead constante?'
        ]
      },
      needPayoff: {
        visionStatements: [
          'Imagina ter X leads qualificados todo mês, sem depender de indicação',
          'Quando o cliente pesquisa solar na sua região, você aparece primeiro',
          'Leads que já pesquisaram preço, sabem o valor e querem fechar'
        ],
        questions: [
          'Faz sentido ter um canal previsível de leads, ou prefere continuar dependendo de indicação?',
          'Se eu te mostrasse como gerar X orçamentos por mês, valeria uma conversa?',
          'Você decide isso sozinho ou precisa alinhar com alguém?'
        ]
      },
      closing: {
        deliverable: 'Na reunião eu faço um diagnóstico do seu canal digital e te mostro EXATAMENTE onde estão as oportunidades na sua região',
        cta: 'Vamos marcar pra terça às 14h ou quinta às 10h?'
      }
    },

    // Métricas típicas do segmento
    metrics: {
      avgTicket: 35000,
      avgConversionRate: 0.25,
      avgLeadsPerMonth: 15,
      seasonality: { high: [10, 11, 12, 1, 2], low: [6, 7, 8] }
    }
  },

  // =========================================================================
  // GESTÃO FINANCEIRA / PEQUENOS NEGÓCIOS
  // =========================================================================
  gestao_financeira: {
    id: 'gestao_financeira',
    name: 'Gestão Financeira',
    icon: '💰',

    keywords: [
      'gestão', 'financeiro', 'caixa', 'dre', 'controle', 'fluxo',
      'mercadinho', 'loja', 'comércio', 'restaurante', 'autônomo'
    ],

    icp: {
      sizes: ['micro', 'pequeno'],
      minEmployees: 1,
      maxEmployees: 20,
      regions: ['brasil'],
      decisionMaker: ['dono', 'proprietário', 'faz tudo']
    },

    templates: {
      opening: {
        text: 'Opa! Me conta: qual a maior dificuldade que você tá enfrentando hoje pra crescer o negócio?',
        variations: [
          'E aí! Você consegue dizer hoje, com certeza, quanto tá sobrando limpo no fim do mês?',
          'Fala! Como tá o controle financeiro aí? Tá conseguindo ver o resultado de verdade?'
        ]
      },
      situation: {
        painPoints: [
          'mistura conta pessoal com empresa',
          'não sabe se tá dando lucro',
          'surpresas no caixa',
          'despesas desorganizadas'
        ],
        questions: [
          'Como você controla as entradas e saídas hoje? Planilha, caderno, sistema?',
          'Consegue separar o que é da empresa do que é seu pessoal?',
          'No fim do mês você sabe exatamente quanto sobrou limpo?'
        ]
      },
      problem: {
        tensions: [
          'Entra dinheiro o mês inteiro, mas no fim nunca sabe quanto foi pra empresa',
          'Quando não enxerga o resultado, não dá pra tomar decisão certa',
          'Misturar as contas é receita pra virar escravo do próprio negócio'
        ],
        questions: [
          'Já aconteceu de chegar no fim do mês e não saber se deu lucro ou prejuízo?',
          'Você sabe dizer hoje quanto pode tirar pra você sem prejudicar o negócio?',
          'Como você decide quanto pode gastar ou investir?'
        ]
      },
      implication: {
        cascadeEffects: [
          'Sem saber o resultado real, qualquer decisão vira chute',
          'Negócio que não se organiza hoje, não cresce amanhã',
          'Cada mês assim é oportunidade de ajuste perdida'
        ],
        questions: [
          'Quanto você acha que perde por mês em gasto desnecessário que não enxerga?',
          'Se continuar assim, como vai ser daqui a 1 ano?',
          'Isso te deixa mais estressado ou mais tranquilo?'
        ]
      },
      needPayoff: {
        visionStatements: [
          'Imagina abrir o celular e ver exatamente quanto entrou, quanto saiu e quanto sobrou',
          'Saber, todo mês, se deu lucro ou prejuízo - sem surpresa',
          'Ter controle pra decidir com segurança quanto pode tirar pra você'
        ],
        questions: [
          'Faz sentido ter uma visão clara do resultado todo mês?',
          'Vale uma conversa de 30 minutos pra eu te mostrar como funciona?',
          'Você decide isso sozinho ou tem sócio?'
        ]
      },
      closing: {
        deliverable: 'Na reunião eu te mostro um diagnóstico personalizado de como organizar seu financeiro em 30 dias',
        cta: 'Fica melhor de manhã ou de tarde pra você?'
      }
    },

    metrics: {
      avgTicket: 600,
      avgConversionRate: 0.20,
      avgLeadsPerMonth: 50,
      seasonality: { high: [1, 2, 7, 8], low: [12] }
    }
  },

  // =========================================================================
  // CLÍNICAS / SAÚDE
  // =========================================================================
  clinica_saude: {
    id: 'clinica_saude',
    name: 'Clínicas e Saúde',
    icon: '🏥',

    keywords: [
      'clínica', 'consultório', 'médico', 'dentista', 'fisioterapia',
      'estética', 'psicólogo', 'nutricionista', 'veterinário'
    ],

    icp: {
      sizes: ['micro', 'pequeno', 'medio'],
      minEmployees: 1,
      maxEmployees: 30,
      regions: ['brasil'],
      decisionMaker: ['dono', 'sócio', 'administrador']
    },

    templates: {
      opening: {
        text: 'Opa! Vi que você tem uma clínica. De onde vem a maioria dos pacientes novos hoje?',
        variations: [
          'E aí! Como tá o fluxo de pacientes novos aí na clínica?',
          'Fala! Vocês têm agenda lotada ou ainda tem horário sobrando?'
        ]
      },
      situation: {
        painPoints: [
          'dependência de convênio com margem baixa',
          'horários vagos na agenda',
          'pacientes particulares escassos',
          'concorrência com clínicas populares'
        ],
        questions: [
          'Qual a proporção de convênio vs particular hoje?',
          'Vocês têm presença digital? Site, Instagram?',
          'Quando alguém pesquisa sua especialidade na região, você aparece?'
        ]
      },
      problem: {
        tensions: [
          'Convênio paga pouco e ainda atrasa - mas sem ele a agenda fica vazia',
          'Cada horário vago é dinheiro que não volta mais',
          'Enquanto você depende de convênio, não consegue investir em estrutura'
        ],
        questions: [
          'Quantos horários por semana ficam vagos em média?',
          'Já pensou em aumentar o particular mas não sabe como atrair?',
          'Quanto você perde por mês em horários não preenchidos?'
        ]
      },
      implication: {
        cascadeEffects: [
          'Horário vago hoje é faturamento perdido pra sempre',
          'Cada mês dependendo de convênio é menos margem pra reinvestir',
          'Concorrência que aparece no Google fecha antes de você'
        ],
        questions: [
          'Se continuar assim por mais 1 ano, como fica a situação?',
          'Isso te impede de contratar mais profissionais ou expandir?',
          'Quanto precisa faturar a mais pra chegar onde quer?'
        ]
      },
      needPayoff: {
        visionStatements: [
          'Imagina ter agenda cheia de particulares que pagam o valor justo',
          'Pacientes que te encontram no Google, já sabendo seu diferencial',
          'Menos dependência de convênio, mais margem pra crescer'
        ],
        questions: [
          'Faz sentido ter um canal previsível de pacientes particulares?',
          'Vale uma conversa pra eu mostrar como clínicas parecidas resolveram isso?',
          'Você decide isso sozinho ou tem sócios?'
        ]
      },
      closing: {
        deliverable: 'Na reunião eu mostro um diagnóstico do seu posicionamento digital e oportunidades na sua região',
        cta: 'Terça ou quinta fica melhor pra você?'
      }
    },

    metrics: {
      avgTicket: 8000,
      avgConversionRate: 0.15,
      avgLeadsPerMonth: 30,
      seasonality: { high: [3, 4, 5, 9, 10], low: [12, 1, 7] }
    }
  },

  // =========================================================================
  // RESTAURANTES / ALIMENTAÇÃO
  // =========================================================================
  restaurante: {
    id: 'restaurante',
    name: 'Restaurantes',
    icon: '🍽️',

    keywords: [
      'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'bar',
      'café', 'padaria', 'delivery', 'ifood', 'comida'
    ],

    icp: {
      sizes: ['micro', 'pequeno'],
      minEmployees: 2,
      maxEmployees: 30,
      regions: ['brasil'],
      decisionMaker: ['dono', 'sócio', 'gerente']
    },

    templates: {
      opening: {
        text: 'E aí! Como tá o movimento aí no restaurante? Tá conseguindo manter cheio nos dias fracos?',
        variations: [
          'Opa! Delivery tá bombando ou o salão tá voltando com força?',
          'Fala! Qual o maior desafio hoje - atrair cliente ou organizar a operação?'
        ]
      },
      situation: {
        painPoints: [
          'dias fracos (segunda, terça)',
          'dependência de ifood com taxa alta',
          'falta de controle de custo',
          'desperdício de insumos'
        ],
        questions: [
          'Qual dia da semana é mais fraco pra vocês?',
          'Quanto do faturamento vem de delivery (iFood, etc)?',
          'Vocês controlam o CMV (custo de mercadoria vendida)?'
        ]
      },
      problem: {
        tensions: [
          'iFood come 25-30% do faturamento - mas sem ele o movimento cai',
          'Segunda e terça vazios, mas os custos fixos continuam',
          'Sem saber o CMV real, você pode tá vendendo e perdendo dinheiro'
        ],
        questions: [
          'Quanto você paga de taxa pro iFood por mês?',
          'Já aconteceu de fechar o mês e não saber se deu lucro?',
          'Você sabe quanto sobra limpo depois de pagar tudo?'
        ]
      },
      implication: {
        cascadeEffects: [
          'Cada dia fraco é custo fixo que não se paga',
          'Depender de iFood é trabalhar pro aplicativo, não pra você',
          'Sem controle de custo, você pode estar vendendo pra ter prejuízo'
        ],
        questions: [
          'Se conseguisse lotar segunda e terça, quanto a mais faturaria?',
          'Quanto você acha que perde por mês em desperdício que não enxerga?',
          'Isso te deixa mais tranquilo ou mais preocupado?'
        ]
      },
      needPayoff: {
        visionStatements: [
          'Imagina ter o restaurante cheio todos os dias, inclusive segunda',
          'Clientes diretos, sem pagar 27% de taxa pra aplicativo',
          'Saber exatamente quanto cada prato dá de lucro'
        ],
        questions: [
          'Faz sentido ter mais controle e menos dependência de aplicativo?',
          'Vale uma conversa pra eu mostrar como restaurantes parecidos resolveram?',
          'Você decide isso sozinho?'
        ]
      },
      closing: {
        deliverable: 'Na reunião eu mostro um diagnóstico da sua operação e onde estão as maiores oportunidades de margem',
        cta: 'Manhã ou tarde fica melhor?'
      }
    },

    metrics: {
      avgTicket: 3000,
      avgConversionRate: 0.18,
      avgLeadsPerMonth: 40,
      seasonality: { high: [5, 6, 11, 12], low: [1, 2] }
    }
  },

  // =========================================================================
  // DEFAULT / GENÉRICO
  // =========================================================================
  default: {
    id: 'default',
    name: 'Negócio Geral',
    icon: '💼',

    keywords: [],

    icp: {
      sizes: ['micro', 'pequeno', 'medio'],
      minEmployees: 1,
      maxEmployees: 100,
      regions: ['brasil'],
      decisionMaker: ['dono', 'sócio', 'gerente', 'diretor']
    },

    templates: {
      opening: {
        text: 'E aí! Me conta: qual o maior desafio que você tá enfrentando hoje no seu negócio?',
        variations: [
          'Opa! O que te trouxe aqui hoje? Qual problema você quer resolver?',
          'Fala! Como posso te ajudar a crescer o negócio?'
        ]
      },
      situation: {
        painPoints: [
          'falta de previsibilidade',
          'dependência do dono',
          'processos desorganizados',
          'dificuldade de crescer'
        ],
        questions: [
          'Como funciona a operação hoje?',
          'Quais são os principais canais de venda?',
          'Quantas pessoas trabalham aí?'
        ]
      },
      problem: {
        tensions: [
          'Sem processo claro, cada dia é uma surpresa diferente',
          'Quando tudo depende de você, não dá pra crescer',
          'Sem dados, qualquer decisão é um chute'
        ],
        questions: [
          'Qual a maior dor que você enfrenta hoje?',
          'Isso te impede de fazer o quê?',
          'Quanto você acha que perde por mês com esse problema?'
        ]
      },
      implication: {
        cascadeEffects: [
          'Cada mês assim é oportunidade perdida',
          'Problema que não resolve hoje, fica maior amanhã',
          'Enquanto você apaga incêndio, a concorrência cresce'
        ],
        questions: [
          'Se continuar assim por mais 1 ano, como fica?',
          'Isso afeta outras áreas do negócio?',
          'Quanto mais você conseguiria fazer se resolvesse isso?'
        ]
      },
      needPayoff: {
        visionStatements: [
          'Imagina ter isso resolvido e poder focar no que importa',
          'Processo claro, resultado previsível, menos estresse',
          'Crescer de forma sustentável, sem depender só de você'
        ],
        questions: [
          'Faz sentido resolver isso de uma vez?',
          'Vale uma conversa pra eu entender melhor e te mostrar opções?',
          'Você decide isso sozinho?'
        ]
      },
      closing: {
        deliverable: 'Na reunião eu faço um diagnóstico personalizado do seu caso e te mostro um caminho concreto',
        cta: 'Qual horário fica bom pra você?'
      }
    },

    metrics: {
      avgTicket: 5000,
      avgConversionRate: 0.15,
      avgLeadsPerMonth: 30,
      seasonality: { high: [], low: [] }
    }
  }
};

/**
 * Detecta segmento automaticamente baseado em texto
 * @param {string} text - Texto para análise (mensagem do lead, descrição, etc)
 * @returns {string} ID do segmento detectado
 */
export function detectSegment(text) {
  if (!text) return 'default';

  const textLower = text.toLowerCase();
  let bestMatch = { segmentId: 'default', score: 0 };

  for (const [segmentId, config] of Object.entries(SEGMENTS)) {
    if (segmentId === 'default') continue;

    let score = 0;
    for (const keyword of config.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        score++;
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { segmentId, score };
    }
  }

  return bestMatch.segmentId;
}

/**
 * Obtém configuração de segmento
 * @param {string} segmentId - ID do segmento
 * @returns {object} Configuração do segmento
 */
export function getSegmentConfig(segmentId) {
  return SEGMENTS[segmentId] || SEGMENTS.default;
}

/**
 * Obtém template para fase específica
 * @param {string} segmentId - ID do segmento
 * @param {string} phase - Fase SPIN (opening, situation, problem, implication, needPayoff, closing)
 * @returns {object} Template da fase
 */
export function getPhaseTemplate(segmentId, phase) {
  const config = getSegmentConfig(segmentId);
  return config.templates[phase] || SEGMENTS.default.templates[phase];
}

/**
 * Gera instrução para o Writer baseada no segmento
 * @param {string} segmentId - ID do segmento
 * @param {string} currentPhase - Fase atual SPIN
 * @returns {string} Instrução para o Writer
 */
export function generateSegmentInstruction(segmentId, currentPhase) {
  const config = getSegmentConfig(segmentId);
  const template = config.templates[currentPhase];

  if (!template) return '';

  let instruction = `\n\n## CONTEXTO DO SEGMENTO: ${config.name} ${config.icon}\n`;

  if (currentPhase === 'situation' || currentPhase === 'problem') {
    instruction += `\n### Dores típicas deste segmento:\n`;
    template.painPoints?.forEach(pain => {
      instruction += `- ${pain}\n`;
    });

    if (template.tensions) {
      instruction += `\n### Use tensão (custo da dor):\n`;
      template.tensions.forEach(tension => {
        instruction += `- "${tension}"\n`;
      });
    }
  }

  if (template.questions) {
    instruction += `\n### Perguntas sugeridas para ${currentPhase}:\n`;
    template.questions.forEach(q => {
      instruction += `- ${q}\n`;
    });
  }

  if (currentPhase === 'closing' && template.deliverable) {
    instruction += `\n### Entregável da reunião:\n"${template.deliverable}"\n`;
    instruction += `\n### CTA:\n"${template.cta}"\n`;
  }

  return instruction;
}

/**
 * Lista todos os segmentos disponíveis
 * @returns {Array} Lista de segmentos
 */
export function listSegments() {
  return Object.entries(SEGMENTS).map(([id, config]) => ({
    id,
    name: config.name,
    icon: config.icon,
    keywordCount: config.keywords.length
  }));
}

export default {
  SEGMENTS,
  detectSegment,
  getSegmentConfig,
  getPhaseTemplate,
  generateSegmentInstruction,
  listSegments
};
