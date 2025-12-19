# API_CONTRACT.md

> Contrato de API entre Frontend (apps/web-vite/) e Backend (src/api/routes/)
> Gerado em: 2025-12-19

## Prefixo Base

Todas as rotas usam o prefixo `/api` exceto onde indicado.

## Formato de Resposta Padrao

```json
{
  "success": true,
  "data": { /* payload */ },
  "error": null
}
```

Em caso de erro:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## CRITICAL ENDPOINTS (Authentication)

### POST /api/auth/login

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "admin|user",
      "tenantId": "string"
    }
  }
}
```

### POST /api/auth/register

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "company": "string (optional)",
  "sector": "string"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "user": { /* User object */ },
    "entitlements": {
      "billingStatus": "trial|active|inactive",
      "trialEndsAt": "ISO string",
      "daysRemaining": "number",
      "isRuntimeAllowed": "boolean"
    }
  }
}
```

### GET /api/auth/entitlements

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "billingStatus": "trial|active|inactive",
    "trialEndsAt": "ISO string",
    "usedAgents": "number",
    "maxAgents": "number",
    "usedMessages": "number",
    "maxMessages": "number",
    "usedLeads": "number",
    "maxLeads": "number",
    "isRuntimeAllowed": "boolean"
  }
}
```

---

## HIGH PRIORITY ENDPOINTS (Agents)

### GET /api/agents/my

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "type": "sdr|specialist|scheduler|support",
      "status": "active|paused|offline|draft|deleted",
      "channel": "whatsapp|email|chat|voice",
      "persona": "object",
      "system_prompt": "string",
      "prompts": "object",
      "message_templates": "object",
      "behavior": "object",
      "ai_config": "object",
      "integrations": "object",
      "knowledge_base": "object",
      "metrics": "object",
      "created_at": "ISO string",
      "updated_at": "ISO string",
      "last_active_at": "ISO string"
    }
  ]
}
```

### GET /api/agents/:id

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):** Single agent object (same as array element above)

### POST /api/agents

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "name": "string",
  "type": "sdr|specialist|scheduler|support",
  "status": "active|draft",
  "config": {
    "agent": {
      "name": "string",
      "language": "string",
      "tone": "number (1-5)",
      "persona": "string"
    },
    "business": {
      "companyName": "string",
      "website": "string",
      "sector": "string",
      "niche": "string",
      "description": "string",
      "valueProp": "string",
      "differentiators": ["string"]
    },
    "offer": {
      "services": [{"id": "string", "name": "string", "description": "string", "price": "string"}],
      "offerings": ["string"]
    },
    "audience": {
      "type": "b2b|b2c|both",
      "regions": ["string"],
      "budgetRange": "string",
      "pains": ["string"],
      "commonObjections": ["string"],
      "qualificationFramework": "bant|spin|meddic|custom"
    },
    "policies": {
      "cancellation": "string",
      "returns": "string",
      "discounts": "string",
      "lgpdCompliance": "boolean"
    },
    "goals": {
      "cta": {
        "type": "reuniao|demonstracao|orcamento|visita|teste_gratis",
        "duration": "string",
        "description": "string",
        "value": "string"
      },
      "kpis": ["string"],
      "allowedPromises": ["string"],
      "forbiddenTopics": ["string"]
    },
    "channels": {
      "active": ["string"],
      "operatingHours": {
        "start": "string (HH:MM)",
        "end": "string (HH:MM)",
        "days": ["string"]
      },
      "outOfHoursMessage": "string"
    },
    "integrations": {
      "calendar": {"type": "string"} | null,
      "whatsapp": {"instance": "string"} | null,
      "crm": "string | null"
    },
    "playbooks": {
      "objectionHandlers": [{"id": "string", "trigger": "string", "response": "string"}],
      "handoffCriteria": ["string"],
      "followUpCadence": "string"
    },
    "qualification": {
      "bant": {
        "budget": "boolean",
        "authority": "boolean",
        "need": "boolean",
        "timeline": "boolean"
      }
    }
  }
}
```

**Response (201):** Agent object

### PUT /api/agents/:id

**Headers:** `Authorization: Bearer <accessToken>`

**Request:** Partial Agent object

**Response (200):** Updated Agent object

### DELETE /api/agents/:id

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{ "success": true }
```

---

## HIGH PRIORITY ENDPOINTS (WhatsApp/Evolution)

### POST /api/agents/evolution/qrcode

**Request:**
```json
{
  "instanceName": "string"
}
```

**Response (200):**
```json
{
  "qrcode": {
    "base64": "string (base64 encoded image)"
  }
}
```

### GET /api/agents/evolution/status/:instanceName

**Response (200):**
```json
{
  "state": "open|connecting|closed",
  "connected": "boolean",
  "instance": {
    "status": "open|connecting|closed"
  }
}
```

### POST /api/agents/default/channels/evolution/connect

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "instanceName": "string"
}
```

**Response (200):**
```json
{
  "data": {
    "qrcode": {
      "base64": "string"
    },
    "instance": {
      "status": "open|connecting|closed"
    }
  }
}
```

### GET /api/whatsapp/status

**Response (200):**
```json
{
  "connected": "boolean",
  "status": "connected|disconnected"
}
```

---

## HIGH PRIORITY ENDPOINTS (Funil/Leads)

### GET /api/funil/stats

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": "number",
    "conversionRate": "number",
    "byStage": {
      "stage_name": "number"
    }
  }
}
```

### GET /api/funil/bant

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "leads": [
    {
      "contactId": "string",
      "id": "string",
      "nome": "string",
      "empresa": "string",
      "currentStage": "string",
      "pipeline_stage": "string",
      "score": "number",
      "currentAgent": "string | null",
      "lastUpdate": "ISO string",
      "contactName": "string | null"
    }
  ]
}
```

### GET /api/funil/bant/:id

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "lead": {
    "contactId": "string",
    "id": "string",
    "nome": "string",
    "empresa": "string",
    "bantStages": {
      "currentStage": "string"
    },
    "score": "number",
    "lastUpdate": "ISO string"
  }
}
```

### POST /api/leads/update-stage

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "leadId": "string",
  "stage": "string"
}
```

**Response (200):**
```json
{ "success": true }
```

### GET /api/funil

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "contactId": "string",
      "nome": "string",
      "empresa": "string",
      "stage_id": "string",
      "score": "number",
      "created_at": "ISO string",
      "updated_at": "ISO string"
    }
  ]
}
```

---

## MEDIUM PRIORITY ENDPOINTS (Dashboard/Metrics)

### GET /api/command-center/overview

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "metrics": {
    "messages_today": "number",
    "conversations_active": "number",
    "leads_qualified": "number",
    "meetings_scheduled": "number"
  }
}
```

### GET /api/forecasting/velocity

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "velocity": {
    "total_conversations": "number",
    "avg_response_time_seconds": "number",
    "messages_per_conversation": "number"
  }
}
```

### GET /api/forecasting/monthly

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "forecast": {
    "current_conversion_rate": "number",
    "projected_leads": "number",
    "projected_revenue": "number"
  }
}
```

### GET /api/command-center/activity-feed

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "activities": [
    {
      "id": "string",
      "type": "message|call|meeting|note",
      "phone": "string",
      "contact_phone": "string | null",
      "text": "string",
      "message": "string | null",
      "timestamp": "ISO string",
      "created_at": "ISO string | null",
      "from_me": "boolean"
    }
  ]
}
```

---

## MEDIUM PRIORITY ENDPOINTS (Messaging)

### GET /api/conversations

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "string",
      "phone": "string",
      "name": "string",
      "company": "string | null",
      "lastMessage": "string",
      "lastMessageTime": "ISO string",
      "unreadCount": "number",
      "status": "active|waiting|closed|handoff",
      "agentId": "string",
      "agentName": "string",
      "stage": "string"
    }
  ]
}
```

### GET /api/conversations/:conversationId/messages

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "from": "agent|user",
      "timestamp": "ISO string",
      "status": "sent|delivered|read | null"
    }
  ]
}
```

### POST /api/messages/send

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "phone": "string",
  "content": "string"
}
```

**Response (200):** 200 OK

### POST /api/whatsapp/send

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "phone": "string",
  "message": "string"
}
```

**Response (200):**
```json
{ "success": true }
```

---

## MEDIUM PRIORITY ENDPOINTS (Campaigns)

### GET /api/campaigns

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
[
  {
    "id": "string",
    "name": "string",
    "status": "draft|active|paused|completed",
    "type": "prospecting|nurture|reactivation",
    "totalLeads": "number",
    "sentCount": "number",
    "responseRate": "number",
    "createdAt": "ISO string"
  }
]
```

### GET /api/campaigns/:id

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):** Single campaign object

### POST /api/campaigns

**Headers:** `Authorization: Bearer <accessToken>`

**Request:** Partial campaign object

**Response (201):** Campaign object

---

## MEDIUM PRIORITY ENDPOINTS (Cadences & Prospecting)

### GET /api/cadences

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "lead_name": "string",
      "telefone": "string",
      "current_day": "number",
      "next_action_at": "ISO string",
      "status": "in_progress|pending|completed|paused"
    }
  ]
}
```

### GET /api/cadences/stats

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "active": "number",
  "pending": "number",
  "completed": "number"
}
```

### GET /api/prospecting/stats

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "pending": "number",
  "sentToday": "number",
  "replies": "number",
  "isRunning": "boolean"
}
```

### GET /api/prospecting/leads

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "nome": "string",
      "telefone": "string",
      "empresa": "string",
      "status": "pendente|enviado|respondeu|erro",
      "createdAt": "ISO string"
    }
  ]
}
```

### POST /api/prospecting/start

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{ "success": true }
```

### POST /api/prospecting/stop

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{ "success": true }
```

---

## MEDIUM PRIORITY ENDPOINTS (Billing)

### GET /api/billing/subscription

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "planId": "string",
  "status": "active|canceled|past_due|trialing",
  "currentPeriodEnd": "ISO string",
  "cancelAtPeriodEnd": "boolean"
}
```

### GET /api/billing/usage

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "agents": { "used": "number", "limit": "number" },
  "messages": { "used": "number", "limit": "number" },
  "leads": { "used": "number", "limit": "number" }
}
```

### GET /api/billing/invoices

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "string",
      "date": "ISO string",
      "amount": "number",
      "status": "paid|pending|failed",
      "pdfUrl": "string | null"
    }
  ]
}
```

### POST /api/billing/upgrade

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "planId": "string",
  "billingPeriod": "monthly|yearly"
}
```

**Response (200):** 200 OK

---

## MEDIUM PRIORITY ENDPOINTS (Integrations)

### GET /api/integrations

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "integrations": [
    {
      "id": "string",
      "name": "string",
      "type": "whatsapp|calendar|crm|webhook|ai",
      "provider": "string",
      "status": "connected|disconnected|error|pending",
      "icon": "string",
      "description": "string",
      "last_sync": "ISO string | null",
      "config": "object | null"
    }
  ]
}
```

### POST /api/integrations/crm/:provider/oauth/start

**Headers:** `Authorization: Bearer <accessToken>`

**URL Params:** provider = 'kommo'|'hubspot'|'pipedrive'

**Response (200):**
```json
{
  "data": {
    "authUrl": "string"
  }
}
```

### POST /api/integrations/:integrationId/disconnect

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):** 200 OK

### GET /api/integrations/:integrationId/test

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "connected": "boolean",
    "reason": "string | null"
  }
}
```

---

## LOW PRIORITY ENDPOINTS (Audit)

### GET /api/audit/logs

**Headers:** `Authorization: Bearer <accessToken>`

**Query Params:**
```
page=number
limit=number
category=auth|agent|lead|message|config|billing|system
status=success|failure|warning
from=ISO string
to=ISO string
```

**Response (200):**
```json
{
  "logs": [
    {
      "id": "string",
      "timestamp": "ISO string",
      "action": "string",
      "category": "auth|agent|lead|message|config|billing|system",
      "actor": {
        "type": "user|agent|system",
        "id": "string",
        "name": "string"
      },
      "target": {
        "type": "string",
        "id": "string",
        "name": "string | null"
      },
      "details": "object | null",
      "ip": "string | null",
      "status": "success|failure|warning"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

### POST /api/audit/export

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "filterCategory": "string | null",
  "filterStatus": "string | null",
  "dateRange": {
    "from": "ISO string",
    "to": "ISO string"
  }
}
```

**Response:** CSV blob (Content-Type: text/csv)

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired |
| `AUTH_TOKEN_INVALID` | 401 | Invalid or malformed token |
| `AUTH_FORBIDDEN` | 403 | User lacks permission |
| `RESOURCE_NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `BILLING_TRIAL_EXPIRED` | 403 | Trial period ended |
| `BILLING_LIMIT_EXCEEDED` | 403 | Usage limit reached |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Versioning

API versioning is NOT implemented yet. When implemented:
- Use header: `X-API-Version: 1`
- Or path prefix: `/api/v1/...`

---

*Gerado em: 2025-12-19*
*Responsavel: Claude Code*
