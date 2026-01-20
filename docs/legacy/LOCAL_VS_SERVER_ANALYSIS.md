# Agent 5: Local vs Server Analysis

**Date:** 2025-12-18
**Server:** Hetzner VPS 5.161.229.221
**Stack:** Docker (leadly_agent container)

---

## 1. Server Infrastructure

### 1.1 Running Services

| Container | Image | Port | Status |
|-----------|-------|------|--------|
| `leadly_agent` | orbion-leadly | 3001 | ✅ Healthy |
| `evolution_api` | atendai/evolution-api | 8080 | ⚠️ Unhealthy |
| `evolution_postgres` | postgres:15-alpine | 5432 | ✅ Healthy |
| `evolution_redis` | redis:7-alpine | 6379 | ✅ Healthy |
| `traefik` | traefik:v2.11.3 | 80, 443 | ✅ Running |
| `n8n_*` | n8nio/n8n:1.117.3 | 5678 | ✅ Running |
| `portainer` | portainer/portainer-ce | 9443 | ✅ Running |

### 1.2 Paths

| Component | Local Path | Server Path |
|-----------|------------|-------------|
| Project Root | `/Users/.../agent-js-starter/` | `/opt/orbion/` |
| Database | `orbion.db` (root) | `/opt/orbion/data/orbion.db` |
| Frontend Build | `apps/web-vite/dist/` | `/opt/orbion/public/app/` ✅ |
| Logs | `logs/` | `/opt/orbion/logs/` |

---

## 2. Critical Differences

### 2.1 Missing Migrations (SERVER)

**Local: 35 migrations | Server: 27 migrations**

| Migration | Purpose | Impact if Missing |
|-----------|---------|-------------------|
| `029_integration_webhook_fields.sql` | webhook_public_id, webhook_secret | ❌ CRM integrations broken |
| `031_inbound_events.sql` | Staging queue table | ❌ No message retry |
| `032_async_jobs.sql` | Background job queue | ❌ No async processing |
| `033_provider_message_id.sql` | Deduplication field | ❌ Duplicate messages |
| `034_race_condition_fixes.sql` | Contact locking | ❌ Race conditions |
| `035_conversation_contexts.sql` | Context persistence | ❌ Lost context |

### 2.2 Missing Tables (SERVER DATABASE)

```
❌ inbound_events       - NOT EXISTS
❌ async_jobs           - NOT EXISTS
❌ agent_versions       - NOT EXISTS  (critical for versioning)
❌ integrations         - NOT EXISTS  (critical for multi-tenant)
❌ integration_bindings - NOT EXISTS  (critical for agent routing)
❌ oauth_states         - NOT EXISTS  (critical for CRM OAuth)
❌ team_members         - NOT EXISTS  (critical for multi-workspace)
```

### 2.3 Routes Count Difference

| Component | Local | Server |
|-----------|-------|--------|
| routes/index.js lines | 148 | 143 |
| Route files count | 47 | 34 |
| Total routes | 299 | ~250 |

**Missing route files on server:**
- `channels.routes.js` (Evolution one-click connect)
- `webhooks-inbound.routes.js` (Multi-tenant webhooks)
- `crm-integration.routes.js` (Kommo/HubSpot OAuth)
- `prospecting.routes.js` (Auto prospecting)
- And 9+ more

---

## 3. Bug Status Comparison

### 3.1 db.close() Bug

| Metric | Local | Server |
|--------|-------|--------|
| Instances in lead.repository.js | 12 | 12 |
| **Status** | ❌ EXISTS | ❌ EXISTS |

**Evidence (Server):**
```
$ grep -n 'db.close' /opt/orbion/src/repositories/lead.repository.js
201:      db.close();
213:      db.close();
231:      db.close();
275:      db.close();
312:      db.close();
334:      db.close();
353:      db.close();
369:      db.close();
403:      db.close();
491:      db.close();
511:      db.close();
549:      db.close();
```

### 3.2 Trial Enforcement

| Check | Local | Server |
|-------|-------|--------|
| EntitlementService.assertRuntimeAllowed() exists | ✅ Line 172 | ✅ Line 172 |
| Called in webhook_handler.js | ❌ NO | ❌ NO |
| **Status** | ❌ NOT ENFORCED | ❌ NOT ENFORCED |

### 3.3 Frontend Serving

| Check | Local | Server |
|-------|-------|--------|
| Build exists at apps/web-vite/dist/ | ✅ | ✅ |
| Build copied to public/app/ | ❌ | ✅ |
| Express serves /app/* | ✅ | ✅ |
| **Status** | ❌ BROKEN LOCALLY | ✅ WORKS ON SERVER |

---

## 4. Configuration Differences

### 4.1 Environment Variables

| Variable | Server Value | Note |
|----------|--------------|------|
| NODE_ENV | production | ✅ Correct |
| PORT | 3001 | ✅ Correct |
| JWT_EXPIRES_IN | 24h | ✅ Correct |
| JWT_REFRESH_EXPIRES_IN | 7d | ✅ Correct |
| OPENAI_CHAT_MODEL | gpt-4o-mini | ✅ Cost-effective |
| EVOLUTION_BASE_URL | http://evolution_api:8080 | ✅ Docker internal |
| ALLOWED_ORIGINS | evozap.boostering.online, 5.161.229.221:3001 | ✅ Correct |

### 4.2 Database Configuration

| Setting | Local | Server |
|---------|-------|--------|
| Path | `./orbion.db` | `/opt/orbion/data/orbion.db` |
| Volume mounted | N/A | ✅ Persistent |
| Tables count | ~70 | ~50 |

---

## 5. Evolution API Issues

**Status: UNHEALTHY**

**Docker Logs:**
```
error: undefined,
stack: 'AggregateError
    at AxiosError.from (/evolution/node_modules/axios/dist/node/axios.cjs:877:14)
    at RedirectableRequest.handleRequestError
```

**Possible Causes:**
1. Network connectivity issue between containers
2. WhatsApp session expired
3. Instance not properly configured

**Impact:**
- WhatsApp messages may not be sent/received
- QR code generation may fail
- Webhook delivery unreliable

---

## 6. Deployment Gap Analysis

### What Needs to Be Deployed

#### Priority 1: Database Migrations
```bash
# SSH to server and run missing migrations
ssh root@5.161.229.221
docker exec -it leadly_agent sh
cd /opt/orbion

# Run migrations manually
sqlite3 data/orbion.db < src/db/migrations/029_integration_webhook_fields.sql
sqlite3 data/orbion.db < src/db/migrations/031_inbound_events.sql
sqlite3 data/orbion.db < src/db/migrations/032_async_jobs.sql
sqlite3 data/orbion.db < src/db/migrations/033_provider_message_id.sql
sqlite3 data/orbion.db < src/db/migrations/034_race_condition_fixes.sql
sqlite3 data/orbion.db < src/db/migrations/035_conversation_contexts.sql
```

#### Priority 2: Fix db.close() Bug
```bash
# Create fix script
cat > fix_db_close.sh << 'EOF'
#!/bin/bash
# Remove db.close() from all repositories
find src/repositories -name "*.js" -exec sed -i 's/db\.close();//g' {} \;
EOF
chmod +x fix_db_close.sh
./fix_db_close.sh
```

#### Priority 3: Add Missing Route Files
```bash
# Copy missing files from local to server
scp src/api/routes/channels.routes.js root@5.161.229.221:/opt/orbion/src/api/routes/
scp src/api/routes/webhooks-inbound.routes.js root@5.161.229.221:/opt/orbion/src/api/routes/
scp src/api/routes/crm-integration.routes.js root@5.161.229.221:/opt/orbion/src/api/routes/
```

#### Priority 4: Rebuild Docker Image
```bash
# On server
cd /opt/orbion
docker-compose build leadly_agent
docker-compose up -d leadly_agent
```

---

## 7. Risk Assessment

### High Risk (Immediate Action)

| Issue | Risk Level | Impact | Action |
|-------|------------|--------|--------|
| db.close() bug | 🔴 CRITICAL | Crash on concurrent requests | Fix immediately |
| Missing migrations | 🔴 CRITICAL | Features broken | Run migrations |
| Evolution unhealthy | 🟠 HIGH | WhatsApp down | Investigate logs |

### Medium Risk (This Week)

| Issue | Risk Level | Impact | Action |
|-------|------------|--------|--------|
| Trial not enforced | 🟠 HIGH | Revenue loss | Add assertRuntimeAllowed() |
| Missing routes | 🟠 HIGH | Features unavailable | Deploy new routes |
| No refresh rotation | 🟡 MEDIUM | Security risk | Implement rotation |

### Low Risk (Next Sprint)

| Issue | Risk Level | Impact | Action |
|-------|------------|--------|--------|
| Local frontend broken | 🟡 MEDIUM | Dev experience | Fix build path |
| Route count mismatch | 🟢 LOW | Missing features | Sync codebase |

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] Backup database: `sqlite3 data/orbion.db ".backup backup_$(date +%Y%m%d).db"`
- [ ] Backup Docker image: `docker commit leadly_agent leadly_backup:$(date +%Y%m%d)`
- [ ] Test migrations locally on copy of production DB
- [ ] Create rollback script

### Deployment Steps

1. **Stop container (during low traffic)**
   ```bash
   docker-compose stop leadly_agent
   ```

2. **Run migrations**
   ```bash
   sqlite3 data/orbion.db < migrations/029_integration_webhook_fields.sql
   sqlite3 data/orbion.db < migrations/031_inbound_events.sql
   # ... etc
   ```

3. **Fix db.close() bug**
   ```bash
   find src/repositories -name "*.js" -exec sed -i 's/db\.close();//g' {} \;
   ```

4. **Copy missing files**
   ```bash
   # From local machine
   rsync -avz src/api/routes/ root@5.161.229.221:/opt/orbion/src/api/routes/
   rsync -avz src/services/ root@5.161.229.221:/opt/orbion/src/services/
   ```

5. **Rebuild and restart**
   ```bash
   docker-compose build leadly_agent
   docker-compose up -d leadly_agent
   ```

6. **Verify**
   ```bash
   docker logs leadly_agent --tail 50
   curl http://localhost:3001/api/health
   ```

### Post-Deployment Verification

- [ ] `/api/health` returns 200
- [ ] Dashboard loads at `/app/`
- [ ] Login works
- [ ] WhatsApp connection works
- [ ] Send test message
- [ ] Check for errors in logs

---

## 9. Sync Commands

### Full Codebase Sync (Careful!)
```bash
# From local machine - EXCLUDES sensitive files
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '*.db' \
  --exclude 'data/' \
  --exclude 'logs/' \
  --exclude 'uploads/' \
  /Users/taylorlpticloud.com/Desktop/agent-js-starter/ \
  root@5.161.229.221:/opt/orbion/
```

### Selective Sync (Safer)
```bash
# Only sync src/ directory
rsync -avz \
  --exclude 'node_modules' \
  /Users/taylorlpticloud.com/Desktop/agent-js-starter/src/ \
  root@5.161.229.221:/opt/orbion/src/

# Only sync migrations
rsync -avz \
  /Users/taylorlpticloud.com/Desktop/agent-js-starter/src/db/migrations/ \
  root@5.161.229.221:/opt/orbion/src/db/migrations/
```

---

## Summary

### Server Status: ⚠️ PARTIALLY OPERATIONAL

**What Works:**
- ✅ Container running and healthy
- ✅ Frontend served correctly
- ✅ Basic API endpoints
- ✅ Database accessible
- ✅ Health checks passing

**What's Broken:**
- ❌ db.close() will crash on load
- ❌ Trial enforcement missing
- ❌ 8 migrations not deployed
- ❌ 13+ route files missing
- ❌ Evolution API unhealthy
- ❌ Multi-tenant features unavailable

**Estimated Fix Time:**
- Emergency fixes (db.close, migrations): 2 hours
- Full sync with local: 4 hours
- Testing and verification: 2 hours
- **Total: 1 day**

---

**END OF REPORT**
