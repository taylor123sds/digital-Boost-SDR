// src/tools/lead_scoring_system.js
// Sistema de pontuação automática de leads com classificação MQL/SQL
// MELHORIA 3: Agora com scoring ponderado por arquétipo

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';

// ============================================================
// CONFIG LOADER - Carrega ICP dinamicamente do banco ou defaults
// ============================================================
import { getConfigLoader, DEFAULT_IDEAL_PROFILES } from '../config/AgentConfigLoader.js';

/**
 * LEAD SCORING SYSTEM
 *
 * Classifica leads automaticamente baseado em:
 * - Comportamento (engagement, tempo de resposta)
 * - Firmographics (tamanho empresa, segmento)
 * - BANT (Budget, Authority, Need, Timeline)
 * - Intent signals (perguntas sobre preço, demo, etc)
 * - MELHORIA 3: Arquétipo (sinais de compra específicos por tipo)
 */

export class LeadScoringSystem {
  constructor() {
    this.initDatabase();

    // ═══════════════════════════════════════════════════════════════
    // MELHORIA 3: PESOS DE SINAIS POR ARQUÉTIPO
    // Cada arquétipo demonstra interesse de compra de forma diferente
    // ═══════════════════════════════════════════════════════════════
    this.archetypeBuyingSignals = {
      // HEROI: Foca em resultados e velocidade
      HEROI: {
        highSignals: ['quanto tempo', 'roi', 'resultado', 'meta', 'superar', 'vencer'],
        mediumSignals: ['desafio', 'concorrente', 'benchmark'],
        multiplier: 1.2 // Herói decide rápido quando convencido
      },
      // SABIO: Precisa de dados e evidências
      SABIO: {
        highSignals: ['dados', 'case', 'estudo', 'metodologia', 'métricas', 'comparativo'],
        mediumSignals: ['como funciona', 'documentação', 'whitepaper'],
        multiplier: 1.0 // Padrão - processo analítico
      },
      // MAGO: Quer transformação e visão
      MAGO: {
        highSignals: ['transformar', 'revolucionar', 'automatizar', 'escalar', 'futuro'],
        mediumSignals: ['inovar', 'diferente', 'novo'],
        multiplier: 1.15 // Entusiasta quando vê potencial
      },
      // CUIDADOR: Preocupado com equipe e segurança
      CUIDADOR: {
        highSignals: ['minha equipe', 'meus funcionários', 'proteger', 'seguro', 'confiável'],
        mediumSignals: ['suporte', 'ajuda', 'treinamento'],
        multiplier: 0.95 // Mais cauteloso, precisa de confiança
      },
      // GOVERNANTE: Quer controle e liderança
      GOVERNANTE: {
        highSignals: ['controle', 'dashboard', 'relatório', 'visibilidade', 'gestão'],
        mediumSignals: ['indicadores', 'kpi', 'monitorar'],
        multiplier: 1.1 // Decide quando tem controle
      },
      // REBELDE: Quer quebrar padrões
      REBELDE: {
        highSignals: ['diferente', 'chega de', 'cansei', 'não funciona', 'preciso mudar'],
        mediumSignals: ['alternativa', 'novo jeito', 'disruptivo'],
        multiplier: 1.25 // Muito motivado quando frustrado com status quo
      },
      // EXPLORADOR: Busca novidades e oportunidades
      EXPLORADOR: {
        highSignals: ['novo', 'oportunidade', 'expandir', 'crescer', 'explorar'],
        mediumSignals: ['tendência', 'mercado', 'inovação'],
        multiplier: 1.1 // Aberto a novidades
      },
      // CRIADOR: Quer personalização
      CRIADOR: {
        highSignals: ['personalizar', 'customizar', 'adaptar', 'específico', 'único'],
        mediumSignals: ['meu caso', 'minha situação', 'diferente'],
        multiplier: 1.05 // Precisa ver fit específico
      },
      // AMANTE: Conexão emocional e paixão
      AMANTE: {
        highSignals: ['meu sonho', 'paixão', 'construí', 'minha história', 'orgulho'],
        mediumSignals: ['família', 'legado', 'amor'],
        multiplier: 1.1 // Compra quando há conexão
      },
      // INOCENTE: Simplicidade e transparência
      INOCENTE: {
        highSignals: ['simples', 'fácil', 'direto', 'sem complicação', 'claro'],
        mediumSignals: ['honesto', 'transparente', 'verdade'],
        multiplier: 1.0 // Padrão quando confia
      },
      // PESSOA_COMUM: Praticidade
      PESSOA_COMUM: {
        highSignals: ['prático', 'funciona', 'real', 'comum', 'todo mundo usa'],
        mediumSignals: ['normal', 'básico', 'essencial'],
        multiplier: 1.0 // Compra quando vê praticidade
      },
      // BOBO_DA_CORTE: Leveza
      BOBO_DA_CORTE: {
        highSignals: ['legal', 'bacana', 'show', 'top', 'massa'],
        mediumSignals: ['divertido', 'interessante', 'curioso'],
        multiplier: 0.9 // Pode ser mais difícil de converter
      }
    };

    // Critérios de pontuação e pesos
    this.scoringCriteria = {
      // Comportamento (0-30 pontos)
      BEHAVIOR: {
        weight: 30,
        factors: {
          responseSpeed: { max: 10, description: 'Velocidade de resposta' },
          messageFrequency: { max: 10, description: 'Frequência de mensagens' },
          engagement: { max: 10, description: 'Nível de engajamento' }
        }
      },

      // Firmographics (0-25 pontos)
      FIRMOGRAPHICS: {
        weight: 25,
        factors: {
          companySize: { max: 10, description: 'Tamanho da empresa' },
          industry: { max: 10, description: 'Segmento ideal' },
          location: { max: 5, description: 'Localização' }
        }
      },

      // BANT (0-30 pontos)
      BANT: {
        weight: 30,
        factors: {
          budget: { max: 8, description: 'Orçamento disponível' },
          authority: { max: 10, description: 'Poder de decisão' },
          need: { max: 7, description: 'Necessidade urgente' },
          timeline: { max: 5, description: 'Prazo de decisão' }
        }
      },

      // Intent Signals (0-15 pontos)
      INTENT: {
        weight: 15,
        factors: {
          pricingQuestions: { max: 5, description: 'Perguntou sobre preço' },
          demoRequest: { max: 5, description: 'Pediu demonstração' },
          competitorMention: { max: 5, description: 'Mencionou concorrentes' }
        }
      }
    };

    // Sinais de intent (palavras-chave)
    this.intentSignals = {
      HIGH: [
        'quanto custa', 'preço', 'valor', 'investimento', 'contratar',
        'fechar', 'começar', 'implementar', 'demo', 'demonstração',
        'reunião', 'call', 'conversar com vendedor', 'proposta'
      ],
      MEDIUM: [
        'como funciona', 'quais recursos', 'integração', 'suporte',
        'tempo de implementação', 'cases', 'clientes', 'resultados'
      ],
      LOW: [
        'interessante', 'legal', 'bacana', 'entendi', 'ok',
        'depois', 'mais tarde', 'vou pensar'
      ]
    };

    // ============================================================
    // ICP - Ideal Customer Profile
    // Agora carregado via ConfigLoader (dinamico por tenant)
    // Default mantido para retrocompatibilidade
    // ============================================================
    this.idealProfiles = DEFAULT_IDEAL_PROFILES;
    this.configLoader = getConfigLoader();

    console.log(' Lead Scoring System inicializado');
  }

  /**
   * Inicializa tabelas de lead scoring
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL UNIQUE,
        behavior_score INTEGER DEFAULT 0,
        firmographics_score INTEGER DEFAULT 0,
        bant_score INTEGER DEFAULT 0,
        intent_score INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        classification TEXT DEFAULT 'COLD',
        priority TEXT DEFAULT 'LOW',
        last_activity DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_value TEXT,
        points_awarded INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        old_classification TEXT,
        new_classification TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' Lead Scoring Database tables initialized');
  }

  /**
   * Calcula score completo do lead
   * MELHORIA 3: Agora considera arquétipo para ponderação
   * @param {string} contactId
   * @param {object} context - Contexto adicional (mensagens, profile, archetype, etc)
   * @returns {object} - Score detalhado
   */
  async calculateLeadScore(contactId, context = {}) {
    try {
      console.log(` [SCORING] Calculando score para ${contactId}...`);

      // 1. Comportamento
      const behaviorScore = await this.calculateBehaviorScore(contactId, context);

      // 2. Firmographics
      const firmographicsScore = await this.calculateFirmographicsScore(contactId, context);

      // 3. BANT (vem do SPIN/BANT engine)
      const bantScore = await this.calculateBantComponentScore(contactId, context);

      // 4. Intent Signals
      const intentScore = await this.calculateIntentScore(contactId, context);

      // MELHORIA 3: Score de arquétipo
      const archetypeScore = this.calculateArchetypeScore(contactId, context);

      // 5. Score Total Base
      let totalScore = behaviorScore + firmographicsScore + bantScore + intentScore;

      // MELHORIA 3: Aplicar multiplicador do arquétipo
      const archetype = context.archetype || 'SABIO';
      const archetypeConfig = this.archetypeBuyingSignals[archetype] || this.archetypeBuyingSignals.SABIO;
      const multiplier = archetypeConfig.multiplier || 1.0;

      // Adicionar score de sinais específicos do arquétipo
      totalScore += archetypeScore.bonusPoints;

      // Aplicar multiplicador (limitar a 100)
      totalScore = Math.min(100, Math.round(totalScore * multiplier));

      // 6. Classificação
      const classification = this.classifyLeadByScore(totalScore);
      const priority = this.calculatePriority(totalScore, context);

      // 7. Salvar no banco
      await this.saveLeadScore(contactId, {
        behavior: behaviorScore,
        firmographics: firmographicsScore,
        bant: bantScore,
        intent: intentScore,
        total: totalScore,
        classification,
        priority
      });

      console.log(` [SCORING] ${contactId}: ${totalScore}/100 (${classification}) | Arquétipo: ${archetype} (x${multiplier})`);

      return {
        contactId,
        scores: {
          behavior: behaviorScore,
          firmographics: firmographicsScore,
          bant: bantScore,
          intent: intentScore,
          archetype: archetypeScore, // MELHORIA 3: Incluir score de arquétipo
          total: totalScore
        },
        classification,
        priority,
        archetypeMultiplier: multiplier, // MELHORIA 3
        breakdown: {
          behaviorDetails: this.getBehaviorBreakdown(context),
          firmographicsDetails: this.getFirmographicsBreakdown(context),
          intentDetails: this.getIntentBreakdown(context),
          archetypeDetails: archetypeScore // MELHORIA 3
        }
      };

    } catch (error) {
      console.error(' [SCORING] Erro ao calcular score:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MELHORIA 3: SCORING PONDERADO POR ARQUÉTIPO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calcula score baseado em sinais específicos do arquétipo
   * @param {string} contactId
   * @param {object} context
   * @returns {object} Score e detalhes
   */
  calculateArchetypeScore(contactId, context = {}) {
    const archetype = context.archetype || 'SABIO';
    const archetypeConfig = this.archetypeBuyingSignals[archetype];

    if (!archetypeConfig) {
      return {
        bonusPoints: 0,
        highSignalsFound: [],
        mediumSignalsFound: [],
        archetype,
        multiplier: 1.0
      };
    }

    const messages = context.recentMessages || [];
    const allText = messages.map(m => m.text?.toLowerCase() || '').join(' ');
    const lastMessage = (context.lastMessage || '').toLowerCase();

    const highSignalsFound = [];
    const mediumSignalsFound = [];
    let bonusPoints = 0;

    // Verificar sinais de alta prioridade do arquétipo (3 pontos cada)
    for (const signal of archetypeConfig.highSignals) {
      if (allText.includes(signal) || lastMessage.includes(signal)) {
        highSignalsFound.push(signal);
        bonusPoints += 3;
      }
    }

    // Verificar sinais de média prioridade (1 ponto cada)
    for (const signal of archetypeConfig.mediumSignals) {
      if (allText.includes(signal) || lastMessage.includes(signal)) {
        mediumSignalsFound.push(signal);
        bonusPoints += 1;
      }
    }

    // Limitar bônus a 15 pontos
    bonusPoints = Math.min(15, bonusPoints);

    if (highSignalsFound.length > 0 || mediumSignalsFound.length > 0) {
      console.log(` [SCORING] Sinais de ${archetype}: ${highSignalsFound.length} altos, ${mediumSignalsFound.length} médios (+${bonusPoints} pts)`);
    }

    return {
      bonusPoints,
      highSignalsFound,
      mediumSignalsFound,
      archetype,
      multiplier: archetypeConfig.multiplier
    };
  }

  /**
   * Obtém recomendação de abordagem baseada no arquétipo e score
   * @param {string} archetype
   * @param {number} score
   * @returns {object} Recomendação
   */
  getArchetypeRecommendation(archetype, score) {
    const config = this.archetypeBuyingSignals[archetype] || this.archetypeBuyingSignals.SABIO;

    const recommendations = {
      HEROI: {
        highScore: 'Apresente ROI e timeline agressivo. HEROI quer vencer.',
        mediumScore: 'Mostre cases de sucesso e métricas de resultado.',
        lowScore: 'Desafie com metas ambiciosas que ele pode alcançar.'
      },
      SABIO: {
        highScore: 'Forneça documentação técnica e dados comparativos.',
        mediumScore: 'Ofereça webinar ou demo detalhada.',
        lowScore: 'Compartilhe artigos e estudos de caso.'
      },
      MAGO: {
        highScore: 'Pinte a visão de transformação completa.',
        mediumScore: 'Mostre potencial de automação e escala.',
        lowScore: 'Inspire com possibilidades futuras.'
      },
      REBELDE: {
        highScore: 'Valide frustrações e mostre como quebrar padrões.',
        mediumScore: 'Apresente como diferencial competitivo.',
        lowScore: 'Questione o status quo junto com ele.'
      },
      CUIDADOR: {
        highScore: 'Enfatize suporte, treinamento e segurança.',
        mediumScore: 'Mostre como protege a equipe.',
        lowScore: 'Construa confiança com garantias.'
      },
      GOVERNANTE: {
        highScore: 'Demonstre controle total via dashboards.',
        mediumScore: 'Mostre relatórios e visibilidade.',
        lowScore: 'Enfatize gestão e indicadores.'
      },
      DEFAULT: {
        highScore: 'Lead quente - agende reunião imediatamente.',
        mediumScore: 'Continue qualificação com foco em valor.',
        lowScore: 'Nutra com conteúdo relevante.'
      }
    };

    const archetypeRec = recommendations[archetype] || recommendations.DEFAULT;

    if (score >= 70) return { level: 'high', message: archetypeRec.highScore };
    if (score >= 40) return { level: 'medium', message: archetypeRec.mediumScore };
    return { level: 'low', message: archetypeRec.lowScore };
  }

  /**
   * Calcula score de comportamento
   */
  async calculateBehaviorScore(contactId, context) {
    let score = 0;

    // Velocidade de resposta (0-10)
    const avgResponseTime = context.avgResponseTime || 0;
    if (avgResponseTime < 60) score += 10;        // < 1 min
    else if (avgResponseTime < 300) score += 8;   // < 5 min
    else if (avgResponseTime < 1800) score += 5;  // < 30 min
    else score += 2;

    // Frequência de mensagens (0-10)
    const messageCount = context.messageCount || 0;
    if (messageCount >= 10) score += 10;
    else if (messageCount >= 5) score += 7;
    else if (messageCount >= 3) score += 4;
    else score += 1;

    // Engajamento (0-10)
    const engagementSignals = context.engagementSignals || [];
    score += Math.min(10, engagementSignals.length * 2);

    return Math.min(30, score); // Max 30
  }

  /**
   * Calcula score de firmographics
   */
  async calculateFirmographicsScore(contactId, context) {
    let score = 0;

    const industry = context.industry?.toLowerCase() || '';
    const size = context.companySize || '';
    const location = context.location?.toLowerCase() || '';

    // Verificar fit com ICP
    for (const [profile, criteria] of Object.entries(this.idealProfiles)) {
      let matches = 0;

      // Indústria
      if (criteria.industries.some(ind => industry.includes(ind))) {
        matches++;
      }

      // Tamanho
      if (criteria.sizes.includes(size)) {
        matches++;
      }

      // Localização
      if (criteria.locations.some(loc => location.includes(loc))) {
        matches++;
      }

      // Se tem match, usar score desse perfil
      if (matches >= 2) {
        score = criteria.score;
        break;
      }
    }

    return score;
  }

  /**
   * Calcula componente BANT do score
   */
  async calculateBantComponentScore(contactId, context) {
    // Se tem score BANT do spin_bant_engine, usar
    if (context.bantScore) {
      return Math.round((context.bantScore.total / 100) * 30); // Normalizar para 30 pontos
    }

    // Senão, calcular baseado em sinais básicos
    let score = 0;

    const textLower = (context.lastMessage || '').toLowerCase();

    // Budget signals
    if (/orçamento|investimento|valor|preço/.test(textLower)) {
      score += 7;
    }

    // Authority signals
    if (/sou.*dono|diretor|sócio|decido/.test(textLower)) {
      score += 10;
    }

    // Need signals
    if (/urgente|prioridade|preciso|problema/.test(textLower)) {
      score += 7;
    }

    // Timeline signals
    if (/agora|este mês|logo|rápido/.test(textLower)) {
      score += 6;
    }

    return Math.min(30, score);
  }

  /**
   * Calcula score de intent signals
   */
  async calculateIntentScore(contactId, context) {
    let score = 0;

    const messages = context.recentMessages || [];
    const allText = messages.map(m => m.text?.toLowerCase() || '').join(' ');

    // High intent
    for (const signal of this.intentSignals.HIGH) {
      if (allText.includes(signal)) {
        score += 3;
      }
    }

    // Medium intent
    for (const signal of this.intentSignals.MEDIUM) {
      if (allText.includes(signal)) {
        score += 1;
      }
    }

    return Math.min(15, score); // Max 15
  }

  /**
   * Classifica lead baseado no score total
   */
  classifyLeadByScore(totalScore) {
    if (totalScore >= 80) return 'SQL';  // Sales Qualified Lead
    if (totalScore >= 60) return 'MQL';  // Marketing Qualified Lead
    if (totalScore >= 40) return 'PQL';  // Product Qualified Lead
    if (totalScore >= 20) return 'IQL';  // Information Qualified Lead
    return 'COLD';
  }

  /**
   * Calcula prioridade de atendimento
   */
  calculatePriority(totalScore, context) {
    // Prioridade CRITICAL: SQL + intent alto
    if (totalScore >= 80 && context.intentScore >= 10) {
      return 'CRITICAL';
    }

    // Prioridade HIGH: MQL+
    if (totalScore >= 60) {
      return 'HIGH';
    }

    // Prioridade MEDIUM: PQL
    if (totalScore >= 40) {
      return 'MEDIUM';
    }

    // Prioridade LOW: IQL ou COLD
    return 'LOW';
  }

  /**
   * Salva score no banco
   */
  async saveLeadScore(contactId, scores) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO lead_scores (
          contact_id, behavior_score, firmographics_score, bant_score,
          intent_score, total_score, classification, priority, last_activity, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(contact_id) DO UPDATE SET
          behavior_score = excluded.behavior_score,
          firmographics_score = excluded.firmographics_score,
          bant_score = excluded.bant_score,
          intent_score = excluded.intent_score,
          total_score = excluded.total_score,
          classification = excluded.classification,
          priority = excluded.priority,
          last_activity = datetime('now'),
          updated_at = datetime('now')
      `).run(
        contactId,
        scores.behavior,
        scores.firmographics,
        scores.bant,
        scores.intent,
        scores.total,
        scores.classification,
        scores.priority
      );

    } catch (error) {
      console.error(' [SCORING] Erro ao salvar score:', error);
    }
  }

  /**
   * Obtém score atual do lead
   */
  async getLeadScore(contactId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const score = db.prepare(`
        SELECT * FROM lead_scores WHERE contact_id = ?
      `).get(contactId);

      return score || null;
    } catch (error) {
      console.error(' [SCORING] Erro ao buscar score:', error);
      return null;
    }
  }

  /**
   * Registra atividade do lead
   */
  async recordActivity(contactId, activityType, activityValue, points = 0) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO lead_activities (contact_id, activity_type, activity_value, points_awarded)
        VALUES (?, ?, ?, ?)
      `).run(contactId, activityType, activityValue, points);

      console.log(` [SCORING] Atividade registrada: ${activityType} (+${points} pontos)`);
    } catch (error) {
      console.error(' [SCORING] Erro ao registrar atividade:', error);
    }
  }

  /**
   * Lista leads por classificação
   */
  async getLeadsByClassification(classification) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      return db.prepare(`
        SELECT * FROM lead_scores
        WHERE classification = ?
        ORDER BY total_score DESC, last_activity DESC
      `).all(classification);
    } catch (error) {
      console.error(' [SCORING] Erro ao buscar leads:', error);
      return [];
    }
  }

  /**
   * Lista leads prioritários (SQL + MQL)
   */
  async getHighPriorityLeads() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      return db.prepare(`
        SELECT * FROM lead_scores
        WHERE classification IN ('SQL', 'MQL')
        ORDER BY
          CASE classification
            WHEN 'SQL' THEN 1
            WHEN 'MQL' THEN 2
          END,
          total_score DESC,
          last_activity DESC
        LIMIT 50
      `).all();
    } catch (error) {
      console.error(' [SCORING] Erro ao buscar leads prioritários:', error);
      return [];
    }
  }

  // Métodos auxiliares para breakdown
  getBehaviorBreakdown(context) {
    return {
      responseSpeed: context.avgResponseTime || 0,
      messageCount: context.messageCount || 0,
      engagementLevel: context.engagementSignals?.length || 0
    };
  }

  getFirmographicsBreakdown(context) {
    return {
      industry: context.industry || 'unknown',
      companySize: context.companySize || 'unknown',
      location: context.location || 'unknown'
    };
  }

  getIntentBreakdown(context) {
    const messages = context.recentMessages || [];
    const allText = messages.map(m => m.text?.toLowerCase() || '').join(' ');

    return {
      highIntentSignals: this.intentSignals.HIGH.filter(s => allText.includes(s)),
      mediumIntentSignals: this.intentSignals.MEDIUM.filter(s => allText.includes(s))
    };
  }
}

// Singleton
const leadScoringSystem = new LeadScoringSystem();
export default leadScoringSystem;
