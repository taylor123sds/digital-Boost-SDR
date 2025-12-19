/**
 * @file message_context_analyzer.js
 * @description Analisa o contexto da mensagem recebida para entender:
 * - Se é um humano ou auto-resposta
 * - Se é um menu de opções
 * - Se a resposta faz sentido no contexto
 * - Como o agente deve responder
 *
 * @version 1.0.0
 */

import log from './logger-wrapper.js';

// ═══════════════════════════════════════════════════════════════════════════
// PADRÕES DE DETECÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const PATTERNS = {
  // Menus com opções numeradas
  MENU_OPTIONS: [
    /\[\s*\d+\s*\]\s*[-–—:]\s*\w+/gi,           // "[ 1 ] - Orçamento"
    /\d+\s*[-–—\.)\]]\s*(orçamento|financeiro|sac|suporte|vendas|comercial|engenharia|atendimento|outros?)/gi,
    /digite\s+(\d+|um|uma)\s+(para|pra)/gi,
    /tecle\s+\d+/gi,
    /opção\s+\d+/gi,
    /selecione\s+(uma\s+)?opção/gi,
    /escolha\s+(uma\s+)?opção/gi
  ],

  // Saudações automáticas de boas-vindas
  AUTO_GREETING: [
    /seja\s+bem[- ]?vind[oa]/i,
    /bem[- ]?vind[oa]\s+(ao?|à)/i,
    /olá[!.]?\s+seja\s+bem/i,
    /bem[- ]?vind[oa]\s+ao?\s+[\w\s]+\./i
  ],

  // Perguntas genéricas de bot
  BOT_GENERIC_QUESTIONS: [
    /em\s+que\s+(podemos|posso)\s+(lhe\s+|te\s+)?ajudar\s*\??/i,
    /como\s+podemos\s+(te\s+|lhe\s+)?ajudar\s*\??/i,
    /como\s+posso\s+(te\s+|lhe\s+)?ajudar\s*\??/i,
    /qual\s+(o\s+)?seu\s+nome\s*\??/i,
    /qual\s+(o\s+)?assunto\s*\??/i
  ],

  // Transferência de atendimento
  TRANSFER_PATTERNS: [
    /transferido\s+(para|pro)\s+(o\s+)?(setor|departamento|atendente)/i,
    /atendimento\s+foi\s+transferido/i,
    /encaminhado\s+(para|pro)/i,
    /aguarde\s+(um\s+)?momento/i,
    /só\s+um\s+momento/i,
    /um\s+momento\s+por\s+favor/i
  ],

  // Respostas de humano que indicam interesse
  HUMAN_INTEREST: [
    /pode\s+(me\s+)?(falar|explicar|contar)\s+mais/i,
    /quero\s+saber\s+mais/i,
    /me\s+conta/i,
    /como\s+funciona/i,
    /quanto\s+custa/i,
    /qual\s+(o\s+)?preço/i,
    /tenho\s+interesse/i,
    /me\s+interess/i
  ],

  // Respostas de humano que indicam desinteresse
  HUMAN_NOT_INTERESTED: [
    /não\s+tenho\s+interesse/i,
    /não\s+quero/i,
    /não\s+preciso/i,
    /para\s+de\s+mandar/i,
    /sai\s+da\s+lista/i,
    /remov[ea]/i,
    /não\s+me\s+(ligue|mande)/i
  ],

  // Respostas que indicam confusão/não entendeu
  CONFUSION: [
    /não\s+entendi/i,
    /o\s+qu[eê]\s*\??/i,
    /como\s+assim/i,
    /hã\s*\??/i,
    /\?\?+/,
    /quem\s+é\s+voc/i,
    /quem\s+tá\s+falando/i
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO LRU CACHE
// ═══════════════════════════════════════════════════════════════════════════

const MAX_ANALYSIS_CACHE = 500; // Máximo de análises no cache
const ANALYSIS_TTL = 3600000; // 1 hora TTL

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

class MessageContextAnalyzer {
  constructor() {
    this.lastAnalysis = new Map(); // contactId -> lastAnalysis (com LRU)
    this.maxCacheSize = MAX_ANALYSIS_CACHE;
    this.ttl = ANALYSIS_TTL;
  }

  /**
   * Analisa o contexto da mensagem recebida
   * @param {string} message - Mensagem recebida
   * @param {string} contactId - ID do contato
   * @param {Object} conversationHistory - Histórico da conversa (opcional)
   * @returns {Object} Análise do contexto
   */
  analyze(message, contactId, conversationHistory = []) {
    if (!message || typeof message !== 'string') {
      return this._createResult('unknown', 'empty_message');
    }

    const cleanMessage = message.trim();

    log.info(` [CONTEXT] Analisando: "${cleanMessage.substring(0, 80)}..."`);

    // 1. Verificar se é um menu de opções
    const menuAnalysis = this._detectMenu(cleanMessage);
    if (menuAnalysis.isMenu) {
      log.warn(` [CONTEXT] MENU detectado com ${menuAnalysis.options.length} opções`);
      return this._createResult('menu', 'auto_menu', {
        options: menuAnalysis.options,
        suggestedAction: 'try_human_option',
        suggestedResponse: this._getSuggestedMenuResponse(menuAnalysis.options)
      });
    }

    // 2. Verificar se é saudação automática de bot
    if (this._matchesAny(cleanMessage, PATTERNS.AUTO_GREETING)) {
      log.warn(` [CONTEXT] AUTO-GREETING detectado`);
      return this._createResult('bot', 'auto_greeting', {
        suggestedAction: 'wait_for_human',
        suggestedResponse: null // Não responder ainda
      });
    }

    // 3. Verificar se é pergunta genérica de bot
    if (this._matchesAny(cleanMessage, PATTERNS.BOT_GENERIC_QUESTIONS)) {
      log.warn(` [CONTEXT] BOT QUESTION detectada`);
      return this._createResult('bot', 'generic_question', {
        suggestedAction: 'answer_briefly',
        suggestedResponse: 'Quero falar sobre como podemos ajudar vocês a captar mais clientes de energia solar. Tem alguém da área comercial disponível?'
      });
    }

    // 4. Verificar se é transferência
    if (this._matchesAny(cleanMessage, PATTERNS.TRANSFER_PATTERNS)) {
      log.info(` [CONTEXT] TRANSFERÊNCIA detectada`);
      return this._createResult('transfer', 'being_transferred', {
        suggestedAction: 'wait',
        suggestedResponse: null // Aguardar
      });
    }

    // 5. Verificar interesse humano
    if (this._matchesAny(cleanMessage, PATTERNS.HUMAN_INTEREST)) {
      log.success(` [CONTEXT] INTERESSE HUMANO detectado`);
      return this._createResult('human', 'interested', {
        suggestedAction: 'continue_conversation',
        engagementLevel: 'high'
      });
    }

    // 6. Verificar desinteresse
    if (this._matchesAny(cleanMessage, PATTERNS.HUMAN_NOT_INTERESTED)) {
      log.warn(` [CONTEXT] DESINTERESSE detectado`);
      return this._createResult('human', 'not_interested', {
        suggestedAction: 'graceful_exit',
        engagementLevel: 'none'
      });
    }

    // 7. Verificar confusão
    if (this._matchesAny(cleanMessage, PATTERNS.CONFUSION)) {
      log.warn(` [CONTEXT] CONFUSÃO detectada`);
      return this._createResult('human', 'confused', {
        suggestedAction: 'clarify',
        suggestedResponse: 'Desculpa a confusão! Sou da Digital Boost, trabalhamos com marketing para empresas de energia solar. Queria entender como vocês captam clientes hoje. Posso explicar melhor?'
      });
    }

    // 8. Verificar se a mensagem é muito curta/vazia de significado
    if (cleanMessage.length < 3 || /^(ok|tá|ta|sim|não|nao|hm+|ah+)$/i.test(cleanMessage)) {
      return this._createResult('human', 'minimal_response', {
        suggestedAction: 'prompt_more',
        engagementLevel: 'low'
      });
    }

    // 9. Verificar duplicação (mesma mensagem do bot repetida)
    const lastAnalysis = this.lastAnalysis.get(contactId);
    if (lastAnalysis && lastAnalysis.originalMessage === cleanMessage) {
      log.warn(` [CONTEXT] MENSAGEM REPETIDA detectada`);
      return this._createResult('bot', 'repeated_message', {
        suggestedAction: 'skip',
        suggestedResponse: null
      });
    }

    // Salvar última análise (com LRU eviction)
    this._setWithLRU(contactId, {
      originalMessage: cleanMessage,
      timestamp: Date.now()
    });

    // Default: assumir humano normal
    return this._createResult('human', 'normal_response', {
      suggestedAction: 'continue_conversation',
      engagementLevel: 'medium'
    });
  }

  /**
   * Detecta se a mensagem contém um menu de opções
   */
  _detectMenu(message) {
    const options = [];

    // Procurar padrões de opções numeradas
    const optionPatterns = [
      /\[\s*(\d+)\s*\]\s*[-–—:]\s*([^\n\[\]]+)/gi,  // [ 1 ] - Orçamento
      /(\d+)\s*[-–—\.)\]]\s*(orçamento|financeiro|sac|suporte|vendas|comercial|engenharia|atendimento|outros?)/gi
    ];

    for (const pattern of optionPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        options.push({
          number: match[1],
          label: match[2].trim()
        });
      }
    }

    // Verificar padrões gerais de menu
    const hasMenuIndicator = PATTERNS.MENU_OPTIONS.some(p => p.test(message));

    return {
      isMenu: options.length >= 2 || hasMenuIndicator,
      options
    };
  }

  /**
   * Sugere resposta para menu de opções
   */
  _getSuggestedMenuResponse(options) {
    // Procurar opção de vendas/comercial
    const salesOption = options.find(o =>
      /venda|comercial|orçamento/i.test(o.label)
    );

    if (salesOption) {
      return salesOption.number; // Responder com o número da opção
    }

    // Se não encontrou, pedir para falar com humano
    return 'Gostaria de falar com alguém da área comercial, por favor.';
  }

  /**
   * Verifica se a mensagem corresponde a algum padrão
   */
  _matchesAny(message, patterns) {
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Cria objeto de resultado padronizado
   */
  _createResult(type, subtype, details = {}) {
    return {
      type,           // 'human', 'bot', 'menu', 'transfer', 'unknown'
      subtype,        // Subcategoria específica
      isBot: type === 'bot' || type === 'menu',
      isHuman: type === 'human',
      isMenu: type === 'menu',
      isTransfer: type === 'transfer',
      shouldRespond: !['skip', 'wait'].includes(details.suggestedAction),
      ...details
    };
  }

  /**
   * Armazena análise com LRU eviction
   * @private
   */
  _setWithLRU(contactId, value) {
    // Se já existe, remover para atualizar posição
    if (this.lastAnalysis.has(contactId)) {
      this.lastAnalysis.delete(contactId);
    }

    // Evict oldest se no limite
    while (this.lastAnalysis.size >= this.maxCacheSize) {
      const oldestKey = this.lastAnalysis.keys().next().value;
      this.lastAnalysis.delete(oldestKey);
      log.debug(` [CONTEXT-ANALYZER] Evicted análise antiga: ${oldestKey}`);
    }

    this.lastAnalysis.set(contactId, value);
  }

  /**
   * Limpa análises antigas baseado em TTL
   */
  cleanup(maxAgeMs = null) {
    const ttl = maxAgeMs || this.ttl;
    const now = Date.now();
    let cleaned = 0;

    for (const [contactId, analysis] of this.lastAnalysis.entries()) {
      if (now - analysis.timestamp > ttl) {
        this.lastAnalysis.delete(contactId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(` [CONTEXT-ANALYZER] Limpou ${cleaned} análises antigas (restam ${this.lastAnalysis.size})`);
    }

    return cleaned;
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      cacheSize: this.lastAnalysis.size,
      maxCacheSize: this.maxCacheSize,
      ttl: this.ttl
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

const messageContextAnalyzer = new MessageContextAnalyzer();

// Auto-cleanup a cada 10 minutos
setInterval(() => {
  messageContextAnalyzer.cleanup();
}, 600000);

export default messageContextAnalyzer;
export { PATTERNS };
