/**
 * 🎯 SALES FLOW CONTROLLER - Sistema Rígido de Fluxo de Vendas
 * Força o agente a seguir etapas estruturadas e não permite "conversas livres"
 */

import { setMemory, getMemory } from '../memory.js';

/**
 * 📋 ETAPAS OBRIGATÓRIAS DO FLUXO DE VENDAS
 */
export const SALES_STAGES = {
  // Estágio 1: Primeiro Contato
  FIRST_CONTACT: {
    code: 'FIRST_CONTACT',
    name: '🚪 Primeiro Contato',
    description: 'Apresentação inicial + identificar se é decisor',
    objectives: ['Apresentar-se', 'Identificar função da pessoa', 'Verificar se é decisor'],
    mandatory_questions: [
      'Qual sua função na empresa?',
      'Você é responsável pelas decisões de marketing/vendas?'
    ],
    next_stage_trigger: 'É decisor confirmado',
    max_messages: 3
  },

  // Estágio 2: Descoberta de Dor
  PAIN_DISCOVERY: {
    code: 'PAIN_DISCOVERY',
    name: '🔍 Descoberta de Dor',
    description: 'Identificar problemas específicos do negócio',
    objectives: ['Encontrar dores reais', 'Quantificar impacto', 'Criar urgência'],
    mandatory_questions: [
      'Qual o maior desafio no seu negócio hoje?',
      'Como isso está impactando seus resultados?',
      'Há quanto tempo vocês enfrentam isso?'
    ],
    next_stage_trigger: 'Dor identificada e quantificada',
    max_messages: 4
  },

  // Estágio 3: Qualificação BANT
  BANT_QUALIFICATION: {
    code: 'BANT_QUALIFICATION',
    name: '💰 Qualificação BANT',
    description: 'Budget, Authority, Need, Timing',
    objectives: ['Confirmar orçamento', 'Validar autoridade', 'Confirmar necessidade', 'Definir timing'],
    mandatory_questions: [
      'Vocês têm orçamento para investir em soluções de marketing?',
      'Qual seria o investimento ideal para resolver isso?',
      'Quando vocês gostariam de implementar uma solução?'
    ],
    next_stage_trigger: 'BANT qualificado positivamente',
    max_messages: 5
  },

  // Estágio 4: Apresentação de Valor
  VALUE_PRESENTATION: {
    code: 'VALUE_PRESENTATION',
    name: '💎 Apresentação de Valor',
    description: 'Mostrar solução específica para as dores identificadas',
    objectives: ['Conectar solução à dor', 'Mostrar ROI', 'Criar desejo'],
    mandatory_elements: ['Mencionar cases específicos', 'Calcular ROI', 'Mostrar resultados'],
    next_stage_trigger: 'Interesse confirmado na solução',
    max_messages: 3
  },

  // Estágio 5: Agendamento
  MEETING_SCHEDULING: {
    code: 'MEETING_SCHEDULING',
    name: '📅 Agendamento',
    description: 'Agendar reunião estratégica com Taylor Lapenda',
    objectives: ['Propor reunião', 'Coletar disponibilidade', 'Confirmar agendamento'],
    mandatory_actions: ['Usar ferramenta de agendamento', 'Coletar email', 'Enviar confirmação'],
    next_stage_trigger: 'Reunião agendada com sucesso',
    max_messages: 3
  },

  // Estágio Final
  SCHEDULED: {
    code: 'SCHEDULED',
    name: '✅ Agendado',
    description: 'Lead qualificado e reunião agendada',
    objectives: ['Manter relacionamento até reunião'],
    actions: ['Nurturing até reunião']
  }
};

/**
 * 🎯 CONTROLADOR PRINCIPAL DO FLUXO
 */
export class SalesFlowController {
  constructor(contactNumber) {
    this.contactNumber = contactNumber;
    this.memoryKey = `sales_flow_${contactNumber}`;
  }

  /**
   * 📊 Obter estado atual do fluxo
   */
  async getCurrentStage() {
    try {
      const flowData = await getMemory(this.memoryKey);
      return flowData ? JSON.parse(flowData) : this.createInitialFlow();
    } catch (error) {
      console.log('⚠️ Erro ao obter estágio:', error);
      return this.createInitialFlow();
    }
  }

  /**
   * 🆕 Criar fluxo inicial
   */
  createInitialFlow() {
    return {
      currentStage: 'FIRST_CONTACT',
      startTime: Date.now(),
      stageStartTime: Date.now(),
      messagesInStage: 0,
      completedObjectives: [],
      discoveredPains: [],
      bantData: {},
      stageHistory: [],
      isBlocked: false,
      blockReason: null
    };
  }

  /**
   * 🚀 Processar mensagem no fluxo
   */
  async processMessage(userMessage, conversationHistory = []) {
    const flowState = await this.getCurrentStage();
    const currentStage = SALES_STAGES[flowState.currentStage];

    console.log(`🎯 [FLOW CONTROLLER] Estágio: ${currentStage.name} (${flowState.messagesInStage}/${currentStage.max_messages || '∞'})`);

    // Verificar se estágio está bloqueado
    if (flowState.isBlocked) {
      return this.handleBlockedFlow(flowState);
    }

    // Incrementar contador de mensagens
    flowState.messagesInStage++;

    // Analisar se objetivos foram cumpridos
    const stageAnalysis = await this.analyzeStageCompletion(userMessage, flowState, conversationHistory);

    // Determinar ação baseada na análise
    let response;
    let nextAction;

    if (stageAnalysis.objectivesCompleted) {
      // Avançar para próximo estágio
      response = await this.advanceToNextStage(flowState, stageAnalysis);
      nextAction = 'ADVANCE_STAGE';
    } else if (flowState.messagesInStage >= (currentStage.max_messages || 999)) {
      // Estágio esgotou mensagens sem completar objetivos
      response = await this.handleStageTimeout(flowState);
      nextAction = 'STAGE_TIMEOUT';
    } else {
      // Continuar no estágio atual
      response = await this.continueCurrentStage(flowState, stageAnalysis);
      nextAction = 'CONTINUE_STAGE';
    }

    // Salvar estado atualizado
    await this.saveFlowState(flowState);

    return {
      response,
      flowState,
      currentStage: currentStage.code,
      nextAction,
      analysis: stageAnalysis,
      forceStructuredResponse: true // ⚡ FORÇA USO DE RESPOSTA ESTRUTURADA
    };
  }

  /**
   * 🧠 Analisar se objetivos do estágio foram cumpridos
   */
  async analyzeStageCompletion(userMessage, flowState, conversationHistory) {
    const currentStage = SALES_STAGES[flowState.currentStage];

    // Análise específica por estágio
    switch (flowState.currentStage) {
      case 'FIRST_CONTACT':
        return this.analyzeFirstContact(userMessage, flowState);

      case 'PAIN_DISCOVERY':
        return this.analyzePainDiscovery(userMessage, flowState);

      case 'BANT_QUALIFICATION':
        return this.analyzeBantQualification(userMessage, flowState);

      case 'VALUE_PRESENTATION':
        return this.analyzeValuePresentation(userMessage, flowState);

      case 'MEETING_SCHEDULING':
        return this.analyzeMeetingScheduling(userMessage, flowState);

      default:
        return { objectivesCompleted: false, nextQuestions: [] };
    }
  }

  /**
   * 🚪 Analisar primeiro contato
   */
  analyzeFirstContact(userMessage, flowState) {
    const message = userMessage.toLowerCase();

    // Detectar função/cargo
    const cargoWords = ['dono', 'proprietário', 'gerente', 'diretor', 'sócio', 'ceo', 'administrador'];
    const isDecisor = cargoWords.some(word => message.includes(word));

    const receptionistaWords = ['recepção', 'atendimento', 'secretaria', 'assistente'];
    const isReceptionista = receptionistaWords.some(word => message.includes(word));

    if (isDecisor) {
      flowState.bantData.authority = true;
      return {
        objectivesCompleted: true,
        findings: { isDecisor: true, role: 'decisor' },
        nextStage: 'PAIN_DISCOVERY'
      };
    }

    if (isReceptionista) {
      return {
        objectivesCompleted: false,
        findings: { isDecisor: false, role: 'recepcionista' },
        needsRedirection: true,
        nextQuestions: ['Poderia me passar para o responsável pelas decisões de marketing da empresa?']
      };
    }

    return {
      objectivesCompleted: false,
      nextQuestions: ['Qual sua função na empresa? Você é responsável pelas decisões de marketing/vendas?']
    };
  }

  /**
   * 🔍 Analisar descoberta de dor
   */
  analyzePainDiscovery(userMessage, flowState) {
    const message = userMessage.toLowerCase();

    // Detectar menções de problemas/dores
    const painKeywords = [
      'problema', 'dificuldade', 'desafio', 'dor', 'prejuízo', 'perda',
      'vendas baixas', 'sem clientes', 'concorrência', 'marketing não funciona',
      'redes sociais', 'site', 'visibilidade', 'divulgação'
    ];

    const hasPainMention = painKeywords.some(keyword => message.includes(keyword));

    if (hasPainMention) {
      // Extrair e salvar dor identificada
      flowState.discoveredPains.push({
        pain: userMessage,
        timestamp: Date.now(),
        category: this.categorizePain(userMessage)
      });

      return {
        objectivesCompleted: flowState.discoveredPains.length >= 1,
        findings: { painIdentified: true, painCount: flowState.discoveredPains.length },
        nextStage: 'BANT_QUALIFICATION',
        nextQuestions: ['Como isso está impactando financeiramente seu negócio?']
      };
    }

    return {
      objectivesCompleted: false,
      nextQuestions: [
        'Qual o maior desafio que vocês enfrentam para atrair novos clientes?',
        'O que mais incomoda você no marketing atual da empresa?'
      ]
    };
  }

  /**
   * 💰 Analisar qualificação BANT
   */
  analyzeBantQualification(userMessage, flowState) {
    const message = userMessage.toLowerCase();

    // Detectar menções de orçamento
    const budgetKeywords = ['orçamento', 'investir', 'gastar', 'valor', 'preço', 'custo', 'mil', 'reais'];
    const hasBudgetMention = budgetKeywords.some(keyword => message.includes(keyword));

    if (hasBudgetMention) {
      flowState.bantData.budget = true;
      flowState.bantData.budgetDetails = userMessage;
    }

    // Detectar timing
    const timingKeywords = ['urgente', 'rápido', 'logo', 'semana', 'mês', 'quando', 'prazo'];
    const hasTimingMention = timingKeywords.some(keyword => message.includes(keyword));

    if (hasTimingMention) {
      flowState.bantData.timing = true;
      flowState.bantData.timingDetails = userMessage;
    }

    // Need já foi identificado no estágio anterior
    flowState.bantData.need = flowState.discoveredPains.length > 0;

    // Verificar se BANT está completo
    const bantComplete = flowState.bantData.budget &&
                        flowState.bantData.authority &&
                        flowState.bantData.need &&
                        flowState.bantData.timing;

    if (bantComplete) {
      return {
        objectivesCompleted: true,
        findings: { bantComplete: true, bantData: flowState.bantData },
        nextStage: 'VALUE_PRESENTATION'
      };
    }

    // Próximas perguntas baseadas no que falta
    const nextQuestions = [];
    if (!flowState.bantData.budget) {
      nextQuestions.push('Vocês têm orçamento separado para investir em marketing digital?');
    }
    if (!flowState.bantData.timing) {
      nextQuestions.push('Quando vocês gostariam de implementar uma solução?');
    }

    return {
      objectivesCompleted: false,
      nextQuestions
    };
  }

  /**
   * 💎 Analisar apresentação de valor
   */
  analyzeValuePresentation(userMessage, flowState) {
    const message = userMessage.toLowerCase();

    // Detectar interesse na solução
    const interestKeywords = [
      'interessante', 'gostei', 'parece bom', 'faz sentido', 'como funciona',
      'quero saber mais', 'me interessou', 'vamos conversar'
    ];

    const hasInterest = interestKeywords.some(keyword => message.includes(keyword));

    if (hasInterest) {
      return {
        objectivesCompleted: true,
        findings: { interestConfirmed: true },
        nextStage: 'MEETING_SCHEDULING'
      };
    }

    return {
      objectivesCompleted: false,
      nextQuestions: [
        'Baseado no que conversamos, vejo uma oportunidade real de ajudar vocês. Que tal uma Consultoria Estratégica Gratuita de 30min para detalharmos uma estratégia específica para seu negócio?'
      ]
    };
  }

  /**
   * 📅 Analisar agendamento
   */
  analyzeMeetingScheduling(userMessage, flowState) {
    const message = userMessage.toLowerCase();

    // Detectar aceitação do agendamento
    const acceptanceKeywords = [
      'sim', 'vamos', 'quero', 'aceito', 'pode ser', 'combinado',
      'agenda', 'agendar', 'marcar', 'reunião'
    ];

    const hasAcceptance = acceptanceKeywords.some(keyword => message.includes(keyword));

    if (hasAcceptance) {
      return {
        objectivesCompleted: true,
        findings: { meetingAccepted: true },
        nextStage: 'SCHEDULED',
        requiresAction: 'USE_SCHEDULING_TOOL'
      };
    }

    return {
      objectivesCompleted: false,
      nextQuestions: [
        'Quando seria melhor para você? Temos disponibilidade manhã ou tarde, qual prefere?'
      ]
    };
  }

  /**
   * 🎯 Avançar para próximo estágio
   */
  async advanceToNextStage(flowState, analysis) {
    const currentStage = SALES_STAGES[flowState.currentStage];
    const nextStageCode = analysis.nextStage;

    // Salvar estágio no histórico
    flowState.stageHistory.push({
      stage: flowState.currentStage,
      completedAt: Date.now(),
      messagesUsed: flowState.messagesInStage,
      findings: analysis.findings
    });

    // Avançar para próximo estágio
    flowState.currentStage = nextStageCode;
    flowState.messagesInStage = 0;
    flowState.stageStartTime = Date.now();

    const nextStage = SALES_STAGES[nextStageCode];

    console.log(`🚀 [FLOW] Avançando: ${currentStage.name} → ${nextStage.name}`);

    return this.generateStageAdvancementMessage(currentStage, nextStage, analysis);
  }

  /**
   * 📝 Gerar mensagem de avanço de estágio
   */
  generateStageAdvancementMessage(currentStage, nextStage, analysis) {
    switch (nextStage.code) {
      case 'PAIN_DISCOVERY':
        return `Legal! Qual é o maior desafio hoje no seu negócio?`;

      case 'BANT_QUALIFICATION':
        return `Entendi! Isso é bem comum mesmo. Vocês já investem em marketing digital atualmente?`;

      case 'VALUE_PRESENTATION':
        return `Interessante! Já vi casos similares que resolveram isso bem. Quer saber como?`;

      case 'MEETING_SCHEDULING':
        return `Que tal conversarmos melhor sobre isso? Você tem uns 30min livres essa semana?`;

      case 'SCHEDULED':
        return `Perfeito! Você receberá o convite por email. Até logo! 😊`;

      default:
        return 'E aí, me conta mais sobre isso!';
    }
  }

  /**
   * 🔄 Continuar no estágio atual
   */
  async continueCurrentStage(flowState, analysis) {
    const stage = SALES_STAGES[flowState.currentStage];

    if (analysis.nextQuestions && analysis.nextQuestions.length > 0) {
      return analysis.nextQuestions[0];
    }

    return `Entendi! ${stage.objectives[0]} - pode me contar mais sobre isso?`;
  }

  /**
   * ⏰ Lidar com timeout de estágio
   */
  async handleStageTimeout(flowState) {
    flowState.isBlocked = true;
    flowState.blockReason = 'stage_timeout';

    return 'Percebi que talvez não seja o melhor momento para conversarmos. Que tal eu retomar o contato em outra hora? Obrigado pelo seu tempo!';
  }

  /**
   * 🚫 Lidar com fluxo bloqueado
   */
  handleBlockedFlow(flowState) {
    return {
      response: 'Nosso último contato não foi finalizado. Gostaria de retomar a conversa?',
      flowState,
      isBlocked: true
    };
  }

  /**
   * 🏷️ Categorizar dor identificada
   */
  categorizePain(painText) {
    const categories = {
      'vendas': ['vendas', 'cliente', 'faturamento', 'receita'],
      'marketing': ['marketing', 'divulgação', 'visibilidade', 'marca'],
      'digital': ['site', 'redes sociais', 'online', 'internet'],
      'operacional': ['processo', 'gestão', 'organização', 'controle']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => painText.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'geral';
  }

  /**
   * 💾 Salvar estado do fluxo
   */
  async saveFlowState(flowState) {
    try {
      await setMemory(this.memoryKey, JSON.stringify(flowState));
      console.log(`💾 [FLOW] Estado salvo para ${this.contactNumber}`);
    } catch (error) {
      console.error('❌ Erro ao salvar flow state:', error);
    }
  }

  /**
   * 📊 Obter estatísticas do fluxo
   */
  async getFlowStats() {
    const flowState = await this.getCurrentStage();
    const currentStage = SALES_STAGES[flowState.currentStage];

    return {
      currentStage: currentStage.name,
      stageCode: flowState.currentStage,
      messagesInStage: flowState.messagesInStage,
      maxMessages: currentStage.max_messages,
      timeInStage: Date.now() - flowState.stageStartTime,
      totalTime: Date.now() - flowState.startTime,
      completedStages: flowState.stageHistory.length,
      isBlocked: flowState.isBlocked
    };
  }
}

/**
 * 🎯 FACTORY FUNCTION - Criar controller para um contato
 */
export function createSalesFlowController(contactNumber) {
  return new SalesFlowController(contactNumber);
}

/**
 * 📋 Obter lista de todos os estágios
 */
export function getAllSalesStages() {
  return Object.values(SALES_STAGES);
}