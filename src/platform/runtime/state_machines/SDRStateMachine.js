/**
 * SDR STATE MACHINE
 * Maquina de estados para fluxo de qualificacao SDR
 *
 * Combina SPIN Selling + BANT para qualificacao completa
 * Estados representam etapas do funil de pre-vendas
 */

import { calculateBANTScore, classifyLead } from '../../templates/playbooks/bant.playbook.js';
import { detectSPINStage, getSPINQuestions } from '../../templates/playbooks/spin-selling.playbook.js';

/**
 * Definicao dos estados do SDR
 */
export const SDR_STATES = {
  // Estado inicial
  S0_INITIAL: {
    name: 'Inicial',
    description: 'Conversa ainda nao iniciada',
    allowedTransitions: ['S1_OPENING'],
  },

  // Fase de abertura
  S1_OPENING: {
    name: 'Abertura',
    description: 'Estabelecendo rapport e contexto',
    maxMessages: 2,
    goals: ['Cumprimentar', 'Estabelecer contexto', 'Pedir permissao para perguntas'],
    spinStage: null,
    allowedTransitions: ['S2_SITUATION'],
  },

  // SPIN - Situation
  S2_SITUATION: {
    name: 'Situacao',
    description: 'Coletando informacoes basicas sobre contexto',
    maxMessages: 3,
    goals: ['Entender contexto atual', 'Coletar fatos basicos', 'Identificar stakeholders'],
    spinStage: 'situation',
    bantCriteria: ['authority'], // Comeca a coletar authority
    allowedTransitions: ['S3_PROBLEM'],
  },

  // SPIN - Problem
  S3_PROBLEM: {
    name: 'Problema',
    description: 'Identificando dores e dificuldades',
    maxMessages: 3,
    goals: ['Identificar dores', 'Explorar gaps', 'Validar problema real'],
    spinStage: 'problem',
    bantCriteria: ['need'], // Comeca a validar need
    allowedTransitions: ['S4_IMPLICATION'],
  },

  // SPIN - Implication
  S4_IMPLICATION: {
    name: 'Implicacao',
    description: 'Explorando impactos e consequencias',
    maxMessages: 3,
    goals: ['Ampliar percepcao de dor', 'Conectar a impactos financeiros', 'Criar urgencia'],
    spinStage: 'implication',
    bantCriteria: ['need', 'timeline'], // Aprofunda need e timeline
    allowedTransitions: ['S5_NEED_PAYOFF'],
  },

  // SPIN - Need-Payoff
  S5_NEED_PAYOFF: {
    name: 'Necessidade-Beneficio',
    description: 'Cliente articulando valor da solucao',
    maxMessages: 2,
    goals: ['Cliente fala os beneficios', 'Criar comprometimento', 'Preparar proposta'],
    spinStage: 'needPayoff',
    bantCriteria: ['need'], // Consolida need
    allowedTransitions: ['S6_BANT_VALIDATION'],
  },

  // BANT - Validacao final
  S6_BANT_VALIDATION: {
    name: 'Validacao BANT',
    description: 'Validando criterios de qualificacao',
    maxMessages: 4,
    goals: ['Validar Budget', 'Confirmar Authority', 'Revalidar Need', 'Definir Timeline'],
    spinStage: null,
    bantCriteria: ['budget', 'authority', 'need', 'timeline'],
    allowedTransitions: ['S7_SCORING'],
  },

  // Scoring
  S7_SCORING: {
    name: 'Pontuacao',
    description: 'Calculando score e decidindo rota',
    maxMessages: 0, // Estado de processamento
    goals: ['Calcular BANT score', 'Classificar lead', 'Decidir proximo passo'],
    allowedTransitions: ['S8_SCHEDULING', 'S9_NURTURING', 'S10_DISQUALIFIED'],
  },

  // Agendamento (SQL)
  S8_SCHEDULING: {
    name: 'Agendamento',
    description: 'Agendando reuniao com especialista',
    maxMessages: 3,
    goals: ['Propor reuniao', 'Coletar disponibilidade', 'Confirmar agendamento'],
    allowedTransitions: ['S11_SCHEDULED', 'S9_NURTURING'],
  },

  // Nurturing (MQL)
  S9_NURTURING: {
    name: 'Nurturing',
    description: 'Lead para cultivo futuro',
    maxMessages: 2,
    goals: ['Agradecer interesse', 'Oferecer conteudo', 'Definir recontato'],
    allowedTransitions: ['S12_COMPLETED'],
  },

  // Desqualificado
  S10_DISQUALIFIED: {
    name: 'Desqualificado',
    description: 'Lead fora do ICP ou sem fit',
    maxMessages: 1,
    goals: ['Encerrar educadamente', 'Manter porta aberta'],
    allowedTransitions: ['S12_COMPLETED'],
  },

  // Agendado (sucesso)
  S11_SCHEDULED: {
    name: 'Agendado',
    description: 'Reuniao confirmada',
    maxMessages: 2,
    goals: ['Confirmar detalhes', 'Enviar calendario', 'Preparar lead'],
    allowedTransitions: ['S12_COMPLETED'],
  },

  // Estado final
  S12_COMPLETED: {
    name: 'Finalizado',
    description: 'Conversa concluida',
    maxMessages: 0,
    allowedTransitions: [],
  },
};

/**
 * Classe principal da maquina de estados
 */
export class SDRStateMachine {
  constructor(config = {}) {
    this.config = config;
    this.state = 'S0_INITIAL';
    this.history = [];
    this.context = {
      messageCount: 0,
      stateMessageCount: 0,
      spin: {
        situation: { collected: false, data: {} },
        problem: { collected: false, data: {} },
        implication: { collected: false, data: {} },
        needPayoff: { collected: false, data: {} },
      },
      bant: {
        budget: { level: 'unknown', data: null },
        authority: { level: 'unknown', data: null },
        need: { level: 'unknown', data: null },
        timeline: { level: 'unknown', data: null },
      },
      leadData: {},
      score: 0,
      classification: null,
    };
  }

  /**
   * Retorna estado atual
   */
  getCurrentState() {
    return {
      id: this.state,
      ...SDR_STATES[this.state],
      context: this.context,
    };
  }

  /**
   * Processa mensagem e atualiza estado
   */
  processMessage(message, extractedData = {}) {
    this.context.messageCount++;
    this.context.stateMessageCount++;

    // Atualiza dados extraidos
    this.updateContext(extractedData);

    // Registra no historico
    this.history.push({
      state: this.state,
      message: message.substring(0, 100),
      timestamp: new Date().toISOString(),
      extractedData,
    });

    // Verifica se deve transicionar
    const shouldTransition = this.shouldTransition();
    if (shouldTransition) {
      this.transition(shouldTransition);
    }

    return this.getCurrentState();
  }

  /**
   * Atualiza contexto com dados extraidos
   */
  updateContext(data) {
    // Atualiza SPIN
    if (data.spin) {
      for (const [stage, stageData] of Object.entries(data.spin)) {
        if (this.context.spin[stage]) {
          this.context.spin[stage].collected = true;
          this.context.spin[stage].data = { ...this.context.spin[stage].data, ...stageData };
        }
      }
    }

    // Atualiza BANT
    if (data.bant) {
      for (const [criterio, value] of Object.entries(data.bant)) {
        if (this.context.bant[criterio]) {
          this.context.bant[criterio] = {
            level: value.level || this.context.bant[criterio].level,
            data: value.data || this.context.bant[criterio].data,
          };
        }
      }
    }

    // Atualiza dados do lead
    if (data.lead) {
      this.context.leadData = { ...this.context.leadData, ...data.lead };
    }
  }

  /**
   * Verifica se deve transicionar de estado
   */
  shouldTransition() {
    const currentState = SDR_STATES[this.state];

    // Estado final
    if (!currentState.allowedTransitions.length) return null;

    // Maximo de mensagens no estado
    if (currentState.maxMessages && this.context.stateMessageCount >= currentState.maxMessages) {
      return this.getNextState();
    }

    // Transicoes especificas por estado
    switch (this.state) {
      case 'S0_INITIAL':
        return 'S1_OPENING';

      case 'S1_OPENING':
        // Transiciona apos rapport estabelecido
        if (this.context.stateMessageCount >= 1) return 'S2_SITUATION';
        break;

      case 'S2_SITUATION':
        // Transiciona quando coletou info basica
        if (this.context.spin.situation.collected) return 'S3_PROBLEM';
        break;

      case 'S3_PROBLEM':
        // Transiciona quando identificou problema
        if (this.context.spin.problem.collected) return 'S4_IMPLICATION';
        break;

      case 'S4_IMPLICATION':
        // Transiciona quando explorou implicacoes
        if (this.context.spin.implication.collected) return 'S5_NEED_PAYOFF';
        break;

      case 'S5_NEED_PAYOFF':
        // Transiciona quando cliente articulou valor
        if (this.context.spin.needPayoff.collected) return 'S6_BANT_VALIDATION';
        break;

      case 'S6_BANT_VALIDATION':
        // Transiciona quando BANT completo
        if (this.isBANTComplete()) return 'S7_SCORING';
        break;

      case 'S7_SCORING':
        // Calcula score e decide rota
        return this.calculateRouting();

      case 'S8_SCHEDULING':
        // Verifica se agendou
        if (this.context.leadData.meetingScheduled) return 'S11_SCHEDULED';
        break;
    }

    return null;
  }

  /**
   * Executa transicao de estado
   */
  transition(newState) {
    const currentState = SDR_STATES[this.state];

    // Valida transicao
    if (!currentState.allowedTransitions.includes(newState)) {
      console.warn(`Transicao invalida: ${this.state} -> ${newState}`);
      return false;
    }

    // Registra transicao
    this.history.push({
      type: 'transition',
      from: this.state,
      to: newState,
      timestamp: new Date().toISOString(),
    });

    // Atualiza estado
    this.state = newState;
    this.context.stateMessageCount = 0;

    // Executa acoes de entrada no novo estado
    this.onEnterState(newState);

    return true;
  }

  /**
   * Acoes ao entrar em um estado
   */
  onEnterState(state) {
    switch (state) {
      case 'S7_SCORING':
        this.calculateScore();
        // Auto-transiciona para proximo estado
        const nextState = this.calculateRouting();
        if (nextState) this.transition(nextState);
        break;
    }
  }

  /**
   * Verifica se BANT esta completo
   */
  isBANTComplete() {
    const required = this.config.qualificacao?.criterios_obrigatorios || ['need', 'authority'];
    return required.every(criterio => this.context.bant[criterio].level !== 'unknown');
  }

  /**
   * Calcula score BANT
   */
  calculateScore() {
    const bantLevels = {};
    for (const [key, value] of Object.entries(this.context.bant)) {
      bantLevels[key] = value.level;
    }

    this.context.score = calculateBANTScore(bantLevels);
    this.context.classification = classifyLead(this.context.score);

    return this.context.score;
  }

  /**
   * Decide rota baseado no score
   */
  calculateRouting() {
    if (this.context.score === 0) {
      this.calculateScore();
    }

    const minScore = this.config.qualificacao?.pontuacao_sql || 60;

    if (this.context.score >= minScore) {
      return 'S8_SCHEDULING'; // SQL - agendar
    } else if (this.context.score >= 40) {
      return 'S9_NURTURING'; // MQL - nurturing
    } else {
      return 'S10_DISQUALIFIED'; // Desqualificado
    }
  }

  /**
   * Retorna proximo estado padrao
   */
  getNextState() {
    const currentState = SDR_STATES[this.state];
    return currentState.allowedTransitions[0] || null;
  }

  /**
   * Retorna sugestoes de perguntas para o estado atual
   */
  getSuggestedQuestions() {
    const currentState = SDR_STATES[this.state];

    if (currentState.spinStage) {
      return getSPINQuestions(currentState.spinStage, 'geral');
    }

    // Perguntas BANT para validacao
    if (this.state === 'S6_BANT_VALIDATION') {
      const missing = [];
      for (const [criterio, data] of Object.entries(this.context.bant)) {
        if (data.level === 'unknown') {
          missing.push(criterio);
        }
      }
      return this.getBANTQuestions(missing);
    }

    return [];
  }

  /**
   * Retorna perguntas BANT por criterio
   */
  getBANTQuestions(criterios) {
    const questions = {
      budget: 'Voces ja tem um investimento previsto para essa area?',
      authority: 'Quem mais participa dessa decisao?',
      need: 'Se eu entendi bem, o principal problema e [X]. Esta certo?',
      timeline: 'Quando pretendem resolver essa questao?',
    };

    return criterios.map(c => questions[c]);
  }

  /**
   * Forca transicao (para uso manual)
   */
  forceTransition(newState) {
    if (SDR_STATES[newState]) {
      this.state = newState;
      this.context.stateMessageCount = 0;
      return true;
    }
    return false;
  }

  /**
   * Serializa estado para persistencia
   */
  serialize() {
    return {
      state: this.state,
      context: this.context,
      history: this.history.slice(-20), // Ultimos 20 eventos
    };
  }

  /**
   * Restaura estado de dados serializados
   */
  restore(data) {
    this.state = data.state || 'S0_INITIAL';
    this.context = data.context || this.context;
    this.history = data.history || [];
  }
}

/**
 * Factory function
 */
export function createSDRStateMachine(config) {
  return new SDRStateMachine(config);
}

export default {
  SDR_STATES,
  SDRStateMachine,
  createSDRStateMachine,
};
