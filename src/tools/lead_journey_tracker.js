// src/tools/lead_journey_tracker.js
// Sistema de tracking de jornada do lead no funil de vendas

import { db } from '../memory.js';

/**
 * LEAD JOURNEY TRACKER
 *
 * Rastreia a jornada do lead através dos estágios do funil:
 * DISCOVERY → QUALIFICATION → INTEREST → DEMO → PROPOSAL → NEGOTIATION → CLOSED_WON/CLOSED_LOST
 */

export class LeadJourneyTracker {
  constructor() {
    this.initDatabase();

    // Estágios do funil de vendas
    this.stages = {
      DISCOVERY: {
        name: 'Descoberta',
        description: 'Lead inicial, coletando informações básicas',
        nextStages: ['QUALIFICATION', 'DISQUALIFIED'],
        triggers: ['primeira_mensagem', 'lead_novo']
      },
      QUALIFICATION: {
        name: 'Qualificação',
        description: 'Aplicando BANT, identificando fit',
        nextStages: ['INTEREST', 'NURTURE', 'DISQUALIFIED'],
        triggers: ['bant_iniciado', 'icp_identificado']
      },
      INTEREST: {
        name: 'Interesse',
        description: 'Lead demonstrou interesse, fazendo perguntas',
        nextStages: ['DEMO', 'NURTURE'],
        triggers: ['pergunta_preco', 'pergunta_funcionalidade', 'quer_saber_mais']
      },
      DEMO: {
        name: 'Demonstração',
        description: 'Demo agendada ou em andamento',
        nextStages: ['PROPOSAL', 'INTEREST'],
        triggers: ['demo_agendada', 'demo_realizada']
      },
      PROPOSAL: {
        name: 'Proposta',
        description: 'Proposta comercial enviada',
        nextStages: ['NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'],
        triggers: ['proposta_enviada']
      },
      NEGOTIATION: {
        name: 'Negociação',
        description: 'Negociando termos, preço, condições',
        nextStages: ['CLOSED_WON', 'CLOSED_LOST', 'PROPOSAL'],
        triggers: ['negociando_preco', 'objecao_respondida']
      },
      CLOSED_WON: {
        name: 'Ganho',
        description: 'Deal fechado com sucesso',
        nextStages: [],
        triggers: ['contrato_assinado', 'pagamento_confirmado']
      },
      CLOSED_LOST: {
        name: 'Perdido',
        description: 'Lead perdido',
        nextStages: ['NURTURE'],
        triggers: ['nao_interessa', 'sem_budget', 'escolheu_concorrente']
      },
      NURTURE: {
        name: 'Nutrição',
        description: 'Lead não pronto, manter contato',
        nextStages: ['QUALIFICATION', 'INTEREST'],
        triggers: ['nao_agora', 'reaproximacao']
      },
      DISQUALIFIED: {
        name: 'Desqualificado',
        description: 'Não é fit para o produto',
        nextStages: [],
        triggers: ['fora_icp', 'sem_budget_nunca']
      }
    };

    console.log('🛤️ Lead Journey Tracker inicializado');
  }

  /**
   * Inicializa tabelas do banco
   */
  initDatabase() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_journey (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        stage_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        previous_stage TEXT,
        trigger_reason TEXT,
        automated_action_taken TEXT,
        notes TEXT
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_lead_journey_contact
      ON lead_journey(contact_id, stage_entered_at DESC)
    `);

    console.log('✅ Lead Journey Database tables initialized');
  }

  /**
   * Obtém estágio atual do lead
   * @param {string} contactId - ID do contato
   * @returns {object|null} - Estágio atual
   */
  async getCurrentStage(contactId) {
    try {
      const result = db.prepare(`
        SELECT * FROM lead_journey
        WHERE contact_id = ?
        ORDER BY stage_entered_at DESC
        LIMIT 1
      `).get(contactId);

      return result || null;
    } catch (error) {
      console.error('❌ [JOURNEY] Erro ao buscar estágio atual:', error);
      return null;
    }
  }

  /**
   * Move lead para novo estágio
   * @param {string} contactId - ID do contato
   * @param {string} newStage - Novo estágio
   * @param {string} triggerReason - Razão da mudança
   * @param {string} automatedAction - Ação automática tomada
   * @param {string} notes - Notas adicionais
   */
  async moveToStage(contactId, newStage, triggerReason = '', automatedAction = '', notes = '') {
    try {
      // Validar estágio
      if (!this.stages[newStage]) {
        console.warn(`⚠️ [JOURNEY] Estágio inválido: ${newStage}`);
        return false;
      }

      // Obter estágio atual
      const currentStage = await this.getCurrentStage(contactId);
      const previousStage = currentStage?.stage || null;

      // Se já está neste estágio, não fazer nada
      if (previousStage === newStage) {
        console.log(`ℹ️ [JOURNEY] ${contactId} já está em ${newStage}`);
        return false;
      }

      // Inserir novo registro de jornada
      db.prepare(`
        INSERT INTO lead_journey (
          contact_id, stage, stage_entered_at, previous_stage,
          trigger_reason, automated_action_taken, notes
        ) VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
      `).run(
        contactId,
        newStage,
        previousStage,
        triggerReason,
        automatedAction,
        notes
      );

      console.log(`🛤️ [JOURNEY] ${contactId}: ${previousStage || 'NEW'} → ${newStage} (${triggerReason})`);

      return true;

    } catch (error) {
      console.error('❌ [JOURNEY] Erro ao mover estágio:', error);
      return false;
    }
  }

  /**
   * Detecta automaticamente o estágio baseado em sinais
   * @param {string} contactId - ID do contato
   * @param {object} context - Contexto (score, objeções, mensagens, etc)
   */
  async autoDetectStage(contactId, context = {}) {
    try {
      const currentStage = await this.getCurrentStage(contactId);
      const { leadScore, bantScore, objection, messageText, messageCount } = context;

      // Lead novo - DISCOVERY
      if (!currentStage || messageCount <= 2) {
        await this.moveToStage(contactId, 'DISCOVERY', 'primeira_interacao', '', 'Lead novo no sistema');
        return 'DISCOVERY';
      }

      // BANT iniciado - QUALIFICATION
      if (bantScore && bantScore.total_score >= 30 && currentStage.stage === 'DISCOVERY') {
        await this.moveToStage(contactId, 'QUALIFICATION', 'bant_iniciado', '', `BANT Score: ${bantScore.total_score}`);
        return 'QUALIFICATION';
      }

      // Perguntou sobre preço/demo - INTEREST
      const interestKeywords = ['preço', 'quanto custa', 'valor', 'demo', 'demonstração', 'quero ver', 'como funciona'];
      if (messageText && interestKeywords.some(kw => messageText.toLowerCase().includes(kw))) {
        if (currentStage.stage === 'DISCOVERY' || currentStage.stage === 'QUALIFICATION') {
          await this.moveToStage(contactId, 'INTEREST', 'demonstrou_interesse', '', 'Perguntou sobre produto');
          return 'INTEREST';
        }
      }

      // SQL (Lead Score alto) - DEMO
      if (leadScore && leadScore.classification === 'SQL' && currentStage.stage !== 'DEMO') {
        await this.moveToStage(contactId, 'DEMO', 'sql_qualificado', 'agendar_demo', `Score: ${leadScore.total_score}`);
        return 'DEMO';
      }

      // Objeção não resolvida - NURTURE
      if (objection && objection.severity === 'HIGH' && currentStage.stage === 'QUALIFICATION') {
        await this.moveToStage(contactId, 'NURTURE', `objecao_${objection.type}`, 'follow_up_agendado', `Objeção: ${objection.type}`);
        return 'NURTURE';
      }

      // "Não agora" - NURTURE
      const notNowKeywords = ['não agora', 'mais tarde', 'outro momento', 'no futuro'];
      if (messageText && notNowKeywords.some(kw => messageText.toLowerCase().includes(kw))) {
        await this.moveToStage(contactId, 'NURTURE', 'nao_agora', 'follow_up_15_dias', 'Pediu contato futuro');
        return 'NURTURE';
      }

      // Sem fit (score muito baixo) - DISQUALIFIED
      if (leadScore && leadScore.total_score < 15 && messageCount > 5) {
        await this.moveToStage(contactId, 'DISQUALIFIED', 'baixo_score', '', `Score final: ${leadScore.total_score}`);
        return 'DISQUALIFIED';
      }

      return currentStage?.stage || 'DISCOVERY';

    } catch (error) {
      console.error('❌ [JOURNEY] Erro na detecção automática:', error);
      return null;
    }
  }

  /**
   * Obtém histórico completo da jornada
   */
  async getJourneyHistory(contactId) {
    try {
      return db.prepare(`
        SELECT * FROM lead_journey
        WHERE contact_id = ?
        ORDER BY stage_entered_at ASC
      `).all(contactId);
    } catch (error) {
      console.error('❌ [JOURNEY] Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Analytics: Distribuição de leads por estágio
   */
  async getStageDistribution() {
    try {
      // Pegar o estágio atual de cada lead (último registro)
      const results = db.prepare(`
        SELECT stage, COUNT(DISTINCT contact_id) as count
        FROM lead_journey lj1
        WHERE stage_entered_at = (
          SELECT MAX(stage_entered_at)
          FROM lead_journey lj2
          WHERE lj2.contact_id = lj1.contact_id
        )
        GROUP BY stage
        ORDER BY count DESC
      `).all();

      return results;
    } catch (error) {
      console.error('❌ [JOURNEY] Erro ao buscar distribuição:', error);
      return [];
    }
  }

  /**
   * Analytics: Tempo médio em cada estágio
   */
  async getAverageTimeInStage(stage) {
    try {
      const results = db.prepare(`
        SELECT
          AVG(
            JULIANDAY(
              COALESCE(
                (SELECT MIN(stage_entered_at)
                 FROM lead_journey lj2
                 WHERE lj2.contact_id = lj1.contact_id
                 AND lj2.stage_entered_at > lj1.stage_entered_at),
                datetime('now')
              )
            ) - JULIANDAY(lj1.stage_entered_at)
          ) * 24 as avg_hours
        FROM lead_journey lj1
        WHERE stage = ?
      `).get(stage);

      return results?.avg_hours || 0;
    } catch (error) {
      console.error('❌ [JOURNEY] Erro ao calcular tempo médio:', error);
      return 0;
    }
  }

  /**
   * Retorna próximas ações sugeridas para o estágio atual
   */
  getSuggestedActions(stage) {
    const actions = {
      DISCOVERY: ['Fazer perguntas SPIN (Situation)', 'Identificar indústria e tamanho'],
      QUALIFICATION: ['Aplicar BANT completo', 'Identificar autoridade', 'Perguntar sobre timeline'],
      INTEREST: ['Oferecer demo personalizada', 'Enviar case de sucesso do segmento'],
      DEMO: ['Confirmar demo agendada', 'Preparar material customizado', 'Follow-up pós-demo'],
      PROPOSAL: ['Enviar proposta comercial', 'Agendar call de apresentação'],
      NEGOTIATION: ['Responder objeções', 'Flexibilizar termos se possível', 'Criar urgência'],
      CLOSED_WON: ['Onboarding', 'Agradecer e pedir indicação'],
      CLOSED_LOST: ['Perguntar motivo', 'Agendar follow-up em 3 meses'],
      NURTURE: ['Follow-up periódico', 'Enviar conteúdo relevante', 'Manter relacionamento'],
      DISQUALIFIED: ['Arquivar lead', 'Documentar razão da desqualificação']
    };

    return actions[stage] || [];
  }
}

// Singleton
const leadJourneyTracker = new LeadJourneyTracker();
export default leadJourneyTracker;
