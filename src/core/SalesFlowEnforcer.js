// SalesFlowEnforcer.js - SISTEMA DE ENFORCEMENT DO FLUXO DE VENDAS
// Força o agente a seguir a progressão estruturada de vendas

import { getMemory, setMemory } from '../memory.js';

/**
 * SALES FLOW ENFORCER
 * Sistema que FORÇA o agente a seguir o fluxo estruturado:
 * FIRST_CONTACT → DISCOVERY → QUALIFICATION → SOLUTION_FIT → SCHEDULING
 */
export class SalesFlowEnforcer {
  constructor() {
    this.salesPhases = [
      'FIRST_CONTACT',    // Apresentação e identificação da dor
      'DISCOVERY',        // Entender processo atual e problemas
      'QUALIFICATION',    // Qualificar orçamento e autoridade
      'SOLUTION_FIT',     // Demonstrar valor e criar urgência
      'SCHEDULING',       // Agendar reunião
      'OBJECTION_HANDLING', // Tratar objeções
      'COMPLETED'         // Finalizado
    ];

    // Critérios OBRIGATÓRIOS para avançar de fase
    this.phaseRequirements = {
      'FIRST_CONTACT': {
        minMessages: 1,
        requiredInfo: ['dor_identificada'],
        triggers: ['greeting_completed', 'pain_discovered'],
        nextPhase: 'DISCOVERY'
      },
      'DISCOVERY': {
        minMessages: 2,
        requiredInfo: ['volume_atendimento', 'processo_atual'],
        triggers: ['process_understood', 'problems_identified'],
        nextPhase: 'QUALIFICATION'
      },
      'QUALIFICATION': {
        minMessages: 3,
        requiredInfo: ['autoridade', 'urgencia', 'orcamento_indicado'],
        triggers: ['decision_maker_identified', 'budget_discussed'],
        nextPhase: 'SOLUTION_FIT'
      },
      'SOLUTION_FIT': {
        minMessages: 4,
        requiredInfo: ['valor_demonstrado', 'urgencia_criada'],
        triggers: ['value_presented', 'urgency_created'],
        nextPhase: 'SCHEDULING'
      },
      'SCHEDULING': {
        minMessages: 5,
        requiredInfo: ['disponibilidade', 'interesse_confirmado'],
        triggers: ['availability_confirmed', 'meeting_scheduled'],
        nextPhase: 'COMPLETED'
      }
    };

    // Perguntas OBRIGATÓRIAS por fase
    this.mandatoryQuestions = {
      'FIRST_CONTACT': [
        "qual seu maior desafio no atendimento ao cliente?",
        "que tipo de problema você enfrenta com vendas?"
      ],
      'DISCOVERY': [
        "quantos atendimentos vocês fazem por dia?",
        "quanto tempo leva cada atendimento?",
        "como vocês lidam quando a equipe não está disponível?"
      ],
      'QUALIFICATION': [
        "vocês têm meta de crescimento para os próximos meses?",
        "você é a pessoa que decide sobre melhorias no atendimento?",
        "qual seria um investimento adequado para resolver isso?"
      ],
      'SOLUTION_FIT': [
        "você gostaria de ver como nossos clientes aumentaram vendas em 40%?",
        "que tal uma demonstração rápida de 15 minutos?"
      ],
      'SCHEDULING': [
        "quando seria melhor para você: amanhã ou quinta?",
        "prefere manhã ou tarde?",
        "posso confirmar seu melhor e-mail?"
      ]
    };

    console.log('🎯 Sales Flow Enforcer inicializado - FLUXO RÍGIDO ATIVO');
  }

  /**
   * MÉTODO PRINCIPAL - Enforça o fluxo de vendas
   */
  async enforceFlowProgression(from, messageText, currentContext) {
    console.log(`\n🎯 [ENFORCEMENT] Analisando progressão de ${currentContext.state.phase}`);

    // 1. Verificar se pode permanecer na fase atual
    const canStayInPhase = await this.canStayInCurrentPhase(currentContext);

    // 2. Verificar se pode avançar para próxima fase
    const canAdvance = await this.canAdvanceToNextPhase(currentContext);

    // 3. Determinar ação obrigatória
    const enforcedAction = await this.determineEnforcedAction(currentContext, canStayInPhase, canAdvance);

    // 4. Aplicar enforcement
    const enforcedContext = await this.applyEnforcement(currentContext, enforcedAction);

    console.log(`✅ [ENFORCEMENT] Ação aplicada: ${enforcedAction.type} → Fase: ${enforcedContext.state.phase}`);

    return enforcedContext;
  }

  /**
   * Verificar se pode permanecer na fase atual
   */
  async canStayInCurrentPhase(context) {
    const phase = context.state.phase;
    const requirements = this.phaseRequirements[phase];

    if (!requirements) return true;

    // Verificar requisitos mínimos
    const minMessagesMet = context.state.messageCount >= requirements.minMessages;
    const infoCollected = await this.checkRequiredInfo(context.from, requirements.requiredInfo);

    // Se ainda não coletou info obrigatória, DEVE permanecer
    const mustStay = !infoCollected || !minMessagesMet;

    console.log(`   📋 Pode ficar em ${phase}: ${!mustStay} (msgs: ${context.state.messageCount}/${requirements.minMessages}, info: ${infoCollected})`);

    return !mustStay;
  }

  /**
   * Verificar se pode avançar para próxima fase
   */
  async canAdvanceToNextPhase(context) {
    const phase = context.state.phase;
    const requirements = this.phaseRequirements[phase];

    if (!requirements) return false;

    // Verificar TODOS os requisitos
    const minMessagesMet = context.state.messageCount >= requirements.minMessages;
    const infoCollected = await this.checkRequiredInfo(context.from, requirements.requiredInfo);
    const triggersActivated = await this.checkTriggers(context, requirements.triggers);

    const canAdvance = minMessagesMet && infoCollected && triggersActivated;

    console.log(`   ⬆️ Pode avançar de ${phase}: ${canAdvance}`);
    console.log(`      - Mensagens: ${minMessagesMet} (${context.state.messageCount}/${requirements.minMessages})`);
    console.log(`      - Info coletada: ${infoCollected}`);
    console.log(`      - Triggers: ${triggersActivated}`);

    return canAdvance;
  }

  /**
   * Determinar ação obrigatória baseada no estado
   */
  async determineEnforcedAction(context, canStay, canAdvance) {
    const phase = context.state.phase;

    // ESPECIAL: Se está em OBJECTION_HANDLING e cliente deu resposta positiva, voltar ao fluxo principal
    if (phase === 'OBJECTION_HANDLING' && context.analysis.intent === 'POSITIVE') {
      // Determinar qual fase voltar baseado no progresso
      const progressPhase = await this.determineProgressBasedPhase(context.from);
      return {
        type: 'ADVANCE_PHASE',
        newPhase: progressPhase,
        reason: 'Objeção resolvida, retornando ao fluxo principal'
      };
    }

    // PRIORIDADE 1: Se pode avançar, DEVE avançar
    if (canAdvance) {
      return {
        type: 'ADVANCE_PHASE',
        newPhase: this.phaseRequirements[phase].nextPhase,
        reason: 'Critérios de avanço atendidos'
      };
    }

    // PRIORIDADE 2: Se não pode ficar, DEVE coletar info obrigatória
    if (!canStay) {
      const missingInfo = await this.getMissingRequiredInfo(context.from, phase);
      const mandatoryQuestion = this.selectMandatoryQuestion(phase, missingInfo);

      return {
        type: 'FORCE_INFORMATION_COLLECTION',
        question: mandatoryQuestion,
        missingInfo: missingInfo,
        reason: 'Informações obrigatórias pendentes'
      };
    }

    // PRIORIDADE 3: Pode continuar conversando na fase atual
    return {
      type: 'CONTINUE_CURRENT_PHASE',
      phase: phase,
      reason: 'Pode continuar coletando informações'
    };
  }

  /**
   * Aplicar enforcement ao contexto
   */
  async applyEnforcement(context, action) {
    const enforcedContext = { ...context };

    switch (action.type) {
      case 'ADVANCE_PHASE':
        enforcedContext.state.phase = action.newPhase;
        enforcedContext.enforcement = {
          forced: true,
          action: 'PHASE_ADVANCED',
          reason: action.reason,
          previousPhase: context.state.phase
        };
        break;

      case 'FORCE_INFORMATION_COLLECTION':
        enforcedContext.enforcement = {
          forced: true,
          action: 'MUST_ASK_QUESTION',
          mandatoryQuestion: action.question,
          missingInfo: action.missingInfo,
          reason: action.reason
        };
        break;

      case 'CONTINUE_CURRENT_PHASE':
        enforcedContext.enforcement = {
          forced: false,
          action: 'CONTINUE_PHASE',
          reason: action.reason
        };
        break;
    }

    // Salvar estado atualizado
    await this.saveEnforcementData(context.from, enforcedContext);

    return enforcedContext;
  }

  /**
   * Verificar se informações obrigatórias foram coletadas
   */
  async checkRequiredInfo(from, requiredInfo) {
    const collectedData = await getMemory(`sales_data_${from}`) || {};

    for (const info of requiredInfo) {
      if (!collectedData[info]) {
        console.log(`   ❌ Info pendente: ${info}`);
        return false;
      }
    }

    console.log(`   ✅ Todas as informações coletadas: ${requiredInfo.join(', ')}`);
    return true;
  }

  /**
   * Verificar triggers de avanço de fase
   */
  async checkTriggers(context, triggers) {
    const activatedTriggers = await getMemory(`triggers_${context.from}`) || [];

    for (const trigger of triggers) {
      if (!activatedTriggers.includes(trigger)) {
        console.log(`   ❌ Trigger pendente: ${trigger}`);
        return false;
      }
    }

    console.log(`   ✅ Todos os triggers ativados: ${triggers.join(', ')}`);
    return true;
  }

  /**
   * Obter informações obrigatórias pendentes
   */
  async getMissingRequiredInfo(from, phase) {
    const requirements = this.phaseRequirements[phase];
    if (!requirements) return [];

    const collectedData = await getMemory(`sales_data_${from}`) || {};
    const missing = [];

    for (const info of requirements.requiredInfo) {
      if (!collectedData[info]) {
        missing.push(info);
      }
    }

    return missing;
  }

  /**
   * Selecionar pergunta obrigatória baseada na info pendente
   */
  selectMandatoryQuestion(phase, missingInfo) {
    const questions = this.mandatoryQuestions[phase] || [];

    if (questions.length === 0) {
      return "Me conte mais sobre sua situação atual.";
    }

    // Mapear info pendente para pergunta específica
    const infoToQuestion = {
      'dor_identificada': "Qual seu maior desafio no atendimento hoje?",
      'volume_atendimento': "Quantos atendimentos vocês fazem por dia em média?",
      'processo_atual': "Como funciona o atendimento de vocês atualmente?",
      'autoridade': "Você é a pessoa que decide sobre melhorias no atendimento?",
      'urgencia': "Isso é uma prioridade para vocês nos próximos meses?",
      'orcamento_indicado': "Qual seria um investimento adequado para resolver isso?",
      'valor_demonstrado': "Gostaria de ver como nossos clientes aumentaram vendas?",
      'urgencia_criada': "Que tal resolvermos isso ainda esta semana?",
      'disponibilidade': "Quando seria melhor para você: amanhã ou quinta?",
      'interesse_confirmado': "Posso confirmar seu interesse na demonstração?"
    };

    // Selecionar pergunta baseada na primeira info pendente
    if (missingInfo.length > 0) {
      const question = infoToQuestion[missingInfo[0]];
      if (question) return question;
    }

    // Fallback para pergunta padrão da fase
    return questions[0];
  }

  /**
   * Salvar dados de enforcement
   */
  async saveEnforcementData(from, context) {
    // Salvar estado da conversa
    const stateKey = `conversation_state_${from}`;
    await setMemory(stateKey, context.state);

    // Salvar histórico de enforcement
    const enforcementHistory = await getMemory(`enforcement_history_${from}`) || [];
    enforcementHistory.push({
      timestamp: Date.now(),
      phase: context.state.phase,
      action: context.enforcement?.action,
      reason: context.enforcement?.reason
    });

    await setMemory(`enforcement_history_${from}`, enforcementHistory.slice(-10)); // Manter últimas 10
  }

  /**
   * Ativar trigger de avanço
   */
  async activateTrigger(from, triggerName) {
    const triggersKey = `triggers_${from}`;
    const triggers = await getMemory(triggersKey) || [];

    if (!triggers.includes(triggerName)) {
      triggers.push(triggerName);
      await setMemory(triggersKey, triggers);
      console.log(`🎯 Trigger ativado: ${triggerName}`);
    }
  }

  /**
   * Salvar informação coletada
   */
  async saveCollectedInfo(from, infoType, value) {
    const dataKey = `sales_data_${from}`;
    const data = await getMemory(dataKey) || {};

    data[infoType] = value;
    data[`${infoType}_timestamp`] = Date.now();

    await setMemory(dataKey, data);
    console.log(`💾 Info salva: ${infoType} = ${value}`);
  }

  /**
   * Análise automática da mensagem para ativar triggers
   */
  async analyzeMessageForTriggers(from, messageText, context) {
    const text = messageText.toLowerCase();
    const phase = context.state.phase;

    console.log(`🔍 Analisando triggers para fase ${phase}`);

    // Triggers por fase
    const triggerPatterns = {
      'FIRST_CONTACT': {
        'greeting_completed': ['oi', 'olá', 'bom dia', 'boa tarde'],
        'pain_discovered': ['problema', 'dificuldade', 'desafio', 'difícil', 'ruim']
      },
      'DISCOVERY': {
        'process_understood': ['funciona', 'fazemos', 'processo', 'jeito'],
        'problems_identified': ['demora', 'perdem', 'problema', 'dificuldade', 'não conseguem']
      },
      'QUALIFICATION': {
        'decision_maker_identified': ['eu decido', 'sou eu', 'minha decisão', 'eu que', 'posso decidir'],
        'budget_discussed': ['investimento', 'valor', 'preço', 'custa', 'orçamento']
      },
      'SOLUTION_FIT': {
        'value_presented': ['interessante', 'legal', 'quero ver', 'pode mostrar'],
        'urgency_created': ['urgente', 'preciso', 'rápido', 'logo', 'agora']
      },
      'SCHEDULING': {
        'availability_confirmed': ['posso', 'consigo', 'disponível', 'livre'],
        'meeting_scheduled': ['confirmo', 'fechado', 'pode ser', 'vamos marcar']
      }
    };

    // Salvar informações detectadas automaticamente
    if (phase === 'DISCOVERY') {
      if (text.includes('atendimento') || text.includes('cliente')) {
        await this.saveCollectedInfo(from, 'volume_atendimento', 'mencionado');
      }
      if (text.includes('funciona') || text.includes('processo')) {
        await this.saveCollectedInfo(from, 'processo_atual', 'descrito');
      }
    }

    if (phase === 'QUALIFICATION') {
      if (text.includes('eu') && (text.includes('decido') || text.includes('responsável'))) {
        await this.saveCollectedInfo(from, 'autoridade', 'confirmada');
      }
      if (text.includes('investir') || text.includes('valor') || text.includes('orçamento')) {
        await this.saveCollectedInfo(from, 'orcamento_indicado', 'discutido');
      }
    }

    // Ativar triggers baseados em padrões
    const phaseTriggers = triggerPatterns[phase] || {};

    for (const [triggerName, patterns] of Object.entries(phaseTriggers)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          await this.activateTrigger(from, triggerName);
          break;
        }
      }
    }
  }

  /**
   * Gerar prompt forçado baseado no enforcement
   */
  generateEnforcedPrompt(context, originalPrompt) {
    if (!context.enforcement?.forced) {
      return originalPrompt;
    }

    const enforcement = context.enforcement;

    if (enforcement.action === 'MUST_ASK_QUESTION') {
      return `
ATENÇÃO: VOCÊ DEVE FAZER ESTA PERGUNTA OBRIGATÓRIA:

"${enforcement.mandatoryQuestion}"

CONTEXTO: Você está na fase ${context.state.phase} e precisa coletar informações obrigatórias antes de prosseguir.
INFORMAÇÕES PENDENTES: ${enforcement.missingInfo.join(', ')}
RAZÃO: ${enforcement.reason}

INSTRUÇÕES OBRIGATÓRIAS:
1. Faça a pergunta obrigatória listada acima
2. NÃO avance para outra fase ainda
3. Seja direto e objetivo
4. Aguarde a resposta antes de continuar

MENSAGEM DO CLIENTE: "${context.text}"

Responda fazendo a pergunta obrigatória de forma natural.
      `;
    }

    if (enforcement.action === 'PHASE_ADVANCED') {
      return `
ATENÇÃO: VOCÊ AVANÇOU PARA A FASE ${context.state.phase}

OBJETIVO DA NOVA FASE: ${this.getPhaseObjective(context.state.phase)}
FASE ANTERIOR: ${enforcement.previousPhase}
RAZÃO DO AVANÇO: ${enforcement.reason}

INSTRUÇÕES OBRIGATÓRIAS:
1. Reconheça que entendeu as informações da fase anterior
2. Inicie a nova fase com o objetivo correto
3. Faça perguntas específicas da nova fase
4. Mantenha o foco no objetivo da fase atual

MENSAGEM DO CLIENTE: "${context.text}"

${originalPrompt}
      `;
    }

    return originalPrompt;
  }

  /**
   * Obter objetivo da fase
   */
  getPhaseObjective(phase) {
    const objectives = {
      'FIRST_CONTACT': 'Apresentar-se e identificar a dor principal do cliente',
      'DISCOVERY': 'Entender o processo atual e identificar problemas específicos',
      'QUALIFICATION': 'Qualificar orçamento, autoridade e urgência (BANT)',
      'SOLUTION_FIT': 'Demonstrar valor específico e criar urgência',
      'SCHEDULING': 'Agendar reunião ou demonstração',
      'OBJECTION_HANDLING': 'Resolver objeções e recuperar interesse',
      'COMPLETED': 'Confirmar próximos passos e finalizar'
    };

    return objectives[phase] || objectives['FIRST_CONTACT'];
  }

  /**
   * Determinar fase baseada no progresso atual (para sair de OBJECTION_HANDLING)
   */
  async determineProgressBasedPhase(from) {
    const salesData = await getMemory(`sales_data_${from}`) || {};
    const triggers = await getMemory(`triggers_${from}`) || [];

    // Verificar qual fase seria apropriada baseada no progresso
    const hasFirstContactInfo = salesData.dor_identificada;
    const hasDiscoveryInfo = salesData.volume_atendimento && salesData.processo_atual;
    const hasQualificationInfo = salesData.autoridade && salesData.urgencia;
    const hasSolutionFitInfo = salesData.valor_demonstrado;

    if (hasSolutionFitInfo) {
      return 'SCHEDULING';
    } else if (hasQualificationInfo) {
      return 'SOLUTION_FIT';
    } else if (hasDiscoveryInfo) {
      return 'QUALIFICATION';
    } else if (hasFirstContactInfo) {
      return 'DISCOVERY';
    } else {
      return 'FIRST_CONTACT';
    }
  }

  /**
   * Obter estatísticas de progresso
   */
  async getProgressStats(from) {
    const state = await getMemory(`conversation_state_${from}`);
    const salesData = await getMemory(`sales_data_${from}`) || {};
    const triggers = await getMemory(`triggers_${from}`) || [];
    const history = await getMemory(`enforcement_history_${from}`) || [];

    return {
      currentPhase: state?.phase || 'FIRST_CONTACT',
      messageCount: state?.messageCount || 0,
      dataCollected: Object.keys(salesData).length,
      triggersActivated: triggers.length,
      enforcementActions: history.length,
      salesData,
      triggers,
      lastActions: history.slice(-3)
    };
  }
}

// Exportar instância única
export const salesFlowEnforcer = new SalesFlowEnforcer();

console.log('🎯 Sales Flow Enforcer carregado - FLUXO ESTRUTURADO ATIVO!');
console.log('📋 Fases obrigatórias: FIRST_CONTACT → DISCOVERY → QUALIFICATION → SOLUTION_FIT → SCHEDULING');