# Import Graph (Backend + Frontend)

- Nodes: 411
- Edges: 840

## Folder-to-Folder Import Edges (Top 30)

- src -> src: 745
- apps -> apps: 95

## Cycles (Static Import Analysis)

1. src/security/SimpleBotDetector.js -> src/automation/CadenceEngine.js
2. src/api/routes/health.routes.js -> src/server.js -> src/api/routes/index.js
3. src/config/retry.config.js -> src/utils/retry.js

## Top 20 Central Files (In+Out Degree)

| Rank | File | In | Out | Total |
|---:|---|---:|---:|---:|
| 1 | src/db/index.js | 53 | 0 | 53 |
| 2 | src/api/routes/index.js | 1 | 41 | 42 |
| 3 | src/utils/logger-wrapper.js | 34 | 1 | 35 |
| 4 | src/utils/errors/index.js | 29 | 0 | 29 |
| 5 | src/config/di-container.js | 3 | 25 | 28 |
| 6 | src/db/connection.js | 22 | 3 | 25 |
| 7 | src/api/routes/webhook.routes.js | 1 | 21 | 22 |
| 8 | src/memory.js | 21 | 1 | 22 |
| 9 | src/services/ServiceLocator.js | 1 | 21 | 22 |
| 10 | src/tools/whatsapp.js | 14 | 5 | 19 |
| 11 | src/intelligence/IntelligenceOrchestrator.js | 4 | 14 | 18 |
| 12 | src/automation/ProspectingEngine.js | 4 | 13 | 17 |
| 13 | apps/web-vite/src/App.tsx | 1 | 15 | 16 |
| 14 | src/server.js | 1 | 14 | 15 |
| 15 | apps/web-vite/src/components/ui/Button.tsx | 14 | 1 | 15 |
| 16 | apps/web-vite/src/lib/utils.ts | 15 | 0 | 15 |
| 17 | src/automation/CadenceEngine.js | 6 | 8 | 14 |
| 18 | src/handlers/webhook_handler.js | 3 | 11 | 14 |
| 19 | src/middleware/auth.middleware.js | 13 | 1 | 14 |
| 20 | src/utils/logger.enhanced.js | 13 | 1 | 14 |

## Potential God Files (Top 10 by Degree)

- 1. src/db/index.js (degree=53)
- 2. src/api/routes/index.js (degree=42)
- 3. src/utils/logger-wrapper.js (degree=35)
- 4. src/utils/errors/index.js (degree=29)
- 5. src/config/di-container.js (degree=28)
- 6. src/db/connection.js (degree=25)
- 7. src/api/routes/webhook.routes.js (degree=22)
- 8. src/memory.js (degree=22)
- 9. src/services/ServiceLocator.js (degree=22)
- 10. src/tools/whatsapp.js (degree=19)
