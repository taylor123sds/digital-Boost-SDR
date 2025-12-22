# Frontend → Backend contract matrix

| Frontend | Method | FE path | Base URL assumption | Full path | Backend match | Backend refs | FE source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| web-vite | GET | /funil/stats | (import.meta.env.VITE_API_URL || '/api') | /api/funil/stats | OK | src/api/routes/funil.routes.js:172 | apps/web-vite/src/lib/api.ts:177 |
| web-vite | GET | /command-center/overview | (import.meta.env.VITE_API_URL || '/api') | /api/command-center/overview | OK | src/api/routes/command-center.routes.js:34 | apps/web-vite/src/lib/api.ts:178 |
| web-vite | GET | /agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web-vite/src/lib/api.ts:210 |
| web-vite | GET | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:199, src/api/routes/agents.routes.js:210 | apps/web-vite/src/lib/api.ts:219 |
| web-vite | POST | /agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:240 | apps/web-vite/src/lib/api.ts:248 |
| web-vite | PUT | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:275 | apps/web-vite/src/lib/api.ts:253 |
| web-vite | DELETE | /agents/:param | (import.meta.env.VITE_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:299 | apps/web-vite/src/lib/api.ts:258 |
| web-vite | GET | /funil/bant | (import.meta.env.VITE_API_URL || '/api') | /api/funil/bant | OK | src/api/routes/funil.routes.js:31 | apps/web-vite/src/lib/api.ts:264 |
| web-vite | GET | /funil/bant/:param | (import.meta.env.VITE_API_URL || '/api') | /api/funil/bant/:param | OK | src/api/routes/funil.routes.js:209 | apps/web-vite/src/lib/api.ts:303 |
| web-vite | POST | /leads/update-stage | (import.meta.env.VITE_API_URL || '/api') | /api/leads/update-stage | OK | src/api/routes/whatsapp.routes.js:306, src/api/routes/funil.routes.js:240 | apps/web-vite/src/lib/api.ts:317 |
| web-vite | GET | /campaigns | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web-vite/src/lib/api.ts:326 |
| web-vite | GET | /campaigns/:param | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns/:param | MISSING |  | apps/web-vite/src/lib/api.ts:330 |
| web-vite | POST | /campaigns | (import.meta.env.VITE_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web-vite/src/lib/api.ts:334 |
| web-vite | GET | /forecasting/velocity | (import.meta.env.VITE_API_URL || '/api') | /api/forecasting/velocity | OK | src/api/routes/forecasting.routes.js:174 | apps/web-vite/src/lib/api.ts:341 |
| web-vite | GET | /forecasting/monthly | (import.meta.env.VITE_API_URL || '/api') | /api/forecasting/monthly | OK | src/api/routes/forecasting.routes.js:422 | apps/web-vite/src/lib/api.ts:342 |
| web-vite | GET | /command-center/activity-feed | (import.meta.env.VITE_API_URL || '/api') | /api/command-center/activity-feed | OK | src/api/routes/command-center.routes.js:279 | apps/web-vite/src/lib/api.ts:372 |
| web-vite | POST | /whatsapp/send | (import.meta.env.VITE_API_URL || '/api') | /api/whatsapp/send | OK | src/api/routes/whatsapp.routes.js:20 | apps/web-vite/src/lib/api.ts:393 |
| web-vite | GET | /funil | (import.meta.env.VITE_API_URL || '/api') | /api/funil | MISSING |  | apps/web-vite/src/lib/api.ts:405 |
| web-vite | GET | /cadences | (import.meta.env.VITE_API_URL || '/api') | /api/cadences | OK | src/api/routes/cadence.routes.js:36 | apps/web-vite/src/lib/api.ts:410 |
| web-vite | GET | /cadences/stats | (import.meta.env.VITE_API_URL || '/api') | /api/cadences/stats | OK | src/api/routes/cadence.routes.js:64, src/api/routes/cadence.routes.js:220 | apps/web-vite/src/lib/api.ts:414 |
| web-vite | GET | /prospecting/stats | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/stats | MISSING |  | apps/web-vite/src/lib/api.ts:419 |
| web-vite | GET | /prospecting/leads | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/leads | MISSING |  | apps/web-vite/src/lib/api.ts:423 |
| web-vite | POST | /prospecting/start | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/start | OK | src/api/routes/prospecting.routes.js:49 | apps/web-vite/src/lib/api.ts:427 |
| web-vite | POST | /prospecting/stop | (import.meta.env.VITE_API_URL || '/api') | /api/prospecting/stop | OK | src/api/routes/prospecting.routes.js:85 | apps/web-vite/src/lib/api.ts:431 |
| web-vite | GET | /integrations | (import.meta.env.VITE_API_URL || '/api') | /api/integrations | OK | src/api/routes/channels.routes.js:230 | apps/web-vite/src/lib/api.ts:436 |
| web-vite | GET | /integrations/:param/test | (import.meta.env.VITE_API_URL || '/api') | /api/integrations/:param/test | OK | src/api/routes/crm-integration.routes.js:494 | apps/web-vite/src/lib/api.ts:463 |
| web-vite | GET | /api/agents | (import.meta.env.VITE_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web-vite/src/pages/AgentNew.tsx:348 |
| web-vite | GET | /api/auth/entitlements | (import.meta.env.VITE_API_URL || '/api') | /api/auth/entitlements | OK | src/api/routes/auth.routes.js:529 | apps/web-vite/src/pages/Billing.tsx:138 |
| web-vite | GET | /api/whatsapp/send | (import.meta.env.VITE_API_URL || '/api') | /api/whatsapp/send | MISSING |  | apps/web-vite/src/pages/Inbox.tsx:159 |
| web | POST | /auth/login | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/auth/login | OK | src/api/routes/auth.routes.js:300 | apps/web/src/lib/api.ts:56 |
| web | POST | /auth/register | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/auth/register | OK | src/api/routes/auth.routes.js:109 | apps/web/src/lib/api.ts:63 |
| web | GET | /dashboard/stats | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/dashboard/stats | MISSING |  | apps/web/src/lib/api.ts:71 |
| web | GET | /agents | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:176 | apps/web/src/lib/api.ts:76 |
| web | GET | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:199, src/api/routes/agents.routes.js:210 | apps/web/src/lib/api.ts:80 |
| web | POST | /agents | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents | OK | src/api/routes/agents.routes.js:240 | apps/web/src/lib/api.ts:84 |
| web | PUT | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:275 | apps/web/src/lib/api.ts:88 |
| web | DELETE | /agents/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/agents/:param | OK | src/api/routes/agents.routes.js:299 | apps/web/src/lib/api.ts:92 |
| web | GET | /leads?:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads?:param | MISSING |  | apps/web/src/lib/api.ts:98 |
| web | GET | /leads/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads/:param | MISSING |  | apps/web/src/lib/api.ts:102 |
| web | PUT | /leads/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/leads/:param | MISSING |  | apps/web/src/lib/api.ts:106 |
| web | GET | /campaigns | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web/src/lib/api.ts:111 |
| web | GET | /campaigns/:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns/:param | MISSING |  | apps/web/src/lib/api.ts:115 |
| web | POST | /campaigns | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/campaigns | MISSING |  | apps/web/src/lib/api.ts:119 |
| web | GET | /analytics?period=:param | (process.env.NEXT_PUBLIC_API_URL || '/api') | /api/analytics?period=:param | MISSING |  | apps/web/src/lib/api.ts:124 |