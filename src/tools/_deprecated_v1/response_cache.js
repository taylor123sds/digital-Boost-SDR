// tools/response_cache.js
// 🚀 SISTEMA DE CACHE INTELIGENTE - MULTI-CAMADAS OTIMIZADO
//
// PAPEL NO FLUXO DE VOZ:
// • Agent.js → getResponse() → checkCommonPatterns()
// • Primeiro verifica: dashboardVoiceNavigator.parseVoiceCommand()
// • Se comando de voz reconhecido → retorna JSON navigation imediato
// • Senão → continua busca em cache temporal/frequent/similarity
//
// OTIMIZAÇÕES IMPLEMENTADAS:
// • Busca hash O(1) em vez de loops O(n)
// • Índices por palavra-chave, comprimento e primeira palavra
// • Cache multi-camadas: temporal → frequent → common → context → similarity

import responseSchemaValidator from './response_schema_validator.js';
// Dashboard voice navigator removido - sistema de voz desabilitado

export class ResponseCache {
  constructor() {
    // Cache multi-camadas
    this.cache = new Map();
    this.frequentCache = new Map();     // Cache para items frequentes
    this.contextCache = new Map();      // Cache contextual
    this.temporalCache = new Map();     // Cache temporal

    // 🚀 OTIMIZAÇÃO: Índice hash para busca rápida por similaridade
    this.keywordIndex = new Map();      // palavra -> Set(cache_keys)
    this.messageLength = new Map();     // comprimento -> Set(cache_keys)
    this.firstWords = new Map();        // primeira_palavra -> Set(cache_keys)

    // Configurações avançadas
    this.similarityThreshold = 0.85;
    this.maxCacheSize = 1000;          // Aumentado para melhor performance
    this.maxFrequentSize = 100;        // Cache de frequentes
    this.maxContextSize = 200;         // Cache contextual
    this.cacheExpiry = 3600000;        // 1 hora
    this.frequentExpiry = 7200000;     // 2 horas para frequentes
    this.contextExpiry = 1800000;      // 30 min para contextuais
    this.temporalExpiry = 300000;      // 5 min para temporais

    // Métricas avançadas
    this.hitCount = 0;
    this.missCount = 0;
    this.frequentHits = 0;
    this.contextHits = 0;
    this.temporalHits = 0;
    this.totalResponseTime = 0;
    this.averageResponseTime = 0;

    // 🔒 NAVEGAÇÃO POR VOZ SANITIZADA - Cache para máxima velocidade e segurança
    this.commonPatterns = new Map([
      // REMOVIDO: Código JavaScript direto foi substituído por sanitização segura
      // Agora usando DashboardVoiceNavigator para comandos de voz seguros
      // 🛡️ COMANDOS DE NAVEGAÇÃO POR VOZ SANITIZADOS - SEM JAVASCRIPT DIRETO
      // Comandos de navegação por voz agora usam sanitizador para segurança
      ['__VOICE_NAV_PLACEHOLDER__', 'sanitized'], // Placeholder para indicar sistema de sanitização

      // Dashboard patterns (mantidos)
      ['mudar tema escuro', 'O tema do dashboard foi alterado para o modo escuro! 🌙'],
      ['mudar tema claro', 'O tema do dashboard foi alterado para o modo claro! ☀️'],
      ['alterar cor', 'Qual cor você gostaria de usar no dashboard?'],

      // Business patterns com mais detalhes específicos
      ['serviços digital boost', 'Oferecemos CRM Kommo + Agentes IA 24/7 + Consultoria de crescimento. Somos top 15 tech do Brasil pelo Sebrae. Qual área mais te interessa para sua empresa?'],
      ['crm kommo', 'Kommo é nosso CRM que integra WhatsApp, automatiza follow-ups e gera dashboards de vendas. Quantos leads vocês recebem por mês?'],
      ['whatsapp business', 'Integramos WhatsApp ao CRM com agentes IA que atendem 24/7, qualificam leads e agendam reuniões. Como vocês fazem atendimento hoje?'],
      ['preço serviços', 'Investimento varia de R$ 2k-8k/mês conforme porte. Empresas de 50-200 funcionários são nosso foco. Quantos funcionários vocês têm?'],

      // Respostas de agendamento simples e consultivas
      ['agendar reunião', 'Legal! Preciso do seu nome, email e um horário bom para você. Qual funciona melhor?'],
      ['marcar reunião', 'Perfeito! Qual seu nome completo e email? E que horário você prefere?'],
      ['quero reunião', 'Ótimo! Para agendar, preciso do seu nome, email e horário que funciona melhor. Qual prefere?'],
      ['marcar uma reunião', 'Perfeito! Me passa seu nome, email e que dia/horário funciona melhor?'],
      ['gostaria de marcar', 'Excelente! Qual seu nome, email e melhor horário para você?'],
      ['agendar uma reunião', 'Perfeito! Preciso do seu nome, email e horário que funciona para você. Quando é melhor?'],
      ['quero agendar', 'Ótimo! Me fala seu nome, email e que horário funciona melhor para você?'],
      ['poderia agendar', 'Claro! Qual seu nome, email e quando você tem disponibilidade?'],

      // Respostas específicas sobre Digital Boost
      ['o que vocês fazem', 'Somos a Digital Boost, especialistas em CRM + IA para PMEs. Ajudamos empresas a escalar vendas com agentes 24/7. Qual o principal desafio do seu negócio?'],
      ['que empresa é essa', 'Digital Boost - startup de Natal/RN, top 15 tech do Brasil pelo Sebrae. Focamos em automação de vendas para empresas de 50-200 funcionários. Como está o crescimento da sua empresa hoje?'],
      ['vocês fazem o que', 'Criamos agentes de IA 24/7 + CRM Kommo para PMEs escalarem vendas. Qual o maior gargalo nas vendas da sua empresa?'],
      ['qual serviço da digital boost', 'Oferecemos 3 pilares: Agentes IA 24/7, CRM Kommo integrado e consultoria de crescimento. Qual área mais te interessa?'],
      ['como funciona o crm', 'Nosso CRM Kommo automatiza todo pipeline de vendas com IA. Integra WhatsApp, email e dashboards inteligentes. Quantos leads vocês recebem por mês?'],
      ['agente ia funciona como', 'Nosso agente IA atende leads 24/7, qualifica prospects e agenda reuniões automático. Como vocês fazem follow-up hoje?'],
      ['preços da digital boost', 'Nossos valores são personalizados conforme porte e necessidade. Quer que eu entenda seu negócio e monte uma proposta específica?'],
      ['quanto custa', 'Depende do volume e complexidade. Normalmente varia de R$ 2k a R$ 8k/mês. Quantos funcionários tem sua empresa?']
    ]);

    // Sistema de feedback inteligente
    this.feedbackData = new Map();
    this.learningEnabled = true;

    // Padrões de uso temporal
    this.usagePatterns = {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      commands: new Map()
    };

    // 🚀 OTIMIZAÇÃO: Índice hash rápido para padrões comuns
    this.patternKeywords = new Map(); // palavra -> Set(patterns)

    // Inicializar sistemas
    this.setupAutoCleanup();
    this.setupUsageTracking();
    this.buildPatternIndex();

    console.log('💾 Enhanced ResponseCache: Sistema inteligente multi-camadas inicializado');
  }

  /**
   * Busca resposta em cache com estratégia inteligente multi-camadas
   */
  async getResponse(userMessage, context = {}) {
    const startTime = Date.now();
    const normalizedMessage = this.normalizeMessage(userMessage);
    const contextKey = this.generateContextKey(normalizedMessage, context);
    const temporalKey = this.generateTemporalKey(normalizedMessage);

    // Rastrear uso
    this.trackUsage(normalizedMessage);

    // 1. Cache temporal (ultra-rápido para comandos recentes)
    const temporalResponse = this.temporalCache.get(temporalKey);
    if (temporalResponse && this.isValid(temporalResponse, this.temporalExpiry)) {
      this.hitCount++;
      this.temporalHits++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      console.log(`⚡ TEMPORAL HIT: ${normalizedMessage} (${responseTime}ms)`);
      return {
        response: temporalResponse.response,
        source: 'temporal_cache',
        cached: true,
        responseTime
      };
    }

    // 2. Cache de frequentes (comandos muito usados)
    const frequentResponse = this.frequentCache.get(normalizedMessage);
    if (frequentResponse && this.isValid(frequentResponse, this.frequentExpiry)) {
      this.hitCount++;
      this.frequentHits++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      // Adicionar ao cache temporal para próxima vez
      this.temporalCache.set(temporalKey, {
        response: frequentResponse.response,
        timestamp: Date.now(),
        accessCount: 1
      });

      console.log(`🔥 FREQUENT HIT: ${normalizedMessage} (${responseTime}ms)`);
      return {
        response: frequentResponse.response,
        source: 'frequent_cache',
        cached: true,
        responseTime
      };
    }

    // 3. Verificar padrões comuns (compatibilidade existente) com proteção WhatsApp
    const commonResponse = this.checkCommonPatterns(normalizedMessage, context);
    if (commonResponse) {
      this.hitCount++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      // Adicionar aos caches mais rápidos
      this.addToFastCaches(normalizedMessage, temporalKey, commonResponse);

      console.log(`⚡ COMMON PATTERN HIT: ${normalizedMessage} (${responseTime}ms)`);
      return {
        response: commonResponse,
        source: 'common_pattern',
        cached: true,
        responseTime
      };
    }

    // 4. Cache contextual
    const contextResponse = this.contextCache.get(contextKey);
    if (contextResponse && this.isValid(contextResponse, this.contextExpiry)) {
      this.hitCount++;
      this.contextHits++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      console.log(`🎯 CONTEXT HIT: ${contextKey} (${responseTime}ms)`);
      return {
        response: contextResponse.response,
        source: 'context_cache',
        cached: true,
        similarity: contextResponse.similarity,
        responseTime
      };
    }

    // 5. Verificar cache por similaridade (existente)
    const cachedResponse = this.findSimilarCached(normalizedMessage, context);
    if (cachedResponse) {
      this.hitCount++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      console.log(`🎯 SIMILARITY HIT: ${normalizedMessage} (${responseTime}ms)`);
      return {
        response: cachedResponse.response,
        source: 'similarity_cache',
        cached: true,
        similarity: cachedResponse.similarity,
        responseTime
      };
    }

    // 6. Cache miss
    this.missCount++;
    const responseTime = Date.now() - startTime;
    this.updateMetrics(responseTime);

    console.log(`❌ CACHE MISS: ${normalizedMessage} (${responseTime}ms)`);
    return null;
  }

  /**
   * Salva resposta no cache com estratégia inteligente
   */
  cacheResponse(userMessage, response, context = {}) {
    const normalizedMessage = this.normalizeMessage(userMessage);
    const cacheKey = this.generateCacheKey(normalizedMessage, context);
    const contextKey = this.generateContextKey(normalizedMessage, context);
    const temporalKey = this.generateTemporalKey(normalizedMessage);
    const timestamp = Date.now();

    // Verificar limites dos caches
    this.enforceCapLimits();

    const cacheEntry = {
      originalMessage: userMessage,
      normalizedMessage,
      response,
      context,
      timestamp,
      accessCount: 1,
      keywords: this.extractKeywords(normalizedMessage),
      responseTime: context.responseTime || 0
    };

    // Armazenar no cache principal
    this.cache.set(cacheKey, cacheEntry);

    // 🚀 OTIMIZAÇÃO: Adicionar aos índices para busca rápida
    this.addToIndexes(cacheKey, normalizedMessage);

    // Armazenar no cache temporal (para acesso rápido)
    this.temporalCache.set(temporalKey, {
      response,
      timestamp,
      accessCount: 1
    });

    // Se tem contexto, armazenar no cache contextual
    if (Object.keys(context).length > 0) {
      this.contextCache.set(contextKey, {
        ...cacheEntry,
        contextKey
      });
    }

    // Analisar se deve promover para cache frequente
    this.analyzeForPromotion(normalizedMessage, cacheEntry);

    console.log(`💾 Multi-cache storage: "${normalizedMessage.substring(0, 30)}..."`);
  }

  /**
   * Normaliza mensagem para comparação
   */
  normalizeMessage(message) {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .substring(0, 100); // Limita tamanho
  }

  /**
   * Verifica padrões comuns
   */
  checkCommonPatterns(normalizedMessage, context = {}) {
    // 🛡️ PROTEÇÃO CRÍTICA: NUNCA processar mensagens do WhatsApp como navegação por voz
    const isWhatsAppMessage = context.whatsapp || context.fromWhatsApp || context.platform === 'whatsapp';
    const isVoiceDashboard = context.platform === 'dashboard_web' && (context.fromVoiceInput || context.inputMethod === 'voice');
    const shouldProcessVoiceNav = isVoiceDashboard && !isWhatsAppMessage;

    // Sistema de navegação por voz removido - processamento direto
    if (isWhatsAppMessage) {
      console.log(`🛡️ [CACHE] Sistema de voz desabilitado para "${normalizedMessage.substring(0, 30)}..." (origem: ${context.platform || 'whatsapp'})`);
    }

    // 🚀 OTIMIZAÇÃO: Busca rápida usando índice hash
    const words = normalizedMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const candidatePatterns = new Set();

    // Coletar candidatos usando índice hash
    words.forEach(word => {
      if (this.patternKeywords.has(word)) {
        this.patternKeywords.get(word).forEach(pattern => candidatePatterns.add(pattern));
      }
    });

    // Verificar apenas candidatos selecionados em vez de todos os padrões
    for (const pattern of candidatePatterns) {
      if (this.isPatternMatch(normalizedMessage, pattern)) {
        const response = this.commonPatterns.get(pattern);
        console.log(`🚀 [OPTIMIZED-CACHE] Padrão comum encontrado via índice: "${pattern}"`);

        // 🛡️ BLOQUEIO DE SEGURANÇA: Rejeitar qualquer conteúdo com JavaScript
        if (typeof response === 'string' && response.includes('javascript')) {
          console.error(`🚨 BLOQUEADO: Conteúdo com JavaScript rejeitado: ${pattern}`);
          return null;
        }

        return response;
      }
    }

    // Fallback: verificar alguns padrões especiais que podem não estar no índice
    if (candidatePatterns.size === 0) {
      for (const [pattern, response] of this.commonPatterns) {
        if (pattern === '__VOICE_NAV_PLACEHOLDER__') continue;
        if (this.isPatternMatch(normalizedMessage, pattern)) {
          console.log(`⚡ [CACHE-FALLBACK] Padrão comum encontrado (fallback): "${pattern}"`);

          // 🛡️ BLOQUEIO DE SEGURANÇA: Rejeitar qualquer conteúdo com JavaScript
          if (typeof response === 'string' && response.includes('javascript')) {
            console.error(`🚨 BLOQUEADO: Conteúdo com JavaScript rejeitado: ${pattern}`);
            return null;
          }

          return response;
        }
      }
    }
    return null;
  }

  /**
   * Verifica se mensagem combina com padrão
   */
  isPatternMatch(message, pattern) {
    const patternWords = pattern.split(' ');
    const messageWords = message.split(' ');

    // Verifica se pelo menos 70% das palavras do padrão estão na mensagem
    const matches = patternWords.filter(word => messageWords.includes(word));
    return (matches.length / patternWords.length) >= 0.7;
  }

  /**
   * 🚀 OTIMIZADO: Busca resposta similar no cache usando índices hash
   */
  findSimilarCached(message, context) {
    const startTime = Date.now();
    let bestMatch = null;
    let bestSimilarity = 0;
    let candidatesChecked = 0;
    let totalCandidates = 0;

    // 🚀 FASE 1: Busca por candidatos usando índices (O(1) operations)
    const candidates = new Set();
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const messageLen = message.length;
    const firstWord = words[0];

    // Candidatos por palavras-chave
    words.forEach(word => {
      if (this.keywordIndex.has(word)) {
        this.keywordIndex.get(word).forEach(key => candidates.add(key));
      }
    });

    // Candidatos por comprimento similar (±20%)
    const lenRange = Math.floor(messageLen * 0.2);
    for (let len = messageLen - lenRange; len <= messageLen + lenRange; len++) {
      if (this.messageLength.has(len)) {
        this.messageLength.get(len).forEach(key => candidates.add(key));
      }
    }

    // Candidatos por primeira palavra
    if (firstWord && this.firstWords.has(firstWord)) {
      this.firstWords.get(firstWord).forEach(key => candidates.add(key));
    }

    // Se não encontrou candidatos, fazer busca limitada no cache principal (máximo 50 itens)
    if (candidates.size === 0) {
      const cacheEntries = Array.from(this.cache.entries()).slice(0, 50);
      cacheEntries.forEach(([key]) => candidates.add(key));
    }

    totalCandidates = candidates.size;

    // 🚀 FASE 2: Calcular similaridade apenas dos candidatos selecionados
    for (const key of candidates) {
      const entry = this.cache.get(key);
      if (!entry) continue;

      // Verificar se não expirou
      if (Date.now() - entry.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        this.removeFromIndexes(key, entry.normalizedMessage);
        continue;
      }

      candidatesChecked++;

      // Calcular similaridade
      const similarity = this.calculateSimilarity(message, entry.normalizedMessage);

      // Bonus por contexto similar
      const contextBonus = this.getContextBonus(context, entry.context);
      const finalSimilarity = similarity + contextBonus;

      if (finalSimilarity > bestSimilarity && finalSimilarity >= this.similarityThreshold) {
        bestSimilarity = finalSimilarity;
        bestMatch = {
          response: entry.response,
          similarity: finalSimilarity
        };

        // Incrementar contador de acesso
        entry.accessCount++;
      }
    }

    const searchTime = Date.now() - startTime;

    if (bestMatch) {
      console.log(`🚀 [OPTIMIZED-CACHE] Resposta similar encontrada (${(bestMatch.similarity * 100).toFixed(1)}%) - ${candidatesChecked}/${totalCandidates} candidatos em ${searchTime}ms`);
    } else {
      console.log(`🚀 [OPTIMIZED-CACHE] Nenhuma similaridade encontrada - ${candidatesChecked}/${totalCandidates} candidatos em ${searchTime}ms`);
    }

    return bestMatch;
  }

  /**
   * Calcula similaridade entre duas mensagens
   */
  calculateSimilarity(msg1, msg2) {
    const words1 = new Set(msg1.split(' '));
    const words2 = new Set(msg2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Bonus de similaridade por contexto
   */
  getContextBonus(context1, context2) {
    if (!context1.topic || !context2.topic) return 0;

    if (context1.topic === context2.topic) {
      return 0.1; // 10% bonus por mesmo tópico
    }

    return 0;
  }

  /**
   * Gera chave de cache
   */
  generateCacheKey(message, context) {
    const contextString = context.topic || 'general';
    return `${contextString}:${message}`;
  }

  /**
   * Extrai palavras-chave da mensagem
   */
  extractKeywords(message) {
    const words = message.split(' ');
    return words.filter(word => word.length > 2); // Palavras com mais de 2 letras
  }

  /**
   * Remove entrada mais antiga
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [CACHE] Entrada antiga removida para economizar espaço`);
    }
  }

  /**
   * Cleanup automático
   */
  setupAutoCleanup() {
    setInterval(() => {
      const now = Date.now();
      let removedCount = 0;

      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > this.cacheExpiry) {
          this.cache.delete(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log(`🧹 [CACHE] Cleanup automático: ${removedCount} entradas expiradas removidas`);
      }
    }, 300000); // A cada 5 minutos
  }

  /**
   * Adiciona novo padrão comum
   */
  addCommonPattern(pattern, response) {
    this.commonPatterns.set(pattern, response);
    console.log(`📝 [CACHE] Novo padrão adicionado: "${pattern}"`);
  }

  /**
   * Estatísticas avançadas do cache
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(1) : 0;

    return {
      // Tamanhos dos caches
      cacheSizes: {
        main: this.cache.size,
        frequent: this.frequentCache.size,
        context: this.contextCache.size,
        temporal: this.temporalCache.size,
        total: this.cache.size + this.frequentCache.size +
               this.contextCache.size + this.temporalCache.size
      },

      // Limites
      limits: {
        main: this.maxCacheSize,
        frequent: this.maxFrequentSize,
        context: this.maxContextSize,
        temporal: 'unlimited'
      },

      // Hits por tipo
      hits: {
        total: this.hitCount,
        frequent: this.frequentHits,
        context: this.contextHits,
        temporal: this.temporalHits,
        common: this.hitCount - this.frequentHits - this.contextHits - this.temporalHits
      },

      // Métricas gerais
      metrics: {
        total: total,
        misses: this.missCount,
        hitRate: `${hitRate}%`,
        averageResponseTime: `${this.averageResponseTime.toFixed(2)}ms`
      },

      // Padrões de uso
      patterns: {
        commonPatternsCount: this.commonPatterns.size,
        topCommands: this.getTopCommands(5),
        hourlyUsage: this.usagePatterns.hourly,
        dailyUsage: this.usagePatterns.daily
      },

      // Memória
      memory: {
        estimated: this.estimateMemoryUsage(),
        breakdown: this.getMemoryBreakdown()
      }
    };
  }

  /**
   * Obtém comandos mais usados
   */
  getTopCommands(limit = 10) {
    return Array.from(this.usagePatterns.commands.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([command, count]) => ({ command: command.substring(0, 30), count }));
  }

  /**
   * Obtém breakdown de memória por cache
   */
  getMemoryBreakdown() {
    const sizes = {
      main: 0,
      frequent: 0,
      context: 0,
      temporal: 0
    };

    // Calcular tamanhos individuais
    for (const [key, entry] of this.cache) {
      sizes.main += JSON.stringify({ key, entry }).length;
    }

    for (const [key, entry] of this.frequentCache) {
      sizes.frequent += JSON.stringify({ key, entry }).length;
    }

    for (const [key, entry] of this.contextCache) {
      sizes.context += JSON.stringify({ key, entry }).length;
    }

    for (const [key, entry] of this.temporalCache) {
      sizes.temporal += JSON.stringify({ key, entry }).length;
    }

    // Converter para KB
    Object.keys(sizes).forEach(key => {
      sizes[key] = `${(sizes[key] / 1024).toFixed(1)} KB`;
    });

    return sizes;
  }

  /**
   * Gera chave contextual
   */
  generateContextKey(message, context) {
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    const hash = this.simpleHash(contextStr);
    return `${message}_ctx_${hash}`;
  }

  /**
   * Gera chave temporal (baseada na hora)
   */
  generateTemporalKey(message) {
    const hour = new Date().getHours();
    return `${message}_t${hour}`;
  }

  /**
   * 🚀 Adiciona entrada aos índices de busca rápida
   */
  addToIndexes(key, message) {
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const messageLen = message.length;
    const firstWord = words[0];

    // Índice por palavras-chave
    words.forEach(word => {
      if (!this.keywordIndex.has(word)) {
        this.keywordIndex.set(word, new Set());
      }
      this.keywordIndex.get(word).add(key);
    });

    // Índice por comprimento
    if (!this.messageLength.has(messageLen)) {
      this.messageLength.set(messageLen, new Set());
    }
    this.messageLength.get(messageLen).add(key);

    // Índice por primeira palavra
    if (firstWord) {
      if (!this.firstWords.has(firstWord)) {
        this.firstWords.set(firstWord, new Set());
      }
      this.firstWords.get(firstWord).add(key);
    }
  }

  /**
   * 🚀 Remove entrada dos índices de busca rápida
   */
  removeFromIndexes(key, message) {
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const messageLen = message.length;
    const firstWord = words[0];

    // Remover do índice por palavras-chave
    words.forEach(word => {
      if (this.keywordIndex.has(word)) {
        this.keywordIndex.get(word).delete(key);
        if (this.keywordIndex.get(word).size === 0) {
          this.keywordIndex.delete(word);
        }
      }
    });

    // Remover do índice por comprimento
    if (this.messageLength.has(messageLen)) {
      this.messageLength.get(messageLen).delete(key);
      if (this.messageLength.get(messageLen).size === 0) {
        this.messageLength.delete(messageLen);
      }
    }

    // Remover do índice por primeira palavra
    if (firstWord && this.firstWords.has(firstWord)) {
      this.firstWords.get(firstWord).delete(key);
      if (this.firstWords.get(firstWord).size === 0) {
        this.firstWords.delete(firstWord);
      }
    }
  }

  /**
   * Hash simples para chaves
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * 🚀 Constrói índice de palavras-chave para busca rápida em padrões
   */
  buildPatternIndex() {
    this.patternKeywords.clear();

    for (const [pattern, response] of this.commonPatterns) {
      if (pattern === '__VOICE_NAV_PLACEHOLDER__') continue;

      const words = pattern.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      words.forEach(word => {
        if (!this.patternKeywords.has(word)) {
          this.patternKeywords.set(word, new Set());
        }
        this.patternKeywords.get(word).add(pattern);
      });
    }

    console.log(`🚀 [CACHE] Índice de padrões construído: ${this.patternKeywords.size} palavras-chave mapeadas`);
  }

  /**
   * Verifica se entrada é válida (não expirou)
   */
  isValid(entry, expiry) {
    return (Date.now() - entry.timestamp) < expiry;
  }

  /**
   * Atualiza métricas de performance
   */
  updateMetrics(responseTime) {
    const totalRequests = this.hitCount + this.missCount;
    this.totalResponseTime += responseTime;
    this.averageResponseTime = this.totalResponseTime / totalRequests;
  }

  /**
   * Adiciona resposta aos caches rápidos
   */
  addToFastCaches(message, temporalKey, response) {
    // Adicionar ao temporal
    this.temporalCache.set(temporalKey, {
      response,
      timestamp: Date.now(),
      accessCount: 1
    });

    // Se usado muito, adicionar ao frequent
    const usage = this.usagePatterns.commands.get(message) || 0;
    if (usage > 5) { // Threshold para frequent cache
      this.addToFrequentCache(message, response);
    }
  }

  /**
   * Adiciona ao cache frequente
   */
  addToFrequentCache(message, response) {
    if (this.frequentCache.size >= this.maxFrequentSize) {
      // Remove o menos usado
      this.evictLeastUsedFrequent();
    }

    this.frequentCache.set(message, {
      response,
      timestamp: Date.now(),
      accessCount: this.usagePatterns.commands.get(message) || 1
    });

    console.log(`🔥 Promoted to frequent cache: ${message}`);
  }

  /**
   * Remove item menos usado do cache frequente
   */
  evictLeastUsedFrequent() {
    let leastUsed = null;
    let minCount = Infinity;

    for (const [key, item] of this.frequentCache) {
      if (item.accessCount < minCount) {
        minCount = item.accessCount;
        leastUsed = key;
      }
    }

    if (leastUsed) {
      this.frequentCache.delete(leastUsed);
    }
  }

  /**
   * Força limites de capacidade
   */
  enforceCapLimits() {
    // Cache principal
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    // Cache temporal (limpar por idade)
    const now = Date.now();
    for (const [key, item] of this.temporalCache) {
      if (!this.isValid(item, this.temporalExpiry)) {
        this.temporalCache.delete(key);
      }
    }

    // Cache contextual (limpar por idade)
    for (const [key, item] of this.contextCache) {
      if (!this.isValid(item, this.contextExpiry)) {
        this.contextCache.delete(key);
      }
    }
  }

  /**
   * Analisa para promoção a cache frequente
   */
  analyzeForPromotion(message, entry) {
    const currentUsage = this.usagePatterns.commands.get(message) || 0;

    // Promover se usado mais de 5 vezes
    if (currentUsage >= 5) {
      this.addToFrequentCache(message, entry.response);
    }
  }

  /**
   * Rastreia padrões de uso
   */
  trackUsage(message) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Incrementar contadores
    this.usagePatterns.hourly[hour]++;
    this.usagePatterns.daily[day]++;

    const currentCount = this.usagePatterns.commands.get(message) || 0;
    this.usagePatterns.commands.set(message, currentCount + 1);
  }

  /**
   * Configura rastreamento de uso
   */
  setupUsageTracking() {
    // Reset diário dos padrões
    const resetDaily = () => {
      this.usagePatterns.daily.fill(0);
      console.log('📊 Daily usage patterns reset');
    };

    // Reset a cada 24 horas
    setInterval(resetDaily, 24 * 60 * 60 * 1000);
  }

  /**
   * Estima uso de memória total
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    // Cache principal
    for (const [key, entry] of this.cache) {
      totalSize += JSON.stringify({ key, entry }).length;
    }

    // Caches adicionais
    for (const [key, entry] of this.frequentCache) {
      totalSize += JSON.stringify({ key, entry }).length;
    }

    for (const [key, entry] of this.contextCache) {
      totalSize += JSON.stringify({ key, entry }).length;
    }

    for (const [key, entry] of this.temporalCache) {
      totalSize += JSON.stringify({ key, entry }).length;
    }

    return `${(totalSize / 1024).toFixed(1)} KB`;
  }

  /**
   * Limpa cache
   */
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    console.log(`🗑️ [CACHE] Cache limpo completamente`);
  }

  /**
   * Pre-aquece cache com padrões inteligentes
   */
  warmUp() {
    // Adicionar mais padrões baseados no conhecimento do sistema
    // ⚠️ SAUDAÇÕES REMOVIDAS: "oi", "bom dia", "boa tarde", "boa noite"
    // Motivo: Cache retornava respostas genéricas sem considerar contexto da conversa
    // Agora essas mensagens sempre vão para o GPT para resposta contextual
    const extraPatterns = [
      ['help', 'Como posso ajudá-lo? Posso falar sobre o dashboard ou serviços da Digital Boost.'],
      ['ajuda', 'Estou aqui para ajudar! Posso explicar sobre navegação no dashboard ou nossos serviços.'],
      ['obrigado', 'De nada! Estou sempre aqui quando precisar. 😊'],
      ['tchau', 'Até logo! Qualquer dúvida, é só chamar. 👋'],

      // Variações de agendamento consultivas
      ['quero agendar', 'Ótimo! Me passa seu nome, email e qual horário funciona melhor?'],
      ['marcar meeting', 'Perfeito! Qual seu nome, email e quando você tem disponibilidade?'],
      ['reunião comigo', 'Claro! Preciso do seu nome, email e horário que funciona para você.'],
      ['agendar meeting', 'Legal! Me fala seu nome, email e quando é melhor para você?'],

      // Padrões específicos sobre Digital Boost
      ['digital boost', 'Somos especialistas em CRM + IA para PMEs. Startup de Natal/RN, top 15 tech Brasil pelo Sebrae. Qual o maior desafio de vendas da sua empresa?'],
      ['kommo funciona', 'Kommo integra WhatsApp, automatiza pipeline e gera relatórios inteligentes. Quantos leads vocês recebem por mês atualmente?'],
      ['agente artificial', 'Nosso agente IA atende leads 24/7, qualifica prospects e agenda reuniões. Como vocês fazem follow-up de leads hoje?'],
      ['automation vendas', 'Automatizamos toda jornada: captura, qualificação, nutrição e agendamento. Qual etapa mais consome tempo na sua equipe?'],
      ['natal startup', 'Isso! Somos de Natal/RN, reconhecidos pelo Sebrae como top 15 tech do Brasil. Focamos em empresas de 50-200 funcionários. E a sua?'],
      ['pme crescimento', 'Nosso foco são PMEs que querem escalar. Combinamos IA, CRM e consultoria estratégica. Como está o crescimento da sua empresa?']
    ];

    extraPatterns.forEach(([pattern, response]) => {
      this.addCommonPattern(pattern, response);
    });

    // Reconstruir índice após adicionar novos padrões
    this.buildPatternIndex();

    console.log(`🔥 [CACHE] Cache pré-aquecido com ${this.commonPatterns.size} padrões`);
  }
}

// Instância singleton
const responseCache = new ResponseCache();
responseCache.warmUp();

export default responseCache;