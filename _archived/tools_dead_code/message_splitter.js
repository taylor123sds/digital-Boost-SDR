// tools/message_splitter.js
// ✂️ MELHORIA #7: Quebra Inteligente de Mensagens

/**
 * ✂️ MESSAGE SPLITTER - MELHORIA #7
 *
 * Quebra mensagens longas em múltiplas mensagens menores:
 * 📱 Ideal para WhatsApp (evita "textão")
 * ⏱️ Simula digitação humana com delays
 * 🎯 Mantém contexto e fluxo natural
 * 💬 Cria sensação de conversa real
 */

class MessageSplitter {
  constructor() {
    this.config = {
      // Tamanho ideal de cada parte
      idealChunkSize: 200,     // Caracteres por mensagem
      maxChunkSize: 350,       // Máximo por mensagem
      minChunkSize: 50,        // Mínimo por mensagem

      // Delays entre mensagens (milissegundos)
      baseDelay: 800,          // Delay base
      perCharDelay: 15,        // Delay adicional por caractere
      maxDelay: 3000,          // Delay máximo

      // Pontos de quebra preferidos
      breakPoints: {
        sentence: /[.!?]+\s+/g,        // Entre frases
        comma: /,\s+/g,                 // Após vírgulas
        connector: /(\.\s+Mas|\.\s+E|\.\s+Porém|\.\s+Então)/g,  // Conectores
        paragraph: /\n\n/g              // Entre parágrafos
      }
    };

    console.log('✂️ [MESSAGE-SPLITTER] Sistema de quebra de mensagens inicializado');
  }

  /**
   * ✂️ DIVIDE MENSAGEM EM PARTES
   * @param {string} message - Mensagem longa
   * @param {Object} options - Opções de quebra
   * @returns {Object} Mensagens divididas com delays
   */
  splitMessage(message, options = {}) {
    const startTime = Date.now();

    const maxSize = options.maxSize || this.config.maxChunkSize;
    const idealSize = options.idealSize || this.config.idealChunkSize;

    // Se mensagem já está curta, não precisa quebrar
    if (message.length <= maxSize) {
      console.log('✂️ [SPLITTER] Mensagem já está curta, não precisa quebrar');
      return {
        parts: [message],
        delays: [0],
        shouldSplit: false,
        originalLength: message.length,
        splitTime: Date.now() - startTime
      };
    }

    // Quebrar mensagem em partes
    const parts = this.intelligentSplit(message, idealSize, maxSize);

    // Calcular delays entre partes
    const delays = this.calculateDelays(parts);

    console.log(`✂️ [SPLITTER] Mensagem quebrada: ${message.length} chars → ${parts.length} partes`);

    return {
      parts,
      delays,
      shouldSplit: true,
      originalLength: message.length,
      totalParts: parts.length,
      splitTime: Date.now() - startTime
    };
  }

  /**
   * 🧠 QUEBRA INTELIGENTE
   * Tenta quebrar em pontos naturais da frase
   */
  intelligentSplit(message, idealSize, maxSize) {
    const parts = [];
    let remaining = message;

    while (remaining.length > 0) {
      if (remaining.length <= maxSize) {
        // Última parte
        parts.push(remaining.trim());
        break;
      }

      // Tentar encontrar ponto de quebra ideal
      const breakPoint = this.findBestBreakPoint(remaining, idealSize, maxSize);

      if (breakPoint > 0) {
        parts.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
      } else {
        // Fallback: quebrar no tamanho máximo
        parts.push(remaining.substring(0, maxSize).trim());
        remaining = remaining.substring(maxSize).trim();
      }
    }

    return parts;
  }

  /**
   * 🎯 ENCONTRA MELHOR PONTO DE QUEBRA
   * @param {string} text - Texto a quebrar
   * @param {number} idealSize - Tamanho ideal
   * @param {number} maxSize - Tamanho máximo
   * @returns {number} Posição do ponto de quebra
   */
  findBestBreakPoint(text, idealSize, maxSize) {
    // Buscar em janela de texto (idealSize até maxSize)
    const searchWindow = text.substring(0, maxSize);

    // Prioridade 1: Final de frase (. ! ?)
    const sentenceMatch = this.findLastMatch(searchWindow, this.config.breakPoints.sentence, idealSize);
    if (sentenceMatch > idealSize * 0.7) {  // Aceitar se for pelo menos 70% do ideal
      return sentenceMatch;
    }

    // Prioridade 2: Vírgula
    const commaMatch = this.findLastMatch(searchWindow, this.config.breakPoints.comma, idealSize);
    if (commaMatch > idealSize * 0.8) {  // Aceitar se for pelo menos 80% do ideal
      return commaMatch;
    }

    // Prioridade 3: Espaço mais próximo do ideal
    const spaceIndex = searchWindow.lastIndexOf(' ', idealSize + 50);
    if (spaceIndex > idealSize * 0.7) {
      return spaceIndex;
    }

    // Fallback: cortar no tamanho máximo
    return maxSize;
  }

  /**
   * 🔍 ENCONTRA ÚLTIMA OCORRÊNCIA DO PADRÃO
   * @param {string} text - Texto
   * @param {RegExp} pattern - Padrão regex
   * @param {number} preferredPosition - Posição preferida
   * @returns {number} Posição encontrada ou -1
   */
  findLastMatch(text, pattern, preferredPosition) {
    const matches = [...text.matchAll(pattern)];

    if (matches.length === 0) {
      return -1;
    }

    // Procurar match mais próximo da posição preferida
    let bestMatch = matches[0];
    let bestDistance = Math.abs(matches[0].index - preferredPosition);

    for (const match of matches) {
      const distance = Math.abs(match.index - preferredPosition);
      if (distance < bestDistance && match.index < text.length * 0.9) {
        bestMatch = match;
        bestDistance = distance;
      }
    }

    return bestMatch.index + bestMatch[0].length;
  }

  /**
   * ⏱️ CALCULA DELAYS ENTRE MENSAGENS
   * Simula digitação humana
   */
  calculateDelays(parts) {
    const delays = [];

    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        // Primeira parte não tem delay
        delays.push(0);
      } else {
        // Delay baseado no tamanho da parte anterior
        const prevLength = parts[i - 1].length;
        const delay = Math.min(
          this.config.baseDelay + (prevLength * this.config.perCharDelay),
          this.config.maxDelay
        );
        delays.push(Math.round(delay));
      }
    }

    return delays;
  }

  /**
   * 📊 ANALISA SE MENSAGEM PRECISA SER DIVIDIDA
   * @param {string} message - Mensagem
   * @returns {Object} Análise
   */
  shouldSplit(message) {
    const length = message.length;
    const maxSize = this.config.maxChunkSize;

    if (length <= maxSize) {
      return {
        shouldSplit: false,
        reason: 'message_short_enough',
        length,
        maxSize
      };
    }

    return {
      shouldSplit: true,
      reason: 'message_too_long',
      length,
      maxSize,
      estimatedParts: Math.ceil(length / this.config.idealChunkSize)
    };
  }

  /**
   * 🎭 GERA DELAYS PARA SIMULAR DIGITAÇÃO
   * @param {Array} parts - Partes da mensagem
   * @returns {Array} Delays em ms
   */
  generateTypingDelays(parts) {
    return this.calculateDelays(parts);
  }
}

// Singleton instance
const messageSplitter = new MessageSplitter();

export default messageSplitter;

// Funções de conveniência
export function splitMessage(message, options = {}) {
  return messageSplitter.splitMessage(message, options);
}

export function shouldSplitMessage(message) {
  return messageSplitter.shouldSplit(message);
}

export function calculateTypingDelays(parts) {
  return messageSplitter.generateTypingDelays(parts);
}
