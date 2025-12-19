/**
 * @file queue/index.js
 * @description Factory e exports do módulo de filas
 *
 * Provê abstração para usar BullMQ (produção) ou Memory (dev)
 */

import { MemoryQueueProvider } from './MemoryQueueProvider.js';

// Filas singleton por nome
const queues = new Map();

/**
 * Tipos de filas disponíveis no sistema
 */
export const QueueNames = {
  // Filas de mensagens
  MESSAGES_INBOUND: 'messages:inbound',
  MESSAGES_OUTBOUND: 'messages:outbound',
  MESSAGES_DELAYED: 'messages:delayed',

  // Filas de processamento
  PROCESS_WEBHOOK: 'process:webhook',
  PROCESS_AI: 'process:ai',
  PROCESS_LEADS: 'process:leads',

  // Filas de notificação
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',

  // Filas de manutenção
  CLEANUP: 'cleanup',
  ANALYTICS: 'analytics',
  SYNC: 'sync'
};

/**
 * Cria ou retorna uma fila
 * @param {string} name - Nome da fila
 * @param {Object} opts - Opções
 * @returns {IQueueProvider}
 */
export function getQueue(name, opts = {}) {
  // Verificar se já existe
  if (queues.has(name)) {
    return queues.get(name);
  }

  // Criar nova fila
  const queue = createQueueProvider(name, opts);
  queues.set(name, queue);

  return queue;
}

/**
 * Cria um provedor de fila baseado no ambiente
 * @param {string} name
 * @param {Object} opts
 * @returns {IQueueProvider}
 */
export function createQueueProvider(name, opts = {}) {
  const useRedis = process.env.USE_REDIS === 'true' ||
                   process.env.REDIS_URL ||
                   opts.forceRedis;

  if (useRedis) {
    // Importação dinâmica para não exigir bullmq quando não usado
    return createBullMQProvider(name, opts);
  }

  return new MemoryQueueProvider(name, opts);
}

/**
 * Cria provedor BullMQ
 * @param {string} name
 * @param {Object} opts
 */
async function createBullMQProvider(name, opts) {
  try {
    const { BullMQProvider } = await import('./BullMQProvider.js');
    return new BullMQProvider(name, opts);
  } catch (error) {
    console.warn('[Queue] BullMQ não disponível, usando Memory:', error.message);
    return new MemoryQueueProvider(name, opts);
  }
}

/**
 * Obtém todas as filas ativas
 * @returns {Map<string, IQueueProvider>}
 */
export function getAllQueues() {
  return queues;
}

/**
 * Fecha uma fila específica
 * @param {string} name
 */
export async function closeQueue(name) {
  const queue = queues.get(name);
  if (queue) {
    await queue.close();
    queues.delete(name);
  }
}

/**
 * Fecha todas as filas
 */
export async function closeAllQueues() {
  const closePromises = [];

  for (const [name, queue] of queues) {
    closePromises.push(
      queue.close()
        .then(() => queues.delete(name))
        .catch(err => console.error(`[Queue] Erro ao fechar ${name}:`, err))
    );
  }

  await Promise.all(closePromises);
}

/**
 * Obtém estatísticas de todas as filas
 * @returns {Promise<Object>}
 */
export async function getAllQueueStats() {
  const stats = {};

  for (const [name, queue] of queues) {
    try {
      stats[name] = await queue.getStats();
    } catch (error) {
      stats[name] = { error: error.message };
    }
  }

  return stats;
}

// ==================== FILAS PRÉ-CONFIGURADAS ====================

/**
 * Obtém fila de mensagens de entrada
 */
export function getInboundQueue(opts = {}) {
  return getQueue(QueueNames.MESSAGES_INBOUND, {
    concurrency: 10,
    ...opts
  });
}

/**
 * Obtém fila de mensagens de saída
 */
export function getOutboundQueue(opts = {}) {
  return getQueue(QueueNames.MESSAGES_OUTBOUND, {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    },
    ...opts
  });
}

/**
 * Obtém fila de processamento de webhooks
 */
export function getWebhookQueue(opts = {}) {
  return getQueue(QueueNames.PROCESS_WEBHOOK, {
    concurrency: 20,
    ...opts
  });
}

/**
 * Obtém fila de processamento de IA
 */
export function getAIQueue(opts = {}) {
  return getQueue(QueueNames.PROCESS_AI, {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 2,
      timeout: 30000
    },
    ...opts
  });
}

/**
 * Obtém fila de processamento de leads
 */
export function getLeadsQueue(opts = {}) {
  return getQueue(QueueNames.PROCESS_LEADS, {
    concurrency: 10,
    ...opts
  });
}

/**
 * Obtém fila de notificações
 */
export function getNotificationsQueue(opts = {}) {
  return getQueue(QueueNames.NOTIFICATIONS, {
    concurrency: 20,
    ...opts
  });
}

// ==================== EXPORTS ====================

export { MemoryQueueProvider } from './MemoryQueueProvider.js';

// Export condicional do BullMQ
export async function getBullMQProvider() {
  try {
    const { BullMQProvider } = await import('./BullMQProvider.js');
    return BullMQProvider;
  } catch {
    return null;
  }
}

export default {
  QueueNames,
  getQueue,
  createQueueProvider,
  getAllQueues,
  closeQueue,
  closeAllQueues,
  getAllQueueStats,
  getInboundQueue,
  getOutboundQueue,
  getWebhookQueue,
  getAIQueue,
  getLeadsQueue,
  getNotificationsQueue,
  MemoryQueueProvider,
  getBullMQProvider
};
