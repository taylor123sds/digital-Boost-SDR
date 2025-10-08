/**
 * Sistema Avançado de Gerenciamento de Estado de Reuniões
 * Implementa as regras sofisticadas para detectar aceite de reuniões
 */

import { saveMessage, getRecentMessages } from '../memory.js';

// Cache de estados de conversa (em produção, usar Redis)
const conversationStates = new Map();

/**
 * Obtém o estado atual da conversa
 */
export function getConversationState(contactId) {
  if (!conversationStates.has(contactId)) {
    conversationStates.set(contactId, {
      meeting_offer_outstanding: false,
      last_offer_timestamp: null,
      last_offer_message: null,
      last_agent_message_id: null,
      conversation_topic: null
    });
  }
  return conversationStates.get(contactId);
}

/**
 * Marca que o agente fez uma oferta de reunião
 */
export function markMeetingOfferOutstanding(contactId, offerType, message) {
  const state = getConversationState(contactId);
  state.meeting_offer_outstanding = true;
  state.last_offer_timestamp = Date.now();
  state.last_offer_message = message;
  state.last_agent_message_id = generateMessageId();

  console.log(`📅 ESTADO: Oferta de reunião marcada para ${contactId} - Tipo: ${offerType}`);
  return state;
}

/**
 * Clear meeting offer state
 */
export function clearMeetingOfferOutstanding(contactId, reason = 'confirmed') {
  const state = getConversationState(contactId);
  state.meeting_offer_outstanding = false;
  state.last_offer_timestamp = null;
  state.last_offer_message = null;

  console.log(`📅 ESTADO: Oferta de reunião limpa para ${contactId} - Razão: ${reason}`);
  return state;
}

/**
 * Verifica se há uma oferta de reunião pendente válida
 */
export function hasPendingMeetingOffer(contactId) {
  const state = getConversationState(contactId);

  if (!state.meeting_offer_outstanding) {
    return false;
  }

  // Expira após 72 horas
  const EXPIRY_TIME = 72 * 60 * 60 * 1000; // 72 horas
  if (state.last_offer_timestamp && (Date.now() - state.last_offer_timestamp > EXPIRY_TIME)) {
    console.log(`📅 ESTADO: Oferta expirou para ${contactId} (72h)`);
    clearMeetingOfferOutstanding(contactId, 'expired');
    return false;
  }

  return true;
}

/**
 * Verifica se é uma resposta anafórica válida (referência ao que o agente propôs)
 */
export function isValidAnaphoricResponse(contactId, userMessage) {
  const state = getConversationState(contactId);

  if (!state.last_offer_timestamp) {
    return false;
  }

  // Janela temporal: 30 minutos
  const ANAPHORIC_WINDOW = 30 * 60 * 1000; // 30 minutos
  const timeSinceOffer = Date.now() - state.last_offer_timestamp;

  if (timeSinceOffer > ANAPHORIC_WINDOW) {
    console.log(`📅 ANÁFORA: Janela temporal expirada para ${contactId} (${Math.round(timeSinceOffer/60000)}min)`);
    return false;
  }

  // Verifica se é uma mensagem curta (aceite anafórico)
  const isShortAck = isShortAcknowledgment(userMessage);

  console.log(`📅 ANÁFORA: ${contactId} - Curta: ${isShortAck}, Tempo: ${Math.round(timeSinceOffer/60000)}min`);
  return isShortAck;
}

/**
 * Detecta mudança de assunto
 */
export async function detectTopicChange(contactId, userMessage) {
  // Palavras que indicam mudança de assunto
  const topicChangePatterns = [
    /\b(manda|envia|me passa)\s+(material|apresenta[cç][aã]o|proposta|or[cç]amento)\b/i,
    /\b(me liga|liga pra mim|telefona)\s+(outro dia|depois|mais tarde)\b/i,
    /\b(fala(?:mos|r)|conversa(?:mos|r))\s+(sobre|de)\s+\w+/i,
    /\b(preciso|quero)\s+(pensar|ver|analisar|consultar)\b/i
  ];

  const hasTopicChange = topicChangePatterns.some(pattern => pattern.test(userMessage));

  if (hasTopicChange) {
    console.log(`📅 TÓPICO: Mudança detectada para ${contactId}`);
    clearMeetingOfferOutstanding(contactId, 'topic_change');
  }

  return hasTopicChange;
}

/**
 * Sistema avançado de classificação de aceite
 */
export function classifyAcceptance(contactId, userMessage, history = []) {
  console.log(`📅 CLASSIFICANDO: ${contactId} - "${userMessage}"`);

  // 1. Verifica se há oferta pendente
  if (!hasPendingMeetingOffer(contactId)) {
    console.log(`📅 CLASSIFICAÇÃO: NO_ACCEPT - Sem oferta pendente`);
    return { type: 'NO_ACCEPT', reason: 'no_pending_offer' };
  }

  // 2. Verifica padrões negativos primeiro
  if (containsNegativePatterns(userMessage)) {
    console.log(`📅 CLASSIFICAÇÃO: NO_ACCEPT - Padrão negativo detectado`);
    return { type: 'NO_ACCEPT', reason: 'negative_pattern' };
  }

  // 3. Analisa componentes da mensagem
  const analysis = analyzeMessageComponents(userMessage);
  const isAnaphoric = isValidAnaphoricResponse(contactId, userMessage);

  console.log(`📅 ANÁLISE:`, analysis, { isAnaphoric });

  // 4. Aplica regras de classificação
  if (analysis.affirmative) {
    if (analysis.hasTime || analysis.wantsLink || analysis.scheduleVerb || isAnaphoric) {
      if (analysis.wantsLink && !analysis.hasTime && !analysis.scheduleVerb) {
        console.log(`📅 CLASSIFICAÇÃO: PARTIAL_ACCEPT - Pediu link sem horário`);
        return { type: 'PARTIAL_ACCEPT', reason: 'wants_link_no_time' };
      } else {
        console.log(`📅 CLASSIFICAÇÃO: ACCEPT - Aceite confirmado`);
        return { type: 'ACCEPT', reason: 'confirmed_with_conditions' };
      }
    }
  }

  console.log(`📅 CLASSIFICAÇÃO: NO_ACCEPT - Condições não atendidas`);
  return { type: 'NO_ACCEPT', reason: 'insufficient_conditions' };
}

/**
 * Analisa componentes da mensagem
 */
function analyzeMessageComponents(message) {
  const msg = message.toLowerCase();

  // Padrões atualizados baseados na especificação
  const AFFIRMATIVES = /\b(sim|ok|blz|beleza|show|fechad[oa]|combinado|perfeito|maravilha|pode ser|topo|to dentro|bora|vamo(?:\s+n[ea]ssa)?|deal|por mim ok|tá ótimo|confirmo|fechamos)\b/;

  const SCHEDULING_VERBS = /\b(agendar|marcar|combinar|alinhar|confirmar|reservar|bloquear|encaixar|colocar no calend[aá]rio)\b/;

  const LINK_INVITE = /\b(manda(?:r)? (?:o )?(?:link|convite|invite)|envia o invite|calendly|me passa (?:o )?(?:meet|zoom|teams))\b/;

  const TIME_DATE = /\b(hoje|amanh[ãa]|depois de amanh[ãa]|semana que vem|seg|ter|qua|qui|sex|s[áa]b|dom)\b|\b([01]?\d|2[0-3])[:.]?\d{0,2}\s?h?s?\b|\b([1-9])\s?da\s?(manh[ãa]|tarde|noite)\b|\b(esse|este)\s+hor[aá]rio\s+(serve|funciona|ok)\b/;

  return {
    affirmative: AFFIRMATIVES.test(msg),
    scheduleVerb: SCHEDULING_VERBS.test(msg),
    wantsLink: LINK_INVITE.test(msg),
    hasTime: TIME_DATE.test(msg),
    originalMessage: message
  };
}

/**
 * Detecta padrões negativos (anti-falso-positivo)
 */
function containsNegativePatterns(message) {
  const msg = message.toLowerCase();

  const NEGATIVE_PATTERNS = [
    // Reunião genérica (não com você)
    /\b(estou|tô|to|vou|saindo|em)\s+reuni[aã]o\b/,
    /\bdepois da reuni[aã]o\b/,
    /\btenho reuni[aã]o\b/,

    // Adia sem alternativa
    /\bhoje n[aã]o\b/,
    /\bessa semana (t[aã]) (puxada|imposs[ií]vel)\b/,
    /\bagora n[aã]o consigo\b/,

    // Desvio de intenção
    /\bmanda (material|apresenta[cç][aã]o)\b/,
    /\bme envia\s+(?!(?:link|convite|invite))/,
    /\bme liga outro dia\b/,

    // Condições vagas
    /\bdepois combinamos\b/,
    /\bvamos falando\b/,
    /\bte aviso\b/,

    // Negação sem alternativa
    /\besse hor[aá]rio n[aã]o\b/,
    /\bn[aã]o d[aá] pra mim\b/
  ];

  return NEGATIVE_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * Verifica se é um acknowledgment curto (resposta anafórica)
 */
function isShortAcknowledgment(message) {
  const msg = message.trim().toLowerCase();

  // Respostas curtas que são aceites anafóricos
  const SHORT_ACKS = [
    'sim', 'ok', 'pode ser', 'pode ser sim', 'por mim ok', 'tá ótimo',
    'confirmo', 'fechado', 'fechamos', 'show', 'perfeito', 'beleza',
    'blz', 'topo', 'bora', 'vamo', 'deal'
  ];

  // Emojis de confirmação
  const CONFIRM_EMOJIS = ['✅', '👍', '👌', '🤝'];

  return SHORT_ACKS.includes(msg) ||
         CONFIRM_EMOJIS.some(emoji => message.includes(emoji)) ||
         (msg.length <= 15 && /\b(sim|ok|show|perfeito)\b/.test(msg));
}

/**
 * Utilitário para gerar ID de mensagem
 */
function generateMessageId() {
  return Date.now().toString(36) + crypto.randomUUID().slice(0, 8);
}

/**
 * Detecta se a mensagem do agente é uma oferta de reunião
 */
export function detectAgentMeetingOffer(agentMessage) {
  const msg = agentMessage.toLowerCase();

  const OFFER_PATTERNS = [
    // Pergunta direta sobre agendamento
    /\b(podemos|vamos|que tal)\s+(agendar|marcar)\b/,
    /\bquer(?:es)?\s+(agendar|marcar|conversar)\b/,

    // Oferece horários específicos
    /\b(tenho disponibilidade|estou livre|posso)\s+.*(amanh[ãa]|hoje|seg|ter|qua|qui|sex|s[áá]b|dom)/,
    /\b\d{1,2}h\s*(ou|e)\s*\d{1,2}h\b/,
    /\b(às|as)\s+\d{1,2}[:.]?\d{0,2}\b/,

    // Envia link de agendamento
    /\b(link|calendly|agend)\b/,
    /\bmeet\.google\.com|zoom\.us|teams\./,

    // Call-to-action para reunião
    /\bbater(?:mos)?\s+um\s+papo\b/,
    /\bconversa(?:r|mos)\s+por\s+\d+\s+minutos\b/,
    /\breuni[aã]o.*minutos\b/
  ];

  const hasOffer = OFFER_PATTERNS.some(pattern => pattern.test(msg));

  let offerType = 'none';
  if (hasOffer) {
    if (/\b(link|calendly)\b/.test(msg)) offerType = 'link_sent';
    else if (/\b\d{1,2}[:.]?\d{0,2}\s*h\b/.test(msg)) offerType = 'specific_time';
    else if (/disponibilidade|livre/.test(msg)) offerType = 'time_slots';
    else offerType = 'general_offer';
  }

  return { hasOffer, offerType };
}