# ARCHITECTURE_DECISIONS.md

> Decisoes canonicas do projeto LEADLY/ORBION. Este documento e a fonte de verdade.

## Decisoes Canonicas

| Aspecto | Decisao Canonica | Justificativa |
|---------|------------------|---------------|
| **Frontend** | `apps/web-vite/` | React 19 + Vite, 6k+ linhas, 14 paginas completas, build otimizado |
| **Inbound WhatsApp** | `/api/webhooks/inbound/:webhookPublicId` | Multi-tenant, validacao de secret, suporte a multiplos providers |
| **Migrations** | `src/db/migrations/` + `src/db/migrate.js` | 38 migrations, tracking via `_migrations`, executa no boot |
| **Deploy** | Sem tag/commit = sem deploy | Imagem versionada por commit SHA, BUILD_INFO.json obrigatorio |
| **Tenant ID** | `tenant_id` (NOT `team_id`) | Padrao unico, team_id e alias interno |

## Paths Deprecados (NAO USAR)

| Path Deprecado | Substituir Por |
|----------------|----------------|
| `apps/web/` (Next.js) | `apps/web-vite/` |
| `/api/webhook/evolution` | `/api/webhooks/inbound/:webhookPublicId` |
| `src/platform/database/migrations/` | `src/db/migrations/` |
| `public/dashboard-pro.html` | `apps/web-vite/dist/` servido em `/app` |

## Regras de Deploy

1. **Imagem Docker**: Tag = `orbion-leadly:<commit-sha-7-chars>`
2. **BUILD_INFO.json**: Gerado automaticamente com commit, branch, timestamp
3. **Migrations**: Executam no boot ANTES de inicializar servicos
4. **Rollback**: Manter imagem anterior, script de rollback disponivel
5. **Health Check**: `/api/health` deve retornar 200 antes de considerar deploy completo

## Database

- **Path unico**: `DATABASE_PATH` ou `./data/orbion.db`
- **Tracking**: Tabela `_migrations` obrigatoria
- **Boot fail**: Se `_migrations` nao existir ou tabelas criticas faltarem, processo termina com exit 1

## Criterios de Aceite

Para considerar este documento aplicado:

- [x] `docker-compose.yml` usa imagem versionada (nao `latest`) - `orbion-leadly:${GIT_COMMIT:-local}`
- [x] Todas novas integracoes Evolution usam `/api/webhooks/inbound/:webhookPublicId`
- [x] Legacy endpoint `/api/webhook/evolution` retorna 410 Gone
- [x] Frontend canonico e `apps/web-vite/` (Next.js em apps/web/ DEPRECATED)
- [x] Migrations rodam no boot com validacao de tabelas criticas - `migrate.js` com `validateCriticalTables()`
- [x] Deploy script gera BUILD_INFO.json com commit SHA - `Dockerfile` com ARG e JSON
- [x] docker-compose.scale.yml para horizontal scaling (API + Worker separados)
- [x] OpenAPI manifest criado (`openapi.json`)
- [x] tenant_id e nome canonico em todo o codigo

## Fase 1 - Deploy Deterministico (IMPLEMENTADO)

| Item | Status | Arquivo |
|------|--------|---------|
| Imagem versionada por commit | OK | `docker-compose.yml:116` |
| BUILD_INFO.json no container | OK | `Dockerfile:38` |
| DATABASE_PATH unico | OK | `docker-compose.yml:145` |
| Migrations no boot | OK | `server.js:147-158` |
| Tabela _migrations obrigatoria | OK | `migrate.js:182-189` |
| Smoke check tabelas criticas | OK | `migrate.js:131-152` |
| Endpoint /api/version | OK | `version.routes.js` |

## Fase 2 - Canonical Inbound Pipeline (IMPLEMENTADO)

Fluxo canonico: `Webhook → inbound_events → async_jobs → Worker → WebhookHandler`

| Item | Status | Arquivo |
|------|--------|---------|
| Rota canonica multi-tenant | OK | `webhooks-inbound.routes.js` |
| InboundEventsService (staging) | OK | `services/InboundEventsService.js` |
| AsyncJobsService (job queue) | OK | `services/AsyncJobsService.js` |
| Worker process (job processor) | OK | `worker.js:201-254` |
| processMessageJob export | OK | `handlers/webhook_handler.js:632-670` |
| Deprecation notice rota antiga | OK | `webhook.routes.js:1-35, 85-96` |

### Fluxo Canonico (P0-3)

```
1. POST /api/webhooks/inbound/:webhookPublicId
   ├── Validate webhook secret
   ├── Get tenant_id from integration
   └── processEvolutionWebhook()

2. processEvolutionWebhook()
   ├── inboundEvents.stageWebhook() → inbound_events (idempotency)
   ├── inboundEvents.markProcessing()
   └── asyncJobs.enqueue(MESSAGE_PROCESS) → async_jobs

3. Worker (src/worker.js)
   ├── asyncJobsService.startProcessor()
   ├── dequeue() → claim job with lock
   ├── processMessageJob() → webhook_handler.js
   └── complete() or fail() with retry
```

### Tabelas Envolvidas

- `inbound_events`: Staging de webhooks (idempotencia via UNIQUE provider+provider_event_id)
- `async_jobs`: Fila persistente (sobrevive restart, retry automatico)
- `integrations`: Configuracao de integracao (webhook_secret, instance_name)

### Hard Cutover da Rota Antiga (COMPLETADO)

A rota `/api/webhook/evolution` agora retorna **410 Gone** (não apenas warning).

Chamadores devem migrar para a rota canônica:

```
OLD: POST /api/webhook/evolution
NEW: POST /api/webhooks/inbound/:webhookPublicId
```

Para migrar:
1. Criar integração via `POST /api/integrations`
2. Usar o `webhook_public_id` retornado como `:webhookPublicId`
3. Configurar `x-webhook-secret` header com o `webhook_secret` retornado
4. Atualizar URL do webhook no Evolution API Manager

O endpoint legacy retorna JSON com instruções de migração para facilitar debugging.

## Fase 3 - Jobs/Workers Consolidado (IMPLEMENTADO)

Controle via `ROLE` env var para separar API de Worker.

| Item | Status | Arquivo |
|------|--------|---------|
| ROLE env var (api/worker/full) | OK | `server.js:63-65` |
| Conditional API startup | OK | `server.js:266-310` |
| Conditional Worker startup | OK | `server.js:312-381` |
| Worker heartbeat (keep-alive) | OK | `server.js:383-389` |
| docker-compose ROLE support | OK | `docker-compose.yml:144-148` |
| docker-compose.scale.yml | OK | Arquivo separado para horizontal scaling |
| worker.js DEPRECATED | OK | `worker.js` (arquivo separado obsoleto) |

### Modos de Operacao

| ROLE | HTTP Server | Background Jobs | Uso |
|------|-------------|-----------------|-----|
| `full` (default) | Sim | Sim | Single-instance, desenvolvimento |
| `api` | Sim | Nao | Horizontal scaling, load balancer |
| `worker` | Nao | Sim | Job processing dedicado |

### Arquivos Docker Compose

| Arquivo | Uso |
|---------|-----|
| `docker-compose.yml` | Single-instance (ROLE=full), desenvolvimento e deploy simples |
| `docker-compose.scale.yml` | Horizontal scaling com API + Worker separados |

### Exemplo de Uso Local

```bash
# Modo padrao (full) - API + Worker juntos
ROLE=full node src/server.js

# Modo API apenas (escalavel horizontalmente)
ROLE=api node src/server.js

# Modo Worker apenas (processamento de jobs)
ROLE=worker node src/server.js
```

### Horizontal Scaling em Producao

```bash
# Usar docker-compose.scale.yml para horizontal scaling
docker-compose -f docker-compose.scale.yml up -d

# Escalar API para 3 replicas (worker permanece 1)
docker-compose -f docker-compose.scale.yml up -d --scale leadly-api=3

# Ver logs de ambos
docker-compose -f docker-compose.scale.yml logs -f leadly-api leadly-worker
```

### Arquitetura de Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                   (nginx/traefik/etc)                       │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
 │ leadly-api  │      │ leadly-api  │      │ leadly-api  │
 │  ROLE=api   │      │  ROLE=api   │      │  ROLE=api   │
 └─────────────┘      └─────────────┘      └─────────────┘
                             │
                             │ async_jobs table
                             ▼
                      ┌─────────────┐
                      │leadly-worker│
                      │ ROLE=worker │
                      │   (single)  │
                      └─────────────┘
```

### Arquivo Obsoleto

O arquivo `src/worker.js` esta DEPRECATED. Todo o codigo foi consolidado em
`src/server.js` com controle via ROLE env var. O arquivo antigo pode ser
removido em versao futura.

## Fase 4 - FE <-> BE Contract (IMPLEMENTADO)

Contrato de API entre Frontend e Backend.

| Item | Status | Arquivo |
|------|--------|---------|
| OpenAPI manifest | OK | `openapi.json` |
| FE canonical (Vite) | OK | `apps/web-vite/` |
| FE deprecated (Next) | OK | `apps/web/DEPRECATED.md` |
| FE validation script | OK | `scripts/validate-api-calls.js` |
| Auth header padrao | OK | `Authorization: Bearer <token>` |

### Frontend Canonico

| Projeto | Status | Descrição |
|---------|--------|-----------|
| `apps/web-vite/` | **CANONICAL** | React 19 + Vite, 14 páginas |
| `apps/web/` | DEPRECATED | Next.js, não usar para novas features |

### OpenAPI Manifest

Arquivo `openapi.json` na raiz do projeto contém todos os endpoints válidos.

```bash
# Validar FE calls contra OpenAPI
node scripts/validate-api-calls.js
```

### Formato de Resposta Padrao

```json
{
  "success": true,
  "data": { /* payload */ },
  "error": null
}
```

### CI Guardrails

```bash
# Validar chamadas FE contra OpenAPI
node scripts/validate-api-calls.js

# Validar queries multi-tenant
node scripts/check-tenant-queries.js
```

## Fase 5 - Multi-Tenancy Incremental (IMPLEMENTADO)

Suporte multi-tenant via `tenant_id` em todas as tabelas principais.

**P0-5 Canonical Naming: `tenant_id` (NOT `team_id`)**

| Item | Status | Arquivo |
|------|--------|---------|
| Coluna tenant_id em tabelas | OK | `025_multi_tenancy*.sql` |
| Migration users.tenant_id | OK | `039_tenant_id_canonical.sql` |
| Indices para tenant_id | OK | Todas tabelas com indice |
| Default tenant 'default' | OK | Retrocompatibilidade |
| JWT usa tenantId (canonical) | OK | `AuthService.js:64-75` |
| auth.middleware lê tenantId | OK | `auth.middleware.js:39-53` |
| tenant.middleware lê tenantId | OK | `tenant.middleware.js:28-29` |
| BaseTenantRepository canonical | OK | `base-tenant.repository.js:28` |
| tenantCompat helpers | OK | `utils/tenantCompat.js` |
| CI guardrail queries | OK | `scripts/check-tenant-queries.js` |

### Convenção de Nomes (P0-5)

| Contexto | Nome Canônico | Legacy (deprecated) |
|----------|---------------|---------------------|
| Coluna DB (tabelas novas) | `tenant_id` | `team_id` |
| Código JavaScript | `tenantId` | `teamId` |
| JWT claim | `tenantId` | `teamId` |
| Request object | `req.tenantId` | `req.user.teamId` |
| API params | `tenant_id` | `team_id` |

### Arquivos Atualizados P0-5

- `AuthService.js` - JWT agora usa `tenantId` como claim canonical
- `auth.middleware.js` - Lê `decoded.tenantId || decoded.teamId` para backward compat
- `tenant.middleware.js` - Lê `req.user.tenantId || req.user.teamId`
- `base-tenant.repository.js` - DEFAULT_TENANT_COLUMN = 'tenant_id'
- `agent.repository.js` - Usa `tenant_id` (já era canonical)
- `team.routes.js` - Aceita `tenant_id` e `team_id` no body
- `tenantCompat.js` - Helper para normalização de nomes

### Tabelas com tenant_id

| Tabela | Indice | Default |
|--------|--------|---------|
| `users` | idx_users_tenant_id | mirrors team_id |
| `teams` | - | self-referencing |
| `accounts` | idx_accounts_tenant_id | 'default' |
| `activities` | idx_activities_tenant_id | 'default' |
| `agents` | idx_agents_tenant_id | 'default' |
| `agent_versions` | idx_agent_versions_tenant_id | 'default' |
| `contacts` | idx_contacts_tenant_id | 'default' |
| `integrations` | idx_integrations_tenant_id | 'default' |
| `integration_bindings` | idx_integration_bindings_tenant_id | 'default' |
| `leads` | idx_leads_tenant_id | 'default' |
| `oauth_states` | idx_oauth_states_tenant | 'default' |
| `opportunities` | idx_opportunities_tenant_id | 'default' |
| `pipelines` | idx_pipelines_tenant_id | 'default' |
| `whatsapp_messages` | idx_whatsapp_messages_tenant_id | 'default' |
| `inbound_events` | - | 'default' |
| `async_jobs` | - | 'default' |

### Padrao de Query

```sql
-- CORRETO: Sempre filtrar por tenant_id
SELECT * FROM leads WHERE tenant_id = ? AND status = 'active';

-- INCORRETO: Sem filtro de tenant (vaza dados entre tenants!)
SELECT * FROM leads WHERE status = 'active';
```

### Obtendo tenant_id no Backend

```javascript
// Via JWT token (auth middleware popula req.user)
const tenantId = req.user?.tenantId || 'default';

// Via lead state (webhook processing)
const tenantId = leadState?.tenant_id || 'default';

// Via integration lookup
const integration = db.prepare('SELECT tenant_id FROM integrations WHERE id = ?').get(integrationId);
const tenantId = integration?.tenant_id || 'default';
```

## Fase 6 - Integracoes Evolution + CRM (IMPLEMENTADO)

Arquitetura de integrações consolidada em services e providers.

| Item | Status | Arquivo |
|------|--------|---------|
| IntegrationService | OK | `services/IntegrationService.js` |
| EvolutionProvider | OK | `providers/EvolutionProvider.js` |
| IntegrationOAuthService | OK | `services/IntegrationOAuthService.js` |
| CRM Integration Routes | OK | `api/routes/crm-integration.routes.js` |
| Webhook canônico | OK | `api/routes/webhooks-inbound.routes.js` |

### Arquitetura de Integrações

```
┌─────────────────────┐      ┌──────────────────────┐
│   IntegrationService │◄────│  integration_bindings │
│   (CRUD, lookup)     │      └──────────────────────┘
└──────────┬──────────┘                │
           │                           │
           ▼                           ▼
┌─────────────────────┐      ┌──────────────────────┐
│  EvolutionProvider   │      │       agents          │
│  (Evolution API)     │      └──────────────────────┘
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Evolution API      │
│   (WhatsApp)         │
└─────────────────────┘
```

### Fluxo de One-Click Connect (WhatsApp)

1. FE chama `POST /api/agents/:agentId/channels/whatsapp`
2. IntegrationService cria registro com webhook_public_id e webhook_secret
3. EvolutionProvider.createInstance() cria instância no Evolution API
4. Evolution configura webhook para `/api/webhooks/inbound/:webhookPublicId`
5. Retorna QR code para escaneamento
6. Evolution envia CONNECTION_UPDATE para webhook
7. IntegrationService atualiza status para 'connected'

### CRM Providers Suportados

| Provider | OAuth | Status |
|----------|-------|--------|
| Kommo | OAuth 2.0 | OK |
| HubSpot | OAuth 2.0 | OK |
| Pipedrive | OAuth 2.0 | OK |

### Fluxo OAuth CRM

1. FE chama `POST /api/integrations/crm/:provider/oauth/start`
2. IntegrationOAuthService gera state e armazena em oauth_states
3. Retorna authUrl para redirect
4. User autoriza no CRM
5. CRM redireciona para `/api/integrations/crm/:provider/oauth/callback`
6. IntegrationOAuthService valida state, troca code por tokens
7. Cria/atualiza integration com tokens criptografados

## Fase 7 - Operabilidade e Seguranca (IMPLEMENTADO)

Infraestrutura de observabilidade e segurança.

| Item | Status | Arquivo |
|------|--------|---------|
| Winston structured logging | OK | `utils/logger.enhanced.js` |
| Metrics collector | OK | `utils/metrics.js` |
| Health check endpoints | OK | `api/routes/health.routes.js` |
| Metrics endpoint | OK | `api/routes/metrics.routes.js` |
| Version endpoint | OK | `api/routes/version.routes.js` |
| Rate limiting | OK | `middleware/rate-limiter.js` |
| Input validation | OK | `middleware/input-validation.js` |
| JWT authentication | OK | `middleware/auth.middleware.js` |

### Health Check Endpoints

| Endpoint | Propósito | Status Code |
|----------|-----------|-------------|
| `GET /health` | Load balancer check | 200/503 |
| `GET /health/detailed` | Full system status | 200/503 |
| `GET /health/ready` | K8s readiness probe | 200/503 |
| `GET /health/live` | K8s liveness probe | 200 |
| `GET /api/version` | Build info | 200 |

### Logging

```javascript
import { defaultLogger } from './utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'MyModule' });

logger.info('Operation completed', {
  userId: user.id,
  action: 'login',
  duration: 150
});
```

### Metrics

```javascript
import { metricsCollector } from './utils/metrics.js';

// Contador
metricsCollector.increment('requests.total', 1, { endpoint: '/api/leads' });

// Gauge
metricsCollector.gauge('connections.active', 42);

// Histograma (duração)
metricsCollector.histogram('request.duration', 150, { endpoint: '/api/leads' });
```

### Segurança

| Recurso | Implementação |
|---------|---------------|
| Password hashing | bcrypt (10 rounds) |
| JWT tokens | RS256 (se PRIVATE_KEY) ou HS256 |
| Rate limiting | Por IP e por endpoint |
| Input validation | Zod schemas |
| CORS | Configurável via ALLOWED_ORIGINS |
| Helmet | Headers de segurança |

---

## Resumo da Execução (STATUS REAL)

| Fase | Status | O que falta |
|------|--------|-------------|
| Fase 0 | **OK** | - |
| Fase 1 | **PARCIAL** | Enforce "sem tag = sem deploy" no pipeline CI/CD |
| Fase 2 | **OK** | - (cutover 410 feito, locks em memória removidos) |
| Fase 3 | **OK** | - (docker-compose.scale.yml criado) |
| Fase 4 | **OK** | - (FE endpoints corrigidos) |
| Fase 5 | **OK** | - (tenant_id canonical, compat layer mantido) |
| Fase 6 | **PARCIAL** | HubSpot/Pipedrive OAuth (TODOs em crm-integration.routes.js) |
| Fase 7 | **NÃO FEITO** | Correlation ID, migrar console.* para logger, índices |

### Pendências Concretas

**Fase 2 - COMPLETADA:**
- [x] Retornar 410 em `/api/webhook/evolution` - `webhook.routes.js:107-121`
- [x] Remover locks em memória (EarlyDeduplicator, ContactLockManager) - imports removidos
- [x] Idempotência via DB (`inbound_events.provider_message_id` UNIQUE)
- [x] Job processor usa formato canônico `{ inboundEventId, integrationId, instanceName, payload }`

**Fase 4 - COMPLETADA:**
- [x] `AgentDetail.tsx` corrigido: usa `/api/agents/${id}/evolution/qrcode` e `.../status`
- [x] `Integrations.tsx` corrigido: busca agentId via `/api/agents/my` antes de usar
- [x] Removido uso de `agentId=default` hardcoded - agora usa primeiro agent do usuário

**Fase 5 - COMPLETADA:**
- [x] `AuthService.js` corrigido: JWT usa `tenantId` (canonical)
- [x] `base-tenant.repository.js` corrigido: `DEFAULT_TENANT_COLUMN = 'tenant_id'`
- [x] `repositories/index.js` atualizado com documentação correta
- [x] `tenantCompat.js` header atualizado com canonical correto
- Note: Compat layer mantido para tabelas legadas com `team_id`

**Fase 6 - PARCIAL:**
- [x] FE Evolution corrigido (feito na Fase 4 - `Integrations.tsx`)
- [ ] HubSpot token exchange (TODO em `crm-integration.routes.js:176`)
- [ ] Pipedrive token exchange (TODO em `crm-integration.routes.js:180`)
- [ ] Job de refresh/sync de tokens OAuth

**Fase 7 - Para fechar:**
1. Adicionar correlation ID em requests
2. Migrar `console.*` para logger estruturado
3. Mover webhook secrets para secrets_json (encrypted)
4. Aplicar índices de `ARTIFACTS_HOT_TABLES_INDEXES.md`
5. Métricas centralizadas de webhooks/jobs/latências

---

*Criado em: 2025-12-19*
*Atualizado em: 2025-12-19*
*Responsavel: Claude Code*
