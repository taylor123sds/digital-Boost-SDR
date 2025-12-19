/**
 * @file intent_detectors.js
 * @description Detectores de intenção para análise de mensagens do usuário
 * @version 1.0.0
 * @date 2025-11-20
 *
 * Detecta intenções específicas nas mensagens para permitir respostas contextuais:
 * - Pedidos para ver planos/pricing
 * - Solicitações de reagendamento (email, horário, data, completo)
 */

// ═══════════════════════════════════════════════════════════════════════════
// DETECTOR: VER PLANOS / PRICING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta se o usuário quer conhecer os planos disponíveis
 *
 * Padrões detectados:
 * - "quero conhecer os outros planos"
 * - "quais são os planos disponíveis?"
 * - "me mostre todos os planos"
 * - "quanto custa cada plano?"
 * - "preços dos pacotes"
 *
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} True se detectou intenção de ver planos
 *
 * @example
 * detectShowPlansIntent("quero conhecer os outros planos")
 * // => true
 *
 * detectShowPlansIntent("quanto custa?")
 * // => true
 */
export function detectShowPlansIntent(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase().trim();

  // Padrões de intenção
  const patterns = [
    // Padrão: "conhecer/ver/mostrar" + "outros/todos" + "planos/opções"
    /\b(conhecer|ver|mostrar|quero|me mostre|apresent[ae])\b.*\b(outros?|todos?|demais|as)\b.*\b(planos?|opções?|pacotes?)\b/i,

    // Padrão: "quais" + "planos/opções"
    /\bquais\b.*\b(são|tem)\b.*\b(planos?|opções?|pacotes?)\b/i,
    /\bquais\b.*\b(planos?|opções?|pacotes?)\b.*\b(disponíveis?|vocês tem|existe)/i,

    // Padrão: preço/valor/quanto + planos/pacotes
    /\b(preços?|valores?|quanto custa|preço de|valor de)\b.*\b(planos?|pacotes?)\b/i,
    /\b(planos?|pacotes?)\b.*\b(preços?|valores?|quanto custa)\b/i,

    // Padrão: "planos disponíveis"
    /\b(planos?|opções?|pacotes?)\b.*\b(disponíveis?|que vocês tem|oferecidos?)\b/i,

    // Padrão: comparativo
    /\b(comparar|diferença entre|qual a diferença)\b.*\b(planos?|pacotes?)\b/i,

    // Padrão: plural simples
    /\b(quais planos?|que planos?|ver planos?|os planos?)\b/i
  ];

  return patterns.some(pattern => pattern.test(lowerMessage));
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECTOR: TIPO DE REAGENDAMENTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta tipo específico de alteração/reagendamento solicitada
 *
 * Tipos detectados:
 * - 'email': Quer mudar apenas o email
 * - 'time': Quer mudar apenas o horário (mantendo data)
 * - 'date': Quer mudar apenas a data (mantendo horário)
 * - 'full': Quer remarcar completamente
 * - null: Não detectou intenção de mudança
 *
 * @param {string} message - Mensagem do usuário
 * @returns {Object} { type: string|null, detected: boolean }
 *
 * @example
 * detectChangeType("preciso mudar o email")
 * // => { type: 'email', detected: true }
 *
 * detectChangeType("pode mudar o horário?")
 * // => { type: 'time', detected: true }
 *
 * detectChangeType("quero remarcar")
 * // => { type: 'full', detected: true }
 */
export function detectChangeType(message) {
  if (!message || typeof message !== 'string') {
    return { type: null, detected: false };
  }

  const lowerText = message.toLowerCase().trim();

  // 1. Mudança de email (prioridade alta)
  const emailChange = /\b(mudar|alterar|trocar|corrigir|atualizar|modificar)\b.*\b(email|e-mail|endereço de email)\b/i.test(lowerText) ||
                      /\b(email|e-mail)\b.*\b(errado|incorreto|outro|novo)\b/i.test(lowerText);

  if (emailChange) {
    return { type: 'email', detected: true };
  }

  // 2. Mudança de horário (mas não mencionou data/dia)
  const timeChange = (/\b(mudar|alterar|trocar|adiantar|atrasar)\b.*\b(hora|horário)\b/i.test(lowerText) ||
                      /\b(hora|horário)\b.*\b(diferente|outro|nova)\b/i.test(lowerText) ||
                      /\b(pode ser|consegue)\b.*\b(mais cedo|mais tarde)\b/i.test(lowerText)) &&
                     !/\b(dia|data)\b/i.test(lowerText);

  if (timeChange) {
    return { type: 'time', detected: true };
  }

  // 3. Mudança de dia/data (mas não mencionou horário)
  const dateChange = (/\b(mudar|alterar|trocar)\b.*\b(dia|data)\b/i.test(lowerText) ||
                      /\b(dia|data)\b.*\b(diferente|outro|nova)\b/i.test(lowerText) ||
                      /\b(outro dia|outra data|próxima semana)\b/i.test(lowerText)) &&
                     !/\b(hora|horário)\b/i.test(lowerText);

  if (dateChange) {
    return { type: 'date', detected: true };
  }

  // 4. Mudança completa (remarcar tudo)
  const fullReschedule = /\b(remarcar|cancelar|desmarcar|mudar (a )?reunião|outro horário)\b/i.test(lowerText) ||
                         /\b(não (vou )?conseguir|não posso|tenho um imprevisto)\b/i.test(lowerText);

  if (fullReschedule) {
    return { type: 'full', detected: true };
  }

  return { type: null, detected: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta se mensagem contém confirmação genérica
 *
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} True se contém confirmação
 */
export function detectConfirmation(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const confirmationPatterns = [
    /\b(sim|confirmo|confirmado|ok|okay|beleza|perfeito|ótimo|top|show|isso|exato)\b/i,
    /\b(pode ser|vai ser|tá bom|tudo bem|certinho|combinado)\b/i,
    /^(s|y)$/i  // "s" ou "y" sozinhos
  ];

  return confirmationPatterns.some(p => p.test(message.toLowerCase().trim()));
}

/**
 * Detecta se mensagem contém negação
 *
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} True se contém negação
 */
export function detectNegation(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const negationPatterns = [
    /\b(não|nao|nunca|nem|jamais)\b/i,
    /\b(não quero|não queria|não gostaria)\b/i,
    /\b(não posso|não consigo|não dá)\b/i
  ];

  return negationPatterns.some(p => p.test(message.toLowerCase().trim()));
}

// Export default
export default {
  detectShowPlansIntent,
  detectChangeType,
  detectConfirmation,
  detectNegation
};
