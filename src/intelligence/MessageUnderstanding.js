/**
 * @file MessageUnderstanding.js
 * @description Sistema INTELIGENTE de entendimento de mensagens usando GPT
 *
 * Este módulo analisa QUALQUER mensagem e entende:
 * - O que a pessoa está querendo dizer
 * - Se é um humano ou bot/sistema automatizado
 * - Qual a intenção real por trás da mensagem
 * - Como o agente deve responder de forma adaptativa
 *
 * @version 2.0.0 - GPT-Powered Understanding
 */

import OpenAI from 'openai';
import log from '../utils/logger-wrapper.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════
// LRU CACHE COM LIMITE - EVITA MEMORY LEAK
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_MAX_SIZE = 500; // Máximo de entradas no cache
const CACHE_TTL = 300000; // 5 minutos
const CONTEXT_MAX_CONTACTS = 1000; // Máximo de contatos no contexto
const CONTEXT_TTL = 3600000; // 1 hora de inatividade

/**
 * Simple LRU Cache implementation to prevent memory leaks
 * Evicts oldest entries when max size is reached
 */
class SimpleLRUCache {
  constructor(maxSize = 500, ttl = 300000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key, value) {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const understandingCache = new SimpleLRUCache(CACHE_MAX_SIZE, CACHE_TTL);

/**
 * LRU Cache especializado para contexto de conversas
 * Armazena arrays de mensagens por contato com TTL e limite de contatos
 */
class ConversationContextLRU {
  constructor(maxContacts = 1000, ttl = 3600000, maxMessagesPerContact = 6) {
    this.maxContacts = maxContacts;
    this.ttl = ttl;
    this.maxMessagesPerContact = maxMessagesPerContact;
    this.contexts = new Map();
  }

  get(contactId) {
    const entry = this.contexts.get(contactId);
    if (!entry) return [];

    // Check TTL
    if (Date.now() - entry.lastActivity > this.ttl) {
      this.contexts.delete(contactId);
      return [];
    }

    // Move to end (most recently used)
    this.contexts.delete(contactId);
    this.contexts.set(contactId, entry);
    return entry.messages;
  }

  addMessage(contactId, role, content) {
    let entry = this.contexts.get(contactId);

    if (!entry) {
      // Evict oldest if at capacity
      while (this.contexts.size >= this.maxContacts) {
        const oldestKey = this.contexts.keys().next().value;
        this.contexts.delete(oldestKey);
        log.debug(` [CONTEXT-LRU] Removido contexto antigo: ${oldestKey}`);
      }

      entry = { messages: [], lastActivity: Date.now() };
    } else {
      // Remove and re-add to update position
      this.contexts.delete(contactId);
    }

    // Add message
    entry.messages.push({
      role,
      content: content.substring(0, 500), // Limitar tamanho
      timestamp: Date.now()
    });

    // Keep only last N messages
    while (entry.messages.length > this.maxMessagesPerContact) {
      entry.messages.shift();
    }

    entry.lastActivity = Date.now();
    this.contexts.set(contactId, entry);
  }

  delete(contactId) {
    this.contexts.delete(contactId);
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [contactId, entry] of this.contexts.entries()) {
      if (now - entry.lastActivity > this.ttl) {
        this.contexts.delete(contactId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(` [CONTEXT-LRU] Limpou ${cleaned} contextos inativos (restam ${this.contexts.size})`);
    }

    return cleaned;
  }

  get size() {
    return this.contexts.size;
  }
}

const conversationContextLRU = new ConversationContextLRU(
  CONTEXT_MAX_CONTACTS,
  CONTEXT_TTL,
  6 // maxMessagesPerContact
);

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT DE ENTENDIMENTO
// ═══════════════════════════════════════════════════════════════════════════

const UNDERSTANDING_PROMPT = `Você é um analisador de mensagens de WhatsApp para um agente SDR de energia solar.

Analise a mensagem e o contexto da conversa para entender EXATAMENTE o que está acontecendo.

RETORNE UM JSON com:

{
  "messageType": "human" | "bot" | "menu" | "transfer" | "system",
  "senderIntent": "string descrevendo a intenção real do remetente",
  "emotionalState": "neutral" | "interested" | "confused" | "annoyed" | "busy" | "friendly",
  "isAutomatic": true/false,
  "needsHumanResponse": true/false,
  "suggestedAction": "respond" | "wait" | "clarify" | "select_option" | "ask_for_human" | "exit_gracefully",
  "suggestedResponse": "string com sugestão de resposta OU null",
  "contextClues": ["lista", "de", "pistas", "do", "contexto"],
  "confidence": 0.0-1.0
}

REGRAS DE ANÁLISE:

1. MENU/OPÇÕES AUTOMÁTICAS:
   - Se a mensagem contém opções numeradas ([ 1 ] - X, 1. X, etc) = menu
   - Sugira selecionar a opção mais relevante (vendas/comercial/orçamento)
   - Se não encontrar opção relevante, sugira pedir para falar com humano

2. SAUDAÇÕES AUTOMÁTICAS:
   - "Seja bem-vindo", "Obrigado pelo contato" sem perguntas específicas = bot
   - Nesses casos, sugira pedir para falar com área comercial

3. TRANSFERÊNCIAS:
   - "Aguarde", "Transferindo", "Um momento" = transfer
   - Sugira WAIT - não responder ainda

4. RESPOSTAS DE INTERESSE:
   - Perguntas sobre preço, como funciona, etc = interested
   - Sugira responder normalmente

5. RESPOSTAS CONFUSAS:
   - "Quem é você?", "Não entendi", "?" = confused
   - Sugira clarificar quem somos de forma breve

6. RESPOSTAS DE DESINTERESSE:
   - "Não quero", "Para de mandar", etc = exit
   - Sugira sair graciosamente

7. PERGUNTAS DO BOT:
   - "Em que posso ajudar?", "Qual seu nome?" = bot perguntando
   - Sugira responder brevemente e pedir área comercial

IMPORTANTE:
- Seja PRECISO na análise
- Considere o CONTEXTO da conversa anterior
- Identifique padrões de automação vs comunicação humana real
- A resposta sugerida deve ser CURTA e NATURAL (não robótica)`;

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

class MessageUnderstanding {
  constructor() {
    // Usando LRU cache global para contexto de conversas
    // Evita memory leak com limite de 1000 contatos e TTL de 1h
    this.maxContextMessages = 6; // Manter últimas 6 mensagens para contexto
  }

  /**
   * Analisa uma mensagem de forma INTELIGENTE usando GPT
   *
   * @param {string} message - Mensagem recebida
   * @param {string} contactId - ID do contato
   * @param {Object} options - Opções adicionais
   * @returns {Object} Análise completa da mensagem
   */
  async understand(message, contactId, options = {}) {
    const startTime = Date.now();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return this._createEmptyResponse();
    }

    const cleanMessage = message.trim();

    // Verificar cache (LRU com TTL automático)
    const cacheKey = `${contactId}:${cleanMessage}`;
    const cached = understandingCache.get(cacheKey);
    if (cached) {
      log.info(` [UNDERSTANDING] Cache hit para ${contactId} (cache size: ${understandingCache.size})`);
      return cached.result;
    }

    // Obter contexto da conversa
    const conversationHistory = this._getConversationContext(contactId);

    // Adicionar mensagem atual ao contexto
    this._addToContext(contactId, 'lead', cleanMessage);

    try {
      log.info(` [UNDERSTANDING] Analisando: "${cleanMessage.substring(0, 60)}..."`);

      const result = await this._analyzeWithGPT(cleanMessage, conversationHistory, options);

      // Guardar no cache
      understandingCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      const elapsed = Date.now() - startTime;
      log.info(` [UNDERSTANDING] Análise concluída em ${elapsed}ms`);
      log.info(` [UNDERSTANDING] Tipo: ${result.messageType}, Intenção: ${result.senderIntent}`);

      return result;

    } catch (error) {
      log.error(` [UNDERSTANDING] Erro na análise: ${error.message}`);
      return this._createFallbackResponse(cleanMessage);
    }
  }

  /**
   * Analisa a mensagem usando GPT
   */
  async _analyzeWithGPT(message, conversationHistory, options) {
    const contextString = conversationHistory.length > 0
      ? `\nCONTEXTO DA CONVERSA ANTERIOR:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
      : '\nEsta é a PRIMEIRA mensagem da conversa.\n';

    const prompt = `${UNDERSTANDING_PROMPT}

${contextString}
MENSAGEM ATUAL PARA ANALISAR:
"${message}"

${options.leadProfile ? `\nINFO DO LEAD: ${JSON.stringify(options.leadProfile)}` : ''}

Analise e retorne APENAS o JSON (sem markdown, sem explicações):`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um analisador preciso. Retorne APENAS JSON válido, sem markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content.trim();

    // Limpar possíveis marcações de markdown
    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    try {
      const parsed = JSON.parse(jsonText);
      return this._validateAndEnrich(parsed, message);
    } catch (parseError) {
      log.warn(` [UNDERSTANDING] Erro ao parsear JSON: ${parseError.message}`);
      log.warn(` [UNDERSTANDING] Resposta: ${responseText.substring(0, 200)}`);
      return this._createFallbackResponse(message);
    }
  }

  /**
   * Valida e enriquece a resposta do GPT
   */
  _validateAndEnrich(parsed, originalMessage) {
    const result = {
      messageType: parsed.messageType || 'human',
      senderIntent: parsed.senderIntent || 'unknown',
      emotionalState: parsed.emotionalState || 'neutral',
      isAutomatic: parsed.isAutomatic || false,
      needsHumanResponse: parsed.needsHumanResponse !== false,
      suggestedAction: parsed.suggestedAction || 'respond',
      suggestedResponse: parsed.suggestedResponse || null,
      contextClues: parsed.contextClues || [],
      confidence: parsed.confidence || 0.7,
      originalMessage,
      analyzedAt: new Date().toISOString()
    };

    // Derivar flags úteis
    result.isBot = result.messageType === 'bot' || result.messageType === 'menu' || result.isAutomatic;
    result.isMenu = result.messageType === 'menu';
    result.isTransfer = result.messageType === 'transfer';
    result.isHuman = result.messageType === 'human' && !result.isAutomatic;
    result.shouldRespond = result.suggestedAction !== 'wait';
    result.shouldWait = result.suggestedAction === 'wait';
    result.shouldClarify = result.suggestedAction === 'clarify';
    result.shouldExit = result.suggestedAction === 'exit_gracefully';

    return result;
  }

  /**
   * Registra resposta do agente no contexto
   */
  recordAgentResponse(contactId, response) {
    this._addToContext(contactId, 'agent', response);
  }

  /**
   * Obtém contexto da conversa (usando LRU cache global)
   */
  _getConversationContext(contactId) {
    return conversationContextLRU.get(contactId);
  }

  /**
   * Adiciona mensagem ao contexto (usando LRU cache global)
   */
  _addToContext(contactId, role, content) {
    conversationContextLRU.addMessage(contactId, role, content);
  }

  /**
   * Limpa contexto de um contato
   */
  clearContext(contactId) {
    conversationContextLRU.delete(contactId);
  }

  /**
   * Resposta vazia para mensagens inválidas
   */
  _createEmptyResponse() {
    return {
      messageType: 'unknown',
      senderIntent: 'empty_message',
      emotionalState: 'neutral',
      isAutomatic: false,
      needsHumanResponse: false,
      suggestedAction: 'wait',
      suggestedResponse: null,
      contextClues: [],
      confidence: 0,
      isBot: false,
      isMenu: false,
      isTransfer: false,
      isHuman: false,
      shouldRespond: false,
      shouldWait: true,
      shouldClarify: false,
      shouldExit: false
    };
  }

  /**
   * Fallback quando GPT falha
   */
  _createFallbackResponse(message) {
    // Usar padrões simples como fallback
    const lowerMessage = message.toLowerCase();

    let messageType = 'human';
    let suggestedAction = 'respond';
    let isAutomatic = false;

    // Detecção simples por padrões
    if (/\[\s*\d+\s*\]|^\d+\s*[-.)]/m.test(message)) {
      messageType = 'menu';
      suggestedAction = 'select_option';
      isAutomatic = true;
    } else if (/seja\s+bem[- ]?vind|bem[- ]?vind[oa]\s+(ao?|à)/i.test(message)) {
      messageType = 'bot';
      suggestedAction = 'ask_for_human';
      isAutomatic = true;
    } else if (/aguarde|transferindo|um momento/i.test(message)) {
      messageType = 'transfer';
      suggestedAction = 'wait';
    } else if (/não\s+(quero|tenho\s+interesse)|para\s+de/i.test(message)) {
      suggestedAction = 'exit_gracefully';
    }

    return {
      messageType,
      senderIntent: 'fallback_analysis',
      emotionalState: 'neutral',
      isAutomatic,
      needsHumanResponse: !isAutomatic,
      suggestedAction,
      suggestedResponse: null,
      contextClues: ['fallback_mode'],
      confidence: 0.5,
      isBot: isAutomatic,
      isMenu: messageType === 'menu',
      isTransfer: messageType === 'transfer',
      isHuman: !isAutomatic,
      shouldRespond: suggestedAction !== 'wait',
      shouldWait: suggestedAction === 'wait',
      shouldClarify: false,
      shouldExit: suggestedAction === 'exit_gracefully',
      originalMessage: message,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Gera resposta adaptativa baseada na análise
   */
  async generateAdaptiveResponse(understanding, options = {}) {
    // Se já tem sugestão de resposta, usar ela
    if (understanding.suggestedResponse) {
      return {
        message: understanding.suggestedResponse,
        action: understanding.suggestedAction,
        confidence: understanding.confidence
      };
    }

    // Se deve esperar, não gerar resposta
    if (understanding.shouldWait) {
      return {
        message: null,
        action: 'wait',
        silent: true
      };
    }

    // Se deve sair graciosamente
    if (understanding.shouldExit) {
      return {
        message: 'Entendi, sem problemas! Se precisar de algo, estou por aqui. Sucesso!',
        action: 'exit',
        optOut: true
      };
    }

    // Se é menu, gerar resposta para menu
    if (understanding.isMenu) {
      return {
        message: '1', // Tentar opção 1 (geralmente vendas/orçamento)
        action: 'select_option',
        fallbackMessage: 'Gostaria de falar com alguém da área comercial, por favor.'
      };
    }

    // Se precisa clarificar
    if (understanding.shouldClarify) {
      return {
        message: 'Oi! Sou da Digital Boost, trabalhamos com marketing para empresas de energia solar. Queria entender como vocês captam clientes hoje. Posso explicar melhor?',
        action: 'clarify'
      };
    }

    // Se é bot pedindo info
    if (understanding.isBot) {
      return {
        message: 'Quero falar sobre marketing digital para energia solar. Tem alguém da área comercial disponível?',
        action: 'ask_for_human'
      };
    }

    // Default: deixar agente normal responder
    return {
      message: null,
      action: 'continue_normal_flow',
      letAgentHandle: true
    };
  }

  /**
   * Limpa cache antigo (LRU já faz cleanup automático, mas pode forçar)
   */
  cleanupCache() {
    // O SimpleLRUCache já lida com TTL automaticamente no get()
    // Mas podemos forçar uma limpeza do cache de contexto
    const cleanedContexts = conversationContextLRU.cleanup();

    log.debug(` [CLEANUP] Understanding cache size: ${understandingCache.size}, Context cache size: ${conversationContextLRU.size}`);

    return cleanedContexts;
  }

  /**
   * Retorna estatísticas dos caches para monitoramento
   */
  getStats() {
    return {
      understandingCacheSize: understandingCache.size,
      contextCacheSize: conversationContextLRU.size,
      maxUnderstandingCache: CACHE_MAX_SIZE,
      maxContextContacts: CONTEXT_MAX_CONTACTS,
      understandingTTL: CACHE_TTL,
      contextTTL: CONTEXT_TTL
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON E EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const messageUnderstanding = new MessageUnderstanding();

// Cleanup automático a cada 10 minutos
setInterval(() => {
  messageUnderstanding.cleanupCache();
}, 600000);

export default messageUnderstanding;
export { MessageUnderstanding };
