// tools/smart_feedback_filter.js
// Filtro Anti-Feedback Inteligente para Sistema de Voz ORBION

export class SmartFeedbackFilter {
  constructor() {
    // Buffer de saídas recentes
    this.outputBuffer = [];
    this.outputTimestamps = [];

    // Configurações
    this.windowMs = 3000; // Janela temporal de 3 segundos
    this.maxBufferSize = 50; // Máximo de saídas mantidas
    this.similarityThreshold = 0.8; // Limiar de similaridade para considerar echo
    this.minSilenceGap = 1000; // Mínimo de silêncio após TTS

    // Estado de audio
    this.lastTTSEnd = 0;
    this.lastTTSText = '';
    this.isTTSActive = false;

    // Métricas
    this.stats = {
      totalFiltered: 0,
      totalProcessed: 0,
      falsePositives: 0,
      truePositives: 0
    };

    console.log('🚫 SmartFeedbackFilter: Sistema anti-feedback inicializado');
  }

  /**
   * Verifica se um transcript é echo/feedback
   * @param {string} transcript - Texto transcrito
   * @param {number} confidence - Confiança do reconhecimento
   * @returns {boolean} True se for considerado echo
   */
  isEcho(transcript, confidence = 0.5) {
    this.stats.totalProcessed++;

    const now = Date.now();
    const normalizedTranscript = this.normalizeText(transcript);

    // 1. Limpar buffer antigo
    this.cleanOldBuffer(now);

    // 2. Verificar se está muito próximo do final do TTS
    if (this.isTemporalEcho(now, normalizedTranscript)) {
      this.stats.totalFiltered++;
      this.stats.truePositives++;
      console.log('🚫 Filtrado por temporal echo:', transcript);
      return true;
    }

    // 3. Verificar similaridade com saídas recentes
    if (this.isSimilarityEcho(normalizedTranscript, confidence)) {
      this.stats.totalFiltered++;
      this.stats.truePositives++;
      console.log('🚫 Filtrado por similarity echo:', transcript);
      return true;
    }

    // 4. Verificar padrões específicos de eco
    if (this.isPatternEcho(normalizedTranscript)) {
      this.stats.totalFiltered++;
      this.stats.truePositives++;
      console.log('🚫 Filtrado por pattern echo:', transcript);
      return true;
    }

    // 5. Verificar low confidence em janela pós-TTS
    if (this.isLowConfidenceEcho(confidence, now)) {
      this.stats.totalFiltered++;
      console.log('🚫 Filtrado por low confidence echo:', transcript);
      return true;
    }

    return false;
  }

  /**
   * Verifica echo temporal (muito próximo do TTS)
   */
  isTemporalEcho(now, transcript) {
    const timeSinceLastTTS = now - this.lastTTSEnd;

    // Muito próximo do final do TTS
    if (timeSinceLastTTS < this.minSilenceGap) {
      return true;
    }

    // Ainda em janela de risco e similar ao último TTS
    if (timeSinceLastTTS < 2000 && this.lastTTSText) {
      const similarity = this.calculateSimilarity(transcript, this.normalizeText(this.lastTTSText));
      return similarity > 0.6;
    }

    return false;
  }

  /**
   * Verifica echo por similaridade com buffer
   */
  isSimilarityEcho(transcript, confidence) {
    for (let i = 0; i < this.outputBuffer.length; i++) {
      const output = this.outputBuffer[i];
      const similarity = this.calculateSimilarity(transcript, output);

      if (similarity > this.similarityThreshold) {
        // Ajustar threshold baseado na confiança
        const adjustedThreshold = confidence > 0.8 ? 0.9 : this.similarityThreshold;
        return similarity > adjustedThreshold;
      }
    }

    return false;
  }

  /**
   * Verifica padrões específicos de echo
   */
  isPatternEcho(transcript) {
    // Padrões comuns de eco
    const echoPatterns = [
      /^(ah|eh|um|hm)+$/i,                    // Sons vocais
      /^.{1,3}$/,                             // Muito curto
      /^(sim|não|ok|certo)+$/i,               // Confirmações curtas
      /^(obrigad|vlw|tks|ok|beleza)$/i,       // Agradecimentos curtos
      /repetindo|repita|novamente/i,          // Palavras de repetição
      /^\W+$/,                                // Apenas pontuação/símbolos
      /^[aeiou]{2,}$/i,                       // Apenas vogais
      /^(la|na|da|ta|ra|pa){2,}$/i           // Sílabas repetitivas
    ];

    return echoPatterns.some(pattern => pattern.test(transcript));
  }

  /**
   * Verifica echo por baixa confiança pós-TTS
   */
  isLowConfidenceEcho(confidence, now) {
    const timeSinceLastTTS = now - this.lastTTSEnd;

    // Se está na janela pós-TTS e tem baixa confiança
    return timeSinceLastTTS < 2000 && confidence < 0.4;
  }

  /**
   * Calcula similaridade entre dois textos
   */
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Normaliza texto para comparação
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ')        // Remove pontuação
      .replace(/\s+/g, ' ')            // Normaliza espaços
      .trim();
  }

  /**
   * Registra saída de TTS/resposta
   */
  recordOutput(text, isFromTTS = false) {
    const now = Date.now();
    const normalized = this.normalizeText(text);

    // Adicionar ao buffer
    this.outputBuffer.push(normalized);
    this.outputTimestamps.push(now);

    // Se é TTS, registrar informações específicas
    if (isFromTTS) {
      this.lastTTSEnd = now;
      this.lastTTSText = text;
      this.isTTSActive = false;
    }

    // Manter tamanho do buffer
    if (this.outputBuffer.length > this.maxBufferSize) {
      this.outputBuffer.shift();
      this.outputTimestamps.shift();
    }

    console.log(`📝 Output registrado: "${text.substring(0, 50)}..." (TTS: ${isFromTTS})`);
  }

  /**
   * Marca início de TTS
   */
  markTTSStart(text) {
    this.isTTSActive = true;
    this.lastTTSText = text;
    console.log('🔊 TTS iniciado:', text.substring(0, 50) + '...');
  }

  /**
   * Marca fim de TTS
   */
  markTTSEnd() {
    this.lastTTSEnd = Date.now();
    this.isTTSActive = false;
    console.log('🔇 TTS finalizado');
  }

  /**
   * Limpa buffer antigo
   */
  cleanOldBuffer(now) {
    while (this.outputTimestamps.length > 0 &&
           now - this.outputTimestamps[0] > this.windowMs) {
      this.outputBuffer.shift();
      this.outputTimestamps.shift();
    }
  }

  /**
   * Força limpeza do filtro
   */
  clearFilter() {
    this.outputBuffer = [];
    this.outputTimestamps = [];
    this.lastTTSEnd = 0;
    this.lastTTSText = '';
    this.isTTSActive = false;

    console.log('🧹 Filtro anti-feedback limpo');
  }

  /**
   * Obtém estatísticas do filtro
   */
  getStats() {
    const now = Date.now();
    const bufferAge = this.outputTimestamps.length > 0 ?
      now - this.outputTimestamps[0] : 0;

    return {
      ...this.stats,
      filterRate: this.stats.totalProcessed > 0 ?
        (this.stats.totalFiltered / this.stats.totalProcessed * 100).toFixed(1) + '%' : '0%',
      bufferSize: this.outputBuffer.length,
      bufferAge,
      timeSinceLastTTS: now - this.lastTTSEnd,
      isTTSActive: this.isTTSActive,
      lastTTSText: this.lastTTSText.substring(0, 50)
    };
  }

  /**
   * Reporta falso positivo (para aprendizado)
   */
  reportFalsePositive(transcript) {
    this.stats.falsePositives++;

    // TODO: Implementar aprendizado para ajustar thresholds
    console.log('📊 Falso positivo reportado:', transcript);
  }

  /**
   * Ajusta sensibilidade do filtro
   */
  adjustSensitivity(level) {
    switch (level) {
      case 'low':
        this.similarityThreshold = 0.9;
        this.minSilenceGap = 500;
        break;
      case 'medium':
        this.similarityThreshold = 0.8;
        this.minSilenceGap = 1000;
        break;
      case 'high':
        this.similarityThreshold = 0.6;
        this.minSilenceGap = 1500;
        break;
      default:
        console.warn('Nível inválido. Use: low, medium, high');
        return;
    }

    console.log(`🎛️ Sensibilidade ajustada para: ${level}`);
  }

  /**
   * Cleanup ao destruir
   */
  destroy() {
    this.clearFilter();
    console.log('🚫 SmartFeedbackFilter: Cleanup executado');
  }
}

// Singleton instance
const smartFeedbackFilter = new SmartFeedbackFilter();

export default smartFeedbackFilter;