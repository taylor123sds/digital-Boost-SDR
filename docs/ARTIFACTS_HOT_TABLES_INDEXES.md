# Hot Tables and Indexes

## Hot tables (by domain expectation)

- whatsapp_messages
- leads
- conversations
- inbound_events
- async_jobs
- messages
- cadence_enrollments
- integrations

## Indexes affecting hot tables

| TABLE | INDEX | COLUMNS | UNIQUE | FILE |
|---|---|---|---|---|
| whatsapp_messages | idx_whatsapp_messages_phone_created | phone_number, created_at DESC |  | src/db/migrations/001_add_performance_indexes.sql |
| whatsapp_messages | idx_whatsapp_messages_from_me | from_me |  | src/db/migrations/001_add_performance_indexes.sql |
| leads | idx_leads_email | email |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_whatsapp | whatsapp |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_status | status |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_origem | origem |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_score | score |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_owner | owner_id |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_converted | converted |  | src/db/migrations/003_create_leads.sql |
| leads | idx_leads_created | created_at |  | src/db/migrations/003_create_leads.sql |
| cadence_enrollments | idx_cadence_enrollments_last_response | last_response_at |  | src/db/migrations/007_add_last_response_at.sql |
| leads | idx_leads_pipeline | pipeline_id |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_stage | stage_id |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_cadence_status | cadence_status |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_cadence_day | cadence_day |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_cadence_next | cadence_next_action_at |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_response_type | response_type |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_status_digital | status_digital |  | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_enrollments | idx_cadence_enrollments_lead | lead_id |  | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_enrollments | idx_cadence_enrollments_status | status |  | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_enrollments | idx_cadence_enrollments_cadence | cadence_id |  | src/db/migrations/020_extend_leads_cadence.sql |
| leads | idx_leads_tenant_id | tenant_id |  | src/db/migrations/025_multi_tenancy.sql |
| whatsapp_messages | idx_whatsapp_messages_tenant_id | tenant_id |  | src/db/migrations/025_multi_tenancy.sql |
| integrations | idx_integrations_tenant_id | tenant_id |  | src/db/migrations/025_multi_tenancy.sql |
| integrations | idx_integrations_provider | provider |  | src/db/migrations/025_multi_tenancy.sql |
| integrations | idx_integrations_instance_name | instance_name |  | src/db/migrations/025_multi_tenancy.sql |
| whatsapp_messages | idx_whatsapp_messages_tenant_id | tenant_id |  | src/db/migrations/025_multi_tenancy_simple.sql |
| integrations | idx_integrations_tenant_id | tenant_id |  | src/db/migrations/025_multi_tenancy_simple.sql |
| integrations | idx_integrations_provider | provider |  | src/db/migrations/025_multi_tenancy_simple.sql |
| integrations | idx_integrations_instance_name | instance_name |  | src/db/migrations/025_multi_tenancy_simple.sql |
| integrations | idx_integrations_webhook_public_id | json_extract(config_json, '$.webhook_public_id' |  | src/db/migrations/029_integration_webhook_fields.sql |
| integrations | idx_integrations_provider_status | provider, status |  | src/db/migrations/030_crm_integration.sql |
| inbound_events | idx_inbound_events_idempotency | provider, provider_event_id | yes | src/db/migrations/031_inbound_events.sql |
| inbound_events | idx_inbound_events_status | status |  | src/db/migrations/031_inbound_events.sql |
| inbound_events | idx_inbound_events_tenant | tenant_id, created_at DESC |  | src/db/migrations/031_inbound_events.sql |
| inbound_events | idx_inbound_events_contact | contact_phone, created_at DESC |  | src/db/migrations/031_inbound_events.sql |
| inbound_events | idx_inbound_events_processing_timeout | processing_started_at |  | src/db/migrations/031_inbound_events.sql |
| inbound_events | idx_inbound_events_retry | next_retry_at |  | src/db/migrations/031_inbound_events.sql |
| async_jobs | idx_async_jobs_pending | priority DESC, scheduled_for ASC |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_contact_lock | contact_id, status |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_retry | next_retry_at |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_timeout | locked_at |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_tenant | tenant_id, created_at DESC |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_type | job_type, status |  | src/db/migrations/032_async_jobs.sql |
| async_jobs | idx_async_jobs_contact_history | contact_id, created_at DESC |  | src/db/migrations/032_async_jobs.sql |
| whatsapp_messages | idx_whatsapp_messages_provider_id | provider_message_id |  | src/db/migrations/033_provider_message_id.sql |
| whatsapp_messages | idx_whatsapp_messages_delivery | delivery_status, from_me |  | src/db/migrations/033_provider_message_id.sql |
| leads | idx_leads_unique_phone | telefone | yes | src/db/migrations/034_race_condition_fixes.sql |
| leads | idx_leads_unique_whatsapp | whatsapp | yes | src/db/migrations/034_race_condition_fixes.sql |
| whatsapp_messages | idx_messages_unique_provider_id | provider_message_id | yes | src/db/migrations/034_race_condition_fixes.sql |
| inbound_events | idx_inbound_events_unique_provider | provider, provider_event_id | yes | src/db/migrations/034_race_condition_fixes.sql |
| leads | idx_leads_cadence_status | cadence_status, stage_id |  | src/db/migrations/034_race_condition_fixes.sql |
| whatsapp_messages | idx_messages_recent_by_contact | phone_number, created_at DESC |  | src/db/migrations/034_race_condition_fixes.sql |
| async_jobs | idx_jobs_contact_processing | contact_id |  | src/db/migrations/034_race_condition_fixes.sql |
| integrations | idx_integrations_webhook_public_id_unique | webhook_public_id | yes | src/db/migrations/037_webhook_public_id_column.sql |
