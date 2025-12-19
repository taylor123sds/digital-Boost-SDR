# Cutover to Staging/Queue (Legacy Usage)

## In-memory queue/lock usage (needs replacement)

| FILE | LINE | SNIPPET |
|---|---:|---|
| src/api/routes/webhook.routes.js | 7 | *  MessageQueue singleton (fix bug crítico) |
| src/api/routes/webhook.routes.js | 11 | *  EarlyDeduplicator (FASE 1 - previne duplicatas antes de enfileirar) |
| src/api/routes/webhook.routes.js | 12 | *  ContactLockManager (FASE 3 - lock distribuído por contato) |
| src/api/routes/webhook.routes.js | 17 | import { getMessageQueue } from '../../utils/message-queue.js'; |
| src/api/routes/webhook.routes.js | 18 | import { getEarlyDeduplicator } from '../../utils/EarlyDeduplicator.js'; |
| src/api/routes/webhook.routes.js | 19 | import { getContactLockManager } from '../../utils/ContactLockManager.js'; |
| src/api/routes/webhook.routes.js | 33 | //  P0.2: AsyncJobsService for persistent job queue (replace in-memory MessageQueue) |
| src/api/routes/webhook.routes.js | 40 | const messageQueue = getMessageQueue(); |
| src/api/routes/webhook.routes.js | 41 | const earlyDedup = getEarlyDeduplicator(); |
| src/api/routes/webhook.routes.js | 42 | const contactLock = getContactLockManager(); |
| src/api/routes/webhook.routes.js | 54 | * 1. EarlyDeduplicator - rejeita duplicatas ANTES de enfileirar |
| src/api/routes/webhook.routes.js | 55 | * 2. ContactLockManager - garante processamento sequencial por contato |
| src/api/routes/webhook.routes.js | 56 | * 3. MessageQueue - processamento ordenado |
| src/api/routes/webhook.routes.js | 155 | // GATE 3: PERSISTENT JOB QUEUE (P0.2 - replaces in-memory MessageQueue) |
| src/handlers/webhook_handler.js | 32 | // P0-1: Deduplicação removida daqui - agora consolidada em EarlyDeduplicator (GATE 1) |
| src/handlers/webhook_handler.js | 33 | // EarlyDeduplicator é mais robusto: TTL, content hash, memory limits |
| src/handlers/webhook_handler.js | 45 | // P0-1: duplicates removido - agora tracking via EarlyDeduplicator |
| src/handlers/webhook_handler.js | 100 | // P0-1: Deduplicação removida - agora consolidada em EarlyDeduplicator (GATE 1) |
| src/handlers/webhook_handler.js | 509 | // Deduplicação agora consolidada em EarlyDeduplicator (src/utils/EarlyDeduplicator.js) |
| src/handlers/webhook_handler.js | 601 | * P0-1: duplicateCount removido - agora via EarlyDeduplicator.getStats() |
| src/handlers/webhook_handler.js | 608 | // Para stats de deduplicação, usar: getEarlyDeduplicator().getStats() |
| src/services/AsyncJobsService.js | 6 | * 1. Substituir filas em memória (MessageQueue, ContactLockManager) |
| src/services/ServiceLocator.js | 108 | const { getEarlyDeduplicator } = await import('../utils/EarlyDeduplicator.js'); |
| src/services/ServiceLocator.js | 109 | return getEarlyDeduplicator(); |
| src/utils/ContactLockManager.js | 2 | * @file ContactLockManager.js |
| src/utils/ContactLockManager.js | 41 | class ContactLockManager { |
| src/utils/ContactLockManager.js | 69 | console.log(' [LOCK] ContactLockManager inicializado'); |
| src/utils/ContactLockManager.js | 403 | export function getContactLockManager() { |
| src/utils/ContactLockManager.js | 405 | instance = new ContactLockManager(); |
| src/utils/ContactLockManager.js | 410 | export default ContactLockManager; |
| src/utils/EarlyDeduplicator.js | 2 | * @file EarlyDeduplicator.js |
| src/utils/EarlyDeduplicator.js | 43 | class EarlyDeduplicator { |
| src/utils/EarlyDeduplicator.js | 65 | log.info(' [DEDUP] EarlyDeduplicator inicializado'); |
| src/utils/EarlyDeduplicator.js | 454 | export function getEarlyDeduplicator() { |
| src/utils/EarlyDeduplicator.js | 456 | instance = new EarlyDeduplicator(); |
| src/utils/EarlyDeduplicator.js | 461 | export default EarlyDeduplicator; |
| src/utils/message-queue.js | 11 | export class MessageQueue { |
| src/utils/message-queue.js | 79 | * Get or create singleton instance of MessageQueue |
| src/utils/message-queue.js | 80 | * @returns {MessageQueue} Singleton instance |
| src/utils/message-queue.js | 82 | export function getMessageQueue() { |
| src/utils/message-queue.js | 84 | queueInstance = new MessageQueue(); |

## Recommended replacement

- Stage inbound in `inbound_events` (`src/services/InboundEventsService.js:51`)
- Enqueue jobs in `async_jobs` (`src/services/AsyncJobsService.js:73`)
- Worker consumes `async_jobs` and calls processors (not wired in current path).
