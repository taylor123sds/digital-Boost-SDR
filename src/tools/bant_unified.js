// tools/bant_unified.js
// 🎯 BANT FRAMEWORK v2.0 UNIFICADO
// Sistema único integrado: BANT + Validation + Archetypes + Personas + Modo Adaptativo

import openaiClient from '../core/openai_client.js';

/**
 * 🎯 BANT v2.0 - Sistema Unificado de Qualificação e Conversão
 *
 * Integra em um único framework:
 * - Metodologia BANT sequencial ativa
 * - Validação GPT de informações extraídas
 * - Detecção de arquétipos comportamentais
 * - Personas regionais (Natal/RN)
 * - Modo adaptativo (consultivo ↔ objetivo)
 * - Cálculo de score de qualificação
 */

// ============================================================================
// 📊 CONFIGURAÇÃO DOS ESTÁGIOS BANT
// ============================================================================

export const BANT_STAGES = {
  opening: {
    name: 'Opening',
    order: 1,
    mode: 'CONSULTIVO',
    objective: 'Criar rapport e identificar contexto inicial',
    mandatoryQuestion: 'Como está o [área de atuação] da sua empresa hoje?',
    alternativeQuestions: [
      'Me conta um pouco sobre o seu negócio?',
      'Como você está lidando com [área] atualmente?',
      'O que te trouxe a conversar comigo hoje?'
    ],
    completionCriteria: ['Contexto do negócio identificado', 'Área de atuação clara', 'Tom de conversa estabelecido']
  },

  need: {
    name: 'Need',
    order: 2,
    mode: 'CONSULTIVO',
    objective: 'Identificar dores, problemas e necessidades específicas',
    mandatoryQuestion: 'Qual o MAIOR desafio que você enfrenta com [contexto identificado]?',
    alternativeQuestions: [
      'O que te incomoda mais no processo atual de [área]?',
      'Se você pudesse resolver um problema hoje, qual seria?',
      'Qual situação te faz perder mais tempo/dinheiro?'
    ],
    completionCriteria: ['Dor principal identificada', 'Impacto da dor quantificado', 'Urgência da dor avaliada']
  },

  budget: {
    name: 'Budget',
    order: 3,
    mode: 'OBJETIVO',
    objective: 'Qualificar capacidade de investimento',
    mandatoryQuestion: 'Quanto vocês investem hoje em [área relacionada à dor]?',
    alternativeQuestions: [
      'Vocês já investem em alguma solução para [dor]? Quanto mais ou menos?',
      'Qual o orçamento mensal destinado para [categoria]?',
      'Se a solução resolver [dor], quanto valeria em economia/ganho por mês?'
    ],
    completionCriteria: ['Budget atual identificado', 'Disponibilidade confirmada', 'ROI potencial calculado']
  },

  authority: {
    name: 'Authority',
    order: 4,
    mode: 'OBJETIVO',
    objective: 'Identificar decisor e processo de compra',
    mandatoryQuestion: 'Você é a pessoa que decide sobre investimentos em [área]?',
    alternativeQuestions: [
      'Além de você, quem mais participa dessa decisão?',
      'Qual o processo de aprovação para novos fornecedores?',
      'Você pode tomar essa decisão sozinho ou precisa consultar alguém?'
    ],
    completionCriteria: ['Decisor identificado', 'Influenciadores mapeados', 'Processo de aprovação claro']
  },

  timing: {
    name: 'Timing',
    order: 5,
    mode: 'OBJETIVO',
    objective: 'Definir urgência e timeline de implementação',
    mandatoryQuestion: 'Quando você precisa ter isso resolvido?',
    alternativeQuestions: [
      'Qual o prazo ideal para implementar a solução?',
      'Tem algum evento/data específica que precisa estar funcionando?',
      'O quanto é urgente resolver [dor] na sua operação?'
    ],
    completionCriteria: ['Timeline definido', 'Urgência classificada', 'Gatilhos de urgência identificados']
  },

  closing: {
    name: 'Closing',
    order: 6,
    mode: 'OBJETIVO',
    objective: 'Propor próximos passos e agendar reunião',
    mandatoryQuestion: 'Que tal agendarmos 30min para eu te mostrar exatamente como podemos resolver [dor]?',
    alternativeQuestions: [
      'Consigo encaixar você amanhã ou sexta para apresentação. Qual melhor?',
      'Vou preparar uma proposta personalizada. Podemos conversar terça 14h?',
      'Próximo passo: reunião de 30min. Semana que vem funciona?'
    ],
    completionCriteria: ['Reunião agendada', 'Expectativas alinhadas', 'Follow-up definido']
  }
};

// ============================================================================
// 🎭 ARQUÉTIPOS COMPORTAMENTAIS (Simplificados e integrados ao BANT)
// ============================================================================

export const ARCHETYPES = {
  PRAGMATICO: {
    name: 'Pragmático',
    keywords: ['resultado', 'funciona', 'prático', 'rápido', 'direto', 'eficiente', 'objetivo'],
    approach: {
      opening: 'Ser direto e objetivo desde o início',
      need: 'Focar em dores concretas e mensuráveis',
      budget: 'Falar em ROI e payback imediato',
      authority: 'Perguntar diretamente sobre decisão',
      timing: 'Propor implementação rápida',
      closing: 'Call-to-action claro e sem rodeios'
    },
    tone: 'Direto, focado em resultados, sem floreios'
  },

  ANALITICO: {
    name: 'Analítico',
    keywords: ['dados', 'estatística', 'análise', 'estudo', 'evidência', 'métrica', 'número', 'comprovado'],
    approach: {
      opening: 'Apresentar credenciais e expertise',
      need: 'Quantificar dores com métricas',
      budget: 'Apresentar análise de custo-benefício detalhada',
      authority: 'Mapear todo o processo decisório',
      timing: 'Justificar urgência com dados',
      closing: 'Propor teste/piloto com métricas claras'
    },
    tone: 'Professorial, baseado em dados, técnico mas didático'
  },

  VISIONARIO: {
    name: 'Visionário',
    keywords: ['transformar', 'inovar', 'futuro', 'possibilidades', 'visão', 'evolução', 'mudança'],
    approach: {
      opening: 'Falar de transformação e futuro',
      need: 'Explorar visão e sonhos do negócio',
      budget: 'Posicionar como investimento em futuro',
      authority: 'Identificar outros visionários na empresa',
      timing: 'Criar senso de oportunidade única',
      closing: 'Convidar para jornada de transformação'
    },
    tone: 'Inspirador, visionário, focado em possibilidades'
  },

  RELACIONAL: {
    name: 'Relacional',
    keywords: ['equipe', 'pessoas', 'relacionamento', 'confiança', 'parceria', 'juntos', 'colaborar'],
    approach: {
      opening: 'Construir rapport genuíno',
      need: 'Entender impacto em pessoas/equipe',
      budget: 'Falar em parceria e suporte contínuo',
      authority: 'Envolver a equipe no processo',
      timing: 'Respeitar o ritmo do cliente',
      closing: 'Propor parceria de longo prazo'
    },
    tone: 'Empático, colaborativo, focado em relacionamento'
  },

  CONSERVADOR: {
    name: 'Conservador',
    keywords: ['seguro', 'risco', 'garantia', 'estável', 'confiável', 'tradicional', 'comprovado'],
    approach: {
      opening: 'Demonstrar estabilidade e credibilidade',
      need: 'Focar em riscos da situação atual',
      budget: 'Apresentar garantias e segurança',
      authority: 'Respeitar hierarquia e processo formal',
      timing: 'Não pressionar, oferecer garantias',
      closing: 'Propor passos incrementais e seguros'
    },
    tone: 'Confiável, seguro, respeitoso, sem pressão'
  }
};

// ============================================================================
// 🌴 PERSONAS REGIONAIS DE NATAL/RN (Integradas ao BANT)
// ============================================================================

export const NATAL_PERSONAS = {
  RESTAURANTE_DELIVERY: {
    name: 'Restaurante/Delivery',
    signals: ['restaurante', 'lanchonete', 'delivery', 'pedido', 'ifood', 'cardápio'],
    commonPains: ['volume de pedidos WhatsApp', 'demora resposta', 'pico de atendimento', 'confusão pedidos'],
    budgetRange: 'R$ 200-800/mês',
    typicalAuthority: 'Dono/Sócio',
    averageUrgency: 'Alta (perda de vendas diária)',
    bantAdaptation: {
      need: 'Quantificar pedidos perdidos por demora',
      budget: 'Comparar com custo de atendente',
      authority: 'Geralmente decisor único',
      timing: 'Urgência alta - perda diária de receita'
    }
  },

  LOJA_VAREJO: {
    name: 'Loja de Varejo',
    signals: ['loja', 'varejo', 'vendas', 'instagram', 'clientes', 'produtos'],
    commonPains: ['atendimento fora horário', 'perguntas repetitivas', 'follow-up', 'conversão baixa'],
    budgetRange: 'R$ 150-600/mês',
    typicalAuthority: 'Dono/Gerente',
    averageUrgency: 'Média',
    bantAdaptation: {
      need: 'Focar em vendas perdidas após horário',
      budget: 'Comparar com comissão de vendedor',
      authority: 'Dono decide sozinho geralmente',
      timing: 'Urgência média - depende de sazonalidade'
    }
  },

  SERVICO_LOCAL: {
    name: 'Serviços Locais',
    signals: ['serviço', 'atendimento', 'agendamento', 'cliente', 'consulta', 'horário'],
    commonPains: ['agendamento manual', 'confirmações', 'no-show', 'WhatsApp desorganizado'],
    budgetRange: 'R$ 150-500/mês',
    typicalAuthority: 'Dono/Gestor',
    averageUrgency: 'Média-Alta',
    bantAdaptation: {
      need: 'Quantificar tempo gasto em agendamentos',
      budget: 'Calcular custo de tempo do profissional',
      authority: 'Decisor único ou dupla',
      timing: 'Urgência quando perde clientes por desorganização'
    }
  },

  ECOMMERCE_PME: {
    name: 'E-commerce PME',
    signals: ['ecommerce', 'loja online', 'site', 'vendas online', 'marketplace'],
    commonPains: ['suporte pós-venda', 'dúvidas pré-venda', 'carrinho abandonado', 'atendimento 24/7'],
    budgetRange: 'R$ 300-1200/mês',
    typicalAuthority: 'Dono/CMO',
    averageUrgency: 'Média',
    bantAdaptation: {
      need: 'Focar em taxa de abandono e conversão',
      budget: 'Comparar com custo de SAC terceirizado',
      authority: 'Pode ter comitê de decisão',
      timing: 'Timing depende de campanhas e sazonalidade'
    }
  }
};

// ============================================================================
// 🧠 CLASSE PRINCIPAL - BANT UNIFIED SYSTEM
// ============================================================================

export class BANTUnifiedSystem {
  constructor() {
    this.currentStage = 'opening';
    this.collectedInfo = {
      budget: null,
      authority: null,
      need: null,
      timing: null,
      context: null // 🆕 Contexto extraído da conversa (área de atuação, empresa, etc)
    };
    this.detectedArchetype = null;
    this.detectedPersona = null;
    this.validationResults = {};
    this.conversationHistory = [];
  }

  /**
   * 🎯 Método principal: Processa mensagem e retorna próxima ação
   */
  async processMessage(userMessage, conversationHistory = []) {
    this.conversationHistory = conversationHistory;

    // 1. Detectar arquétipo (primeira vez ou atualizar)
    if (!this.detectedArchetype || conversationHistory.length % 3 === 0) {
      this.detectedArchetype = this.detectArchetype(userMessage + ' ' + conversationHistory.slice(-3).join(' '));
    }

    // 2. Detectar persona regional
    if (!this.detectedPersona) {
      this.detectedPersona = this.detectNatalPersona(conversationHistory.join(' '));
    }

    // 3. Extrair informações BANT da mensagem atual
    const extracted = this.extractBANTInfo(userMessage);

    // 4. Validar informações extraídas com GPT
    if (extracted.budget || extracted.authority || extracted.need || extracted.timing) {
      const validation = await this.validateExtractedInfo(extracted, userMessage);

      // Só salvar se validação confirmar
      if (validation.budget?.valid) this.collectedInfo.budget = extracted.budget;
      if (validation.authority?.valid) this.collectedInfo.authority = extracted.authority;
      if (validation.need?.valid) this.collectedInfo.need = extracted.need;
      if (validation.timing?.valid) this.collectedInfo.timing = extracted.timing;

      this.validationResults = validation;
    }

    // 5. Determinar estágio atual baseado em completude
    this.currentStage = this.determineCurrentStage();

    // 6. Gerar próxima pergunta adaptada ao arquétipo + persona
    const nextQuestion = this.generateNextQuestion();

    // 7. Calcular score de qualificação
    const qualificationScore = this.calculateQualificationScore();

    // 8. Determinar modo (consultivo vs objetivo)
    const mode = this.determineMode();

    return {
      stage: this.currentStage,
      stageInfo: BANT_STAGES[this.currentStage],
      nextQuestion,
      collectedInfo: this.collectedInfo,
      archetype: this.detectedArchetype,
      persona: this.detectedPersona,
      qualificationScore,
      mode,
      validationResults: this.validationResults,
      isComplete: qualificationScore >= 80
    };
  }

  /**
   * 🎭 Detecta arquétipo baseado em palavras-chave
   */
  detectArchetype(text) {
    const textLower = text.toLowerCase();
    const scores = {};

    for (const [key, archetype] of Object.entries(ARCHETYPES)) {
      let score = 0;
      for (const keyword of archetype.keywords) {
        if (textLower.includes(keyword)) score++;
      }
      scores[key] = score;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'PRAGMATICO'; // Default

    const detected = Object.keys(scores).find(key => scores[key] === maxScore);
    console.log(`🎭 [ARCHETYPE] Detectado: ${ARCHETYPES[detected].name} (score: ${maxScore})`);
    return detected;
  }

  /**
   * 🌴 Detecta persona regional de Natal
   */
  detectNatalPersona(text) {
    const textLower = text.toLowerCase();
    const scores = {};

    for (const [key, persona] of Object.entries(NATAL_PERSONAS)) {
      let score = 0;
      for (const signal of persona.signals) {
        if (textLower.includes(signal)) score++;
      }
      scores[key] = score;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return null;

    const detected = Object.keys(scores).find(key => scores[key] === maxScore);
    console.log(`🌴 [PERSONA] Detectado: ${NATAL_PERSONAS[detected].name} (score: ${maxScore})`);
    return detected;
  }

  /**
   * 🔍 Extrai informações BANT da mensagem
   */
  extractBANTInfo(text) {
    return {
      budget: this.extractBudget(text),
      authority: this.extractAuthority(text),
      need: this.extractNeed(text),
      timing: this.extractTiming(text)
    };
  }

  extractBudget(text) {
    const budgetPatterns = [
      /r\$\s*\d+[.,]?\d*/gi,
      /\d+\s*mil/gi,
      /\d+\s*reais/gi,
      /gast(o|amos)\s+.*?(\d+)/gi,
      /(orçamento|budget|investimento).*?(\d+)/gi
    ];

    for (const pattern of budgetPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const matchedText = match[0];
        const index = match.index;

        // Verificar negação
        const contextBefore = text.substring(Math.max(0, index - 50), index).toLowerCase();
        const negativeWords = ['não', 'nao', 'sem', 'nunca', 'muito caro', 'não tenho'];

        if (!negativeWords.some(word => contextBefore.includes(word))) {
          return matchedText;
        }
      }
    }
    return null;
  }

  extractAuthority(text) {
    const authorityPatterns = [
      /(sou|sócio|dono|proprietário|ceo|diretor|gerente|responsável)/gi,
      /(decido|decisão|posso decidir)/gi
    ];

    for (const pattern of authorityPatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  extractNeed(text) {
    const painKeywords = [
      'problema', 'dificuldade', 'desafio', 'demora', 'perco',
      'não consigo', 'difícil', 'complicado', 'gasto tempo'
    ];

    for (const keyword of painKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        // Extrair contexto ao redor
        const index = text.toLowerCase().indexOf(keyword);
        return text.substring(Math.max(0, index - 20), Math.min(text.length, index + 60));
      }
    }
    return null;
  }

  extractTiming(text) {
    const timingPatterns = [
      /(urgente|agora|hoje|imediato|já|rápido|logo)/gi,
      /(semana|mês|prazo|quando)/gi
    ];

    for (const pattern of timingPatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  /**
   * ✅ Valida informações extraídas usando GPT
   */
  async validateExtractedInfo(extracted, userMessage) {
    const results = {};

    // Validar Budget
    if (extracted.budget) {
      results.budget = await this.validateWithGPT(
        'budget',
        extracted.budget,
        userMessage,
        `O cliente está dizendo que TEM esse orçamento disponível?
A) TEM orçamento
B) NÃO TEM / muito caro
C) Não está claro
Responda APENAS: A, B ou C`
      );
    }

    // Validar Authority
    if (extracted.authority) {
      results.authority = await this.validateWithGPT(
        'authority',
        extracted.authority,
        userMessage,
        `A pessoa É decisor/responsável pela compra?
A) É DECISOR
B) NÃO é decisor
C) Não está claro
Responda APENAS: A, B ou C`
      );
    }

    // Validar Need
    if (extracted.need) {
      results.need = await this.validateWithGPT(
        'need',
        extracted.need,
        userMessage,
        `A dor/problema identificado é RELEVANTE para vendas?
A) RELEVANTE
B) SUPERFICIAL/genérico
C) Não está claro
Responda APENAS: A, B ou C`
      );
    }

    // Validar Timing
    if (extracted.timing) {
      results.timing = await this.validateWithGPT(
        'timing',
        extracted.timing,
        userMessage,
        `Há urgência real?
A) URGENTE (agora/curto prazo)
B) MÉDIO PRAZO
C) SEM URGÊNCIA
Responda APENAS: A, B ou C`
      );
    }

    return results;
  }

  async validateWithGPT(field, extractedValue, userMessage, prompt) {
    try {
      const fullPrompt = `Valor extraído: "${extractedValue}"
Mensagem: "${userMessage}"

${prompt}`;

      const response = await openaiClient.createChatCompletion([
        { role: 'user', content: fullPrompt }
      ], {
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        max_tokens: 10,
        temperature: 0
      });

      const result = response.choices[0].message.content.trim().toUpperCase();

      return {
        valid: result === 'A',
        needsConfirmation: result === 'C',
        probablyWrong: result === 'B',
        confidence: result === 'A' ? 0.9 : (result === 'C' ? 0.5 : 0.1),
        extractedValue
      };

    } catch (error) {
      console.error(`❌ [VALIDATION] Erro ao validar ${field}:`, error);
      return { valid: false, confidence: 0, needsConfirmation: true };
    }
  }

  /**
   * 🎯 Determina estágio atual baseado em informações coletadas
   */
  determineCurrentStage() {
    // Sequência obrigatória: opening → need → budget → authority → timing → closing

    // Primeiras 2 mensagens = fase opening (rapport inicial)
    if (this.conversationHistory.length < 2) return 'opening';

    // Depois do opening, seguir sequência BANT
    if (!this.collectedInfo.need) return 'need';
    if (!this.collectedInfo.budget) return 'budget';
    if (!this.collectedInfo.authority) return 'authority';
    if (!this.collectedInfo.timing) return 'timing';
    return 'closing';
  }

  /**
   * 🔄 Substitui placeholders nas perguntas BANT com contexto real
   */
  replacePlaceholders(question) {
    let processedQuestion = question;

    // Substituir [dor] com a necessidade coletada
    if (this.collectedInfo.need) {
      processedQuestion = processedQuestion.replace(/\[dor\]/gi, this.collectedInfo.need);
    }

    // Substituir [área de atuação] e [área] com contexto extraído
    if (this.collectedInfo.context) {
      processedQuestion = processedQuestion.replace(/\[área de atuação\]/gi, this.collectedInfo.context);
      processedQuestion = processedQuestion.replace(/\[área\]/gi, this.collectedInfo.context);
    } else {
      // Tentar extrair do histórico se ainda não tiver contexto
      const contextFromHistory = this.extractAreaFromHistory();
      if (contextFromHistory) {
        processedQuestion = processedQuestion.replace(/\[área de atuação\]/gi, contextFromHistory);
        processedQuestion = processedQuestion.replace(/\[área\]/gi, contextFromHistory);
        // Salvar para uso futuro
        this.collectedInfo.context = contextFromHistory;
      }
    }

    // Substituir [contexto identificado]
    if (this.collectedInfo.context) {
      processedQuestion = processedQuestion.replace(/\[contexto identificado\]/gi, this.collectedInfo.context);
    }

    // Substituir [área relacionada à dor]
    if (this.collectedInfo.need) {
      const relatedArea = this.inferAreaFromNeed(this.collectedInfo.need);
      processedQuestion = processedQuestion.replace(/\[área relacionada à dor\]/gi, relatedArea);
    }

    return processedQuestion;
  }

  /**
   * 🔍 Extrai área de atuação do histórico de conversa
   */
  extractAreaFromHistory() {
    if (!this.conversationHistory || this.conversationHistory.length === 0) {
      return null;
    }

    // Procurar por menções de áreas/setores no histórico
    const areaKeywords = {
      'atendimento': 'atendimento ao cliente',
      'restaurante': 'restaurantes',
      'loja': 'varejo',
      'venda': 'vendas',
      'marketing': 'marketing',
      'gestão': 'gestão',
      'financeiro': 'financeiro',
      'rh': 'recursos humanos',
      'logística': 'logística',
      'produção': 'produção'
    };

    for (const message of this.conversationHistory) {
      const lowerMessage = message.toLowerCase();
      for (const [keyword, area] of Object.entries(areaKeywords)) {
        if (lowerMessage.includes(keyword)) {
          console.log(`🔍 [CONTEXT] Extraído contexto do histórico: "${area}"`);
          return area;
        }
      }
    }

    return null;
  }

  /**
   * 🧠 Infere área relacionada baseada na dor/necessidade
   */
  inferAreaFromNeed(need) {
    if (!need) return 'essa área';

    const needLower = need.toLowerCase();

    // Mapear dores para áreas relacionadas
    if (needLower.includes('atend') || needLower.includes('cliente') || needLower.includes('suporte')) {
      return 'atendimento e relacionamento com clientes';
    }
    if (needLower.includes('venda') || needLower.includes('convert') || needLower.includes('prospect')) {
      return 'vendas e geração de leads';
    }
    if (needLower.includes('marketing') || needLower.includes('divulg') || needLower.includes('campanha')) {
      return 'marketing e aquisição';
    }
    if (needLower.includes('gestão') || needLower.includes('organiz') || needLower.includes('process')) {
      return 'gestão e processos internos';
    }
    if (needLower.includes('tempo') || needLower.includes('automaç') || needLower.includes('manual')) {
      return 'automação e otimização';
    }

    // Fallback genérico
    return 'essa área';
  }

  /**
   * 💬 Gera próxima pergunta adaptada ao arquétipo + persona
   */
  generateNextQuestion() {
    const stage = BANT_STAGES[this.currentStage];
    const archetype = ARCHETYPES[this.detectedArchetype || 'PRAGMATICO'];
    const persona = this.detectedPersona ? NATAL_PERSONAS[this.detectedPersona] : null;

    // Pegar abordagem do arquétipo para o estágio atual
    const archetypeGuidance = archetype.approach[this.currentStage];

    // Pergunta base COM substituição de placeholders
    let question = this.replacePlaceholders(stage.mandatoryQuestion);

    // Adicionar contexto de persona se detectada
    if (persona && persona.bantAdaptation[this.currentStage]) {
      question += `\n💡 Contexto: ${persona.bantAdaptation[this.currentStage]}`;
    }

    console.log(`💬 [QUESTION] Estágio: ${this.currentStage} | Arquétipo: ${archetype.name}`);
    console.log(`📋 [GUIDANCE] ${archetypeGuidance}`);
    console.log(`🔄 [PLACEHOLDER] Pergunta processada: "${question.substring(0, 80)}..."`);

    return {
      question,
      guidance: archetypeGuidance,
      tone: archetype.tone,
      alternatives: stage.alternativeQuestions
    };
  }

  /**
   * 📊 Calcula score de qualificação (0-100)
   */
  calculateQualificationScore() {
    let score = 0;

    if (this.collectedInfo.budget) score += 25;
    if (this.collectedInfo.authority) score += 25;
    if (this.collectedInfo.need) score += 30;
    if (this.collectedInfo.timing) score += 20;

    return score;
  }

  /**
   * 🎚️ Determina modo (CONSULTIVO vs OBJETIVO)
   */
  determineMode() {
    const stage = BANT_STAGES[this.currentStage];
    return stage.mode;
  }

  /**
   * 📋 Retorna resumo completo do estado atual
   */
  getFullContext() {
    return {
      stage: this.currentStage,
      collectedInfo: this.collectedInfo,
      archetype: this.detectedArchetype,
      persona: this.detectedPersona,
      score: this.calculateQualificationScore(),
      mode: this.determineMode(),
      validations: this.validationResults
    };
  }
}

export default BANTUnifiedSystem;
