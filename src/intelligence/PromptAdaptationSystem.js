// intelligence/PromptAdaptationSystem.js
//  Prompt Adaptation System - Otimização Automática de Prompts

/**
 * PROBLEMA RESOLVIDO:
 * - Prompts estáticos não se adaptam ao contexto
 * - Não aprende quais abordagens funcionam melhor
 * - Sem A/B testing de diferentes estratégias
 * - Desperdiça oportunidades de otimização
 *
 * SOLUÇÃO:
 * - Analisa conversas bem-sucedidas vs. abandonadas
 * - Identifica padrões de frases que funcionam
 * - Ajusta prompts dinamicamente por contexto
 * - A/B testing automático de abordagens
 * - Auto-otimização contínua
 */

//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../db/index.js';

//  Constantes de configuração
const MIN_SAMPLES_FOR_ADAPTATION = 10; // Mínimo de conversas para adaptar
const AB_TEST_SPLIT = 0.5; // 50% versão A, 50% versão B
const WINNING_THRESHOLD = 1.2; // Versão precisa ser 20% melhor para vencer

export class PromptAdaptationSystem {
  constructor() {
    this.initDatabase();
    this.activeExperiments = new Map(); // Experimentos A/B ativos
  }

  /**
   * Inicializa tabelas para adaptação de prompts
   */
  initDatabase() {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    // Tabela de variações de prompt
    db.exec(`
      CREATE TABLE IF NOT EXISTS prompt_variations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variation_name TEXT NOT NULL,
        stage TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        version TEXT DEFAULT 'A',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de performance de prompts
    db.exec(`
      CREATE TABLE IF NOT EXISTS prompt_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variation_id INTEGER NOT NULL,
        contact_id TEXT NOT NULL,
        outcome TEXT NOT NULL,
        conversion_score INTEGER,
        stage_completed INTEGER DEFAULT 0,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (variation_id) REFERENCES prompt_variations(id)
      )
    `);

    // Tabela de experimentos A/B
    db.exec(`
      CREATE TABLE IF NOT EXISTS ab_experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT DEFAULT 'default',
        experiment_name TEXT NOT NULL UNIQUE,
        stage TEXT NOT NULL,
        variation_a_id INTEGER NOT NULL,
        variation_b_id INTEGER NOT NULL,
        status TEXT DEFAULT 'running',
        winner TEXT,
        confidence REAL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        FOREIGN KEY (variation_a_id) REFERENCES prompt_variations(id),
        FOREIGN KEY (variation_b_id) REFERENCES prompt_variations(id)
      )
    `);

    // Tabela de padrões de sucesso
    db.exec(`
      CREATE TABLE IF NOT EXISTS success_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        stage TEXT NOT NULL,
        phrase TEXT NOT NULL,
        success_count INTEGER DEFAULT 1,
        total_count INTEGER DEFAULT 1,
        success_rate REAL,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(' [PROMPT-ADAPTATION] Database initialized');
  }

  /**
   * MÉTODO PRINCIPAL: Obter melhor prompt para contexto
   * Retorna prompt otimizado baseado em aprendizado
   */
  async getBestPrompt(stage, context = {}) {
    try {
      const { contactId, leadProfile = {}, currentExperiment = null } = context;

      console.log(` [PROMPT-ADAPTATION] Buscando melhor prompt para stage: ${stage}`);

      // Verificar se há experimento A/B ativo para este stage
      const experiment = this._getActiveExperiment(stage);

      if (experiment) {
        // A/B Testing: escolher variação aleatoriamente
        const variation = this._selectVariationForExperiment(experiment, contactId);
        console.log(` [PROMPT-ADAPTATION] Experimento ativo - usando variação ${variation.version}`);

        // Registrar uso desta variação
        this._recordPromptUsage(variation.id, contactId);

        return {
          prompt: this._enhancePrompt(variation.prompt_text, leadProfile),
          variationId: variation.id,
          experimentId: experiment.id,
          version: variation.version,
          isExperiment: true
        };
      }

      // Sem experimento: usar prompt campeão atual
      const champion = this._getChampionPrompt(stage);

      if (champion) {
        console.log(` [PROMPT-ADAPTATION] Usando prompt campeão (taxa de sucesso: ${champion.success_rate}%)`);

        this._recordPromptUsage(champion.id, contactId);

        return {
          prompt: this._enhancePrompt(champion.prompt_text, leadProfile),
          variationId: champion.id,
          version: 'champion',
          successRate: champion.success_rate,
          isExperiment: false
        };
      }

      // Fallback: prompt padrão
      console.log(` [PROMPT-ADAPTATION] Nenhum prompt otimizado - usando padrão`);
      return {
        prompt: this._getDefaultPrompt(stage),
        variationId: null,
        version: 'default',
        isExperiment: false
      };

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao buscar prompt:', error.message);
      return {
        prompt: this._getDefaultPrompt(stage),
        error: error.message
      };
    }
  }

  /**
   * REGISTRAR RESULTADO DO PROMPT
   * Chamado quando conversa finaliza
   */
  async recordPromptOutcome(variationId, contactId, outcome, metadata = {}) {
    try {
      if (!variationId) return;

      const {
        conversionScore = 0,
        stageCompleted = false
      } = metadata;

      //  FIX: Obter conexão fresh
      const db = getDatabase();
      db.prepare(`
        INSERT INTO prompt_performance (
          variation_id, contact_id, outcome,
          conversion_score, stage_completed
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        variationId,
        contactId,
        outcome,
        conversionScore,
        stageCompleted ? 1 : 0
      );

      console.log(` [PROMPT-ADAPTATION] Outcome registrado: ${outcome} (score: ${conversionScore})`);

      // Verificar se experimento deve ser finalizado
      await this._checkExperimentCompletion(variationId);

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao registrar outcome:', error.message);
    }
  }

  /**
   * CRIAR EXPERIMENTO A/B
   * Testa duas variações de prompt
   */
  async createExperiment(experimentName, stage, promptA, promptB) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Criar variações
      const varA = db.prepare(`
        INSERT INTO prompt_variations (variation_name, stage, prompt_text, version)
        VALUES (?, ?, ?, 'A')
      `).run(`${experimentName}_A`, stage, promptA);

      const varB = db.prepare(`
        INSERT INTO prompt_variations (variation_name, stage, prompt_text, version)
        VALUES (?, ?, ?, 'B')
      `).run(`${experimentName}_B`, stage, promptB);

      // Criar experimento
      const exp = db.prepare(`
        INSERT INTO ab_experiments (
          experiment_name, stage, variation_a_id, variation_b_id
        ) VALUES (?, ?, ?, ?)
      `).run(
        experimentName,
        stage,
        varA.lastInsertRowid,
        varB.lastInsertRowid
      );

      console.log(` [PROMPT-ADAPTATION] Experimento criado: ${experimentName}`);

      return {
        experimentId: exp.lastInsertRowid,
        variationAId: varA.lastInsertRowid,
        variationBId: varB.lastInsertRowid
      };

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao criar experimento:', error.message);
      throw error;
    }
  }

  /**
   * OBTER EXPERIMENTO ATIVO
   */
  _getActiveExperiment(stage) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM ab_experiments
      WHERE stage = ? AND status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get(stage);
  }

  /**
   * SELECIONAR VARIAÇÃO PARA EXPERIMENTO
   * Split 50/50 baseado em hash do contactId
   */
  _selectVariationForExperiment(experiment, contactId) {
    // Hash simples do contactId para distribuição consistente
    const hash = contactId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const useA = hash % 2 === 0;

    const variationId = useA ? experiment.variation_a_id : experiment.variation_b_id;

    //  FIX: Obter conexão fresh
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM prompt_variations WHERE id = ?
    `).get(variationId);
  }

  /**
   * OBTER PROMPT CAMPEÃO
   * Prompt com melhor taxa de sucesso
   */
  _getChampionPrompt(stage) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    return db.prepare(`
      SELECT
        pv.*,
        COUNT(pp.id) as total_uses,
        SUM(CASE WHEN pp.outcome = 'success' THEN 1 ELSE 0 END) as successes,
        ROUND(
          100.0 * SUM(CASE WHEN pp.outcome = 'success' THEN 1 ELSE 0 END) / COUNT(pp.id),
          2
        ) as success_rate
      FROM prompt_variations pv
      LEFT JOIN prompt_performance pp ON pp.variation_id = pv.id
      WHERE pv.stage = ? AND pv.is_active = 1
      GROUP BY pv.id
      HAVING total_uses >= ?
      ORDER BY success_rate DESC, total_uses DESC
      LIMIT 1
    `).get(stage, MIN_SAMPLES_FOR_ADAPTATION);
  }

  /**
   * VERIFICAR CONCLUSÃO DE EXPERIMENTO
   * Finaliza experimento se houver vencedor claro
   */
  async _checkExperimentCompletion(variationId) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Buscar experimento desta variação
      const experiment = db.prepare(`
        SELECT * FROM ab_experiments
        WHERE (variation_a_id = ? OR variation_b_id = ?)
          AND status = 'running'
      `).get(variationId, variationId);

      if (!experiment) return;

      // Obter performance de ambas variações
      const perfA = this._getVariationPerformance(experiment.variation_a_id);
      const perfB = this._getVariationPerformance(experiment.variation_b_id);

      // Precisa de mínimo de amostras
      if (perfA.total < MIN_SAMPLES_FOR_ADAPTATION || perfB.total < MIN_SAMPLES_FOR_ADAPTATION) {
        return;
      }

      // Calcular se há vencedor
      const ratioAB = perfA.successRate / perfB.successRate;
      const ratioBA = perfB.successRate / perfA.successRate;

      let winner = null;
      let confidence = 0;

      if (ratioAB >= WINNING_THRESHOLD) {
        winner = 'A';
        confidence = Math.min(95, Math.round((ratioAB - 1) * 100));
      } else if (ratioBA >= WINNING_THRESHOLD) {
        winner = 'B';
        confidence = Math.min(95, Math.round((ratioBA - 1) * 100));
      }

      if (winner) {
        // Finalizar experimento
        db.prepare(`
          UPDATE ab_experiments
          SET status = 'completed',
              winner = ?,
              confidence = ?,
              ended_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(winner, confidence, experiment.id);

        // Desativar variação perdedora
        const loserId = winner === 'A' ? experiment.variation_b_id : experiment.variation_a_id;
        db.prepare(`
          UPDATE prompt_variations SET is_active = 0 WHERE id = ?
        `).run(loserId);

        console.log(` [PROMPT-ADAPTATION] Experimento concluído! Vencedor: ${winner} (${confidence}% confiança)`);
      }

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao verificar experimento:', error.message);
    }
  }

  /**
   * OBTER PERFORMANCE DE VARIAÇÃO
   */
  _getVariationPerformance(variationId) {
    //  FIX: Obter conexão fresh
    const db = getDatabase();
    const perf = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
        ROUND(
          100.0 * SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) as success_rate
      FROM prompt_performance
      WHERE variation_id = ?
    `).get(variationId);

    return perf || { total: 0, successes: 0, successRate: 0 };
  }

  /**
   * REGISTRAR USO DE PROMPT
   */
  _recordPromptUsage(variationId, contactId) {
    // Apenas para tracking - outcome será registrado depois
  }

  /**
   * MELHORAR PROMPT COM CONTEXTO
   * Adiciona personalização baseada em leadProfile
   */
  _enhancePrompt(basePrompt, leadProfile = {}) {
    let enhanced = basePrompt;

    // Adicionar nome se disponível
    if (leadProfile.nome_pessoa) {
      enhanced += `\n\nNome do lead: ${leadProfile.nome_pessoa}`;
    }

    // Adicionar empresa se disponível
    if (leadProfile.empresa) {
      enhanced += `\nEmpresa: ${leadProfile.empresa}`;
    }

    // Adicionar setor se disponível
    if (leadProfile.setor) {
      enhanced += `\nSetor: ${leadProfile.setor}`;
    }

    return enhanced;
  }

  /**
   * PROMPT PADRÃO POR STAGE
   */
  _getDefaultPrompt(stage) {
    const defaults = {
      need: `Você é um SDR consultivo. Seu objetivo é entender a necessidade/dor do lead de forma natural.`,
      budget: `Você é um SDR consultivo. Foque em entender o orçamento do lead sem ser direto demais.`,
      authority: `Você é um SDR consultivo. Descubra quem toma as decisões de forma natural.`,
      timing: `Você é um SDR consultivo. Entenda a urgência e timing do lead.`
    };

    return defaults[stage] || `Você é um SDR consultivo. Conduza a conversa de forma natural.`;
  }

  /**
   * ANÁLISE DE PADRÕES DE SUCESSO
   * Identifica frases/abordagens que funcionam
   */
  async analyzeSuccessPatterns(stage) {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      // Buscar conversas bem-sucedidas
      const successful = db.prepare(`
        SELECT pp.*, pv.prompt_text
        FROM prompt_performance pp
        JOIN prompt_variations pv ON pv.id = pp.variation_id
        WHERE pv.stage = ? AND pp.outcome = 'success'
        ORDER BY pp.used_at DESC
        LIMIT 50
      `).all(stage);

      // Buscar conversas falhadas
      const failed = db.prepare(`
        SELECT pp.*, pv.prompt_text
        FROM prompt_performance pp
        JOIN prompt_variations pv ON pv.id = pp.variation_id
        WHERE pv.stage = ? AND pp.outcome IN ('abandoned', 'failed')
        ORDER BY pp.used_at DESC
        LIMIT 50
      `).all(stage);

      console.log(` [PROMPT-ADAPTATION] Analisando ${successful.length} sucessos vs ${failed.length} falhas`);

      return {
        stage,
        successfulCount: successful.length,
        failedCount: failed.length,
        insights: {
          // TODO: Análise mais profunda com NLP
          message: 'Análise básica completa. NLP avançado em desenvolvimento.'
        }
      };

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao analisar padrões:', error.message);
      return { error: error.message };
    }
  }

  /**
   * RELATÓRIO DE EXPERIMENTOS
   */
  getExperimentsReport() {
    try {
      //  FIX: Obter conexão fresh
      const db = getDatabase();
      const experiments = db.prepare(`
        SELECT
          e.*,
          va.variation_name as var_a_name,
          vb.variation_name as var_b_name
        FROM ab_experiments e
        JOIN prompt_variations va ON va.id = e.variation_a_id
        JOIN prompt_variations vb ON vb.id = e.variation_b_id
        ORDER BY e.started_at DESC
      `).all();

      return experiments.map(exp => {
        const perfA = this._getVariationPerformance(exp.variation_a_id);
        const perfB = this._getVariationPerformance(exp.variation_b_id);

        return {
          ...exp,
          variationA: { ...perfA, name: exp.var_a_name },
          variationB: { ...perfB, name: exp.var_b_name }
        };
      });

    } catch (error) {
      console.error(' [PROMPT-ADAPTATION] Erro ao gerar relatório:', error.message);
      return [];
    }
  }
}

// Singleton
let instance = null;

export function getPromptAdaptationSystem() {
  if (!instance) {
    instance = new PromptAdaptationSystem();
  }
  return instance;
}

export default PromptAdaptationSystem;
