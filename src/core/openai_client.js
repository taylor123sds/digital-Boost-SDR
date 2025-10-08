// src/core/openai_client.js
// OpenAI Client Singleton para ORBION
// Centraliza todas as instâncias OpenAI do sistema

import OpenAI from 'openai';

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
        console.warn('⚠️ OPENAI_API_KEY não configurada. Cliente OpenAI não será inicializado.');
        return;
      }

      this.client = new OpenAI({
        apiKey,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout
      });

      this.isInitialized = true;
      console.log('✅ OpenAI Client inicializado com sucesso');
      console.log(`   - Modelo Chat: ${this.config.chatModel}`);
      console.log(`   - Modelo Embedding: ${this.config.embeddingModel}`);

    } catch (error) {
      console.error('❌ Erro ao inicializar OpenAI Client:', error.message);
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
   * Wrapper para chat completions com configurações padrão
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

    try {
      const response = await client.chat.completions.create(defaultOptions);
      return response;
    } catch (error) {
      console.error('❌ Erro na chat completion:', error.message);
      throw error;
    }
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
      console.error('❌ Erro na criação de embedding:', error.message);
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
      console.error('❌ Erro na transcrição de áudio:', error.message);
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
      console.error('❌ Erro na síntese de voz:', error.message);
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
    console.log('🔧 Configurações OpenAI atualizadas:', newConfig);
  }

  /**
   * Estatísticas de uso (placeholder para futuras implementações)
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      hasClient: this.client !== null,
      config: this.config,
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

// Export da classe para casos especiais
export { OpenAIClient };