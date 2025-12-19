# ETAPA 3 — Jobs / Worker

## 1) Jobs iniciados pelo server

- `startAbandonmentDetectionJob()` e iniciado no boot HTTP. Evidencia: `src/server.js:265-274`.
- `startProspectSyncJob()` e iniciado no boot HTTP (a cada 30 min). Evidencia: `src/server.js:276-282`.
- `getAutoOptimizer().start()` e iniciado no boot HTTP. Evidencia: `src/server.js:284-288`.
- `getDataSyncService().initialize()` e iniciado no boot HTTP. Evidencia: `src/server.js:269-273`.

## 2) Jobs iniciados pelo worker

- `src/worker.js` inicializa o mesmo conjunto de jobs (Cadence, Prospecting, Abandonment, Prospect Sync, AutoOptimizer, DataSync). Evidencia: `src/worker.js:118-195`.

## 3) Risco de duplicidade

- Se o server HTTP e o worker forem executados simultaneamente, os jobs sao iniciados duas vezes (server + worker). Isso pode gerar execucao duplicada de cadencias, sync e detectores. Evidencia: `src/server.js:207-288` e `src/worker.js:138-195`.

## 4) Observacoes

- O worker possui stop handlers para engines, mas o server nao separa claramente o modo (API vs worker). Evidencia: `src/worker.js:80-100`.
