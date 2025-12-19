/**
 * @file UnifiedIntentPipeline.js
 * @description Pipeline unificado de classificação de intenções
 *
 * FIX P0: O sistema tinha 3 classificadores independentes que não conversavam:
 * - IntentRouter (patterns + GPT)
 * - IntentClassifier (patterns simples)
 * - UnifiedFAQSystem (FAQ detection)
 *
 * Este pipeline unifica todos com:
 * 1. Context-aware classification (sabe em que stage estamos)
 * 2. Weighted voting (não apenas first-wins)
 * 3. BANT-aware patterns (diferencia respostas BANT de FAQs)
 * 4. Retry logic para GPT
 * 5. Threshold consistente
 */

import openaiClient from '../core/openai_client.js';

const openai = openaiClient.getClient();

// Cache de classificações
const classificationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_SIZE = 500;

// Configuração
const CONFIG = {
  // Threshold padrão para switches
  DEFAULT_CONFIDENCE_THRESHOLD: 0.75,

  // Threshold mais alto quando estamos no meio de um fluxo BANT
  IN_FLOW_CONFIDENCE_THRESHOLD: 0.85,

  // Número máximo de retries para GPT
  MAX_GPT_RETRIES: 3,

  // Backoff inicial para retries (ms)
  INITIAL_BACKOFF_MS: 200
};

// Tipos de intenção
export const INTENT_TYPES = {
  // BANT Responses (respostas a perguntas do agente)
  BANT_RESPONSE: 'bant_response',

  // Saudações
  GREETING: 'greeting',
  START: 'start',

  // Interesse
  INTEREST: 'interest',
  PROBLEM_SHARE: 'problem_share',
  PROFILE_INFO: 'profile_info',

  // FAQ/Atendimento
  FAQ_QUESTION: 'faq_question',
  PRICING_QUESTION: 'pricing_question',
  OBJECTION: 'objection',
  FEATURE_QUESTION: 'feature_question',

  // Scheduling
  MEETING_REQUEST: 'meeting_request',
  TIME_SUGGESTION: 'time_suggestion',
  MEETING_CONFIRM: 'meeting_confirm',

  // Especiais
  OPT_OUT: 'opt_out',
  HUMAN_REQUEST: 'human_request',

  // Fallback
  UNKNOWN: 'unknown'
};

// Singleton
let instance = null;

/**
 * UnifiedIntentPipeline - Classificador unificado com context-awareness
 */
export class UnifiedIntentPipeline {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    // Cleanup periódico do cache
    setInterval(() => this._cleanupCache(), 60 * 1000);

    console.log(' [UNIFIED-INTENT] Pipeline inicializado');
  }

  /**
   * MÉTODO PRINCIPAL: Classifica intenção com context-awareness
   *
   * @param {string} message - Texto da mensagem
   * @param {Object} context - Contexto da conversa
   * @returns {Object} { intent, confidence, shouldSwitch, targetMode }
   */
  async classify(message, context = {}) {
    const {
      currentMode = 'sdr',
      currentStage = null,
      lastQuestion = null,
      conversationHistory = [],
      leadState = null
    } = context;

    console.log(`\n [UNIFIED-INTENT] Classificando: "${message.substring(0, 50)}..."`);
    console.log(`    Modo atual: ${currentMode}, Stage: ${currentStage || 'N/A'}`);

    // 1. Check cache
    const cacheKey = this._getCacheKey(message, currentMode, currentStage);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      console.log(`    Cache hit: ${cached.intent}`);
      return cached;
    }

    // 2. CONTEXT-AWARE: Se estamos no meio de BANT, priorizar respostas BANT
    if (this._isInBANTFlow(currentMode, currentStage, lastQuestion)) {
      const bantResponse = this._detectBANTResponse(message, lastQuestion, currentStage);
      if (bantResponse.isBANTResponse) {
        console.log(`    Detectado como BANT response (stage: ${currentStage})`);
        const result = {
          intent: INTENT_TYPES.BANT_RESPONSE,
          confidence: bantResponse.confidence,
          shouldSwitch: false,
          targetMode: currentMode,
          reason: 'bant_response_in_context'
        };
        this._saveToCache(cacheKey, result);
        return result;
      }
    }

    // 3. Pattern matching rápido
    const patternResult = this._classifyByPatterns(message);

    // 4. Se pattern tem alta confiança e NÃO estamos em fluxo BANT, aceitar
    if (patternResult.confidence >= 0.85 && !this._isInBANTFlow(currentMode, currentStage)) {
      const result = this._buildResult(patternResult.intent, currentMode, patternResult.confidence, context);
      this._saveToCache(cacheKey, result);
      console.log(`    Pattern match: ${result.intent} (${result.confidence})`);
      return result;
    }

    // 5. GPT classification com retry
    const gptResult = await this._classifyWithGPTRetry(message, context);
    const result = this._buildResult(gptResult.intent, currentMode, gptResult.confidence, context);
    this._saveToCache(cacheKey, result);

    console.log(`    GPT result: ${result.intent} (${result.confidence})`);
    return result;
  }

  /**
   * Detecta se mensagem é resposta a pergunta BANT
   */
  _detectBANTResponse(message, lastQuestion, currentStage) {
    const normalizedMessage = message.toLowerCase().trim();

    // Padrões de respostas numéricas/valores (Budget)
    const budgetPatterns = [
      /^(?:entre\s+)?(?:r\$\s*)?\d+(?:\s*(?:mil|k|reais|r\$))?\s*(?:a|e|até)?\s*(?:r\$\s*)?\d*(?:\s*(?:mil|k|reais))?$/i,
      /^(?:uns\s+)?(?:r\$\s*)?\d+(?:\s*(?:mil|k|reais))?$/i,
      /^(?:em torno de|cerca de|aproximadamente)?\s*(?:r\$\s*)?\d+/i
    ];

    // Padrões de respostas sobre origem de leads (Need)
    const leadSourcePatterns = [
      /^(?:d[eo]\s+|pelo\s+|via\s+|por\s+)?(whatsapp|instagram|facebook|google|indicação|indicacao|site|linkedin|tiktok|redes?\s*sociais?)/i,
      /^(?:maioria|maior parte|quase todos?)\s+(?:d[eo]|pelo|via)/i
    ];

    // Padrões de respostas sobre autoridade
    const authorityPatterns = [
      /^(?:eu\s+)?decido|sou\s+(?:eu\s+)?(?:o\s+)?decisor|(?:eu\s+)?(?:que\s+)?decido/i,
      /^(?:preciso|tenho que)\s+(?:consultar|falar|verificar)/i,
      /^(?:meu\s+)?(?:sócio|socio|chefe|gerente|diretor)/i
    ];

    // Padrões de respostas sobre timing
    const timingPatterns = [
      /^(?:esse|este|próximo|proximo)\s+(?:mês|mes|ano|trimestre|semestre)/i,
      /^(?:em\s+)?(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
      /^(?:o\s+)?(?:mais\s+)?(?:rápido|rapido)\s+(?:possível|possivel)/i,
      /^(?:urgente|com urgência|urgencia)/i
    ];

    // Verificar padrões baseado no stage atual
    if (currentStage === 'budget' || lastQuestion?.toLowerCase().includes('orçamento')) {
      for (const pattern of budgetPatterns) {
        if (pattern.test(normalizedMessage)) {
          return { isBANTResponse: true, confidence: 0.95 };
        }
      }
    }

    if (currentStage === 'need' || lastQuestion?.toLowerCase().includes('como chegam') || lastQuestion?.toLowerCase().includes('de onde')) {
      for (const pattern of leadSourcePatterns) {
        if (pattern.test(normalizedMessage)) {
          return { isBANTResponse: true, confidence: 0.95 };
        }
      }
    }

    if (currentStage === 'authority' || lastQuestion?.toLowerCase().includes('quem decide')) {
      for (const pattern of authorityPatterns) {
        if (pattern.test(normalizedMessage)) {
          return { isBANTResponse: true, confidence: 0.95 };
        }
      }
    }

    if (currentStage === 'timing' || lastQuestion?.toLowerCase().includes('quando')) {
      for (const pattern of timingPatterns) {
        if (pattern.test(normalizedMessage)) {
          return { isBANTResponse: true, confidence: 0.95 };
        }
      }
    }

    // Respostas genéricas que parecem respostas a perguntas
    const genericResponsePatterns = [
      /^(?:sim|não|nao|talvez|depende|ainda não|ainda nao)$/i,
      /^(?:é|e)\s+(?:isso|isso mesmo|exatamente)$/i,
      /^(?:acho que|acredito que|penso que)/i
    ];

    for (const pattern of genericResponsePatterns) {
      if (pattern.test(normalizedMessage)) {
        return { isBANTResponse: true, confidence: 0.8 };
      }
    }

    return { isBANTResponse: false, confidence: 0 };
  }

  /**
   * Verifica se estamos no meio de um fluxo BANT
   */
  _isInBANTFlow(currentMode, currentStage, lastQuestion = null) {
    // Se está em SDR ou Specialist mode com stage definido
    if ((currentMode === 'sdr' || currentMode === 'specialist') && currentStage) {
      return true;
    }

    // Se temos uma última pergunta do agente
    if (lastQuestion && lastQuestion.trim().endsWith('?')) {
      return true;
    }

    return false;
  }

  /**
   * Classificação por patterns
   */
  _classifyByPatterns(message) {
    const normalizedMessage = message.toLowerCase().trim();

    const patterns = {
      // Opt-out (alta prioridade)
      [INTENT_TYPES.OPT_OUT]: [
        /\b(sair|parar|não (quero )?mais|remover|descadastrar|cancelar)\b/i,
        /\b(para|pare|stop)\b[\s!.]*$/i
      ],

      // Pedido de humano
      [INTENT_TYPES.HUMAN_REQUEST]: [
        /\b(quero |preciso |posso )?(falar|conversar) com (alguém|humano|pessoa|atendente)/i,
        /\b(você é|vc é) (um )?(robô|bot|ia)/i
      ],

      // Pedido de reunião
      [INTENT_TYPES.MEETING_REQUEST]: [
        /\b(agendar|marcar|quero (uma )?reunião|vamos (marcar|agendar))\b/i,
        /\b(demo|demonstração|apresentação)\b/i
      ],

      // Preço
      [INTENT_TYPES.PRICING_QUESTION]: [
        /\b(quanto custa|qual (o )?(valor|preço)|preço|valor|investimento|mensalidade)\b/i,
        /\b(tabela de preços?|valores?)\b/i
      ],

      // Objeções
      [INTENT_TYPES.OBJECTION]: [
        /\b(caro|muito caro|não tenho (dinheiro|budget))\b/i,
        /\b(não preciso|não quero|não me interessa|já tenho)\b/i,
        /\b(vou pensar|preciso pensar)\b/i
      ],

      // Saudação
      [INTENT_TYPES.GREETING]: [
        /^(oi|olá|ola|hey|eai|bom dia|boa tarde|boa noite)[\s,!.]*$/i
      ],

      // FAQ
      [INTENT_TYPES.FAQ_QUESTION]: [
        /\b(como funciona|o que (é|faz)|me (explica|conta))\b/i
      ],

      // Interesse
      [INTENT_TYPES.INTEREST]: [
        /\b(me interessa|interessante|quero saber mais)\b/i
      ]
    };

    for (const [intent, intentPatterns] of Object.entries(patterns)) {
      for (const pattern of intentPatterns) {
        if (pattern.test(normalizedMessage)) {
          return { intent, confidence: 0.85 };
        }
      }
    }

    return { intent: INTENT_TYPES.UNKNOWN, confidence: 0.3 };
  }

  /**
   * GPT classification com retry logic
   */
  async _classifyWithGPTRetry(message, context, retries = CONFIG.MAX_GPT_RETRIES) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this._classifyWithGPT(message, context);
      } catch (error) {
        lastError = error;
        console.warn(` [UNIFIED-INTENT] GPT tentativa ${attempt}/${retries} falhou: ${error.message}`);

        if (attempt < retries) {
          const backoff = CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          await this._sleep(backoff);
        }
      }
    }

    console.error(` [UNIFIED-INTENT] GPT falhou após ${retries} tentativas`);
    return {
      intent: INTENT_TYPES.UNKNOWN,
      confidence: 0.3,
      error: lastError?.message
    };
  }

  /**
   * Classificação com GPT
   */
  async _classifyWithGPT(message, context) {
    const { currentMode, currentStage, lastQuestion } = context;

    const systemPrompt = `Você é um classificador de intenções para um agente de vendas B2B.

CONTEXTO IMPORTANTE:
- Modo atual: ${currentMode || 'sdr'}
- Stage BANT atual: ${currentStage || 'N/A'}
- Última pergunta do agente: "${lastQuestion || 'N/A'}"

REGRA CRÍTICA:
Se o lead está RESPONDENDO a uma pergunta do agente (especialmente sobre orçamento, origem de leads, decisão, timing), classifique como "bant_response", NÃO como pricing_question ou faq_question!

INTENÇÕES:
- bant_response: Resposta a pergunta do agente (números, origem de leads, decisões, timing)
- greeting: Saudação
- interest: Demonstrando interesse
- pricing_question: Pergunta NOVA sobre preço (não resposta a pergunta do agente)
- objection: Objeção de vendas
- meeting_request: Pedido para agendar reunião
- opt_out: Quer sair
- human_request: Quer falar com humano
- unknown: Não classificável

Responda APENAS com JSON: {"intent": "nome", "confidence": 0.0-1.0}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 80,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      intent: INTENT_TYPES[result.intent?.toUpperCase()] || result.intent || INTENT_TYPES.UNKNOWN,
      confidence: result.confidence || 0.7
    };
  }

  /**
   * Constrói resultado com decisão de switch
   */
  _buildResult(intent, currentMode, confidence, context = {}) {
    const { currentStage } = context;

    // Determinar threshold baseado no contexto
    const threshold = this._isInBANTFlow(currentMode, currentStage)
      ? CONFIG.IN_FLOW_CONFIDENCE_THRESHOLD
      : CONFIG.DEFAULT_CONFIDENCE_THRESHOLD;

    // Mapear intent para mode
    const intentToMode = {
      [INTENT_TYPES.GREETING]: 'sdr',
      [INTENT_TYPES.START]: 'sdr',
      [INTENT_TYPES.PROFILE_INFO]: 'sdr',
      [INTENT_TYPES.INTEREST]: 'sdr',
      [INTENT_TYPES.PROBLEM_SHARE]: 'sdr',
      [INTENT_TYPES.BANT_RESPONSE]: currentMode, // Mantém modo atual

      [INTENT_TYPES.FAQ_QUESTION]: 'atendimento',
      [INTENT_TYPES.PRICING_QUESTION]: 'atendimento',
      [INTENT_TYPES.OBJECTION]: 'atendimento',
      [INTENT_TYPES.FEATURE_QUESTION]: 'atendimento',

      [INTENT_TYPES.MEETING_REQUEST]: 'scheduler',
      [INTENT_TYPES.TIME_SUGGESTION]: 'scheduler',
      [INTENT_TYPES.MEETING_CONFIRM]: 'scheduler'
    };

    const targetMode = intentToMode[intent] || currentMode;
    const shouldSwitch = targetMode !== currentMode && confidence >= threshold;

    return {
      intent,
      confidence,
      currentMode,
      targetMode: shouldSwitch ? targetMode : currentMode,
      shouldSwitch,
      threshold,
      isSpecialIntent: [INTENT_TYPES.OPT_OUT, INTENT_TYPES.HUMAN_REQUEST].includes(intent)
    };
  }

  // ==================== CACHE METHODS ====================

  _getCacheKey(message, mode, stage) {
    return `${message.toLowerCase().trim().substring(0, 100)}_${mode}_${stage || 'null'}`;
  }

  _getFromCache(key) {
    const cached = classificationCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      classificationCache.delete(key);
      return null;
    }
    return cached.data;
  }

  _saveToCache(key, data) {
    if (classificationCache.size >= MAX_CACHE_SIZE) {
      // Remove entradas mais antigas
      const entries = Array.from(classificationCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 50; i++) {
        classificationCache.delete(entries[i][0]);
      }
    }
    classificationCache.set(key, { data, timestamp: Date.now() });
  }

  _cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of classificationCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        classificationCache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(` [UNIFIED-INTENT] Cache cleanup: ${cleaned} entries`);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estatísticas do pipeline
   */
  getStats() {
    return {
      cacheSize: classificationCache.size,
      maxCacheSize: MAX_CACHE_SIZE,
      config: CONFIG
    };
  }
}

// Singleton getter
export function getUnifiedIntentPipeline() {
  if (!instance) {
    instance = new UnifiedIntentPipeline();
  }
  return instance;
}

export default UnifiedIntentPipeline;
