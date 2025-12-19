// intelligence/ArchetypeEngine.js
//  ENGINE DE ARQUÉTIPOS - Integração com o sistema de inteligência

/**
 * ArchetypeEngine - Motor de Arquétipos de Comunicação
 *
 * RESPONSABILIDADES:
 * 1. Detectar arquétipo do lead baseado em conversação
 * 2. Adaptar tom de mensagens ao arquétipo
 * 3. Sugerir abordagens de vendas específicas
 * 4. Cache de arquétipos por contato
 *
 * INTEGRAÇÃO:
 * - Chamado pelo IntelligenceOrchestrator
 * - Usado pelos agentes (SDR, Specialist, Scheduler)
 * - Conectado ao ResponseVariation
 */

import {
  ARCHETYPES,
  analyzeAndSelectArchetype,
  selectArchetypeByPersona,
  applyArchetypeToScript
} from '../tools/archetypes.js';

// ═══════════════════════════════════════════════════════════════════════════
// LRU CACHE COM LIMITE - EVITA MEMORY LEAK
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_MAX_SIZE = 500; // Máximo de entradas
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const HISTORY_MAX_SIZE = 1000; // Máximo de entradas no histórico

/**
 * Simple LRU Cache to prevent memory leaks
 */
class SimpleLRUCache {
  constructor(maxSize, ttl) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check TTL
    if (this.ttl && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data: value, timestamp: Date.now() });
  }

  delete(key) {
    this.cache.delete(key);
  }

  get size() {
    return this.cache.size;
  }
}

// Cache de arquétipos por contato (LRU com limite)
const archetypeCache = new SimpleLRUCache(CACHE_MAX_SIZE, CACHE_TTL);

// Histórico de arquétipos para tracking (LRU sem TTL)
const archetypeHistory = new SimpleLRUCache(HISTORY_MAX_SIZE, null);

/**
 * Singleton para garantir consistência
 */
let instance = null;

export class ArchetypeEngine {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;
    this.archetypes = ARCHETYPES;
    console.log(' [ArchetypeEngine] Inicializado com 12 arquétipos');
  }

  /**
   * Detecta ou recupera arquétipo do lead
   * SIMPLIFICADO: Usa APENAS análise de mensagem (sem setor/stage)
   *
   * @param {string} contactId - ID do contato
   * @param {Object} context - Contexto da conversa
   * @returns {Promise<Object>} Arquétipo detectado
   */
  async detectArchetype(contactId, context = {}) {
    const {
      message = '',
      leadProfile = {},
      conversationHistory = []
    } = context;

    // 1. Verificar cache primeiro
    const cached = this.getCachedArchetype(contactId);
    if (cached) {
      console.log(` [ArchetypeEngine] Cache hit: ${cached.archetype} para ${contactId}`);
      return cached;
    }

    // 2. ÚNICA FORMA: Análise de mensagem via GPT
    // Sempre tentar análise se tem mensagem (qualquer tamanho)
    if (message && message.length > 0) {
      try {
        console.log(` [ArchetypeEngine] Analisando mensagem: "${message.substring(0, 50)}..."`);

        const analysisContext = {
          interestLevel: this.estimateInterestLevel(conversationHistory),
          objection: this.detectObjection(message)
        };

        const fullAnalysis = await analyzeAndSelectArchetype(
          message,
          JSON.stringify(leadProfile),
          analysisContext
        );

        console.log(` [ArchetypeEngine] Arquétipo detectado: ${fullAnalysis.archetype} (confiança: ${fullAnalysis.confidence})`);
        this.cacheArchetype(contactId, fullAnalysis);
        return fullAnalysis;

      } catch (error) {
        console.error(' [ArchetypeEngine] Erro na análise GPT:', error.message);
      }
    }

    // 3. Fallback: SABIO (neutro e profissional)
    const result = {
      archetype: 'SABIO',
      archetypeData: ARCHETYPES['SABIO'],
      confidence: 0.5,
      reasoning: 'Fallback - sem mensagem para analisar',
      source: 'fallback'
    };

    this.cacheArchetype(contactId, result);
    return result;
  }

  /**
   * Adapta uma mensagem ao arquétipo do lead
   * @param {string} contactId - ID do contato
   * @param {string} baseMessage - Mensagem original
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Mensagem adaptada + metadata
   */
  async adaptMessage(contactId, baseMessage, context = {}) {
    // Detectar arquétipo (usa cache se disponível)
    const archetypeAnalysis = await this.detectArchetype(contactId, context);

    // Se confiança baixa, não modificar muito
    if (archetypeAnalysis.confidence < 0.6) {
      return {
        message: baseMessage,
        adapted: false,
        archetype: archetypeAnalysis.archetype,
        reason: 'Confiança baixa, mantendo mensagem original'
      };
    }

    try {
      // Aplicar tom do arquétipo
      const adaptedMessage = await applyArchetypeToScript(
        baseMessage,
        archetypeAnalysis,
        {
          persona: context.leadProfile?.setor || 'PME',
          salesStage: context.currentStage || 'initial'
        }
      );

      return {
        message: adaptedMessage,
        adapted: true,
        archetype: archetypeAnalysis.archetype,
        archetypeData: archetypeAnalysis.archetypeData,
        confidence: archetypeAnalysis.confidence
      };

    } catch (error) {
      console.error(' [ArchetypeEngine] Erro ao adaptar:', error.message);
      return {
        message: baseMessage,
        adapted: false,
        archetype: archetypeAnalysis.archetype,
        error: error.message
      };
    }
  }

  /**
   * Retorna sugestões de abordagem baseadas no arquétipo
   * @param {string} archetype - Nome do arquétipo
   * @param {string} situation - Situação (discovery, objection, closing)
   * @returns {Object} Sugestões de abordagem
   */
  getSalesApproach(archetype, situation = 'discovery') {
    const archetypeData = ARCHETYPES[archetype];
    if (!archetypeData) {
      return null;
    }

    return {
      approach: archetypeData.salesApproach[situation] || archetypeData.salesApproach.discovery,
      voiceStyle: archetypeData.voiceStyle,
      traits: archetypeData.traits.slice(0, 3), // Top 3 traits
      values: archetypeData.coreValues
    };
  }

  /**
   * Gera variações de pergunta adaptadas ao arquétipo
   * @param {string} archetype - Nome do arquétipo
   * @param {string} baseQuestion - Pergunta base
   * @returns {Array<string>} Variações da pergunta
   */
  generateQuestionVariations(archetype, baseQuestion) {
    const archetypeData = ARCHETYPES[archetype];
    if (!archetypeData) {
      return [baseQuestion];
    }

    // Prefixos por arquétipo
    const prefixes = {
      SABIO: ['Baseado na minha análise,', 'Os dados mostram que', 'Na minha experiência,'],
      HEROI: ['Vamos enfrentar isso de frente:', 'O desafio é:', 'Pra conquistar esse resultado,'],
      MAGO: ['Imagina a transformação:', 'E se eu te mostrar que é possível', 'A mágica acontece quando'],
      INOCENTE: ['Vou ser direto:', 'Sinceramente,', 'De forma simples:'],
      EXPLORADOR: ['Vamos explorar:', 'Descobri algo interessante:', 'Novo território:'],
      AMANTE: ['Me conta com paixão:', 'Quero entender de verdade:', 'Com carinho pergunto:'],
      CRIADOR: ['Vamos criar algo único:', 'Personalizado pra você:', 'Pensando especificamente no seu caso:'],
      GOVERNANTE: ['Como líder do seu negócio,', 'No controle da situação,', 'Pra ter domínio total:'],
      REBELDE: ['Chega de fazer do jeito antigo:', 'Vamos quebrar esse padrão:', 'Diferente de tudo:'],
      BOBO_DA_CORTE: ['Olha só que interessante:', 'Vou te contar uma:', 'De boa:'],
      CUIDADOR: ['Me preocupo em saber:', 'Pra te proteger melhor:', 'Cuidando do seu negócio:'],
      PESSOA_COMUM: ['Entre nós:', 'Na real:', 'Como um igual:']
    };

    const archetypePrefixes = prefixes[archetype] || prefixes.SABIO;

    return archetypePrefixes.map(prefix => `${prefix} ${baseQuestion}`);
  }

  /**
   * Retorna instruções de tom para o GPT baseado no arquétipo
   * @param {string} archetype - Nome do arquétipo
   * @returns {string} Instruções de tom
   */
  getToneInstructions(archetype) {
    const archetypeData = ARCHETYPES[archetype];
    if (!archetypeData) {
      return '';
    }

    return `
TOM DE COMUNICAÇÃO (Arquétipo ${archetypeData.name}):
- Motivação core: ${archetypeData.coreMotivation}
- Valores: ${archetypeData.coreValues.join(', ')}
- Estilo de voz: "${archetypeData.voiceStyle}"
- Características principais:
${archetypeData.traits.map(t => `  • ${t}`).join('\n')}

IMPORTANTE: Mantenha este tom em TODAS as mensagens.
`;
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES PRIVADOS
  // ═══════════════════════════════════════════════════════════════

  getCachedArchetype(contactId) {
    // LRU cache já verifica TTL automaticamente
    const cached = archetypeCache.get(contactId);
    if (!cached) return null;
    return cached.data;
  }

  cacheArchetype(contactId, data) {
    // LRU cache já gerencia timestamp e eviction
    archetypeCache.set(contactId, data);
    console.log(` [ArchetypeEngine] Cache size: ${archetypeCache.size}/${CACHE_MAX_SIZE}`);
  }

  mapSectorToPersona(sector) {
    if (!sector) return null;

    const sectorLower = sector.toLowerCase();

    const mapping = {
      'restaurante': 'RESTAURANTE_DELIVERY',
      'alimentação': 'RESTAURANTE_DELIVERY',
      'delivery': 'RESTAURANTE_DELIVERY',
      'loja': 'LOJA_VAREJO',
      'varejo': 'LOJA_VAREJO',
      'comércio': 'LOJA_VAREJO',
      'clínica': 'CLINICA_SERVICOS',
      'saúde': 'CLINICA_SERVICOS',
      'médico': 'CLINICA_SERVICOS',
      'dentista': 'CLINICA_SERVICOS',
      'ecommerce': 'ECOMMERCE_LOCAL',
      'online': 'ECOMMERCE_LOCAL',
      'serviços': 'SERVICOS_PROFISSIONAIS',
      'consultoria': 'SERVICOS_PROFISSIONAIS',
      'advocacia': 'SERVICOS_PROFISSIONAIS',
      'contabilidade': 'SERVICOS_PROFISSIONAIS'
    };

    for (const [keyword, persona] of Object.entries(mapping)) {
      if (sectorLower.includes(keyword)) {
        return persona;
      }
    }

    return null;
  }

  mapStageToSalesStage(stage) {
    const mapping = {
      'sdr': 'initial_contact',
      'need': 'problem_identification',
      'budget': 'solution_presentation',
      'authority': 'solution_presentation',
      'timing': 'meeting_request',
      'scheduler': 'meeting_request'
    };

    return mapping[stage] || 'initial_contact';
  }

  estimateInterestLevel(history) {
    if (!history || history.length === 0) return 5;

    // Análise básica de engajamento
    const avgLength = history.reduce((sum, msg) => sum + (msg.text?.length || 0), 0) / history.length;

    if (avgLength > 100) return 8;
    if (avgLength > 50) return 6;
    return 4;
  }

  detectObjection(message) {
    if (!message) return null;

    const lower = message.toLowerCase();

    if (lower.includes('caro') || lower.includes('preço') || lower.includes('valor')) {
      return 'preço';
    }
    if (lower.includes('não preciso') || lower.includes('já tenho')) {
      return 'não precisa';
    }
    if (lower.includes('depois') || lower.includes('agora não')) {
      return 'timing';
    }

    return null;
  }

  getDefaultArchetype(stage) {
    const defaults = {
      'sdr': 'INOCENTE',      // Primeira interação: transparência
      'need': 'SABIO',         // Discovery: expertise
      'budget': 'HEROI',       // Budget: superar objeções
      'authority': 'GOVERNANTE', // Authority: liderança
      'timing': 'MAGO',        // Timing: transformação
      'scheduler': 'CUIDADOR'  // Scheduler: cuidado com details
    };

    return defaults[stage] || 'SABIO';
  }

  // ═══════════════════════════════════════════════════════════════
  // MELHORIA 1: TRIGGERS DE RE-DETECÇÃO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Invalida cache quando há mudança significativa de contexto
   * TRIGGERS: mudança de stage, objeção detectada, sentimento negativo
   * @param {string} contactId - ID do contato
   * @param {string} reason - Motivo da invalidação
   * @param {Object} context - Contexto adicional
   */
  invalidateCacheOnContextChange(contactId, reason, context = {}) {
    const cached = archetypeCache.get(contactId);
    if (!cached) return false;

    const validReasons = [
      'stage_change',      // Mudou de estágio (SDR  Specialist)
      'objection_detected', // Objeção forte detectada
      'sentiment_negative', // Sentimento ficou muito negativo
      'explicit_request',   // Pedido explícito do usuário
      'long_pause',         // Pausa longa na conversa (>1h)
      'topic_shift'         // Mudança brusca de assunto
    ];

    if (!validReasons.includes(reason)) {
      console.log(` [ArchetypeEngine] Razão inválida para invalidação: ${reason}`);
      return false;
    }

    // Salvar no histórico antes de invalidar
    this._saveToHistory(contactId, cached.data, reason);

    // Invalidar cache
    archetypeCache.delete(contactId);
    console.log(` [ArchetypeEngine] Cache invalidado para ${contactId} (razão: ${reason})`);

    return true;
  }

  /**
   * Força re-detecção do arquétipo (ignora cache)
   * @param {string} contactId - ID do contato
   * @param {Object} context - Contexto para nova detecção
   * @returns {Promise<Object>} Novo arquétipo detectado
   */
  async forceRedetection(contactId, context = {}) {
    console.log(` [ArchetypeEngine] Forçando re-detecção para ${contactId}`);

    // Salvar arquétipo anterior no histórico
    const cached = archetypeCache.get(contactId);
    if (cached) {
      this._saveToHistory(contactId, cached.data, 'force_redetection');
    }

    // Limpar cache
    archetypeCache.delete(contactId);

    // Re-detectar
    return await this.detectArchetype(contactId, context);
  }

  /**
   * Verifica se deve re-detectar baseado em sinais da mensagem
   * @param {string} contactId - ID do contato
   * @param {string} message - Mensagem atual
   * @param {Object} context - Contexto
   * @returns {boolean} Se deve re-detectar
   */
  shouldRedetect(contactId, message, context = {}) {
    const cached = archetypeCache.get(contactId);
    if (!cached) return true; // Não tem cache, deve detectar

    // Sinais que indicam mudança de arquétipo
    const redetectionSignals = {
      // Sinais de frustração (pode mudar para REBELDE)
      frustration: [
        'não entendi', 'confuso', 'não tá funcionando',
        'já falei', 'cansei', 'desisto', 'esquece'
      ],
      // Sinais de urgência (pode mudar para HEROI)
      urgency: [
        'preciso urgente', 'pra ontem', 'não pode esperar',
        'emergência', 'crítico', 'deadline'
      ],
      // Sinais de transformação (pode mudar para MAGO)
      transformation: [
        'quero mudar tudo', 'revolucionar', 'transformar',
        'automatizar tudo', 'nova era'
      ],
      // Sinais de proteção (pode mudar para CUIDADOR)
      protection: [
        'minha equipe', 'proteger', 'medo de', 'risco',
        'segurança', 'preocupado com'
      ]
    };

    const msgLower = message.toLowerCase();

    for (const [signalType, keywords] of Object.entries(redetectionSignals)) {
      const hasSignal = keywords.some(kw => msgLower.includes(kw));
      if (hasSignal) {
        console.log(` [ArchetypeEngine] Sinal de re-detecção: ${signalType}`);
        return true;
      }
    }

    // Verificar se confiança está baixa (< 60%)
    if (cached.data.confidence < 0.6) {
      console.log(` [ArchetypeEngine] Confiança baixa (${cached.data.confidence}), re-detectando`);
      return true;
    }

    return false;
  }

  /**
   * Detecta com re-avaliação automática se necessário
   * @param {string} contactId - ID do contato
   * @param {Object} context - Contexto
   * @returns {Promise<Object>} Arquétipo (novo ou cached)
   */
  async detectWithAutoReeval(contactId, context = {}) {
    const { message = '' } = context;

    // Verificar se deve re-detectar
    if (this.shouldRedetect(contactId, message, context)) {
      return await this.forceRedetection(contactId, context);
    }

    // Usar detecção normal (com cache)
    return await this.detectArchetype(contactId, context);
  }

  // ═══════════════════════════════════════════════════════════════
  // MELHORIA 4: TRACKING DE EVOLUÇÃO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Salva arquétipo no histórico para tracking
   * @private
   */
  _saveToHistory(contactId, archetypeData, reason) {
    if (!archetypeHistory.has(contactId)) {
      archetypeHistory.set(contactId, []);
    }

    const history = archetypeHistory.get(contactId);
    history.push({
      archetype: archetypeData.archetype,
      confidence: archetypeData.confidence,
      reason: reason,
      timestamp: Date.now(),
      source: archetypeData.source || 'detection'
    });

    // Manter apenas últimos 20 registros
    if (history.length > 20) {
      history.shift();
    }

    console.log(` [ArchetypeEngine] Histórico salvo: ${archetypeData.archetype} (${reason})`);
  }

  /**
   * Obtém histórico de arquétipos do contato
   * @param {string} contactId - ID do contato
   * @returns {Array} Histórico de arquétipos
   */
  getArchetypeHistory(contactId) {
    return archetypeHistory.get(contactId) || [];
  }

  /**
   * Obtém métricas de evolução do arquétipo
   * @param {string} contactId - ID do contato
   * @returns {Object} Métricas de evolução
   */
  getEvolutionMetrics(contactId) {
    const history = this.getArchetypeHistory(contactId);

    if (history.length === 0) {
      return {
        totalChanges: 0,
        dominantArchetype: null,
        averageConfidence: 0,
        stabilityScore: 0,
        archetypeDistribution: {}
      };
    }

    // Contar distribuição de arquétipos
    const distribution = {};
    let totalConfidence = 0;

    for (const entry of history) {
      distribution[entry.archetype] = (distribution[entry.archetype] || 0) + 1;
      totalConfidence += entry.confidence;
    }

    // Encontrar arquétipo dominante
    const dominantArchetype = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Calcular score de estabilidade (0-100)
    // Mais alto = menos mudanças = mais estável
    const uniqueArchetypes = Object.keys(distribution).length;
    const stabilityScore = Math.round(100 / uniqueArchetypes);

    return {
      totalChanges: history.length,
      dominantArchetype,
      averageConfidence: Math.round((totalConfidence / history.length) * 100) / 100,
      stabilityScore,
      archetypeDistribution: distribution,
      lastChange: history[history.length - 1]?.timestamp || null,
      history: history.slice(-5) // Últimos 5 para referência
    };
  }

  /**
   * Obtém tendência de confiança (subindo, estável, caindo)
   * @param {string} contactId - ID do contato
   * @returns {string} Tendência: 'rising', 'stable', 'falling'
   */
  getConfidenceTrend(contactId) {
    const history = this.getArchetypeHistory(contactId);

    if (history.length < 3) return 'stable';

    const recent = history.slice(-3);
    const firstConfidence = recent[0].confidence;
    const lastConfidence = recent[recent.length - 1].confidence;
    const diff = lastConfidence - firstConfidence;

    if (diff > 0.1) return 'rising';
    if (diff < -0.1) return 'falling';
    return 'stable';
  }

  /**
   * Limpa cache de um contato específico
   */
  clearCache(contactId) {
    if (contactId) {
      archetypeCache.delete(contactId);
    } else {
      archetypeCache.clear();
    }
  }

  /**
   * Limpa histórico de um contato
   */
  clearHistory(contactId) {
    if (contactId) {
      archetypeHistory.delete(contactId);
    } else {
      archetypeHistory.clear();
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  getCacheStats() {
    return {
      size: archetypeCache.size,
      entries: Array.from(archetypeCache.keys())
    };
  }
}

// Singleton getter
export function getArchetypeEngine() {
  if (!instance) {
    instance = new ArchetypeEngine();
  }
  return instance;
}

export default ArchetypeEngine;
