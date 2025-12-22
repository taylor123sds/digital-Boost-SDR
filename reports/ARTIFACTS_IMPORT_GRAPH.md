# Import graph (heuristic, relative imports only)

## Top files by total degree
- src/db/index.js (in: 58, out: 0, total: 58)
- src/api/routes/index.js (in: 1, out: 41, total: 42)
- src/utils/logger-wrapper.js (in: 34, out: 1, total: 35)
- src/utils/errors/index.js (in: 29, out: 0, total: 29)
- src/config/di-container.js (in: 3, out: 25, total: 28)
- src/db/connection.js (in: 23, out: 3, total: 26)
- src/utils/tenantCompat.js (in: 26, out: 0, total: 26)
- src/memory.js (in: 21, out: 2, total: 23)
- src/services/ServiceLocator.js (in: 1, out: 21, total: 22)
- src/api/routes/webhook.routes.js (in: 2, out: 19, total: 21)
- src/server.js (in: 1, out: 19, total: 20)
- src/tools/whatsapp.js (in: 15, out: 5, total: 20)
- src/automation/ProspectingEngine.js (in: 4, out: 14, total: 18)
- src/intelligence/IntelligenceOrchestrator.js (in: 4, out: 14, total: 18)
- src/middleware/auth.middleware.js (in: 15, out: 2, total: 17)
- src/handlers/webhook_handler.js (in: 5, out: 11, total: 16)
- apps/web-vite/src/App.tsx (in: 1, out: 15, total: 16)
- src/utils/logger.enhanced.js (in: 14, out: 1, total: 15)
- apps/web-vite/src/lib/utils (in: 15, out: 0, total: 15)
- src/automation/CadenceEngine.js (in: 6, out: 8, total: 14)
- apps/web-vite/src/components/ui/Button (in: 14, out: 0, total: 14)
- src/agents/agent_hub.js (in: 1, out: 12, total: 13)
- src/repositories/lead.repository.js (in: 10, out: 3, total: 13)
- apps/web-vite/src/components/ui/Card (in: 13, out: 0, total: 13)
- src/utils/phone_normalizer.js (in: 12, out: 0, total: 12)
- apps/web-vite/src/components/layout/TopBar (in: 12, out: 0, total: 12)
- src/agents/sdr_agent.js (in: 1, out: 10, total: 11)
- src/api/routes/analytics.routes.js (in: 1, out: 10, total: 11)
- src/security/SimpleBotDetector.js (in: 7, out: 4, total: 11)
- src/services/EntitlementService.js (in: 8, out: 3, total: 11)

## Detected cycles (heuristic)
- Cycle 1: src/security/SimpleBotDetector.js -> src/automation/CadenceEngine.js -> src/security/SimpleBotDetector.js -> src/security/SimpleBotDetector.js
- Cycle 2: src/api/routes/health.routes.js -> src/server.js -> src/api/routes/index.js -> src/api/routes/health.routes.js -> src/api/routes/health.routes.js
- Cycle 3: src/config/retry.config.js -> src/utils/retry.js -> src/config/retry.config.js -> src/config/retry.config.js
- Cycle 4: src/config/retry.config.js -> src/config/retry.config.js -> src/config/retry.config.js
- Cycle 5: src/v2/infrastructure/database/DatabaseConnection.js -> src/v2/infrastructure/database/DatabaseConnection.js -> src/v2/infrastructure/database/DatabaseConnection.js