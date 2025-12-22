# Stack Governance (Canonical vs Deprecated)

This repo has multiple parallel stacks. To prevent drift, only the canonical stack
may receive new features. Deprecated stacks are read-only and may be removed
after migration.

## Canonical Decisions (Non-Negotiable)

- HTTP routes: `src/api/routes`
- Migrations/schema: `src/db/migrations`
- Agents/personalization: `src/agents` + `src/services`

## Deprecated / Read-Only Stacks

- `src/scalable/**`
- `src/platform/**`
- `src/v2/**`

Any changes under deprecated stacks must be limited to bugfixes or migration
shims. New features must be implemented in the canonical stack only.

## Enforcement

- `npm run lint:stacks` blocks new route definitions outside `src/api/routes`
  unless explicitly allowlisted as legacy.
- Deprecated stacks must include `STACK_DEPRECATED_OK` markers for legacy
  route files.

## Migration Order (Incremental)

1. Integrations (Evolution/CRM)
2. Agents (config/version/publish)
3. Conversations/Messages
4. Automations/Intelligence

Each domain should keep one canonical route, add temporary shims if needed, and
remove legacy endpoints after telemetry confirms no usage.
