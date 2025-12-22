# Frontends (routes, auth flow, baseURL, FE↔BE contract)

## Vite app (apps/web-vite)
- Router base is `/app` via `<BrowserRouter basename="/app">`. Evidence: `apps/web-vite/src/App.tsx:82-111`.
- API base URL defaults to `/api` (absolute) via `VITE_API_URL || '/api'`. Evidence: `apps/web-vite/src/lib/api.ts:1`.
- Login flow uses `api.login()` and then redirects to `/app/dashboard`. Evidence: `apps/web-vite/src/pages/Login.tsx:21-25`.
- `api.login()` calls `/auth/login` under the `/api` base. Evidence: `apps/web-vite/src/lib/api.ts:118-130`.
- Token refresh is POST `/auth/refresh` under the same base and redirects to `/app/login` on 401. Evidence: `apps/web-vite/src/lib/api.ts:42-48` and `apps/web-vite/src/lib/api.ts:97-107`.

## Next app (apps/web)
- Next app is marked deprecated in its package.json. Evidence: `apps/web/package.json:5-6`.
- API base URL defaults to `/api` via `NEXT_PUBLIC_API_URL || '/api'`. Evidence: `apps/web/src/lib/api.ts:1`.
- Login calls `/auth/login` under the base and redirects to `/login` on 401. Evidence: `apps/web/src/lib/api.ts:55-60` and `apps/web/src/lib/api.ts:42-46`.

## FE↔BE contract (high-signal mismatches)
From `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md`:
- Vite uses `/api/campaigns` (GET/POST) but no backend route matched. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:15-17`.
- Vite uses `/api/funil` (GET) with no backend route matched (only `/api/funil/bant*` and `/api/funil/stats` are present). Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:22`.
- Vite uses `/api/prospecting/stats` and `/api/prospecting/leads` (GET) with no backend route matched. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:25-26`.
- Vite calls `fetch('/api/whatsapp/send')` as GET (Inbox) but backend exposes POST `/api/whatsapp/send`. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:33` and backend route `reports/ARTIFACTS_ROUTE_SCAN.md:307`.
- Next app uses `/api/dashboard/stats`, `/api/leads*`, `/api/campaigns*`, `/api/analytics?period=` which are not matched in backend routes. Evidence: `reports/ARTIFACTS_FRONT_BACK_CONTRACT.md:36-48`.

## 404 login scenario check (frontend side)
- Vite and Next both use absolute `/api` base URLs (not relative `api/...`), so FE code does not create `/app/api/...` paths by default. Evidence: `apps/web-vite/src/lib/api.ts:1` and `apps/web/src/lib/api.ts:1`.
- If a 404 occurs on login, it is more consistent with backend mismatch/drift or missing route wiring (see `/api/auth/login` in backend). Evidence for backend route: `reports/ARTIFACTS_ROUTE_SCAN.md:146` and `src/api/routes/auth.routes.js:300`.
