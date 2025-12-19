# Runtime Data Flow Maps

## Flow 1: Inbound webhook → staging → job queue → worker → messages/conversations

```mermaid
sequenceDiagram
  participant Evolution as Evolution API
  participant Webhook as /api/webhook/evolution
  participant Dedup as EarlyDeduplicator
  participant Lock as ContactLockManager
  participant Queue as MessageQueue
  participant Handler as WebhookHandler
  participant Pipeline as MessagePipeline
  participant Coordinator as UnifiedMessageCoordinator
  participant DB as SQLite

  Evolution->>Webhook: POST webhook payload
  Webhook-->>Evolution: 200 OK (immediate)
  Webhook->>Dedup: check()
  Dedup-->>Webhook: allow/duplicate
  Webhook->>Lock: tryAcquire(contactId)
  Lock-->>Webhook: lock/queue
  Webhook->>Queue: enqueue(payload)
  Queue->>Handler: handleWebhook()
  Handler->>Pipeline: process(message, context)
  Pipeline-->>Handler: status/responseToSend
  Handler-->>Coordinator: sendResponse()
  Coordinator->>DB: persist inbound/outbound
```

**Who calls who (active path)**
- `src/api/routes/webhook.routes.js:50` → `processWebhook()` → `src/handlers/webhook_handler.js:56`
- `src/handlers/webhook_handler.js:117` → `src/middleware/MessagePipeline.js`
- `src/handlers/webhook_handler.js:166` → `src/handlers/UnifiedMessageCoordinator.js`
- `src/handlers/UnifiedMessageCoordinator.js:204` → `src/tools/whatsapp.js` / `src/messaging/MediaSender.js` (Evolution API send)

**Staging/queue components (exist, not wired in this path)**
- `src/services/InboundEventsService.js:51` stages into `inbound_events`
- `src/services/AsyncJobsService.js:73` enqueues into `async_jobs`
- Migrations: `src/db/migrations/031_inbound_events.sql:20`, `src/db/migrations/032_async_jobs.sql:21`

**Alternate inbound path (multi-tenant)**
- `src/api/routes/webhooks-inbound.routes.js:20` validates secret and routes by provider.
- Note: Evolution `MESSAGES_UPSERT` currently does not forward into the main pipeline.
  Evidence: `src/api/routes/webhooks-inbound.routes.js:154`.

---

## Flow 2: Outbound message → provider send → status update

```mermaid
sequenceDiagram
  participant Agent as Agent/Coordinator
  participant Dedup as OutboundDeduplicator
  participant Provider as Evolution API
  participant DB as SQLite

  Agent->>Dedup: check(message)
  Dedup-->>Agent: allow/block
  Agent->>Provider: /message/sendText or /sendMedia
  Provider-->>Agent: API response
  Agent->>DB: store outbound + delivery status
```

**Who calls who (primary path)**
- `src/handlers/UnifiedMessageCoordinator.js:204` → `_sendWithRetry()` → `src/tools/whatsapp.js:157`
- `src/tools/whatsapp.js:235` → Evolution API `/message/sendText/{instance}`
- `src/handlers/UnifiedMessageCoordinator.js:204` → `simpleBotDetector.recordOutgoingMessage()`

**Alternate path (adapter)**
- `src/infrastructure/adapters/WhatsAppAdapter.js:40` sends to Evolution API via axios.

**Delivery tracking**
- `src/services/DeliveryTrackingService.js:92` handles delivery updates from webhook.

---

## Flow 3: Auth (register/login/refresh/logout) → tenant resolution → route guard

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as /api/auth/*
  participant AuthSvc as AuthService
  participant DB as SQLite

  UI->>API: POST /api/auth/register|login
  API->>AuthSvc: validate, create user, issue tokens
  AuthSvc->>DB: users, teams, sessions
  API-->>UI: accessToken + refreshToken
  UI->>API: requests with Authorization Bearer
  API->>Middleware: authenticate() sets req.user + req.tenantId
  API->>Routes: enforce tenant
```

**Who calls who**
- `src/api/routes/auth.routes.js` → `src/services/AuthService.js`
- `src/middleware/auth.middleware.js:21` sets `req.tenantId` from JWT
- `src/middleware/tenant.middleware.js:18` sets `req.tenantId` for routes that use it

