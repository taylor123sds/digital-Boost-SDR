/**
 * @file LeadScoringIntegration.js
 * @description P2-1: Integra Lead Scoring com DynamicConsultativeEngine
 *
 * PROPÓSITO:
 * - Calcular score em tempo real durante conversas
 * - Fornecer insights de qualificação para o Planner/Writer
 * - Ajustar estratégia baseada no score atual
 *
 * @version 1.0.0
 */

import leadScoringSystem from '../tools/lead_scoring_system.js';
import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';

class LeadScoringIntegration {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minuto

    log.info('[SCORING-INTEGRATION] Inicializado');
  }

  /**
   * Calcula score em tempo real durante conversa
   * @param {string} contactId - ID do contato
   * @param {object} conversationContext - Contexto da conversa atual
   * @returns {object} Score e recomendações
   */
  async calculateRealTimeScore(contactId, conversationContext = {}) {
    try {
      const cacheKey = `score_${contactId}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      // Extrair features da conversa
      const features = this.extractConversationFeatures(conversationContext);

      // Calcular score completo
      const scoreResult = await leadScoringSystem.calculateLeadScore(contactId, {
        ...features,
        ...conversationContext
      });

      if (!scoreResult) {
        return this.getDefaultScore(contactId);
      }

      // Enriquecer com recomendações estratégicas
      const enrichedResult = {
        ...scoreResult,
        strategicRecommendation: this.getStrategicRecommendation(scoreResult),
        urgencyLevel: this.calculateUrgency(scoreResult),
        nextBestAction: this.suggestNextAction(scoreResult, conversationContext),
        qualificationTips: this.getQualificationTips(scoreResult)
      };

      // Cache result
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: enrichedResult
      });

      log.debug(`[SCORING-INTEGRATION] ${contactId}: Score ${scoreResult.scores.total}/100 (${scoreResult.classification})`);

      return enrichedResult;

    } catch (error) {
      log.error('[SCORING-INTEGRATION] Erro ao calcular score', error);
      return this.getDefaultScore(contactId);
    }
  }

  /**
   * Extrai features relevantes do contexto da conversa
   */
  extractConversationFeatures(context) {
    const features = {
      messageCount: context.messageCount || 0,
      avgResponseTime: context.avgResponseTime || 0,
      engagementSignals: [],
      recentMessages: context.recentMessages || [],
      lastMessage: context.lastMessage || '',
      archetype: context.archetype || 'SABIO'
    };

    // Detectar sinais de engajamento
    const lastMsg = (context.lastMessage || '').toLowerCase();

    if (/quanto custa|preço|valor/.test(lastMsg)) {
      features.engagementSignals.push('price_inquiry');
    }
    if (/reunião|call|conversar/.test(lastMsg)) {
      features.engagementSignals.push('meeting_interest');
    }
    if (/urgente|agora|rápido/.test(lastMsg)) {
      features.engagementSignals.push('urgency');
    }
    if (/demo|demonstração|mostrar/.test(lastMsg)) {
      features.engagementSignals.push('demo_request');
    }

    // Extrair firmographics do contexto
    if (context.bantData) {
      features.industry = context.bantData.nicho || context.industry;
      features.companySize = this.mapEmployeesToSize(context.bantData.funcionarios);
      features.location = context.bantData.regiao || context.location;
    }

    return features;
  }

  /**
   * Mapeia número de funcionários para categoria
   */
  mapEmployeesToSize(funcionarios) {
    if (!funcionarios) return 'unknown';

    const normalized = funcionarios.toLowerCase();
    if (normalized.includes('sozinho') || normalized.includes('1-5') || normalized === '1') {
      return 'micro';
    }
    if (normalized.includes('6-20') || /[6-9]|1[0-9]|20/.test(normalized)) {
      return 'small';
    }
    if (normalized.includes('20+') || /2[1-9]|[3-9][0-9]/.test(normalized)) {
      return 'medium';
    }
    return 'small';
  }

  /**
   * Gera recomendação estratégica baseada no score
   */
  getStrategicRecommendation(scoreResult) {
    const { classification, scores, archetypeMultiplier } = scoreResult;

    const recommendations = {
      SQL: {
        strategy: 'CLOSE_NOW',
        message: 'Lead QUENTE - Priorize fechamento imediato',
        approach: 'Direcione para reunião com proposta. Use técnica de fechamento assumido.',
        priority: 'CRITICAL'
      },
      MQL: {
        strategy: 'ACCELERATE',
        message: 'Lead qualificado - Acelere qualificação BANT',
        approach: 'Complete dados de Authority/Timeline. Crie urgência com entregável concreto.',
        priority: 'HIGH'
      },
      PQL: {
        strategy: 'NURTURE_ACTIVE',
        message: 'Lead com potencial - Continue qualificação',
        approach: 'Aprofunde dores (fase Problem/Implication). Busque sinais de budget.',
        priority: 'MEDIUM'
      },
      IQL: {
        strategy: 'EDUCATE',
        message: 'Lead em descoberta - Eduque sobre valor',
        approach: 'Foque em entender situação atual. Demonstre expertise antes de qualificar.',
        priority: 'LOW'
      },
      COLD: {
        strategy: 'QUALIFY_BASIC',
        message: 'Lead frio - Qualifique fit básico',
        approach: 'Verifique se é público-alvo. Não invista muito tempo sem sinais.',
        priority: 'LOW'
      }
    };

    const base = recommendations[classification] || recommendations.COLD;

    // Ajustar baseado em arquétipo
    if (archetypeMultiplier > 1.1) {
      base.archetypeBonus = 'Arquétipo favorável - Lead tende a decidir mais rápido';
    } else if (archetypeMultiplier < 0.95) {
      base.archetypeWarning = 'Arquétipo cauteloso - Invista mais em construir confiança';
    }

    return base;
  }

  /**
   * Calcula nível de urgência para priorização
   */
  calculateUrgency(scoreResult) {
    const { scores, classification } = scoreResult;

    let urgencyPoints = 0;

    // Score alto = mais urgente
    if (scores.total >= 80) urgencyPoints += 3;
    else if (scores.total >= 60) urgencyPoints += 2;
    else if (scores.total >= 40) urgencyPoints += 1;

    // Intent alto = mais urgente
    if (scores.intent >= 12) urgencyPoints += 2;
    else if (scores.intent >= 8) urgencyPoints += 1;

    // BANT completo = mais urgente
    if (scores.bant >= 25) urgencyPoints += 2;
    else if (scores.bant >= 15) urgencyPoints += 1;

    // Classificação
    if (classification === 'SQL') urgencyPoints += 3;
    else if (classification === 'MQL') urgencyPoints += 2;

    // Mapear para níveis
    if (urgencyPoints >= 8) return { level: 'CRITICAL', score: urgencyPoints, responseTime: '< 5 min' };
    if (urgencyPoints >= 5) return { level: 'HIGH', score: urgencyPoints, responseTime: '< 15 min' };
    if (urgencyPoints >= 3) return { level: 'MEDIUM', score: urgencyPoints, responseTime: '< 1 hora' };
    return { level: 'LOW', score: urgencyPoints, responseTime: 'Normal' };
  }

  /**
   * Sugere próxima melhor ação
   */
  suggestNextAction(scoreResult, context) {
    const { classification, scores } = scoreResult;
    const currentStage = context.currentStage || 'situation';

    // SQL - Fechamento
    if (classification === 'SQL') {
      return {
        action: 'SCHEDULE_MEETING',
        message: 'Propor horário específico para reunião',
        script: 'Perfeito! Vamos marcar uma conversa rápida pra eu te mostrar exatamente como resolver isso. Terça ou quinta fica melhor pra você?'
      };
    }

    // MQL - Acelerar para fechamento
    if (classification === 'MQL') {
      if (scores.bant < 20) {
        return {
          action: 'COMPLETE_BANT',
          message: 'Coletar dados de Authority e Timeline',
          script: 'Você decide isso sozinho ou tem alguém que participa dessa decisão?'
        };
      }
      return {
        action: 'CREATE_URGENCY',
        message: 'Criar senso de urgência com entregável',
        script: 'Na reunião eu te mostro um diagnóstico personalizado do seu negócio. Vale 30 minutos?'
      };
    }

    // PQL - Aprofundar qualificação
    if (classification === 'PQL') {
      if (currentStage === 'situation' || currentStage === 'problem') {
        return {
          action: 'DEEPEN_PAIN',
          message: 'Explorar impacto do problema (fase Implication)',
          script: 'E se continuar assim por mais 6 meses, como fica?'
        };
      }
      return {
        action: 'EXPLORE_BUDGET',
        message: 'Iniciar conversa sobre investimento',
        script: 'Vocês já tentaram resolver isso antes? Quanto investiram?'
      };
    }

    // IQL/COLD - Qualificar fit
    return {
      action: 'QUALIFY_FIT',
      message: 'Verificar se é público-alvo',
      script: 'Me conta mais sobre seu negócio - quantas pessoas trabalham aí e qual o faturamento mensal?'
    };
  }

  /**
   * Dicas para o Writer melhorar qualificação
   */
  getQualificationTips(scoreResult) {
    const { scores, classification } = scoreResult;
    const tips = [];

    // Comportamento baixo
    if (scores.behavior < 15) {
      tips.push({
        area: 'engagement',
        tip: 'Lead pouco engajado. Use perguntas abertas para estimular resposta.',
        example: 'Me conta mais sobre isso...'
      });
    }

    // BANT incompleto
    if (scores.bant < 20) {
      tips.push({
        area: 'bant',
        tip: 'Dados BANT incompletos. Colete Budget, Authority, Need, Timeline.',
        missing: this.identifyMissingBANT(scores)
      });
    }

    // Intent baixo
    if (scores.intent < 8) {
      tips.push({
        area: 'intent',
        tip: 'Sinais de compra fracos. Tente gerar interesse com casos de sucesso.',
        example: 'Outros clientes como você conseguiram X resultado...'
      });
    }

    // Firmographics desconhecido
    if (scores.firmographics < 10) {
      tips.push({
        area: 'firmographics',
        tip: 'Perfil da empresa incompleto. Descubra segmento, tamanho e região.',
        questions: ['Qual o segmento?', 'Quantos funcionários?', 'Qual região atende?']
      });
    }

    return tips;
  }

  /**
   * Identifica componentes BANT faltantes
   */
  identifyMissingBANT(scores) {
    const missing = [];
    // Esta é uma aproximação - idealmente viria do bantData
    if (scores.bant < 8) missing.push('Budget');
    if (scores.bant < 15) missing.push('Authority');
    if (scores.bant < 22) missing.push('Need');
    if (scores.bant < 28) missing.push('Timeline');
    return missing;
  }

  /**
   * Score padrão quando não há dados
   */
  getDefaultScore(contactId) {
    return {
      contactId,
      scores: {
        behavior: 0,
        firmographics: 0,
        bant: 0,
        intent: 0,
        total: 0
      },
      classification: 'COLD',
      priority: 'LOW',
      strategicRecommendation: {
        strategy: 'QUALIFY_BASIC',
        message: 'Novo lead - Inicie qualificação',
        approach: 'Faça perguntas de situação para entender o contexto.',
        priority: 'LOW'
      },
      urgencyLevel: { level: 'LOW', score: 0, responseTime: 'Normal' },
      nextBestAction: {
        action: 'START_QUALIFICATION',
        message: 'Iniciar qualificação SPIN'
      },
      qualificationTips: []
    };
  }

  /**
   * Gera instrução para o Writer baseada no score
   * Usado pelo DynamicConsultativeEngine para enriquecer prompts
   */
  generateWriterInstruction(scoreResult) {
    const { classification, strategicRecommendation, urgencyLevel, qualificationTips } = scoreResult;

    let instruction = `\n\n## SCORING INSIGHT (${classification})\n`;
    instruction += `- Estratégia: ${strategicRecommendation.strategy}\n`;
    instruction += `- ${strategicRecommendation.message}\n`;
    instruction += `- Urgência: ${urgencyLevel.level}\n`;

    if (qualificationTips.length > 0) {
      instruction += `\n### Dicas de Qualificação:\n`;
      qualificationTips.forEach(tip => {
        instruction += `- ${tip.area}: ${tip.tip}\n`;
      });
    }

    return instruction;
  }

  /**
   * Limpa cache para contato específico
   */
  invalidateCache(contactId) {
    this.cache.delete(`score_${contactId}`);
  }

  /**
   * Limpa todo o cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton
let instance = null;

export function getLeadScoringIntegration() {
  if (!instance) {
    instance = new LeadScoringIntegration();
  }
  return instance;
}

export default LeadScoringIntegration;
