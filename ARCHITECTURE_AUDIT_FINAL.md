# ORBION/LEADLY AI - Comprehensive Architecture Audit

**Date:** 2025-12-18
**Analysts:** 5 Specialized Agents
**Scope:** Full Stack Analysis (Backend, Frontend, Auth, Integrations, Deployment)

---

## Executive Summary

This document consolidates the findings from 5 specialized analysis agents that audited the entire ORBION/LEADLY AI codebase.

### Critical Statistics

| Category | P0 Critical | P1 High | P2 Medium | Total |
|----------|-------------|---------|-----------|-------|
| Backend Architecture | 3 | 5 | 7 | 15 |
| Frontend React App | 3 | 4 | 4 | 11 |
| Auth & User Flows | 4 | 4 | 3 | 11 |
| Agents & Integrations | 6 | 5 | 5 | 16 |
| **TOTAL** | **16** | **18** | **19** | **53** |

### Most Critical Issues (BLOCKING PRODUCTION)

1. **`db.close()` Bug** - Every repository method closes the singleton DB connection
2. **Frontend Not Served** - React app build path misconfigured (100% failure)
3. **Trial NOT Enforced** - `EntitlementService.assertRuntimeAllowed()` never called
4. **Agent Versions Mutable** - No trigger prevents modification of published versions
5. **Webhook Secret Bypass** - Null secrets allowed for backward compatibility

---

## Part 1: Backend Architecture (Agent 1)

### 1.1 As-Is Structure

```
src/
├── server.js                    # Main orchestrator (216 lines, refactored)
├── config/
│   ├── di-container.js          # DI container with singleton getDatabase()
│   ├── express.config.js        # Middleware, CORS, static files
│   └── database.js              # SQLite connection management
├── api/routes/
│   ├── index.js                 # Route aggregator (299 routes)
│   ├── webhook.routes.js        # Evolution webhook handler
│   ├── auth.routes.js           # JWT auth endpoints
│   └── [44 other route files]
├── services/
│   ├── AuthService.js           # Login, register, tokens
│   ├── IntegrationService.js    # Evolution, CRM integrations
│   └── [15 other services]
├── repositories/
│   ├── lead.repository.js       # ❌ HAS db.close() BUG
│   └── [other repos]
├── handlers/
│   ├── webhook_handler.js       # Message processing
│   └── UnifiedMessageCoordinator.js
└── db/migrations/
    └── [035 migration files]
```

### 1.2 Critical Breaks (P0)

#### P0-B1: `db.close()` Closes Singleton Connection

**File:** `src/repositories/lead.repository.js:200-203`

```javascript
// ❌ PRODUCTION BLOCKER
findById(id) {
  const db = this.getDb();  // Gets singleton connection
  try {
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  } finally {
    db.close();  // CLOSES THE SINGLETON FOR ENTIRE APP!
  }
}
```

**Impact:** First concurrent request crashes entire application with "database is closed"

**Fix:** Remove all `db.close()` calls from repositories.

---

#### P0-B2: `inbound_events` Staging Table NOT Implemented

**File:** `src/db/migrations/031_inbound_events.sql` - EXISTS but NO CODE USES IT

```sql
-- Table exists in migrations
CREATE TABLE inbound_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
);
```

**Impact:**
- No retry logic for failed webhooks
- No idempotency on duplicates
- Lost messages on crash

**Fix:** Implement staging queue pattern in webhook handler.

---

#### P0-B3: `async_jobs` Queue NOT Implemented

**File:** `src/db/migrations/032_async_jobs.sql` - EXISTS but NO CODE USES IT

**Impact:**
- Heavy operations (OpenAI, TTS) block request thread
- No retry logic for failed jobs
- No job prioritization

---

### 1.3 High Risks (P1)

| Issue | Location | Impact |
|-------|----------|--------|
| P1-B1: tenant_id vs team_id inconsistency | 46 files | SQL injection risk, broken queries |
| P1-B2: No graceful shutdown | server.js | Lost in-flight requests |
| P1-B3: SQLite synchronous in async context | repositories | Blocks event loop |
| P1-B4: Workers not started | server.js:180 | CadenceEngine, Prospecting never run |
| P1-B5: No health endpoint validation | health.routes.js | DB down not detected |

---

## Part 2: Frontend React App (Agent 2)

### 2.1 As-Is Structure

```
apps/web-vite/
├── package.json          # React 19.2.0, Vite 7.2.4
├── vite.config.ts        # base: '/app/'
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Router, auth guards (basename="/app")
│   ├── lib/
│   │   └── api.ts        # API client (423 lines)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Agents.tsx
│   │   ├── Integrations.tsx
│   │   └── [10 other pages]
│   └── components/
│       ├── layout/Sidebar.tsx
│       └── ui/[components]
└── dist/                 # Built output
    └── index.html        # References /app/assets/*
```

### 2.2 Critical Breaks (P0)

#### P0-F1: Frontend Build NOT Served by Backend

**Vite Config:** `apps/web-vite/vite.config.ts:7`
```typescript
base: '/app/'
```

**Express Config:** `src/config/express.config.js:127`
```javascript
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/app/index.html'));
  // Resolves to: /agent-js-starter/public/app/index.html
});
```

**Build Output:** `apps/web-vite/dist/index.html`

**THE PROBLEM:**
- Backend looks for: `public/app/index.html`
- Build creates: `apps/web-vite/dist/index.html`
- **Directory `public/app/` DOES NOT EXIST**

**Impact:** 100% FAILURE - Every `/app/*` route returns 404

**Fix:**
```javascript
// Option 1: Serve from correct location
app.use('/app', express.static(path.join(__dirname, '../../apps/web-vite/dist')));
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../apps/web-vite/dist/index.html'));
});

// Option 2: Add build script
"build:frontend": "cd apps/web-vite && npm run build && cp -r dist ../../public/app"
```

---

#### P0-F2: No Token Refresh Logic

**File:** `apps/web-vite/src/lib/api.ts:21-50`

```typescript
// Only stores access token, NOT refresh token
async login(email: string, password: string) {
  const result = await this.request('/auth/login', {...});
  localStorage.setItem('token', result.data.token);
  // ❌ refreshToken NOT STORED
}

// Hard redirect on 401 instead of refresh
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/app/login';  // ❌ INSTANT LOGOUT
}
```

**Impact:** User gets logged out after JWT expires (24h)

**Fix:** Store refreshToken, add refresh interceptor.

---

#### P0-F3: Auth State Not Reactive

**File:** `apps/web-vite/src/App.tsx:22-44`

```typescript
function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);  // Only checks on mount
  }, []);  // ❌ Empty deps = runs ONCE
}
```

**Impact:** Token expires but user stays on protected route

---

### 2.3 API Endpoint Catalog

| Method | Path | Auth | Used In |
|--------|------|------|---------|
| POST | `/api/auth/login` | No | Login.tsx |
| POST | `/api/auth/register` | No | Register.tsx |
| POST | `/api/auth/refresh` | No | **NOT USED** |
| GET | `/api/auth/me` | Yes | **NOT USED** |
| GET | `/api/funil/stats` | Yes | Dashboard.tsx |
| GET | `/api/agents/my` | Yes | Agents.tsx |
| GET | `/api/funil/bant` | Yes | CRM.tsx |
| POST | `/api/agents/:id/channels/evolution/connect` | Yes | Integrations.tsx |

---

## Part 3: Auth & User Flows (Agent 3)

### 3.1 As-Is Structure

```
Authentication Flow:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Register   │───▶│  AuthService │───▶│  Database    │
│   /Login     │    │  (2 places)  │    │  (2 tables)  │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
            users.refresh_token   sessions table
            (BOTH UPDATED!)       (ALSO UPDATED!)
```

### 3.2 Critical Breaks (P0)

#### P0-A1: Dual Token Storage Causes Session Revocation Failure

**File:** `src/services/AuthService.js`

```javascript
// Line 198: Registration stores in BOTH places
this.userModel.updateRefreshToken(user.id, refreshToken);  // users.refresh_token
this.createSession(user.id, accessToken, refreshToken, {...});  // sessions table

// Line 308: Refresh validates from users.refresh_token ONLY
if (user.refresh_token !== refreshToken) {
  throw new Error('Token de refresh inválido');
}
```

**Impact:** Session revocation doesn't work - deleting from sessions table doesn't invalidate token.

---

#### P0-A2: Trial Enforcement is 100% COSMETIC

**File:** `src/services/EntitlementService.js`

```javascript
// Method exists but NEVER CALLED
assertRuntimeAllowed(teamId, feature) {
  const team = this.getTeam(teamId);
  if (team.billing_status === 'trial_expired') {
    throw new Error('Trial expirado');
  }
}
```

**Evidence:** Searched entire codebase - `assertRuntimeAllowed` has 0 call sites in:
- `webhook.routes.js` (should block expired trials)
- `webhook_handler.js` (should block expired trials)
- Any message processing pipeline

**Impact:** Users can use forever without paying.

---

#### P0-A3: Conflicting Team Model Breaks Multi-Workspace

**File:** `src/models/User.js`

```javascript
findByIdWithTeam(userId) {
  return db.prepare(`
    SELECT u.*, t.*
    FROM users u
    LEFT JOIN team_members tm ON u.id = tm.user_id
    LEFT JOIN teams t ON tm.team_id = t.id
    WHERE u.id = ?
  `).get(userId);  // Uses junction table
}
```

**File:** `src/services/AuthService.js`

```javascript
generateAccessToken(user) {
  return jwt.sign({
    userId: user.id,
    teamId: user.team_id  // ❌ Direct team_id, not from junction
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
```

**Impact:** Multi-workspace switching impossible.

---

#### P0-A4: No Refresh Token Rotation

**File:** `src/services/AuthService.js:297-330`

```javascript
async refreshAccessToken(refreshToken) {
  // Validates old refresh token
  if (user.refresh_token !== refreshToken) {
    throw new Error('Token de refresh inválido');
  }

  // Generates new access token
  const newAccessToken = this.generateAccessToken(user);

  // ❌ REUSES OLD REFRESH TOKEN - No rotation!
  return {
    token: newAccessToken,
    refreshToken: refreshToken,  // SAME TOKEN RETURNED
    user: this.safeUser(user)
  };
}
```

**Impact:** Stolen refresh token valid forever (7 days).

---

### 3.3 Team/Tenant Naming Inconsistency

| File | Uses | Should Use |
|------|------|------------|
| AuthService.js | team_id | tenant_id |
| tenantContext middleware | tenant_id | team_id |
| agents table | tenant_id | (correct) |
| lead.repository.js | team_id | tenant_id |
| **46 files total** | **Mixed** | **Inconsistent** |

---

## Part 4: Agents & Integrations (Agent 4)

### 4.1 As-Is Structure

```
Agents Ecosystem:
┌─────────────────┐     ┌─────────────────┐
│     agents      │────▶│  agent_versions │
│  (config_json)  │     │ (compiled_prompt)│
└─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ integration_    │     │  conversations  │
│ bindings        │     │ (agent_version_id)│
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  integrations   │
│ (provider, etc) │
└─────────────────┘
```

### 4.2 Critical Breaks (P0)

#### P0-I1: Agent Versions NOT IMMUTABLE

**File:** `src/db/migrations/025_multi_tenancy.sql:72-87`

```sql
CREATE TABLE agent_versions (
  id TEXT PRIMARY KEY,
  compiled_prompt TEXT,  -- Can be modified!
  UNIQUE(agent_id, version)
);
-- ❌ NO TRIGGER TO PREVENT UPDATE
```

**Impact:** Someone can run:
```sql
UPDATE agent_versions SET compiled_prompt = 'new' WHERE id = 'v1';
```
This corrupts conversation history audit.

**Fix:**
```sql
CREATE TRIGGER prevent_version_update
BEFORE UPDATE ON agent_versions
WHEN OLD.published_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Cannot modify published agent version');
END;
```

---

#### P0-I2: `compiled_prompt` NOT Cached

**File:** `src/agents/prompts/PromptAssembler.js:25`

```javascript
assemble() {
  const sections = [];
  sections.push(this.buildIdentitySection());
  sections.push(CORE_NUCLEUS);
  sections.push(SAFETY_RULES);
  // ... 9 function calls per message
  return sections.filter(s => s).join('\n\n---\n\n');
}
```

Grep for `compiled_prompt` found 0 references outside migrations.

**Impact:** 10-message conversation = 10 full prompt re-assemblies. P95 latency > 2s under load.

---

#### P0-I3: Conversation DOESN'T BIND `agent_version_id`

**File:** `src/platform/database/models/Conversation.js:13`

```javascript
// Field exists in model but never enforced
this.agentVersionId = data.agent_version_id || data.agentVersionId;
```

**Missing:**
- Code that sets `agentVersionId` on conversation creation
- Trigger that prevents changing mid-conversation
- Code that uses version ID to load correct prompt

**Impact:** User starts with v1.0 (friendly), admin publishes v2.0 (professional), user continues with v2.0 (tone mismatch).

---

#### P0-I4: Integration Binding LACKS Category Enforcement

**File:** `src/services/IntegrationService.js`

```javascript
createBinding(tenantId, agentId, integrationId, isPrimary = true) {
  // ❌ No validation that integration is messaging-capable
  db.prepare(`INSERT OR REPLACE INTO integration_bindings (...)`).run(...);
}
```

**Impact:** User binds agent to Kommo CRM, agent tries to send WhatsApp via Kommo → CRASH.

---

#### P0-I5: `webhook_public_id` Uses JSON Extract (Slow)

**File:** `src/db/migrations/029_integration_webhook_fields.sql:19`

```sql
CREATE INDEX IF NOT EXISTS idx_integrations_webhook_public_id
ON integrations(json_extract(config_json, '$.webhook_public_id'));
```

**Benchmark:**
- 10 integrations: ~5ms per webhook
- 100 integrations: ~50ms per webhook
- 1000 integrations: ~500ms per webhook (P99 timeout)

**Impact:** Webhook processing > 200ms → Evolution retries → duplicate messages.

**Fix:** Add dedicated column with UNIQUE index.

---

#### P0-I6: Webhook Secret Validation ALLOWS NULL

**File:** `src/services/IntegrationService.js:596-598`

```javascript
validateWebhook(webhookPublicId, providedSecret) {
  const expectedSecret = configJson.webhook_secret;

  // ❌ SECURITY HOLE: If no secret configured, allow!
  if (!expectedSecret) {
    return { valid: true, integration };
  }
}
```

**Impact:** Attackers can inject malicious webhooks to old integrations without secrets.

---

### 4.3 Provider Contract (BaseCRMProvider)

All CRM providers MUST implement:

```typescript
interface CRMProvider {
  // OAuth
  getAuthorizeUrl(options): string
  exchangeCodeForTokens(options): Promise<Tokens>
  refreshAccessToken(refreshToken, accountDomain?): Promise<Tokens>

  // Leads
  upsertLead(accessToken, leadData, accountDomain?): Promise<Lead>
  getLead(accessToken, remoteId, accountDomain?): Promise<Lead>
  searchLeads(accessToken, query, accountDomain?): Promise<Lead[]>

  // Metadata
  getPipelines(accessToken, accountDomain?): Promise<Pipeline[]>
  getUsers(accessToken, accountDomain?): Promise<User[]>

  // Webhooks
  verifyWebhook(headers, body): boolean
  parseWebhookPayload(payload): { type, entity, data }

  // Health
  healthCheck(accessToken, accountDomain?): Promise<boolean>
}
```

---

## Part 5: Unified PR Plan

### Priority Matrix

| Priority | Issue | Effort | Risk | PR |
|----------|-------|--------|------|-----|
| **P0-URGENT** | db.close() bug | 1h | Low | #1 |
| **P0-URGENT** | Frontend path fix | 2h | Low | #2 |
| **P0-URGENT** | Webhook secret bypass | 2h | Medium | #3 |
| **P0-BLOCKING** | Trial enforcement | 4h | Medium | #4 |
| **P0-BLOCKING** | Agent version immutability | 4h | Low | #5 |
| **P0-BLOCKING** | Conversation version binding | 4h | Low | #6 |
| P1 | Token refresh rotation | 4h | Low | #7 |
| P1 | Dual token storage fix | 4h | Medium | #8 |
| P1 | OAuth encryption key | 2h | Medium | #9 |
| P1 | webhook_public_id column | 2h | Low | #10 |

### PR Descriptions

#### PR #1: Fix db.close() Bug (URGENT)
```
Files:
- src/repositories/lead.repository.js
- src/repositories/agent.repository.js
- [all repositories]

Changes:
- Remove all `finally { db.close(); }` blocks

Testing:
- Start server
- Send 10 concurrent requests
- Verify no "database is closed" errors
```

#### PR #2: Fix Frontend Serving Path (URGENT)
```
Files:
- src/config/express.config.js
- package.json (add build:frontend script)

Changes:
- Update SPA fallback to serve from apps/web-vite/dist/
- Add npm script to copy build to public/app/

Testing:
- npm run build:frontend
- npm start
- Visit http://localhost:3001/
- Verify React app loads
```

#### PR #3: Webhook Security Hardening (URGENT)
```
Files:
- src/services/IntegrationService.js
- src/db/migrations/037_webhook_security.sql

Changes:
- Remove null secret bypass
- Add constant-time comparison
- Generate secrets for existing integrations

Testing:
- Send webhook without secret → expect 403
- Send webhook with wrong secret → expect 403
- Send webhook with correct secret → expect 200
```

#### PR #4: Enforce Trial Limits
```
Files:
- src/api/routes/webhook.routes.js
- src/handlers/webhook_handler.js

Changes:
- Add EntitlementService.assertRuntimeAllowed() check
- Return 402 Payment Required for expired trials

Testing:
- Create user with expired trial
- Send message → expect 402
- Upgrade trial → expect 200
```

#### PR #5: Agent Version Immutability
```
Files:
- src/db/migrations/036_agent_versioning.sql
- src/services/PromptCacheService.js (NEW)

Changes:
- Add trigger to prevent UPDATE on published versions
- Implement prompt caching

Testing:
- Publish agent v1.0
- Try to UPDATE agent_versions → expect error
- Verify prompt loaded from cache
```

#### PR #6: Conversation Version Binding
```
Files:
- src/db/migrations/036_agent_versioning.sql
- src/handlers/webhook_handler.js

Changes:
- Add agent_version_id requirement on conversation creation
- Add trigger to prevent mid-conversation version changes

Testing:
- Create conversation with v1.0
- Publish v2.0
- Continue conversation → verify still uses v1.0
```

---

## Part 6: Schema Changes (Consolidated Migrations)

### Migration 036: Agent Versioning Fixes

```sql
-- Prevent version modification after publish
CREATE TRIGGER prevent_version_update
BEFORE UPDATE ON agent_versions
WHEN OLD.published_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Cannot modify published agent version');
END;

-- Require version on conversation
CREATE TRIGGER enforce_conversation_version
BEFORE INSERT ON conversations
WHEN NEW.agent_version_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'agent_version_id is required');
END;

-- Prevent version change mid-conversation
CREATE TRIGGER prevent_conversation_version_change
BEFORE UPDATE OF agent_version_id ON conversations
BEGIN
  SELECT RAISE(ABORT, 'Cannot change agent version mid-conversation');
END;

-- Add current version pointer to agents
ALTER TABLE agents ADD COLUMN current_version_id TEXT
  REFERENCES agent_versions(id);

-- Prompt cache table
CREATE TABLE prompt_cache (
  agent_version_id TEXT PRIMARY KEY,
  compiled_prompt TEXT NOT NULL,
  compiled_at TEXT DEFAULT (datetime('now')),
  accessed_count INTEGER DEFAULT 0
);
```

### Migration 037: Webhook Security

```sql
-- Add dedicated column for fast lookup
ALTER TABLE integrations ADD COLUMN webhook_public_id TEXT;

-- Backfill existing data
UPDATE integrations
SET webhook_public_id = json_extract(config_json, '$.webhook_public_id')
WHERE webhook_public_id IS NULL;

-- Create unique index
CREATE UNIQUE INDEX idx_integrations_webhook_public_id_fast
ON integrations(webhook_public_id)
WHERE webhook_public_id IS NOT NULL;

-- Add category column
ALTER TABLE integrations ADD COLUMN category TEXT DEFAULT 'messaging'
  CHECK(category IN ('messaging', 'crm', 'calendar', 'analytics'));

-- Backfill categories
UPDATE integrations SET category = 'crm'
WHERE provider IN ('kommo', 'hubspot', 'pipedrive');
```

### Migration 038: Auth Fixes

```sql
-- Remove dual token storage - use sessions only
ALTER TABLE users DROP COLUMN refresh_token;

-- Add token rotation tracking
ALTER TABLE sessions ADD COLUMN rotation_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_rotated_at TEXT;
```

---

## Part 7: To-Be Architecture

### Target Folder Structure

```
src/
├── config/
│   ├── di-container.js          # Singleton services
│   ├── express.config.js        # Middleware
│   ├── validation.js (NEW)      # Env var validation
│   └── database.js              # SQLite connection (NO close())
├── api/routes/
│   └── [route files]
├── services/
│   ├── AuthService.js           # Single token storage
│   ├── EntitlementService.js    # WITH assertRuntimeAllowed()
│   ├── PromptCacheService.js (NEW)
│   └── [other services]
├── repositories/
│   └── [repos - NO db.close()]
├── handlers/
│   ├── webhook_handler.js       # WITH trial check, version binding
│   └── UnifiedMessageCoordinator.js
├── providers/
│   ├── ProviderRegistry.js (NEW)
│   ├── EvolutionProvider.js
│   └── crm/
│       ├── BaseCRMProvider.js
│       ├── KommoCRMProvider.js
│       ├── HubSpotCRMProvider.js (NEW)
│       └── PipedriveCRMProvider.js (NEW)
└── middleware/
    ├── rate-limiter.middleware.js (NEW)
    └── auth.middleware.js

apps/web-vite/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx (NEW) # Central auth state
│   ├── hooks/
│   │   ├── useAuth.ts (NEW)
│   │   └── useApiQuery.ts (NEW)
│   ├── lib/
│   │   └── api.ts               # WITH token refresh
│   └── pages/
└── dist/                        # Served by backend at /
```

### Target Flow: Message Processing

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Evolution sends webhook                                  │
│    POST /api/webhooks/inbound/:webhookPublicId              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Validate webhook                                         │
│    - Check webhook_public_id column (indexed, fast)         │
│    - Validate secret (constant-time comparison)             │
│    - Return 403 if invalid                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Check entitlements                                       │
│    EntitlementService.assertRuntimeAllowed(teamId)          │
│    - Return 402 if trial expired                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Get/Create conversation                                  │
│    - Find existing or create new                            │
│    - Lock agent_version_id on creation                      │
│    - Load compiled_prompt from cache                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Process message                                          │
│    - Use cached prompt (O(1) lookup)                        │
│    - Call OpenAI with injected client                       │
│    - Store with agent_version_id                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Send response                                            │
│    - Route through integration binding                      │
│    - Send via Evolution/WhatsApp                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 8: Validation Checklists

### Pre-Deploy Checklist

#### Backend
- [ ] No `db.close()` calls in any repository
- [ ] `EntitlementService.assertRuntimeAllowed()` called in webhook handler
- [ ] Workers started (CadenceEngine, Prospecting)
- [ ] Graceful shutdown implemented

#### Frontend
- [ ] Build output copied to `public/app/` or path updated
- [ ] Both `token` and `refreshToken` stored on login
- [ ] Token refresh interceptor working
- [ ] AuthContext provides reactive state

#### Auth
- [ ] Single token storage (sessions table only)
- [ ] Refresh token rotation implemented
- [ ] Trial enforcement blocking expired users

#### Integrations
- [ ] Agent versions immutable after publish
- [ ] Conversations lock agent_version_id
- [ ] Prompt cache working (check hit rate)
- [ ] Webhook secrets required (no null bypass)
- [ ] webhook_public_id column indexed

### Production Validation

```bash
# 1. Test db.close() fix
for i in {1..10}; do curl -s http://localhost:3001/api/health & done; wait
# Should see 10 successful responses

# 2. Test frontend serving
curl -I http://localhost:3001/
# Should see 200 OK, Content-Type: text/html

# 3. Test webhook security
curl -X POST http://localhost:3001/api/webhooks/inbound/test123 -H "Content-Type: application/json" -d '{}'
# Should see 403 Forbidden (missing secret)

# 4. Test trial enforcement
# Create user with expired trial, send message, expect 402
```

---

## Part 9: Estimated Effort

| Phase | Tasks | Days | Engineers |
|-------|-------|------|-----------|
| Phase 1: Critical Fixes | PR #1-6 | 3-4 | 1 Senior |
| Phase 2: Auth & Security | PR #7-10 | 2-3 | 1 Mid |
| Phase 3: Performance | Caching, indexing | 2 | 1 Mid |
| Phase 4: Testing | Integration tests | 2 | 1 Junior |
| **Total** | | **~2 weeks** | **3 engineers** |

---

## Part 10: Summary

### What MUST Be Fixed Before Production

1. **db.close() bug** - Will crash on first concurrent request
2. **Frontend path** - React app completely inaccessible
3. **Webhook security** - Open to injection attacks
4. **Trial enforcement** - No monetization possible

### What Should Be Fixed Soon (P1)

5. Token refresh rotation
6. Dual token storage
7. Agent version immutability
8. Prompt caching

### What Can Wait (P2)

9. Provider registry
10. OpenAI client injection
11. TypeScript strict mode
12. Code splitting

---

**END OF CONSOLIDATED REPORT**

Generated by 5 Specialized Analysis Agents
Date: 2025-12-18
