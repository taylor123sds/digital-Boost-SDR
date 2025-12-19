/**
 * Sistema Avançado de Opt-Out com Detecção de Contexto
 * Implementa regras sofisticadas de classificação DNC baseadas em contexto
 */

import { saveMessage, getRecentMessages } from '../memory.js';

// Cache de estados de conversa (em produção, usar Redis)
const conversationStates = new Map();

/**
 * Obtém o estado atual da conversa para DNC
 */
export function getDNCConversationState(contactId) {
  if (!conversationStates.has(contactId)) {
    conversationStates.set(contactId, {
      dnc_offer_outstanding: false,
      last_dnc_offer_timestamp: null,
      last_dnc_offer_message: null,
      conversation_context: null
    });
  }
  return conversationStates.get(contactId);
}

/**
 * Marca que o agente fez uma oferta de opt-out
 */
export function markDNCOfferOutstanding(contactId, message) {
  const state = getDNCConversationState(contactId);
  state.dnc_offer_outstanding = true;
  state.last_dnc_offer_timestamp = Date.now();
  state.last_dnc_offer_message = message;

  console.log(`🚫 ESTADO DNC: Oferta de opt-out marcada para ${contactId}`);
  return state;
}

/**
 * Clear DNC offer state
 */
export function clearDNCOfferOutstanding(contactId, reason = 'processed') {
  const state = getDNCConversationState(contactId);
  state.dnc_offer_outstanding = false;
  state.last_dnc_offer_timestamp = null;
  state.last_dnc_offer_message = null;

  console.log(`🚫 ESTADO DNC: Oferta limpa para ${contactId} - Razão: ${reason}`);
  return state;
}

/**
 * Verifica se há uma oferta de DNC pendente válida
 */
export function hasPendingDNCOffer(contactId) {
  const state = getDNCConversationState(contactId);

  if (!state.dnc_offer_outstanding) {
    return false;
  }

  // Expira após 24 horas
  const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas
  if (state.last_dnc_offer_timestamp && (Date.now() - state.last_dnc_offer_timestamp > EXPIRY_TIME)) {
    console.log(`🚫 ESTADO DNC: Oferta expirou para ${contactId} (24h)`);
    clearDNCOfferOutstanding(contactId, 'expired');
    return false;
  }

  return true;
}

/**
 * Sistema principal de classificação DNC com contexto
 */
export function classifyDNCIntent(contactId, userMessage, history = []) {
  console.log(`🚫 CLASSIFICANDO DNC: ${contactId} - "${userMessage}"`);

  // 1. Verifica padrões de bloqueio primeiro (anti-falso-positivo)
  if (containsGuardBlockers(userMessage)) {
    console.log(`🚫 CLASSIFICAÇÃO: NO_DNC - Padrão de bloqueio detectado`);
    return { type: 'NO_DNC', reason: 'guard_blocker', confidence: 0.9 };
  }

  // 2. Verifica se há contexto (oferta pendente OU intenção explícita)
  const hasContext = hasPendingDNCOffer(contactId) || hasStrongDNCIntent(userMessage);

  if (!hasContext) {
    console.log(`🚫 CLASSIFICAÇÃO: NO_DNC - Sem contexto DNC`);
    return { type: 'NO_DNC', reason: 'no_context', confidence: 0.8 };
  }

  // 3. Aplica regras de classificação com contexto
  if (matchesDNCHard(userMessage)) {
    console.log(`🚫 CLASSIFICAÇÃO: DO_NOT_CONTACT - DNC definitivo`);
    return {
      type: 'DO_NOT_CONTACT',
      reason: 'explicit_dnc_request',
      confidence: 0.95,
      response: generateDNCResponse('hard')
    };
  }

  if (matchesDNCPause(userMessage)) {
    const pauseInfo = extractPauseInfo(userMessage);
    console.log(`🚫 CLASSIFICAÇÃO: PAUSE_CONTACT - Pausa temporária`);
    return {
      type: 'PAUSE_CONTACT',
      reason: 'temporary_pause_request',
      confidence: 0.85,
      pauseUntil: pauseInfo.date,
      pauseCondition: pauseInfo.condition,
      response: generateDNCResponse('pause', pauseInfo)
    };
  }

  if (matchesNoInterest(userMessage)) {
    console.log(`🚫 CLASSIFICAÇÃO: NO_INTEREST - Sem interesse atual`);
    return {
      type: 'NO_INTEREST',
      reason: 'no_current_interest',
      confidence: 0.7,
      response: generateDNCResponse('no_interest')
    };
  }

  console.log(`🚫 CLASSIFICAÇÃO: NO_DNC - Condições não atendidas`);
  return { type: 'NO_DNC', reason: 'insufficient_conditions', confidence: 0.6 };
}

/**
 * Padrões de bloqueio (anti-falso-positivo) - SEMPRE retorna NO_DNC
 */
function containsGuardBlockers(message) {
  const msg = message.toLowerCase();

  const GUARD_BLOCKERS = [
    // Compromissos/reuniões
    /\b(cancelar|remarcar)\b.*\b(reuni[aã]o|call|encontro|agenda)\b/,

    // Palavras parecidas
    /\bparab[eé]ns\b|\bpreparar\b|\breparar\b|\bapare(ceu|cer)\b/,

    // Preposição "para" (não "parar")
    /\bpara\b\s+\b(amanh[ãa]|depois|quinta|sexta|\d{1,2}(:\d{2})?)\b/,

    // Cancelamentos de produto/serviço sem menção a mensagens
    /\b(cancelar)\b.*\b(plano|assinatura|servi[cç]o)\b(?!.*\bmensagens?\b)/,

    // IMPORTANTE: Não bloqueia "agora não, depois talvez" - isso deve ir para PAUSE_CONTACT
    // Apenas bloqueia casos bem específicos
    /\bsem\s+interesse\b(?!.*\b(mensagem|mensagens|contato|liga[cç][aã]o|whats|mais|definitiv)\b)/
  ];

  return GUARD_BLOCKERS.some(pattern => pattern.test(msg));
}

/**
 * Detecta intenção DNC forte (mesmo sem oferta pendente)
 */
function hasStrongDNCIntent(message) {
  const msg = message.toLowerCase();

  const STRONG_DNC_PATTERNS = [
    // Comandos de parada explícitos
    /\b(parar?|pare)\s+(de\s+)?(enviar\s+)?(mensagem|mensagens|mandar|enviar)\b/,
    /\b(parar?|pare)\s+(definitivamente|agora|imediatamente|j[aá])\b/,
    /\b(sair)\s+(definitivamente|agora|imediatamente|j[aá])\b/,

    // Frases de rejeição forte
    /\b(n[aã]o\s+quero\s+mais\s+(receber\s+)?mensagem|mensagens)\b/,
    /\b(nunca\s+mais\s+me\s+(mande|envie|contate))\b/,
    /\b(me\s+tire|me\s+remova|me\s+exclua)\b.*\b(lista|base|mailing|aqui|daí|dessa)\b/,

    // Cancelamento de contato
    /\b(cancelar?|remove?r?|remova)\s+.*(contato|numero|telefone|whats)\b/,

    // Spam/irritação
    /\b(spam|lixo|enchendo|irritante|chato)\b/,
    /\bvoc[eê]s\s+s[aã]o\s+(spam|chatos|irritantes)\b/,

    // Comandos diretos
    /\b(descadastrar?|desinscrev|unsubscribe|opt[-\s]?out|stop)\b/
  ];

  return STRONG_DNC_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * DNC Duro - Permanente
 */
function matchesDNCHard(message) {
  const msg = message.toLowerCase();

  // Regex principal: verbo de cancelamento + alvo de comunicação
  const DNC_HARD_REGEX = new RegExp(
    `(?=.*\\b(parar?|pare|cancelar?|cancele|descadastr(ar|e)|desinscrev(er|a)|` +
    `remover?|remova|retirar?|retire|excluir?|exclua|tirar?|tira|` +
    `unsubscribe|unsub|opt[-\\s]?out|stop)\\b)` +
    `(?=.*\\b(mensagem|mensagens|contato|liga[çc][ãa]o|whats(?:app)?|lista|mailing|envio|e?-?mail|email|comunica[çc][ãa]o|base|dados)\\b)`,
    'i'
  );

  // Padrões alternativos diretos
  const DIRECT_DNC_PATTERNS = [
    /\bn[aã]o\s*(quero|desejo)\s*(mais)?\s*(receber|ser\s*contatad[oa]|mensagens|contato)s?\b/,
    /\bchega\s+de\s+(mensagem|mensagens|contato)\b/,
    /\bme\s+deixa\s+em\s+paz\b/,
    /\b(spam|lixo|enchendo\s+o\s+saco)\b/
  ];

  return DNC_HARD_REGEX.test(msg) || DIRECT_DNC_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * DNC Pausar - Temporário com data/condição
 */
function matchesDNCPause(message) {
  const msg = message.toLowerCase();

  const DNC_PAUSE_PATTERNS = [
    // Padrões com "agora não"
    /\bagora\s+n[aã]o[,\s]*(mas\s+)?(depois|talvez|mais\s+tarde)\b/,
    /\bn[aã]o\s*agora[,\s]*(mas\s+)?(depois|talvez|mais\s+tarde)\b/,

    // Padrões temporários
    /\bn[aã]o\s*(me|nos)\s*(chame|contate|envie)\s*mais\s*(por\s*enquanto|agora)\b/,
    /\b(pausar?|suspender)\b.*\b(contatos?|mensagens?)\b/,
    /\bs[oó]\s+(falar|procurar|retomar|me\s+procura)\b.*\b(depois|ap[oó]s|em)\b/,
    /\bvolte\s+a\s+falar.*\b(depois|ap[oó]s|em)\b/,
    /\bat[eé]\s*(\d{1,2}\/\d{1,2}|\w+).*\bsem\s*(mensagens?|contato)\b/,
    /\baguarda\s+(um\s+tempo|at[eé]|depois)\b/,

    // Condicionais temporais
    /\bmais\s+tarde\s+(talvez|quem\s+sabe)\b/,
    /\btalvez\s+(depois|mais\s+tarde|futuramente)\b/
  ];

  return DNC_PAUSE_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * Extrai informações de pausa da mensagem
 */
function extractPauseInfo(message) {
  const msg = message.toLowerCase();

  // Tenta extrair datas
  const dateMatch = msg.match(/\b(\d{1,2}\/\d{1,2}|janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i);

  // Tenta extrair condições
  const conditionMatch = msg.match(/\b(depois\s+de|ap[oó]s|quando|se)\s+(.*?)(?:\.|$)/i);

  return {
    date: dateMatch ? dateMatch[1] : null,
    condition: conditionMatch ? conditionMatch[2].trim() : null,
    duration: estimatePauseDuration(msg)
  };
}

/**
 * Estima duração da pausa baseada no contexto
 */
function estimatePauseDuration(message) {
  if (message.includes('semana')) return 7;
  if (message.includes('mês') || message.includes('meses')) return 30;
  if (message.includes('ano')) return 365;
  if (message.includes('por enquanto')) return 14;
  return 30; // Default: 30 dias
}

/**
 * Sem Interesse - Não é opt-out
 */
function matchesNoInterest(message) {
  const msg = message.toLowerCase();

  const NO_INTEREST_PATTERNS = [
    // Rejeições educadas
    /\bobrigad[oa]\s+(mas\s+)?n[aã]o(\s+(preciso|quero|tenho\s+interesse))?\b/,
    /\bagra[cd]e[cç]o\s+(mas\s+)?n[aã]o\b/,
    /\bvaleu\s+(mas\s+)?n[aã]o\b/,

    // Sem interesse específico
    /\bn[aã]o\s+tenho\s+interesse\b(?!.*\b(mais\s+mensagem|contato|definitiv)\b)/,
    /\bn[aã]o\s+(preciso|quero)\s+(no\s+momento|agora)\b(?!.*\b(mais\s+mensagem|contato)\b)/,

    // Situações específicas
    /\bj[aá]\s+(tenho|uso)\s+(fornecedor|sistema|solu[cç][aã]o)\b/,
    /\bn[aã]o\s+faz\s+parte\s+do\s+(nosso\s+)?(or[cç]amento|planejamento)\b/,
    /\bn[aã]o\s+[eé]\s+(prioridade|nosso\s+foco)\b/,

    // Redirecionamentos gentis
    /\bpode\s+me\s+enviar\s+material\s+por\s+e?-?mail\b/,
    /\bfala\s+comigo\s+m[eê]s\s+que\s+vem\b/,
    /\bse\s+precisar\s+eu\s+(te\s+)?procuro\b/
  ];

  return NO_INTEREST_PATTERNS.some(pattern => pattern.test(msg));
}

/**
 * Gera resposta apropriada baseada no tipo de DNC
 */
function generateDNCResponse(type, info = {}) {
  const responses = {
    hard: "Prontinho! Vamos parar os envios para este número. Se mudar de ideia, é só dizer 'voltar' que reativo seu contato. Obrigado pela gentileza! 👍",

    pause: info.condition
      ? `Combinado! Pauso os contatos ${info.condition ? `até ${info.condition}` : `por ${info.duration || 30} dias`}. Retomo depois disso. Obrigado pela paciência! ⏸️`
      : "Entendido! Vou pausar os contatos por um tempo. Se precisar, é só me avisar. Obrigado! ⏸️",

    no_interest: "Sem problemas! Entendo que não é o momento. Fico à disposição se algo mudar. Tenha um ótimo dia! 🌟"
  };

  return responses[type] || responses.hard;
}

/**
 * Detecta se a mensagem do agente é uma oferta de DNC
 */
export function detectAgentDNCOffer(agentMessage) {
  const msg = agentMessage.toLowerCase();

  const DNC_OFFER_PATTERNS = [
    // Ofertas diretas de opt-out
    /\bse\s+n[aã]o\s+quiser.*\b(parar|sair|cancelar|opt.out|stop)\b/,
    /\bpara\s+(parar|sair).*mensagem/,
    /\bresponda.*\b(parar|stop|sair)\b/,
    /\bavise.*\b(parar|n[aã]o\s+quero\s+mais)\b/,

    // Instruções de cancelamento
    /\b[eé]\s+s[oó].*\b(parar|sair|cancelar)\b.*\bque\s+(eu\s+)?(retiro|paro|cancelo)\b/,
    /\bdigitar?\b.*\b(parar|sair|stop)\b/,
    /\bse\s+quiser.*\b(descadastrar|opt.out|unsubscribe)\b/
  ];

  const hasOffer = DNC_OFFER_PATTERNS.some(pattern => pattern.test(msg));

  return {
    hasOffer,
    offerType: hasOffer ? 'dnc_instruction' : 'none'
  };
}

/**
 * Processa ação de DNC baseada na classificação
 */
export async function processDNCAction(contactId, classification) {
  const now = new Date();

  try {
    switch (classification.type) {
      case 'DO_NOT_CONTACT':
        // Remove permanentemente
        await saveMessage(contactId, 'system', `DNC_HARD: ${classification.reason}`, {
          classification: classification,
          dnc_date: now.toISOString(),
          status: 'permanently_removed'
        });

        clearDNCOfferOutstanding(contactId, 'processed_hard');

        return {
          success: true,
          action_taken: 'permanently_removed',
          message: classification.response,
          should_respond: true
        };

      case 'PAUSE_CONTACT':
        // Pausa temporária
        const pauseDays = classification.pauseUntil ?
          calculatePauseDays(classification.pauseUntil) : 30;
        const resumeDate = new Date(now.getTime() + (pauseDays * 24 * 60 * 60 * 1000));

        await saveMessage(contactId, 'system', `DNC_PAUSE: ${classification.reason}`, {
          classification: classification,
          pause_until: resumeDate.toISOString(),
          pause_condition: classification.pauseCondition,
          status: 'paused'
        });

        clearDNCOfferOutstanding(contactId, 'processed_pause');

        return {
          success: true,
          action_taken: 'paused',
          resume_date: resumeDate.toISOString(),
          message: classification.response,
          should_respond: true
        };

      case 'NO_INTEREST':
        // Nurturing suave
        const nurtureDate = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000)); // 60 dias

        await saveMessage(contactId, 'system', `NO_INTEREST: ${classification.reason}`, {
          classification: classification,
          nurture_until: nurtureDate.toISOString(),
          status: 'nurturing'
        });

        return {
          success: true,
          action_taken: 'nurturing',
          nurture_until: nurtureDate.toISOString(),
          message: classification.response,
          should_respond: true
        };

      case 'NO_DNC':
        // Continua conversa
        return {
          success: true,
          action_taken: 'continue',
          should_respond: false
        };

      default:
        return {
          success: false,
          error: 'Tipo de classificação desconhecido: ' + classification.type
        };
    }
  } catch (error) {
    console.error('❌ Erro ao processar ação DNC:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calcula dias de pausa baseado na string de data
 */
function calculatePauseDays(pauseUntil) {
  // Implementação simples - pode ser expandida
  if (typeof pauseUntil === 'string') {
    if (pauseUntil.includes('semana')) return 7;
    if (pauseUntil.includes('mês')) return 30;
    if (pauseUntil.match(/\d{1,2}\/\d{1,2}/)) {
      // Tenta calcular diferença de data
      return 30; // Default
    }
  }
  return 30; // Default: 30 dias
}

export default {
  classifyDNCIntent,
  processDNCAction,
  getDNCConversationState,
  markDNCOfferOutstanding,
  clearDNCOfferOutstanding,
  hasPendingDNCOffer,
  detectAgentDNCOffer
};