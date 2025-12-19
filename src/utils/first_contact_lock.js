/**
 * @file first_contact_lock.js
 * @description Lock de Primeiro Contato - Evita duplicação de mensagens iniciais
 *
 * PROBLEMA RESOLVIDO:
 * - ProspectingEngine e Campaign Trigger enviavam mensagens diferentes para o mesmo lead
 * - Resultado: Lead recebia 2 mensagens de introdução diferentes
 *
 * SOLUÇÃO:
 * - Lock por telefone que expira em 30 segundos
 * - Primeiro sistema que adquire o lock envia a mensagem
 * - Segundo sistema vê que já foi enviado e pula
 *
 * @version 1.0.0
 */

// Cache de locks por telefone
const activeLocks = new Map();

// Tempo de expiração do lock (30 segundos)
const LOCK_TTL_MS = 30000;

// Cache de mensagens já enviadas (para evitar duplicação mesmo depois do lock expirar)
const sentFirstMessages = new Map();
const SENT_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Tenta adquirir lock para enviar primeira mensagem
 * @param {string} phone - Telefone do lead
 * @param {string} source - Origem ('prospecting_engine' | 'campaign_trigger')
 * @returns {Object} { acquired: boolean, reason?: string, lockedBy?: string }
 */
export function acquireFirstContactLock(phone, source) {
  if (!phone) {
    return { acquired: false, reason: 'invalid_phone' };
  }

  const normalizedPhone = normalizePhoneForLock(phone);
  const now = Date.now();

  // 1. Verificar se já foi enviada mensagem recentemente
  const sent = sentFirstMessages.get(normalizedPhone);
  if (sent && (now - sent.timestamp) < SENT_TTL_MS) {
    console.log(` [LOCK] ${source}: Primeira mensagem já enviada para ${normalizedPhone} por ${sent.source}`);
    return {
      acquired: false,
      reason: 'already_sent',
      lockedBy: sent.source,
      sentAt: sent.timestamp
    };
  }

  // 2. Verificar se tem lock ativo
  const existingLock = activeLocks.get(normalizedPhone);
  if (existingLock) {
    // Lock ainda válido?
    if ((now - existingLock.timestamp) < LOCK_TTL_MS) {
      console.log(` [LOCK] ${source}: Lock ativo para ${normalizedPhone} por ${existingLock.source}`);
      return {
        acquired: false,
        reason: 'locked',
        lockedBy: existingLock.source
      };
    }
    // Lock expirado, remover
    activeLocks.delete(normalizedPhone);
  }

  // 3. Adquirir lock
  activeLocks.set(normalizedPhone, {
    source,
    timestamp: now
  });

  console.log(` [LOCK] ${source}: Lock adquirido para ${normalizedPhone}`);
  return { acquired: true, source };
}

/**
 * Marca que primeira mensagem foi enviada (impede duplicação futura)
 * @param {string} phone - Telefone do lead
 * @param {string} source - Origem que enviou
 */
export function markFirstMessageSent(phone, source) {
  if (!phone) return;

  const normalizedPhone = normalizePhoneForLock(phone);

  sentFirstMessages.set(normalizedPhone, {
    source,
    timestamp: Date.now()
  });

  // Liberar lock ativo
  activeLocks.delete(normalizedPhone);

  console.log(` [LOCK] ${source}: Primeira mensagem marcada como enviada para ${normalizedPhone}`);
}

/**
 * Verifica se primeira mensagem já foi enviada
 * @param {string} phone - Telefone do lead
 * @returns {Object} { sent: boolean, source?: string, timestamp?: number }
 */
export function wasFirstMessageSent(phone) {
  if (!phone) return { sent: false };

  const normalizedPhone = normalizePhoneForLock(phone);
  const sent = sentFirstMessages.get(normalizedPhone);

  if (!sent) {
    return { sent: false };
  }

  // Verificar se ainda está dentro do TTL
  if ((Date.now() - sent.timestamp) > SENT_TTL_MS) {
    sentFirstMessages.delete(normalizedPhone);
    return { sent: false, expired: true };
  }

  return {
    sent: true,
    source: sent.source,
    timestamp: sent.timestamp
  };
}

/**
 * Libera lock (caso desista de enviar)
 * @param {string} phone - Telefone do lead
 */
export function releaseLock(phone) {
  if (!phone) return;

  const normalizedPhone = normalizePhoneForLock(phone);
  activeLocks.delete(normalizedPhone);
  console.log(` [LOCK] Lock liberado para ${normalizedPhone}`);
}

/**
 * Limpa locks expirados e mensagens antigas
 */
export function cleanupExpiredLocks() {
  const now = Date.now();
  let cleanedLocks = 0;
  let cleanedSent = 0;

  // Limpar locks expirados
  for (const [phone, lock] of activeLocks.entries()) {
    if ((now - lock.timestamp) > LOCK_TTL_MS) {
      activeLocks.delete(phone);
      cleanedLocks++;
    }
  }

  // Limpar mensagens antigas
  for (const [phone, sent] of sentFirstMessages.entries()) {
    if ((now - sent.timestamp) > SENT_TTL_MS) {
      sentFirstMessages.delete(phone);
      cleanedSent++;
    }
  }

  if (cleanedLocks > 0 || cleanedSent > 0) {
    console.log(` [LOCK] Cleanup: ${cleanedLocks} locks, ${cleanedSent} sent records`);
  }
}

/**
 * Estatísticas do sistema de lock
 * @returns {Object} Stats
 */
export function getLockStats() {
  return {
    activeLocks: activeLocks.size,
    sentMessages: sentFirstMessages.size,
    locks: Array.from(activeLocks.entries()).map(([phone, data]) => ({
      phone,
      source: data.source,
      age: Math.round((Date.now() - data.timestamp) / 1000) + 's'
    })),
    recentSent: Array.from(sentFirstMessages.entries()).slice(-10).map(([phone, data]) => ({
      phone,
      source: data.source,
      age: Math.round((Date.now() - data.timestamp) / 1000) + 's'
    }))
  };
}

/**
 * Normaliza telefone para usar como chave
 *  FIX CRÍTICO: Agora usa mesma lógica de phone_normalizer.js
 * Converte 13 dígitos  12 dígitos (remove o "9" do celular)
 */
function normalizePhoneForLock(phone) {
  if (!phone) return '';

  // Remover sufixos do WhatsApp e caracteres não-numéricos
  let cleaned = String(phone)
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');

  //  FIX: Preservar número E.164 - NÃO remover o 9 de celulares!
  // Celular: 13 dígitos (55+DDD+9+8), Fixo: 12 dígitos (55+DDD+8)
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

// Cleanup automático a cada 5 minutos
setInterval(cleanupExpiredLocks, 5 * 60 * 1000);

export default {
  acquireFirstContactLock,
  markFirstMessageSent,
  wasFirstMessageSent,
  releaseLock,
  cleanupExpiredLocks,
  getLockStats
};
