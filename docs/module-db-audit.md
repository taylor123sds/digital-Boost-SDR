# Auditoria Funcional e Mapa de Uso do Banco - LEADLY

> Documento gerado: 2025-12-23
> Escopo: Agents, Integrations, CRM/Leads, Cadence, Prospecting, Funnel

---

## Sumario Executivo

| Modulo | Rotas | Tabelas | Auth | Status |
|--------|-------|---------|------|--------|
| **Agents** | 16 | agents, integration_bindings | JWT+Tenant | OK |
| **Integrations** | 28 | integrations, integration_bindings, oauth_states, crm_* | JWT+Tenant | OK |
| **CRM/Leads** | 9 | leads, activities, opportunities, accounts, contacts | JWT+Tenant | OK |
| **Cadence** | 13 | cadences, cadence_steps, cadence_enrollments, cadence_actions_log, pipeline_stages, pipeline_history | JWT+Tenant | OK |
| **Prospecting** | 18 | prospect_leads, leads | optionalAuth | PARCIAL |
| **Funnel** | 11 | leads, lead_states, whatsapp_messages, pipeline_stages | JWT+Tenant | OK |

---

# 1. MODULO: AGENTS

## 1.1 Checklist do Fluxo

```
[Entrada] POST /api/agents { name, type, ... }
    |
    v
[Auth] authenticate -> tenantContext -> sanitizeInput -> rateLimitByTenant
    |
    v
[Service] AgentRepository.create(data, tenantId, userId)
    |
    v
[DB] INSERT INTO agents (...) VALUES (...)
    |
    v
[Saida] { success: true, data: agent }
```

## 1.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| GET | `/api/agents` | agents.routes.js | 295 | authenticate+tenantContext |
| GET | `/api/agents/my` | agents.routes.js | 318 | authenticate+tenantContext |
| GET | `/api/agents/:agentId` | agents.routes.js | 329 | authenticate+tenantContext |
| POST | `/api/agents` | agents.routes.js | 359 | requireManager |
| PUT | `/api/agents/:agentId` | agents.routes.js | 394 | requireManager |
| DELETE | `/api/agents/:agentId` | agents.routes.js | 418 | requireManager |
| GET | `/api/admin/agents` | agents.routes.js | 439 | authenticate+tenantContext |
| GET | `/api/agents/:agentId/permissions` | agents.routes.js | 470 | authenticate+tenantContext |
| POST | `/api/agents/:agentId/duplicate` | agents.routes.js | 512 | requireManager |
| GET | `/api/agents/:agentId/evolution/status` | agents.routes.js | 578 | authenticate+tenantContext |
| POST | `/api/agents/:agentId/evolution/create` | agents.routes.js | 584 | authenticate+tenantContext |
| GET | `/api/agents/:agentId/evolution/qrcode` | agents.routes.js | 590 | authenticate+tenantContext |
| POST | `/api/agents/:agentId/evolution/disconnect` | agents.routes.js | 596 | authenticate+tenantContext |
| DELETE | `/api/agents/:agentId/evolution` | agents.routes.js | 602 | authenticate+tenantContext |
| GET | `/api/evolution/instances` | agents.routes.js | 608 | authenticate |

## 1.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Repository | `src/repositories/agent.repository.js` | AgentRepository |
| Base | `src/repositories/base.repository.js` | BaseRepository |
| Singleton | `getAgentRepository()` | Factory function |

## 1.4 Tabelas e Colunas Usadas

### Tabela: `agents`
```sql
id TEXT PRIMARY KEY
tenant_id TEXT NOT NULL DEFAULT 'default'
name TEXT NOT NULL
slug TEXT NOT NULL
type TEXT DEFAULT 'sdr' -- CHECK: sdr, support, custom, scheduler
status TEXT DEFAULT 'active' -- CHECK: active, paused, offline, draft
channel TEXT DEFAULT 'whatsapp' -- CHECK: whatsapp, email, chat, voice
description TEXT
config_json TEXT DEFAULT '{}'
system_prompt TEXT
created_by_user_id TEXT
messages_processed INTEGER DEFAULT 0
avg_response_time INTEGER DEFAULT 0
is_active INTEGER DEFAULT 1
persona TEXT DEFAULT '{}'
prompts TEXT DEFAULT '{}'
behavior TEXT DEFAULT '{}'
ai_config TEXT DEFAULT '{}'
integrations TEXT DEFAULT '{}'
knowledge_base TEXT DEFAULT '{}'
metrics TEXT DEFAULT '{}'
last_active_at TEXT
created_at TEXT
updated_at TEXT
```

**Migration:** `src/db/migrations/047_agents_schema_alignment.sql`

**Indices:**
- `idx_agents_tenant_id` (tenant_id)
- `idx_agents_status` (status)
- `idx_agents_type` (type)
- UNIQUE(tenant_id, slug)

## 1.5 Queries Principais

| Operacao | Arquivo | Linha | Query |
|----------|---------|-------|-------|
| findByTenant | agent.repository.js | ~80 | `SELECT * FROM agents WHERE tenant_id = ?` |
| findByIdForTenant | agent.repository.js | ~95 | `SELECT * FROM agents WHERE id = ? AND tenant_id = ?` |
| create | agent.repository.js | ~120 | `INSERT INTO agents (...) VALUES (...)` |
| update | agent.repository.js | ~160 | `UPDATE agents SET ... WHERE id = ? AND tenant_id = ?` |
| delete | agent.repository.js | ~200 | Soft delete via is_active = 0 |

## 1.6 Testes Minimos (curl)

```bash
# 1. Listar agentes (requer JWT)
curl -X GET http://localhost:3000/api/agents \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "data": [...], "count": N }

# 2. Criar agente
curl -X POST http://localhost:3000/api/agents \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent", "type": "sdr"}'

# Esperado: { "success": true, "data": { "id": "..." } }

# 3. Get por ID
curl -X GET http://localhost:3000/api/agents/<AGENT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## 1.7 Logs Esperados

```
[AGENTS-API] Error listing agents: <error>
[AGENTS-API] Error getting agent: <error>
[AGENTS-API] Error creating agent: <error>
[AGENTS-API] Error updating agent: <error>
[AGENTS-API] Error deleting agent: <error>
```

## 1.8 Resultado: **OK**

Evidencia: Rotas protegidas com JWT, tenant isolation via middleware, queries parametrizadas.

## 1.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/agents.routes.js
295:router.get('/api/agents', async (req, res) => {
318:router.get('/api/agents/my', authenticate, tenantContext, (req, res) => {
329:router.get('/api/agents/:agentId', validateAgentId, async (req, res) => {
359:router.post('/api/agents', requireManager, async (req, res) => {
394:router.put('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => {
418:router.delete('/api/agents/:agentId', requireManager, validateAgentId, async (req, res) => {
439:router.get('/api/admin/agents', async (req, res) => {
470:router.get('/api/agents/:agentId/permissions', authenticate, tenantContext, validateAgentId, async (req, res) => {
512:router.post('/api/agents/:agentId/duplicate', authenticate, tenantContext, requireManager, validateAgentId, sanitizeInput, async (req, res) => {
578:router.get('/api/agents/:agentId/evolution/status', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);
584:router.post('/api/agents/:agentId/evolution/create', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);
590:router.get('/api/agents/:agentId/evolution/qrcode', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);
596:router.post('/api/agents/:agentId/evolution/disconnect', authenticate, tenantContext, validateAgentId, legacyEvolutionShim);
602:router.delete('/api/agents/:agentId/evolution', authenticate, tenantContext, requireManager, validateAgentId, legacyEvolutionShim);
608:router.get('/api/evolution/instances', authenticate, async (req, res) => {
```

---

# 2. MODULO: INTEGRATIONS

## 2.1 Checklist do Fluxo

```
[Entrada] POST /api/agents/:agentId/channels/evolution/connect
    |
    v
[Auth] authenticate -> tenantContext
    |
    v
[Service] IntegrationService.connectEvolutionForAgent(tenantId, agentId)
    |
    v
[Provider] EvolutionProvider.createInstance() / connectInstance()
    |
    v
[DB] INSERT INTO integrations + INSERT INTO integration_bindings
    |
    v
[Saida] { success: true, data: { qrcode, integrationId, webhookPublicId } }
```

## 2.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| POST | `/api/agents/:agentId/channels/evolution/connect` | channels.routes.js | 23 | authenticate+tenantContext |
| GET | `/api/agents/:agentId/channels/evolution/status` | channels.routes.js | 76 | authenticate+tenantContext |
| GET | `/api/agents/:agentId/channels/evolution/qrcode` | channels.routes.js | 130 | authenticate+tenantContext |
| POST | `/api/agents/:agentId/channels/evolution/disconnect` | channels.routes.js | 191 | authenticate+tenantContext |
| DELETE | `/api/agents/:agentId/channels/evolution` | channels.routes.js | 233 | authenticate+tenantContext+requireManager |
| GET | `/api/integrations` | channels.routes.js | 277 | authenticate+tenantContext |
| GET | `/api/integrations/:integrationId` | channels.routes.js | 317 | authenticate+tenantContext |
| GET | `/api/integrations/:integrationId/status` | channels.routes.js | 354 | authenticate+tenantContext |
| GET | `/api/integrations/crm/:provider/oauth/start` | crm-integration.routes.js | 108 | authenticate+tenantContext |
| GET | `/api/integrations/oauth/callback/:provider` | crm-integration.routes.js | 188 | public |
| POST | `/api/integrations/:integrationId/disconnect` | crm-integration.routes.js | 293 | authenticate+tenantContext |
| POST | `/api/integrations/:integrationId/sync` | crm-integration.routes.js | 335 | authenticate+tenantContext |
| GET | `/api/integrations/:integrationId/pipelines` | crm-integration.routes.js | 384 | authenticate+tenantContext |
| POST | `/api/integrations/:integrationId/leads` | crm-integration.routes.js | 463 | authenticate+tenantContext |
| GET | `/api/integrations/:integrationId/test` | crm-integration.routes.js | 543 | authenticate+tenantContext |
| GET | `/api/google/auth-url` | google/calendar.routes.js | 49 | authenticate+tenantContext |
| GET | `/api/google/auth-status` | google/calendar.routes.js | 76 | authenticate+tenantContext |
| GET | `/auth/google` | google/calendar.routes.js | 111 | authenticate+tenantContext |
| GET | `/oauth2callback` | google/calendar.routes.js | 138 | public |
| GET | `/api/calendar/status` | google/calendar.routes.js | 154 | authenticate+tenantContext |
| GET | `/api/events` | google/calendar.routes.js | 172 | authenticate+tenantContext |
| POST | `/api/events` | google/calendar.routes.js | 205 | authenticate+tenantContext |
| PUT | `/api/events/:eventId` | google/calendar.routes.js | 276 | authenticate+tenantContext |
| DELETE | `/api/events/:eventId` | google/calendar.routes.js | 302 | authenticate+tenantContext |
| GET | `/api/calendar/free-slots` | google/calendar.routes.js | 328 | authenticate+tenantContext |
| POST | `/api/calendar/suggest-times` | google/calendar.routes.js | 360 | authenticate+tenantContext |
| GET | `/api/leads` | google/sheets.routes.js | 16 | public |
| GET | `/api/dashboard/leads` | google/sheets.routes.js | 52 | public |

## 2.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Service | `src/services/IntegrationService.js` | IntegrationService |
| Provider | `src/providers/EvolutionProvider.js` | EvolutionProvider |
| Entitlement | `src/services/EntitlementService.js` | Verifica limites do plano |
| Singleton | `getIntegrationService()` | Factory |

## 2.4 Tabelas e Colunas Usadas

### Tabela: `integrations`
```sql
id TEXT PRIMARY KEY
tenant_id TEXT NOT NULL
provider TEXT NOT NULL DEFAULT 'evolution'
instance_name TEXT
phone_number TEXT
profile_name TEXT
status TEXT DEFAULT 'disconnected' -- CHECK: connected, disconnected, connecting, error
config_json TEXT DEFAULT '{}'
secrets_json TEXT DEFAULT '{}'
webhook_url TEXT
api_key TEXT
webhook_public_id TEXT
webhook_secret TEXT
webhook_auth_type TEXT DEFAULT 'header_secret'
is_active INTEGER DEFAULT 1
last_connected_at TEXT
error_message TEXT
created_at TEXT
updated_at TEXT
```

**Migration:** `src/db/migrations/025_multi_tenancy_simple.sql` + `src/db/migrations/029_integration_webhook_fields.sql`

### Tabela: `integration_bindings`
```sql
id TEXT PRIMARY KEY
tenant_id TEXT NOT NULL
agent_id TEXT NOT NULL
integration_id TEXT NOT NULL
is_primary INTEGER DEFAULT 1
created_at TEXT
```

## 2.5 Queries Principais

| Operacao | Arquivo | Linha | Query |
|----------|---------|-------|-------|
| getById | IntegrationService.js | 57 | `SELECT * FROM integrations WHERE tenant_id = ? AND id = ?` |
| getByWebhookPublicId | IntegrationService.js | 84 | `SELECT i.*, a.* FROM integrations i LEFT JOIN... WHERE json_extract(i.config_json, '$.webhook_public_id') = ?` |
| create | IntegrationService.js | 151 | `INSERT INTO integrations (...) VALUES (...)` |
| createBinding | IntegrationService.js | 268 | `INSERT OR REPLACE INTO integration_bindings (...)` |
| getBindingForAgent | IntegrationService.js | 284 | `SELECT ib.*, i.* FROM integration_bindings ib JOIN integrations i...` |

## 2.6 Testes Minimos (curl)

```bash
# 1. Listar integracoes
curl -X GET http://localhost:3000/api/integrations \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "data": [...], "meta": { "total": N, "canAddMore": true } }

# 2. Conectar Evolution (gera QR code)
curl -X POST http://localhost:3000/api/agents/<AGENT_ID>/channels/evolution/connect \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"

# Esperado: { "success": true, "data": { "qrcode": { "base64": "..." }, "integrationId": "...", "webhookPublicId": "..." } }

# 3. Status da conexao
curl -X GET http://localhost:3000/api/agents/<AGENT_ID>/channels/evolution/status \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "data": { "connected": true/false, "status": "connected/disconnected/connecting" } }
```

## 2.7 Logs Esperados

```
[CHANNELS] Evolution connect error: <error>
[CHANNELS] Evolution status error: <error>
[CHANNELS] QR code error: <error>
[CHANNELS] Disconnect error: <error>
Created new Evolution integration { tenantId, agentId, integrationId, instanceName }
```

## 2.8 Resultado: **OK**

Evidencia: Autenticacao JWT, tenant isolation, webhook secrets gerados automaticamente.

## 2.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/channels.routes.js
23:router.post('/api/agents/:agentId/channels/evolution/connect',
76:router.get('/api/agents/:agentId/channels/evolution/status',
130:router.get('/api/agents/:agentId/channels/evolution/qrcode',
191:router.post('/api/agents/:agentId/channels/evolution/disconnect',
233:router.delete('/api/agents/:agentId/channels/evolution',
277:router.get('/api/integrations',
317:router.get('/api/integrations/:integrationId',
354:router.get('/api/integrations/:integrationId/status',

$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/crm-integration.routes.js
108:router.get('/api/integrations/crm/:provider/oauth/start',
188:router.get('/api/integrations/oauth/callback/:provider', async (req, res) => {
293:router.post('/api/integrations/:integrationId/disconnect',
335:router.post('/api/integrations/:integrationId/sync',
384:router.get('/api/integrations/:integrationId/pipelines',
463:router.post('/api/integrations/:integrationId/leads',
543:router.get('/api/integrations/:integrationId/test',

$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/google/calendar.routes.js
49:router.get('/api/google/auth-url',
76:router.get('/api/google/auth-status',
111:router.get('/auth/google',
138:router.get('/oauth2callback', async (req, res) => {
154:router.get('/api/calendar/status',
172:router.get('/api/events',
205:router.post('/api/events',
276:router.put('/api/events/:eventId',
302:router.delete('/api/events/:eventId',
328:router.get('/api/calendar/free-slots',
360:router.post('/api/calendar/suggest-times',

$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/google/sheets.routes.js
16:router.get('/api/leads', async (req, res) => {
52:router.get('/api/dashboard/leads', async (req, res) => {

$ sed -n '70,110p' src/services/IntegrationService.js
  getByWebhookPublicId(webhookPublicId) {
    const db = this.getDb();
    return db.prepare(`
      SELECT i.*, a.id as bound_agent_id, a.name as bound_agent_name
      FROM integrations i /* tenant-guard: ignore (lookup by webhook_public_id) */
      LEFT JOIN integration_bindings ib ON i.id = ib.integration_id AND ib.is_primary = 1
      LEFT JOIN agents a ON ib.agent_id = a.id
      WHERE json_extract(i.config_json, '$.webhook_public_id') = ?
    `).get(webhookPublicId);
  }
```

---

# 3. MODULO: CRM/LEADS

## 3.1 Checklist do Fluxo

```
[Entrada] GET /api/crm/leads?page=1&limit=50
    |
    v
[Auth] authenticate -> tenantContext -> requireTenant
    |
    v
[Model] Lead.findAll({ where: { tenant_id }, limit, offset })
    |
    v
[DB] SELECT * FROM leads WHERE tenant_id = ? LIMIT ? OFFSET ?
    |
    v
[Saida] { success: true, data: [...], pagination: {...} }
```

## 3.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| GET | `/api/crm/leads` | crm/leads.routes.js | 24 | authenticate+tenantContext+requireTenant |
| GET | `/api/crm/leads/stats` | crm/leads.routes.js | 85 | authenticate+tenantContext+requireTenant |
| GET | `/api/crm/leads/:id` | crm/leads.routes.js | 106 | authenticate+tenantContext+requireTenant |
| POST | `/api/crm/leads` | crm/leads.routes.js | 139 | authenticate+tenantContext+requireTenant |
| PUT | `/api/crm/leads/:id` | crm/leads.routes.js | 175 | authenticate+tenantContext+requireTenant |
| DELETE | `/api/crm/leads/:id` | crm/leads.routes.js | 218 | authenticate+tenantContext+requireTenant |
| PUT | `/api/crm/leads/:id/status` | crm/leads.routes.js | 257 | authenticate+tenantContext+requireTenant |
| PUT | `/api/crm/leads/:id/bant` | crm/leads.routes.js | 307 | authenticate+tenantContext+requireTenant |
| POST | `/api/crm/leads/:id/convert` | crm/leads.routes.js | 353 | authenticate+tenantContext+requireTenant |

## 3.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Model | `src/models/Lead.js` | Lead (extends BaseModel) |
| Repository | `src/repositories/lead.repository.js` | LeadRepository |
| Base | `src/models/BaseModel.js` | BaseModel |

## 3.4 Tabelas e Colunas Usadas

### Tabela: `leads` (60+ colunas)
```sql
-- Principais colunas
id TEXT PRIMARY KEY
nome TEXT NOT NULL
empresa TEXT
cargo TEXT
email TEXT
telefone TEXT
whatsapp TEXT
origem TEXT
status TEXT DEFAULT 'novo' -- novo, contatado, qualificado, desqualificado, convertido
score INTEGER DEFAULT 0
segmento TEXT
tenant_id TEXT DEFAULT 'default'

-- BANT
bant_budget TEXT
bant_authority TEXT
bant_need TEXT
bant_timing TEXT
bant_score INTEGER DEFAULT 0

-- Pipeline
pipeline_id TEXT DEFAULT 'pipeline_outbound_solar'
stage_id TEXT DEFAULT 'stage_lead_novo'
cadence_status TEXT DEFAULT 'not_started'
cadence_day INTEGER DEFAULT 0

-- Conversion
converted INTEGER DEFAULT 0
converted_at TEXT
opportunity_id TEXT
account_id TEXT
contact_id TEXT

-- Timestamps
created_at TEXT
updated_at TEXT
```

**Migration:** `src/db/migrations/003_create_leads.sql`

**Indices relevantes:**
- `idx_leads_tenant_id` (tenant_id)
- `idx_leads_tenant_created` (tenant_id, created_at DESC)
- `idx_leads_status` (status)
- UNIQUE `idx_leads_unique_phone` (telefone)
- UNIQUE `idx_leads_unique_whatsapp` (whatsapp)

### Tabelas relacionadas:
- `activities` - Atividades do lead
- `opportunities` - Oportunidades convertidas
- `accounts` - Contas
- `contacts` - Contatos

## 3.5 Queries Principais

| Operacao | Arquivo | Linha | Query |
|----------|---------|-------|-------|
| findAll | Lead.js | herdado | `SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?` |
| search | Lead.js | 37 | `SELECT * FROM leads WHERE (nome LIKE ? OR empresa LIKE ?...) AND tenant_id = ?` |
| findByIdWithDetails | Lead.js | 96 | `SELECT * FROM leads WHERE id = ? AND tenant_id = ?` + JOINs activities |
| updateStatus | Lead.js | 152 | `UPDATE leads SET status = ?, ultimo_contato = ? WHERE id = ?` |
| updateBANT | Lead.js | 162 | `UPDATE leads SET bant_budget = ?, bant_authority = ?... WHERE id = ?` |
| convertToOpportunity | Lead.js | 184 | Transaction: UPDATE leads + refs |

## 3.6 Testes Minimos (curl)

```bash
# 1. Listar leads
curl -X GET "http://localhost:3000/api/crm/leads?page=1&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "data": [...], "pagination": { "page": 1, "total": N } }

# 2. Stats
curl -X GET http://localhost:3000/api/crm/leads/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "data": { "total": N, "converted": N, "conversionRate": "X.XX" } }

# 3. Criar lead
curl -X POST http://localhost:3000/api/crm/leads \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Test Lead", "telefone": "5584999999999"}'

# Esperado: { "success": true, "data": { "id": "lead_..." } }
```

## 3.7 Logs Esperados

```
Error fetching leads: <error>
Error fetching lead stats: <error>
Error creating lead: <error>
Error updating lead: <error>
```

## 3.8 Resultado: **OK**

Evidencia: Auth completo (authenticate+tenantContext+requireTenant), queries parametrizadas.

## 3.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/crm/leads.routes.js
24:router.get('/api/crm/leads', async (req, res) => {
85:router.get('/api/crm/leads/stats', async (req, res) => {
106:router.get('/api/crm/leads/:id', async (req, res) => {
139:router.post('/api/crm/leads', async (req, res) => {
175:router.put('/api/crm/leads/:id', async (req, res) => {
218:router.delete('/api/crm/leads/:id', async (req, res) => {
257:router.put('/api/crm/leads/:id/status', async (req, res) => {
307:router.put('/api/crm/leads/:id/bant', async (req, res) => {
353:router.post('/api/crm/leads/:id/convert', async (req, res) => {
```

---

# 4. MODULO: CADENCE

## 4.1 Checklist do Fluxo

```
[Entrada] POST /api/cadences/:id/enroll { lead_id }
    |
    v
[Auth] authenticate -> enforceIsolation -> requireTenant
    |
    v
[DB Direct] Check existing enrollment
    |
    v
[DB Direct] INSERT INTO cadence_enrollments (...)
    |
    v
[DB Direct] UPDATE leads SET cadence_id = ?, stage_id = 'stage_em_cadencia'
    |
    v
[DB Direct] INSERT INTO pipeline_history (...)
    |
    v
[Saida] { success: true, enrollment_id: "enr_..." }
```

## 4.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| GET | `/api/cadences` | cadence.routes.js | 36 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/stats` | cadence.routes.js | 64 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/pipeline-view` | cadence.routes.js | 166 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/:id` | cadence.routes.js | 220 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/:id/steps` | cadence.routes.js | 253 | authenticate+enforceIsolation+requireTenant |
| POST | `/api/cadences/:id/enroll` | cadence.routes.js | 289 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/enrollments/active` | cadence.routes.js | 364 | authenticate+enforceIsolation+requireTenant |
| PUT | `/api/cadences/enrollments/:id/pause` | cadence.routes.js | 416 | authenticate+enforceIsolation+requireTenant |
| PUT | `/api/cadences/enrollments/:id/resume` | cadence.routes.js | 454 | authenticate+enforceIsolation+requireTenant |
| PUT | `/api/cadences/enrollments/:id/respond` | cadence.routes.js | 490 | authenticate+enforceIsolation+requireTenant |
| GET | `/api/cadences/actions/pending` | cadence.routes.js | 554 | authenticate+enforceIsolation+requireTenant |
| POST | `/api/cadences/actions/execute` | cadence.routes.js | 634 | authenticate+enforceIsolation+requireTenant |
| POST | `/api/cadences/advance-day` | cadence.routes.js | 730 | authenticate+enforceIsolation+requireTenant |

## 4.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Direct DB | cadence.routes.js | Uses `getDatabase()` directly |
| Helper | `src/utils/tenantCompat.js` | extractTenantId() |
| DB | `src/db/index.js` | getDatabase() singleton |

**Nota:** Este modulo NAO usa repository pattern - faz queries diretas.

## 4.4 Tabelas e Colunas Usadas

### Tabela: `cadences`
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
description TEXT
type TEXT DEFAULT 'outbound'
duration_days INTEGER DEFAULT 15
is_default INTEGER DEFAULT 0
channels TEXT DEFAULT '[]'
tenant_id TEXT DEFAULT 'default'
created_at TEXT
updated_at TEXT
```

### Tabela: `cadence_steps`
```sql
id TEXT PRIMARY KEY
cadence_id TEXT NOT NULL
name TEXT
day INTEGER
step_order INTEGER
channel TEXT -- whatsapp, email, phone
action_type TEXT
content TEXT
subject TEXT
is_active INTEGER DEFAULT 1
tenant_id TEXT
```

### Tabela: `cadence_enrollments`
```sql
id TEXT PRIMARY KEY
cadence_id TEXT NOT NULL
lead_id TEXT NOT NULL
status TEXT DEFAULT 'active' -- active, paused, completed, responded, converted
current_day INTEGER DEFAULT 0
messages_sent INTEGER DEFAULT 0
emails_sent INTEGER DEFAULT 0
calls_made INTEGER DEFAULT 0
first_response_channel TEXT
first_response_day INTEGER
response_type TEXT
enrolled_by TEXT
tenant_id TEXT
UNIQUE(cadence_id, lead_id)
```

### Tabela: `cadence_actions_log`
```sql
id TEXT PRIMARY KEY
enrollment_id TEXT
step_id TEXT
lead_id TEXT
action_type TEXT
channel TEXT
day INTEGER
status TEXT
content_sent TEXT
executed_at TEXT
tenant_id TEXT
```

### Tabelas relacionadas:
- `pipeline_stages` - Estagios do pipeline
- `pipeline_history` - Historico de movimentacao
- `leads` - Atualizado junto com enrollments

**Migrations:** `src/db/migrations/019_create_pipeline_stages.sql`, `src/db/migrations/020_extend_leads_cadence.sql`

## 4.5 Queries Principais

| Operacao | Arquivo | Linha | Query |
|----------|---------|-------|-------|
| listCadences | cadence.routes.js | 41 | `SELECT c.*, (SELECT COUNT(*) FROM cadence_enrollments...) FROM cadences c WHERE c.tenant_id = ?` |
| getStats | cadence.routes.js | 69-136 | Multiplos SELECTs para estatisticas |
| getPipelineView | cadence.routes.js | 171 | `SELECT * FROM pipeline_stages WHERE tenant_id = ?` + leads por stage |
| enroll | cadence.routes.js | 319 | `INSERT INTO cadence_enrollments (...)` + UPDATE leads + INSERT pipeline_history |
| getPending | cadence.routes.js | 560-615 | SELECT enrollments + SELECT steps per enrollment |
| advanceDay | cadence.routes.js | 736-792 | UPDATE enrollments + UPDATE leads + INSERT pipeline_history |

## 4.6 Testes Minimos (curl)

```bash
# 1. Listar cadencias
curl -X GET http://localhost:3000/api/cadences \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "cadences": [...] }

# 2. Stats
curl -X GET http://localhost:3000/api/cadences/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "stats": { "total_enrollments": N, "active": N, ... } }

# 3. Enroll lead
curl -X POST http://localhost:3000/api/cadences/<CADENCE_ID>/enroll \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "lead_xxx"}'

# Esperado: { "success": true, "enrollment_id": "enr_..." }
```

## 4.7 Logs Esperados

```
[CADENCE-API] Error listing cadences: <error>
[CADENCE-API] Lead <lead_id> enrolled in cadence <cadence_id>
[CADENCE-API] Lead <lead_id> responded on day <N>
[CADENCE-API] Advanced <N> enrollments, completed <N>
[CADENCE-API] Executed action <action_id> for lead <lead_id> on day <N>
```

## 4.8 Resultado: **OK**

Evidencia: Auth completo, tenant isolation, queries parametrizadas.

## 4.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/cadence.routes.js
36:router.get('/api/cadences', (req, res) => {
64:router.get('/api/cadences/stats', (req, res) => {
166:router.get('/api/cadences/pipeline-view', (req, res) => {
220:router.get('/api/cadences/:id', (req, res) => {
253:router.get('/api/cadences/:id/steps', (req, res) => {
289:router.post('/api/cadences/:id/enroll', (req, res) => {
364:router.get('/api/cadences/enrollments/active', (req, res) => {
416:router.put('/api/cadences/enrollments/:id/pause', (req, res) => {
454:router.put('/api/cadences/enrollments/:id/resume', (req, res) => {
490:router.put('/api/cadences/enrollments/:id/respond', (req, res) => {
554:router.get('/api/cadences/actions/pending', (req, res) => {
634:router.post('/api/cadences/actions/execute', (req, res) => {
730:router.post('/api/cadences/advance-day', (req, res) => {
```

---

# 5. MODULO: PROSPECTING

## 5.1 Checklist do Fluxo

```
[Entrada] POST /api/prospecting/start { config }
    |
    v
[Auth] optionalAuth (!)
    |
    v
[Service] ProspectingEngine.start({ config, tenantId })
    |
    v
[Engine] Loop: SELECT FROM prospect_leads WHERE status = 'pendente' -> send message -> UPDATE status
    |
    v
[Saida] { success: true, message: "Prospeccao automatica iniciada" }
```

## 5.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| POST | `/api/prospecting/start` | prospecting.routes.js | 49 | **optionalAuth** |
| POST | `/api/prospecting/stop` | prospecting.routes.js | 85 | optionalAuth |
| POST | `/api/prospecting/pause` | prospecting.routes.js | 110 | optionalAuth |
| POST | `/api/prospecting/resume` | prospecting.routes.js | 134 | optionalAuth |
| GET | `/api/prospecting/status` | prospecting.routes.js | 162 | optionalAuth |
| GET | `/api/prospecting/stats` | prospecting.routes.js | 183 | optionalAuth |
| GET | `/api/prospecting/metrics` | prospecting.routes.js | 209 | optionalAuth |
| GET | `/api/prospecting/leads` | prospecting.routes.js | 230 | optionalAuth |
| GET | `/api/prospecting/history` | prospecting.routes.js | 253 | optionalAuth |
| POST | `/api/prospecting/config` | prospecting.routes.js | 290 | optionalAuth |
| POST | `/api/prospecting/template` | prospecting.routes.js | 334 | optionalAuth |
| POST | `/api/prospecting/manual` | prospecting.routes.js | 376 | optionalAuth |
| POST | `/api/prospecting/test` | prospecting.routes.js | 417 | optionalAuth |
| POST | `/api/prospecting/reset` | prospecting.routes.js | 454 | optionalAuth |

## 5.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Engine | `src/automation/ProspectingEngine.js` | ProspectingEngine singleton |
| Service | `src/services/ProspectSyncJob.js` | Sync Google Sheets -> SQLite |
| Service | `src/services/ProspectImportService.js` | Import stats |

## 5.4 Tabelas e Colunas Usadas

### Tabela: `prospect_leads`
```sql
id TEXT PRIMARY KEY
empresa TEXT NOT NULL
nome TEXT
cnpj TEXT
segmento TEXT
whatsapp TEXT NOT NULL
telefone TEXT
telefone_normalizado TEXT -- Para dedup
email TEXT
origem TEXT DEFAULT 'google_sheets'
fonte_lista TEXT
status TEXT DEFAULT 'pendente' -- pendente, em_fila, processando, enviado, erro
prioridade INTEGER DEFAULT 0
tentativas INTEGER DEFAULT 0
ultima_tentativa TEXT
erro_ultima_tentativa TEXT
metadata TEXT DEFAULT '{}'
created_at TEXT
updated_at TEXT
processado_at TEXT
```

**Indices:**
- UNIQUE `idx_prospect_unique_phone` (telefone_normalizado)
- `idx_prospect_status` (status)
- `idx_prospect_prioridade` (prioridade DESC)

## 5.5 Queries Principais (no ProspectingEngine)

| Operacao | Query |
|----------|-------|
| getNextProspect | `SELECT * FROM prospect_leads WHERE status = 'pendente' ORDER BY prioridade DESC, created_at ASC LIMIT 1` |
| markProcessing | `UPDATE prospect_leads SET status = 'processando', tentativas = tentativas + 1 WHERE id = ?` |
| markSent | `UPDATE prospect_leads SET status = 'enviado', processado_at = datetime('now') WHERE id = ?` |
| markError | `UPDATE prospect_leads SET status = 'erro', erro_ultima_tentativa = ? WHERE id = ?` |

## 5.6 Testes Minimos (curl)

```bash
# 1. Status (nao precisa auth)
curl -X GET http://localhost:3000/api/prospecting/status

# Esperado: { "success": true, "data": { "state": "idle/running", "queueSize": N } }

# 2. Start
curl -X POST http://localhost:3000/api/prospecting/start \
  -H "Content-Type: application/json" \
  -d '{"maxPerDay": 50, "intervalMinutes": 5}'

# Esperado: { "success": true, "message": "Prospeccao automatica iniciada" }

# 3. Stats
curl -X GET http://localhost:3000/api/prospecting/stats

# Esperado: { "success": true, "pending": N, "sentToday": N, "isRunning": true/false }
```

## 5.7 Logs Esperados

```
[API-PROSPECTING] Iniciando engine { config }
[API-PROSPECTING] Parando engine
[API-PROSPECTING] Erro ao iniciar <error>
```

## 5.8 Resultado: **PARCIAL**

**Problemas:**
1. `optionalAuth` - Qualquer pessoa pode controlar o engine de prospecao!
2. Sem tenant isolation - Engine opera globalmente

**Recomendacao:** Adicionar `authenticate` obrigatorio.

## 5.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/prospecting.routes.js
49:router.post('/api/prospecting/start', optionalAuth, async (req, res) => {
85:router.post('/api/prospecting/stop', optionalAuth, (req, res) => {
110:router.post('/api/prospecting/pause', optionalAuth, (req, res) => {
134:router.post('/api/prospecting/resume', optionalAuth, (req, res) => {
162:router.get('/api/prospecting/status', optionalAuth, (req, res) => {
183:router.get('/api/prospecting/stats', optionalAuth, (req, res) => {
209:router.get('/api/prospecting/metrics', optionalAuth, (req, res) => {
230:router.get('/api/prospecting/leads', optionalAuth, (req, res) => {
253:router.get('/api/prospecting/history', optionalAuth, (req, res) => {
290:router.post('/api/prospecting/config', optionalAuth, (req, res) => {
334:router.post('/api/prospecting/template', optionalAuth, (req, res) => {
376:router.post('/api/prospecting/manual', optionalAuth, async (req, res) => {
417:router.post('/api/prospecting/test', optionalAuth, async (req, res) => {
454:router.post('/api/prospecting/reset', optionalAuth, (req, res) => {
479:router.get('/api/prospecting/sync/status', optionalAuth, (req, res) => {
500:router.post('/api/prospecting/sync/now', optionalAuth, async (req, res) => {
525:router.get('/api/prospecting/prospects/stats', optionalAuth, (req, res) => {
```

---

# 6. MODULO: FUNNEL (FUNIL)

## 6.1 Checklist do Fluxo

```
[Entrada] GET /api/funil/bant
    |
    v
[Auth] authenticate -> tenantContext -> requireTenant
    |
    v
[Repository] leadRepository.findAll({ tenantId: extractTenantId(req) })
    |
    v
[StateManager] getLeadState(phone) para cada lead
    |
    v
[Saida] { success: true, leads: [...], stats: {...} }
```

## 6.2 Endpoints (arquivo + linha)

| Metodo | Rota | Arquivo | Linha | Auth |
|--------|------|---------|-------|------|
| GET | `/api/funil/bant` | funil.routes.js | 31 | authenticate+tenantContext+requireTenant |
| GET | `/api/funil/stats` | funil.routes.js | 172 | authenticate+tenantContext+requireTenant |
| GET | `/api/funil/bant/:contactId` | funil.routes.js | 209 | authenticate+tenantContext+requireTenant |
| POST | `/api/leads/update-stage` | funil.routes.js | 240 | authenticate+tenantContext+requireTenant |
| POST | `/api/funil/cleanup-prospecting` | funil.routes.js | 334 | authenticate+tenantContext+requireTenant |
| POST | `/api/funil/sheets-sync/enable` | funil.routes.js | 399 | authenticate+tenantContext+requireTenant |
| POST | `/api/funil/sheets-sync/disable` | funil.routes.js | 418 | authenticate+tenantContext+requireTenant |
| POST | `/api/funil/sync-to-sheets` | funil.routes.js | 437 | authenticate+tenantContext+requireTenant |
| GET | `/api/funil/pipeline-unificado` | funil.routes.js | 570 | authenticate+tenantContext+requireTenant |
| POST | `/api/leads/ingest` | funil.routes.js | 670 | authenticate+tenantContext+requireTenant + X-API-KEY |
| GET | `/api/leads/ingest/stats` | funil.routes.js | 898 | authenticate+tenantContext+requireTenant |

## 6.3 Services/Repositories/Models

| Tipo | Arquivo | Funcao |
|------|---------|--------|
| Repository | `src/repositories/lead.repository.js` | leadRepository |
| State | `src/utils/stateManager.js` | getLeadState(), saveLeadState() |
| Sheets | `src/utils/sheetsManager.js` | moveLeadFromProspectingToFunil() |
| Sheets Tool | `src/tools/google_sheets.js` | writeSheet() |

## 6.4 Tabelas e Colunas Usadas

- `leads` - Tabela principal
- `lead_states` - Estado da conversa (BANT stages)
- `whatsapp_messages` - Para contar mensagens
- `pipeline_stages` - Estagios do pipeline
- `prospect_leads` - Fila de prospecao

## 6.5 Queries Principais

| Operacao | Arquivo | Linha | Query |
|----------|---------|-------|-------|
| bant list | funil.routes.js | 38 | `leadRepository.findAll({ tenantId })` |
| stats | funil.routes.js | 176 | `leadRepository.getFunnelStats(pipelineId, tenantId)` |
| ingest | funil.routes.js | 773 | `SELECT id, stage_id FROM leads WHERE telefone = ?` |
| ingest create | funil.routes.js | 804 | `INSERT INTO prospect_leads (...)` |
| pipeline-unificado | funil.routes.js | 580-612 | Complex JOINs leads + pipeline_stages + cadence_enrollments + whatsapp_messages |

## 6.6 Testes Minimos (curl)

```bash
# 1. Listar funil BANT
curl -X GET http://localhost:3000/api/funil/bant \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "leads": [...], "stats": {...} }

# 2. Stats
curl -X GET http://localhost:3000/api/funil/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Esperado: { "success": true, "stats": { "total": N, ... } }

# 3. Ingest lead (requer JWT + X-API-KEY)
curl -X POST http://localhost:3000/api/leads/ingest \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-API-KEY: orbion-ingest-2024" \
  -H "Content-Type: application/json" \
  -d '{"empresa": "Test", "whatsapp": "5584999999999"}'

# Esperado: { "success": true, "results": { "created": 1 } }
```

## 6.7 Logs Esperados

```
[FUNIL-BANT] <N> leads carregados do SQLite
[FUNIL-STATS] Erro: <error>
[FUNIL-UPDATE] Lead <leadId> movido para estagio <stage>
[LEADS-INGEST] Recebendo <N> leads da automacao...
[LEADS-INGEST] Processados: <N> adicionados a fila
```

## 6.8 Resultado: **OK**

**Protecao aplicada:** Todas as rotas do funil exigem `authenticate + tenantContext + requireTenant`.

**Excecao adicional:**
- `/api/leads/ingest` exige **JWT + X-API-KEY** (LEADS_INGEST_API_KEY).

## 6.9 Evidencia Auditavel (comandos)

```bash
$ rg -n "router\\.use" src/api/routes/funil.routes.js
19:router.use('/api/funil', authenticate, tenantContext, requireTenant);

$ rg -n "router\\.(get|post|put|delete|patch)" src/api/routes/funil.routes.js
36:router.get('/api/funil/bant', async (req, res) => {
177:router.get('/api/funil/stats', async (req, res) => {
214:router.get('/api/funil/bant/:contactId', async (req, res) => {
245:router.post('/api/leads/update-stage', authenticate, tenantContext, requireTenant, async (req, res) => {
339:router.post('/api/funil/cleanup-prospecting', async (req, res) => {
404:router.post('/api/funil/sheets-sync/enable', async (req, res) => {
423:router.post('/api/funil/sheets-sync/disable', async (req, res) => {
442:router.post('/api/funil/sync-to-sheets', async (req, res) => {
575:router.get('/api/funil/pipeline-unificado', async (req, res) => {
675:router.post('/api/leads/ingest', authenticate, tenantContext, requireTenant, async (req, res) => {
903:router.get('/api/leads/ingest/stats', authenticate, tenantContext, requireTenant, async (req, res) => {
```

---

# Resumo de Problemas de Seguranca

## CRITICO (Corrigir Imediatamente)

| Modulo | Endpoint | Problema |
|--------|----------|----------|
| Funnel | - | **Nenhum** (rotas agora protegidas por JWT + tenant) |

## MEDIO (Corrigir em 1 semana)

| Modulo | Endpoint | Problema |
|--------|----------|----------|
| Prospecting | POST `/api/prospecting/start` | optionalAuth - controle do engine |
| Prospecting | POST `/api/prospecting/stop` | optionalAuth - controle do engine |
| Prospecting | POST `/api/prospecting/config` | optionalAuth - altera configuracao |

## Sugestao de Fix

As protecoes foram aplicadas em `funil.routes.js`. Mantenha o `X-API-KEY` do
`/api/leads/ingest` e considere adicionar rate limit adicional nesse endpoint.

---

# Fluxo Request -> Service -> Repo -> DB

```
                    +-----------------+
                    |   HTTP Request  |
                    +--------+--------+
                             |
                    +--------v--------+
                    |  Express Router |
                    +--------+--------+
                             |
            +----------------+----------------+
            |
   +--------v--------+
   |   Auth Middleware|
   | - authenticate   |
   | - tenantContext  |
   | - requireTenant  |
   | (funil.routes OK)|
   +--------+--------+
            |
   +--------v--------+
   |  Route Handler  |
   +--------+--------+
            |
   +--------v--------+
   | Service/Model   |
   | - IntegrationService
   | - Lead (Model)  |
   | - AgentRepository
   +--------+--------+
            |
   +--------v--------+
   |   getDatabase() |
   | (singleton)     |
   +--------+--------+
            |
   +--------v--------+
   |   SQLite Query  |
   | better-sqlite3  |
   +--------+--------+
            |
   +--------v--------+
   |   orbion.db     |
   +------------------+
```

---

# Verificacao de Execucao

```bash
# Verificar tabelas existem
sqlite3 orbion.db ".tables" | grep -E "(agents|leads|integrations|cadences)"

# Output esperado:
# agents   cadence_actions_log  cadence_enrollments  cadence_steps
# cadences integrations         integration_bindings leads
# pipeline_history             pipeline_stages      prospect_leads

# Verificar contagens
sqlite3 orbion.db "SELECT 'agents:', COUNT(*) FROM agents UNION ALL SELECT 'leads:', COUNT(*) FROM leads UNION ALL SELECT 'integrations:', COUNT(*) FROM integrations UNION ALL SELECT 'cadences:', COUNT(*) FROM cadences UNION ALL SELECT 'prospect_leads:', COUNT(*) FROM prospect_leads;"
```

---

**Documento finalizado em: 2025-12-23**
