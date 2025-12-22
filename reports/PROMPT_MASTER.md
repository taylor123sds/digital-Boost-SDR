# Premissas obrigatorias

- So afirmar algo se puder citar evidencia com arquivo:linha.
- Gerar inventario do repo antes de concluir qualquer coisa.
- Separar “existe no codigo” vs “esta wired/ativo no runtime”.
- Separar local vs VPS como hipotese: se nao tiver acesso ao servidor, so apontar risco e como verificar.

# Prompt mestre

Voce e um auditor tecnico do codebase. Analise TODO o repositorio (backend + frontends + deploy + migrations) e produza um mapa completo de comunicacao entre arquivos JS/TS (imports + chamadas em runtime + fluxos de request) e um checklist de correcoes priorizado.

Regras:
1) Nao faca suposicoes. Toda afirmacao deve ter evidencia com "caminho/do/arquivo:linha".
2) Diferencie claramente: (a) codigo existente vs (b) codigo realmente conectado no runtime.
3) Liste conflitos entre stacks paralelas: src/ (legacy) vs src/scalable/ vs src/platform/ (se existirem).
4) Gere artefatos em Markdown dentro de /reports, com nomes fixos (abaixo).

Entregaveis (obrigatorios):

/reports/00-inventory.md
- estrutura real do repo (arvore resumida), entrypoints, frontends, stacks paralelas, contagem de arquivos JS/TS, bibliotecas chave.

/reports/01-backend-express.md
- bootstrap do servidor (server.js/worker.js), DI container, middleware order, montagem de rotas, duplicidades, motivos de 404/contrato quebrado, e riscos operacionais.

/reports/01-backend-routes.md
- tabela completa de rotas: metodo + path + middlewares + handler + arquivo origem.
- detectar rotas duplicadas/override.
- destacar rotas usadas pelo frontend que nao existem no backend.

/reports/02-webhook-pipeline.md
- pipeline end-to-end do inbound (Evolution e outros): validacao → staging → queue → worker → persistencia → outbound.
- provar se MESSAGES_UPSERT entra no pipeline canonico.
- idempotencia/dedup/race conditions: onde estao garantidas e onde nao.

/reports/03-jobs-worker.md
- jobs: quem enfileira, quem processa, se roda no server e no worker, duplicidade, retries, dead-letter, locking.

/reports/04-frontends.md
- apps/web-vite (base /app) e apps/web (Next base /): rotas, auth flow, baseURL, endpoints consumidos, contract gaps FE↔BE, e por que o login da 404 se aplicavel.

/reports/05-data-integrations.md
- mapa de integracoes: Evolution, Google OAuth, CRMs (Kommo etc.), tokens/storage/refresh, webhooks, secrets, falhas comuns.
- endpoints + services + providers relacionados.

/reports/06-deliverables.md
- resumo executivo: P0/P1/P2 com evidencia.
- plano de acao executavel (ordem de correcao que minimiza regressao).
- checklist de validacao (testes manuais e automatizados).

Alem disso, gere:
- /reports/ARTIFACTS_IMPORT_GRAPH.md: grafo de imports (top centralidade + ciclos).
- /reports/ARTIFACTS_DB_SCHEMA_AND_QUERIES.md: schema + tabelas multi-tenant + queries suspeitas.
- /reports/ARTIFACTS_FRONT_BACK_CONTRACT.md: matriz FE paths → BE routes (match/mismatch) com evidencia.

Criterios de severidade:
P0: perda de mensagens, vazamento multi-tenant, drift de deploy, pipeline incompleto.
P1: quebras de UX/contrato FE↔BE, rotas duplicadas, auth inconsistente.
P2: acoplamento/ciclos, performance, observabilidade, melhorias.

Comece por 00-inventory antes de qualquer conclusao.

# Prompts por agente (paralelo)

Agente 1 — Backend Architecture (Express/DI/Routes/Stacks)
Analise o backend inteiro com foco em: entrypoints, DI container, ordem de middleware, montagem de rotas, stacks paralelas (legacy/scalable/platform) e conflitos de “fonte de verdade”.

Entregue em /reports/01-backend-express.md e /reports/01-backend-routes.md:
- Como o server sobe (server.js) e se injeta container (app.set / req.app.get).
- Lista completa de rotas (metodo+path+middlewares+handler+arquivo).
- Deteccao de rotas duplicadas/overrides e explicacao do impacto.
- “Mismatch FE↔BE”: identifique endpoints esperados pelo frontend que nao existem (e vice-versa).
Tudo com evidencia arquivo:linha.

Agente 2 — Frontend React/Next (rotas, auth, baseURL, contrato)
Analise apps/web-vite e apps/web (Next). Gere /reports/04-frontends.md e /reports/ARTIFACTS_FRONT_BACK_CONTRACT.md.

Objetivo:
- Mapear paginas/rotas (principalmente /app/*), auth flow (login/register/refresh), baseURL do cliente HTTP, e lista de endpoints consumidos.
- Comparar com o inventario real do backend e marcar: OK / MISSING / WRONG METHOD / WRONG PATH / WRONG PARAMS.
- Identificar exatamente por que ocorre 404 no login (qual endpoint o FE chama, qual o BE expoe, e onde diverge).
Evidencia sempre em arquivo:linha.

Agente 3 — Webhook Pipeline + Jobs (cutover, idempotencia, wiring)
Analise o pipeline de inbound (Evolution e outros), staging (inbound_events), fila (async_jobs), worker/processors e orquestracao do agente.

Gere /reports/02-webhook-pipeline.md e /reports/03-jobs-worker.md:
- Quais endpoints inbound existem (legacy vs multi-tenant), quais event types entram, e se MESSAGES_UPSERT e encaminhado ao pipeline canonico.
- Onde acontece validacao, dedup, staging, enqueue, processamento, persistencia.
- Se o server HTTP e o worker executam o mesmo job (duplicidade).
- Garantias de idempotencia (UNIQUE, provider_message_id, dedup_key) e onde faltam.
Sempre com arquivo:linha e fluxo Mermaid (opcional).

Agente 4 — Integrations (Evolution, Google OAuth, CRMs Kommo etc.)
Mapeie todas as integracoes externas e como elas se conectam ao app.

Gere /reports/05-data-integrations.md:
- Evolution: criacao de instancia, geracao de QR code, webhook setup, status/connection_update, onde salva tokens/ids, e endpoints usados pelo frontend.
- Google OAuth: endpoints, state storage, callback, refresh token, scopes, onde guarda tokens, e como expoe no app.
- CRMs (Kommo e outros): arquitetura provider/adapter, autenticacao (OAuth/API key), sync jobs, webhooks, rate limits.
- Liste riscos: token refresh ausente, storage inseguro, secrets plaintext, replay attack, etc.
Tudo com evidencia arquivo:linha.

Agente 5 — Deploy/Drift/Migrations/DB paths (o que causa drift e como provar)
Analise Dockerfile(s), docker-compose, volumes, caminhos do DB (DATABASE_PATH), e fluxo de migrations. Objetivo: provar por que ocorre drift e como eliminar.

Gere /reports/00-inventory.md (secao deploy) e /reports/06-deliverables.md (plano):
- Se src/ esta baked na imagem e nao montado como volume.
- Se existem multiplos DBs montados e qual e usado de fato.
- Se migrations rodam no boot ou so validam tabelas, e onde isso esta definido.
- Recomendar modelo imutavel (tags por commit) e “deploy migrate”.
Evidencia arquivo:linha.

# Pedido operacional para varreduras (terminal)

Se houver terminal disponivel, rode varreduras para suportar a analise:
- listar arvore e stats (arquivos JS/TS)
- grep/rg de app.use, Router, endpoints de auth, webhooks, evolution, oauth
- detectar ciclos de import (madge ou analise estatica)
- extrair rotas Express via parsing dos arquivos de routes
- construir mapa FE→BE buscando strings de endpoints no frontend
Inclua resultados relevantes no relatorio, mas sempre conecte com arquivo:linha no codigo.

# Checklist de perguntas

Rotas: existe rota? esta montada? middleware correto? duplicada?

FE: qual endpoint exato o FE chama? baseURL? headers? path params?

Webhooks: qual endpoint o provider usa em producao? quais eventos entram? MESSAGES_UPSERT passa por staging+queue?

Jobs: quem enfileira? quem processa? roda duplicado? retries/dlq?

Multi-tenant: onde o tenant e extraido? como entra nas queries? existe fail-closed?

DB: schema/migrations estao sincronizados? _migrations existe? DB path unico?

Deploy: imagem tagueada? latest? src baked? volumes corretos?

# Frase curta (atalho)

Codex: analise o repo inteiro (backend + frontends + deploy + DB) e gere os relatorios /reports/00..06 conforme o spec. Nao conclua nada sem evidencia com arquivo:linha. Seu foco e mapear comunicacao entre arquivos (imports + chamadas runtime), rotas, pipelines (webhook/jobs), integracoes (Evolution/OAuth/CRMs) e causas de drift entre local e VPS.
