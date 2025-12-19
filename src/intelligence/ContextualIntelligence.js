// intelligence/ContextualIntelligence.js
//  Sistema de Inteligência Contextual - Detecta Meta-Referências e Intenções Ocultas

/**
 * PROBLEMA RESOLVIDO:
 * - Agente não entende quando usuário fala SOBRE ele ("o agente não funciona")
 * - Não detecta frustração ou confusão
 * - Não identifica pedidos de escalação humana
 * - Não percebe respostas provocativas/teste
 *
 * SOLUÇÃO:
 * - Análise semântica de meta-referências
 * - Detecção de sentimento e intenção
 * - Identificação de pedidos implícitos
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class ContextualIntelligence {
  constructor() {
    this.cache = new Map(); // Cache de análises recentes (5 min)
    this.cacheTimeout = 5 * 60 * 1000;
  }

  /**
   * ANÁLISE COMPLETA DE CONTEXTO
   * Detecta múltiplos sinais contextuais na mensagem
   */
  async analyzeContext(message, conversationHistory = []) {
    const cacheKey = this._getCacheKey(message);

    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.analysis;
      }
    }

    // 1. Detecções rápidas (regex/keywords)
    const quickAnalysis = this._quickAnalysis(message);

    // 2. Se detectou algo crítico, fazer análise GPT mais profunda
    if (quickAnalysis.needsDeepAnalysis) {
      const deepAnalysis = await this._deepAnalysis(message, conversationHistory);
      const combined = { ...quickAnalysis, ...deepAnalysis };

      // Armazenar no cache
      this.cache.set(cacheKey, {
        analysis: combined,
        timestamp: Date.now()
      });

      return combined;
    }

    return quickAnalysis;
  }

  /**
   * ANÁLISE RÁPIDA (Regex + Keywords)
   * Detecta padrões óbvios sem usar GPT
   */
  _quickAnalysis(message) {
    const text = message.toLowerCase().trim();
    const analysis = {
      needsDeepAnalysis: false,

      // Meta-referências (falando SOBRE o agente/bot)
      isMetaReference: false,
      metaType: null, // 'complaint', 'confusion', 'praise', 'test'

      // Pedidos de escalação
      wantsHuman: false,
      humanRequest: null, // 'direct', 'implicit'

      // Sentimentos
      hasFrustration: false,
      hasConfusion: false,
      isProfane: false,
      isProvocative: false,

      // Contexto de conversação
      isOffTopic: false,
      isJoke: false,

      // Flags de ação
      shouldEscalate: false,
      shouldAcknowledge: true,
      responseStrategy: 'normal' // 'empathetic', 'clarifying', 'escalating'
    };

    // DETECÇÃO: Meta-referências sobre o agente/bot
    const metaPatterns = {
      complaint: [
        /\b(agente|bot|sistema|você|vc)\s+(não|nao)\s+(entende|funciona|responde|faz)/i,
        /\b(agente|bot|sistema|você|vc)\s+(tá|ta|está|esta)\s+(ruim|travado|bugado|com problema)/i,
        /não\s+tá\s+(fazendo|entendendo)\s+o\s+que\s+(peço|pedi|mandei)/i
      ],
      confusion: [
        /não\s+(entendi|entendo|compreendi)\s+(você|vc|o\s+que|isso)/i,
        /tá\s+(confuso|confusa|me\s+confundindo)/i,
        /qual\s+(é\s+a\s+sua|sua)\s+(função|utilidade)/i
      ],
      test: [
        /\bteste\b/i,
        /\btestar\b/i,
        /comemos\s+o\s+cu/i,
        /vai\s+tomar\s+no\s+cu/i
      ]
    };

    for (const [type, patterns] of Object.entries(metaPatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        analysis.isMetaReference = true;
        analysis.metaType = type;
        analysis.needsDeepAnalysis = true;
        break;
      }
    }

    // DETECÇÃO: Pedido de falar com humano
    const humanPatterns = {
      direct: [
        /quero\s+falar\s+com\s+(rodrigo|atendente|humano|pessoa|alguém)/i,
        /me\s+passa\s+(rodrigo|atendente|humano)/i,
        /cadê\s+o\s+(rodrigo|atendente)/i,
        /tive\s+contato\s+com\s+(rodrigo|ele|ela)/i
      ],
      implicit: [
        /preciso\s+de\s+(ajuda|suporte)\s+(humano|real|de\s+verdade)/i,
        /não\s+quero\s+falar\s+com\s+bot/i
      ]
    };

    for (const [type, patterns] of Object.entries(humanPatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        analysis.wantsHuman = true;
        analysis.humanRequest = type;
        analysis.shouldEscalate = true;
        analysis.responseStrategy = 'escalating';
        break;
      }
    }

    // DETECÇÃO: Frustração
    const frustrationPatterns = [
      /não\s+(funciona|adianta|resolve)/i,
      /já\s+(tentei|falei|disse)\s+isso/i,
      /\bdroga\b/i,
      /\bporra\b/i,
      /\bmerda\b/i,
      /tá\s+(difícil|complicado|chato)/i
    ];

    if (frustrationPatterns.some(p => p.test(text))) {
      analysis.hasFrustration = true;
      analysis.responseStrategy = 'empathetic';
    }

    // DETECÇÃO: Confusão
    const confusionPatterns = [
      /não\s+entendi/i,
      /como\s+assim/i,
      /o\s+que\s+(você|vc)\s+(quer|quis)\s+dizer/i,
      /explica\s+melhor/i
    ];

    if (confusionPatterns.some(p => p.test(text))) {
      analysis.hasConfusion = true;
      analysis.responseStrategy = 'clarifying';
    }

    // DETECÇÃO: Linguagem profana/provocativa
    const profanePatterns = [
      /\bcu\b/i,
      /\bcurioso\b.*\bcu\b/i,
      /vai\s+tomar/i,
      /se\s+fod/i
    ];

    if (profanePatterns.some(p => p.test(text))) {
      analysis.isProfane = true;
      analysis.isProvocative = true;
      analysis.shouldAcknowledge = false;
      analysis.responseStrategy = 'polite_decline';
    }

    return analysis;
  }

  /**
   * ANÁLISE PROFUNDA (GPT)
   * Usa GPT para análise semântica mais sofisticada
   */
  async _deepAnalysis(message, conversationHistory) {
    try {
      const historyContext = conversationHistory.slice(-5).map(msg =>
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const prompt = `Analise a seguinte mensagem do usuário e identifique:

MENSAGEM: "${message}"

HISTÓRICO RECENTE:
${historyContext || 'Nenhum histórico disponível'}

Retorne JSON com:
{
  "isComplaining": boolean,  // Está reclamando do agente/sistema?
  "mainConcern": string,     // Principal preocupação (se houver)
  "suggestedTone": string,   // "empathetic", "clarifying", "professional"
  "needsHumanEscalation": boolean,  // Realmente precisa escalar?
  "contextSummary": string   // Resumo do contexto (1 frase)
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um analisador de intenção e sentimento em conversas de atendimento. Retorne apenas JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 250
      });

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {};
    } catch (error) {
      console.error(' [ContextualIntelligence] Erro na análise profunda:', error.message);
      return {};
    }
  }

  /**
   * GERAR RESPOSTA CONTEXTUAL
   * Baseado na análise, gera resposta apropriada
   */
  generateContextualResponse(analysis, leadName = null) {
    const name = leadName ? `, ${leadName}` : '';

    // Caso: Usuário quer falar com humano (pedido direto)
    if (analysis.wantsHuman && analysis.humanRequest === 'direct') {
      return {
        shouldIntercept: true,
        response: `Entendi${name}! Vou conectar você com o Rodrigo da nossa equipe. Um momento, por favor.`,
        action: 'escalate_to_human',
        metadata: { reason: 'direct_human_request' }
      };
    }

    // Caso: Meta-referência - reclamação sobre o agente
    if (analysis.isMetaReference && analysis.metaType === 'complaint') {
      return {
        shouldIntercept: true,
        response: `${name ? name.replace(',', '') : 'Amigo'}, vi que você está tendo dificuldades. Deixa eu te conectar com alguém da equipe que pode te ajudar melhor. Só um instante!`,
        action: 'escalate_to_human',
        metadata: { reason: 'complaint_about_agent' }
      };
    }

    // Caso: Meta-referência - teste/provocação
    if (analysis.isMetaReference && analysis.metaType === 'test') {
      return {
        shouldIntercept: true,
        response: ` Entendi o teste! Sou um agente de IA da Digital Boost, aqui pra te ajudar com gestão financeira. Quer continuar a conversa ou prefere falar com alguém da equipe?`,
        action: 'acknowledge_test',
        metadata: { reason: 'test_detected' }
      };
    }

    // Caso: Confusão
    if (analysis.hasConfusion) {
      return {
        shouldIntercept: false,
        responseModifier: 'clarifying',
        metadata: { tone: 'clarifying', addExplanation: true }
      };
    }

    // Caso: Frustração
    if (analysis.hasFrustration) {
      return {
        shouldIntercept: false,
        responseModifier: 'empathetic',
        metadata: { tone: 'empathetic', validateFeelings: true }
      };
    }

    // Caso: Linguagem profana/provocativa
    if (analysis.isProvocative) {
      return {
        shouldIntercept: true,
        response: `Vejo que você não está interessado agora. Tudo bem! Se mudar de ideia, é só chamar. Vou te tirar da lista por enquanto.`,
        action: 'opt_out',
        metadata: { reason: 'provocative_language' }
      };
    }

    // Default: sem intervenção
    return {
      shouldIntercept: false,
      responseModifier: null
    };
  }

  /**
   * Gera chave de cache
   */
  _getCacheKey(message) {
    return message.toLowerCase().trim().substring(0, 100);
  }

  /**
   * Limpa cache antigo
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton
let instance = null;

export function getContextualIntelligence() {
  if (!instance) {
    instance = new ContextualIntelligence();
  }
  return instance;
}

export default ContextualIntelligence;
