# LEADLY AI Agent - System Verification Report

**Generated:** 2025-12-23
**Status:** PARTIALLY READY

---

## Executive Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Environment Variables | OK | JWT_SECRET, OPENAI_API_KEY configured |
| Database Schema | OK | 87 tables, 57 migrations executed |
| Migration Files | WARNING | 10 duplicate prefixes (see below) |
| SPA Frontend | NOT DEPLOYED | `public/app/` empty (0 files) |
| Auth Flow | OK | login/logout/refresh routes at lines 300/337/359 |
| Webhooks | OK | Returns 200 (pragmatic choice, see rationale) |
| Health/Metrics | OK | All endpoints present |

### Auditable Evidence

```bash
$ sqlite3 orbion.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
87

$ sqlite3 orbion.db "SELECT COUNT(*) FROM _migrations;"
57

$ ls -la public/app/ | wc -l
0

$ ls src/db/migrations/*.{sql,js} | xargs basename | cut -d_ -f1 | sort | uniq -c | awk '$1>1'
   2 001
   2 003
   2 004
   2 005
   2 007
   2 020
   2 025
   2 036
   2 039
   2 040
```

---

## 1. Environment Variables

### Required Variables Check

| Variable | Status | Location |
|----------|--------|----------|
| `JWT_SECRET` | SET | .env:106 (64-byte hex string) |
| `JWT_EXPIRES_IN` | SET | .env:107 (24h) |
| `JWT_REFRESH_EXPIRES_IN` | SET | .env:108 (7d) |
| `OPENAI_API_KEY` | SET | .env:2 |
| `EVOLUTION_BASE_URL` | SET | .env:10 (localhost:8080) |
| `EVOLUTION_API_KEY` | SET | .env:11 |
| `INTEGRATION_ENCRYPTION_KEY` | SET | .env:109 |
| `PUBLIC_BASE_URL` | NOT SET | Required in production |

### Critical Security Check
- `JWT_SECRET` is properly configured (64-byte random hex)
- Auth middleware validates JWT_SECRET at module load (`src/middleware/auth.middleware.js:12`)
- AuthService throws error in production if missing (`src/services/AuthService.js:28`)

---

## 2. Database Migrations

### Migration Status
- **Database:** `orbion.db` (SQLite)
- **Tables:** 87 tables created
- **Migrations Executed:** 57 migrations in `_migrations` table

### Critical Tables Present
All 8 critical tables exist:
- `leads`, `users`, `teams`, `sessions`, `agents`, `integrations`, `pipeline_stages`, `_migrations`

### ISSUE: Duplicate Migration Prefixes
**10 migration number collisions detected:**

| Prefix | Files |
|--------|-------|
| 001 | `001_create_accounts.sql`, `001_add_performance_indexes.sql` |
| 003 | `003_create_leads.sql`, `003_prospect_leads.js` |
| 004 | `004_create_opportunities.sql`, `004_pattern_applier.js` |
| 005 | `005_create_activities.sql`, `005_delivery_tracking.sql` |
| 007 | `007_create_meetings.sql`, `007_add_last_response_at.sql` |
| 020 | `020_extend_leads_cadence.sql`, `020_add_company_sector_to_users.sql` |
| 025 | `025_multi_tenancy.sql`, `025_multi_tenancy_simple.sql` |
| 036 | `036_anti_abuse_enhancements.sql`, `036_agent_versions_immutability.sql` |
| 039 | `039_tenant_id_canonical.sql`, `039_add_tenant_id_aliases.js` |
| 040 | `040_add_tenant_to_cadence.js`, `040_add_tenant_id_learning_tables.js` |

**WARNING:** Do NOT rename existing migration files in production - this breaks the `_migrations` history and causes drift.

**Correct approach:**
1. Leave existing migration files unchanged
2. If schema needs fixing, create NEW migrations with higher numbers (e.g., 057_fix_xxx.sql)
3. Use idempotent SQL (CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN with error handling)
4. The migrate.js already handles execution order via `parseOrder()` weight system

### Drift Detection
The `migrate.js` includes schema drift detection via:
- `detectSchemaDrift()` - checks critical tables and columns
- `validateSchemaOrFail()` - fails boot on drift in production
- Critical columns validated: leads, users, agents, pipeline_stages, inbound_events, async_jobs, workspaces

---

## 3. SPA Frontend

### Status: NOT DEPLOYED

| Path | Status |
|------|--------|
| `apps/web-vite/src/` | EXISTS (React 19 + Vite 7 source) |
| `apps/web-vite/dist/` | EXISTS (Built: index.html + assets/) |
| `public/app/` | EMPTY (Express serves from here) |

### Build Configuration
- **Vite config:** `apps/web-vite/vite.config.ts`
- **Base path:** `/app/` (correct)
- **Build command:** `npm run build` in apps/web-vite/
- **Missing:** Deployment script to copy `dist/` to `public/app/`

### Fix Required
```bash
# Deploy SPA to public/app/
cp -r apps/web-vite/dist/* public/app/
```

---

## 4. Authentication Flow

### Routes Verified (auth.routes.js)

| Endpoint | Line | Auth | Status |
|----------|------|------|--------|
| `POST /api/auth/login` | 300 | None | OK |
| `POST /api/auth/logout` | 337 | authenticate | OK |
| `POST /api/auth/refresh` | 359 | None | OK |
| `POST /api/auth/register` | 109 | registrationRateLimit | OK |
| `GET /api/auth/me` | 389 | authenticate | OK |
| `PUT /api/auth/password` | 450 | authenticate | OK |
| `GET /api/auth/sessions` | 487 | authenticate | OK |
| `DELETE /api/auth/sessions` | 508 | authenticate | OK |
| `GET /api/auth/entitlements` | 529 | authenticate | OK |
| `POST /api/auth/verify` | 583 | None | OK |

### JWT Implementation
- Library: jsonwebtoken
- Secret validation at startup
- Access token: 24h expiry
- Refresh token: 7d expiry
- Sessions stored in `sessions` table

---

## 5. Webhook Endpoints

### Canonical Endpoint
**`POST /api/webhooks/inbound/:webhookPublicId`** (webhooks-inbound.routes.js:42)

| Feature | Status |
|---------|--------|
| Secret validation | header `x-webhook-secret` or signature |
| Idempotency | `inbound_events` table with provider_event_id |
| Async processing | Jobs enqueued to `async_jobs` table |
| Response code | 200 (intentional to prevent retries) |
| Legacy pipeline | LEGACY_WEBHOOK_PIPELINE env flag |

### Response Code Rationale

The endpoint returns **200** instead of **202** (async accepted). This is documented in code:

```javascript
// webhooks-inbound.routes.js:71
// Return 200 to avoid retries (but log the error)

// webhooks-inbound.routes.js:257
// Still return 200 to avoid retries
```

**Reasoning:** Evolution API and some webhook providers interpret non-200 responses as failures and retry aggressively. Returning 200 prevents duplicate processing even when errors occur internally.

**Trade-off:** Semantically, 202 Accepted is more correct for async pipelines. However, the pragmatic choice of 200 prioritizes reliability over REST purity.

### Deprecated Endpoint
**`POST /api/webhook/evolution`** (webhook.routes.js:78)
- Returns 410 Gone
- Message: "Use /api/webhooks/inbound/:webhookPublicId"

---

## 6. Health & Metrics Endpoints

### Health Routes (health.routes.js)

| Endpoint | Line | Purpose |
|----------|------|---------|
| `GET /health` | 44 | Load balancer check (200/503) |
| `GET /health/detailed` | 87 | Full component health |
| `GET /health/ready` | 129 | K8s readiness probe |
| `GET /health/live` | 178 | K8s liveness probe |
| `GET /api/version` | 193 | Build/version info |

### Metrics Routes (metrics.routes.js)

| Endpoint | Line | Auth | Purpose |
|----------|------|------|---------|
| `GET /api/metrics` | 32 | None | All performance metrics |
| `GET /api/metrics/summary` | 51 | None | Lightweight summary |
| `POST /api/metrics/reset` | 70 | None (NEEDS_AUTH) | Reset metrics |

### Config Issues Checked
- `PUBLIC_BASE_URL` required in production (line 32-36)

---

## 7. Worker/Jobs System

### Tables Present
- `async_jobs` - Job queue for async processing
- `inbound_events` - Staged webhook events

### Worker Mode
- Start with: `ROLE=worker node src/server.js`
- Or: `npm run worker`
- Job types: MESSAGE_PROCESS, etc.
- Priority levels: HIGH, NORMAL
- Max retries: 3
- Timeout: 120 seconds

---

## 8. Pending Migrations (Untracked)

Files in `src/db/migrations/` not yet in `_migrations` table:
- `048_add_performance_indexes.sql`
- `049_prospect_leads.js`
- `050_pattern_applier.js`
- `051_delivery_tracking.sql`
- `052_add_last_response_at.sql`
- `053_add_company_sector_to_users.sql`
- `054_agent_versions_immutability.sql`
- `055_add_tenant_id_aliases.js`
- `056_add_tenant_id_learning_tables.js`

These appear to be staged for next deployment.

---

## Action Items

### P0 - Critical
1. **Deploy SPA:** Copy `apps/web-vite/dist/*` to `public/app/`
2. **Set `PUBLIC_BASE_URL`** before production deployment

### P1 - High
3. **Add authentication to `POST /api/metrics/reset`** - currently unprotected
4. **Run pending migrations** (048-056) if not yet applied

### P2 - Medium
5. Add authentication to routes in `funil.routes.js` (11 unprotected routes)
6. Add authentication to routes in `whatsapp.routes.js` (6 unprotected routes)
7. Review and clean up duplicate routes per `docs/routes-audit.csv`

### DO NOT DO
- **Do NOT rename/renumber existing migration files** - this breaks `_migrations` history
- If schema fixes are needed, create NEW migrations with higher numbers

---

## Verification Commands

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate

# Deploy SPA
cp -r apps/web-vite/dist/* public/app/

# Start server
npm start

# Start worker
npm run worker

# Health check
curl http://localhost:3001/health
curl http://localhost:3001/health/ready
curl http://localhost:3001/api/version
```
