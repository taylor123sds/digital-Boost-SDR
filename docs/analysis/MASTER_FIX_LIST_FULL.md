# Master Fix List (FULL) — Inventario Exaustivo

Este arquivo lista TODOS os itens identificados nos MDs de analise, incluindo itens menores, com referencia direta aos artefatos. Para detalhes e evidencia granular, consulte os arquivos listados em cada secao.

## 1) Riscos e bloqueadores (P0/P1/P2)

Fonte principal:
- `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`

Itens a corrigir:
- Todos os P0/P1/P2 listados em `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`.

## 2) Contrato FE ↔ BE (gaps)

Fonte principal:
- `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`

Itens a corrigir:
- Todos os endpoints chamados pelo frontend que nao existem no backend.
- Todos os endpoints backend sem uso no frontend quando deveriam ser usados.
- Todos os conflitos de path/parametros entre FE e BE.

## 3) Mapa completo de rotas e duplicidades

Fonte principal:
- `docs/analysis/ARTIFACTS_BACKEND_API_MAP.md`

Itens a corrigir:
- Todas as rotas marcadas como DUPLICATE.
- Todas as rotas sem auth/tenant quando deveriam ter.
- Todas as rotas com DB direct access sem camada service/repo quando aplicavel.

## 4) Webhooks e pipeline

Fontes principais:
- `docs/analysis/ARTIFACTS_EVOLUTION_INBOUND_CALLGRAPH.md`
- `docs/analysis/ARTIFACTS_STAGING_CUTOVER.md`
- `docs/analysis/02-webhook-pipeline.md`

Itens a corrigir:
- Todos os pontos de drop/log-only no fluxo inbound.
- Qualquer handler legacy que nao persiste em `inbound_events` + `async_jobs`.
- Qualquer inconsistência entre webhook legacy e multi-tenant.

## 5) Multi-tenancy (SQL audit)

Fonte principal:
- `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`

Itens a corrigir:
- TODAS as queries marcadas como Suspeitas ou P0.
- Garantir filtros por `tenant_id`/`team_id` onde aplicavel.

## 6) Dados e schema (migrations/indices)

Fontes principais:
- `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`
- `docs/analysis/ARTIFACTS_HOT_TABLES_INDEXES.md`

Itens a corrigir:
- Indices faltantes listados.
- Constraints/unique sugeridos (idempotencia/race conditions).

## 7) Integracoes externas

Fontes principais:
- `docs/analysis/ARTIFACTS_INTEGRATIONS_MAP.md`
- `docs/analysis/ARTIFACTS_EXTERNAL_CALLS.md`
- `docs/analysis/05-data-integrations.md`

Itens a corrigir:
- Fluxos OAuth incompletos (HubSpot/Pipedrive).
- Validacao de webhook por provider (header/query/hmac).
- Refresh tokens e revoke incompletos.

## 8) Observabilidade e seguranca

Fontes principais:
- `docs/analysis/ARTIFACTS_OBSERVABILITY_MAP.md`
- `docs/analysis/ARTIFACTS_SECURITY_OPS.md`

Itens a corrigir:
- Falta de correlation id entre requests/jobs/events.
- Segredos em plaintext (secrets_json/webhook_secret).

## 9) Deploy, drift e ambiente

Fonte principal:
- `docs/analysis/ARTIFACTS_DEPLOY_RUNBOOK.md`

Itens a corrigir:
- Padronizar build/tag de imagem.
- Rodar migrations no startup.
- Garantir path unico para DB.

## 10) Frontend(s) e servico do build

Fonte principal:
- `docs/analysis/ARTIFACTS_FRONTEND_COMMUNICATION_MAP.md`

Itens a corrigir:
- Definir app oficial (Vite `/app` vs Next `/`).
- Ajustar baseURL e fallback SPA.

## 11) Inventario completo de imports/ciclos

Fonte principal:
- `docs/analysis/ARTIFACTS_IMPORT_GRAPH.md`

Itens a corrigir:
- Ciclos de dependencias (se indicados no grafo).
- God files com alto acoplamento.

## 12) Checklist geral

Fonte principal:
- `docs/analysis/ARTIFACTS_ALL_FINDINGS_CHECKLIST.md`

Itens a corrigir:
- Todos os itens listados no checklist consolidado.

