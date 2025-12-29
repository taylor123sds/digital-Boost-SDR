# Frontend-Backend Connection Map

> Comprehensive mapping of web-vite frontend pages, UI elements, and their backend API calls.
> Generated: 2025-12-23

## Quick Reference

| Page | Route | API Endpoints Used |
|------|-------|-------------------|
| Login | `/app/login` | POST `/api/auth/login` |
| Register | `/app/register` | POST `/api/auth/register` |
| Dashboard | `/app/` | GET `/api/funil/stats`, GET `/api/command-center/overview` |
| Agents | `/app/agents` | GET `/api/agents` |
| AgentNew | `/app/agents/new` | POST `/api/agents` |
| AgentDetail | `/app/agents/:id` | Multiple (see details) |
| CRM | `/app/crm` | GET `/api/funil/bant` |
| Inbox | `/app/inbox` | GET `/api/conversations`, GET `/api/conversations/:phone/messages`, POST `/api/whatsapp/send` |
| Campaigns | `/app/campaigns` | GET `/api/campaigns` |
| Integrations | `/app/integrations` | GET `/api/integrations/catalog`, GET `/api/agents`, GET `/api/agents/:agentId/integrations`, Evolution endpoints |
| Analytics | `/app/analytics` | GET `/api/analytics/channel-breakdown`, GET `/api/analytics/top-agents` |
| Settings | `/app/settings` | GET/PUT `/api/settings`, PUT `/api/auth/password` |
| AuditLog | `/app/audit-log` | GET `/api/audit-logs` |
| Billing | `/app/billing` | GET `/api/billing/plans`, GET `/api/auth/entitlements` |

---

## Page-by-Page Analysis

### 1. Login (`Login.tsx`)

**Route:** `/app/login`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Email input | Input | Collects email |
| Password input | Input | Collects password |
| "Entrar" button | Button | Submits login form |
| "Criar conta" link | Link | Navigate to `/app/register` |

**API Calls:**
```
POST /api/auth/login
Body: { email, password }
Response: { success, data: { accessToken, refreshToken, user } }
```

**Backend Route:** `auth.routes.js:300`

---

### 2. Register (`Register.tsx`)

**Route:** `/app/register`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Name input | Input | Collects name |
| Email input | Input | Collects email |
| Password input | Input | Collects password |
| "Criar conta" button | Button | Submits registration |
| "Fazer login" link | Link | Navigate to `/app/login` |

**API Calls:**
```
POST /api/auth/register
Body: { name, email, password, sector: 'outro' }
Response: { success, data: { accessToken, refreshToken, user, entitlements } }
```

**Backend Route:** `auth.routes.js:109`

---

### 3. Dashboard (`Dashboard.tsx`)

**Route:** `/app/` (default after login)

**UI Elements:**
| Element | Type | Data Source |
|---------|------|-------------|
| Total Leads card | Stat Card | `funilStats.total` |
| Taxa de Resposta card | Stat Card | Hardcoded 92% |
| Reunioes Agendadas card | Stat Card | Hardcoded 18 |
| Taxa de Conversao card | Stat Card | `funilStats.conversionRate` |
| Atividade Recente section | List | Mock data (empty array) |

**API Calls:**
```
GET /api/funil/stats
Response: { success, stats: { total, conversionRate, byStage } }

GET /api/command-center/overview
Response: { success, metrics: { messages_today, ... } }
```

**Backend Routes:**
- `funil.routes.js:172` (stats)
- `command-center.routes.js:34` (overview)

**NOTE:** `funil.routes.js` endpoints have `NEEDS_AUTH` status - currently unprotected!

---

### 4. Agents List (`Agents.tsx`)

**Route:** `/app/agents`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| "+ Novo Agente" button | Button | Navigate to `/app/agents/new` |
| Agent cards | Card Grid | Navigate to `/app/agents/:id` |
| Agent status badge | Badge | Display agent.status |
| Agent type badge | Badge | Display agent.type |

**API Calls:**
```
GET /api/agents
Response: { success, data: Agent[] }
```

**Backend Route:** `agents.routes.js:295`

---

### 5. Agent New (`AgentNew.tsx`)

**Route:** `/app/agents/new`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Agent type selector | Button Group | Select sdr/support/custom |
| Channel selector | Button Group | Select whatsapp/email/chat |
| Name input | Input | Agent name |
| Slug input | Input | Agent slug |
| System prompt textarea | Textarea | Agent system prompt |
| "Criar Agente" button | Button | Submit form |
| "Cancelar" button | Button | Navigate back |

**API Calls:**
```
POST /api/agents
Body: { name, slug, type, channel, system_prompt, status: 'draft' }
Response: { success, data: Agent }
```

**Backend Route:** `agents.routes.js:359`

---

### 6. Agent Detail (`AgentDetail.tsx`) - **MOST COMPLEX PAGE**

**Route:** `/app/agents/:id`

**6 Main Tabs:**

#### Tab 1: Metricas
| Element | Type | Data Source |
|---------|------|-------------|
| Mensagens stat | Stat Card | `dashboardStats.messagesTotal` |
| Leads stat | Stat Card | `dashboardStats.totalLeads` |
| Conversao stat | Stat Card | `dashboardStats.conversionRate` |
| Tempo de Resposta stat | Stat Card | Hardcoded "< 30s" |

#### Tab 2: Leads
| Element | Type | Action |
|---------|------|--------|
| Search input | Input | Filter leads |
| Stage filter | Select | Filter by pipeline stage |
| Lead table | Table | Display leads |
| Lead row | Row | Open lead modal |

#### Tab 3: Pipeline
| Element | Type | Data Source |
|---------|------|-------------|
| Stage columns | Kanban Board | `funnel` data grouped by stage |
| Lead cards | Draggable Card | Individual leads |

#### Tab 4: Cadence
| Element | Type | Data Source |
|---------|------|-------------|
| Active cadences | Stat Card | `cadences` count |
| Pending actions | Stat Card | Hardcoded |
| Cadence list | Table | `cadences` data |

#### Tab 5: Prospecting
| Element | Type | Action |
|---------|------|--------|
| Prospecting toggle | Switch | `startProspecting()` / `stopProspecting()` |
| Pending prospects | Stat | `prospectingStats.pending` |
| Sent today | Stat | `prospectingStats.sentToday` |
| Replies | Stat | `prospectingStats.replies` |
| Prospect list | Table | `prospects` data |

#### Tab 6: Settings (5 Sub-tabs)

**Sub-tab: Basico**
| Element | Type | Action |
|---------|------|--------|
| Name input | Input | Edit agent.name |
| Status select | Select | Edit agent.status |
| Channel select | Select | Edit agent.channel |
| "Salvar" button | Button | `updateAgent()` |

**Sub-tab: Persona**
| Element | Type | Action |
|---------|------|--------|
| Tone select | Select | Edit persona.tone |
| Style select | Select | Edit persona.style |
| Response length select | Select | Edit persona.response_length |

**Sub-tab: AI**
| Element | Type | Action |
|---------|------|--------|
| Model select | Select | Edit aiConfig.model |
| Temperature slider | Range | Edit aiConfig.temperature |
| Max tokens input | Input | Edit aiConfig.max_tokens |

**Sub-tab: Integracoes**
| Element | Type | Action |
|---------|------|--------|
| WhatsApp status | Status Badge | `evolutionStatus` |
| "Conectar WhatsApp" button | Button | Opens QR modal, calls `connectEvolution()` |
| "Desconectar" button | Button | `disconnectEvolution()` |
| QR Code modal | Modal | Display QR for scanning |

**Sub-tab: Handoff**
| Element | Type | Action |
|---------|------|--------|
| Handoff config | Form | Edit behavior.handoff settings |

**API Calls (All tabs combined):**
```
GET /api/agents/:id
GET /api/funil/stats + GET /api/command-center/overview (via getDashboardStats)
GET /api/funil/bant (getLeads)
GET /api/funil (getFunnel)
GET /api/cadences (getCadences)
GET /api/prospecting/stats (getProspectingStats)
GET /api/prospecting/leads (getProspects)
POST /api/prospecting/start (startProspecting)
POST /api/prospecting/stop (stopProspecting)
GET /api/agents/:id/channels/evolution/status (getEvolutionStatus)
POST /api/agents/:id/channels/evolution/connect (connectEvolution)
POST /api/agents/:id/channels/evolution/disconnect (disconnectEvolution)
PUT /api/agents/:id (updateAgent)
```

**Backend Routes:**
- `agents.routes.js:329` (getAgent)
- `funil.routes.js:31,172` (bant, stats) - **NEEDS_AUTH**
- `cadence.routes.js:36` (getCadences)
- `channels.routes.js:23,76,191` (evolution connect/status/disconnect)

---

### 7. CRM (`CRM.tsx`)

**Route:** `/app/crm`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Search input | Input | Filter leads by name/phone |
| Kanban board | 5-column Board | Display leads by stage |
| Stage: Novo | Column | Leads with stage='novo' |
| Stage: Qualificado | Column | Leads with stage='qualificado' |
| Stage: Proposta | Column | Leads with stage='proposta' |
| Stage: Negociacao | Column | Leads with stage='negociacao' |
| Stage: Fechado | Column | Leads with stage='fechado' |
| Lead card | Card | Click opens `LeadDetailModal` |

**API Calls:**
```
GET /api/funil/bant
Response: { success, leads: Lead[] }
```

**Backend Route:** `funil.routes.js:31` - **NEEDS_AUTH**

---

### 8. Lead Detail Modal (`LeadDetailModal.tsx`)

**Opened from:** CRM page, Agent Detail leads tab

**3 Tabs:**

#### Tab: Conversa (Chat)
| Element | Type | Action |
|---------|------|--------|
| Message list | Chat bubbles | Display conversation |
| Message input | Input | Type new message |
| "Enviar" button | Button | `sendMessage()` |

#### Tab: Informacoes
| Element | Type | Data |
|---------|------|------|
| Info cards | Static | Lead name, company, phone, email |

#### Tab: Timeline
| Element | Type | Data |
|---------|------|------|
| Event list | Timeline | Mock events (lead created, first message, score updated) |

**Sidebar (always visible):**
| Element | Type | Action |
|---------|------|--------|
| Avatar | Icon | Lead initial |
| Stage dropdown | Select | `updateLead(id, { stage })` |
| Lead score | Progress bar | Display score |
| "Agendar Reuniao" button | Button | **Not implemented** |
| "Ligar Agora" button | Button | **Not implemented** |

**API Calls:**
```
GET /api/command-center/activity-feed (getMessages - filtered by phone)
POST /api/whatsapp/send (sendMessage)
Body: { to: phone, message: content }

POST /api/leads/update-stage (updateLead)
Body: { leadId, stage }
```

**Backend Routes:**
- `command-center.routes.js:279` (activity-feed)
- `whatsapp.routes.js:22` (send) - **NEEDS_AUTH**
- `funil.routes.js:240` (update-stage) - **NEEDS_AUTH**

---

### 9. Inbox (`Inbox.tsx`)

**Route:** `/app/inbox`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Status filter tabs | Tab Group | Filter by active/waiting/handoff |
| Conversation list | List | Select conversation |
| Conversation item | List Item | Load messages |
| Handoff warning banner | Alert | Shown when status='handoff' |
| Chat messages | Message bubbles | Display conversation |
| Message input | Input | Type new message |
| "Enviar" button | Button | Send via POST `/api/whatsapp/send` |

**API Calls:**
```
GET /api/conversations?limit=50&offset=0&status=active
Response: { success, data: ConversationSummary[], meta: { total } }

GET /api/conversations/:phone/messages
Response: { success, data: Message[] }

POST /api/whatsapp/send
Body: { to: phone, message: content }
```

**Backend Routes:**
- `conversations.routes.js` (list + messages)
- `whatsapp.routes.js:22` (send)

---

### 10. Campaigns (`Campaigns.tsx`)

**Route:** `/app/campaigns`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| "+ Nova Campanha" button | Button | Abre modal e cria campanha |
| Campaign cards | Card Grid | Display campaigns |
| Status badge | Badge | draft/active/paused/completed |
| Type badge | Badge | prospecting/nurture/reactivation |
| Progress bar | Progress | sentCount / totalLeads |

**API Calls:**
```
GET /api/campaigns
Response: Campaign[]

POST /api/campaigns
Body: { name, type }
```

**Backend Routes:** `whatsapp.routes.js` (in-memory placeholder)

---

### 11. Integrations (`Integrations.tsx`)

**Route:** `/app/integrations`

**4 Categories:**

#### Messaging
| Provider | Element | Action |
|----------|---------|--------|
| Evolution API | Card + Status | `connectEvolution()` / `disconnectEvolution()` |
| Meta WhatsApp | Card | Catálogo disponível (sem action dedicada) |

#### Calendar
| Provider | Element | Action |
|----------|---------|--------|
| Google Calendar | Card | OAuth via `/auth/google` |

#### CRM
| Provider | Element | Action |
|----------|---------|--------|
| Kommo | Card + Connect | `startCrmOauth('kommo')` |
| HubSpot | Card + Connect | `startCrmOauth('hubspot')` |
| Pipedrive | Card + Connect | `startCrmOauth('pipedrive')` |

#### Webhooks
| Element | Type | Action |
|---------|------|--------|
| Webhook URL | Input | Display webhook URL |
| Test button | Button | `testIntegration()` |

**API Calls:**
```
GET /api/integrations/catalog
Response: { success, data: { categories, integrations } }

GET /api/agents
Response: { success, data: Agent[] }

GET /api/agents/:id/integrations
Response: { success, data: AgentIntegrationBinding[] }

GET /api/agents/:id/channels/evolution/status
POST /api/agents/:id/channels/evolution/connect
POST /api/agents/:id/channels/evolution/disconnect

GET /api/integrations/crm/:provider/oauth/start
Response: { success, data: { authUrl } }

GET /api/integrations/:id/test
POST /api/integrations/:id/disconnect
```

**Backend Routes:**
- `channels.routes.js` (catalog, agent bindings, evolution)
- `crm-integration.routes.js` (oauth start, test, disconnect)

---

### 12. Analytics (`Analytics.tsx`)

**Route:** `/app/analytics`

**UI Elements:**
| Element | Type | Data |
|---------|------|------|
| Period selector | Button Group | 7d / 30d / 90d |
| Total Conversas | Stat Card | `metrics.totalConversations` |
| Tempo de Resposta | Stat Card | `metrics.avgResponseTime` |
| Taxa de Conversao | Stat Card | `metrics.conversionRate` |
| Satisfacao | Stat Card | `metrics.satisfactionScore` |
| Bar chart | Chart | `chartData.conversations` by day |

**API Calls:**
```
GET /api/analytics/channel-breakdown
Response: { success, data: [{ channel, count, percentage }] }

GET /api/analytics/top-agents
Response: { success, data: [{ id, name, conversations, conversionRate }] }
```

**Backend Routes:**
- `analytics.routes.js` (channel-breakdown, top-agents)

---

### 13. Settings (`Settings.tsx`)

**Route:** `/app/settings`

**6 Tabs:**

| Tab | UI Elements | Backend |
|-----|-------------|---------|
| Perfil | Avatar, Name, Email, Phone, Cargo inputs | GET/PUT `/api/settings` |
| Empresa | Company name, CNPJ, Website, Sector inputs | GET/PUT `/api/settings` |
| Notificacoes | 4 toggle switches | GET/PUT `/api/settings` |
| Seguranca | Password change form | PUT `/api/auth/password` |
| API Keys | API key list | GET/PUT `/api/settings` (preferences.apiKeys) |
| Aparencia | Theme selector (Dark/Light/System) | GET/PUT `/api/settings` |

**API Calls:**
```
GET /api/settings
PUT /api/settings
PUT /api/auth/password
```

**Backend Routes:**
- `settings.routes.js` (profile + preferences)
- `auth.routes.js:450` (password change)

---

### 14. Audit Log (`AuditLog.tsx`)

**Route:** `/app/audit-log`

**UI Elements:**
| Element | Type | Data |
|---------|------|------|
| Search input | Input | Filter logs |
| Category filter | Select | auth/agent/lead/message/config/billing/system |
| Status filter | Select | success/failure/warning |
| Date range | Date inputs | From/To dates |
| Stats cards | 4 Cards | Total/Success/Failure/Warning counts |
| Log table | Table | Expandable rows with details |
| "Exportar CSV" button | Button | Client-side CSV export |
| Pagination | Buttons | Previous/Next |

**API Calls:**
```
GET /api/audit-logs
Response: { success, data: AuditEntry[], meta: { total } }
```

**Backend Routes:**
- `audit.routes.js` (audit log list, tenant-scoped)

---

### 15. Billing (`Billing.tsx`)

**Route:** `/app/billing`

**UI Elements:**
| Element | Type | Action |
|---------|------|--------|
| Trial banner | Alert | Shows days remaining |
| Current plan card | Card | Display current subscription |
| Usage bars | Progress | Agents/Messages/Leads usage |
| Billing period toggle | Toggle | monthly/yearly |
| Plan cards (4) | Card Grid | Trial/Starter/Professional/Enterprise |
| "Fazer Upgrade" button | Button | Opens upgrade modal |
| Upgrade modal | Modal | Confirm plan change |
| Invoice table | Table | Invoice history |
| PDF download button | Button | **Not implemented** |

**API Calls:**
```
GET /api/auth/entitlements
Response: { success, data: { billingStatus, trialEndsAt, daysRemaining, maxAgents, maxMessagesPerMonth, messagesUsed } }

GET /api/billing/plans
Response: { success, data: BillingPlan[] }
```

**Backend Routes:**
- `auth.routes.js:529` (entitlements)
- `billing.routes.js` (plans)

**NOTE:** `confirmUpgrade()` just shows alert - no actual payment integration!

---

## Critical Issues Found

### 1. Auth Coverage Review

Use `docs/routes-audit.csv` to verify current authentication requirements per endpoint. This file is the source of truth and reflects recent changes.

### 2. Pages Without Backend Integration

| Page | Status |
|------|--------|
| Billing.tsx | Leitura de entitlements/planos, sem fluxo de pagamento |

### 4. Dead/Placeholder Buttons

| Page | Button | Issue |
|------|--------|-------|
| LeadDetailModal | "Agendar Reuniao" | No action |
| LeadDetailModal | "Ligar Agora" | No action |
| Billing | PDF download | No implementation |

---

## API Client Summary (`lib/api.ts`)

### Token Management
- Stores JWT in `localStorage.token`
- Stores refresh token in `localStorage.refreshToken`
- Auto-refreshes on 401 via `POST /api/auth/refresh`
- Redirects to `/app/login` on refresh failure

### Error Handling
- Catches errors and returns empty/mock data
- Many methods have fallback mock responses
- `skipAuthRedirect` option for non-critical calls

### Base URL
```javascript
const API_BASE = import.meta.env.VITE_API_URL || '/api';
```

---

## Sidebar Navigation (`Sidebar.tsx`)

| Menu Item | Route | Icon |
|-----------|-------|------|
| Dashboard | `/app/` | LayoutDashboard |
| Agentes | `/app/agents` | Bot |
| CRM | `/app/crm` | Users |
| Inbox | `/app/inbox` | MessageCircle |
| Campanhas | `/app/campaigns` | Megaphone |
| Integracoes | `/app/integrations` | Plug |
| Analytics | `/app/analytics` | BarChart3 |
| Configuracoes | `/app/settings` | Settings |
| Billing | `/app/billing` | CreditCard |
| Audit Log | `/app/audit-log` | History |
| Logout | (action) | LogOut |

---

## React Router Structure (`App.tsx`)

```
/app/
├── login          → Login.tsx
├── register       → Register.tsx
├── /              → Dashboard.tsx (protected)
├── agents         → Agents.tsx (protected)
├── agents/new     → AgentNew.tsx (protected)
├── agents/:id     → AgentDetail.tsx (protected)
├── crm            → CRM.tsx (protected)
├── inbox          → Inbox.tsx (protected)
├── campaigns      → Campaigns.tsx (protected)
├── integrations   → Integrations.tsx (protected)
├── analytics      → Analytics.tsx (protected)
├── settings       → Settings.tsx (protected)
├── billing        → Billing.tsx (protected)
├── audit-log      → AuditLog.tsx (protected)
└── *              → Navigate to /app/ (catch-all)
```

Protected routes check for `localStorage.token` and redirect to `/app/login` if missing.
