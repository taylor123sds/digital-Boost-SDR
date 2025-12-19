// src/core/openai_client.js
// OpenAI Client Singleton para LEADLY
// Centraliza todas as instâncias OpenAI do sistema

import OpenAI from 'openai';
import crypto from 'crypto';
import { CircuitBreaker, CircuitBreakerError } from '../utils/CircuitBreaker.js';

/**
 * Singleton OpenAI Client
 * Evita múltiplas instâncias e centraliza configuração
 */
class OpenAIClient {
  constructor() {
    if (OpenAIClient.instance) {
      return OpenAIClient.instance;
    }

    this.client = null;
    this.isInitialized = false;
    this.config = {
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      embeddingModel: process.env.OPENAI_EMB_MODEL || 'text-embedding-3-small',
      maxRetries: 3,
      timeout: 15000
    };

    //  CIRCUIT BREAKER: Proteção contra falhas em cascata
    this.circuitBreaker = new CircuitBreaker({
      name: 'OpenAI',
      failureThreshold: 5,    // Abre após 5 falhas consecutivas
      successThreshold: 2,    // Fecha após 2 sucessos em half-open
      timeout: 30000,         // 30s antes de tentar novamente
      onStateChange: (event) => {
        console.log(` [CIRCUIT-BREAKER] OpenAI: ${event.from} -> ${event.to}`);
        if (event.to === 'OPEN') {
          console.warn(` [CIRCUIT-BREAKER] OpenAI circuit ABERTO! Último erro: ${event.lastError}`);
        }
      }
    });

    //  CACHE: Sistema de cache para respostas frequentes
    this.cache = new Map();
    this.cacheConfig = {
      enabled: true,                   // Cache ativado por padrão
      maxSize: 100,                    // Máximo 100 entradas
      ttl: 5 * 60 * 1000,             // TTL de 5 minutos
      hits: 0,                         // Contador de cache hits
      misses: 0                        // Contador de cache misses
    };

    OpenAIClient.instance = this;
    this.initialize();
  }

  /**
   * Inicializa o cliente OpenAI
   */
  initialize() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        console.warn(' OPENAI_API_KEY não configurada. Cliente OpenAI não será inicializado.');
        return;
      }

      this.client = new OpenAI({
        apiKey,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout
      });

      this.isInitialized = true;
      console.log(' OpenAI Client inicializado com sucesso');
      console.log(`   - Modelo Chat: ${this.config.chatModel}`);
      console.log(`   - Modelo Embedding: ${this.config.embeddingModel}`);

    } catch (error) {
      console.error(' Erro ao inicializar OpenAI Client:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Retorna a instância do cliente OpenAI
   */
  getClient() {
    if (!this.isInitialized || !this.client) {
      throw new Error('OpenAI Client não está inicializado. Verifique OPENAI_API_KEY.');
    }
    return this.client;
  }

  /**
   *  Gera chave de cache a partir das mensagens
   */
  _generateCacheKey(messages, options = {}) {
    // Criar hash SHA-256 das mensagens + opções relevantes
    const cacheData = {
      messages,
      model: options.model || this.config.chatModel,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 600
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(cacheData))
      .digest('hex');

    return `chat_${hash}`;
  }

  /**
   *  Busca resposta no cache
   */
  _getCached(cacheKey) {
    if (!this.cacheConfig.enabled) return null;

    const cached = this.cache.get(cacheKey);

    if (!cached) {
      this.cacheConfig.misses++;
      return null;
    }

    // Verificar TTL
    const now = Date.now();
    if (now - cached.timestamp > this.cacheConfig.ttl) {
      this.cache.delete(cacheKey);
      this.cacheConfig.misses++;
      return null;
    }

    this.cacheConfig.hits++;
    console.log(` [CACHE HIT] Resposta recuperada do cache (hits: ${this.cacheConfig.hits}, hit rate: ${(this.cacheConfig.hits / (this.cacheConfig.hits + this.cacheConfig.misses) * 100).toFixed(1)}%)`);

    return cached.response;
  }

  /**
   *  Salva resposta no cache
   */
  _setCached(cacheKey, response) {
    if (!this.cacheConfig.enabled) return;

    // Se cache está cheio, remover entrada mais antiga
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   *  Limpa entradas expiradas do cache
   */
  _cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheConfig.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(` [CACHE] Limpou ${cleaned} entradas expiradas`);
    }
  }

  /**
   * Wrapper para chat completions com configurações padrão + CACHE + RETRY + CIRCUIT BREAKER
   */
  async createChatCompletion(messages, options = {}) {
    const client = this.getClient();

    const defaultOptions = {
      model: this.config.chatModel,
      messages,
      max_tokens: 600, // Padrão mais conciso para WhatsApp
      temperature: 0.7,
      ...options
    };

    //  VERIFICAR CACHE PRIMEIRO
    const cacheKey = this._generateCacheKey(messages, defaultOptions);
    const cachedResponse = this._getCached(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    //  CIRCUIT BREAKER: Verificar se está aberto
    if (!this.circuitBreaker.isAllowing()) {
      const status = this.circuitBreaker.getStatus();
      console.warn(` [CIRCUIT-BREAKER] OpenAI bloqueado. Próxima tentativa: ${status.nextAttempt}`);
      throw new CircuitBreakerError(
        `OpenAI temporariamente indisponível. Circuit breaker aberto.`,
        'OpenAI'
      );
    }

    //  RETRY COM EXPONENTIAL BACKOFF (dentro do circuit breaker)
    const maxRetries = options.maxRetries || this.config.maxRetries || 3;
    let lastError = null;

    try {
      // Executar dentro do circuit breaker
      return await this.circuitBreaker.execute(async () => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // Limpar cache expirado periodicamente (a cada 10 chamadas)
            if (Math.random() < 0.1) {
              this._cleanExpiredCache();
            }

            const response = await client.chat.completions.create(defaultOptions);

            //  SALVAR NO CACHE
            this._setCached(cacheKey, response);

            return response;

          } catch (error) {
            lastError = error;

            // Verificar se é erro recuperável
            const isRetryable = this._isRetryableError(error);

            if (!isRetryable || attempt === maxRetries - 1) {
              throw error; // Propaga para o circuit breaker
            }

            // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
            const backoffMs = Math.min(100 * Math.pow(2, attempt), 5000);
            console.warn(` [OpenAI] Tentativa ${attempt + 1}/${maxRetries} falhou. Retry em ${backoffMs}ms...`);
            await this._sleep(backoffMs);
          }
        }

        throw lastError;
      });

    } catch (error) {
      // Log específico para circuit breaker
      if (error.isCircuitBreakerError) {
        console.error(` [CIRCUIT-BREAKER] ${error.message}`);
      } else {
        console.error(` [OpenAI] Erro após todas as tentativas:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Verifica se o erro é recuperável (pode fazer retry)
   */
  _isRetryableError(error) {
    // Erros de rate limit ou servidor são recuperáveis
    if (error.status === 429) return true; // Rate limit
    if (error.status >= 500) return true;   // Server errors
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND') return true;

    // Erros de autenticação ou input inválido NÃO são recuperáveis
    if (error.status === 401) return false; // Auth error
    if (error.status === 400) return false; // Bad request

    // Default: tentar novamente
    return true;
  }

  /**
   * Sleep helper para backoff
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrapper para embeddings com configurações padrão
   */
  async createEmbedding(input, options = {}) {
    const client = this.getClient();

    const defaultOptions = {
      model: this.config.embeddingModel,
      input,
      ...options
    };

    try {
      const response = await client.embeddings.create(defaultOptions);
      return response;
    } catch (error) {
      console.error(' Erro na criação de embedding:', error.message);
      throw error;
    }
  }

  /**
   * Wrapper para transcrição de áudio (Whisper)
   */
  async transcribeAudio(file, options = {}) {
    const client = this.getClient();

    const defaultOptions = {
      model: 'whisper-1',
      file,
      language: 'pt',
      ...options
    };

    try {
      const response = await client.audio.transcriptions.create(defaultOptions);
      return response;
    } catch (error) {
      console.error(' Erro na transcrição de áudio:', error.message);
      throw error;
    }
  }

  /**
   * Wrapper para TTS (Text-to-Speech)
   */
  async createSpeech(text, options = {}) {
    const client = this.getClient();

    const defaultOptions = {
      model: 'tts-1',
      voice: 'nova',
      input: text,
      ...options
    };

    try {
      const response = await client.audio.speech.create(defaultOptions);
      return response;
    } catch (error) {
      console.error(' Erro na síntese de voz:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se o cliente está pronto para uso
   */
  isReady() {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Retorna configurações atuais
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Atualiza configurações
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(' Configurações OpenAI atualizadas:', newConfig);
  }

  /**
   *  Limpa o cache manualmente
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheConfig.hits = 0;
    this.cacheConfig.misses = 0;
    console.log(` [CACHE] Cache limpo (${size} entradas removidas)`);
  }

  /**
   *  Ativa/desativa cache
   */
  setCacheEnabled(enabled) {
    this.cacheConfig.enabled = enabled;
    console.log(` [CACHE] Cache ${enabled ? 'ativado' : 'desativado'}`);
  }

  /**
   *  Retorna status do circuit breaker
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   *  Reset manual do circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
    console.log(' [CIRCUIT-BREAKER] OpenAI circuit resetado manualmente');
  }

  /**
   * Estatísticas de uso incluindo cache e circuit breaker
   */
  getStats() {
    const total = this.cacheConfig.hits + this.cacheConfig.misses;
    const hitRate = total > 0 ? (this.cacheConfig.hits / total * 100).toFixed(1) : 0;

    return {
      isInitialized: this.isInitialized,
      hasClient: this.client !== null,
      config: this.config,
      circuitBreaker: this.circuitBreaker.getStatus(),
      cache: {
        enabled: this.cacheConfig.enabled,
        size: this.cache.size,
        maxSize: this.cacheConfig.maxSize,
        ttl: this.cacheConfig.ttl,
        hits: this.cacheConfig.hits,
        misses: this.cacheConfig.misses,
        hitRate: `${hitRate}%`,
        totalRequests: total
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Instância singleton
const openaiClient = new OpenAIClient();

// Exports de conveniência
export default openaiClient;

// Export com arrow functions para manter binding correto do this
export const getClient = () => openaiClient.getClient();
export const createChatCompletion = (...args) => openaiClient.createChatCompletion(...args);
export const createEmbedding = (...args) => openaiClient.createEmbedding(...args);
export const transcribeAudio = (...args) => openaiClient.transcribeAudio(...args);
export const createSpeech = (...args) => openaiClient.createSpeech(...args);
export const isReady = () => openaiClient.isReady();
export const getConfig = () => openaiClient.getConfig();
export const updateConfig = (...args) => openaiClient.updateConfig(...args);
export const getStats = () => openaiClient.getStats();

//  Exports do cache
export const clearCache = () => openaiClient.clearCache();
export const setCacheEnabled = (...args) => openaiClient.setCacheEnabled(...args);

//  Exports do circuit breaker
export const getCircuitBreakerStatus = () => openaiClient.getCircuitBreakerStatus();
export const resetCircuitBreaker = () => openaiClient.resetCircuitBreaker();

// Export da classe para casos especiais
export { OpenAIClient, CircuitBreakerError };