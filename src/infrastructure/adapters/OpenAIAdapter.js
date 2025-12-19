/**
 * @file infrastructure/adapters/OpenAIAdapter.js
 * @description OpenAI service adapter
 * Wave 4: Infrastructure Layer - External Service Adapters
 */

import { ExternalServiceError } from '../../utils/errors/index.js';

/**
 * OpenAI Adapter
 * Wraps OpenAI client with domain-friendly interface
 */
export class OpenAIAdapter {
  /**
   * @param {Object} openaiClient - OpenAI client instance
   * @param {Object} config - Configuration
   * @param {Object} logger - Logger instance
   */
  constructor(openaiClient, config, logger) {
    this.client = openaiClient;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Generate chat completion
   * @param {Array<Object>} messages - Conversation messages
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async generateChatCompletion(messages, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating chat completion', {
        messageCount: messages.length,
        model: options.model || this.config.openai.chatModel
      });

      const response = await this.client.chat.completions.create({
        model: options.model || this.config.openai.chatModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 500,
        top_p: options.topP ?? 1.0,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        ...options.extra
      });

      const duration = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';

      this.logger.info('Chat completion generated', {
        duration,
        model: response.model,
        tokens: response.usage?.total_tokens,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens
      });

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Chat completion failed', {
        duration,
        error: error.message,
        code: error.code
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Chat completion failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate chat completion with streaming
   * @param {Array<Object>} messages - Conversation messages
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Complete response
   */
  async generateChatCompletionStream(messages, onChunk, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating streaming chat completion', {
        messageCount: messages.length,
        model: options.model || this.config.openai.chatModel
      });

      const stream = await this.client.chat.completions.create({
        model: options.model || this.config.openai.chatModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 500,
        stream: true,
        ...options.extra
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('Streaming chat completion generated', {
        duration,
        responseLength: fullResponse.length
      });

      return fullResponse;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Streaming chat completion failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Streaming chat completion failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate text embedding
   * @param {string} text - Text to embed
   * @param {Object} options - Embedding options
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating embedding', {
        textLength: text.length,
        model: options.model || this.config.openai.embeddingModel
      });

      const response = await this.client.embeddings.create({
        model: options.model || this.config.openai.embeddingModel,
        input: text
      });

      const duration = Date.now() - startTime;
      const embedding = response.data[0].embedding;

      this.logger.info('Embedding generated', {
        duration,
        dimensions: embedding.length,
        tokens: response.usage?.total_tokens
      });

      return embedding;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Embedding generation failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Embedding generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {Array<string>} texts - Texts to embed
   * @param {Object} options - Embedding options
   * @returns {Promise<Array<Array<number>>>} Embedding vectors
   */
  async generateEmbeddings(texts, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating multiple embeddings', {
        count: texts.length,
        model: options.model || this.config.openai.embeddingModel
      });

      const response = await this.client.embeddings.create({
        model: options.model || this.config.openai.embeddingModel,
        input: texts
      });

      const duration = Date.now() - startTime;
      const embeddings = response.data.map(item => item.embedding);

      this.logger.info('Multiple embeddings generated', {
        duration,
        count: embeddings.length,
        dimensions: embeddings[0].length,
        tokens: response.usage?.total_tokens
      });

      return embeddings;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Multiple embeddings generation failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Multiple embeddings generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Transcribe audio to text
   * @param {Buffer|File} audio - Audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audio, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Transcribing audio', {
        audioSize: audio.size || audio.length,
        model: options.model || 'whisper-1'
      });

      const response = await this.client.audio.transcriptions.create({
        file: audio,
        model: options.model || 'whisper-1',
        language: options.language || 'pt',
        response_format: options.format || 'json',
        temperature: options.temperature ?? 0
      });

      const duration = Date.now() - startTime;
      const text = typeof response === 'string' ? response : response.text;

      this.logger.info('Audio transcribed', {
        duration,
        textLength: text.length
      });

      return text;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Audio transcription failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Audio transcription failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate speech from text
   * @param {string} text - Text to synthesize
   * @param {Object} options - TTS options
   * @returns {Promise<Buffer>} Audio buffer
   */
  async generateSpeech(text, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating speech', {
        textLength: text.length,
        model: options.model || 'tts-1',
        voice: options.voice || 'nova'
      });

      const response = await this.client.audio.speech.create({
        model: options.model || 'tts-1',
        voice: options.voice || 'nova',
        input: text,
        response_format: options.format || 'mp3',
        speed: options.speed ?? 1.0
      });

      const duration = Date.now() - startTime;
      const buffer = Buffer.from(await response.arrayBuffer());

      this.logger.info('Speech generated', {
        duration,
        audioSize: buffer.length
      });

      return buffer;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Speech generation failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Speech generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Create function call completion
   * @param {Array<Object>} messages - Conversation messages
   * @param {Array<Object>} functions - Available functions
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Function call or message
   */
  async generateFunctionCall(messages, functions, options = {}) {
    const startTime = Date.now();

    try {
      this.logger.debug('Generating function call', {
        messageCount: messages.length,
        functionCount: functions.length,
        model: options.model || this.config.openai.chatModel
      });

      const response = await this.client.chat.completions.create({
        model: options.model || this.config.openai.chatModel,
        messages,
        tools: functions.map(fn => ({
          type: 'function',
          function: fn
        })),
        tool_choice: options.toolChoice || 'auto',
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 500
      });

      const duration = Date.now() - startTime;
      const message = response.choices[0]?.message;

      this.logger.info('Function call generated', {
        duration,
        hasFunctionCall: !!message.tool_calls,
        tokens: response.usage?.total_tokens
      });

      return {
        content: message.content,
        functionCall: message.tool_calls?.[0]?.function,
        finishReason: response.choices[0]?.finish_reason
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Function call generation failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Function call generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Moderate content
   * @param {string} text - Text to moderate
   * @returns {Promise<Object>} Moderation result
   */
  async moderateContent(text) {
    const startTime = Date.now();

    try {
      this.logger.debug('Moderating content', {
        textLength: text.length
      });

      const response = await this.client.moderations.create({
        input: text
      });

      const duration = Date.now() - startTime;
      const result = response.results[0];

      this.logger.info('Content moderated', {
        duration,
        flagged: result.flagged
      });

      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Content moderation failed', {
        duration,
        error: error.message
      });

      throw new ExternalServiceError(
        'OpenAI',
        `Content moderation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage stats
   */
  getStats() {
    // This would track usage across requests
    // For now, return placeholder
    return {
      requestCount: 0,
      totalTokens: 0,
      averageLatency: 0
    };
  }
}

export default OpenAIAdapter;
