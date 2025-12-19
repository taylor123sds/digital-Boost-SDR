# ETAPA 2 — Webhook / Pipeline

## 1) Entry points (dois caminhos ativos)

- Legacy Evolution webhook: `POST /api/webhook/evolution` em `src/api/routes/webhook.routes.js`. Este caminho tem gates de dedup, lock por contato e enfileiramento persistente (async_jobs). Evidencia: `src/api/routes/webhook.routes.js:58-196`.
- Multi-tenant inbound webhook: `POST /api/webhooks/inbound/:webhookPublicId` em `src/api/routes/webhooks-inbound.routes.js`. Valida secret via `IntegrationService.validateWebhook`. Evidencia: `src/api/routes/webhooks-inbound.routes.js:20-89` e `src/services/IntegrationService.js:586-654`.

## 2) Pipeline inbound (o que esta implementado)

- Staging persistente de webhooks: `inbound_events` com idempotencia por (provider, provider_event_id). Evidencia: `src/db/migrations/031_inbound_events.sql`.
- Job queue persistente: `async_jobs` (enqueue/dequeue/lock per contact). Evidencia: `src/services/AsyncJobsService.js:73-174` e `src/db/migrations/032_async_jobs.sql`.
- O webhook legacy usa staging + async_jobs, mas ainda inclui EarlyDeduplicator e ContactLockManager (memoria). Evidencia: `src/api/routes/webhook.routes.js:70-196`.

## 3) Pontos onde o fluxo e interrompido

- No multi-tenant webhook, eventos `MESSAGES_UPSERT` nao sao encaminhados para o pipeline principal (apenas log). Evidencia: `src/api/routes/webhooks-inbound.routes.js:154-162`.
- Como resultado, se o Evolution estiver configurado para chamar o endpoint multi-tenant, mensagens podem nao virar inbound_event/job.

## 4) Riscos observados

- Duplo fluxo de webhook (legacy vs multi-tenant) pode deixar mensagens fora do pipeline canônico se a integracao estiver apontando para o endpoint errado. Evidencia: `src/api/routes/index.js:61-103`.
- Apesar do staging, ainda ha locks/queues em memoria no webhook legacy, com fallback para processamento imediato quando enqueue falha. Evidencia: `src/api/routes/webhook.routes.js:134-196`.

## 5) Melhorias sugeridas (nao implementadas)

- Definir um unico endpoint canônico para Evolution (ou via `webhookPublicId` ou via /api/webhook/evolution) e eliminar o segundo.
- Fazer `MESSAGES_UPSERT` chamar o mesmo pipeline (staging + job) usado no legacy.
- Remover locks em memoria quando async_jobs estiver 100% estabilizado.
