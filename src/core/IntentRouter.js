// core/IntentRouter.js
//  INTENT ROUTER - Classificador Central de Intenções
// Responsável por analisar CADA mensagem e decidir para qual modo rotear

/**
 * IntentRouter - Roteador Inteligente de Intenções
 *
 * RESPONSABILIDADES:
 * 1. Classificar intenção de CADA mensagem recebida
 * 2. Decidir qual modo deve processar (SDR, ATENDIMENTO, SCHEDULER)
 * 3. Detectar mudanças de contexto (ex: lead perguntando preço no meio do BANT)
 * 4. Manter histórico de intenções para contexto
 *
 * PRINCÍPIOS:
 * - Análise rápida (regras primeiro, GPT só se necessário)
 * - Não bloqueia o fluxo
 * - Prioriza experiência natural do lead
 */

//  FIX: Use singleton OpenAI client instead of creating new instance
import openaiClient from './openai_client.js';
//  FIX P0: Import unified pipeline for context-aware classification
import { getUnifiedIntentPipeline } from '../intelligence/UnifiedIntentPipeline.js';

const openai = openaiClient.getClient();

// Cache de classificações recentes (evita chamadas repetidas ao GPT)
const classificationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const CACHE_MAX_SIZE = 500; //  FIX: Limite máximo de entradas

//  FIX: Periodic cache cleanup to prevent memory leaks
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 segundos (reduzido de 60s)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  // 1. Limpar entradas expiradas
  for (const [key, entry] of classificationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      classificationCache.delete(key);
      cleaned++;
    }
  }

  // 2. Se ainda acima do limite, remover mais antigas
  if (classificationCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(classificationCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = classificationCache.size - CACHE_MAX_SIZE;
    for (let i = 0; i < toRemove; i++) {
      classificationCache.delete(entries[i][0]);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(` [IntentRouter] Cleaned ${cleaned} cache entries (size: ${classificationCache.size})`);
  }
}, CLEANUP_INTERVAL_MS);

// Singleton
let instance = null;

/**
 * Tipos de intenção suportados
 */
export const INTENT_TYPES = {
  // Intenções de SAUDAÇÃO/INÍCIO
  GREETING: 'greeting',              // "Oi", "Bom dia", "Olá"
  START: 'start',                    // "/start", início de campanha

  // Intenções de QUALIFICAÇÃO (SDR)
  PROFILE_INFO: 'profile_info',      // Lead dando info sobre si/empresa
  INTEREST: 'interest',              // "Quero saber mais", "Me interessa"
  PROBLEM_SHARE: 'problem_share',    // Lead compartilhando dor/problema

  // Intenções de ATENDIMENTO
  FAQ_QUESTION: 'faq_question',      // "Como funciona?", "O que vocês fazem?"
  PRICING_QUESTION: 'pricing_question', // "Quanto custa?", "Qual o valor?"
  OBJECTION: 'objection',            // "Tá caro", "Não preciso", "Já tenho"
  FEATURE_QUESTION: 'feature_question', // "Tem integração com X?", "Faz Y?"
  COMPARISON: 'comparison',          // "Qual diferença de vocês pra X?"

  // Intenções de AGENDAMENTO (SCHEDULER)
  MEETING_REQUEST: 'meeting_request', // "Quero agendar", "Vamos marcar"
  TIME_SUGGESTION: 'time_suggestion', // "Terça às 10h", "Semana que vem"
  MEETING_CONFIRM: 'meeting_confirm', // "Confirmado", "Pode ser"
  MEETING_RESCHEDULE: 'meeting_reschedule', // "Preciso remarcar"

  // Intenções ESPECIAIS
  OPT_OUT: 'opt_out',                // "Sair", "Não quero mais"
  HUMAN_REQUEST: 'human_request',    // "Quero falar com humano"
  CONFUSION: 'confusion',            // Lead confuso, precisa clarificação
  OFF_TOPIC: 'off_topic',            // Assunto não relacionado

  // Fallback
  UNKNOWN: 'unknown'
};

/**
 * Modos de operação do agente
 */
export const AGENT_MODES = {
  SDR: 'sdr',                 // Qualificação consultiva
  ATENDIMENTO: 'atendimento', // FAQ, objeções, preços
  SCHEDULER: 'scheduler'      // Agendamento de reunião
};

/**
 * Mapeamento de intenção para modo
 */
const INTENT_TO_MODE = {
  // SDR Mode
  [INTENT_TYPES.GREETING]: AGENT_MODES.SDR,
  [INTENT_TYPES.START]: AGENT_MODES.SDR,
  [INTENT_TYPES.PROFILE_INFO]: AGENT_MODES.SDR,
  [INTENT_TYPES.INTEREST]: AGENT_MODES.SDR,
  [INTENT_TYPES.PROBLEM_SHARE]: AGENT_MODES.SDR,

  // Atendimento Mode
  [INTENT_TYPES.FAQ_QUESTION]: AGENT_MODES.ATENDIMENTO,
  [INTENT_TYPES.PRICING_QUESTION]: AGENT_MODES.ATENDIMENTO,
  [INTENT_TYPES.OBJECTION]: AGENT_MODES.ATENDIMENTO,
  [INTENT_TYPES.FEATURE_QUESTION]: AGENT_MODES.ATENDIMENTO,
  [INTENT_TYPES.COMPARISON]: AGENT_MODES.ATENDIMENTO,

  // Scheduler Mode
  [INTENT_TYPES.MEETING_REQUEST]: AGENT_MODES.SCHEDULER,
  [INTENT_TYPES.TIME_SUGGESTION]: AGENT_MODES.SCHEDULER,
  [INTENT_TYPES.MEETING_CONFIRM]: AGENT_MODES.SCHEDULER,
  [INTENT_TYPES.MEETING_RESCHEDULE]: AGENT_MODES.SCHEDULER,

  // Especiais (tratados pelo modo atual ou SDR)
  [INTENT_TYPES.OPT_OUT]: null,        // Tratamento especial
  [INTENT_TYPES.HUMAN_REQUEST]: null,  // Tratamento especial
  [INTENT_TYPES.CONFUSION]: null,      // Mantém modo atual
  [INTENT_TYPES.OFF_TOPIC]: null,      // Mantém modo atual
  [INTENT_TYPES.UNKNOWN]: null         // Mantém modo atual
};

export class IntentRouter {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    // Padrões de regex para classificação rápida (sem GPT)
    this.patterns = this._initializePatterns();

    //  FIX P0: Pipeline unificado para context-aware classification
    this.unifiedPipeline = getUnifiedIntentPipeline();

    console.log(' [IntentRouter] Inicializado');
  }

  /**
   * Inicializa padrões de regex para classificação rápida
   */
  _initializePatterns() {
    return {
      // Saudações
      [INTENT_TYPES.GREETING]: [
        /^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|salve|fala)[\s,!.]*$/i,
        /^(oi|olá|ola|hey)[\s,!.]*(tudo bem|tudo certo|como vai)?[\s?!.]*$/i
      ],

      // Start de campanha
      [INTENT_TYPES.START]: [
        /^\/start$/i,
        /^(começar|iniciar|start)$/i
      ],

      // Perguntas sobre preço
      [INTENT_TYPES.PRICING_QUESTION]: [
        /\b(quanto custa|qual (o )?(valor|preço)|preço|valor|investimento|mensalidade)\b/i,
        /\b(tabela de preços?|valores?|planos?.*preços?)\b/i,
        /\b(custa quanto|sai quanto|fica quanto)\b/i
      ],

      // Objeções
      [INTENT_TYPES.OBJECTION]: [
        /\b(caro|muito caro|não tenho (dinheiro|grana|budget)|sem (dinheiro|grana|budget))\b/i,
        /\b(não preciso|não quero|não me interessa|já tenho|já uso)\b/i,
        /\b(depois|agora não|outro momento|não é hora)\b/i,
        /\b(vou pensar|deixa eu pensar|preciso pensar)\b/i,
        /\b(não sei se|tenho dúvida se|será que vale)\b/i
      ],

      // Pedido de reunião
      [INTENT_TYPES.MEETING_REQUEST]: [
        /\b(agendar|marcar|quero (uma )?reunião|vamos (marcar|agendar))\b/i,
        /\b(podemos (conversar|marcar)|quando (podemos|posso))\b/i,
        /\b(demo|demonstração|apresentação)\b/i
      ],

      // Sugestão de horário
      [INTENT_TYPES.TIME_SUGGESTION]: [
        /\b(segunda|terça|quarta|quinta|sexta|sábado|domingo)\b.*\b(\d{1,2}(h|:\d{2})?)\b/i,
        /\b(amanhã|hoje|semana que vem|próxima semana)\b.*\b(às?\s*\d{1,2})\b/i,
        /\b(\d{1,2}(h|:\d{2})|manhã|tarde|noite)\b/i
      ],

      // Confirmação de reunião
      [INTENT_TYPES.MEETING_CONFIRM]: [
        /^(confirmado|confirmo|pode ser|fechado|combinado|ok|perfeito|beleza)[\s!.]*$/i,
        /\b(confirmo|está confirmado|tá confirmado|pode confirmar)\b/i
      ],

      // FAQ / Como funciona
      [INTENT_TYPES.FAQ_QUESTION]: [
        /\b(como funciona|o que (é|faz)|me (explica|conta)|funciona como)\b/i,
        /\b(quais? (são )?(os )?(recursos|funcionalidades|features))\b/i,
        /\b(serve (pra|para) que|pra que serve)\b/i
      ],

      // Perguntas sobre features
      [INTENT_TYPES.FEATURE_QUESTION]: [
        /\b(tem|possui|faz|integra|suporta)\b.*\b(integração|api|whatsapp|excel|nf|nota fiscal)\b/i,
        /\b(funciona com|conecta com|integra com)\b/i,
        /\b(dá (pra|para)|consigo|posso)\b.*\b(fazer|usar|integrar)\b/i
      ],

      // Comparação com concorrentes
      [INTENT_TYPES.COMPARISON]: [
        /\b(diferença|diferente|melhor que|comparado|versus|vs)\b/i,
        /\b(por ?que|porque) (vocês|essa|esse|a leadly)\b/i
      ],

      // Opt-out
      [INTENT_TYPES.OPT_OUT]: [
        /\b(sair|parar|não (quero )?mais|remover|descadastrar|cancelar)\b/i,
        /\b(para|pare|stop)\b[\s!.]*$/i
      ],

      // Pedido de humano - DEVE ter contexto de pedido explícito
      [INTENT_TYPES.HUMAN_REQUEST]: [
        /\b(quero |preciso |posso )?(falar|conversar) com (alguém|humano|pessoa|atendente|vendedor|gente)/i,
        /\b(quero|preciso|tem|há) (um )?(atendente|humano|pessoa real)/i,
        /\b(você é|vc é|voce é|tu é) (um )?(robô|bot|ia|robo|máquina|maquina)\b/i,
        /\b(atendimento humano|falar com gente|pessoa de verdade)\b/i
      ],

      // Informações de perfil (lead dando dados)
      [INTENT_TYPES.PROFILE_INFO]: [
        /\b(meu nome é|me chamo|sou o|sou a)\b/i,
        /\b(minha empresa|meu negócio|trabalho (com|em|na|no))\b/i,
        /\b(somos|temos)\s+\d+\s*(funcionários|pessoas|colaboradores)\b/i,
        /\b(faturamento|faturamos|receita)\b.*\b(mil|k|reais|r\$)\b/i,
        // Respostas sobre origem de clientes (de onde vêm os leads)
        /^(d[eo] |pelo |via |por )?(whatsapp|instagram|facebook|google|indicação|indicacao|site|linkedin|tiktok|redes? sociais?)/i,
        /\b(vem|vêm|chegam?) (d[eo]|pelo|via|por) (whatsapp|instagram|facebook|google|indicação|indicacao|site)/i,
        /\b(maioria|maior parte|quase todos?) (d[eo]|pelo|via|por) (whatsapp|instagram|facebook|indicação)/i
      ],

      // Compartilhando problema/dor
      [INTENT_TYPES.PROBLEM_SHARE]: [
        /\b(meu (problema|desafio)|preciso de|estou (com|tendo))\b/i,
        /\b(dificuldade|difícil|complicado|bagunçado|desorganizado)\b/i,
        /\b(não consigo|não sei como|não tenho controle)\b/i
      ],

      // Interesse
      [INTENT_TYPES.INTEREST]: [
        /\b(me interessa|interessante|quero saber mais|conta mais)\b/i,
        /\b(gostei|curti|parece bom|parece legal)\b/i
      ]
    };
  }

  /**
   * MÉTODO PRINCIPAL: Classifica intenção da mensagem
   *  FIX P0: Usa UnifiedPipeline para context-aware classification
   *
   * @param {string} message - Texto da mensagem
   * @param {Object} context - Contexto da conversa
   * @returns {Object} { intent, mode, confidence, shouldSwitch }
   */
  async classifyIntent(message, context = {}) {
    const {
      currentMode = AGENT_MODES.SDR,
      conversationHistory = [],
      leadProfile = {},
      leadState = null
    } = context;

    console.log(`\n [IntentRouter] Classificando: "${message.substring(0, 50)}..."`);

    //  FIX P0: Extrair contexto BANT do leadState
    const currentStage = leadState?.bantStages?.currentStage ||
                         leadState?.consultativeEngine?.currentStage ||
                         leadState?.metadata?.currentBANTStage ||
                         null;

    const lastQuestion = leadState?.metadata?.lastBotMessage ||
                         conversationHistory[conversationHistory.length - 1]?.botMessage ||
                         null;

    // 1. Verificar cache (com contexto de stage)
    const cacheKey = `${message.toLowerCase().trim()}_${currentMode}_${currentStage || 'null'}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      console.log(` [IntentRouter] Cache hit: ${cached.intent}`);
      return cached;
    }

    //  FIX P0: Se estamos em fluxo BANT, usar UnifiedPipeline para context-awareness
    const isInBANTFlow = (currentMode === 'sdr' || currentMode === 'specialist') &&
                         (currentStage || lastQuestion);

    if (isInBANTFlow) {
      console.log(`    [IntentRouter] Em fluxo BANT - usando UnifiedPipeline`);

      const unifiedResult = await this.unifiedPipeline.classify(message, {
        currentMode,
        currentStage,
        lastQuestion,
        conversationHistory,
        leadState
      });

      // Converter resultado do UnifiedPipeline para formato do IntentRouter
      const result = {
        intent: unifiedResult.intent,
        currentMode,
        targetMode: unifiedResult.targetMode,
        shouldSwitch: unifiedResult.shouldSwitch,
        confidence: unifiedResult.confidence,
        isSpecialIntent: unifiedResult.isSpecialIntent || false,
        contextAware: true
      };

      this._saveToCache(cacheKey, result);
      console.log(`    [IntentRouter] UnifiedPipeline: ${result.intent} (${result.confidence})`);
      return result;
    }

    // 2. Tentar classificação por padrões (rápido, sem GPT)
    const patternResult = this._classifyByPatterns(message);

    if (patternResult.confidence >= 0.8) {
      const result = this._buildResult(patternResult.intent, currentMode, patternResult.confidence);
      this._saveToCache(cacheKey, result);
      console.log(` [IntentRouter] Pattern match: ${result.intent} (${result.confidence})`);
      return result;
    }

    // 3. Se padrão não foi conclusivo, usar GPT com retry
    const gptResult = await this._classifyWithGPTRetry(message, context);
    const result = this._buildResult(gptResult.intent, currentMode, gptResult.confidence);
    this._saveToCache(cacheKey, result);

    console.log(` [IntentRouter] GPT classification: ${result.intent} (${result.confidence})`);
    return result;
  }

  /**
   *  FIX P1: GPT classification com retry logic
   */
  async _classifyWithGPTRetry(message, context, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this._classifyWithGPT(message, context);
      } catch (error) {
        lastError = error;
        console.warn(` [IntentRouter] GPT tentativa ${attempt}/${maxRetries} falhou: ${error.message}`);

        if (attempt < maxRetries) {
          const backoff = 200 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    console.error(` [IntentRouter] GPT falhou após ${maxRetries} tentativas`);
    return {
      intent: INTENT_TYPES.UNKNOWN,
      confidence: 0.3,
      error: lastError?.message
    };
  }

  /**
   * Classificação por padrões de regex (rápida)
   */
  _classifyByPatterns(message) {
    const normalizedMessage = message.toLowerCase().trim();

    for (const [intent, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedMessage)) {
          return {
            intent,
            confidence: 0.85
          };
        }
      }
    }

    return {
      intent: INTENT_TYPES.UNKNOWN,
      confidence: 0.3
    };
  }

  /**
   * Classificação com GPT (mais precisa, mais lenta)
   */
  async _classifyWithGPT(message, context) {
    try {
      const systemPrompt = `Você é um classificador de intenções para um agente de vendas B2B.
Analise a mensagem do lead e classifique a intenção.

INTENÇÕES POSSÍVEIS:
- greeting: Saudação inicial (oi, olá, bom dia)
- profile_info: Lead dando informações sobre si ou empresa (inclui respostas sobre origem de clientes: "do whatsapp", "do instagram", "indicação", etc.)
- interest: Demonstrando interesse geral
- problem_share: Compartilhando problema ou dor
- faq_question: Pergunta sobre como funciona o produto
- pricing_question: Pergunta sobre preço ou valor
- objection: Objeção de vendas (caro, não preciso, já tenho)
- feature_question: Pergunta sobre funcionalidade específica
- comparison: Comparação com concorrentes
- meeting_request: Pedido para agendar reunião
- time_suggestion: Sugerindo horário para reunião
- meeting_confirm: Confirmando reunião
- opt_out: Quer sair/parar de receber mensagens
- human_request: Quer EXPLICITAMENTE falar com humano/atendente (CUIDADO: "do whatsapp" NÃO é human_request, é profile_info!)
- unknown: Não conseguiu classificar

ATENÇÃO ESPECIAL:
- Se o lead está respondendo uma pergunta sobre "de onde vêm os clientes" com "whatsapp", "instagram", "indicação", etc., isso é PROFILE_INFO, NÃO é human_request!
- human_request SOMENTE quando o lead PEDE para falar com pessoa/humano/atendente.

CONTEXTO:
- Modo atual: ${context.currentMode || 'sdr'}
- Histórico: ${context.conversationHistory?.slice(-3).map(m => m.text).join(' | ') || 'Nenhum'}

Responda APENAS com JSON:
{"intent": "nome_da_intencao", "confidence": 0.0-1.0, "reasoning": "breve explicação"}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        intent: INTENT_TYPES[result.intent?.toUpperCase()] || result.intent || INTENT_TYPES.UNKNOWN,
        confidence: result.confidence || 0.7
      };

    } catch (error) {
      console.error(' [IntentRouter] Erro GPT:', error.message);
      return {
        intent: INTENT_TYPES.UNKNOWN,
        confidence: 0.3
      };
    }
  }

  /**
   * Constrói resultado final com decisão de roteamento
   */
  _buildResult(intent, currentMode, confidence) {
    const targetMode = INTENT_TO_MODE[intent];

    // Decidir se deve trocar de modo
    let shouldSwitch = false;
    let finalMode = currentMode;

    if (targetMode && targetMode !== currentMode) {
      // Só troca se confiança alta ou intenção clara
      if (confidence >= 0.7) {
        shouldSwitch = true;
        finalMode = targetMode;
      }
    }

    // Casos especiais que sempre trocam
    if (intent === INTENT_TYPES.MEETING_REQUEST && currentMode !== AGENT_MODES.SCHEDULER) {
      shouldSwitch = true;
      finalMode = AGENT_MODES.SCHEDULER;
    }

    if (intent === INTENT_TYPES.PRICING_QUESTION || intent === INTENT_TYPES.OBJECTION) {
      // Preço e objeção SEMPRE vão para atendimento, independente do modo
      shouldSwitch = currentMode !== AGENT_MODES.ATENDIMENTO;
      finalMode = AGENT_MODES.ATENDIMENTO;
    }

    return {
      intent,
      currentMode,
      targetMode: finalMode,
      shouldSwitch,
      confidence,
      isSpecialIntent: [
        INTENT_TYPES.OPT_OUT,
        INTENT_TYPES.HUMAN_REQUEST
      ].includes(intent)
    };
  }

  /**
   * Verifica se deve interromper fluxo atual para tratar intenção
   */
  shouldInterrupt(intentResult) {
    // Sempre interrompe para:
    // - Perguntas sobre preço
    // - Objeções
    // - Pedido de reunião
    // - Opt-out
    // - Pedido de humano
    const interruptIntents = [
      INTENT_TYPES.PRICING_QUESTION,
      INTENT_TYPES.OBJECTION,
      INTENT_TYPES.MEETING_REQUEST,
      INTENT_TYPES.OPT_OUT,
      INTENT_TYPES.HUMAN_REQUEST
    ];

    return interruptIntents.includes(intentResult.intent) && intentResult.confidence >= 0.7;
  }

  /**
   * Sugere próxima ação baseado na intenção
   */
  suggestAction(intentResult) {
    const actions = {
      [INTENT_TYPES.GREETING]: 'welcome',
      [INTENT_TYPES.PRICING_QUESTION]: 'show_pricing',
      [INTENT_TYPES.OBJECTION]: 'handle_objection',
      [INTENT_TYPES.FAQ_QUESTION]: 'answer_faq',
      [INTENT_TYPES.MEETING_REQUEST]: 'offer_slots',
      [INTENT_TYPES.OPT_OUT]: 'process_optout',
      [INTENT_TYPES.HUMAN_REQUEST]: 'transfer_human',
      [INTENT_TYPES.PROFILE_INFO]: 'extract_profile',
      [INTENT_TYPES.PROBLEM_SHARE]: 'explore_pain',
      [INTENT_TYPES.INTEREST]: 'deepen_interest'
    };

    return actions[intentResult.intent] || 'continue_flow';
  }

  // Cache helpers
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
    classificationCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    classificationCache.clear();
  }
}

// Singleton getter
export function getIntentRouter() {
  if (!instance) {
    instance = new IntentRouter();
  }
  return instance;
}

export default IntentRouter;
