// src/tools/spin_bant_engine.js
// Sistema SPIN/BANT para qualificação profissional de leads

import { db } from '../memory.js';

/**
 * SPIN SELLING FRAMEWORK + BANT QUALIFICATION
 *
 * SPIN = Situation, Problem, Implication, Need-Payoff
 * BANT = Budget, Authority, Need, Timeline
 */

export class SpinBantEngine {
  constructor() {
    this.initDatabase();

    // Framework SPIN - Perguntas estruturadas por fase
    this.spinQuestions = {
      // SITUATION: Entender contexto atual
      SITUATION: [
        {
          question: "Como funciona seu processo de atendimento hoje?",
          context: "discovery",
          goal: "understand_current_state",
          followUp: ["team_size", "volume"]
        },
        {
          question: "Quantas pessoas estão no time comercial?",
          context: "team_discovery",
          goal: "understand_capacity",
          followUp: ["process_bottleneck"]
        },
        {
          question: "Quantos leads chegam por mês em média?",
          context: "volume_discovery",
          goal: "understand_scale",
          followUp: ["conversion_rate"]
        },
        {
          question: "Como vocês distribuem os leads para o time?",
          context: "process_discovery",
          goal: "understand_workflow",
          followUp: ["bottleneck"]
        }
      ],

      // PROBLEM: Identificar dores específicas
      PROBLEM: [
        {
          question: "Qual o maior gargalo no seu processo de vendas?",
          context: "pain_discovery",
          goal: "identify_main_pain",
          followUp: ["impact"]
        },
        {
          question: "Vocês perdem leads por demora no atendimento?",
          context: "speed_issue",
          goal: "identify_speed_pain",
          followUp: ["quantify_loss"]
        },
        {
          question: "Como está a taxa de conversão de leads hoje?",
          context: "conversion_issue",
          goal: "identify_performance",
          followUp: ["benchmark"]
        },
        {
          question: "O time consegue fazer follow-up de todos os leads?",
          context: "followup_issue",
          goal: "identify_coverage",
          followUp: ["lost_opportunities"]
        },
        {
          question: "Vocês têm visibilidade das métricas de vendas?",
          context: "visibility_issue",
          goal: "identify_blind_spots",
          followUp: ["decision_making"]
        }
      ],

      // IMPLICATION: Amplificar impacto da dor
      IMPLICATION: [
        {
          question: "Quanto vocês estimam que perdem por mês em leads não atendidos?",
          context: "financial_impact",
          goal: "quantify_loss",
          followUp: ["urgency"]
        },
        {
          question: "Como isso afeta as metas de crescimento da empresa?",
          context: "strategic_impact",
          goal: "tie_to_goals",
          followUp: ["timeline"]
        },
        {
          question: "Se continuar assim, qual o impacto em 6 meses?",
          context: "future_impact",
          goal: "create_urgency",
          followUp: ["decision_timeline"]
        },
        {
          question: "Esse problema já custou alguma oportunidade grande?",
          context: "concrete_loss",
          goal: "emotional_connection",
          followUp: ["prevention"]
        },
        {
          question: "Como o time se sente com esse volume de trabalho manual?",
          context: "team_morale",
          goal: "human_impact",
          followUp: ["retention"]
        }
      ],

      // NEED-PAYOFF: Conectar solução ao valor
      NEED_PAYOFF: [
        {
          question: "Como seria se vocês pudessem atender 100% dos leads em segundos?",
          context: "solution_vision",
          goal: "paint_picture",
          followUp: ["roi"]
        },
        {
          question: "Quanto valeria recuperar essas oportunidades perdidas?",
          context: "value_calculation",
          goal: "quantify_gain",
          followUp: ["investment"]
        },
        {
          question: "Se o time focasse só no fechamento, quanto aumentaria a conversão?",
          context: "efficiency_gain",
          goal: "show_leverage",
          followUp: ["implementation"]
        },
        {
          question: "Imagine ter dados em tempo real de todo o funil. Como isso ajudaria?",
          context: "insight_value",
          goal: "strategic_benefit",
          followUp: ["decision"]
        }
      ]
    };

    // Framework BANT - Critérios de qualificação
    this.bantCriteria = {
      // BUDGET: Capacidade de investimento
      BUDGET: {
        questions: [
          "Vocês já investem em alguma ferramenta de CRM ou automação?",
          "Qual seria um investimento adequado para resolver esse problema?",
          "Tem orçamento aprovado para melhorias no comercial este ano?"
        ],
        signals: {
          positive: ["já investimos", "temos orçamento", "aprovado", "entre X e Y", "até R$"],
          negative: ["sem orçamento", "muito caro", "não temos", "zero investimento"],
          neutral: ["depende", "preciso ver", "varia"]
        },
        weight: 25
      },

      // AUTHORITY: Poder de decisão
      AUTHORITY: {
        questions: [
          "Você é responsável por aprovar investimentos em tecnologia?",
          "Quem mais participa da decisão sobre ferramentas para o comercial?",
          "Como funciona o processo de aprovação na empresa?"
        ],
        signals: {
          positive: ["sou eu", "decido", "sócio", "dono", "diretor", "autonomia"],
          negative: ["não decido", "preciso consultar", "gerente decide", "não tenho autonomia"],
          neutral: ["participo", "em conjunto", "comitê"]
        },
        weight: 30
      },

      // NEED: Urgência da necessidade
      NEED: {
        questions: [
          "Isso é prioridade para o trimestre ou mais para médio prazo?",
          "O que acontece se não resolver esse problema nos próximos meses?",
          "Já estão avaliando outras soluções?"
        ],
        signals: {
          positive: ["urgente", "prioridade", "agora", "este mês", "já avalio", "preciso resolver"],
          negative: ["não urgente", "futuro", "sem pressa", "talvez", "um dia"],
          neutral: ["trimestre", "semestre", "planejando"]
        },
        weight: 25
      },

      // TIMELINE: Prazo de decisão
      TIMELINE: {
        questions: [
          "Quando vocês gostariam de ter uma solução implementada?",
          "Qual o prazo ideal para começar?",
          "Tem alguma meta ou evento que depende disso?"
        ],
        signals: {
          positive: ["semana", "mês", "trimestre", "logo", "rápido", "quanto antes"],
          negative: ["sem prazo", "futuro distante", "talvez ano que vem"],
          neutral: ["alguns meses", "após X", "quando aprovar"]
        },
        weight: 20
      }
    };

    console.log('🎯 SPIN/BANT Engine inicializado');
  }

  /**
   * Inicializa tabelas de tracking SPIN/BANT
   */
  initDatabase() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS spin_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        goal_achieved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS bant_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        budget_score INTEGER DEFAULT 0,
        authority_score INTEGER DEFAULT 0,
        need_score INTEGER DEFAULT 0,
        timeline_score INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        classification TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(contact_id)
      )
    `);

    console.log('✅ SPIN/BANT Database tables initialized');
  }

  /**
   * Seleciona próxima pergunta SPIN baseada no contexto
   * @param {string} contactId - ID do contato
   * @param {string} currentPhase - Fase atual (SITUATION, PROBLEM, IMPLICATION, NEED_PAYOFF)
   * @param {object} context - Contexto da conversa
   * @returns {object} - Próxima pergunta sugerida
   */
  async getNextSpinQuestion(contactId, currentPhase, context = {}) {
    try {
      // Verificar histórico de perguntas já feitas
      const askedQuestions = db.prepare(`
        SELECT question FROM spin_progress
        WHERE contact_id = ?
      `).all(contactId).map(row => row.question);

      // Filtrar perguntas disponíveis
      const availableQuestions = this.spinQuestions[currentPhase]
        .filter(q => !askedQuestions.includes(q.question));

      if (availableQuestions.length === 0) {
        // Se todas as perguntas da fase foram feitas, avançar para próxima fase
        const nextPhase = this.getNextSpinPhase(currentPhase);
        if (nextPhase) {
          return this.getNextSpinQuestion(contactId, nextPhase, context);
        }
        return null;
      }

      // Selecionar pergunta mais adequada ao contexto
      const selectedQuestion = this.selectBestQuestion(availableQuestions, context);

      console.log(`🎯 [SPIN] Fase ${currentPhase}: "${selectedQuestion.question}"`);

      return {
        phase: currentPhase,
        question: selectedQuestion.question,
        goal: selectedQuestion.goal,
        context: selectedQuestion.context,
        followUp: selectedQuestion.followUp
      };

    } catch (error) {
      console.error('❌ [SPIN] Erro ao selecionar pergunta:', error);
      return null;
    }
  }

  /**
   * Registra resposta a uma pergunta SPIN
   * @param {string} contactId
   * @param {string} phase
   * @param {string} question
   * @param {string} answer
   */
  async recordSpinAnswer(contactId, phase, question, answer) {
    try {
      db.prepare(`
        INSERT INTO spin_progress (contact_id, phase, question, answer, goal_achieved)
        VALUES (?, ?, ?, ?, ?)
      `).run(contactId, phase, question, answer, 1);

      console.log(`📝 [SPIN] Resposta registrada para ${contactId}: ${phase}`);
    } catch (error) {
      console.error('❌ [SPIN] Erro ao registrar resposta:', error);
    }
  }

  /**
   * Calcula score BANT do lead
   * @param {string} contactId
   * @param {string} messageText - Última mensagem do lead
   * @returns {object} - Scores BANT
   */
  async calculateBantScore(contactId, messageText) {
    try {
      const textLower = messageText.toLowerCase();

      const scores = {
        budget: 0,
        authority: 0,
        need: 0,
        timeline: 0
      };

      // Analisar cada critério BANT
      for (const [criterion, config] of Object.entries(this.bantCriteria)) {
        let score = 50; // Score neutro inicial

        // Detectar sinais positivos
        if (config.signals.positive.some(signal => textLower.includes(signal))) {
          score = 100;
        }
        // Detectar sinais negativos
        else if (config.signals.negative.some(signal => textLower.includes(signal))) {
          score = 20;
        }
        // Detectar sinais neutros
        else if (config.signals.neutral.some(signal => textLower.includes(signal))) {
          score = 60;
        }

        scores[criterion.toLowerCase()] = score;
      }

      // Calcular score total ponderado
      const totalScore = Math.round(
        scores.budget * (this.bantCriteria.BUDGET.weight / 100) +
        scores.authority * (this.bantCriteria.AUTHORITY.weight / 100) +
        scores.need * (this.bantCriteria.NEED.weight / 100) +
        scores.timeline * (this.bantCriteria.TIMELINE.weight / 100)
      );

      // Classificar lead
      const classification = this.classifyLead(totalScore, scores);

      // Salvar no banco
      db.prepare(`
        INSERT INTO bant_scores (contact_id, budget_score, authority_score, need_score, timeline_score, total_score, classification)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contact_id) DO UPDATE SET
          budget_score = excluded.budget_score,
          authority_score = excluded.authority_score,
          need_score = excluded.need_score,
          timeline_score = excluded.timeline_score,
          total_score = excluded.total_score,
          classification = excluded.classification,
          updated_at = datetime('now')
      `).run(contactId, scores.budget, scores.authority, scores.need, scores.timeline, totalScore, classification);

      console.log(`📊 [BANT] Score para ${contactId}: ${totalScore}/100 (${classification})`);

      return {
        budget: scores.budget,
        authority: scores.authority,
        need: scores.need,
        timeline: scores.timeline,
        total: totalScore,
        classification
      };

    } catch (error) {
      console.error('❌ [BANT] Erro ao calcular score:', error);
      return null;
    }
  }

  /**
   * Classifica lead baseado no score BANT
   */
  classifyLead(totalScore, individualScores) {
    // SQL (Sales Qualified Lead): Score alto + todos critérios > 60
    if (totalScore >= 80 && Object.values(individualScores).every(s => s >= 60)) {
      return 'SQL';
    }

    // MQL (Marketing Qualified Lead): Score médio-alto
    if (totalScore >= 60) {
      return 'MQL';
    }

    // PQL (Product Qualified Lead): Need alto mas outros critérios médios
    if (individualScores.need >= 80 && totalScore >= 50) {
      return 'PQL';
    }

    // IQL (Information Qualified Lead): Baixo score, precisa nurturing
    if (totalScore >= 30) {
      return 'IQL';
    }

    // UNQUALIFIED: Score muito baixo
    return 'UNQUALIFIED';
  }

  /**
   * Obtém score BANT atual do lead
   */
  async getBantScore(contactId) {
    try {
      const score = db.prepare(`
        SELECT * FROM bant_scores WHERE contact_id = ?
      `).get(contactId);

      return score || null;
    } catch (error) {
      console.error('❌ [BANT] Erro ao buscar score:', error);
      return null;
    }
  }

  /**
   * Seleciona melhor pergunta baseada no contexto
   */
  selectBestQuestion(questions, context) {
    // Por enquanto, retorna primeira disponível
    // TODO: Implementar lógica de seleção inteligente baseada em context
    return questions[0];
  }

  /**
   * Retorna próxima fase SPIN
   */
  getNextSpinPhase(currentPhase) {
    const phases = ['SITUATION', 'PROBLEM', 'IMPLICATION', 'NEED_PAYOFF'];
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex === -1 || currentIndex === phases.length - 1) {
      return null; // Fim do SPIN
    }

    return phases[currentIndex + 1];
  }

  /**
   * Obtém próxima pergunta BANT específica
   */
  async getNextBantQuestion(contactId, criterion) {
    const config = this.bantCriteria[criterion.toUpperCase()];
    if (!config) return null;

    // Verificar perguntas já feitas
    const askedQuestions = db.prepare(`
      SELECT question FROM spin_progress
      WHERE contact_id = ? AND question LIKE ?
    `).all(contactId, `%${criterion}%`).map(row => row.question);

    // Retornar primeira pergunta não feita
    const availableQuestions = config.questions.filter(q => !askedQuestions.includes(q));

    return availableQuestions.length > 0 ? availableQuestions[0] : null;
  }

  /**
   * Gera relatório SPIN/BANT completo
   */
  async generateQualificationReport(contactId) {
    try {
      const bantScore = await this.getBantScore(contactId);
      const spinProgress = db.prepare(`
        SELECT phase, COUNT(*) as count
        FROM spin_progress
        WHERE contact_id = ?
        GROUP BY phase
      `).all(contactId);

      return {
        contactId,
        bant: bantScore,
        spin: {
          progress: spinProgress,
          phase: spinProgress.length > 0 ? spinProgress[spinProgress.length - 1].phase : 'SITUATION'
        },
        readyForDemo: bantScore?.total >= 70,
        readyForClose: bantScore?.classification === 'SQL'
      };

    } catch (error) {
      console.error('❌ [SPIN/BANT] Erro ao gerar relatório:', error);
      return null;
    }
  }
}

// Singleton
const spinBantEngine = new SpinBantEngine();
export default spinBantEngine;
