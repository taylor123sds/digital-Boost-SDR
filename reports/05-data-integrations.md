# Data integrations (Evolution, Google OAuth, CRMs)

## Evolution (WhatsApp via Evolution API)
- One-click connect endpoints live in `channels.routes.js` under `/api/agents/:agentId/channels/evolution/*`. Evidence: `src/api/routes/channels.routes.js:17-188`.
- Connection flow uses `IntegrationService.connectEvolutionForAgent()` to create/bind integrations and `EvolutionProvider` to create/connect instances. Evidence: `src/api/routes/channels.routes.js:31-33` and `src/services/IntegrationService.js:301-425`.
- EvolutionProvider config uses `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, and builds webhook URL to `/api/webhooks/inbound/:webhookPublicId`. Evidence: `src/providers/EvolutionProvider.js:27-36` and `src/providers/EvolutionProvider.js:74-76`.
- Evolution webhook events include `MESSAGES_UPSERT`/`MESSAGES_UPDATE` and lifecycle events in the provider payload. Evidence: `src/providers/EvolutionProvider.js:86-95`.
- Additional Evolution endpoints (legacy) exist in `agents.routes.js` (`/api/agents/:agentId/evolution/*`) and use `getEvolutionManager` from `src/scalable/agents`. Evidence: `src/api/routes/agents.routes.js:456-686`.

## CRM OAuth (Kommo, HubSpot, Pipedrive)
- OAuth start and callback endpoints are `/api/integrations/crm/:provider/oauth/start` and `/api/integrations/oauth/callback/:provider`. Evidence: `src/api/routes/crm-integration.routes.js:50-169`.
- Kommo is implemented; HubSpot and Pipedrive OAuth flows are TODO and return `not_implemented`. Evidence: `src/api/routes/crm-integration.routes.js:97-111` and `src/api/routes/crm-integration.routes.js:203-210`.
- Tokens are encrypted and stored in `integrations.config_json` fields `oauth_tokens_encrypted`, `oauth_token_expires_at`, and `oauth_scopes`. Evidence: `src/services/IntegrationOAuthService.js:174-195`.
- Encryption requires `INTEGRATION_ENCRYPTION_KEY` (no fallback). Evidence: `src/services/IntegrationOAuthService.js:16-21`.
- On-demand refresh uses `refreshTokensIfNeeded()` and `getValidTokens()`, currently implemented for Kommo via `KommoCRMProvider.refreshAccessToken()`. Evidence: `src/services/IntegrationOAuthService.js:262-335` and `src/providers/crm/KommoCRMProvider.js:82-121`.
- Periodic refresh job scans integrations with stored tokens and refreshes them. Evidence: `src/services/IntegrationOAuthRefreshJob.js:31-45`.

## Google OAuth / Calendar
- Google OAuth endpoints exist at `/api/google/auth-url`, `/auth/google`, and `/oauth2callback` plus calendar/event APIs. Evidence: `src/api/routes/google/calendar.routes.js:23-158`.
- OAuth tokens for Calendar are stored on disk at `GOOGLE_TOKEN_PATH` (default `./google_token.json`). Evidence: `src/api/routes/google/calendar.routes.js:45-60`.
- Meeting transcription service supports Service Account or OAuth2 via env vars (`GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_CLIENT_ID/SECRET` + `GOOGLE_REFRESH_TOKEN`). Evidence: `src/services/meetings/MeetingTranscriptionService.js:41-73`.

## Known integration risks (code evidence only)
- HubSpot/Pipedrive flows are declared but not implemented, returning `not_implemented`. Evidence: `src/api/routes/crm-integration.routes.js:203-210`.
- Evolution management appears in both `channels.routes.js` (canonical) and `agents.routes.js` (legacy/scalable), implying two integration surfaces. Evidence: `src/api/routes/channels.routes.js:17-188` and `src/api/routes/agents.routes.js:456-686`.
