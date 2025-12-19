/**
 * @file IntentClassifier.js
 * @description Clean Architecture - Intent Classification System
 *
 * Classifica intenção geral da mensagem (greeting, objection, BANT response, etc).
 * FAQ detection foi movido para UnifiedFAQSystem (MessagePipeline Layer 3).
 *
 * @author ORBION Team
 * @version 3.1.0
 * @updated 2025-12-04 - Melhorada detecção de perguntas + logging padronizado
 */

import log from '../utils/logger-wrapper.js';

// ═══════════════════════════════════════════════════════════════
// DETECTORES DE INTENT
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica se mensagem é uma pergunta explícita
 * Usado para routing hints (FAQ agora é tratado em MessagePipeline)
 *
 *  LÓGICA INTELIGENTE:
 * 1. Interrogação (?) = 100% pergunta
 * 2. Palavras interrogativas + contexto de pergunta (evita falsos positivos)
 * 3. Padrões explícitos de pedido de informação
 * 4. Exclusão de falsos positivos comuns
 *
 * @param {string} text - Texto da mensagem
 * @returns {Object} { isQuestion: boolean, confidence: number, reason: string }
 */
function isExplicitQuestion(text) {
  const trimmed = text.trim().toLowerCase();
  const original = text.trim();

  // ═══════════════════════════════════════════════════════════════
  // REGRA 1: Interrogação no final = 100% pergunta
  // ═══════════════════════════════════════════════════════════════
  if (original.endsWith('?')) {
    return { isQuestion: true, confidence: 1.0, reason: 'ends_with_question_mark' };
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRA 2: Exclusões - NÃO são perguntas (falsos positivos comuns)
  // ═══════════════════════════════════════════════════════════════

  //  FIX: Palavra interrogativa SOZINHA não é pergunta
  // Ex: "Como", "Quando", "Onde" sem contexto = provavelmente só confirmação/expressão
  const wordCount = trimmed.split(/\s+/).length;
  const singleInterrogativeWord = /^(como|quando|onde|qual|quem|quanto|porque|porquê)$/i;

  if (wordCount === 1 && singleInterrogativeWord.test(trimmed)) {
    return { isQuestion: false, confidence: 0.85, reason: 'single_word_not_question' };
  }

  const notQuestionPatterns = [
    /^como\s+(combinado|conversamos|falamos|prometido|acordado)/i,  // "Como combinado..."
    /^quando\s+(puder|tiver|der|for\s+possível)/i,                  // "Quando puder me avisa"
    /^onde\s+(eu\s+)?(assino|clico|entro|acesso)\s/i,               // "Onde eu assino" sem ? é instrução
    /^(ok|certo|beleza|combinado|fechado|perfeito)/i,               // Confirmações
    /^(sim|não|claro|com\s+certeza|pode\s+ser)/i,                   // Respostas diretas
    /^(obrigad[oa]|valeu|agradeço)/i,                               // Agradecimentos
    /^(bom\s+dia|boa\s+tarde|boa\s+noite|oi|olá)/i,                 // Saudações
  ];

  if (notQuestionPatterns.some(p => p.test(trimmed))) {
    return { isQuestion: false, confidence: 0.9, reason: 'excluded_pattern' };
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRA 3: Padrões EXPLÍCITOS de pergunta (alta confiança)
  // ═══════════════════════════════════════════════════════════════
  const explicitQuestionPatterns = [
    // Pedidos de informação explícitos
    { pattern: /\b(pode|poderia|consegue)\s+(me\s+)?(explicar|dizer|falar|informar)\b/i, confidence: 0.95 },
    { pattern: /\b(sabe|saberia)\s+(me\s+)?(dizer|informar|explicar)\b/i, confidence: 0.95 },
    { pattern: /\bgostaria\s+de\s+(saber|entender|conhecer)\b/i, confidence: 0.95 },
    { pattern: /\bquero\s+(saber|entender|conhecer)\s+(mais\s+)?(sobre)?\b/i, confidence: 0.9 },
    { pattern: /\bpreciso\s+(saber|entender)\b/i, confidence: 0.9 },

    // Perguntas sobre capacidade/serviço
    { pattern: /\bvocês?\s+(faz|fazem|oferece|oferecem|tem|têm|trabalha|trabalham)\s+(com\s+)?/i, confidence: 0.85 },
    { pattern: /\ba\s+empresa\s+(faz|oferece|tem|trabalha)/i, confidence: 0.85 },

    // Perguntas sobre preço/valor
    { pattern: /\b(quanto|qual)\s+(é\s+)?(o\s+)?(valor|preço|custo|investimento)\b/i, confidence: 0.95 },
    { pattern: /\b(qual|quais)\s+(são\s+)?(os\s+)?(valores|preços|custos|planos)\b/i, confidence: 0.95 },

    // Perguntas sobre funcionamento
    { pattern: /\bcomo\s+(é\s+)?(que\s+)?(funciona|faz|seria|fica)\b/i, confidence: 0.9 },
    { pattern: /\bcomo\s+(posso|consigo|faço\s+para)\b/i, confidence: 0.9 },

    // Perguntas sobre disponibilidade
    { pattern: /\b(tem|têm|existe|há)\s+(disponibilidade|vaga|horário)/i, confidence: 0.85 },
    { pattern: /\bquando\s+(posso|podemos|seria|é\s+possível)\b/i, confidence: 0.85 },

    // Perguntas sobre localização/contato
    { pattern: /\bonde\s+(fica|é|está|encontro|acho)\b/i, confidence: 0.85 },
    { pattern: /\bqual\s+(é\s+)?(o\s+)?(endereço|telefone|email|contato|site|whatsapp)\b/i, confidence: 0.95 },

    // Perguntas sobre o quê/quem
    { pattern: /^o\s+que\s+(é|são|seria|significa|quer\s+dizer)\b/i, confidence: 0.95 },
    { pattern: /^quem\s+(é|são|seria|faz|cuida)\b/i, confidence: 0.9 },
    { pattern: /^qual\s+(é|são|seria)\s+(a|o|os|as)?\s*(diferença|vantagem|benefício)/i, confidence: 0.9 },

    // Perguntas de confirmação
    { pattern: /\bé\s+(isso\s+mesmo|verdade|correto|certo)\b/i, confidence: 0.8 },
    { pattern: /\bentendi\s+(certo|bem|direito)\b/i, confidence: 0.8 },

    // Cadê/Onde está
    { pattern: /^cad[êe]\s+/i, confidence: 0.9 },
  ];

  for (const { pattern, confidence } of explicitQuestionPatterns) {
    if (pattern.test(trimmed)) {
      return { isQuestion: true, confidence, reason: 'explicit_question_pattern' };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRA 4: Palavras interrogativas + mensagem curta (provavelmente pergunta)
  // ═══════════════════════════════════════════════════════════════
  const startsWithInterrogative = /^(o\s+que|como|quando|onde|por\s*qu[eê]|qual|quais|quem|quanto[as]?)\s/i;

  // Mensagem curta (2-6 palavras) começando com interrogativa = provavelmente pergunta
  // wordCount já foi calculado acima na REGRA 2
  if (startsWithInterrogative.test(trimmed) && wordCount >= 2 && wordCount <= 6) {
    return { isQuestion: true, confidence: 0.75, reason: 'short_interrogative' };
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRA 5: Default - não é pergunta
  // ═══════════════════════════════════════════════════════════════
  return { isQuestion: false, confidence: 0.7, reason: 'no_question_pattern' };
}

/**
 * Helper para compatibilidade - retorna apenas boolean
 */
function isQuestion(text) {
  return isExplicitQuestion(text).isQuestion;
}

/**
 * Detecta intenção geral da mensagem
 */
function detectGeneralIntent(messageText) {
  const messageLower = messageText.toLowerCase();

  // Greeting
  if (/^(oi|olá|ola|e aí|eai|bom dia|boa tarde|boa noite)/i.test(messageText.trim())) {
    return {
      intent: 'greeting',
      confidence: 0.9
    };
  }

  // Objeção/Dúvida
  if (/(não|nao)\s+(tenho|quero|preciso|sei)|dúvida|objeção/i.test(messageLower)) {
    return {
      intent: 'objection',
      confidence: 0.7
    };
  }

  // Interesse positivo
  if (/interessante|legal|gostei|quero\s+saber\s+mais|me\s+interessa/i.test(messageLower)) {
    return {
      intent: 'positive_interest',
      confidence: 0.8
    };
  }

  // BANT response (respostas típicas de qualificação)
  const bantPatterns = [
    /com\s+urgência|urgente|o\s+quanto\s+antes/i,
    /(?:eu\s+)?decido|sou\s+decisor|preciso\s+consultar/i,
    /entre\s+\d+|até\s+\d+|r\$\s*\d+/i
  ];

  if (bantPatterns.some(pattern => pattern.test(messageLower))) {
    return {
      intent: 'bant_response',
      confidence: 0.95
    };
  }

  // Default: statement (afirmação genérica)
  return {
    intent: 'statement',
    confidence: 0.5
  };
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFICADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Classifica intenção geral da mensagem (sem FAQ - FAQ está em UnifiedFAQSystem)
 *
 * @param {string} messageText - Texto da mensagem
 * @param {Object} context - Contexto (currentAgent, leadState, etc)
 * @returns {Object} Classificação detalhada
 */
export async function classifyIntent(messageText, context = {}) {
  log.info(` [INTENT] Classificando: "${messageText.substring(0, 50)}..."`);
  log.info(` [INTENT] Contexto: currentAgent=${context.currentAgent || 'sdr'}`);

  const { currentAgent = 'sdr', leadState = null } = context;

  // Detectar intenção geral
  const generalIntent = detectGeneralIntent(messageText);

  log.info(` [INTENT] Intent geral: ${generalIntent.intent} (confiança: ${generalIntent.confidence})`);

  // Ajustar confiança baseado no agente atual
  let adjustedConfidence = generalIntent.confidence;

  // Se está no Specialist Agent (BANT), respostas BANT têm maior confiança
  if (currentAgent === 'specialist' && generalIntent.intent === 'bant_response') {
    adjustedConfidence = 0.99; // Altíssima confiança
    log.info(` [INTENT] BANT response no Specialist Agent - confiança aumentada para ${adjustedConfidence}`);
  }

  // Detectar se é pergunta (com detalhes)
  const questionAnalysis = isExplicitQuestion(messageText);

  return {
    primaryIntent: generalIntent.intent,
    confidence: adjustedConfidence,
    context: {
      agentContext: currentAgent,
      isQuestion: questionAnalysis.isQuestion,
      questionConfidence: questionAnalysis.confidence,
      questionReason: questionAnalysis.reason
    }
  };
}

export default {
  classifyIntent,
  isExplicitQuestion,
  isQuestion
};
