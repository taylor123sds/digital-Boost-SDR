// tools/information_validator.js
// 🔍 Validador de informações extraídas via IA

import openaiClient from '../core/openai_client.js';

/**
 * Valida se o orçamento extraído foi corretamente interpretado
 * @param {String} extractedBudget - Valor extraído (ex: "R$ 3mil")
 * @param {String} userMessage - Mensagem completa do usuário
 * @returns {Object} { valid, confidence, needsConfirmation, extractedValue, probablyWrong }
 */
export async function validateBudgetExtraction(extractedBudget, userMessage) {
  if (!extractedBudget) {
    return { valid: false, confidence: 0, needsConfirmation: false };
  }

  try {
    const prompt = `Analise se o cliente POSSUI ou NÃO POSSUI este orçamento:

Valor extraído: "${extractedBudget}"
Mensagem do cliente: "${userMessage}"

O cliente está:
A) Dizendo que TEM esse orçamento disponível
B) Dizendo que esse orçamento é MUITO ALTO/NÃO TEM
C) Apenas mencionando valor sem confirmar disponibilidade

Responda APENAS com a letra: A, B ou C`;

    const resp = await openaiClient.createChatCompletion([
      { role: "user", content: prompt }
    ], {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0
    });

    const result = resp.choices[0].message.content.trim().toUpperCase();

    return {
      valid: result === 'A',
      needsConfirmation: result === 'C',
      probablyWrong: result === 'B',
      confidence: result === 'A' ? 0.9 : (result === 'C' ? 0.5 : 0.1),
      extractedValue: extractedBudget
    };

  } catch (error) {
    console.error('❌ [VALIDATOR] Erro ao validar budget:', error);
    return {
      valid: false,
      confidence: 0,
      needsConfirmation: true,
      error: error.message
    };
  }
}

/**
 * Valida se a autoridade (decisor) foi corretamente identificada
 * @param {String} extractedAuthority - Cargo/função extraído
 * @param {String} userMessage - Mensagem completa do usuário
 * @returns {Object} { valid, confidence, needsConfirmation }
 */
export async function validateAuthorityExtraction(extractedAuthority, userMessage) {
  if (!extractedAuthority) {
    return { valid: false, confidence: 0, needsConfirmation: false };
  }

  try {
    const prompt = `Analise se a pessoa É ou NÃO É decisora/responsável:

Cargo identificado: "${extractedAuthority}"
Mensagem: "${userMessage}"

A pessoa:
A) É DECISOR/RESPONSÁVEL (sócio, dono, CEO, gerente, diretor, responsável)
B) NÃO é decisor (funcionário, subordinado, sem poder de decisão)
C) Não está claro

Responda APENAS: A, B ou C`;

    const resp = await openaiClient.createChatCompletion([
      { role: "user", content: prompt }
    ], {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0
    });

    const result = resp.choices[0].message.content.trim().toUpperCase();

    return {
      valid: result === 'A',
      needsConfirmation: result === 'C',
      probablyWrong: result === 'B',
      confidence: result === 'A' ? 0.9 : (result === 'C' ? 0.5 : 0.1),
      extractedValue: extractedAuthority
    };

  } catch (error) {
    console.error('❌ [VALIDATOR] Erro ao validar authority:', error);
    return {
      valid: false,
      confidence: 0,
      needsConfirmation: true,
      error: error.message
    };
  }
}

/**
 * Valida se a necessidade/dor foi corretamente identificada
 * @param {String} extractedNeed - Dor identificada
 * @param {String} userMessage - Mensagem completa do usuário
 * @returns {Object} { valid, confidence }
 */
export async function validateNeedExtraction(extractedNeed, userMessage) {
  if (!extractedNeed) {
    return { valid: false, confidence: 0 };
  }

  try {
    const prompt = `Analise se a dor/problema foi corretamente identificado:

Dor extraída: "${extractedNeed}"
Mensagem: "${userMessage}"

A dor identificada:
A) Está CORRETA e é relevante para vendas
B) É SUPERFICIAL/GENÉRICA demais
C) NÃO está relacionada ao que o cliente disse

Responda APENAS: A, B ou C`;

    const resp = await openaiClient.createChatCompletion([
      { role: "user", content: prompt }
    ], {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0
    });

    const result = resp.choices[0].message.content.trim().toUpperCase();

    return {
      valid: result === 'A',
      needsImprovement: result === 'B',
      probablyWrong: result === 'C',
      confidence: result === 'A' ? 0.9 : (result === 'B' ? 0.6 : 0.1),
      extractedValue: extractedNeed
    };

  } catch (error) {
    console.error('❌ [VALIDATOR] Erro ao validar need:', error);
    return {
      valid: false,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Valida se o timing/urgência foi corretamente identificado
 * @param {String} extractedTiming - Timing extraído
 * @param {String} userMessage - Mensagem completa do usuário
 * @returns {Object} { valid, confidence }
 */
export async function validateTimingExtraction(extractedTiming, userMessage) {
  if (!extractedTiming) {
    return { valid: false, confidence: 0 };
  }

  try {
    const prompt = `Analise a urgência/timing mencionado:

Timing extraído: "${extractedTiming}"
Mensagem: "${userMessage}"

O timing:
A) Indica URGÊNCIA real (preciso agora, urgente, prazo curto)
B) É MÉDIO PRAZO (semanas/meses)
C) NÃO há urgência ou está incorreto

Responda APENAS: A, B ou C`;

    const resp = await openaiClient.createChatCompletion([
      { role: "user", content: prompt }
    ], {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0
    });

    const result = resp.choices[0].message.content.trim().toUpperCase();

    return {
      valid: result === 'A' || result === 'B',
      urgencyLevel: result === 'A' ? 'high' : (result === 'B' ? 'medium' : 'low'),
      probablyWrong: result === 'C',
      confidence: result === 'A' ? 0.9 : (result === 'B' ? 0.7 : 0.1),
      extractedValue: extractedTiming
    };

  } catch (error) {
    console.error('❌ [VALIDATOR] Erro ao validar timing:', error);
    return {
      valid: false,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Valida todas as informações BANT extraídas
 * @param {Object} bantInfo - Objeto com {budget, authority, need, timing}
 * @param {String} userMessage - Mensagem do usuário
 * @returns {Object} Validações de cada campo
 */
export async function validateExtractedBANT(bantInfo, userMessage) {
  const validations = {
    budget: null,
    authority: null,
    need: null,
    timing: null
  };

  // Validar budget se existir
  if (bantInfo.budget) {
    validations.budget = await validateBudgetExtraction(bantInfo.budget, userMessage);
  }

  // Validar authority se existir
  if (bantInfo.authority) {
    validations.authority = await validateAuthorityExtraction(bantInfo.authority, userMessage);
  }

  // Validar need se existir
  if (bantInfo.need) {
    validations.need = await validateNeedExtraction(bantInfo.need, userMessage);
  }

  // Validar timing se existir
  if (bantInfo.timing) {
    validations.timing = await validateTimingExtraction(bantInfo.timing, userMessage);
  }

  // Calcular confiança geral
  const confidences = Object.values(validations)
    .filter(v => v !== null)
    .map(v => v.confidence || 0);

  const overallConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  return {
    validations,
    overallConfidence,
    hasIssues: Object.values(validations).some(v => v && (v.probablyWrong || v.needsConfirmation))
  };
}

export default {
  validateBudgetExtraction,
  validateAuthorityExtraction,
  validateNeedExtraction,
  validateTimingExtraction,
  validateExtractedBANT
};
