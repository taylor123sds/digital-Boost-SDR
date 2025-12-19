// tools/response_quality_validator.js
// 🎯 MELHORIA #5: Validador de Qualidade de Resposta para WhatsApp

/**
 * 🎯 VALIDADOR DE QUALIDADE DE RESPOSTA - MELHORIA #5
 *
 * Valida respostas antes de enviar para garantir qualidade ideal:
 * ✅ Tamanho adequado para WhatsApp (2-3 frases)
 * ✅ Máximo 1 pergunta por mensagem
 * ✅ Call-to-action presente
 * ✅ Evita repetições
 * ✅ Linguagem natural e conversacional
 */

class ResponseQualityValidator {
  constructor() {
    this.qualityRules = {
      // Tamanho ideal para WhatsApp
      minLength: 50,       // Caracteres mínimos
      maxLength: 400,      // Caracteres máximos (2-3 frases)
      idealLength: 250,    // Tamanho ideal

      // Estrutura da mensagem
      maxQuestions: 1,     // Máximo de perguntas por mensagem
      minSentences: 2,     // Mínimo de frases
      maxSentences: 4,     // Máximo de frases

      // Call-to-action (sinais de fechamento/ação)
      ctaKeywords: [
        'quer', 'vamos', 'bora', 'que tal', 'gostaria',
        'pode', 'consegue', 'quando', 'hoje', 'amanhã',
        'reunião', 'conversar', 'marcar', 'agendar', 'call'
      ],

      // Palavras problemáticas (muito formais/corporativas)
      avoidWords: [
        'implementar', 'solução corporativa', 'plataforma enterprise',
        'alinhamento estratégico', 'sinergia', 'ecossistema',
        'jornada do cliente', 'transformação digital'
      ]
    };

    console.log('🎯 [QUALITY-VALIDATOR] Sistema de validação de qualidade inicializado');
  }

  /**
   * 🎯 VALIDAÇÃO COMPLETA DE RESPOSTA
   * @param {string} response - Resposta a ser validada
   * @param {Object} context - Contexto da conversa
   * @returns {Object} Resultado da validação com score e sugestões
   */
  validateResponse(response, context = {}) {
    const startTime = Date.now();

    // Análise de qualidade
    const lengthCheck = this.checkLength(response);
    const structureCheck = this.checkStructure(response);
    const ctaCheck = this.checkCallToAction(response);
    const languageCheck = this.checkLanguage(response);
    const repetitionCheck = this.checkRepetition(response, context.recentMessages || []);

    // Calcular score geral (0-100)
    const score = this.calculateQualityScore({
      lengthCheck,
      structureCheck,
      ctaCheck,
      languageCheck,
      repetitionCheck
    });

    // Classificação de qualidade
    const quality = this.classifyQuality(score);

    // Sugestões de melhoria
    const suggestions = this.generateSuggestions({
      lengthCheck,
      structureCheck,
      ctaCheck,
      languageCheck,
      repetitionCheck
    });

    const result = {
      isValid: score >= 60, // Mínimo aceitável
      score,
      quality,
      validationTime: Date.now() - startTime,
      checks: {
        length: lengthCheck,
        structure: structureCheck,
        cta: ctaCheck,
        language: languageCheck,
        repetition: repetitionCheck
      },
      suggestions,
      shouldRewrite: score < 50 // Reescrever se score muito baixo
    };

    console.log(`🎯 [QUALITY] Score: ${score}/100 (${quality}) - ${result.isValid ? '✅ APROVADO' : '⚠️ MELHORAR'}`);

    return result;
  }

  /**
   * ✅ Verifica tamanho da resposta
   */
  checkLength(response) {
    const length = response.length;
    const { minLength, maxLength, idealLength } = this.qualityRules;

    let score = 100;
    let status = 'ideal';
    let message = 'Tamanho perfeito para WhatsApp';

    if (length < minLength) {
      score = 30;
      status = 'too_short';
      message = `Resposta muito curta (${length} caracteres). Ideal: ${idealLength}`;
    } else if (length > maxLength) {
      score = 50;
      status = 'too_long';
      message = `Resposta muito longa (${length} caracteres). Ideal: ${idealLength}`;
    } else if (Math.abs(length - idealLength) > 100) {
      score = 80;
      status = 'acceptable';
      message = 'Tamanho aceitável mas pode melhorar';
    }

    return { score, status, length, message };
  }

  /**
   * ✅ Verifica estrutura (frases e perguntas)
   */
  checkStructure(response) {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const questions = (response.match(/\?/g) || []).length;

    const { minSentences, maxSentences, maxQuestions } = this.qualityRules;

    let score = 100;
    let issues = [];

    if (sentences.length < minSentences) {
      score -= 30;
      issues.push('Poucas frases - adicione mais conteúdo');
    }

    if (sentences.length > maxSentences) {
      score -= 20;
      issues.push('Muitas frases - seja mais conciso');
    }

    if (questions > maxQuestions) {
      score -= 40;
      issues.push(`Muitas perguntas (${questions}). Máximo: ${maxQuestions}`);
    }

    if (questions === 0) {
      score -= 10;
      issues.push('Sem pergunta para engajar - considere adicionar');
    }

    return {
      score: Math.max(0, score),
      sentenceCount: sentences.length,
      questionCount: questions,
      issues,
      status: issues.length === 0 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * ✅ Verifica call-to-action
   */
  checkCallToAction(response) {
    const lowerResponse = response.toLowerCase();
    const { ctaKeywords } = this.qualityRules;

    const foundCtas = ctaKeywords.filter(keyword =>
      lowerResponse.includes(keyword)
    );

    const hasCTA = foundCtas.length > 0;
    const score = hasCTA ? 100 : 40;

    return {
      score,
      hasCTA,
      foundKeywords: foundCtas,
      message: hasCTA
        ? 'Call-to-action presente'
        : 'Falta call-to-action para engajar'
    };
  }

  /**
   * ✅ Verifica linguagem (naturalidade)
   */
  checkLanguage(response) {
    const lowerResponse = response.toLowerCase();
    const { avoidWords } = this.qualityRules;

    const formalWords = avoidWords.filter(word =>
      lowerResponse.includes(word)
    );

    let score = 100;
    const issues = [];

    // Penalizar por palavras muito formais
    score -= formalWords.length * 15;

    if (formalWords.length > 0) {
      issues.push(`Linguagem muito formal: ${formalWords.join(', ')}`);
    }

    // Verificar se tem emojis (bom para WhatsApp)
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(response);
    if (!hasEmojis) {
      score -= 10;
      issues.push('Considere adicionar emojis para WhatsApp');
    }

    return {
      score: Math.max(0, score),
      formalWords,
      hasEmojis,
      issues,
      naturalness: score > 80 ? 'high' : score > 60 ? 'medium' : 'low'
    };
  }

  /**
   * ✅ Verifica repetições com mensagens recentes
   */
  checkRepetition(response, recentMessages = []) {
    if (recentMessages.length === 0) {
      return { score: 100, hasRepetition: false, message: 'Sem histórico para comparar' };
    }

    const lowerResponse = response.toLowerCase();
    const responseWords = lowerResponse.split(/\s+/).filter(w => w.length > 4);

    let maxSimilarity = 0;

    // Comparar com últimas 3 mensagens
    const lastMessages = recentMessages.slice(-3);

    for (const msg of lastMessages) {
      if (typeof msg === 'string' || msg.content) {
        const msgText = typeof msg === 'string' ? msg : msg.content;
        const msgWords = msgText.toLowerCase().split(/\s+/).filter(w => w.length > 4);

        const commonWords = responseWords.filter(word =>
          msgWords.includes(word)
        );

        const similarity = commonWords.length / Math.max(responseWords.length, msgWords.length);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }

    const hasRepetition = maxSimilarity > 0.5;
    const score = hasRepetition ? 30 : 100;

    return {
      score,
      hasRepetition,
      similarity: maxSimilarity,
      message: hasRepetition
        ? `Alta repetição detectada (${(maxSimilarity * 100).toFixed(0)}%)`
        : 'Resposta original'
    };
  }

  /**
   * 📊 Calcula score geral de qualidade
   */
  calculateQualityScore(checks) {
    const weights = {
      lengthCheck: 0.2,
      structureCheck: 0.3,
      ctaCheck: 0.2,
      languageCheck: 0.15,
      repetitionCheck: 0.15
    };

    let totalScore = 0;

    for (const [checkName, weight] of Object.entries(weights)) {
      totalScore += checks[checkName].score * weight;
    }

    return Math.round(totalScore);
  }

  /**
   * 🏆 Classifica qualidade da resposta
   */
  classifyQuality(score) {
    if (score >= 90) return 'excelente';
    if (score >= 80) return 'muito_boa';
    if (score >= 70) return 'boa';
    if (score >= 60) return 'aceitavel';
    if (score >= 50) return 'ruim';
    return 'muito_ruim';
  }

  /**
   * 💡 Gera sugestões de melhoria
   */
  generateSuggestions(checks) {
    const suggestions = [];

    // Sugestões de tamanho
    if (checks.lengthCheck.status === 'too_long') {
      suggestions.push('📏 Reduza para 2-3 frases curtas');
    } else if (checks.lengthCheck.status === 'too_short') {
      suggestions.push('📏 Adicione mais contexto e valor');
    }

    // Sugestões de estrutura
    if (checks.structureCheck.questionCount > 1) {
      suggestions.push('❓ Faça apenas 1 pergunta por mensagem');
    } else if (checks.structureCheck.questionCount === 0) {
      suggestions.push('❓ Adicione uma pergunta para engajar');
    }

    // Sugestões de CTA
    if (!checks.ctaCheck.hasCTA) {
      suggestions.push('🎯 Adicione call-to-action (quer, vamos, bora...)');
    }

    // Sugestões de linguagem
    if (checks.languageCheck.formalWords.length > 0) {
      suggestions.push('💬 Use linguagem mais natural e conversacional');
    }

    if (!checks.languageCheck.hasEmojis) {
      suggestions.push('😊 Adicione emojis para WhatsApp');
    }

    // Sugestões de repetição
    if (checks.repetitionCheck.hasRepetition) {
      suggestions.push('🔄 Varie a mensagem - muito similar às anteriores');
    }

    return suggestions;
  }

  /**
   * 🎯 Validação rápida (apenas essencial)
   * Para uso em contextos de alta performance
   */
  quickValidate(response) {
    const length = response.length;
    const questions = (response.match(/\?/g) || []).length;

    return {
      isValid: length >= 50 && length <= 400 && questions <= 1,
      length,
      questions
    };
  }
}

// Singleton instance
const responseQualityValidator = new ResponseQualityValidator();

export default responseQualityValidator;

// Funções de conveniência
export function validateResponseQuality(response, context = {}) {
  return responseQualityValidator.validateResponse(response, context);
}

export function quickValidateResponse(response) {
  return responseQualityValidator.quickValidate(response);
}
