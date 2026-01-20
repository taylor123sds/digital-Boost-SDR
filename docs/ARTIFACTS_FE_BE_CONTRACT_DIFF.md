# FE ↔ BE Contract Diff (404 Killers)

| FRONTEND_CALL | FILE | MATCH | BACKEND_ROUTE_MATCH |
|---|---|---|---|
| /api/agents/evolution/qrcode | apps/web-vite/src/pages/AgentDetail.tsx | none | - |
| /api/agents | apps/web-vite/src/pages/AgentNew.tsx | none | - |
| /api/audit/export | apps/web-vite/src/pages/AuditLog.tsx | none | - |
| /api/billing/subscription | apps/web-vite/src/pages/Billing.tsx | none | - |
| /api/billing/usage | apps/web-vite/src/pages/Billing.tsx | none | - |
| /api/billing/invoices | apps/web-vite/src/pages/Billing.tsx | none | - |
| /api/auth/entitlements | apps/web-vite/src/pages/Billing.tsx | none | - |
| /api/billing/upgrade | apps/web-vite/src/pages/Billing.tsx | none | - |
| /api/conversations | apps/web-vite/src/pages/Inbox.tsx | none | - |
| /api/messages/send | apps/web-vite/src/pages/Inbox.tsx | none | - |
| /api/integrations | apps/web-vite/src/pages/Integrations.tsx | none | - |
| /api/whatsapp/status | apps/web-vite/src/pages/Integrations.tsx | none | - |
| /api/agents/default/channels/evolution/connect | apps/web-vite/src/pages/Integrations.tsx | none | - |

## Top 20 Gaps by Impact

- /api/agents/evolution/qrcode (apps/web-vite/src/pages/AgentDetail.tsx)
- /api/agents (apps/web-vite/src/pages/AgentNew.tsx)
- /api/integrations (apps/web-vite/src/pages/Integrations.tsx)
- /api/agents/default/channels/evolution/connect (apps/web-vite/src/pages/Integrations.tsx)
- /api/auth/entitlements (apps/web-vite/src/pages/Billing.tsx)
- /api/conversations (apps/web-vite/src/pages/Inbox.tsx)
- /api/messages/send (apps/web-vite/src/pages/Inbox.tsx)
- /api/whatsapp/status (apps/web-vite/src/pages/Integrations.tsx)
- /api/billing/subscription (apps/web-vite/src/pages/Billing.tsx)
- /api/billing/usage (apps/web-vite/src/pages/Billing.tsx)
- /api/billing/invoices (apps/web-vite/src/pages/Billing.tsx)
- /api/billing/upgrade (apps/web-vite/src/pages/Billing.tsx)
- /api/audit/export (apps/web-vite/src/pages/AuditLog.tsx)
