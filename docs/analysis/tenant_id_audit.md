# Tenant Id Audit

Status: in progress

## Canonical

- Canonical id: tenant_id / tenantId
- Legacy id: team_id / teamId (allowed only in legacy tables + compat layer)

## Legacy Allowlist (tables)

- users.team_id
- user_teams.team_id
- billing_events.team_id
- usage_metrics.team_id
- user_trial_grants.first_team_id

## Code Hotspots Using team_id / teamId

These are the main code paths still referencing legacy naming:

- src/services/AuthService.js (register uses teamId as legacy input)
- src/api/routes/auth.routes.js (create-user uses teamId as legacy input)
- src/services/EntitlementService.js (logs/parameters use teamId naming)
- src/models/User.js, src/models/Team.js (legacy team/user_teams tables)
- src/utils/tenantCompat.js (compat layer)
- src/middleware/auth.middleware.js (legacy JWT alias)
- src/middleware/tenant.middleware.js (req.teamId alias)

## Tenant Guardrail (lint:tenant)

Current guardrail output indicates missing tenant filters in:

- webhook_handler / WebhookTransactionManager
- automation engines (EmailOptInEngine, ProspectingEngine, engine.js)
- memory.js and conversation analytics
- repositories/models for leads, contacts, opportunities, activities

These need tenant_id filters or an explicit tenant-guard ignore marker with a
justification.

## Actions in this pass

- Aligned auth register/create-user inputs to canonical tenant_id with legacy alias.
- Reduced use of req.user.teamId in agents rate limiter.
- Documented legacy allowlist in ARCHITECTURE_DECISIONS.md.
