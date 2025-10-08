// tools/bant_framework.js
// 🎯 MELHORIA: Framework BANT Estruturado

/**
 * 🎯 BANT FRAMEWORK - Estrutura de Vendas Consultivas
 *
 * Implementa metodologia BANT (Budget, Authority, Need, Timing) com:
 * ✅ Abertura com quebra de gelo + autoridade implícita
 * 💰 Budget exploration sem travar conversa
 * 👔 Authority identification sem ser invasivo
 * 🎯 Need discovery conectando dor ao valor
 * ⏰ Timing com senso de urgência
 * 🤝 Fechamento com resumo + CTA leve
 */

class BANTFramework {
  constructor() {
    // Estágios do BANT
    this.stages = {
      OPENING: 'opening',              // Abertura + Quebra de gelo
      BUDGET: 'budget',                // Exploração de orçamento
      AUTHORITY: 'authority',          // Identificação de decisores
      NEED: 'need',                    // Discovery de necessidades/dores
      TIMING: 'timing',                // Urgência e prazo
      CLOSING: 'closing'               // Resumo + CTA
    };

    // Ordem de progressão
    this.stageOrder = [
      'opening',
      'budget',
      'authority',
      'need',
      'timing',
      'closing'
    ];

    // Templates de conversa estruturados
    this.conversationTemplates = {
      // 🎬 ABERTURA - Quebra de gelo + Autoridade implícita
      opening: {
        stage: 'opening',
        objective: 'Criar rapport e estabelecer autoridade sem ser invasivo',
        template: `"Oi [Nome], tudo bem? Aqui é da Digital Boost. Eu acompanhei um pouco do mercado de vocês e percebi que muitas empresas do setor estão sofrendo com [problema relevante – ex: perda de leads, atendimento lento, falta de automação]. Faz sentido para você se eu te mostrar como algumas delas estão conseguindo aumentar conversões em até 40% e ganhar agilidade?"`,

        patterns: [
          'Apresentar empresa + autoridade no mercado',
          'Mencionar problema relevante observado no setor',
          'Usar prova social (empresas similares)',
          'Terminar com pergunta que gera curiosidade',
          'NÃO vender diretamente, apenas validar interesse'
        ],

        signals: {
          completed: [
            'cliente perguntou como funciona',
            'demonstrou interesse em saber mais',
            'confirmou que problema é relevante',
            'pediu detalhes',
            'respondeu positivamente'
          ],
          blocked: [
            'não tenho interesse',
            'já uso outra solução',
            'não é o momento',
            'me manda material'
          ]
        },

        prompt: `
🎬 ESTÁGIO: ABERTURA (Opening)

ESTRUTURA:
"Oi [Nome]! Percebi que muitas empresas do setor sofrem com [problema comum: perda de leads, atendimento lento, etc]. Faz sentido te mostrar como estão resolvendo isso com IA?"

OBJETIVO:
- Criar rapport e curiosidade
- Validar se problema é relevante
- NÃO venda diretamente ainda
- NÃO peça reunião agora
`
      },

      // 💰 BUDGET - Explorar sem travar conversa
      budget: {
        stage: 'budget',
        objective: 'Entender budget sem assustar, mostrando que já está gastando',
        template: `"Hoje, quanto vocês gastam em média com [atendimento/vendas/solução atual]? E se houvesse uma forma de transformar parte desse custo fixo em investimento próprio, que depois gera economia e mais vendas todos os meses, faria sentido para você analisar?"`,

        patterns: [
          'Perguntar gasto atual de forma natural',
          'Reframe: custo → investimento',
          'Mostrar que orçamento já existe, só está mal alocado',
          'Conectar gasto atual a benefício futuro',
          'NÃO mencionar preços ainda'
        ],

        signals: {
          completed: [
            'revelou valores aproximados',
            'mencionou quanto gasta atualmente',
            'disse que tem orçamento',
            'perguntou quanto custaria',
            'mostrou interesse em otimizar gastos'
          ],
          blocked: [
            'não posso revelar valores',
            'não temos orçamento',
            'muito caro',
            'fora do budget'
          ]
        },

        prompt: `
💰 ESTÁGIO: BUDGET (Orçamento)

PERGUNTA OBRIGATÓRIA:
"E hoje, quanto vocês gastam em média com atendimento/vendas por mês?"

COMPLEMENTO (se necessário):
"Pergunto porque geralmente o orçamento já existe, só está mal alocado. Se houvesse uma forma de transformar parte desse custo em investimento que gera mais vendas, faria sentido analisar?"

NÃO mencione preços da Digital Boost. Apenas descubra o budget atual.
`
      },

      // 👔 AUTHORITY - Identificar decisores sem ser invasivo
      authority: {
        stage: 'authority',
        objective: 'Mapear decisores sem descredibilizar quem fala com você',
        template: `"Perfeito. Normalmente, quando vocês analisam um projeto desse tipo, quem além de você participa da decisão final? Pergunto só para garantir que, quando formos apresentar a solução completa, todas as pessoas certas já estejam na mesa."`,

        patterns: [
          'Perguntar "quem ALÉM de você" (valoriza quem fala)',
          'Usar "quando vocês analisam projeto desse tipo"',
          'Justificar pergunta (apresentação completa)',
          'Usar "garantir pessoas certas na mesa"',
          'NÃO desqualificar interlocutor'
        ],

        signals: {
          completed: [
            'mencionou decisor (CEO, sócio, diretor)',
            'revelou processo de decisão',
            'disse que é o decisor',
            'explicou hierarquia',
            'indicou quem precisa aprovar'
          ],
          blocked: [
            'sou apenas funcionário',
            'preciso falar com chefe',
            'não posso decidir isso',
            'decisão é do diretor'
          ]
        },

        prompt: `
👔 ESTÁGIO: AUTHORITY (Autoridade Decisória)

PERGUNTA OBRIGATÓRIA:
"Perfeito. Normalmente, quando vocês analisam um projeto desse tipo, quem além de você participa da decisão final?"

JUSTIFICATIVA (se necessário):
"Pergunto só para garantir que, quando formos apresentar a solução completa, todas as pessoas certas já estejam na mesa."

NÃO pergunte "você tem autoridade?" ou "você é o dono?". Use "quem ALÉM de você".
`
      },

      // 🎯 NEED - Conectar dor ao valor
      need: {
        stage: 'need',
        objective: 'Fazer cliente verbalizar a dor e conectar à solução',
        template: `"E me conta, hoje o que mais incomoda no cenário atual: [opção A], [opção B], ou [opção C]?" → "Legal, então a prioridade é [resumir dor]. O que fazemos é justamente atacar esse ponto: [solução específica]. Isso traria impacto direto na margem da empresa, certo?"`,

        patterns: [
          'Oferecer múltiplas escolhas de dor (forçar escolha)',
          'Fazer cliente DIZER a dor com próprias palavras',
          'Resumir e validar prioridade',
          'Conectar dor específica → solução específica',
          'Fazer cliente confirmar impacto no negócio'
        ],

        signals: {
          completed: [
            'verbalizou dor principal',
            'confirmou prioridade',
            'reconheceu impacto no negócio',
            'concordou que precisa resolver',
            'mostrou urgência na dor'
          ],
          blocked: [
            'não temos esse problema',
            'está tudo ok',
            'não é prioridade agora',
            'já resolvemos isso'
          ]
        },

        prompt: `
🎯 ESTÁGIO: NEED (Necessidade/Dor)

PERGUNTA OBRIGATÓRIA:
"E me conta, hoje qual o maior desafio que vocês enfrentam: perder leads por demora no atendimento, equipe sobrecarregada, ou falta de atendimento 24/7?"

APÓS RESPOSTA:
Resumir o que ele disse e conectar brevemente à solução: "Entendi, então a prioridade é [dor dele]. Nosso agente de IA ataca exatamente esse ponto."

NÃO fale de features ainda. Apenas identifique e valide a dor.
`
      },

      // ⏰ TIMING - Senso de urgência
      timing: {
        stage: 'timing',
        objective: 'Criar urgência sem pressionar, ativando gatilho de antecipação',
        template: `"Vocês já têm algum prazo em mente para resolver isso? Pergunto porque empresas que se antecipam ao próximo [evento relevante] costumam ter ganhos bem maiores do que aquelas que deixam para depois."`,

        patterns: [
          'Perguntar prazo sem pressionar',
          'Justificar pergunta (antecipação = ganhos maiores)',
          'Mencionar evento relevante (reajuste, sazonalidade, etc)',
          'Usar prova social (empresas que se anteciparam)',
          'Criar FOMO sem ser agressivo'
        ],

        signals: {
          completed: [
            'mencionou prazo específico',
            'disse "o quanto antes"',
            'reconheceu urgência',
            'mencionou evento que pressiona',
            'quer começar logo'
          ],
          blocked: [
            'sem pressa',
            'vamos avaliar com calma',
            'talvez ano que vem',
            'não é urgente'
          ]
        },

        prompt: `
⏰ ESTÁGIO: TIMING (Urgência e Prazo)

PERGUNTA OBRIGATÓRIA:
"Vocês já têm algum prazo em mente para resolver essa questão?"

COMPLEMENTO (criar urgência natural):
"Pergunto porque empresas que se antecipam à Black Friday/fim do ano costumam ter ganhos bem maiores."

NÃO pressione ("precisa decidir hoje"). Apenas identifique o prazo ideal.
`
      },

      // 🤝 CLOSING - Resumo + CTA leve
      closing: {
        stage: 'closing',
        objective: 'Resumir BANT descoberto e propor próximo passo leve',
        template: `"Então recapitulando: vocês já têm um orçamento girando em [valor mencionado], você participa da análise junto a [decisor], a maior necessidade é [dor principal] e o momento ideal seria [prazo]. Faz sentido marcarmos uma reunião rápida com vocês e [decisor] para mostrar números reais de quanto poderiam economizar/ganhar?"`,

        patterns: [
          'Recapitular TODOS os pontos BANT descobertos',
          'Usar palavras EXATAS do cliente',
          'Resumir Budget + Authority + Need + Timing',
          'CTA leve: "faz sentido marcar..."',
          'Mencionar valor específico (números, ROI, demo)'
        ],

        signals: {
          completed: [
            'aceitou reunião',
            'pediu proposta',
            'perguntou próximos passos',
            'passou contato do decisor',
            'confirmou interesse'
          ],
          blocked: [
            'preciso pensar',
            'me manda material',
            'não é o momento',
            'vou avaliar e retorno'
          ]
        },

        prompt: `
🤝 ESTÁGIO: CLOSING (Fechamento)

ESTRUTURA OBRIGATÓRIA:
"Então recapitulando: vocês [BUDGET], [AUTHORITY participa da decisão], a maior necessidade é [NEED], e o ideal seria [TIMING]. Faz sentido marcarmos uma reunião rápida para mostrar números reais de ROI?"

IMPORTANTE:
- Mencione TODOS os 4 pontos BANT (Budget, Authority, Need, Timing)
- Use palavras exatas do cliente
- CTA leve: "faz sentido marcar..."

NÃO seja agressivo ("fecha comigo hoje?"). Proponha reunião consultiva.
`
      }
    };

    console.log('🎯 [BANT-FRAMEWORK] Sistema de vendas estruturadas inicializado');
  }

  /**
   * 🔍 DETECTA ESTÁGIO ATUAL DA CONVERSA
   */
  detectCurrentStage(history = [], context = {}) {
    // Se não há histórico, está em OPENING
    if (!history || history.length === 0) {
      return this.stages.OPENING;
    }

    // 🎯 LÓGICA INTELIGENTE: Detectar estágio baseado em informações BANT coletadas
    const conversationText = history.map(h => h.content).join(' ');
    const bantInfo = this.extractBANTInfo(history);

    // Contar quantas informações BANT já foram coletadas
    const bantCollected = {
      budget: !!bantInfo.budget,
      authority: !!bantInfo.authority,
      need: !!bantInfo.need,
      timing: !!bantInfo.timing
    };

    const bantCount = Object.values(bantCollected).filter(v => v).length;

    // Detectar interesse/confirmação positiva (conclusão do OPENING)
    const openingCompleted = history.length >= 2 && (
      conversationText.toLowerCase().includes('sim') ||
      conversationText.toLowerCase().includes('faz sentido') ||
      conversationText.toLowerCase().includes('interessante') ||
      conversationText.toLowerCase().includes('me interessa') ||
      conversationText.toLowerCase().includes('quero')
    );

    // Determinar estágio baseado em BANT coletado
    let currentStage = this.stages.OPENING;

    if (!openingCompleted) {
      // Ainda em abertura, sem interesse confirmado
      currentStage = this.stages.OPENING;
    } else if (bantCount === 0) {
      // Interesse confirmado, mas nenhum BANT coletado = ir para BUDGET
      currentStage = this.stages.BUDGET;
    } else if (bantCollected.budget && !bantCollected.authority) {
      // Budget coletado, falta authority = ir para AUTHORITY
      currentStage = this.stages.AUTHORITY;
    } else if (bantCollected.budget && bantCollected.authority && !bantCollected.need) {
      // Budget e Authority coletados, falta need = ir para NEED
      currentStage = this.stages.NEED;
    } else if (bantCollected.budget && bantCollected.authority && bantCollected.need && !bantCollected.timing) {
      // Budget, Authority, Need coletados, falta timing = ir para TIMING
      currentStage = this.stages.TIMING;
    } else if (bantCount === 4) {
      // Todos os 4 pontos BANT coletados = ir para CLOSING
      currentStage = this.stages.CLOSING;
    }

    console.log(`🎯 [BANT] Estágio detectado: ${currentStage} (BANT: ${bantCount}/4 coletados)`);
    return currentStage;
  }

  /**
   * 📋 GERA PROMPT PARA ESTÁGIO ATUAL
   */
  getStagePrompt(stage, context = {}) {
    const stageConfig = this.conversationTemplates[stage];

    if (!stageConfig) {
      return '';
    }

    return stageConfig.prompt;
  }

  /**
   * 📊 EXTRAI INFORMAÇÕES BANT DO HISTÓRICO
   */
  extractBANTInfo(history = []) {
    const conversationText = history.map(h => h.content).join(' ');

    return {
      budget: this.extractBudget(conversationText),
      authority: this.extractAuthority(conversationText),
      need: this.extractNeed(conversationText),
      timing: this.extractTiming(conversationText)
    };
  }

  extractBudget(text) {
    // Detectar menções de valores, gastos, orçamento
    const budgetPatterns = [
      /r\$\s*\d+[.,]?\d*/gi,
      /\d+\s*mil/gi,
      /gast(o|am|amos)\s+.*?(\d+)/gi,
      /(orçamento|budget|investimento).*?(\d+)/gi
    ];

    for (const pattern of budgetPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const matchedText = match[0];
        const index = match.index;

        // ⚠️ VALIDAÇÃO: Verificar se não é uma negação
        const contextBefore = text.substring(Math.max(0, index - 60), index).toLowerCase();
        const contextAfter = text.substring(index, Math.min(text.length, index + matchedText.length + 40)).toLowerCase();

        const negativeWords = [
          'não', 'nao', 'sem', 'nunca', 'jamais',
          'muito caro', 'muito alto', 'não tenho', 'não temos',
          'falta', 'precis', 'sem dinheiro'
        ];

        const hasNegation = negativeWords.some(word =>
          contextBefore.includes(word) || contextAfter.includes(word)
        );

        if (!hasNegation) {
          console.log(`💰 [BANT-BUDGET] Extraído: "${matchedText}" (validado - sem negação)`);
          return matchedText;
        } else {
          console.log(`⚠️ [BANT-BUDGET] Ignorado: "${matchedText}" (detectada negação no contexto)`);
        }
      }
    }

    return null;
  }

  extractAuthority(text) {
    // Detectar menções de decisores
    const authorityPatterns = [
      /sócio/gi,
      /diretor/gi,
      /ceo/gi,
      /dono/gi,
      /gerente/gi,
      /responsável/gi,
      /(decid|aprov)(e|o|a|ir)/gi
    ];

    for (const pattern of authorityPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const matchedText = match[0];
        const index = match.index;

        // ⚠️ VALIDAÇÃO: Verificar se não é negação ou terceira pessoa
        const contextBefore = text.substring(Math.max(0, index - 60), index).toLowerCase();
        const contextAfter = text.substring(index, Math.min(text.length, index + matchedText.length + 40)).toLowerCase();

        const negativeWords = [
          'não sou', 'não é', 'preciso falar com', 'tenho que consultar',
          'não posso', 'não decido', 'meu chefe', 'minha chefe',
          'outro', 'outra pessoa', 'não tenho autonomia'
        ];

        const hasNegation = negativeWords.some(word =>
          contextBefore.includes(word) || contextAfter.includes(word)
        );

        if (!hasNegation) {
          console.log(`👤 [BANT-AUTHORITY] Extraído: "${matchedText}" (validado - sem negação)`);
          return matchedText;
        } else {
          console.log(`⚠️ [BANT-AUTHORITY] Ignorado: "${matchedText}" (detectada negação no contexto)`);
        }
      }
    }

    return null;
  }

  extractNeed(text) {
    // Detectar dores mencionadas
    const needPatterns = [
      /perd(er|endo|o)\s+(lead|cliente|venda)/gi,
      /(demora|lento|atrasado)/gi,
      /(sobrecarreg|muito trabalho)/gi,
      /não\s+(consigo|tenho tempo)/gi,
      /(problema|dificuldade|desafio)\s+com/gi
    ];

    for (const pattern of needPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const matchedText = match[0];
        const index = match.index;

        // ⚠️ VALIDAÇÃO: Garantir que é uma dor real (contexto de 100 chars)
        const contextBefore = text.substring(Math.max(0, index - 50), index).toLowerCase();
        const contextAfter = text.substring(index, Math.min(text.length, index + matchedText.length + 50)).toLowerCase();
        const fullContext = contextBefore + matchedText + contextAfter;

        // Palavras que indicam que NÃO é uma dor real
        const falsePositiveWords = [
          'não tenho problema', 'não há problema', 'sem problema',
          'está tudo bem', 'está ok', 'funcionando bem',
          'resolvido', 'solucionado'
        ];

        const isFalsePositive = falsePositiveWords.some(word =>
          fullContext.includes(word)
        );

        if (!isFalsePositive) {
          console.log(`🎯 [BANT-NEED] Extraído: "${matchedText}" (validado - dor real)`);
          return matchedText;
        } else {
          console.log(`⚠️ [BANT-NEED] Ignorado: "${matchedText}" (falso positivo detectado)`);
        }
      }
    }

    return null;
  }

  extractTiming(text) {
    // Detectar menções de prazo
    const timingPatterns = [
      /(urgente|logo|já|rápido|quanto antes)/gi,
      /(black friday|natal|fim de ano)/gi,
      /(próxim[oa]\s+(mês|semana|trimestre))/gi,
      /(\d+\s+(dia|semana|mês|mes))/gi
    ];

    for (const pattern of timingPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const matchedText = match[0];
        const index = match.index;

        // ⚠️ VALIDAÇÃO: Verificar se timing está relacionado ao contexto de vendas
        const contextBefore = text.substring(Math.max(0, index - 60), index).toLowerCase();
        const contextAfter = text.substring(index, Math.min(text.length, index + matchedText.length + 40)).toLowerCase();
        const fullContext = contextBefore + matchedText + contextAfter;

        // Palavras que invalidam o timing (contexto não relacionado a vendas)
        const invalidContextWords = [
          'ocupado', 'sem tempo agora', 'não posso agora',
          'talvez depois', 'não sei quando', 'ainda não',
          'mais tarde', 'no futuro'
        ];

        const hasInvalidContext = invalidContextWords.some(word =>
          fullContext.includes(word)
        );

        if (!hasInvalidContext) {
          console.log(`⏰ [BANT-TIMING] Extraído: "${matchedText}" (validado - timing relevante)`);
          return matchedText;
        } else {
          console.log(`⚠️ [BANT-TIMING] Ignorado: "${matchedText}" (contexto inválido)`);
        }
      }
    }

    return null;
  }

  /**
   * 🎯 GERA CONTEXTO BANT COMPLETO PARA O PROMPT
   */
  generateBANTContext(history = [], context = {}) {
    const currentStage = this.detectCurrentStage(history, context);
    const stagePrompt = this.getStagePrompt(currentStage, context);
    const bantInfo = this.extractBANTInfo(history);

    return {
      currentStage,
      stagePrompt,
      bantInfo,
      nextStage: this.getNextStage(currentStage),
      progressPercentage: this.getProgressPercentage(currentStage)
    };
  }

  /**
   * ➡️ RETORNA PRÓXIMO ESTÁGIO
   */
  getNextStage(currentStage) {
    const currentIndex = this.stageOrder.indexOf(currentStage);
    if (currentIndex < this.stageOrder.length - 1) {
      return this.stageOrder[currentIndex + 1];
    }
    return currentStage;
  }

  /**
   * 📊 CALCULA PROGRESSO PERCENTUAL
   */
  getProgressPercentage(currentStage) {
    const currentIndex = this.stageOrder.indexOf(currentStage);
    return Math.round(((currentIndex + 1) / this.stageOrder.length) * 100);
  }
}

// Singleton
const bantFramework = new BANTFramework();
export default bantFramework;

// Funções de conveniência
export function detectBANTStage(history = [], context = {}) {
  return bantFramework.detectCurrentStage(history, context);
}

export function getBANTPrompt(stage, context = {}) {
  return bantFramework.getStagePrompt(stage, context);
}

export function getBANTContext(history = [], context = {}) {
  return bantFramework.generateBANTContext(history, context);
}

export function extractBANTInfo(history = []) {
  return bantFramework.extractBANTInfo(history);
}
