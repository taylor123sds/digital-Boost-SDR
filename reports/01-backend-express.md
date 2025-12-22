# Backend bootstrap (Express, DI, middleware, runtime wiring)

## Entrypoint and role control
- `src/server.js` is the active orchestrator with ROLE-based process control (`ROLE=api|worker|full`). Evidence: `src/server.js:56-65`.
- Express server only starts when `shouldStartAPI` is true; worker jobs only start when `shouldStartWorker` is true. Evidence: `src/server.js:284-329`.
- `src/worker.js` exists but is deprecated in its header; scripts still reference it. Evidence: `src/worker.js:1-21` and `package.json:12-19`.

## DI container and service locator
- The DI container is created in `src/server.js` and injected into Express via `app.set('container', container)`. Evidence: `src/server.js:220-224` and `src/server.js:292-295`.
- The ServiceLocator is initialized and attached to the app with `app.set('serviceLocator', serviceLocator)` before routes are mounted. Evidence: `src/server.js:297-302`.

## Express middleware order (as wired in runtime)
- `configureExpress(app)` is called before any routes are mounted. Evidence: `src/server.js:304-308`.
- Middleware order inside `configureExpress` is: Helmet → CORS → JSON/body parsing → rate limiter on `/api` → logging middleware → global error middleware → static file serving. Evidence: `src/config/express.config.js:81-121`.
- SPA fallback for `/app/*` is mounted after routes and before the 404 handler. Evidence: `src/server.js:310-314` and `src/config/express.config.js:124-155`.
- 404 handler is mounted last via `configure404Handler(app)` which uses `app.use('*', ...)`. Evidence: `src/server.js:313-314` and `src/config/express.config.js:150-156`.

## Route mounting
- All API route modules are aggregated in `src/api/routes/index.js` and mounted at `/` via `app.use('/', routes)`. Evidence: `src/server.js:307-309` and `src/api/routes/index.js:56-105`.

## Runtime wiring vs code presence
- Automation engine is initialized during HTTP server startup (inside `startServer`), which is called only when `shouldStartAPI` is true. Evidence: `src/config/server.startup.js:22-52` and `src/server.js:318-321`.
- Background jobs (cadence engine, prospecting engine, abandonment detection, data sync, OAuth refresh, webhook job processor, prospect sync, auto-optimizer, async jobs processor) are only started when `shouldStartWorker` is true. Evidence: `src/server.js:329-420`.

## Potential 404 causes already wired/not wired
- SPA fallback is explicitly wired for `/app/*`, so direct navigation to `/app/...` should serve `public/app/index.html` if assets exist. Evidence: `src/config/express.config.js:129-145`.
- All routes are mounted on root (`/`) with the module aggregator; if an endpoint is missing, it is a code/route declaration issue or not mounted in `src/api/routes/index.js`. Evidence: `src/server.js:307-309` and `src/api/routes/index.js:60-105`.
