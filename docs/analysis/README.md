# Analise Completa do Projeto (Indice)

Este diretorio agrega a analise completa do projeto em duas camadas:

1) Etapas estruturadas (ETAPA 0-6)
2) Artefatos extensivos (ARTIFACTS_*.md)

## Etapas (ETAPA 0-6)

- `docs/analysis/00-inventory.md` — inventario do repo, entrypoints, mapa de modulos.
- `docs/analysis/01-backend-express.md` — boot, rotas criticas, riscos imediatos.
- `docs/analysis/01-backend-routes.md` — tabela completa de rotas Express.
- `docs/analysis/02-webhook-pipeline.md` — pipeline inbound + riscos.
- `docs/analysis/03-jobs-worker.md` — jobs e duplicidade server/worker.
- `docs/analysis/04-frontends.md` — mapas FE (Vite + Next) e API clients.
- `docs/analysis/05-data-integrations.md` — DB + integracoes (Evolution/CRM/Google/OpenAI).
- `docs/analysis/06-deliverables.md` — diagramas Mermaid + P0/P1/P2.

## Artefatos completos (ARTIFACTS_*.md)

Grafo/imports, contratos FE-BE, mapas de integracao, auditorias SQL, riscos e blockers, jobs, observabilidade e runbooks:

- `docs/analysis/ARTIFACTS_IMPORT_GRAPH.md`
- `docs/analysis/ARTIFACTS_BACKEND_API_MAP.md`
- `docs/analysis/ARTIFACTS_DATA_FLOW.md`
- `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`
- `docs/analysis/ARTIFACTS_INTEGRATIONS_MAP.md`
- `docs/analysis/ARTIFACTS_FRONTEND_COMMUNICATION_MAP.md`
- `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`
- `docs/analysis/ARTIFACTS_ENDPOINTS_ACTIVE.md`
- `docs/analysis/ARTIFACTS_ENV_MATRIX.md`
- `docs/analysis/ARTIFACTS_OBSERVABILITY_MAP.md`
- `docs/analysis/ARTIFACTS_JOBS_SCHEDULE.md`
- `docs/analysis/ARTIFACTS_HOT_TABLES_INDEXES.md`
- `docs/analysis/ARTIFACTS_EXTERNAL_CALLS.md`
- `docs/analysis/ARTIFACTS_FRONT_BACK_CONTRACT.md`
- `docs/analysis/ARTIFACTS_SECURITY_OPS.md`
- `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`
- `docs/analysis/ARTIFACTS_EVOLUTION_INBOUND_CALLGRAPH.md`
- `docs/analysis/ARTIFACTS_STAGING_CUTOVER.md`
- `docs/analysis/ARTIFACTS_MULTITENANT_AUDIT_REAL.md`
- `docs/analysis/ARTIFACTS_DEPLOY_RUNBOOK.md`
- `docs/analysis/ARTIFACTS_ALL_FINDINGS_CHECKLIST.md`

## Sugestao de leitura rapida

1) `docs/analysis/ARTIFACTS_RISKS_AND_BLOCKERS.md`
2) `docs/analysis/ARTIFACTS_FE_BE_CONTRACT_DIFF.md`
3) `docs/analysis/ARTIFACTS_INTEGRATIONS_MAP.md`
4) `docs/analysis/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md`
5) `docs/analysis/01-backend-routes.md`

