# Evolution Inbound Call Graph (Static)

## Public inbound route

- Route: `POST /api/webhooks/inbound/:webhookPublicId` (`src/api/routes/webhooks-inbound.routes.js:20`)
- Evolution branch: `processEvolutionWebhook()` (`src/api/routes/webhooks-inbound.routes.js:96`)

## Event types in public inbound

| EVENT_TYPE | LINE | BEHAVIOR |
|---|---:|---|
| evolution | 61 | unknown |
| kommo | 65 | unknown |
| hubspot | 66 | unknown |
| pipedrive | 67 | unknown |
| QRCODE_UPDATED | 102 | unknown |
| CONNECTION_UPDATE | 107 | updates integration |
| MESSAGES_UPSERT | 154 | unknown |

## Core webhook route (active pipeline)

- Route: `POST /api/webhook/evolution` (`src/api/routes/webhook.routes.js:50`)
- Pipeline: `processWebhook()` → `webhookHandler.handleWebhook()` (`src/handlers/webhook_handler.js:56`)
