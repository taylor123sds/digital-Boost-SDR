# DB Schema and Queries

## Tables from Migrations

| TABLE | MIGRATIONS |
|---|---|
| accounts | src/db/migrations/001_create_accounts.sql |
| contacts | src/db/migrations/002_create_contacts.sql, src/platform/database/migrations/001_initial_schema.sql |
| leads | src/db/migrations/003_create_leads.sql |
| opportunities | src/db/migrations/004_create_opportunities.sql |
| activities | src/db/migrations/005_create_activities.sql, src/db/migrations/017_extend_activities.sql |
| crm_messages | src/db/migrations/006_create_messages.sql |
| meetings | src/db/migrations/007_create_meetings.sql |
| products | src/db/migrations/008_create_products.sql |
| opportunity_products | src/db/migrations/008_create_products.sql |
| custom_field_definitions | src/db/migrations/009_create_custom_fields.sql |
| workflows | src/db/migrations/010_create_workflows.sql |
| workflow_actions | src/db/migrations/010_create_workflows.sql |
| workflow_executions | src/db/migrations/010_create_workflows.sql |
| meeting_transcriptions | src/db/migrations/011_create_meeting_analysis_tables.sql |
| meeting_analysis | src/db/migrations/011_create_meeting_analysis_tables.sql |
| meeting_scores | src/db/migrations/011_create_meeting_analysis_tables.sql |
| meeting_insights | src/db/migrations/011_create_meeting_analysis_tables.sql |
| automations | src/db/migrations/012_create_automations.sql |
| automation_executions | src/db/migrations/012_create_automations.sql |
| users | src/db/migrations/013_create_users.sql, src/platform/database/migrations/001_initial_schema.sql |
| teams | src/db/migrations/014_create_teams.sql |
| user_teams | src/db/migrations/014_create_teams.sql |
| notifications | src/db/migrations/015_create_notifications.sql |
| notification_preferences | src/db/migrations/015_create_notifications.sql |
| scoring_rules | src/db/migrations/016_create_scoring_rules.sql |
| lead_scores | src/db/migrations/016_create_scoring_rules.sql |
| score_history | src/db/migrations/016_create_scoring_rules.sql |
| sessions | src/db/migrations/018_create_sessions.sql |
| auth_audit_log | src/db/migrations/018_create_sessions.sql |
| password_reset_tokens | src/db/migrations/018_create_sessions.sql |
| pipelines | src/db/migrations/019_create_pipeline_stages.sql |
| pipeline_stages | src/db/migrations/019_create_pipeline_stages.sql |
| loss_reasons | src/db/migrations/019_create_pipeline_stages.sql |
| pipeline_history | src/db/migrations/019_create_pipeline_stages.sql |
| cadences | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_steps | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_enrollments | src/db/migrations/020_extend_leads_cadence.sql |
| cadence_actions_log | src/db/migrations/020_extend_leads_cadence.sql |
| response_templates | src/db/migrations/021_insert_cadence_steps.sql, src/platform/database/migrations/001_initial_schema.sql |
| agents | src/db/migrations/025_multi_tenancy.sql, src/platform/database/migrations/001_initial_schema.sql |
| agent_versions | src/db/migrations/025_multi_tenancy.sql, src/db/migrations/036_agent_versions_immutability.sql, src/platform/database/migrations/001_initial_schema.sql |
| integrations | src/db/migrations/025_multi_tenancy.sql, src/db/migrations/025_multi_tenancy_simple.sql, src/platform/database/migrations/001_initial_schema.sql |
| integration_bindings | src/db/migrations/025_multi_tenancy.sql |
| user_trial_grants | src/db/migrations/028_trial_billing.sql |
| subscription_plans | src/db/migrations/028_trial_billing.sql |
| billing_events | src/db/migrations/028_trial_billing.sql |
| usage_metrics | src/db/migrations/028_trial_billing.sql |
| oauth_states | src/db/migrations/030_crm_integration.sql |
| crm_sync_cursors | src/db/migrations/030_crm_integration.sql |
| crm_mappings | src/db/migrations/030_crm_integration.sql |
| crm_sync_jobs | src/db/migrations/030_crm_integration.sql |
| crm_field_mappings | src/db/migrations/030_crm_integration.sql |
| inbound_events | src/db/migrations/031_inbound_events.sql |
| async_jobs | src/db/migrations/032_async_jobs.sql |
| conversation_contexts | src/db/migrations/035_conversation_contexts.sql |
| tenants | src/platform/database/migrations/001_initial_schema.sql |
| conversations | src/platform/database/migrations/001_initial_schema.sql |
| messages | src/platform/database/migrations/001_initial_schema.sql |
| tool_calls | src/platform/database/migrations/001_initial_schema.sql |
| knowledge_docs | src/platform/database/migrations/001_initial_schema.sql |
| scheduled_meetings | src/platform/database/migrations/001_initial_schema.sql |
| handoff_sessions | src/platform/database/migrations/001_initial_schema.sql |
| audit_logs | src/platform/database/migrations/001_initial_schema.sql |
| agent_metrics | src/platform/database/migrations/001_initial_schema.sql |
| webhooks | src/platform/database/migrations/001_initial_schema.sql |
| webhook_deliveries | src/platform/database/migrations/001_initial_schema.sql |

## Foreign Keys (from migrations)

| FILE | COLUMN | REFERENCES |
|---|---|---|
| src/db/migrations/002_create_contacts.sql | account_id | accounts(id) |
| src/db/migrations/003_create_leads.sql | opportunity_id | opportunities(id) |
| src/db/migrations/003_create_leads.sql | account_id | accounts(id) |
| src/db/migrations/003_create_leads.sql | contact_id | contacts(id) |
| src/db/migrations/004_create_opportunities.sql | account_id | accounts(id) |
| src/db/migrations/004_create_opportunities.sql | contact_id | contacts(id) |
| src/db/migrations/004_create_opportunities.sql | lead_id | leads(id) |
| src/db/migrations/005_create_activities.sql | lead_id | leads(id) |
| src/db/migrations/005_create_activities.sql | contact_id | contacts(id) |
| src/db/migrations/005_create_activities.sql | account_id | accounts(id) |
| src/db/migrations/005_create_activities.sql | opportunity_id | opportunities(id) |
| src/db/migrations/006_create_messages.sql | contact_id | contacts(id) |
| src/db/migrations/006_create_messages.sql | lead_id | leads(id) |
| src/db/migrations/006_create_messages.sql | account_id | accounts(id) |
| src/db/migrations/006_create_messages.sql | opportunity_id | opportunities(id) |
| src/db/migrations/006_create_messages.sql | activity_id | activities(id) |
| src/db/migrations/007_create_meetings.sql | activity_id | activities(id) |
| src/db/migrations/007_create_meetings.sql | account_id | accounts(id) |
| src/db/migrations/007_create_meetings.sql | contact_id | contacts(id) |
| src/db/migrations/007_create_meetings.sql | opportunity_id | opportunities(id) |
| src/db/migrations/007_create_meetings.sql | lead_id | leads(id) |
| src/db/migrations/008_create_products.sql | opportunity_id | opportunities(id) |
| src/db/migrations/008_create_products.sql | product_id | products(id) |
| src/db/migrations/010_create_workflows.sql | workflow_id | workflows(id) |
| src/db/migrations/010_create_workflows.sql | workflow_id | workflows(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | meeting_id | meetings(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | account_id | accounts(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | contact_id | contacts(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | opportunity_id | opportunities(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | transcription_id | meeting_transcriptions(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | meeting_id | meetings(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | analysis_id | meeting_analysis(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | meeting_id | meetings(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | analysis_id | meeting_analysis(id) |
| src/db/migrations/011_create_meeting_analysis_tables.sql | meeting_id | meetings(id) |
| src/db/migrations/012_create_automations.sql | automation_id | automations(id) |
| src/db/migrations/014_create_teams.sql | manager_id | users(id) |
| src/db/migrations/014_create_teams.sql | user_id | users(id) |
| src/db/migrations/014_create_teams.sql | team_id | teams(id) |
| src/db/migrations/015_create_notifications.sql | user_id | users(id) |
| src/db/migrations/015_create_notifications.sql | user_id | users(id) |
| src/db/migrations/016_create_scoring_rules.sql | lead_id | leads(id) |
| src/db/migrations/016_create_scoring_rules.sql | lead_id | leads(id) |
| src/db/migrations/017_extend_activities.sql | lead_id | leads(id) |
| src/db/migrations/017_extend_activities.sql | contact_id | contacts(id) |
| src/db/migrations/017_extend_activities.sql | account_id | accounts(id) |
| src/db/migrations/017_extend_activities.sql | opportunity_id | opportunities(id) |
| src/db/migrations/017_extend_activities.sql | owner_id | users(id) |
| src/db/migrations/017_extend_activities.sql | assigned_to | users(id) |
| src/db/migrations/018_create_sessions.sql | user_id | users(id) |
| src/db/migrations/018_create_sessions.sql | user_id | users(id) |
| src/db/migrations/018_create_sessions.sql | user_id | users(id) |
| src/db/migrations/019_create_pipeline_stages.sql | pipeline_id | pipelines(id) |
| src/db/migrations/019_create_pipeline_stages.sql | lead_id | leads(id) |
| src/db/migrations/019_create_pipeline_stages.sql | from_stage_id | pipeline_stages(id) |
| src/db/migrations/019_create_pipeline_stages.sql | to_stage_id | pipeline_stages(id) |
| src/db/migrations/019_create_pipeline_stages.sql | loss_reason_id | loss_reasons(id) |
| src/db/migrations/020_extend_leads_cadence.sql | cadence_id | cadences(id) |
| src/db/migrations/020_extend_leads_cadence.sql | cadence_id | cadences(id) |
| src/db/migrations/020_extend_leads_cadence.sql | lead_id | leads(id) |
| src/db/migrations/020_extend_leads_cadence.sql | enrollment_id | cadence_enrollments(id) |
| src/db/migrations/020_extend_leads_cadence.sql | step_id | cadence_steps(id) |
| src/db/migrations/020_extend_leads_cadence.sql | lead_id | leads(id) |
| src/db/migrations/025_multi_tenancy.sql | agent_id | agents(id) |
| src/db/migrations/025_multi_tenancy.sql | agent_id | agents(id) |
| src/db/migrations/025_multi_tenancy.sql | integration_id | integrations(id) |
| src/db/migrations/028_trial_billing.sql | user_id | users(id) |
| src/db/migrations/028_trial_billing.sql | team_id | teams(id) |
| src/db/migrations/028_trial_billing.sql | team_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | tenant_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | integration_id | integrations(id) |
| src/db/migrations/030_crm_integration.sql | tenant_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | integration_id | integrations(id) |
| src/db/migrations/030_crm_integration.sql | tenant_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | integration_id | integrations(id) |
| src/db/migrations/030_crm_integration.sql | tenant_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | integration_id | integrations(id) |
| src/db/migrations/030_crm_integration.sql | tenant_id | teams(id) |
| src/db/migrations/030_crm_integration.sql | integration_id | integrations(id) |
| src/db/migrations/036_agent_versions_immutability.sql | agent_id | agents(id) |

## Indexes / Constraints

| FILE | INDEX | TABLE | COLUMNS | UNIQUE |
|---|---|---|---|---|
| src/db/migrations/001_add_performance_indexes.sql | idx_whatsapp_messages_phone_created | whatsapp_messages | phone_number, created_at DESC |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_whatsapp_messages_from_me | whatsapp_messages | from_me |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_conversation_states_phone | enhanced_conversation_states | phone_number |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_conversation_states_agent | enhanced_conversation_states | current_agent |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_conversation_states_bant_stage | enhanced_conversation_states | bant_stage |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_conversation_states_updated | enhanced_conversation_states | updated_at DESC |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_memory_key | memory | key |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_bot_blocks_phone | bot_blocks | phone_number |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_bot_blocks_blocked_at | bot_blocks | blocked_at DESC |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_agent_metrics_agent_created | agent_metrics | agent_name, created_at DESC |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_agent_metrics_phone | agent_metrics | phone_number |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_metrics_phone_logged | enhanced_metrics | phone_number, logged_at DESC |  |
| src/db/migrations/001_add_performance_indexes.sql | idx_enhanced_metrics_states | enhanced_metrics | state_from, state_to |  |
| src/db/migrations/001_create_accounts.sql | idx_accounts_cnpj | accounts | cnpj |  |
| src/db/migrations/001_create_accounts.sql | idx_accounts_tipo | accounts | tipo |  |
| src/db/migrations/001_create_accounts.sql | idx_accounts_setor | accounts | setor |  |
| src/db/migrations/001_create_accounts.sql | idx_accounts_owner | accounts | owner_id |  |
| src/db/migrations/001_create_accounts.sql | idx_accounts_created | accounts | created_at |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_account | contacts | account_id |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_email | contacts | email |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_whatsapp | contacts | whatsapp |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_senioridade | contacts | senioridade |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_score | contacts | score |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_status | contacts | status |  |
| src/db/migrations/002_create_contacts.sql | idx_contacts_is_decisor | contacts | is_decisor |  |
| src/db/migrations/003_create_leads.sql | idx_leads_email | leads | email |  |
| src/db/migrations/003_create_leads.sql | idx_leads_whatsapp | leads | whatsapp |  |
| src/db/migrations/003_create_leads.sql | idx_leads_status | leads | status |  |
| src/db/migrations/003_create_leads.sql | idx_leads_origem | leads | origem |  |
| src/db/migrations/003_create_leads.sql | idx_leads_score | leads | score |  |
| src/db/migrations/003_create_leads.sql | idx_leads_owner | leads | owner_id |  |
| src/db/migrations/003_create_leads.sql | idx_leads_converted | leads | converted |  |
| src/db/migrations/003_create_leads.sql | idx_leads_created | leads | created_at |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_account | opportunities | account_id |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_contact | opportunities | contact_id |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_stage | opportunities | stage |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_status | opportunities | status |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_owner | opportunities | owner_id |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_valor | opportunities | valor |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_close_date | opportunities | data_fechamento_prevista |  |
| src/db/migrations/004_create_opportunities.sql | idx_opportunities_created | opportunities | created_at |  |
| src/db/migrations/005_create_activities.sql | idx_activities_tipo | activities | tipo |  |
| src/db/migrations/005_create_activities.sql | idx_activities_status | activities | status |  |
| src/db/migrations/005_create_activities.sql | idx_activities_lead | activities | lead_id |  |
| src/db/migrations/005_create_activities.sql | idx_activities_contact | activities | contact_id |  |
| src/db/migrations/005_create_activities.sql | idx_activities_account | activities | account_id |  |
| src/db/migrations/005_create_activities.sql | idx_activities_opportunity | activities | opportunity_id |  |
| src/db/migrations/005_create_activities.sql | idx_activities_owner | activities | owner_id |  |
| src/db/migrations/005_create_activities.sql | idx_activities_data_agendada | activities | data_agendada |  |
| src/db/migrations/005_create_activities.sql | idx_activities_prioridade | activities | prioridade |  |
| src/db/migrations/005_create_activities.sql | idx_activities_created | activities | created_at |  |
| src/db/migrations/005_create_activities.sql | idx_activities_related | activities | related_to_type, related_to_id |  |
| src/db/migrations/005_delivery_tracking.sql | idx_cadence_actions_message_id | cadence_actions_log | message_id |  |
| src/db/migrations/005_delivery_tracking.sql | idx_cadence_actions_delivery_status | cadence_actions_log | delivery_status |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_contact | crm_messages | contact_id |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_lead | crm_messages | lead_id |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_account | crm_messages | account_id |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_opportunity | crm_messages | opportunity_id |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_canal | crm_messages | canal |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_status | crm_messages | status |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_sent | crm_messages | sent_at |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_whatsapp_id | crm_messages | whatsapp_message_id |  |
| src/db/migrations/006_create_messages.sql | idx_crm_messages_campanha | crm_messages | campanha_id |  |
| src/db/migrations/007_add_last_response_at.sql | idx_cadence_enrollments_last_response | cadence_enrollments | last_response_at |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_activity | meetings | activity_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_account | meetings | account_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_contact | meetings | contact_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_opportunity | meetings | opportunity_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_data_inicio | meetings | data_inicio |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_status | meetings | status |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_organizador | meetings | organizador_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_google_event | meetings | google_event_id |  |
| src/db/migrations/007_create_meetings.sql | idx_meetings_created | meetings | created_at |  |
| src/db/migrations/008_create_products.sql | idx_products_codigo | products | codigo |  |
| src/db/migrations/008_create_products.sql | idx_products_categoria | products | categoria |  |
| src/db/migrations/008_create_products.sql | idx_products_ativo | products | ativo |  |
| src/db/migrations/008_create_products.sql | idx_products_tipo | products | tipo |  |
| src/db/migrations/008_create_products.sql | idx_products_created | products | created_at |  |
| src/db/migrations/008_create_products.sql | idx_opp_products_opportunity | opportunity_products | opportunity_id |  |
| src/db/migrations/008_create_products.sql | idx_opp_products_product | opportunity_products | product_id |  |
| src/db/migrations/009_create_custom_fields.sql | idx_custom_field_defs_entidade | custom_field_definitions | entidade |  |
| src/db/migrations/009_create_custom_fields.sql | idx_custom_field_defs_ativo | custom_field_definitions | ativo |  |
| src/db/migrations/009_create_custom_fields.sql | idx_custom_field_defs_ordem | custom_field_definitions | ordem |  |
| src/db/migrations/010_create_workflows.sql | idx_workflows_entidade | workflows | trigger_entidade |  |
| src/db/migrations/010_create_workflows.sql | idx_workflows_ativo | workflows | ativo |  |
| src/db/migrations/010_create_workflows.sql | idx_workflows_prioridade | workflows | prioridade |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_actions_workflow | workflow_actions | workflow_id |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_actions_ordem | workflow_actions | ordem |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_actions_ativo | workflow_actions | ativo |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_executions_workflow | workflow_executions | workflow_id |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_executions_status | workflow_executions | status |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_executions_entidade | workflow_executions | entidade_tipo, entidade_id |  |
| src/db/migrations/010_create_workflows.sql | idx_workflow_executions_created | workflow_executions | created_at |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mt_meeting | meeting_transcriptions | meeting_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mt_google_event | meeting_transcriptions | google_event_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mt_status | meeting_transcriptions | status |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mt_data_reuniao | meeting_transcriptions | data_reuniao |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mt_created | meeting_transcriptions | created_at |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ma_transcription | meeting_analysis | transcription_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ma_meeting | meeting_analysis | meeting_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ma_resultado | meeting_analysis | resultado_previsto |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ma_sentimento | meeting_analysis | sentimento_geral |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ma_created | meeting_analysis | created_at |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ms_analysis | meeting_scores | analysis_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ms_meeting | meeting_scores | meeting_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ms_score_total | meeting_scores | score_total |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ms_metodologia | meeting_scores | metodologia_primaria |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_ms_created | meeting_scores | created_at |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_analysis | meeting_insights | analysis_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_meeting | meeting_insights | meeting_id |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_tipo | meeting_insights | tipo |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_prioridade | meeting_insights | prioridade |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_status | meeting_insights | status |  |
| src/db/migrations/011_create_meeting_analysis_tables.sql | idx_mi_created | meeting_insights | created_at |  |
| src/db/migrations/012_create_automations.sql | idx_automations_enabled | automations | enabled |  |
| src/db/migrations/012_create_automations.sql | idx_automations_category | automations | category |  |
| src/db/migrations/012_create_automations.sql | idx_automation_executions_automation | automation_executions | automation_id |  |
| src/db/migrations/012_create_automations.sql | idx_automation_executions_status | automation_executions | status |  |
| src/db/migrations/012_create_automations.sql | idx_automation_executions_date | automation_executions | executed_at |  |
| src/db/migrations/013_create_users.sql | idx_users_email | users | email |  |
| src/db/migrations/013_create_users.sql | idx_users_team | users | team_id |  |
| src/db/migrations/013_create_users.sql | idx_users_role | users | role |  |
| src/db/migrations/013_create_users.sql | idx_users_active | users | is_active |  |
| src/db/migrations/014_create_teams.sql | idx_teams_manager | teams | manager_id |  |
| src/db/migrations/014_create_teams.sql | idx_teams_active | teams | is_active |  |
| src/db/migrations/014_create_teams.sql | idx_user_teams_user | user_teams | user_id |  |
| src/db/migrations/014_create_teams.sql | idx_user_teams_team | user_teams | team_id |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_user | notifications | user_id |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_type | notifications | type |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_priority | notifications | priority |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_read | notifications | is_read |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_created | notifications | created_at |  |
| src/db/migrations/015_create_notifications.sql | idx_notifications_entity | notifications | entity_type, entity_id |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_scoring_rules_active | scoring_rules | is_active |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_scoring_rules_category | scoring_rules | category |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_scoring_rules_field | scoring_rules | field |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_lead_scores_lead | lead_scores | lead_id |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_lead_scores_grade | lead_scores | grade |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_lead_scores_total | lead_scores | total_score DESC |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_score_history_lead | score_history | lead_id |  |
| src/db/migrations/016_create_scoring_rules.sql | idx_score_history_created | score_history | created_at |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_lead | activities | lead_id |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_contact | activities | contact_id |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_account | activities | account_id |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_opportunity | activities | opportunity_id |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_tipo | activities | tipo |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_status | activities | status |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_priority | activities | priority |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_due_date | activities | due_date |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_owner | activities | owner_id |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_assigned | activities | assigned_to |  |
| src/db/migrations/017_extend_activities.sql | idx_activities_created | activities | created_at |  |
| src/db/migrations/018_create_sessions.sql | idx_sessions_user | sessions | user_id |  |
| src/db/migrations/018_create_sessions.sql | idx_sessions_token | sessions | token |  |
| src/db/migrations/018_create_sessions.sql | idx_sessions_refresh | sessions | refresh_token |  |
| src/db/migrations/018_create_sessions.sql | idx_sessions_valid | sessions | is_valid |  |
| src/db/migrations/018_create_sessions.sql | idx_sessions_expires | sessions | expires_at |  |
| src/db/migrations/018_create_sessions.sql | idx_auth_audit_user | auth_audit_log | user_id |  |
| src/db/migrations/018_create_sessions.sql | idx_auth_audit_event | auth_audit_log | event_type |  |
| src/db/migrations/018_create_sessions.sql | idx_auth_audit_created | auth_audit_log | created_at |  |
| src/db/migrations/018_create_sessions.sql | idx_password_reset_user | password_reset_tokens | user_id |  |
| src/db/migrations/018_create_sessions.sql | idx_password_reset_token | password_reset_tokens | token |  |
| src/db/migrations/019_create_pipeline_stages.sql | idx_pipeline_stages_pipeline | pipeline_stages | pipeline_id |  |
| src/db/migrations/019_create_pipeline_stages.sql | idx_pipeline_stages_slug | pipeline_stages | slug |  |
| src/db/migrations/019_create_pipeline_stages.sql | idx_pipeline_stages_position | pipeline_stages | pipeline_id, position |  |
| src/db/migrations/019_create_pipeline_stages.sql | idx_pipeline_history_lead | pipeline_history | lead_id |  |
| src/db/migrations/019_create_pipeline_stages.sql | idx_pipeline_history_date | pipeline_history | created_at |  |
| src/db/migrations/020_add_company_sector_to_users.sql | idx_users_company | users | company |  |
| src/db/migrations/020_add_company_sector_to_users.sql | idx_users_sector | users | sector |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_pipeline | leads | pipeline_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_stage | leads | stage_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_cadence_status | leads | cadence_status |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_cadence_day | leads | cadence_day |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_cadence_next | leads | cadence_next_action_at |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_response_type | leads | response_type |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_leads_status_digital | leads | status_digital |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_steps_cadence | cadence_steps | cadence_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_steps_day | cadence_steps | cadence_id, day |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_enrollments_lead | cadence_enrollments | lead_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_enrollments_status | cadence_enrollments | status |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_enrollments_cadence | cadence_enrollments | cadence_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_actions_enrollment | cadence_actions_log | enrollment_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_actions_lead | cadence_actions_log | lead_id |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_actions_scheduled | cadence_actions_log | scheduled_at |  |
| src/db/migrations/020_extend_leads_cadence.sql | idx_cadence_actions_status | cadence_actions_log | status |  |
| src/db/migrations/021_insert_cadence_steps.sql | idx_response_templates_type | response_templates | response_type |  |
| src/db/migrations/025_multi_tenancy.sql | idx_leads_tenant_id | leads | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_accounts_tenant_id | accounts | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_contacts_tenant_id | contacts | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_opportunities_tenant_id | opportunities | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_activities_tenant_id | activities | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_whatsapp_messages_tenant_id | whatsapp_messages | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_pipelines_tenant_id | pipelines | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_agents_tenant_id | agents | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_agents_status | agents | status |  |
| src/db/migrations/025_multi_tenancy.sql | idx_agents_type | agents | type |  |
| src/db/migrations/025_multi_tenancy.sql | idx_agent_versions_agent_id | agent_versions | agent_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_agent_versions_tenant_id | agent_versions | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integrations_tenant_id | integrations | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integrations_provider | integrations | provider |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integrations_instance_name | integrations | instance_name |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integration_bindings_tenant_id | integration_bindings | tenant_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integration_bindings_agent_id | integration_bindings | agent_id |  |
| src/db/migrations/025_multi_tenancy.sql | idx_integration_bindings_integration_id | integration_bindings | integration_id |  |
| src/db/migrations/025_multi_tenancy_simple.sql | idx_whatsapp_messages_tenant_id | whatsapp_messages | tenant_id |  |
| src/db/migrations/025_multi_tenancy_simple.sql | idx_integrations_tenant_id | integrations | tenant_id |  |
| src/db/migrations/025_multi_tenancy_simple.sql | idx_integrations_provider | integrations | provider |  |
| src/db/migrations/025_multi_tenancy_simple.sql | idx_integrations_instance_name | integrations | instance_name |  |
| src/db/migrations/028_trial_billing.sql | idx_user_trial_grants_user | user_trial_grants | user_id |  |
| src/db/migrations/028_trial_billing.sql | idx_user_trial_grants_email | user_trial_grants | email |  |
| src/db/migrations/028_trial_billing.sql | idx_billing_events_team | billing_events | team_id |  |
| src/db/migrations/028_trial_billing.sql | idx_billing_events_type | billing_events | event_type |  |
| src/db/migrations/028_trial_billing.sql | idx_billing_events_created | billing_events | created_at |  |
| src/db/migrations/028_trial_billing.sql | idx_usage_metrics_team | usage_metrics | team_id |  |
| src/db/migrations/028_trial_billing.sql | idx_usage_metrics_period | usage_metrics | period_start, period_end |  |
| src/db/migrations/029_integration_webhook_fields.sql | idx_integrations_webhook_public_id | integrations | json_extract(config_json, '$.webhook_public_id' |  |
| src/db/migrations/030_crm_integration.sql | idx_oauth_states_state | oauth_states | state |  |
| src/db/migrations/030_crm_integration.sql | idx_oauth_states_tenant | oauth_states | tenant_id |  |
| src/db/migrations/030_crm_integration.sql | idx_oauth_states_expires | oauth_states | expires_at |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_sync_cursors_integration | crm_sync_cursors | integration_id |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_mappings_integration | crm_mappings | integration_id |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_mappings_local | crm_mappings | local_id |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_mappings_remote | crm_mappings | remote_id |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_mappings_entity | crm_mappings | entity |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_sync_jobs_integration | crm_sync_jobs | integration_id |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_sync_jobs_status | crm_sync_jobs | status |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_sync_jobs_scheduled | crm_sync_jobs | scheduled_at |  |
| src/db/migrations/030_crm_integration.sql | idx_crm_field_mappings_integration | crm_field_mappings | integration_id |  |
| src/db/migrations/030_crm_integration.sql | idx_integrations_provider_status | integrations | provider, status |  |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_idempotency | inbound_events | provider, provider_event_id | yes |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_status | inbound_events | status |  |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_tenant | inbound_events | tenant_id, created_at DESC |  |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_contact | inbound_events | contact_phone, created_at DESC |  |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_processing_timeout | inbound_events | processing_started_at |  |
| src/db/migrations/031_inbound_events.sql | idx_inbound_events_retry | inbound_events | next_retry_at |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_pending | async_jobs | priority DESC, scheduled_for ASC |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_contact_lock | async_jobs | contact_id, status |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_retry | async_jobs | next_retry_at |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_timeout | async_jobs | locked_at |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_tenant | async_jobs | tenant_id, created_at DESC |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_type | async_jobs | job_type, status |  |
| src/db/migrations/032_async_jobs.sql | idx_async_jobs_contact_history | async_jobs | contact_id, created_at DESC |  |
| src/db/migrations/033_provider_message_id.sql | idx_whatsapp_messages_provider_id | whatsapp_messages | provider_message_id |  |
| src/db/migrations/033_provider_message_id.sql | idx_whatsapp_messages_delivery | whatsapp_messages | delivery_status, from_me |  |
| src/db/migrations/034_race_condition_fixes.sql | idx_leads_unique_phone | leads | telefone | yes |
| src/db/migrations/034_race_condition_fixes.sql | idx_leads_unique_whatsapp | leads | whatsapp | yes |
| src/db/migrations/034_race_condition_fixes.sql | idx_messages_unique_provider_id | whatsapp_messages | provider_message_id | yes |
| src/db/migrations/034_race_condition_fixes.sql | idx_inbound_events_unique_provider | inbound_events | provider, provider_event_id | yes |
| src/db/migrations/034_race_condition_fixes.sql | idx_leads_cadence_status | leads | cadence_status, stage_id |  |
| src/db/migrations/034_race_condition_fixes.sql | idx_messages_recent_by_contact | whatsapp_messages | phone_number, created_at DESC |  |
| src/db/migrations/034_race_condition_fixes.sql | idx_jobs_contact_processing | async_jobs | contact_id |  |
| src/db/migrations/035_conversation_contexts.sql | idx_conversation_contexts_phone | conversation_contexts | phone |  |
| src/db/migrations/035_conversation_contexts.sql | idx_conversation_contexts_lead | conversation_contexts | lead_id |  |
| src/db/migrations/035_conversation_contexts.sql | idx_conversation_contexts_tenant | conversation_contexts | tenant_id, created_at DESC |  |
| src/db/migrations/035_conversation_contexts.sql | idx_conversation_contexts_unique_lead | conversation_contexts | lead_id | yes |
| src/db/migrations/036_agent_versions_immutability.sql | idx_agent_versions_active | agent_versions | agent_id, is_active |  |
| src/db/migrations/036_agent_versions_immutability.sql | idx_agent_versions_order | agent_versions | agent_id, version_number DESC |  |
| src/db/migrations/036_anti_abuse_enhancements.sql | idx_user_trial_grants_ip | user_trial_grants | ip_address |  |
| src/db/migrations/036_anti_abuse_enhancements.sql | idx_user_trial_grants_normalized_email | user_trial_grants | normalized_email |  |
| src/db/migrations/036_anti_abuse_enhancements.sql | idx_user_trial_grants_created | user_trial_grants | created_at |  |
| src/db/migrations/037_webhook_public_id_column.sql | idx_integrations_webhook_public_id_unique | integrations | webhook_public_id | yes |
| src/platform/database/migrations/002_update_agent_types.sql | idx_agents_template | agents | template_id |  |
| src/platform/database/migrations/002_update_agent_types.sql | idx_agents_spin | agents | spin_enabled |  |
| src/platform/database/migrations/002_update_agent_types.sql | idx_agents_scheduling | agents | auto_scheduling |  |

## Query Map (table -> files)

- meetings: src/api/routes/ai-insights.routes.js, src/api/routes/command-center.routes.js, src/api/routes/pipeline.routes.js, src/automation/engine.js, src/scalable/admin/AdminApiRoutes.js
- activities: src/api/routes/ai-insights.routes.js, src/api/routes/command-center.routes.js, src/api/routes/reports.routes.js, src/models/Activity.js, src/models/Contact.js, src/models/Lead.js, src/models/Opportunity.js
- leads: src/api/routes/ai-insights.routes.js, src/api/routes/cadence.routes.js, src/api/routes/command-center.routes.js, src/api/routes/email-optin.routes.js, src/api/routes/funil.routes.js, src/api/routes/pipeline.routes.js, src/api/routes/reports.routes.js, src/api/routes/webhook.routes.js, src/automation/CadenceEngine.js, src/automation/EmailOptInEngine.js, src/automation/ProspectingEngine.js, src/automation/engine.js, src/db/migrations/003_prospect_leads.js, src/handlers/WebhookTransactionManager.js, src/handlers/webhook_handler.js, src/models/Activity.js, src/models/Lead.js, src/models/User.js, src/repositories/lead.repository.js, src/scalable/admin/AdminApiRoutes.js, src/security/OptOutInterceptor.js, src/services/CadenceIntegrationService.js, src/services/DataSyncService.js, src/services/ProspectImportService.js
- lead_scores: src/api/routes/ai-insights.routes.js, src/api/routes/command-center.routes.js, src/models/ScoringRule.js, src/tools/lead_scoring_system.js
- opportunities: src/api/routes/ai-insights.routes.js, src/api/routes/forecasting.routes.js, src/api/routes/reports.routes.js, src/automation/engine.js, src/models/Account.js, src/models/Activity.js, src/models/Contact.js, src/models/Lead.js, src/models/Opportunity.js, src/models/Team.js, src/repositories/lead.repository.js
- sessions: src/api/routes/auth.routes.js, src/services/AuthService.js
- automations: src/api/routes/automation.routes.js, src/automation/engine.js, src/automation/followup/installer.js
- automation_executions: src/api/routes/automation.routes.js, src/automation/engine.js, src/automation/followup/installer.js
- cadences: src/api/routes/cadence.routes.js, src/automation/CadenceEngine.js
- cadence_enrollments: src/api/routes/cadence.routes.js, src/api/routes/funil.routes.js, src/automation/CadenceEngine.js, src/automation/ProspectingEngine.js, src/handlers/WebhookTransactionManager.js, src/services/CadenceIntegrationService.js, src/services/DataSyncService.js
- pipeline_stages: src/api/routes/cadence.routes.js, src/api/routes/funil.routes.js, src/repositories/lead.repository.js
- cadence_steps: src/api/routes/cadence.routes.js, src/automation/CadenceEngine.js, src/services/DataSyncService.js
- pipeline_history: src/api/routes/cadence.routes.js, src/automation/CadenceEngine.js, src/handlers/WebhookTransactionManager.js, src/repositories/lead.repository.js, src/services/CadenceIntegrationService.js
- cadence_actions_log: src/api/routes/cadence.routes.js, src/automation/CadenceEngine.js, src/automation/ProspectingEngine.js, src/services/DataSyncService.js, src/services/DeliveryTrackingService.js
- notifications: src/api/routes/notifications.routes.js, src/models/Notification.js, src/scalable/admin/AdminApiRoutes.js
- integrations: src/api/routes/webhooks-inbound.routes.js, src/scalable/agents/AgentService.js, src/services/EntitlementService.js, src/services/IntegrationOAuthService.js, src/services/IntegrationService.js
- agents: src/config/AgentConfigLoader.js, src/platform/database/repositories/AgentRepository.js, src/repositories/agent.repository.js, src/scalable/agents/AgentConfigService.js, src/scalable/agents/AgentService.js, src/services/EntitlementService.js, src/services/IntegrationService.js
- tenants: src/config/AgentConfigLoader.js, src/scalable/admin/AdminApiRoutes.js, src/scalable/tenant/TenantService.js
- messages: src/domain/entities/Conversation.js, src/memory.js, src/platform/database/repositories/ConversationRepository.js
- agent_metrics: src/memory.js
- contacts: src/models/Account.js, src/models/Activity.js, src/models/Contact.js, src/models/Lead.js, src/models/Opportunity.js
- accounts: src/models/Account.js, src/models/Contact.js, src/models/Lead.js, src/models/Opportunity.js
- meeting_analysis: src/models/MeetingAnalysis.js
- meeting_insights: src/models/MeetingInsight.js
- meeting_scores: src/models/MeetingScore.js
- meeting_transcriptions: src/models/MeetingTranscription.js
- notification_preferences: src/models/Notification.js
- products: src/models/Opportunity.js
- opportunity_products: src/models/Opportunity.js
- scoring_rules: src/models/ScoringRule.js
- score_history: src/models/ScoringRule.js
- users: src/models/Team.js, src/models/User.js
- user_teams: src/models/Team.js, src/models/User.js
- teams: src/models/Team.js, src/models/User.js, src/services/AuthService.js, src/services/EntitlementService.js
- conversations: src/platform/database/repositories/AgentRepository.js, src/platform/database/repositories/ConversationRepository.js
- async_jobs: src/services/AsyncJobsService.js
- billing_events: src/services/AuthService.js, src/services/EntitlementService.js
- auth_audit_log: src/services/AuthService.js
- usage_metrics: src/services/EntitlementService.js
- user_trial_grants: src/services/EntitlementService.js
- inbound_events: src/services/InboundEventsService.js
- oauth_states: src/services/IntegrationOAuthService.js
- integration_bindings: src/services/IntegrationService.js
- agent_versions: src/services/PromptCacheService.js

## Multi-tenant SQL Audit (no tenant/team filter)

Findings: 380

| FILE | LINE | TABLES | SQL (truncated) |
|---|---:|---|---|
| src/api/routes/ai-insights.routes.js | 318 | meetings | SELECT COUNT(*) as scheduled FROM meetings WHERE created_at > datetime('now', '-' \|\| ? \|\| ' days') |
| src/api/routes/ai-insights.routes.js | 373 | activities | SELECT COUNT(*) as count FROM activities WHERE status IN ('pending', 'in_progress') AND due_date < date('now') |
| src/api/routes/ai-insights.routes.js | 391 | leads, lead_scores | SELECT COUNT(*) as count FROM leads l LEFT JOIN lead_scores ls ON l.id = ls.lead_id WHERE (ls.total_score >= 70 OR l.bant_score >= 70) AND l.status NOT IN ('convertido', 'desqualificado') AND l.ultimo |
| src/api/routes/ai-insights.routes.js | 412 | opportunities | SELECT COUNT(*) as count FROM opportunities WHERE status = 'aberta' AND updated_at < datetime('now', '-7 days') |
| src/api/routes/ai-insights.routes.js | 431 | meetings | SELECT COUNT(*) as count FROM meetings WHERE date(data_inicio) = date('now') |
| src/api/routes/auth.routes.js | 511 | sessions | Delete sessions error: |
| src/api/routes/automation.routes.js | 24 | automations, automation_executions | SELECT a.*, (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id) as total_executions, (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id AND status = 'success')  |
| src/api/routes/automation.routes.js | 59 | automations | SELECT * FROM automations WHERE id = ? |
| src/api/routes/automation.routes.js | 218 | automation_executions | SELECT * FROM automation_executions WHERE automation_id = ? ORDER BY executed_at DESC LIMIT ? |
| src/api/routes/cadence.routes.js | 32 | cadences, cadence_enrollments | SELECT c.*, (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status = 'active') as active_enrollments, (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status |
| src/api/routes/cadence.routes.js | 58 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'active' |
| src/api/routes/cadence.routes.js | 59 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'responded' |
| src/api/routes/cadence.routes.js | 60 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'completed' |
| src/api/routes/cadence.routes.js | 61 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'converted' |
| src/api/routes/cadence.routes.js | 67 | cadence_enrollments | SELECT AVG(first_response_day) as avg_day FROM cadence_enrollments WHERE first_response_day IS NOT NULL |
| src/api/routes/cadence.routes.js | 73 | cadence_enrollments | SELECT first_response_channel as channel, COUNT(*) as count FROM cadence_enrollments WHERE first_response_channel IS NOT NULL GROUP BY first_response_channel |
| src/api/routes/cadence.routes.js | 80 | cadence_enrollments | SELECT response_type, COUNT(*) as count FROM cadence_enrollments WHERE response_type IS NOT NULL GROUP BY response_type |
| src/api/routes/cadence.routes.js | 87 | cadence_enrollments | SELECT first_response_day as day, COUNT(*) as count FROM cadence_enrollments WHERE first_response_day IS NOT NULL GROUP BY first_response_day ORDER BY first_response_day |
| src/api/routes/cadence.routes.js | 95 | leads, pipeline_stages | SELECT ps.name as stage, ps.color, COUNT(l.id) as count FROM pipeline_stages ps LEFT JOIN leads l ON l.stage_id = ps.id WHERE ps.pipeline_id = 'pipeline_outbound_solar' GROUP BY ps.id ORDER BY ps.posi |
| src/api/routes/cadence.routes.js | 135 | pipeline_stages | SELECT * FROM pipeline_stages WHERE pipeline_id = 'pipeline_outbound_solar' ORDER BY position |
| src/api/routes/cadence.routes.js | 186 | cadences | SELECT * FROM cadences WHERE id = ? |
| src/api/routes/cadence.routes.js | 191 | cadence_steps | SELECT * FROM cadence_steps WHERE cadence_id = ? ORDER BY day, step_order |
| src/api/routes/cadence.routes.js | 215 | cadence_steps | SELECT * FROM cadence_steps WHERE cadence_id = ? ORDER BY day, step_order |
| src/api/routes/cadence.routes.js | 256 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused') |
| src/api/routes/cadence.routes.js | 272 | cadence_enrollments | INSERT INTO cadence_enrollments (id, cadence_id, lead_id, status, current_day, enrolled_by, started_at) VALUES (?, ?, ?, 'active', 1, ?, datetime('now')) |
| src/api/routes/cadence.routes.js | 278 | leads | UPDATE leads SET cadence_id = ?, cadence_status = 'active', cadence_started_at = datetime('now'), cadence_day = 1, stage_id = 'stage_em_cadencia', stage_entered_at = datetime('now'), updated_at = date |
| src/api/routes/cadence.routes.js | 291 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_lead_novo', 'stage_em_cadencia', ?, 'Enrolled in cadence') |
| src/api/routes/cadence.routes.js | 367 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'paused', paused_at = datetime('now'), pause_reason = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 374 | cadence_enrollments | SELECT lead_id FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 376 | leads | UPDATE leads SET cadence_status = 'paused', updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 400 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'active', paused_at = NULL, pause_reason = NULL WHERE id = ? |
| src/api/routes/cadence.routes.js | 406 | cadence_enrollments | SELECT lead_id FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 408 | leads | UPDATE leads SET cadence_status = 'active', updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 433 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 439 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'responded', responded_at = datetime('now'), first_response_channel = ?, first_response_day = current_day, response_type = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 450 | leads | UPDATE leads SET cadence_status = 'responded', first_response_at = datetime('now'), first_response_channel = ?, response_type = ?, stage_id = 'stage_respondeu', stage_entered_at = datetime('now'), upd |
| src/api/routes/cadence.routes.js | 463 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_em_cadencia', 'stage_respondeu', 'system', 'Lead responded to cadence') |
| src/api/routes/cadence.routes.js | 511 | cadence_steps | SELECT * FROM cadence_steps WHERE cadence_id = ? AND day = ? AND is_active = 1 ORDER BY step_order |
| src/api/routes/cadence.routes.js | 519 | cadence_actions_log | SELECT id FROM cadence_actions_log WHERE enrollment_id = ? AND step_id = ? AND day = ? AND status IN ('sent', 'delivered') |
| src/api/routes/cadence.routes.js | 574 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 575 | cadence_steps | SELECT * FROM cadence_steps WHERE id = ? |
| src/api/routes/cadence.routes.js | 584 | cadence_actions_log | INSERT INTO cadence_actions_log (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, datetime('now')) |
| src/api/routes/cadence.routes.js | 592 | cadence_enrollments | UPDATE cadence_enrollments SET messages_sent = messages_sent + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 594 | cadence_enrollments | UPDATE cadence_enrollments SET emails_sent = emails_sent + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 596 | cadence_enrollments | UPDATE cadence_enrollments SET calls_made = calls_made + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 600 | leads | UPDATE leads SET cadence_last_action_at = datetime('now'), cadence_attempt_count = cadence_attempt_count + 1, updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 631 | cadences, cadence_enrollments | SELECT e.*, c.duration_days FROM cadence_enrollments e JOIN cadences c ON e.cadence_id = c.id WHERE e.status = 'active' |
| src/api/routes/cadence.routes.js | 646 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'completed', completed_at = datetime('now'), completion_reason = 'No response after full cadence' WHERE id = ? |
| src/api/routes/cadence.routes.js | 652 | leads | UPDATE leads SET cadence_status = 'completed', stage_id = 'stage_nutricao', stage_entered_at = datetime('now'), in_nurture_flow = 1, nurture_started_at = datetime('now'), updated_at = datetime('now')  |
| src/api/routes/cadence.routes.js | 663 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_em_cadencia', 'stage_nutricao', 'system', 'Cadence completed without response') |
| src/api/routes/cadence.routes.js | 671 | cadence_enrollments | UPDATE cadence_enrollments SET current_day = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 675 | leads | UPDATE leads SET cadence_day = ?, updated_at = datetime('now') WHERE id = ? |
| src/api/routes/command-center.routes.js | 70 | activities, meetings | ) THEN 1 ELSE 0 END) as overdue FROM activities `); const activities = activitiesStmt.get(); // Meetings today const meetingsStmt = db.prepare(` SELECT COUNT(*) as count FROM meetings WHERE date(data_ |
| src/api/routes/command-center.routes.js | 191 | leads, lead_scores | , optionalAuth, (req, res) => { const db = getDb(); try { const { limit = 10, minScore = 60 } = req.query; const stmt = db.prepare(` SELECT l.*, ls.total_score, ls.classification as grade, ls.firmogra |
| src/api/routes/email-optin.routes.js | 283 | leads | SELECT l.*, e.sent_at as email_sent_at, e.message_id as email_message_id FROM leads l LEFT JOIN email_optins e ON e.email = l.email WHERE l.whatsapp_eligible = 1 AND l.cadence_status = 'not_started' O |
| src/api/routes/email-optin.routes.js | 336 | leads | UPDATE leads SET whatsapp_eligible = 1, stage_id = 'stage_lead_novo', updated_at = datetime('now') WHERE email_optin_status = 'sent' AND whatsapp_eligible = 0 |
| src/api/routes/email-optin.routes.js | 348 | leads | UPDATE leads SET whatsapp_eligible = 1, stage_id = 'stage_lead_novo', updated_at = datetime('now') WHERE email = ? AND whatsapp_eligible = 0 |
| src/api/routes/forecasting.routes.js | 183 | opportunities | SELECT AVG(valor) as avg_deal FROM opportunities WHERE status = 'ganha' AND data_fechamento > datetime('now', '-90 days') |
| src/api/routes/forecasting.routes.js | 192 | opportunities | SELECT AVG(ciclo_venda_dias) as avg_cycle FROM opportunities WHERE status = 'ganha' AND data_fechamento > datetime('now', '-90 days') AND ciclo_venda_dias IS NOT NULL |
| src/api/routes/forecasting.routes.js | 202 | opportunities | SELECT COUNT(*) as count FROM opportunities WHERE status = 'aberta' |
| src/api/routes/funil.routes.js | 321 | leads | SELECT DISTINCT l.whatsapp FROM leads l WHERE EXISTS ( SELECT 1 FROM whatsapp_messages wm WHERE wm.phone_number = l.whatsapp ) |
| src/api/routes/funil.routes.js | 436 | leads, pipeline_stages | SELECT l.*, ps.name as stage_name, ps.color as stage_color, (SELECT COUNT(*) FROM whatsapp_messages WHERE phone_number = l.whatsapp) as total_messages, (SELECT MAX(created_at) FROM whatsapp_messages W |
| src/api/routes/funil.routes.js | 540 | leads, pipeline_stages, cadence_enrollments | SELECT l.*, ps.name as stage_name, ps.color as stage_color, ps.position as stage_position, ce.current_day as enrollment_day, ce.status as enrollment_status, (SELECT COUNT(*) FROM whatsapp_messages WHE |
| src/api/routes/funil.routes.js | 559 | pipeline_stages | SELECT * FROM pipeline_stages ORDER BY position |
| src/api/routes/funil.routes.js | 718 | leads | SELECT id, stage_id FROM leads WHERE telefone = ? |
| src/api/routes/funil.routes.js | 848 | leads | SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector' |
| src/api/routes/funil.routes.js | 849 | leads | SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector' AND DATE(created_at) = DATE('now') |
| src/api/routes/funil.routes.js | 850 | leads | SELECT COUNT(*) as count FROM leads WHERE origem = 'instagram_prospector' AND created_at >= datetime('now', '-7 days') |
| src/api/routes/notifications.routes.js | 258 | notifications | Delete old notifications error: |
| src/api/routes/pipeline.routes.js | 40 | leads, meetings | SELECT DISTINCT l.id FROM leads l INNER JOIN meetings m ON m.lead_id = l.id WHERE m.status NOT IN ('cancelada', 'cancelled') |
| src/api/routes/reports.routes.js | 29 | leads | SELECT COUNT(*) as total, SUM(CASE WHEN status = 'convertido' THEN 1 ELSE 0 END) as converted FROM leads |
| src/api/routes/reports.routes.js | 44 | opportunities | SELECT COUNT(*) as total, SUM(valor) as total_value, SUM(CASE WHEN status = 'ganha' THEN 1 ELSE 0 END) as won FROM opportunities |
| src/api/routes/reports.routes.js | 60 | activities | SELECT COUNT(*) as total, SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed FROM activities |
| src/automation/CadenceEngine.js | 166 | leads | SELECT telefone FROM leads WHERE id = ? |
| src/automation/CadenceEngine.js | 173 | cadences | SELECT id FROM cadences WHERE is_default = 1 AND is_active = 1 LIMIT 1 |
| src/automation/CadenceEngine.js | 182 | cadence_enrollments | SELECT id FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused') |
| src/automation/CadenceEngine.js | 193 | cadence_enrollments | INSERT INTO cadence_enrollments (cadence_id, lead_id, status, current_day, enrolled_by, started_at) VALUES (?, ?, 'active', 1, ?, datetime('now')) |
| src/automation/CadenceEngine.js | 201 | leads | UPDATE leads SET cadence_id = ?, cadence_status = 'active', cadence_started_at = datetime('now'), cadence_day = 1, pipeline_id = 'pipeline_outbound_solar', stage_id = 'stage_em_cadencia', stage_entere |
| src/automation/CadenceEngine.js | 215 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_lead_novo', 'stage_em_cadencia', ?, 'Auto-enrolled in cadence D1') |
| src/automation/CadenceEngine.js | 232 | cadence_steps | SELECT id FROM cadence_steps WHERE cadence_id = ? AND day = 1 AND channel = 'whatsapp' LIMIT 1 |
| src/automation/CadenceEngine.js | 240 | cadence_actions_log | INSERT INTO cadence_actions_log (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at) VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'Sent by  |
| src/automation/CadenceEngine.js | 262 | leads, cadence_enrollments | SELECT e.*, l.nome, l.empresa, l.telefone, l.email, l.cidade FROM cadence_enrollments e JOIN leads l ON e.lead_id = l.id WHERE e.id = ? |
| src/automation/CadenceEngine.js | 274 | cadence_steps | SELECT * FROM cadence_steps WHERE cadence_id = ? AND day = ? AND is_active = 1 ORDER BY step_order |
| src/automation/CadenceEngine.js | 284 | cadence_actions_log | SELECT id FROM cadence_actions_log WHERE enrollment_id = ? AND step_id = ? AND day = ? AND status IN ('sent', 'delivered') |
| src/automation/CadenceEngine.js | 296 | cadence_enrollments | SELECT 1 FROM cadence_enrollments WHERE id = ? AND last_response_at IS NOT NULL |
| src/automation/CadenceEngine.js | 308 | cadence_actions_log | ) { // Log task as pending for human action const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; db.prepare(` INSERT INTO cadence_actions_log (id, enrollment_id, step_id, l |
| src/automation/CadenceEngine.js | 330 | cadence_enrollments | , { error: error.message, enrollmentId }); return { success: false, error: error.message }; } // FIX: Removed db.close() - using singleton connection } /** * Execute a single cadence action (send What |
| src/automation/CadenceEngine.js | 355 | leads | ) WHERE id = ? `).run(enrollment.id); // 2. FIX: Update leads table cadence_status (was missing!) db.prepare(` UPDATE leads SET cadence_status = |
| src/automation/CadenceEngine.js | 365 | pipeline_history | ) WHERE id = ? `).run(enrollment.lead_id); // 3. Log pipeline movement db.prepare(` INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, |
| src/automation/CadenceEngine.js | 409 | cadence_actions_log | , contextError.message); // Continue with default template } } // Personalize message content (only if not using intelligent follow-up) const personalizedContent = usedIntelligentFollowUp ? finalConte |
| src/automation/CadenceEngine.js | 438 | cadence_actions_log | ; db.prepare(` UPDATE cadence_actions_log SET status = ?, executed_at = datetime( |
| src/automation/CadenceEngine.js | 460 | leads | ).run(enrollment.id); } // Update lead db.prepare(` UPDATE leads SET cadence_last_action_at = datetime( |
| src/automation/CadenceEngine.js | 582 | cadences, cadence_enrollments | , error); return { success: false, error: error.message }; } } /** * Advance all active enrollments to the next day */ async advanceAllEnrollments() { const db = this.getDb(); try { const enrollments  |
| src/automation/CadenceEngine.js | 597 | cadence_enrollments | `).all(); let advanced = 0; let completed = 0; for (const enrollment of enrollments) { const nextDay = enrollment.current_day + 1; if (nextDay > enrollment.duration_days) { // Cadence completed - move |
| src/automation/CadenceEngine.js | 611 | leads | WHERE id = ? `).run(enrollment.id); // Get lead data for sheets sync const lead = db.prepare(` SELECT nome, empresa, telefone, email FROM leads WHERE id = ? `).get(enrollment.lead_id); db.prepare(` UP |
| src/automation/CadenceEngine.js | 628 | pipeline_history | ) WHERE id = ? `).run(enrollment.lead_id); db.prepare(` INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, |
| src/automation/CadenceEngine.js | 684 | cadence_enrollments | SELECT id FROM cadence_enrollments WHERE status = 'active' |
| src/automation/CadenceEngine.js | 730 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE lead_id = ? AND status = 'active' ORDER BY enrolled_at DESC LIMIT 1 |
| src/automation/CadenceEngine.js | 742 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'responded', responded_at = datetime('now'), last_response_at = datetime('now'), first_response_channel = ?, first_response_day = current_day, response_type = ? |
| src/automation/CadenceEngine.js | 754 | leads | UPDATE leads SET cadence_status = 'responded', first_response_at = datetime('now'), first_response_channel = ?, response_type = ?, stage_id = 'stage_respondeu', stage_entered_at = datetime('now'), upd |
| src/automation/CadenceEngine.js | 767 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_em_cadencia', 'stage_respondeu', 'system', 'Lead responded to cadence') |
| src/automation/CadenceEngine.js | 773 | leads | SELECT nome, empresa, telefone, email FROM leads WHERE id = ? |
| src/automation/CadenceEngine.js | 827 | leads, cadence_enrollments | SELECT ce.id, ce.lead_id FROM cadence_enrollments ce JOIN leads l ON ce.lead_id = l.id WHERE l.telefone LIKE ? AND ce.status = 'active' ORDER BY ce.enrolled_at DESC LIMIT 1 |
| src/automation/CadenceEngine.js | 840 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'stopped', completion_reason = 'bot_detected', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
| src/automation/CadenceEngine.js | 850 | leads | UPDATE leads SET cadence_status = 'stopped', stage_id = 'stage_bot_bloqueado', stage_entered_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
| src/automation/CadenceEngine.js | 860 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_em_cadencia', 'stage_bot_bloqueado', 'bot_detector', 'Bot detected - cadence stopped proac |
| src/automation/CadenceEngine.js | 883 | leads, cadence_enrollments | SELECT ce.id FROM cadence_enrollments ce JOIN leads l ON ce.lead_id = l.id WHERE l.telefone LIKE ? AND ce.status = 'active' ORDER BY ce.enrolled_at DESC LIMIT 1 |
| src/automation/CadenceEngine.js | 891 | cadence_enrollments | UPDATE cadence_enrollments SET last_response_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
| src/automation/EmailOptInEngine.js | 570 | leads | SELECT id FROM leads WHERE telefone = ? |
| src/automation/EmailOptInEngine.js | 574 | leads | UPDATE leads SET email = ?, email_optin_status = 'sent', email_optin_sent_at = datetime('now'), whatsapp_eligible = 0, updated_at = datetime('now') WHERE telefone = ? |
| src/automation/EmailOptInEngine.js | 587 | leads | INSERT INTO leads (telefone, email, nome, empresa, fonte, stage_id, cadence_status, email_optin_status, email_optin_sent_at, whatsapp_eligible) VALUES (?, ?, ?, ?, 'instagram', 'stage_email_optin', 'n |
| src/automation/EmailOptInEngine.js | 613 | leads | UPDATE leads SET whatsapp_eligible = 1, stage_id = 'stage_lead_novo', updated_at = datetime('now') WHERE email_optin_status = 'sent' AND email_optin_sent_at IS NOT NULL AND whatsapp_eligible = 0 AND d |
| src/automation/EmailOptInEngine.js | 722 | leads | SELECT COUNT(*) as c FROM leads WHERE whatsapp_eligible = 1 |
| src/automation/EmailOptInEngine.js | 723 | leads | SELECT COUNT(*) as c FROM leads WHERE email_optin_status = 'sent' |
| src/automation/ProspectingEngine.js | 466 | leads | SELECT l.*, l.telefone as telefone_normalizado, l.nome as _nome, l.empresa as _empresa, l.cidade as _cidade, l.email as _email FROM leads l WHERE l.whatsapp_eligible = 1 AND l.cadence_status = 'not_st |
| src/automation/ProspectingEngine.js | 561 | leads | SELECT p.* FROM prospect_leads p WHERE p.status = 'pendente' AND p.telefone_normalizado IS NOT NULL AND p.telefone_normalizado != '' AND NOT EXISTS ( SELECT 1 FROM leads l WHERE l.telefone = p.telefon |
| src/automation/ProspectingEngine.js | 807 | leads | SELECT id, stage_id FROM leads WHERE telefone = ? LIMIT 1 |
| src/automation/ProspectingEngine.js | 824 | leads, cadence_enrollments, cadence_actions_log | SELECT 1 FROM cadence_actions_log cal JOIN cadence_enrollments ce ON cal.enrollment_id = ce.id JOIN leads l ON ce.lead_id = l.id WHERE l.telefone = ? AND cal.action_type = 'send_message' AND cal.statu |
| src/automation/ProspectingEngine.js | 844 | leads, cadence_enrollments | SELECT 1 FROM cadence_enrollments e JOIN leads l ON e.lead_id = l.id WHERE l.telefone = ? LIMIT 1 |
| src/automation/engine.js | 88 | automations | SELECT * FROM automations WHERE enabled = 1 |
| src/automation/engine.js | 277 | leads | SELECT * FROM leads WHERE status NOT IN ('convertido', 'desqualificado') |
| src/automation/engine.js | 283 | meetings | SELECT * FROM meetings WHERE status = 'agendada' |
| src/automation/engine.js | 289 | opportunities | SELECT * FROM opportunities WHERE status = 'aberta' |
| src/automation/engine.js | 295 | leads | SELECT * FROM leads WHERE status = "novo" |
| src/automation/engine.js | 567 | leads | UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ? |
| src/automation/engine.js | 584 | leads | UPDATE leads SET custom_fields = json_set(COALESCE(custom_fields, '{}'), '$.next_followup', ?) WHERE id = ? |
| src/automation/engine.js | 614 | automation_executions | INSERT INTO automation_executions (id, automation_id, status, matched_count, results, duration_ms, error, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now')) |
| src/automation/engine.js | 641 | automations | INSERT INTO automations (id, name, description, trigger_config, conditions, actions, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now')) |
| src/automation/engine.js | 680 | automations | DELETE FROM automations WHERE id = ? |
| src/automation/engine.js | 694 | automations | UPDATE automations SET name = ?, description = ?, trigger_config = ?, conditions = ?, actions = ?, enabled = ?, updated_at = datetime('now') WHERE id = ? |
| src/automation/engine.js | 731 | automations | UPDATE automations SET enabled = ? WHERE id = ? |
| src/automation/followup/installer.js | 30 | automations | SELECT COUNT(*) as count FROM automations WHERE name = ? |
| src/automation/followup/installer.js | 58 | automations | DELETE FROM automations WHERE name = ? |
| src/automation/followup/installer.js | 64 | automations | INSERT INTO automations ( id, name, description, trigger_config, conditions, actions, enabled, category, created_at ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now')) |
| src/automation/followup/installer.js | 154 | automations | DELETE FROM automations WHERE category = 'follow_up' |
| src/automation/followup/installer.js | 181 | automations, automation_executions | SELECT id, name, enabled, created_at, (SELECT COUNT(*) FROM automation_executions WHERE automation_id = automations.id) as executions FROM automations WHERE category = 'follow_up' ORDER BY created_at  |
| src/db/migrations/003_prospect_leads.js | 22 | leads | CREATE TABLE IF NOT EXISTS prospect_leads ( id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), -- Dados básicos do lead empresa TEXT NOT NULL, nome TEXT, cnpj TEXT, segmento TEXT, porte TEXT, f |
| src/db/migrations/003_prospect_leads.js | 91 | leads | CREATE TABLE IF NOT EXISTS prospect_history ( id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), prospect_id TEXT NOT NULL, lead_id TEXT, -- ID na tabela leads (após conversão) action TEXT NOT  |
| src/domain/entities/Conversation.js | 297 | messages | }`; } /** * Get message count * @returns {number} Total messages */ getMessageCount() { return this.messages.length; } /** * Get user message count * @returns {number} User messages */ getUserMessageC |
| src/domain/entities/Conversation.js | 425 | messages | }); } this.metadata = { ...this.metadata, ...metadata }; this.touch(); return this; } /** * Touch the entity (update timestamp) */ touch() { this.updatedAt = new Date(); } /** * Get conversation stati |
| src/handlers/WebhookTransactionManager.js | 65 | leads | SELECT id, stage_id, cadence_status, cadence_day, first_response_at FROM leads WHERE telefone = ? OR whatsapp = ? ORDER BY created_at DESC LIMIT 1 |
| src/handlers/WebhookTransactionManager.js | 74 | leads | t exist const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; db.prepare(` INSERT INTO leads ( id, telefone, whatsapp, stage_id, cadence_status, response_type, first_respo |
| src/handlers/WebhookTransactionManager.js | 91 | leads | }; } const leadId = lead.id; const previousStage = lead.stage_id; const wasFirstResponse = !lead.first_response_at; // 2. Update lead stage and status const updateStmt = db.prepare(` UPDATE leads SET  |
| src/handlers/WebhookTransactionManager.js | 117 | pipeline_history | ) { db.prepare(` INSERT INTO pipeline_history ( id, lead_id, from_stage_id, to_stage_id, moved_by, reason, created_at ) VALUES (?, ?, ?, |
| src/handlers/WebhookTransactionManager.js | 121 | cadence_enrollments | )) `).run( `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, leadId, previousStage ); } // 4. Update cadence enrollment if exists const enrollment = db.prepare(` SELECT id, current_day FR |
| src/handlers/WebhookTransactionManager.js | 133 | cadence_enrollments | ORDER BY enrolled_at DESC LIMIT 1 `).get(leadId); if (enrollment) { db.prepare(` UPDATE cadence_enrollments SET status = |
| src/handlers/WebhookTransactionManager.js | 229 | leads | } = meetingData; try { const db = getDatabase(); const result = withTransaction(db, () => { // Find lead const lead = db.prepare(` SELECT id, stage_id FROM leads WHERE telefone = ? OR whatsapp = ? LIM |
| src/handlers/WebhookTransactionManager.js | 247 | leads | ; const previousStage = lead.stage_id; // Update lead db.prepare(` UPDATE leads SET stage_id = ?, cadence_status = |
| src/handlers/WebhookTransactionManager.js | 257 | cadence_enrollments | ) WHERE id = ? `).run(newStage, meetingId, lead.id); // Stop cadence enrollment db.prepare(` UPDATE cadence_enrollments SET status = |
| src/handlers/WebhookTransactionManager.js | 268 | pipeline_history | ) `).run(lead.id); // Log pipeline history db.prepare(` INSERT INTO pipeline_history ( id, lead_id, from_stage_id, to_stage_id, moved_by, reason, created_at ) VALUES (?, ?, ?, ?, |
| src/handlers/WebhookTransactionManager.js | 305 | leads | , { contactId, error: error.message }); return { success: false, error: error.message, rolledBack: true }; } } /** * Process lead qualification (BANT score update) in a transaction * * @param {string} |
| src/handlers/WebhookTransactionManager.js | 351 | leads | : lead.stage_id; // Update lead with BANT data db.prepare(` UPDATE leads SET bant_score = ?, bant_budget = COALESCE(?, bant_budget), bant_authority = COALESCE(?, bant_authority), bant_need = COALESCE( |
| src/handlers/WebhookTransactionManager.js | 376 | pipeline_history | ) { db.prepare(` INSERT INTO pipeline_history ( id, lead_id, from_stage_id, to_stage_id, moved_by, reason, created_at ) VALUES (?, ?, ?, |
| src/handlers/webhook_handler.js | 413 | leads | , error: error.message, stack: error.stack }; } } /** * Verifica se é evento de mensagem * * FIX: Aceitar messages.update quando contém mensagem real do usuário * * Evolution API pode enviar: * - mess |
| src/memory.js | 356 | messages | INSERT INTO whatsapp_messages(phone_number, message_text, from_me, message_type) VALUES(?, ?, ?, ?) |
| src/memory.js | 1181 | agent_metrics | INSERT INTO agent_metrics (agent_name, phone_number, event_type, success, metadata) VALUES (?, ?, ?, ?, ?) |
| src/models/Account.js | 51 | contacts | SELECT * FROM contacts WHERE account_id = ? |
| src/models/Account.js | 52 | opportunities | SELECT * FROM opportunities WHERE account_id = ? |
| src/models/Account.js | 73 | accounts | SELECT tipo, COUNT(*) as count FROM accounts GROUP BY tipo |
| src/models/Account.js | 78 | accounts | SELECT setor, COUNT(*) as count FROM accounts WHERE setor IS NOT NULL GROUP BY setor ORDER BY count DESC LIMIT 10 |
| src/models/Activity.js | 55 | activities | SELECT * FROM activities WHERE assigned_to = ? |
| src/models/Activity.js | 79 | contacts, leads, opportunities, activities | SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name FROM activities a LEFT JOIN leads l ON a.lead_id = l.id LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN opport |
| src/models/Activity.js | 106 | contacts, leads, opportunities, activities | s activities */ findToday(userId = null) { const db = this.getDb(); try { let query = ` SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name FROM activities a LEFT JOIN  |
| src/models/Activity.js | 127 | contacts, leads, opportunities, activities | ; const stmt = db.prepare(query); return stmt.all(...params); } catch (error) { throw error; } } /** * Find upcoming activities */ findUpcoming(userId = null, { days = 7, limit = 50 } = {}) { const db |
| src/models/Activity.js | 218 | activities | ; params.push(limit, offset); const stmt = db.prepare(query); return stmt.all(...params); } catch (error) { throw error; } } /** * Mark activity as completed */ complete(activityId, resultado = null)  |
| src/models/Contact.js | 34 | contacts | SELECT * FROM contacts WHERE email = ? |
| src/models/Contact.js | 47 | contacts | SELECT * FROM contacts WHERE whatsapp = ? |
| src/models/Contact.js | 80 | accounts | SELECT * FROM accounts WHERE id = ? |
| src/models/Contact.js | 84 | activities | SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC LIMIT 10 |
| src/models/Contact.js | 92 | opportunities | SELECT * FROM opportunities WHERE contact_id = ? ORDER BY created_at DESC |
| src/models/Contact.js | 118 | contacts | SELECT COUNT(*) as count FROM contacts WHERE is_decisor = 1 |
| src/models/Contact.js | 119 | contacts | SELECT senioridade, COUNT(*) as count FROM contacts WHERE senioridade IS NOT NULL GROUP BY senioridade |
| src/models/Contact.js | 125 | contacts | SELECT status, COUNT(*) as count FROM contacts GROUP BY status |
| src/models/Contact.js | 143 | contacts | UPDATE contacts SET score = score + ?, updated_at = datetime('now') WHERE id = ? |
| src/models/Lead.js | 73 | activities | SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 10 |
| src/models/Lead.js | 87 | opportunities | SELECT * FROM opportunities WHERE id = ? |
| src/models/Lead.js | 90 | accounts | SELECT * FROM accounts WHERE id = ? |
| src/models/Lead.js | 93 | contacts | SELECT * FROM contacts WHERE id = ? |
| src/models/Lead.js | 177 | leads | SELECT COUNT(*) as count FROM leads WHERE converted = 1 |
| src/models/Lead.js | 178 | leads | SELECT status, COUNT(*) as count FROM leads GROUP BY status |
| src/models/Lead.js | 183 | leads | SELECT origem, COUNT(*) as count FROM leads WHERE origem IS NOT NULL GROUP BY origem |
| src/models/Lead.js | 189 | leads | SELECT AVG(bant_score) as avg_score FROM leads WHERE bant_score > 0 |
| src/models/MeetingAnalysis.js | 55 | meeting_analysis | INSERT INTO meeting_analysis ( transcription_id, meeting_id, sentimento_geral, sentimento_score, confianca_sentimento, talk_ratio_vendedor, talk_ratio_cliente, talk_ratio_ideal, talk_ratio_deviation,  |
| src/models/MeetingAnalysis.js | 109 | meeting_analysis | SELECT * FROM meeting_analysis WHERE id = ? |
| src/models/MeetingAnalysis.js | 118 | meeting_analysis | SELECT * FROM meeting_analysis WHERE transcription_id = ? |
| src/models/MeetingAnalysis.js | 127 | meeting_analysis | SELECT * FROM meeting_analysis WHERE meeting_id = ? |
| src/models/MeetingAnalysis.js | 136 | meeting_analysis | SELECT * FROM meeting_analysis WHERE resultado_previsto = ? ORDER BY created_at DESC |
| src/models/MeetingAnalysis.js | 149 | meeting_analysis | SELECT * FROM meeting_analysis WHERE probabilidade_fechamento >= ? ORDER BY probabilidade_fechamento DESC |
| src/models/MeetingAnalysis.js | 162 | meeting_analysis | SELECT * FROM meeting_analysis WHERE talk_ratio_deviation > ? ORDER BY talk_ratio_deviation DESC |
| src/models/MeetingAnalysis.js | 234 | meeting_analysis | UPDATE meeting_analysis SET ${fields.join(', ')} WHERE id = ? |
| src/models/MeetingAnalysis.js | 248 | meeting_analysis | DELETE FROM meeting_analysis WHERE id = ? |
| src/models/MeetingInsight.js | 46 | meeting_insights | INSERT INTO meeting_insights ( analysis_id, meeting_id, tipo, categoria, prioridade, titulo, descricao, exemplo_transcricao, acao_recomendada, impacto_esperado, origem, status, metadata ) VALUES (?, ? |
| src/models/MeetingInsight.js | 77 | meeting_insights | SELECT * FROM meeting_insights WHERE id = ? |
| src/models/MeetingInsight.js | 86 | meeting_insights | SELECT * FROM meeting_insights WHERE analysis_id = ? ORDER BY prioridade DESC, created_at DESC |
| src/models/MeetingInsight.js | 99 | meeting_insights | SELECT * FROM meeting_insights WHERE meeting_id = ? ORDER BY prioridade DESC, created_at DESC |
| src/models/MeetingInsight.js | 112 | meeting_insights | SELECT * FROM meeting_insights WHERE tipo = ? ORDER BY created_at DESC |
| src/models/MeetingInsight.js | 125 | meeting_insights | SELECT * FROM meeting_insights WHERE prioridade = 'alta' AND status = 'nova' ORDER BY created_at DESC |
| src/models/MeetingInsight.js | 138 | meeting_insights | SELECT * FROM meeting_insights WHERE status = 'nova' ORDER BY prioridade DESC, created_at DESC |
| src/models/MeetingInsight.js | 151 | meeting_insights | SELECT * FROM meeting_insights WHERE categoria = ? ORDER BY prioridade DESC, created_at DESC |
| src/models/MeetingInsight.js | 180 | meeting_insights | UPDATE meeting_insights SET ${fields.join(', ')} WHERE id = ? |
| src/models/MeetingInsight.js | 237 | meeting_insights | UPDATE meeting_insights SET ${fields.join(', ')} WHERE id = ? |
| src/models/MeetingInsight.js | 251 | meeting_insights | DELETE FROM meeting_insights WHERE id = ? |
| src/models/MeetingScore.js | 84 | meeting_scores | INSERT INTO meeting_scores ( analysis_id, meeting_id, score_total, nota_geral, spin_situation_score, spin_problem_score, spin_implication_score, spin_needpayoff_score, spin_total_score, spin_seguiu_me |
| src/models/MeetingScore.js | 157 | meeting_scores | SELECT * FROM meeting_scores WHERE id = ? |
| src/models/MeetingScore.js | 166 | meeting_scores | SELECT * FROM meeting_scores WHERE analysis_id = ? |
| src/models/MeetingScore.js | 175 | meeting_scores | SELECT * FROM meeting_scores WHERE meeting_id = ? |
| src/models/MeetingScore.js | 184 | meeting_scores | SELECT * FROM meeting_scores WHERE nota_geral = ? ORDER BY score_total DESC |
| src/models/MeetingScore.js | 211 | meeting_scores | SELECT * FROM meeting_scores WHERE spin_seguiu_metodologia = 1 ORDER BY spin_total_score DESC |
| src/models/MeetingScore.js | 224 | meeting_scores | SELECT * FROM meeting_scores WHERE bant_qualificado = 1 ORDER BY bant_total_score DESC |
| src/models/MeetingScore.js | 237 | meeting_scores | SELECT * FROM meeting_scores WHERE metodologia_primaria = ? ORDER BY score_total DESC |
| src/models/MeetingScore.js | 297 | meeting_scores | UPDATE meeting_scores SET ${fields.join(', ')} WHERE id = ? |
| src/models/MeetingScore.js | 311 | meeting_scores | DELETE FROM meeting_scores WHERE id = ? |
| src/models/MeetingTranscription.js | 51 | meeting_transcriptions | INSERT INTO meeting_transcriptions ( meeting_id, account_id, contact_id, opportunity_id, google_event_id, google_drive_file_id, google_doc_url, texto_completo, idioma, duracao_segundos, participantes, |
| src/models/MeetingTranscription.js | 91 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE id = ? |
| src/models/MeetingTranscription.js | 100 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE meeting_id = ? |
| src/models/MeetingTranscription.js | 109 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE google_event_id = ? |
| src/models/MeetingTranscription.js | 118 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE status = 'pending' ORDER BY created_at DESC |
| src/models/MeetingTranscription.js | 135 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE created_at >= ? ORDER BY created_at DESC |
| src/models/MeetingTranscription.js | 148 | meeting_transcriptions | SELECT * FROM meeting_transcriptions WHERE account_id = ? ORDER BY data_reuniao DESC |
| src/models/MeetingTranscription.js | 161 | meeting_transcriptions | UPDATE meeting_transcriptions SET status = ?, error_message = ?, updated_at = datetime('now') WHERE id = ? |
| src/models/MeetingTranscription.js | 205 | meeting_transcriptions | UPDATE meeting_transcriptions SET ${fields.join(', ')} WHERE id = ? |
| src/models/MeetingTranscription.js | 219 | meeting_transcriptions | DELETE FROM meeting_transcriptions WHERE id = ? |
| src/models/Notification.js | 19 | notifications | SELECT * FROM notifications WHERE user_id = ? |
| src/models/Notification.js | 45 | notifications | SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 |
| src/models/Notification.js | 97 | notifications | UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE user_id = ? AND is_read = 0 |
| src/models/Notification.js | 115 | notifications | SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT ? OFFSET ? |
| src/models/Notification.js | 133 | notifications | SELECT * FROM notifications WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC |
| src/models/Notification.js | 150 | notifications | DELETE FROM notifications WHERE created_at < datetime('now', '-' \|\| ? \|\| ' days') AND is_read = 1 |
| src/models/Notification.js | 168 | notifications | INSERT INTO notifications (id, user_id, type, title, message, priority, entity_type, entity_id, action_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) |
| src/models/Notification.js | 202 | notification_preferences | SELECT * FROM notification_preferences WHERE user_id = ? |
| src/models/Notification.js | 207 | notification_preferences | INSERT INTO notification_preferences (id, user_id) VALUES (?, ?) |
| src/models/Notification.js | 233 | notification_preferences | UPDATE notification_preferences SET ${updates}, updated_at = datetime('now') WHERE user_id = ? |
| src/models/Opportunity.js | 73 | accounts | SELECT * FROM accounts WHERE id = ? |
| src/models/Opportunity.js | 78 | contacts | SELECT * FROM contacts WHERE id = ? |
| src/models/Opportunity.js | 82 | activities | SELECT * FROM activities WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT 20 |
| src/models/Opportunity.js | 90 | products, opportunity_products | SELECT op.*, p.nome as product_name, p.descricao as product_desc FROM opportunity_products op LEFT JOIN products p ON op.product_id = p.id WHERE op.opportunity_id = ? |
| src/models/Opportunity.js | 154 | opportunity_products | INSERT INTO opportunity_products (opportunity_id, product_id, quantidade, preco_unitario, desconto) VALUES (?, ?, ?, ?, ?) |
| src/models/Opportunity.js | 176 | opportunity_products | DELETE FROM opportunity_products WHERE opportunity_id = ? AND product_id = ? |
| src/models/Opportunity.js | 198 | opportunity_products | SELECT SUM(preco_final) as total FROM opportunity_products WHERE opportunity_id = ? |
| src/models/Opportunity.js | 272 | opportunities | SELECT AVG(ciclo_venda_dias) as avg_days FROM opportunities WHERE status = 'ganha' AND ciclo_venda_dias IS NOT NULL |
| src/models/ScoringRule.js | 42 | scoring_rules | UPDATE scoring_rules SET is_active = ? WHERE id = ? |
| src/models/ScoringRule.js | 57 | lead_scores | SELECT * FROM lead_scores WHERE lead_id = ? |
| src/models/ScoringRule.js | 112 | lead_scores | INSERT INTO lead_scores (id, lead_id, total_score, grade, profile_score, engagement_score, behavior_score, custom_score, rules_matched, calculated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now' |
| src/models/ScoringRule.js | 141 | score_history | INSERT INTO score_history (id, lead_id, old_score, new_score, old_grade, new_grade, change_reason) VALUES (?, ?, ?, ?, ?, ?, ?) |
| src/models/ScoringRule.js | 237 | score_history | SELECT * FROM score_history WHERE lead_id = ? ORDER BY created_at DESC LIMIT ? |
| src/models/ScoringRule.js | 313 | scoring_rules | SELECT COUNT(*) as total, SUM(is_active) as active FROM scoring_rules |
| src/models/Team.js | 56 | users | SELECT id, name, email, avatar_url FROM users WHERE id = ? |
| src/models/User.js | 19 | users | SELECT * FROM users WHERE email = ? |
| src/models/User.js | 33 | users | SELECT * FROM users WHERE refresh_token = ? |
| src/models/User.js | 98 | users | UPDATE users SET last_login = datetime('now') WHERE id = ? |
| src/models/User.js | 182 | leads | SELECT COUNT(*) as total FROM leads WHERE owner_id = ? ${dateFilter} |
| src/models/User.js | 307 | users | INSERT INTO users (${columns}) VALUES (${placeholders}) |
| src/repositories/agent.repository.js | 40 | agents | , error); return []; } } /** * Find agent by ID */ findById(agentId) { const db = getDatabase(); try { const agent = db.prepare(` SELECT * FROM agents WHERE id = ? `).get(agentId); return agent ? this |
| src/repositories/agent.repository.js | 141 | agents | ); db.prepare(` INSERT INTO agents (${columns}) VALUES (${placeholders}) `).run(...Object.values(agent)); return this._parseAgent(agent); } catch (error) { console.error( |
| src/repositories/agent.repository.js | 205 | agents | ); } db.prepare(` UPDATE agents SET status = |
| src/repositories/agent.repository.js | 249 | agents | , error); throw error; } } /** * Update agent metrics */ updateMetrics(agentId, metricsUpdate) { const db = getDatabase(); try { const agent = this.findById(agentId); if (!agent) return false; const c |
| src/repositories/agent.repository.js | 273 | agents | , error); return false; } } /** * Update last active timestamp */ updateLastActive(agentId) { const db = getDatabase(); try { db.prepare(` UPDATE agents SET last_active_at = ? WHERE id = ? `).run(new  |
| src/repositories/agent.repository.js | 309 | agents | , error); return 0; } } /** * Get all agents (admin only) */ findAll() { const db = getDatabase(); try { const agents = db.prepare(` SELECT * FROM agents WHERE status != |
| src/repositories/lead.repository.js | 184 | leads | ); const values = Object.values(leadData); const stmt = db.prepare(` INSERT INTO leads (${columns.join( |
| src/repositories/lead.repository.js | 206 | leads | ).get(id); } /** * Find lead by phone number */ findByPhone(phone) { const db = this.getDb(); const normalized = normalizePhone(phone); return db.prepare(` SELECT * FROM leads WHERE telefone = ? OR wh |
| src/repositories/lead.repository.js | 252 | leads | ); const values = [...Object.values(cleanData), id]; db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).run(...values); // Queue for Sheets sync this.queueSheetsSync(id, |
| src/repositories/lead.repository.js | 305 | leads | } = options; return db.prepare(` SELECT * FROM leads ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ? `).all(limit, offset); } /** * Get leads by stage (for funil) */ findByStage(stageId, options = {}) { |
| src/repositories/lead.repository.js | 332 | leads | ) { const db = this.getDb(); return db.prepare(` SELECT * FROM leads WHERE pipeline_id = ? ORDER BY stage_entered_at DESC `).all(pipelineId); } /** * Get funil leads grouped by stage (for dashboard) * |
| src/repositories/lead.repository.js | 344 | leads, pipeline_stages | ) { const db = this.getDb(); // Get all stages const stages = db.prepare(` SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY position ASC `).all(pipelineId); // Get leads for each stage con |
| src/repositories/lead.repository.js | 383 | leads | ); // Get total - use pipeline_id only if column exists let total = 0; if (hasPipelineId) { total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ?`).get(pipelineId)?.count \|\| 0; |
| src/repositories/lead.repository.js | 437 | leads | `).get()?.count \|\| 0; const lost = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = |
| src/repositories/lead.repository.js | 438 | leads, pipeline_history | `).get()?.count \|\| 0; const conversionRate = total > 0 ? ((won / total) * 100).toFixed(2) : 0; const responseRate = total > 0 ? ((responded / total) * 100).toFixed(2) : 0; return { total, byStage, byC |
| src/repositories/lead.repository.js | 509 | leads, opportunities | ) { return this.getFunnelLeads(pipelineId); } /** * Add pipeline opportunity (for pipeline.routes.js compatibility) */ addPipelineOpportunity(data) { return this.create(data); } /** * Update pipeline  |
| src/scalable/admin/AdminApiRoutes.js | 55 | tenants | SELECT t.name, t.slug, t.status, t.plan, json_extract(t.usage, '$.messagesToday') as messagesToday, json_extract(t.usage, '$.leadsCount') as leadsCount, json_extract(t.metadata, '$.lastActivityAt') as |
| src/scalable/admin/AdminApiRoutes.js | 67 | tenants | SELECT id, name, slug, status, plan, json_extract(usage, '$.messagesToday') as messagesToday FROM tenants WHERE status = 'suspended' OR (status = 'trial' AND trial_ends_at < datetime('now')) OR json_e |
| src/scalable/admin/AdminApiRoutes.js | 438 | meetings | SELECT (SELECT COUNT(*) FROM tenants) as totalTenants, (SELECT COUNT(*) FROM leads) as totalLeads, (SELECT COUNT(*) FROM whatsapp_messages WHERE created_at >= datetime('now', '-${days} days')) as mess |
| src/scalable/admin/AdminApiRoutes.js | 519 | tenants | SELECT id, email, name FROM tenants WHERE 1=1 |
| src/scalable/agents/AgentService.js | 102 | agents | SELECT * FROM agents WHERE id = ? |
| src/scalable/agents/AgentService.js | 165 | agents | SELECT * FROM agents WHERE 1=1 |
| src/scalable/agents/AgentService.js | 225 | agents, integrations | UPDATE agents SET name = ?, slug = ?, type = ?, status = ?, persona = ?, system_prompt = ?, prompts = ?, message_templates = ?, behavior = ?, ai_config = ?, integrations = ?, knowledge_base = ?, metri |
| src/scalable/agents/AgentService.js | 280 | agents | DELETE FROM agents WHERE id = ? |
| src/scalable/tenant/TenantService.js | 45 | tenants | INSERT INTO tenants ( id, name, slug, email, phone, plan, status, trial_ends_at, config, agent_config, usage, metadata, created_at, updated_at ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) |
| src/scalable/tenant/TenantService.js | 86 | tenants | SELECT * FROM tenants WHERE id = ? |
| src/scalable/tenant/TenantService.js | 117 | tenants | SELECT * FROM tenants WHERE slug = ? |
| src/scalable/tenant/TenantService.js | 170 | tenants | SELECT COUNT(*) as total FROM tenants WHERE ${whereClause} |
| src/scalable/tenant/TenantService.js | 176 | tenants | SELECT * FROM tenants WHERE ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ? |
| src/scalable/tenant/TenantService.js | 229 | tenants | UPDATE tenants SET name = ?, email = ?, phone = ?, plan = ?, status = ?, config = ?, agent_config = ?, updated_at = ? WHERE id = ? |
| src/scalable/tenant/TenantService.js | 263 | tenants | UPDATE tenants SET usage = json_set( usage, '$.messagesToday', COALESCE(json_extract(usage, '$.messagesToday'), 0) + 1, '$.messagesThisMonth', COALESCE(json_extract(usage, '$.messagesThisMonth'), 0) + |
| src/scalable/tenant/TenantService.js | 282 | tenants | UPDATE tenants SET usage = json_set( usage, '$.leadsCount', COALESCE(json_extract(usage, '$.leadsCount'), 0) + 1 ) WHERE id = ? |
| src/scalable/tenant/TenantService.js | 310 | tenants | SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan |
| src/scalable/tenant/TenantService.js | 329 | tenants | UPDATE tenants SET usage = json_set(usage, '$.messagesToday', 0, '$.lastUsageReset', ?) |
| src/security/OptOutInterceptor.js | 76 | leads | UPDATE leads SET cadence_status = 'opt_out', stage_id = 'stage_perdeu', updated_at = datetime('now'), notes = COALESCE(notes, '') \|\| ' \| OPT-OUT: ' \|\| datetime('now') WHERE telefone LIKE ? OR whatsapp |
| src/security/OptOutInterceptor.js | 172 | leads | SELECT 1 FROM leads WHERE (telefone LIKE ? OR whatsapp LIKE ?) AND cadence_status = 'opt_out' LIMIT 1 |
| src/services/AsyncJobsService.js | 138 | async_jobs | UPDATE async_jobs SET status = 'processing', locked_by = ?, locked_at = datetime('now'), started_at = datetime('now') WHERE id = ( SELECT id FROM async_jobs WHERE status = 'pending' AND datetime(sched |
| src/services/AsyncJobsService.js | 186 | async_jobs | UPDATE async_jobs SET status = 'completed', result_json = ?, completed_at = datetime('now'), locked_by = NULL, locked_at = NULL WHERE id = ? |
| src/services/AsyncJobsService.js | 211 | async_jobs | SELECT retry_count FROM async_jobs WHERE id = ? |
| src/services/AsyncJobsService.js | 217 | async_jobs | UPDATE async_jobs SET status = 'failed', error_message = ?, error_stack = ?, retry_count = ?, next_retry_at = datetime('now', '+' \|\| ? \|\| ' seconds'), locked_by = NULL, locked_at = NULL WHERE id = ? |
| src/services/AsyncJobsService.js | 245 | async_jobs | UPDATE async_jobs SET status = 'cancelled' WHERE id = ? AND status = 'pending' |
| src/services/AsyncJobsService.js | 266 | async_jobs | SELECT * FROM async_jobs WHERE status = 'failed' AND retry_count < max_retries AND datetime(next_retry_at) <= datetime('now') ORDER BY priority DESC, next_retry_at ASC LIMIT ? |
| src/services/AsyncJobsService.js | 288 | async_jobs | UPDATE async_jobs SET status = 'pending', next_retry_at = NULL WHERE id = ? AND status = 'failed' AND retry_count < max_retries |
| src/services/AsyncJobsService.js | 307 | async_jobs | UPDATE async_jobs SET status = 'pending', locked_by = NULL, locked_at = NULL, started_at = NULL, retry_count = retry_count + 1, error_message = 'Recovered from timeout' WHERE status = 'processing' AND |
| src/services/AsyncJobsService.js | 333 | async_jobs | SELECT * FROM async_jobs WHERE id = ? |
| src/services/AsyncJobsService.js | 355 | async_jobs | SELECT id, job_type, status, priority, created_at, completed_at, error_message FROM async_jobs WHERE contact_id = ? |
| src/services/AsyncJobsService.js | 381 | async_jobs | SELECT COUNT(*) as count FROM async_jobs WHERE contact_id = ? AND status = 'processing' |
| src/services/AsyncJobsService.js | 420 | async_jobs | SELECT COUNT(*) as count FROM async_jobs WHERE status = 'pending' |
| src/services/AsyncJobsService.js | 426 | async_jobs | SELECT COUNT(*) as count FROM async_jobs WHERE status = 'processing' |
| src/services/AsyncJobsService.js | 447 | async_jobs | DELETE FROM async_jobs WHERE status IN ('completed', 'cancelled') AND datetime(created_at) < datetime('now', '-' \|\| ? \|\| ' days') |
| src/services/AsyncJobsService.js | 540 | async_jobs | UPDATE async_jobs SET status = 'pending', locked_by = NULL, locked_at = NULL, started_at = NULL WHERE locked_by = ? AND status = 'processing' |
| src/services/AuthService.js | 141 | teams | INSERT INTO teams (id, name, description, billing_status, trial_started_at, trial_ends_at, max_agents, max_messages_per_month) VALUES (?, ?, ?, 'trial_expired', datetime('now'), datetime('now'), 1, 0) |
| src/services/AuthService.js | 149 | teams | INSERT INTO teams (id, name, description, billing_status, trial_started_at, trial_ends_at, max_agents, max_messages_per_month) VALUES (?, ?, ?, 'trial', datetime('now'), datetime('now', '+7 days'), 1, |
| src/services/AuthService.js | 316 | sessions | SELECT id, refresh_token FROM sessions WHERE user_id = ? AND refresh_token = ? AND is_valid = 1 AND datetime(refresh_expires_at) > datetime('now') |
| src/services/AuthService.js | 336 | sessions | UPDATE sessions SET token = ?, refresh_token = ?, refresh_expires_at = ?, last_used_at = datetime('now') WHERE id = ? |
| src/services/AuthService.js | 407 | sessions | INSERT INTO sessions (id, user_id, token, refresh_token, device_info, ip_address, user_agent, expires_at, refresh_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) |
| src/services/AuthService.js | 430 | sessions | UPDATE sessions SET is_valid = 0 WHERE token = ? |
| src/services/AuthService.js | 439 | sessions | UPDATE sessions SET is_valid = 0 WHERE user_id = ? |
| src/services/AuthService.js | 448 | sessions | SELECT * FROM sessions WHERE token = ? AND is_valid = 1 AND datetime(expires_at) > datetime('now') |
| src/services/AuthService.js | 462 | auth_audit_log | INSERT INTO auth_audit_log (id, user_id, event_type, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?) |
| src/services/AuthService.js | 478 | sessions | s active sessions */ getUserSessions(userId) { const db = this.getDb(); const stmt = db.prepare(` SELECT id, device_info, ip_address, user_agent, created_at, last_used_at, expires_at FROM sessions WHE |
| src/services/AuthService.js | 487 | sessions | ) ORDER BY last_used_at DESC `); return stmt.all(userId); } /** * Remove sensitive data from user object */ sanitizeUser(user) { const { password_hash, refresh_token, ...sanitized } = user; return san |
| src/services/CadenceIntegrationService.js | 329 | leads | SELECT id FROM leads WHERE telefone = ? LIMIT 1 |
| src/services/CadenceIntegrationService.js | 338 | leads | SELECT id FROM leads WHERE telefone LIKE ? LIMIT 1 |
| src/services/CadenceIntegrationService.js | 383 | leads, cadence_enrollments | SELECT ce.id, ce.lead_id, ce.current_day FROM cadence_enrollments ce JOIN leads l ON ce.lead_id = l.id WHERE (l.telefone = ? OR l.telefone LIKE ?) AND ce.status = 'active' ORDER BY ce.enrolled_at DESC |
| src/services/CadenceIntegrationService.js | 408 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'completed', completion_reason = ?, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
| src/services/CadenceIntegrationService.js | 438 | leads | UPDATE leads SET ${setClause}, updated_at = datetime('now') WHERE id = ? |
| src/services/CadenceIntegrationService.js | 446 | pipeline_history | INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason) VALUES (?, ?, 'stage_em_cadencia', ?, 'system', ?) |
| src/services/DataSyncService.js | 111 | leads, cadence_enrollments | SELECT l.id, l.telefone, l.empresa FROM leads l WHERE l.stage_id = 'stage_em_cadencia' AND l.cadence_status = 'active' AND NOT EXISTS ( SELECT 1 FROM cadence_enrollments ce WHERE ce.lead_id = l.id AND |
| src/services/DataSyncService.js | 125 | cadence_enrollments | INSERT INTO cadence_enrollments ( id, cadence_id, lead_id, status, current_day, enrolled_by, started_at, created_at ) VALUES (?, 'cadence_outbound_solar_15d', ?, 'active', 1, 'data_sync', datetime('no |
| src/services/DataSyncService.js | 134 | cadence_steps | SELECT id FROM cadence_steps WHERE cadence_id = 'cadence_outbound_solar_15d' AND day = 1 AND channel = 'whatsapp' LIMIT 1 |
| src/services/DataSyncService.js | 142 | cadence_actions_log | INSERT INTO cadence_actions_log (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at) VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'D1 marca |
| src/services/DataSyncService.js | 158 | leads | SELECT p.id, p.telefone_normalizado FROM prospect_leads p WHERE p.status = 'pendente' AND EXISTS ( SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado ) |
| src/services/DataSyncService.js | 184 | leads | SELECT p.* FROM prospect_leads p WHERE p.status = 'enviado' AND NOT EXISTS ( SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado ) |
| src/services/DataSyncService.js | 198 | leads | INSERT INTO leads ( id, nome, empresa, telefone, whatsapp, email, cidade, origem, pipeline_id, stage_id, cadence_status, cadence_day, created_at, updated_at ) VALUES (?, ?, ?, ?, ?, ?, ?, 'prospecção_ |
| src/services/DataSyncService.js | 217 | cadence_enrollments | INSERT INTO cadence_enrollments ( id, cadence_id, lead_id, status, current_day, enrolled_by, started_at, created_at ) VALUES (?, 'cadence_outbound_solar_15d', ?, 'active', 1, 'data_sync', datetime('no |
| src/services/DataSyncService.js | 225 | cadence_steps | SELECT id FROM cadence_steps WHERE cadence_id = 'cadence_outbound_solar_15d' AND day = 1 AND channel = 'whatsapp' LIMIT 1 |
| src/services/DataSyncService.js | 233 | cadence_actions_log | INSERT INTO cadence_actions_log (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at) VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'D1 envia |
| src/services/DataSyncService.js | 251 | leads | UPDATE leads SET cadence_status = 'active' WHERE stage_id = 'stage_em_cadencia' AND cadence_status != 'active' |
| src/services/DataSyncService.js | 260 | leads | UPDATE leads SET stage_id = 'stage_respondeu' WHERE cadence_status = 'responded' AND stage_id = 'stage_em_cadencia' |
| src/services/DataSyncService.js | 321 | leads, cadence_enrollments | SELECT COUNT(*) as count FROM leads l WHERE l.stage_id = 'stage_em_cadencia' AND l.cadence_status = 'active' AND NOT EXISTS (SELECT 1 FROM cadence_enrollments ce WHERE ce.lead_id = l.id AND ce.status  |
| src/services/DataSyncService.js | 327 | leads | SELECT COUNT(*) as count FROM prospect_leads p WHERE p.status = 'enviado' AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado) |
| src/services/DataSyncService.js | 333 | leads | SELECT COUNT(*) as count FROM prospect_leads p WHERE p.status = 'pendente' AND EXISTS (SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado) |
| src/services/DataSyncService.js | 366 | leads, cadence_enrollments, cadence_actions_log | SELECT cal.*, l.telefone, l.empresa FROM cadence_actions_log cal JOIN cadence_enrollments ce ON cal.enrollment_id = ce.id JOIN leads l ON ce.lead_id = l.id WHERE cal.status = 'failed' AND cal.executed |
| src/services/DataSyncService.js | 392 | cadence_actions_log | UPDATE cadence_actions_log SET status = 'sent', executed_at = datetime('now'), retry_count = COALESCE(retry_count, 0) + 1, error_message = NULL WHERE id = ? |
| src/services/DataSyncService.js | 405 | cadence_actions_log | UPDATE cadence_actions_log SET retry_count = COALESCE(retry_count, 0) + 1, error_message = ? WHERE id = ? |
| src/services/DeliveryTrackingService.js | 127 | cadence_actions_log | UPDATE cadence_actions_log SET status = ?, delivery_status = ?, delivery_updated_at = datetime('now') WHERE id = ? |
| src/services/DeliveryTrackingService.js | 245 | cadence_actions_log | SELECT status, delivery_status, delivery_updated_at, executed_at FROM cadence_actions_log WHERE id = ? |
| src/services/EntitlementService.js | 291 | teams | UPDATE teams SET messages_used_this_month = COALESCE(messages_used_this_month, 0) + ? WHERE id = ? |
| src/services/EntitlementService.js | 323 | teams | UPDATE teams SET messages_used_this_month = 0, billing_cycle_start = datetime('now') |
| src/services/EntitlementService.js | 339 | teams | SELECT id, name FROM teams WHERE billing_status = 'trial' AND datetime(trial_ends_at) <= datetime('now') |
| src/services/EntitlementService.js | 350 | teams | UPDATE teams SET billing_status = 'trial_expired' WHERE billing_status = 'trial' AND datetime(trial_ends_at) <= datetime('now') |
| src/services/EntitlementService.js | 423 | user_trial_grants | SELECT COUNT(*) as count FROM user_trial_grants WHERE ip_address = ? AND datetime(created_at) > datetime('now', '-' \|\| ? \|\| ' days') |
| src/services/EntitlementService.js | 455 | user_trial_grants | SELECT * FROM user_trial_grants WHERE user_id = ? OR email = ? OR normalized_email = ? |
| src/services/EntitlementService.js | 524 | teams | UPDATE teams SET billing_status = 'trial', trial_started_at = datetime('now'), trial_ends_at = datetime('now', '+' \|\| ? \|\| ' days'), max_agents = 1, max_messages_per_month = 500 WHERE id = ? |
| src/services/InboundEventsService.js | 80 | inbound_events | SELECT id, status FROM inbound_events WHERE provider = ? AND provider_event_id = ? |
| src/services/InboundEventsService.js | 124 | inbound_events | UPDATE inbound_events SET status = 'processing', processing_started_at = datetime('now') WHERE id = ? |
| src/services/InboundEventsService.js | 141 | inbound_events | UPDATE inbound_events SET status = 'processed', processed_at = datetime('now') WHERE id = ? |
| src/services/InboundEventsService.js | 164 | inbound_events | SELECT retry_count FROM inbound_events WHERE id = ? |
| src/services/InboundEventsService.js | 167 | inbound_events | UPDATE inbound_events SET status = 'error', error_message = ?, error_stack = ?, retry_count = ?, next_retry_at = datetime('now', '+' \|\| (? * ?) \|\| ' minutes') WHERE id = ? |
| src/services/InboundEventsService.js | 193 | inbound_events | UPDATE inbound_events SET status = 'skipped', error_message = ? WHERE id = ? |
| src/services/InboundEventsService.js | 211 | inbound_events | SELECT * FROM inbound_events WHERE status = 'error' AND retry_count < max_retries AND (next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now')) ORDER BY created_at ASC LIMIT ? |
| src/services/InboundEventsService.js | 234 | inbound_events | SELECT * FROM inbound_events WHERE status = 'processing' AND datetime(processing_started_at) < datetime('now', '-' \|\| ? \|\| ' minutes') |
| src/services/InboundEventsService.js | 249 | inbound_events | UPDATE inbound_events SET status = 'pending', retry_count = retry_count + 1, processing_started_at = NULL, error_message = 'Reset from stuck processing (timeout)' WHERE status = 'processing' AND datet |
| src/services/InboundEventsService.js | 276 | inbound_events | SELECT * FROM inbound_events WHERE id = ? |
| src/services/InboundEventsService.js | 294 | inbound_events | SELECT id, event_type, status, created_at, processed_at FROM inbound_events WHERE contact_phone = ? ORDER BY created_at DESC LIMIT ? |
| src/services/InboundEventsService.js | 336 | inbound_events | DELETE FROM inbound_events WHERE status IN ('processed', 'skipped') AND datetime(created_at) < datetime('now', '-' \|\| ? \|\| ' days') |
| src/services/IntegrationOAuthService.js | 81 | oauth_states | SELECT * FROM oauth_states WHERE state = ? AND consumed_at IS NULL AND datetime(expires_at) > datetime('now') |
| src/services/IntegrationOAuthService.js | 97 | oauth_states | UPDATE oauth_states SET consumed_at = datetime('now') WHERE id = ? |
| src/services/IntegrationOAuthService.js | 177 | integrations | SELECT config_json FROM integrations WHERE id = ? |
| src/services/IntegrationOAuthService.js | 205 | integrations | SELECT config_json FROM integrations WHERE id = ? |
| src/services/IntegrationOAuthService.js | 281 | integrations | ); config.oauth_tokens_encrypted = encryptedTokens; config.oauth_token_expires_at = mergedTokens.expires_at; config.oauth_last_refreshed = new Date().toISOString(); db.prepare(` UPDATE integrations SE |
| src/services/IntegrationOAuthService.js | 307 | integrations | ); // Remove token fields delete config.oauth_tokens_encrypted; delete config.oauth_token_expires_at; delete config.oauth_scopes; db.prepare(` UPDATE integrations SET config_json = ?, status = |
| src/services/IntegrationOAuthService.js | 322 | oauth_states | , { tenantId, integrationId }); } /** * Clean up expired OAuth states * Call periodically via cron */ cleanupExpiredStates() { const db = this.getDb(); const result = db.prepare(` DELETE FROM oauth_st |
| src/services/IntegrationService.js | 85 | agents, integrations, integration_bindings | SELECT i.*, a.id as bound_agent_id, a.name as bound_agent_name FROM integrations i LEFT JOIN integration_bindings ib ON i.id = ib.integration_id AND ib.is_primary = 1 LEFT JOIN agents a ON ib.agent_id |
| src/services/IntegrationService.js | 364 | integrations | SELECT config_json FROM integrations WHERE id = ? |
| src/services/PromptCacheService.js | 99 | agent_versions | SELECT compiled_prompt, compiled_prompt_hash, system_prompt FROM agent_versions WHERE id = ? |
| src/services/PromptCacheService.js | 107 | agent_versions | SELECT compiled_prompt, compiled_prompt_hash, system_prompt FROM agent_versions WHERE agent_id = ? AND is_active = 1 ORDER BY version_number DESC LIMIT 1 |
| src/services/PromptCacheService.js | 185 | agent_versions | UPDATE agent_versions SET compiled_prompt = ?, compiled_prompt_hash = ? WHERE id = ? |
| src/services/PromptCacheService.js | 288 | agent_versions | SELECT id, compiled_prompt, compiled_prompt_hash FROM agent_versions WHERE agent_id = ? AND is_active = 1 ORDER BY version_number DESC LIMIT 1 |
| src/services/ProspectImportService.js | 124 | leads | SELECT id FROM leads WHERE telefone = ? OR whatsapp = ? |
| src/services/ProspectImportService.js | 264 | leads | INSERT INTO leads ( id, nome, empresa, telefone, whatsapp, email, cidade, origem, pipeline_id, stage_id, cadence_status, cadence_day, created_at ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime( |
| src/services/ProspectImportService.js | 329 | leads | SELECT p.* FROM prospect_leads p WHERE p.status = 'pendente' AND p.telefone_normalizado IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado OR l.whatsapp = p.t |
| src/services/ProspectImportService.js | 411 | leads | SELECT COUNT(*) as count FROM leads WHERE origem = 'prospecção_automática' |
| src/tools/lead_scoring_system.js | 599 | lead_scores | INSERT INTO lead_scores ( contact_id, behavior_score, firmographics_score, bant_score, intent_score, total_score, classification, priority, last_activity, updated_at ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,  |
| src/tools/lead_scoring_system.js | 638 | lead_scores | SELECT * FROM lead_scores WHERE contact_id = ? |
| src/tools/lead_scoring_system.js | 674 | lead_scores | SELECT * FROM lead_scores WHERE classification = ? ORDER BY total_score DESC, last_activity DESC |
| src/tools/lead_scoring_system.js | 692 | lead_scores | SELECT * FROM lead_scores WHERE classification IN ('SQL', 'MQL') ORDER BY CASE classification WHEN 'SQL' THEN 1 WHEN 'MQL' THEN 2 END, total_score DESC, last_activity DESC LIMIT 50 |
