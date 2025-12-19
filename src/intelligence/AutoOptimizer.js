/**
 * @file AutoOptimizer.js
 * @description Sistema de Auto-Otimizacao para Nivel 5 de Maturidade
 *
 * NIVEL 5: AUTO-OTIMIZACAO ATIVA
 * - Analisa padroes de abandono e sucesso automaticamente
 * - Cria experimentos A/B baseados em insights
 * - Ajusta thresholds e comportamentos em tempo real
 * - Detecta risco de abandono e sugere acoes
 * - Promove prompts vencedores automaticamente
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';
import { getFeedbackLoop } from './FeedbackLoop.js';
import { getPromptAdaptationSystem } from './PromptAdaptationSystem.js';
import { getOutcomeTracker } from './ConversationOutcomeTracker.js';

// Singleton
let instance = null;

// Configuracao
const CONFIG = {
  // Intervalo de analise (4 horas)
  ANALYSIS_INTERVAL_MS: 4 * 60 * 60 * 1000,

  // Minimo de outcomes para auto-otimizar
  MIN_OUTCOMES_FOR_OPTIMIZATION: 20,

  // Threshold de abandono para criar experimento (30%)
  ABANDONMENT_THRESHOLD_PERCENT: 30,

  // Minimo de abandonos no mesmo stage para criar experimento
  MIN_ABANDONMENTS_FOR_EXPERIMENT: 5,

  // Taxa de sucesso minima para considerar "saudavel"
  HEALTHY_SUCCESS_RATE: 40,

  // Intervalo de deteccao de risco em tempo real (desativado por padrao)
  RISK_DETECTION_ENABLED: true
};

/**
 * AutoOptimizer
 * Motor de auto-otimizacao que conecta FeedbackLoop + PromptAdaptation
 */
export class AutoOptimizer {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    this.feedbackLoop = getFeedbackLoop();
    this.promptAdaptation = getPromptAdaptationSystem();
    this.outcomeTracker = getOutcomeTracker();

    this.isRunning = false;
    this.lastAnalysis = null;
    this.optimizationHistory = [];

    this.initDatabase();
    console.log(' [AUTO-OPTIMIZER] Inicializado');
  }

  /**
   * Inicializa tabelas para auto-otimizacao
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS auto_optimizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        optimization_type TEXT NOT NULL,
        target_stage TEXT,
        action_taken TEXT NOT NULL,
        reason TEXT,
        metrics_before TEXT,
        metrics_after TEXT,
        status TEXT DEFAULT 'applied',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS stage_health (
        stage TEXT PRIMARY KEY,
        total_conversations INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        abandoned_count INTEGER DEFAULT 0,
        opt_out_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        abandonment_rate REAL DEFAULT 0,
        health_score INTEGER DEFAULT 100,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' [AUTO-OPTIMIZER] Database initialized');
  }

  /**
   * INICIAR auto-otimizacao periodica
   */
  start() {
    if (this.isRunning) {
      console.log(' [AUTO-OPTIMIZER] Ja esta rodando');
      return;
    }

    this.isRunning = true;
    console.log(` [AUTO-OPTIMIZER] Iniciando (intervalo: ${CONFIG.ANALYSIS_INTERVAL_MS / 1000 / 60} min)`);

    // Rodar primeira analise apos 30 segundos
    setTimeout(() => this.runOptimizationCycle(), 30000);

    // Agendar analises periodicas
    this.analysisInterval = setInterval(
      () => this.runOptimizationCycle(),
      CONFIG.ANALYSIS_INTERVAL_MS
    );
  }

  /**
   * PARAR auto-otimizacao
   */
  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.isRunning = false;
    console.log(' [AUTO-OPTIMIZER] Parado');
  }

  /**
   * CICLO DE OTIMIZACAO
   * Analisa dados e toma acoes automaticas
   */
  async runOptimizationCycle() {
    console.log(' [AUTO-OPTIMIZER] Iniciando ciclo de otimizacao...');

    try {
      // 1. Atualizar metricas de saude por stage
      await this._updateStageHealth();

      // 2. Identificar stages problematicos
      const problematicStages = await this._identifyProblematicStages();

      // 3. Para cada stage problematico, tomar acao
      for (const stage of problematicStages) {
        await this._optimizeStage(stage);
      }

      // 4. Verificar experimentos A/B que precisam ser promovidos
      await this._promoteWinningExperiments();

      // 5. Gerar insights automaticos
      await this._generateAutoInsights();

      this.lastAnalysis = new Date().toISOString();

      console.log(` [AUTO-OPTIMIZER] Ciclo concluido. Stages otimizados: ${problematicStages.length}`);

      return {
        success: true,
        stagesOptimized: problematicStages.length,
        timestamp: this.lastAnalysis
      };

    } catch (error) {
      console.error(' [AUTO-OPTIMIZER] Erro no ciclo:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ATUALIZAR SAUDE DOS STAGES
   */
  async _updateStageHealth() {
    const stages = ['need', 'budget', 'authority', 'timing', 'closing', 'sdr', 'specialist', 'scheduler'];

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    for (const stage of stages) {
      try {
        const metrics = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as abandoned,
            SUM(CASE WHEN outcome = 'opt_out' THEN 1 ELSE 0 END) as opt_out
          FROM conversation_outcomes
          WHERE final_stage = ? OR abandonment_point = ?
        `).get(stage, stage);

        if (metrics.total === 0) continue;

        const successRate = (metrics.success / metrics.total) * 100;
        const abandonmentRate = (metrics.abandoned / metrics.total) * 100;

        // Health score: 100 - (abandonment_rate * 2) + (success_rate * 0.5)
        const healthScore = Math.max(0, Math.min(100,
          100 - (abandonmentRate * 2) + (successRate * 0.5)
        ));

        db.prepare(`
          INSERT INTO stage_health (stage, total_conversations, success_count, abandoned_count, opt_out_count, success_rate, abandonment_rate, health_score, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(stage) DO UPDATE SET
            total_conversations = excluded.total_conversations,
            success_count = excluded.success_count,
            abandoned_count = excluded.abandoned_count,
            opt_out_count = excluded.opt_out_count,
            success_rate = excluded.success_rate,
            abandonment_rate = excluded.abandonment_rate,
            health_score = excluded.health_score,
            last_updated = CURRENT_TIMESTAMP
        `).run(
          stage,
          metrics.total,
          metrics.success,
          metrics.abandoned,
          metrics.opt_out,
          Math.round(successRate * 100) / 100,
          Math.round(abandonmentRate * 100) / 100,
          Math.round(healthScore)
        );

      } catch (error) {
        console.error(` [AUTO-OPTIMIZER] Erro ao atualizar saude de ${stage}:`, error.message);
      }
    }

    console.log(' [AUTO-OPTIMIZER] Saude dos stages atualizada');
  }

  /**
   * IDENTIFICAR STAGES PROBLEMATICOS
   */
  async _identifyProblematicStages() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const problematic = db.prepare(`
      SELECT * FROM stage_health
      WHERE (abandonment_rate > ? OR health_score < 50)
      AND total_conversations >= ?
      ORDER BY health_score ASC
    `).all(CONFIG.ABANDONMENT_THRESHOLD_PERCENT, CONFIG.MIN_OUTCOMES_FOR_OPTIMIZATION);

    console.log(` [AUTO-OPTIMIZER] Encontrados ${problematic.length} stages problematicos`);

    return problematic;
  }

  /**
   * OTIMIZAR STAGE PROBLEMATICO
   */
  async _optimizeStage(stageData) {
    const { stage, abandonment_rate, success_rate, health_score } = stageData;

    console.log(` [AUTO-OPTIMIZER] Otimizando stage: ${stage} (health: ${health_score})`);

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // 1. Verificar se ja existe experimento ativo para este stage
    const existingExperiment = db.prepare(`
      SELECT * FROM ab_experiments
      WHERE stage = ? AND status = 'running'
    `).get(stage);

    if (existingExperiment) {
      console.log(` [AUTO-OPTIMIZER] Experimento ja ativo para ${stage} - aguardando resultado`);
      return;
    }

    // 2. Buscar padroes de abandono deste stage
    const abandonmentPatterns = db.prepare(`
      SELECT * FROM abandonment_patterns
      WHERE trigger_stage = ? AND status = 'active'
      ORDER BY frequency DESC
      LIMIT 3
    `).all(stage);

    if (abandonmentPatterns.length === 0) {
      console.log(` [AUTO-OPTIMIZER] Sem padroes de abandono para ${stage} - apenas monitorando`);
      return;
    }

    // 3. Criar experimento A/B automatico
    const mainPattern = abandonmentPatterns[0];

    try {
      // Prompt A: Atual (baseline)
      const promptA = this._getCurrentPromptForStage(stage);

      // Prompt B: Otimizado baseado no padrao de abandono
      const promptB = await this._generateOptimizedPrompt(stage, mainPattern);

      // Criar experimento
      const experimentName = `auto_opt_${stage}_${Date.now()}`;
      const result = await this.promptAdaptation.createExperiment(
        experimentName,
        stage,
        promptA,
        promptB
      );

      // Registrar otimizacao
      this._recordOptimization({
        type: 'auto_experiment',
        stage,
        action: `Criado experimento A/B: ${experimentName}`,
        reason: `Abandonment rate ${abandonment_rate}% (threshold: ${CONFIG.ABANDONMENT_THRESHOLD_PERCENT}%)`,
        metricsBefore: { abandonment_rate, success_rate, health_score }
      });

      console.log(` [AUTO-OPTIMIZER] Experimento criado para ${stage}: ${experimentName}`);

    } catch (error) {
      console.error(` [AUTO-OPTIMIZER] Erro ao criar experimento para ${stage}:`, error.message);
    }
  }

  /**
   * PROMOVER EXPERIMENTOS VENCEDORES
   */
  async _promoteWinningExperiments() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Buscar experimentos completados nao promovidos
    const completed = db.prepare(`
      SELECT * FROM ab_experiments
      WHERE status = 'completed'
      AND winner IS NOT NULL
    `).all();

    for (const exp of completed) {
      console.log(` [AUTO-OPTIMIZER] Promovendo vencedor do experimento: ${exp.experiment_name}`);

      // Marcar como promovido
      db.prepare(`
        UPDATE ab_experiments SET status = 'promoted' WHERE id = ?
      `).run(exp.id);

      // Registrar otimizacao
      this._recordOptimization({
        type: 'prompt_promotion',
        stage: exp.stage,
        action: `Promovido prompt vencedor: ${exp.winner}`,
        reason: `Confianca: ${exp.confidence}%`
      });
    }
  }

  /**
   * GERAR INSIGHTS AUTOMATICOS
   */
  async _generateAutoInsights() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Insight 1: Stages com queda de performance
      const declining = db.prepare(`
        SELECT stage, health_score
        FROM stage_health
        WHERE health_score < 60
        ORDER BY health_score ASC
        LIMIT 3
      `).all();

      if (declining.length > 0) {
        const description = `Stages com saude baixa: ${declining.map(s => `${s.stage}(${s.health_score})`).join(', ')}`;

        db.prepare(`
          INSERT INTO feedback_insights (insight_type, insight_category, description, frequency, impact_score, recommendation)
          VALUES ('auto_insight', 'health_alert', ?, 1, 90, 'Revisar abordagem nestes stages')
        `).run(description);

        console.log(` [AUTO-OPTIMIZER] Insight gerado: ${description}`);
      }

      // Insight 2: Padroes de abandono repetidos
      const frequentPatterns = db.prepare(`
        SELECT pattern_name, trigger_stage, frequency
        FROM abandonment_patterns
        WHERE frequency >= 5 AND status = 'active'
        ORDER BY frequency DESC
        LIMIT 3
      `).all();

      if (frequentPatterns.length > 0) {
        for (const pattern of frequentPatterns) {
          const description = `Padrao de abandono frequente em ${pattern.trigger_stage}: ${pattern.pattern_name} (${pattern.frequency}x)`;

          // Verificar se insight ja existe
          const existing = db.prepare(`
            SELECT id FROM feedback_insights
            WHERE description = ? AND created_at >= datetime('now', '-24 hours')
          `).get(description);

          if (!existing) {
            db.prepare(`
              INSERT INTO feedback_insights (insight_type, insight_category, description, frequency, impact_score, recommendation)
              VALUES ('auto_insight', 'abandonment_pattern', ?, ?, 85, 'Considerar ajuste no prompt ou abordagem')
            `).run(description, pattern.frequency);
          }
        }
      }

    } catch (error) {
      console.error(' [AUTO-OPTIMIZER] Erro ao gerar insights:', error.message);
    }
  }

  /**
   * DETECTAR RISCO DE ABANDONO EM TEMPO REAL
   * Chamado durante conversa para sugerir ajustes
   */
  async detectRiskAndSuggest(contactId, currentStage, lastUserMessage, leadState = {}) {
    if (!CONFIG.RISK_DETECTION_ENABLED) {
      return { atRisk: false };
    }

    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // 1. Verificar saude do stage atual
      const stageHealth = db.prepare(`
        SELECT * FROM stage_health WHERE stage = ?
      `).get(currentStage);

      // 2. Usar FeedbackLoop para detectar risco
      const riskAnalysis = await this.feedbackLoop.detectAbandonmentRisk(
        contactId,
        currentStage,
        lastUserMessage
      );

      // 3. Enriquecer com dados de saude do stage
      if (stageHealth && stageHealth.health_score < 50) {
        riskAnalysis.stageRisk = 'high';
        riskAnalysis.stageHealthScore = stageHealth.health_score;
      }

      // 4. Se em risco, buscar sugestao do PromptAdaptation
      if (riskAnalysis.atRisk) {
        const suggestion = await this._getSuggestionForRisk(currentStage, riskAnalysis);
        riskAnalysis.suggestion = suggestion;

        console.log(` [AUTO-OPTIMIZER] Risco detectado para ${contactId} em ${currentStage}`);
      }

      return riskAnalysis;

    } catch (error) {
      console.error(' [AUTO-OPTIMIZER] Erro ao detectar risco:', error.message);
      return { atRisk: false, error: error.message };
    }
  }

  /**
   * OBTER SUGESTAO PARA RISCO
   */
  async _getSuggestionForRisk(stage, riskAnalysis) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Buscar padrao de abandono mais frequente
    const topPattern = db.prepare(`
      SELECT suggested_fix FROM abandonment_patterns
      WHERE trigger_stage = ? AND status = 'active'
      ORDER BY frequency DESC
      LIMIT 1
    `).get(stage);

    if (topPattern) {
      return {
        action: 'adjust_approach',
        suggestion: topPattern.suggested_fix,
        source: 'abandonment_pattern'
      };
    }

    // Sugestoes genericas por risco
    const suggestions = {
      high: 'Mudar abordagem imediatamente. Oferecer alternativa ou simplificar.',
      medium: 'Considerar mudar tom ou oferecer mais contexto.',
      low: 'Monitorar sinais de desengajamento.'
    };

    return {
      action: 'monitor',
      suggestion: suggestions[riskAnalysis.riskLevel] || suggestions.low,
      source: 'default'
    };
  }

  /**
   * OBTER PROMPT ATUAL DO STAGE
   */
  _getCurrentPromptForStage(stage) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Buscar prompt campeao ou padrao
    const champion = db.prepare(`
      SELECT prompt_text FROM prompt_variations
      WHERE stage = ? AND is_active = 1
      ORDER BY id DESC
      LIMIT 1
    `).get(stage);

    if (champion) {
      return champion.prompt_text;
    }

    // Prompts padrao
    const defaults = {
      need: `Voce e um SDR consultivo. Seu objetivo e entender a necessidade/dor do lead de forma natural e empática. Faca perguntas abertas.`,
      budget: `Voce e um SDR consultivo. Foque em entender o investimento disponivel do lead sem ser direto demais. Use abordagem consultiva.`,
      authority: `Voce e um SDR consultivo. Descubra quem participa das decisoes de forma natural. Pergunte sobre o processo de avaliacao.`,
      timing: `Voce e um SDR consultivo. Entenda a urgencia e timing do lead. Pergunte sobre prazos e prioridades.`,
      closing: `Voce e um SDR consultivo. Conduza para o agendamento de forma natural, destacando valor.`,
      sdr: `Voce e um SDR consultivo especializado em qualificacao BANT. Conduza a conversa de forma profissional.`,
      specialist: `Voce e um especialista de produto. Responda duvidas tecnicas com profundidade.`,
      scheduler: `Voce e responsavel por agendar reunioes. Seja eficiente e ofereca opcoes claras.`
    };

    return defaults[stage] || defaults.sdr;
  }

  /**
   * GERAR PROMPT OTIMIZADO
   */
  async _generateOptimizedPrompt(stage, abandonmentPattern) {
    const basePrompt = this._getCurrentPromptForStage(stage);

    // Adicionar instrucoes baseadas no padrao de abandono
    const optimization = `

IMPORTANTE - Evite este padrao de abandono:
- Padrao identificado: ${abandonmentPattern.pattern_name}
- Correcao sugerida: ${abandonmentPattern.suggested_fix}

Ajuste sua abordagem para ser mais:
- Empático e menos pressionador
- Focado em valor antes de pedir informacoes
- Flexivel com alternativas quando encontrar resistencia
`;

    return basePrompt + optimization;
  }

  /**
   * REGISTRAR OTIMIZACAO
   */
  _recordOptimization(data) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    db.prepare(`
      INSERT INTO auto_optimizations (optimization_type, target_stage, action_taken, reason, metrics_before)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.type,
      data.stage,
      data.action,
      data.reason,
      JSON.stringify(data.metricsBefore || {})
    );

    this.optimizationHistory.push({
      ...data,
      timestamp: new Date().toISOString()
    });

    // Manter apenas ultimas 100 otimizacoes na memoria
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100);
    }
  }

  /**
   * OBTER STATUS DO OPTIMIZER
   */
  getStatus() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const stageHealth = db.prepare(`
      SELECT * FROM stage_health ORDER BY health_score ASC
    `).all();

    const recentOptimizations = db.prepare(`
      SELECT * FROM auto_optimizations
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    const activeExperiments = db.prepare(`
      SELECT COUNT(*) as count FROM ab_experiments WHERE status = 'running'
    `).get();

    const totalOutcomes = db.prepare(`
      SELECT COUNT(*) as count FROM conversation_outcomes
    `).get();

    return {
      isRunning: this.isRunning,
      lastAnalysis: this.lastAnalysis,
      stageHealth,
      recentOptimizations,
      activeExperiments: activeExperiments?.count || 0,
      totalOutcomes: totalOutcomes?.count || 0,
      maturityLevel: this._calculateMaturityLevel(totalOutcomes?.count || 0, activeExperiments?.count || 0),
      config: CONFIG
    };
  }

  /**
   * CALCULAR NIVEL DE MATURIDADE
   */
  _calculateMaturityLevel(totalOutcomes, activeExperiments) {
    if (totalOutcomes >= 100 && activeExperiments > 0 && this.isRunning) {
      return 5; // Auto-otimizacao ativa
    }
    if (totalOutcomes >= 50) {
      return 4; // Dados usados para aprendizado
    }
    if (totalOutcomes >= 10) {
      return 3; // Dados coletados
    }
    if (totalOutcomes > 0) {
      return 2; // Inicio de coleta
    }
    return 1; // Sem dados
  }
}

// Singleton getter
export function getAutoOptimizer() {
  if (!instance) {
    instance = new AutoOptimizer();
  }
  return instance;
}

export default AutoOptimizer;
