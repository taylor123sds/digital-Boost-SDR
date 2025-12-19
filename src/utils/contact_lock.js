/**
 * @file contact_lock.js
 * @description Lock por Contato - Previne race conditions em processamento paralelo
 *
 * PROBLEMA RESOLVIDO:
 * - Múltiplos saveLeadState() para o mesmo contato ocorrendo simultaneamente
 * - Estado antigo sobrescrevendo estado mais recente
 * - Inconsistência entre cache em memória e banco de dados
 *
 * SOLUÇÃO:
 * - Lock por telefone durante processamento de mensagem
 * - Operações atômicas de leitura-modificação-gravação
 * - Timeout automático para evitar deadlocks
 *
 * @version 1.0.0
 */

// Cache de locks ativos por contato
const activeLocks = new Map();

// Fila de espera por contato
const waitQueues = new Map();

// Configurações
const LOCK_TIMEOUT_MS = 30000; // 30 segundos
const MAX_WAIT_MS = 60000; // 60 segundos

/**
 * Adquire lock exclusivo para um contato
 * @param {string} contactId - ID do contato (telefone)
 * @param {string} operation - Nome da operação (para logging)
 * @returns {Promise<{acquired: boolean, lockId: string|null, error?: string}>}
 */
export async function acquireContactLock(contactId, operation = 'unknown') {
  if (!contactId) {
    return { acquired: false, lockId: null, error: 'invalid_contact' };
  }

  const normalizedId = normalizeContactId(contactId);
  const lockId = generateLockId();
  const startTime = Date.now();

  // Verificar se já tem lock ativo
  const existingLock = activeLocks.get(normalizedId);

  if (existingLock) {
    // Verificar se lock expirou
    if ((Date.now() - existingLock.timestamp) > LOCK_TIMEOUT_MS) {
      console.warn(` [CONTACT-LOCK] Lock expirado para ${normalizedId}, liberando...`);
      activeLocks.delete(normalizedId);
    } else {
      // Lock ativo - entrar na fila de espera
      console.log(` [CONTACT-LOCK] ${operation}: Aguardando lock para ${normalizedId} (holder: ${existingLock.operation})`);

      const result = await waitForLock(normalizedId, operation, lockId);

      if (!result.acquired) {
        console.warn(` [CONTACT-LOCK] ${operation}: Timeout aguardando lock para ${normalizedId}`);
        return { acquired: false, lockId: null, error: 'timeout' };
      }
    }
  }

  // Adquirir lock
  activeLocks.set(normalizedId, {
    lockId,
    operation,
    timestamp: Date.now(),
    startTime
  });

  console.log(` [CONTACT-LOCK] ${operation}: Lock adquirido para ${normalizedId} (id: ${lockId.substring(0, 8)})`);

  return { acquired: true, lockId };
}

/**
 * Aguarda liberação do lock com timeout
 * @param {string} normalizedId - ID normalizado do contato
 * @param {string} operation - Operação aguardando
 * @param {string} lockId - ID do lock sendo adquirido
 * @returns {Promise<{acquired: boolean}>}
 */
async function waitForLock(normalizedId, operation, lockId) {
  return new Promise((resolve) => {
    // Adicionar à fila de espera
    if (!waitQueues.has(normalizedId)) {
      waitQueues.set(normalizedId, []);
    }

    const queue = waitQueues.get(normalizedId);
    const waitEntry = {
      lockId,
      operation,
      timestamp: Date.now(),
      resolve
    };

    queue.push(waitEntry);

    // Timeout de espera
    const timeout = setTimeout(() => {
      // Remover da fila
      const index = queue.indexOf(waitEntry);
      if (index > -1) {
        queue.splice(index, 1);
      }
      resolve({ acquired: false, reason: 'timeout' });
    }, MAX_WAIT_MS);

    // Polling para verificar se lock foi liberado
    const checkInterval = setInterval(() => {
      const existingLock = activeLocks.get(normalizedId);

      if (!existingLock || (Date.now() - existingLock.timestamp) > LOCK_TIMEOUT_MS) {
        clearInterval(checkInterval);
        clearTimeout(timeout);

        // Remover da fila
        const index = queue.indexOf(waitEntry);
        if (index > -1) {
          queue.splice(index, 1);
        }

        resolve({ acquired: true });
      }
    }, 100); // Check a cada 100ms
  });
}

/**
 * Libera lock de um contato
 * @param {string} contactId - ID do contato
 * @param {string} lockId - ID do lock (para validação)
 * @returns {boolean} - Se liberou com sucesso
 */
export function releaseContactLock(contactId, lockId) {
  if (!contactId) return false;

  const normalizedId = normalizeContactId(contactId);
  const existingLock = activeLocks.get(normalizedId);

  if (!existingLock) {
    console.warn(` [CONTACT-LOCK] Tentativa de liberar lock inexistente para ${normalizedId}`);
    return false;
  }

  // Validar que é o mesmo lock
  if (lockId && existingLock.lockId !== lockId) {
    console.warn(` [CONTACT-LOCK] Lock mismatch para ${normalizedId}: esperado ${lockId.substring(0, 8)}, encontrado ${existingLock.lockId.substring(0, 8)}`);
    return false;
  }

  const duration = Date.now() - existingLock.startTime;
  activeLocks.delete(normalizedId);

  console.log(` [CONTACT-LOCK] ${existingLock.operation}: Lock liberado para ${normalizedId} (duração: ${duration}ms)`);

  // Notificar próximo na fila (se houver)
  const queue = waitQueues.get(normalizedId);
  if (queue && queue.length > 0) {
    const next = queue.shift();
    console.log(` [CONTACT-LOCK] Notificando próximo na fila: ${next.operation}`);
  }

  return true;
}

/**
 * Executa operação com lock automático
 * @param {string} contactId - ID do contato
 * @param {string} operation - Nome da operação
 * @param {Function} callback - Função a executar com lock
 * @returns {Promise<any>} - Resultado do callback
 */
export async function withContactLock(contactId, operation, callback) {
  const lockResult = await acquireContactLock(contactId, operation);

  if (!lockResult.acquired) {
    throw new Error(`Não foi possível adquirir lock para ${contactId}: ${lockResult.error}`);
  }

  try {
    return await callback();
  } finally {
    releaseContactLock(contactId, lockResult.lockId);
  }
}

/**
 * Verifica se contato está com lock ativo
 * @param {string} contactId - ID do contato
 * @returns {Object} - { locked: boolean, operation?: string, age?: number }
 */
export function isContactLocked(contactId) {
  if (!contactId) return { locked: false };

  const normalizedId = normalizeContactId(contactId);
  const lock = activeLocks.get(normalizedId);

  if (!lock) {
    return { locked: false };
  }

  const age = Date.now() - lock.timestamp;

  // Lock expirado
  if (age > LOCK_TIMEOUT_MS) {
    activeLocks.delete(normalizedId);
    return { locked: false, expired: true };
  }

  return {
    locked: true,
    operation: lock.operation,
    age: Math.round(age / 1000),
    lockId: lock.lockId.substring(0, 8)
  };
}

/**
 * Estatísticas do sistema de lock
 * @returns {Object}
 */
export function getLockStats() {
  const now = Date.now();

  return {
    activeLocks: activeLocks.size,
    waitingInQueue: Array.from(waitQueues.values()).reduce((sum, q) => sum + q.length, 0),
    locks: Array.from(activeLocks.entries()).map(([id, lock]) => ({
      contact: id.substring(0, 8) + '...',
      operation: lock.operation,
      age: Math.round((now - lock.timestamp) / 1000) + 's'
    }))
  };
}

/**
 * Limpa locks expirados
 */
export function cleanupExpiredLocks() {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, lock] of activeLocks.entries()) {
    if ((now - lock.timestamp) > LOCK_TIMEOUT_MS) {
      activeLocks.delete(id);
      cleaned++;
    }
  }

  // Limpar filas vazias
  for (const [id, queue] of waitQueues.entries()) {
    if (queue.length === 0) {
      waitQueues.delete(id);
    }
  }

  if (cleaned > 0) {
    console.log(` [CONTACT-LOCK] Cleanup: ${cleaned} locks expirados removidos`);
  }
}

/**
 * Normaliza ID de contato
 *  FIX CRÍTICO: Agora usa mesma lógica de phone_normalizer.js
 * Converte 13 dígitos  12 dígitos (remove o "9" do celular)
 */
function normalizeContactId(contactId) {
  if (!contactId) return '';

  // Remover sufixos do WhatsApp e caracteres não-numéricos
  let cleaned = String(contactId)
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

/**
 * Gera ID único para lock
 */
function generateLockId() {
  return `lock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Cleanup automático a cada 30 segundos
setInterval(cleanupExpiredLocks, 30 * 1000);

export default {
  acquireContactLock,
  releaseContactLock,
  withContactLock,
  isContactLocked,
  getLockStats,
  cleanupExpiredLocks
};
