# Frontend Communication Map

This repo has two frontends:
- `apps/web-vite` (React Router, basename `/app`)
- `apps/web` (Next.js App Router, base `/`)

---

## Frontend A: apps/web-vite

### Router and Pages
- Router base: `BrowserRouter basename="/app"` in `apps/web-vite/src/App.tsx:82`.
- Public routes: `/login`, `/register` in `apps/web-vite/src/App.tsx:86`.
- Protected routes: `/dashboard`, `/inbox`, `/agents`, `/agents/new`, `/agents/:id`, `/crm`, `/campaigns`, `/integrations`, `/analytics`, `/billing`, `/audit`, `/settings` in `apps/web-vite/src/App.tsx:92`.

### Auth flow
- Guard uses `localStorage.getItem('token')` in `apps/web-vite/src/App.tsx:17`.
- 401 redirect to `/app/login` in `apps/web-vite/src/lib/api.ts:25`.

### API client
- Base URL: `import.meta.env.VITE_API_URL || '/api'` in `apps/web-vite/src/lib/api.ts:1`.
- Auth header: `Authorization: Bearer ${token}` in `apps/web-vite/src/lib/api.ts:18`.

### Integration UI calls (selected)
- Evolution connect: `POST /api/agents/default/channels/evolution/connect` in `apps/web-vite/src/pages/Integrations.tsx:187`.
- CRM OAuth start: `GET /api/integrations/crm/:provider/oauth/start` in `apps/web-vite/src/pages/Integrations.tsx:220`.

---

## Frontend B: apps/web (Next.js App Router)

### Routes (filesystem)
- `/` → `apps/web/src/app/page.tsx`
- `/login` → `apps/web/src/app/(auth)/login/page.tsx`
- `/register` → `apps/web/src/app/(auth)/register/page.tsx`
- `/dashboard` → `apps/web/src/app/(app)/dashboard/page.tsx`
- `/agents` → `apps/web/src/app/(app)/agents/page.tsx`
- `/agents/new` → `apps/web/src/app/(app)/agents/new/page.tsx`
- `/analytics` → `apps/web/src/app/(app)/analytics/page.tsx`
- `/campaigns` → `apps/web/src/app/(app)/campaigns/page.tsx`
- `/crm` → `apps/web/src/app/(app)/crm/page.tsx`
- `/settings` → `apps/web/src/app/(app)/settings/page.tsx`

### Auth flow
- Token stored in `localStorage` and read in `apps/web/src/lib/api.ts:12`.
- 401 redirect to `/login` in `apps/web/src/lib/api.ts:33`.

### API client
- Base URL: `process.env.NEXT_PUBLIC_API_URL || '/api'` in `apps/web/src/lib/api.ts:1`.
- Auth header: `Authorization: Bearer ${token}` in `apps/web/src/lib/api.ts:18`.

### API expectations (Next app)
- Agents: `/api/agents` and `/api/agents/:id` in `apps/web/src/lib/api.ts:50`.
- Leads: `/api/leads` in `apps/web/src/lib/api.ts:74`.
- Dashboard: `/api/dashboard/stats` in `apps/web/src/lib/api.ts:45`.

---

## Serving and Base Paths

- Backend SPA fallback serves `/app/*` from `public/app/index.html` in `src/config/express.config.js:124`.
- The Next.js app (`apps/web`) is not served by the backend config in `src/config/express.config.js`.

