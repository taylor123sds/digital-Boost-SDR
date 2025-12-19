// handlers/audio_processor.js
// Processador de áudio assíncrono otimizado para WhatsApp

import { transcribeWhatsAppAudio } from '../tools/whatsapp.js';
import { downloadWhatsAppMedia } from '../tools/whatsapp.js';
// Enhanced voice recognition removido

export class AudioProcessor {
  constructor() {
    this.processingQueue = new Map();
    this.completedTranscriptions = new Map();
    this.CACHE_EXPIRY = 300000; // 5 minutos
    this.MAX_CACHE_SIZE = 200; // Máximo 200 transcrições em cache
    this.MAX_CONCURRENT = 3; // Máximo 3 transcrições simultâneas
    this.currentProcessing = 0;
  }

  /**
   * Processa áudio de forma assíncrona e otimizada
   */
  async processAudio(messageId, audioData, metadata = {}) {
    const startTime = Date.now();
    console.log(` [ASYNC] Iniciando processamento de áudio: ${messageId}`);

    //  PRÉ-ANÁLISE RÁPIDA DO ÁUDIO
    const preAnalysis = await this.performPreAnalysis(audioData, metadata);
    console.log(` [PRE-ANALYSIS] Áudio analisado: ${preAnalysis.duration}ms, qualidade: ${preAnalysis.quality}`);

    // Se áudio muito curto ou de má qualidade, usar resposta padrão
    if (preAnalysis.tooShort || preAnalysis.poorQuality) {
      console.log(` [PRE-ANALYSIS] Áudio inadequado: ${preAnalysis.reason}`);
      return preAnalysis.fallbackResponse;
    }

    // Verificar se já está sendo processado
    if (this.processingQueue.has(messageId)) {
      console.log(` [ASYNC] Áudio ${messageId} já está sendo processado`);
      return this.waitForCompletion(messageId);
    }

    // Verificar cache de transcrições completas
    if (this.completedTranscriptions.has(messageId)) {
      const cached = this.completedTranscriptions.get(messageId);
      console.log(` [CACHE] Transcrição encontrada em cache: ${messageId}`);
      return cached.text;
    }

    // Controle de concorrência
    if (this.currentProcessing >= this.MAX_CONCURRENT) {
      console.log(` [QUEUE] Limite de processamento atingido. Enfileirando: ${messageId}`);
      return this.enqueueForLater(messageId, audioData, metadata);
    }

    try {
      this.currentProcessing++;
      const processingPromise = this.doTranscription(messageId, audioData, metadata);
      this.processingQueue.set(messageId, processingPromise);

      const result = await processingPromise;

      // Salvar em cache
      this.completedTranscriptions.set(messageId, {
        text: result,
        timestamp: Date.now(),
        processTime: Date.now() - startTime
      });

      console.log(` [ASYNC] Áudio processado em ${Date.now() - startTime}ms: ${messageId}`);
      return result;

    } catch (error) {
      console.error(` [ASYNC] Erro ao processar áudio ${messageId}:`, error);
      throw error;
    } finally {
      this.currentProcessing--;
      this.processingQueue.delete(messageId);
      this.cleanupCache();
    }
  }

  /**
   * Realiza a transcrição otimizada com IA avançada
   */
  async doTranscription(messageId, audioData, metadata) {
    try {
      console.log(` [TRANSCRIBE] Iniciando transcrição avançada: ${messageId}`);

      // Determinar contexto baseado em metadados
      const context = this.determineContext(metadata);

      // Método 1: Tentar usar base64 direto se disponível
      if (audioData.base64) {
        console.log(` [ENHANCED] Usando base64 com IA para: ${messageId}`);
        const result = await this.performEnhancedTranscription(audioData.base64, 'ogg', context);
        return result.text;
      }

      // Método 2: Download da mídia via Evolution API
      if (audioData.url || metadata.messageKey) {
        console.log(` [DOWNLOAD] Baixando mídia para transcrição avançada: ${messageId}`);
        const mediaBase64 = await downloadWhatsAppMedia(messageId, audioData);
        const result = await this.performEnhancedTranscription(mediaBase64, 'ogg', context);
        return result.text;
      }

      throw new Error('Dados de áudio não encontrados');

    } catch (error) {
      console.error(` [TRANSCRIBE] Falha na transcrição ${messageId}:`, error);

      // Retorna resposta de fallback contextual
      return this.getContextualFallback(error, metadata);
    }
  }

  /**
   * Determina contexto baseado em metadados e histórico
   */
  determineContext(metadata) {
    const context = {
      isDashboard: false,
      isBusiness: true, // Default para Digital Boost
      expectedContext: null
    };

    // Analisar metadados para contexto
    if (metadata.originalData?.sender?.includes('digitalboost')) {
      context.isBusiness = true;
    }

    // Pode expandir com análise de histórico de conversa aqui
    return context;
  }

  /**
   * Transcrição avançada com IA
   */
  async performEnhancedTranscription(audioBase64, format, context) {
    try {
      // Converter base64 para stream (mesmo método otimizado anterior)
      const { Readable } = await import('stream');
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const audioStream = new Readable();
      audioStream.push(audioBuffer);
      audioStream.push(null);
      audioStream.path = `audio.${format}`;

      // Sistema de voz removido - usar método básico diretamente
      console.log(' [FALLBACK] Usando método básico...');
      const basicResult = await transcribeWhatsAppAudio(audioBase64, format);

      const result = {
        text: basicResult,
        confidence: 0.5,
        context: [],
        processingTime: 0
      };

      console.log(` [BASIC] Transcrição básica: "${result.text}"`);

      // Salvar métricas para análise
      this.recordTranscriptionMetrics(result);

      return result;

    } catch (error) {
      console.error(' [ENHANCED] Erro na transcrição avançada:', error);

      // Fallback para método básico
      console.log(' [FALLBACK] Tentando método básico...');
      const basicResult = await transcribeWhatsAppAudio(audioBase64, format);

      return {
        text: basicResult,
        confidence: 0.5,
        context: [],
        processingTime: 0
      };
    }
  }

  /**
   * Fallback contextual para erros
   */
  getContextualFallback(error, metadata) {
    if (error.message.includes('download')) {
      return ' Não consegui acessar seu áudio. Você pode repetir sua mensagem por texto?';
    }

    if (error.message.includes('format')) {
      return ' Formato de áudio não suportado. Tente enviar um áudio em formato padrão.';
    }

    return ' Não consegui processar seu áudio no momento. Por favor, envie uma mensagem de texto.';
  }

  /**
   * Pré-análise rápida do áudio para otimizar processamento
   */
  async performPreAnalysis(audioData, metadata) {
    const analysis = {
      duration: 0,
      quality: 'unknown',
      tooShort: false,
      poorQuality: false,
      reason: '',
      fallbackResponse: null,
      estimatedWords: 0
    };

    try {
      // Análise básica de metadados
      if (metadata.originalData?.messageData?.quotedMessage?.length) {
        analysis.estimatedWords = Math.ceil(metadata.originalData.messageData.quotedMessage.length / 6);
      }

      // Verificar se tem dados de áudio válidos
      if (!audioData.base64 && !audioData.url) {
        analysis.poorQuality = true;
        analysis.reason = 'Dados de áudio não encontrados';
        analysis.fallbackResponse = ' Não consegui acessar seu áudio. Você pode repetir por texto?';
        return analysis;
      }

      // Análise rápida do tamanho do base64 (se disponível)
      if (audioData.base64) {
        const sizeInBytes = (audioData.base64.length * 3) / 4;
        analysis.duration = this.estimateAudioDuration(sizeInBytes);
        analysis.quality = this.estimateAudioQuality(sizeInBytes, analysis.duration);

        // Áudio muito curto (< 0.5 segundos)
        if (analysis.duration < 500) {
          analysis.tooShort = true;
          analysis.reason = 'Áudio muito curto para processar';
          analysis.fallbackResponse = ' Seu áudio foi muito curto. Pode tentar novamente com uma mensagem mais longa?';
          return analysis;
        }

        // Áudio muito longo (> 30 segundos)
        if (analysis.duration > 30000) {
          analysis.poorQuality = true;
          analysis.reason = 'Áudio muito longo';
          analysis.fallbackResponse = ' Áudios muito longos podem demorar para processar. Pode enviar uma mensagem mais curta?';
          return analysis;
        }

        // Estimativa de palavras baseada na duração
        analysis.estimatedWords = Math.ceil(analysis.duration / 1000 * 2.5); // ~2.5 palavras por segundo
      }

      console.log(` [PRE-ANALYSIS] Duração: ${analysis.duration}ms, Palavras estimadas: ${analysis.estimatedWords}`);
      return analysis;

    } catch (error) {
      console.error(' [PRE-ANALYSIS] Erro na pré-análise:', error);
      analysis.poorQuality = true;
      analysis.reason = 'Erro na análise do áudio';
      analysis.fallbackResponse = ' Houve um problema com seu áudio. Pode tentar enviar novamente?';
      return analysis;
    }
  }

  /**
   * Estima duração do áudio baseado no tamanho
   */
  estimateAudioDuration(sizeInBytes) {
    // Estimativa baseada em áudio OGG comprimido
    // ~8-12KB por segundo para qualidade de voz média
    const avgBytesPerSecond = 10000;
    return Math.ceil((sizeInBytes / avgBytesPerSecond) * 1000);
  }

  /**
   * Estima qualidade do áudio
   */
  estimateAudioQuality(sizeInBytes, durationMs) {
    const bytesPerSecond = sizeInBytes / (durationMs / 1000);

    if (bytesPerSecond > 15000) return 'high';
    if (bytesPerSecond > 8000) return 'medium';
    if (bytesPerSecond > 4000) return 'low';
    return 'very_low';
  }

  /**
   * Registra métricas de transcrição
   */
  recordTranscriptionMetrics(result) {
    if (!this.metrics) {
      this.metrics = {
        totalTranscriptions: 0,
        averageConfidence: 0,
        contextHits: { dashboard: 0, business: 0, navigation: 0, commands: 0 },
        averageProcessingTime: 0
      };
    }

    this.metrics.totalTranscriptions++;
    this.metrics.averageConfidence = (
      (this.metrics.averageConfidence * (this.metrics.totalTranscriptions - 1) + result.confidence) /
      this.metrics.totalTranscriptions
    );

    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.totalTranscriptions - 1) + result.processingTime) /
      this.metrics.totalTranscriptions
    );

    // Contar contextos detectados
    if (result.context && result.context.length > 0) {
      const topContext = result.context[0].name;
      if (this.metrics.contextHits[topContext] !== undefined) {
        this.metrics.contextHits[topContext]++;
      }
    }
  }

  /**
   * Aguarda conclusão de processamento em andamento
   */
  async waitForCompletion(messageId) {
    const processingPromise = this.processingQueue.get(messageId);
    if (processingPromise) {
      try {
        return await processingPromise;
      } catch (error) {
        console.error(` [WAIT] Erro ao aguardar conclusão ${messageId}:`, error);
        throw error;
      }
    }
    return null;
  }

  /**
   * Enfileira para processamento posterior
   */
  async enqueueForLater(messageId, audioData, metadata) {
    console.log(` [QUEUE] Enfileirando para processamento posterior: ${messageId}`);

    // Aguarda um slot livre com timeout
    const timeout = 30000; // 30 segundos
    const startWait = Date.now();

    while (this.currentProcessing >= this.MAX_CONCURRENT && (Date.now() - startWait) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.currentProcessing >= this.MAX_CONCURRENT) {
      throw new Error('Timeout: Sistema de transcrição sobrecarregado');
    }

    // Processar assim que possível
    return this.processAudio(messageId, audioData, metadata);
  }

  /**
   * Limpeza periódica do cache com LRU eviction
   */
  cleanupCache() {
    const now = Date.now();

    // 1. Limpar por TTL
    for (const [key, value] of this.completedTranscriptions.entries()) {
      if (now - value.timestamp > this.CACHE_EXPIRY) {
        this.completedTranscriptions.delete(key);
      }
    }

    // 2. Enforçar limite de tamanho (LRU eviction)
    if (this.completedTranscriptions.size > this.MAX_CACHE_SIZE) {
      // Converter para array e ordenar por timestamp (mais antigo primeiro)
      const entries = Array.from(this.completedTranscriptions.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remover entradas mais antigas até estar no limite
      const toRemove = entries.length - this.MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.completedTranscriptions.delete(entries[i][0]);
      }

      console.log(` [AUDIO] Evicted ${toRemove} transcrições antigas do cache`);
    }
  }

  /**
   * Verifica se transcrição está pronta
   */
  getTranscriptionStatus(messageId) {
    if (this.completedTranscriptions.has(messageId)) {
      return { status: 'completed', text: this.completedTranscriptions.get(messageId).text };
    }

    if (this.processingQueue.has(messageId)) {
      return { status: 'processing' };
    }

    return { status: 'not_found' };
  }

  /**
   * Estatísticas do processador
   */
  getStats() {
    // Sistema de voz removido - estatísticas básicas apenas
    return {
      currentProcessing: this.currentProcessing,
      queueSize: this.processingQueue.size,
      cacheSize: this.completedTranscriptions.size,
      maxConcurrent: this.MAX_CONCURRENT,
      averageTime: this.getAverageProcessingTime(),
      transcriptionMetrics: this.metrics || {
        totalTranscriptions: 0,
        averageConfidence: 0,
        contextHits: { dashboard: 0, business: 0, navigation: 0, commands: 0 },
        averageProcessingTime: 0
      }
    };
  }

  /**
   * Tempo médio de processamento
   */
  getAverageProcessingTime() {
    const times = Array.from(this.completedTranscriptions.values())
      .map(item => item.processTime)
      .filter(time => time > 0);

    if (times.length === 0) return 0;
    return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
  }
}

// Instância singleton
const audioProcessor = new AudioProcessor();
export default audioProcessor;