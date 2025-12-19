// tools/response_optimizer.js
//  MELHORIA #1: Otimizador de Tamanho de Resposta para WhatsApp

/**
 *  OTIMIZADOR DE RESPOSTA - MELHORIA #1
 *
 * Garante respostas curtas e objetivas para WhatsApp:
 *  Reduz respostas longas automaticamente
 *  Mantém máximo 2-3 frases
 *  Preserva call-to-action e valor
 *  Estilo natural de mensagem
 */

class ResponseOptimizer {
  constructor() {
    this.limits = {
      whatsapp: {
        minChars: 50,
        maxChars: 350,    // Limite estrito para WhatsApp
        idealChars: 200,
        maxSentences: 3,
        maxQuestions: 1
      },
      dashboard: {
        minChars: 100,
        maxChars: 600,
        idealChars: 400,
        maxSentences: 5,
        maxQuestions: 2
      }
    };

    // Padrões de corte inteligente
    this.cuttingPatterns = {
      // Frases que podem ser removidas sem perder valor
      removable: [
        /E além disso[,.].*?[.!?]/gi,
        /Vale ressaltar que.*?[.!?]/gi,
        /É importante mencionar que.*?[.!?]/gi,
        /Como você pode ver[,.].*?[.!?]/gi,
        /Apenas para contextualizar[,.].*?[.!?]/gi
      ],

      // Conectivos que podem ser simplificados
      simplifiable: [
        { from: /Além disso,\s*/gi, to: '' },
        { from: /Por outro lado,\s*/gi, to: '' },
        { from: /Vale a pena mencionar que\s*/gi, to: '' },
        { from: /É interessante notar que\s*/gi, to: '' },
        { from: /Gostaria de destacar que\s*/gi, to: '' }
      ]
    };

    console.log(' [RESPONSE-OPTIMIZER] Sistema de otimização de respostas inicializado');
  }

  /**
   *  OTIMIZAÇÃO COMPLETA DE RESPOSTA
   * @param {string} response - Resposta original
   * @param {Object} options - Opções de otimização
   * @returns {Object} Resposta otimizada com métricas
   */
  optimize(response, options = {}) {
    const startTime = Date.now();

    const platform = options.platform || 'whatsapp';
    const limits = this.limits[platform];

    // Análise inicial
    const originalStats = this.analyzeResponse(response);

    // Se já está no tamanho ideal, não precisa otimizar
    if (originalStats.length >= limits.minChars &&
        originalStats.length <= limits.maxChars &&
        originalStats.sentences <= limits.maxSentences) {
      console.log(' [OPTIMIZER] Resposta já está otimizada');
      return {
        optimized: response,
        wasOptimized: false,
        originalLength: originalStats.length,
        finalLength: originalStats.length,
        reductionPercent: 0,
        stats: originalStats,
        optimizationTime: Date.now() - startTime
      };
    }

    // Aplicar otimizações em sequência
    let optimized = response;

    // Passo 1: Remover frases desnecessárias
    if (originalStats.length > limits.maxChars) {
      optimized = this.removeUnnecessarySentences(optimized);
    }

    // Passo 2: Simplificar conectivos
    optimized = this.simplifyConnectors(optimized);

    // Passo 3: Reduzir para número máximo de frases
    if (this.countSentences(optimized) > limits.maxSentences) {
      optimized = this.limitSentences(optimized, limits.maxSentences);
    }

    // Passo 4: Garantir apenas 1 pergunta (WhatsApp)
    if (platform === 'whatsapp') {
      optimized = this.limitQuestions(optimized, limits.maxQuestions);
    }

    // Passo 5: Corte final se ainda muito longo
    if (optimized.length > limits.maxChars) {
      optimized = this.hardCut(optimized, limits.maxChars);
    }

    // Análise final
    const finalStats = this.analyzeResponse(optimized);
    const reduction = ((originalStats.length - finalStats.length) / originalStats.length * 100);

    console.log(` [OPTIMIZER] ${originalStats.length}${finalStats.length} chars (${reduction.toFixed(0)}% redução)`);

    return {
      optimized,
      wasOptimized: true,
      originalLength: originalStats.length,
      finalLength: finalStats.length,
      reductionPercent: reduction,
      stats: {
        original: originalStats,
        final: finalStats
      },
      optimizationTime: Date.now() - startTime
    };
  }

  /**
   *  Analisa estatísticas da resposta
   */
  analyzeResponse(response) {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const questions = (response.match(/\?/g) || []).length;
    const words = response.split(/\s+/).length;

    return {
      length: response.length,
      sentences: sentences.length,
      questions,
      words,
      avgWordsPerSentence: sentences.length > 0 ? words / sentences.length : 0
    };
  }

  /**
   *  Remove frases desnecessárias
   */
  removeUnnecessarySentences(response) {
    let optimized = response;

    for (const pattern of this.cuttingPatterns.removable) {
      optimized = optimized.replace(pattern, '');
    }

    // Limpar espaços duplos (preservando quebras de linha)
    optimized = optimized
      .replace(/[^\S\n]+/g, ' ')  // Substitui espaços/tabs por espaço único (exceto \n)
      .replace(/\n\s*\n/g, '\n\n')  // Normaliza múltiplas quebras para no máximo 2
      .trim();

    return optimized;
  }

  /**
   *  Simplifica conectivos
   */
  simplifyConnectors(response) {
    let optimized = response;

    for (const { from, to } of this.cuttingPatterns.simplifiable) {
      optimized = optimized.replace(from, to);
    }

    return optimized;
  }

  /**
   *  Limita número de frases
   */
  limitSentences(response, maxSentences) {
    const sentences = response.split(/([.!?]+)/).filter(s => s.trim().length > 0);

    // Garantir que temos frase + pontuação
    const sentencePairs = [];
    for (let i = 0; i < sentences.length - 1; i += 2) {
      sentencePairs.push(sentences[i] + (sentences[i + 1] || ''));
    }

    // Estratégia: manter primeira frase e última (que geralmente tem CTA)
    if (sentencePairs.length <= maxSentences) {
      return response;
    }

    // Se temos que cortar, manter início e fim
    if (maxSentences === 2) {
      return sentencePairs[0] + ' ' + sentencePairs[sentencePairs.length - 1];
    } else if (maxSentences === 3) {
      return sentencePairs[0] + ' ' +
             sentencePairs[1] + ' ' +
             sentencePairs[sentencePairs.length - 1];
    } else {
      return sentencePairs.slice(0, maxSentences).join(' ');
    }
  }

  /**
   *  Limita número de perguntas
   */
  limitQuestions(response, maxQuestions) {
    const questionMatches = response.match(/[^.!?]*\?/g);

    if (!questionMatches || questionMatches.length <= maxQuestions) {
      return response;
    }

    // Manter apenas a última pergunta (normalmente é o CTA)
    const lastQuestion = questionMatches[questionMatches.length - 1];

    // Remover outras perguntas, substituir por afirmações
    let optimized = response;
    for (let i = 0; i < questionMatches.length - 1; i++) {
      optimized = optimized.replace(questionMatches[i], '');
    }

    // Limpar espaços (preservando quebras de linha)
    optimized = optimized
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return optimized;
  }

  /**
   *  Corte duro (último recurso)
   */
  hardCut(response, maxChars) {
    if (response.length <= maxChars) {
      return response;
    }

    // Tentar cortar em ponto final
    let cutPoint = response.lastIndexOf('.', maxChars);

    // Se não tem ponto, tentar vírgula
    if (cutPoint === -1) {
      cutPoint = response.lastIndexOf(',', maxChars);
    }

    // Se não tem vírgula, cortar em espaço
    if (cutPoint === -1) {
      cutPoint = response.lastIndexOf(' ', maxChars);
    }

    // Último recurso: cortar no limite
    if (cutPoint === -1) {
      cutPoint = maxChars - 3;
    }

    return response.substring(0, cutPoint).trim() + '...';
  }

  /**
   *  Conta frases
   */
  countSentences(text) {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  /**
   *  Otimização específica para WhatsApp
   */
  optimizeForWhatsApp(response) {
    return this.optimize(response, { platform: 'whatsapp' });
  }

  /**
   *  Otimização específica para Dashboard
   */
  optimizeForDashboard(response) {
    return this.optimize(response, { platform: 'dashboard' });
  }

  /**
   *  Verifica se precisa otimizar (análise rápida)
   */
  needsOptimization(response, platform = 'whatsapp') {
    const limits = this.limits[platform];
    const length = response.length;
    const sentences = this.countSentences(response);

    return length > limits.maxChars || sentences > limits.maxSentences;
  }

  /**
   *  Adiciona tokens de controle ao prompt
   * Para instruir o LLM a gerar respostas já otimizadas
   */
  generateOptimizationPrompt(platform = 'whatsapp') {
    const limits = this.limits[platform];

    return `
 IMPORTANTE - TAMANHO DE RESPOSTA:
- Máximo: ${limits.maxSentences} frases curtas
- Tamanho ideal: ${limits.idealChars} caracteres
- ${platform === 'whatsapp' ? 'Apenas 1 pergunta por mensagem' : 'Máximo 2 perguntas'}
- Estilo: WhatsApp conversacional (direto e natural)

ESTRUTURA OBRIGATÓRIA:
1. Frase de empatia/contexto (curta)
2. Valor/benefício principal (curta)
3. Call-to-action com pergunta (curta)

NÃO USE:
- Listas longas
- Múltiplas perguntas
- Frases complexas
- Jargões corporativos

OBJETIVO: Mensagem curta, natural e com CTA claro.
`;
  }
}

// Singleton instance
const responseOptimizer = new ResponseOptimizer();

//  Exportar classe e instância
export { ResponseOptimizer };
export default responseOptimizer;

// Funções de conveniência
export function optimizeResponse(response, options = {}) {
  return responseOptimizer.optimize(response, options);
}

export function optimizeForWhatsApp(response) {
  return responseOptimizer.optimizeForWhatsApp(response);
}

export function needsOptimization(response, platform = 'whatsapp') {
  return responseOptimizer.needsOptimization(response, platform);
}

export function getOptimizationPrompt(platform = 'whatsapp') {
  return responseOptimizer.generateOptimizationPrompt(platform);
}
