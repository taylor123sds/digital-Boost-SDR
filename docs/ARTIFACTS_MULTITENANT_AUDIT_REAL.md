# Multi-tenant Audit (Focused)

Excluded admin/health/metrics/debug routes. Prioritized webhook/inbox/integrations.

| FILE | LINE | TABLES | SQL (truncated) |
|---|---:|---|---|
| src/api/routes/webhook.routes.js | 581 | whatsapp_messages | , blocked: true, blockReason: entitlements.reason, billingStatus: entitlements.billingStatus, daysRemaining: entitlements.daysRemaining, timestamp: Date.now() }; } // Increment message count for usage |
| src/handlers/webhook_handler.js | 413 | leads | , error: error.message, stack: error.stack }; } } /** * Verifica se é evento de mensagem * * FIX: Aceitar messages.update quando contém mensagem real do usuário * * Evolution API pode enviar: * - mess |
| src/learning/conversation_analytics.js | 209 | whatsapp_messages | SELECT message_text, from_me FROM whatsapp_messages WHERE phone_number = ? ORDER BY created_at LIMIT 20 |
| src/scalable/agents/AgentConfigService.js | 81 | agent_configs | UPDATE agent_configs SET is_active = 0 WHERE agent_id = ? |
| src/scalable/agents/AgentConfigService.js | 123 | agent_configs | SELECT * FROM agent_configs WHERE agent_id = ? AND is_active = 1 ORDER BY version DESC LIMIT 1 |
| src/scalable/agents/AgentConfigService.js | 199 | agent_configs | SELECT id, version, is_active, created_at, created_by FROM agent_configs WHERE agent_id = ? ORDER BY version DESC |
| src/scalable/agents/AgentConfigService.js | 216 | agent_configs | SELECT * FROM agent_configs WHERE agent_id = ? AND version = ? |
| src/scalable/agents/AgentConfigService.js | 237 | agent_configs | DELETE FROM agent_configs WHERE agent_id = ? |
| src/scalable/agents/AgentConfigService.js | 494 | agent_configs | SELECT MAX(version) as max_version FROM agent_configs WHERE agent_id = ? |
| src/scalable/agents/AgentService.js | 102 | agents | SELECT * FROM agents WHERE id = ? |
| src/scalable/agents/AgentService.js | 165 | agents | SELECT * FROM agents WHERE 1=1 |
| src/scalable/agents/AgentService.js | 225 | agents, integrations | UPDATE agents SET name = ?, slug = ?, type = ?, status = ?, persona = ?, system_prompt = ?, prompts = ?, message_templates = ?, behavior = ?, ai_config = ?, integrations = ?, knowledge_base = ?, metri |
| src/scalable/agents/AgentService.js | 280 | agents | DELETE FROM agents WHERE id = ? |
| src/api/routes/ai-insights.routes.js | 116 | whatsapp_messages | SELECT message_text, phone_number, timestamp FROM whatsapp_messages WHERE timestamp > datetime('now', '-' \|\| ? \|\| ' days') AND from_me = 0 AND message_text IS NOT NULL |
| src/api/routes/ai-insights.routes.js | 318 | meetings | SELECT COUNT(*) as scheduled FROM meetings WHERE created_at > datetime('now', '-' \|\| ? \|\| ' days') |
| src/api/routes/ai-insights.routes.js | 373 | activities | SELECT COUNT(*) as count FROM activities WHERE status IN ('pending', 'in_progress') AND due_date < date('now') |
| src/api/routes/ai-insights.routes.js | 391 | leads | SELECT COUNT(*) as count FROM leads l LEFT JOIN lead_scores ls ON l.id = ls.lead_id WHERE (ls.total_score >= 70 OR l.bant_score >= 70) AND l.status NOT IN ('convertido', 'desqualificado') AND l.ultimo |
| src/api/routes/ai-insights.routes.js | 412 | opportunities | SELECT COUNT(*) as count FROM opportunities WHERE status = 'aberta' AND updated_at < datetime('now', '-7 days') |
| src/api/routes/ai-insights.routes.js | 431 | meetings | SELECT COUNT(*) as count FROM meetings WHERE date(data_inicio) = date('now') |
| src/api/routes/analytics.routes.js | 32 | whatsapp_messages | SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 1 |
| src/api/routes/analytics.routes.js | 33 | whatsapp_messages | SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 0 |
| src/api/routes/analytics.routes.js | 108 | whatsapp_messages | SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 1 |
| src/api/routes/analytics.routes.js | 109 | whatsapp_messages | SELECT COUNT(*) as count FROM whatsapp_messages WHERE from_me = 0 |
| src/api/routes/analytics.routes.js | 112 | whatsapp_messages | SELECT COUNT(DISTINCT phone_number) as count FROM whatsapp_messages WHERE from_me = 1 GROUP BY phone_number HAVING COUNT(*) >= 2 |
| src/api/routes/cadence.routes.js | 32 | cadence_enrollments | SELECT c.*, (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status = 'active') as active_enrollments, (SELECT COUNT(*) FROM cadence_enrollments WHERE cadence_id = c.id AND status |
| src/api/routes/cadence.routes.js | 58 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'active' |
| src/api/routes/cadence.routes.js | 59 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'responded' |
| src/api/routes/cadence.routes.js | 60 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'completed' |
| src/api/routes/cadence.routes.js | 61 | cadence_enrollments | SELECT COUNT(*) as count FROM cadence_enrollments WHERE status = 'converted' |
| src/api/routes/cadence.routes.js | 67 | cadence_enrollments | SELECT AVG(first_response_day) as avg_day FROM cadence_enrollments WHERE first_response_day IS NOT NULL |
| src/api/routes/cadence.routes.js | 73 | cadence_enrollments | SELECT first_response_channel as channel, COUNT(*) as count FROM cadence_enrollments WHERE first_response_channel IS NOT NULL GROUP BY first_response_channel |
| src/api/routes/cadence.routes.js | 80 | cadence_enrollments | SELECT response_type, COUNT(*) as count FROM cadence_enrollments WHERE response_type IS NOT NULL GROUP BY response_type |
| src/api/routes/cadence.routes.js | 87 | cadence_enrollments | SELECT first_response_day as day, COUNT(*) as count FROM cadence_enrollments WHERE first_response_day IS NOT NULL GROUP BY first_response_day ORDER BY first_response_day |
| src/api/routes/cadence.routes.js | 95 | leads | SELECT ps.name as stage, ps.color, COUNT(l.id) as count FROM pipeline_stages ps LEFT JOIN leads l ON l.stage_id = ps.id WHERE ps.pipeline_id = 'pipeline_outbound_solar' GROUP BY ps.id ORDER BY ps.posi |
| src/api/routes/cadence.routes.js | 256 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused') |
| src/api/routes/cadence.routes.js | 272 | cadence_enrollments | INSERT INTO cadence_enrollments (id, cadence_id, lead_id, status, current_day, enrolled_by, started_at) VALUES (?, ?, ?, 'active', 1, ?, datetime('now')) |
| src/api/routes/cadence.routes.js | 278 | leads | UPDATE leads SET cadence_id = ?, cadence_status = 'active', cadence_started_at = datetime('now'), cadence_day = 1, stage_id = 'stage_em_cadencia', stage_entered_at = datetime('now'), updated_at = date |
| src/api/routes/cadence.routes.js | 367 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'paused', paused_at = datetime('now'), pause_reason = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 374 | cadence_enrollments | SELECT lead_id FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 376 | leads | UPDATE leads SET cadence_status = 'paused', updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 400 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'active', paused_at = NULL, pause_reason = NULL WHERE id = ? |
| src/api/routes/cadence.routes.js | 406 | cadence_enrollments | SELECT lead_id FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 408 | leads | UPDATE leads SET cadence_status = 'active', updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 433 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 439 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'responded', responded_at = datetime('now'), first_response_channel = ?, first_response_day = current_day, response_type = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 450 | leads | UPDATE leads SET cadence_status = 'responded', first_response_at = datetime('now'), first_response_channel = ?, response_type = ?, stage_id = 'stage_respondeu', stage_entered_at = datetime('now'), upd |
| src/api/routes/cadence.routes.js | 574 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE id = ? |
| src/api/routes/cadence.routes.js | 592 | cadence_enrollments | UPDATE cadence_enrollments SET messages_sent = messages_sent + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 594 | cadence_enrollments | UPDATE cadence_enrollments SET emails_sent = emails_sent + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 596 | cadence_enrollments | UPDATE cadence_enrollments SET calls_made = calls_made + 1 WHERE id = ? |
| src/api/routes/cadence.routes.js | 600 | leads | UPDATE leads SET cadence_last_action_at = datetime('now'), cadence_attempt_count = cadence_attempt_count + 1, updated_at = datetime('now') WHERE id = ? |
| src/api/routes/cadence.routes.js | 631 | cadence_enrollments | SELECT e.*, c.duration_days FROM cadence_enrollments e JOIN cadences c ON e.cadence_id = c.id WHERE e.status = 'active' |
| src/api/routes/cadence.routes.js | 646 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'completed', completed_at = datetime('now'), completion_reason = 'No response after full cadence' WHERE id = ? |
| src/api/routes/cadence.routes.js | 652 | leads | UPDATE leads SET cadence_status = 'completed', stage_id = 'stage_nutricao', stage_entered_at = datetime('now'), in_nurture_flow = 1, nurture_started_at = datetime('now'), updated_at = datetime('now')  |
| src/api/routes/cadence.routes.js | 671 | cadence_enrollments | UPDATE cadence_enrollments SET current_day = ? WHERE id = ? |
| src/api/routes/cadence.routes.js | 675 | leads | UPDATE leads SET cadence_day = ?, updated_at = datetime('now') WHERE id = ? |
| src/api/routes/command-center.routes.js | 70 | activities, meetings | ) THEN 1 ELSE 0 END) as overdue FROM activities `); const activities = activitiesStmt.get(); // Meetings today const meetingsStmt = db.prepare(` SELECT COUNT(*) as count FROM meetings WHERE date(data_ |
| src/api/routes/command-center.routes.js | 191 | leads, whatsapp_messages | , optionalAuth, (req, res) => { const db = getDb(); try { const { limit = 10, minScore = 60 } = req.query; const stmt = db.prepare(` SELECT l.*, ls.total_score, ls.classification as grade, ls.firmogra |
| src/api/routes/email-optin.routes.js | 283 | leads | SELECT l.*, e.sent_at as email_sent_at, e.message_id as email_message_id FROM leads l LEFT JOIN email_optins e ON e.email = l.email WHERE l.whatsapp_eligible = 1 AND l.cadence_status = 'not_started' O |
| src/api/routes/email-optin.routes.js | 336 | leads | UPDATE leads SET whatsapp_eligible = 1, stage_id = 'stage_lead_novo', updated_at = datetime('now') WHERE email_optin_status = 'sent' AND whatsapp_eligible = 0 |
| src/api/routes/email-optin.routes.js | 348 | leads | UPDATE leads SET whatsapp_eligible = 1, stage_id = 'stage_lead_novo', updated_at = datetime('now') WHERE email = ? AND whatsapp_eligible = 0 |
| src/api/routes/forecasting.routes.js | 183 | opportunities | SELECT AVG(valor) as avg_deal FROM opportunities WHERE status = 'ganha' AND data_fechamento > datetime('now', '-90 days') |
| src/api/routes/forecasting.routes.js | 192 | opportunities | SELECT AVG(ciclo_venda_dias) as avg_cycle FROM opportunities WHERE status = 'ganha' AND data_fechamento > datetime('now', '-90 days') AND ciclo_venda_dias IS NOT NULL |
| src/api/routes/forecasting.routes.js | 202 | opportunities | SELECT COUNT(*) as count FROM opportunities WHERE status = 'aberta' |
| src/api/routes/funil.routes.js | 321 | leads, whatsapp_messages | SELECT DISTINCT l.whatsapp FROM leads l WHERE EXISTS ( SELECT 1 FROM whatsapp_messages wm WHERE wm.phone_number = l.whatsapp ) |
| src/api/routes/funil.routes.js | 436 | leads, whatsapp_messages | SELECT l.*, ps.name as stage_name, ps.color as stage_color, (SELECT COUNT(*) FROM whatsapp_messages WHERE phone_number = l.whatsapp) as total_messages, (SELECT MAX(created_at) FROM whatsapp_messages W |
| src/api/routes/funil.routes.js | 540 | leads, whatsapp_messages, cadence_enrollments | SELECT l.*, ps.name as stage_name, ps.color as stage_color, ps.position as stage_position, ce.current_day as enrollment_day, ce.status as enrollment_status, (SELECT COUNT(*) FROM whatsapp_messages WHE |
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
| src/automation/CadenceEngine.js | 182 | cadence_enrollments | SELECT id FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused') |
| src/automation/CadenceEngine.js | 193 | cadence_enrollments | INSERT INTO cadence_enrollments (cadence_id, lead_id, status, current_day, enrolled_by, started_at) VALUES (?, ?, 'active', 1, ?, datetime('now')) |
| src/automation/CadenceEngine.js | 201 | leads | UPDATE leads SET cadence_id = ?, cadence_status = 'active', cadence_started_at = datetime('now'), cadence_day = 1, pipeline_id = 'pipeline_outbound_solar', stage_id = 'stage_em_cadencia', stage_entere |
| src/automation/CadenceEngine.js | 262 | leads, cadence_enrollments | SELECT e.*, l.nome, l.empresa, l.telefone, l.email, l.cidade FROM cadence_enrollments e JOIN leads l ON e.lead_id = l.id WHERE e.id = ? |
| src/automation/CadenceEngine.js | 296 | cadence_enrollments | SELECT 1 FROM cadence_enrollments WHERE id = ? AND last_response_at IS NOT NULL |
| src/automation/CadenceEngine.js | 330 | cadence_enrollments | , { error: error.message, enrollmentId }); return { success: false, error: error.message }; } // FIX: Removed db.close() - using singleton connection } /** * Execute a single cadence action (send What |
| src/automation/CadenceEngine.js | 355 | leads | ) WHERE id = ? `).run(enrollment.id); // 2. FIX: Update leads table cadence_status (was missing!) db.prepare(` UPDATE leads SET cadence_status = |
| src/automation/CadenceEngine.js | 460 | leads | ).run(enrollment.id); } // Update lead db.prepare(` UPDATE leads SET cadence_last_action_at = datetime( |
| src/automation/CadenceEngine.js | 582 | cadence_enrollments | , error); return { success: false, error: error.message }; } } /** * Advance all active enrollments to the next day */ async advanceAllEnrollments() { const db = this.getDb(); try { const enrollments  |
| src/automation/CadenceEngine.js | 597 | cadence_enrollments | `).all(); let advanced = 0; let completed = 0; for (const enrollment of enrollments) { const nextDay = enrollment.current_day + 1; if (nextDay > enrollment.duration_days) { // Cadence completed - move |
| src/automation/CadenceEngine.js | 611 | leads | WHERE id = ? `).run(enrollment.id); // Get lead data for sheets sync const lead = db.prepare(` SELECT nome, empresa, telefone, email FROM leads WHERE id = ? `).get(enrollment.lead_id); db.prepare(` UP |
| src/automation/CadenceEngine.js | 684 | cadence_enrollments | SELECT id FROM cadence_enrollments WHERE status = 'active' |
| src/automation/CadenceEngine.js | 730 | cadence_enrollments | SELECT * FROM cadence_enrollments WHERE lead_id = ? AND status = 'active' ORDER BY enrolled_at DESC LIMIT 1 |
| src/automation/CadenceEngine.js | 742 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'responded', responded_at = datetime('now'), last_response_at = datetime('now'), first_response_channel = ?, first_response_day = current_day, response_type = ? |
| src/automation/CadenceEngine.js | 754 | leads | UPDATE leads SET cadence_status = 'responded', first_response_at = datetime('now'), first_response_channel = ?, response_type = ?, stage_id = 'stage_respondeu', stage_entered_at = datetime('now'), upd |
| src/automation/CadenceEngine.js | 773 | leads | SELECT nome, empresa, telefone, email FROM leads WHERE id = ? |
| src/automation/CadenceEngine.js | 827 | leads, cadence_enrollments | SELECT ce.id, ce.lead_id FROM cadence_enrollments ce JOIN leads l ON ce.lead_id = l.id WHERE l.telefone LIKE ? AND ce.status = 'active' ORDER BY ce.enrolled_at DESC LIMIT 1 |
| src/automation/CadenceEngine.js | 840 | cadence_enrollments | UPDATE cadence_enrollments SET status = 'stopped', completion_reason = 'bot_detected', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
| src/automation/CadenceEngine.js | 850 | leads | UPDATE leads SET cadence_status = 'stopped', stage_id = 'stage_bot_bloqueado', stage_entered_at = datetime('now'), updated_at = datetime('now') WHERE id = ? |
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
| src/automation/ProspectingEngine.js | 824 | leads, cadence_enrollments | SELECT 1 FROM cadence_actions_log cal JOIN cadence_enrollments ce ON cal.enrollment_id = ce.id JOIN leads l ON ce.lead_id = l.id WHERE l.telefone = ? AND cal.action_type = 'send_message' AND cal.statu |
| src/automation/ProspectingEngine.js | 844 | leads, cadence_enrollments | SELECT 1 FROM cadence_enrollments e JOIN leads l ON e.lead_id = l.id WHERE l.telefone = ? LIMIT 1 |
| src/automation/ProspectingEngine.js | 861 | whatsapp_messages | SELECT 1 FROM whatsapp_messages WHERE phone_number = ? LIMIT 1 |
| src/automation/engine.js | 277 | leads | SELECT * FROM leads WHERE status NOT IN ('convertido', 'desqualificado') |
| src/automation/engine.js | 283 | meetings | SELECT * FROM meetings WHERE status = 'agendada' |
| src/automation/engine.js | 289 | opportunities | SELECT * FROM opportunities WHERE status = 'aberta' |
| src/automation/engine.js | 295 | leads | SELECT * FROM leads WHERE status = "novo" |
| src/automation/engine.js | 567 | leads | UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ? |
| src/automation/engine.js | 584 | leads | UPDATE leads SET custom_fields = json_set(COALESCE(custom_fields, '{}'), '$.next_followup', ?) WHERE id = ? |
| src/db/migrations/003_prospect_leads.js | 22 | leads | CREATE TABLE IF NOT EXISTS prospect_leads ( id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), -- Dados básicos do lead empresa TEXT NOT NULL, nome TEXT, cnpj TEXT, segmento TEXT, porte TEXT, f |
| src/db/migrations/003_prospect_leads.js | 91 | leads | CREATE TABLE IF NOT EXISTS prospect_history ( id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), prospect_id TEXT NOT NULL, lead_id TEXT, -- ID na tabela leads (após conversão) action TEXT NOT  |
| src/handlers/WebhookTransactionManager.js | 65 | leads | SELECT id, stage_id, cadence_status, cadence_day, first_response_at FROM leads WHERE telefone = ? OR whatsapp = ? ORDER BY created_at DESC LIMIT 1 |
| src/handlers/WebhookTransactionManager.js | 74 | leads | t exist const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; db.prepare(` INSERT INTO leads ( id, telefone, whatsapp, stage_id, cadence_status, response_type, first_respo |
| src/handlers/WebhookTransactionManager.js | 91 | leads | }; } const leadId = lead.id; const previousStage = lead.stage_id; const wasFirstResponse = !lead.first_response_at; // 2. Update lead stage and status const updateStmt = db.prepare(` UPDATE leads SET  |
| src/handlers/WebhookTransactionManager.js | 121 | cadence_enrollments | )) `).run( `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, leadId, previousStage ); } // 4. Update cadence enrollment if exists const enrollment = db.prepare(` SELECT id, current_day FR |
| src/handlers/WebhookTransactionManager.js | 133 | cadence_enrollments | ORDER BY enrolled_at DESC LIMIT 1 `).get(leadId); if (enrollment) { db.prepare(` UPDATE cadence_enrollments SET status = |
| src/handlers/WebhookTransactionManager.js | 229 | leads | } = meetingData; try { const db = getDatabase(); const result = withTransaction(db, () => { // Find lead const lead = db.prepare(` SELECT id, stage_id FROM leads WHERE telefone = ? OR whatsapp = ? LIM |
| src/handlers/WebhookTransactionManager.js | 247 | leads | ; const previousStage = lead.stage_id; // Update lead db.prepare(` UPDATE leads SET stage_id = ?, cadence_status = |
| src/handlers/WebhookTransactionManager.js | 257 | cadence_enrollments | ) WHERE id = ? `).run(newStage, meetingId, lead.id); // Stop cadence enrollment db.prepare(` UPDATE cadence_enrollments SET status = |
| src/handlers/WebhookTransactionManager.js | 305 | leads | , { contactId, error: error.message }); return { success: false, error: error.message, rolledBack: true }; } } /** * Process lead qualification (BANT score update) in a transaction * * @param {string} |
| src/handlers/WebhookTransactionManager.js | 351 | leads | : lead.stage_id; // Update lead with BANT data db.prepare(` UPDATE leads SET bant_score = ?, bant_budget = COALESCE(?, bant_budget), bant_authority = COALESCE(?, bant_authority), bant_need = COALESCE( |
| src/handlers/persistence_manager.js | 309 | whatsapp_messages | ) { const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - daysOld); // FIX: Usar API correta do better-sqlite3 (prepare().run()) e coluna correta (created_at) const stmt = db.prepar |
| src/intelligence/ConversationSupervisor.js | 272 | whatsapp_messages | SELECT role, content, created_at FROM whatsapp_messages WHERE contact_id = ? ORDER BY created_at ASC |
| src/intelligence/ConversationSupervisor.js | 354 | whatsapp_messages | SELECT DISTINCT contact_id FROM whatsapp_messages WHERE created_at >= ? AND contact_id IS NOT NULL |
| src/intelligence/ConversationSupervisor.js | 483 | whatsapp_messages | SELECT role, content as text FROM whatsapp_messages WHERE contact_id = ? ORDER BY created_at DESC LIMIT ? |
| src/memory.js | 356 | whatsapp_messages | INSERT INTO whatsapp_messages(phone_number, message_text, from_me, message_type) VALUES(?, ?, ?, ?) |
| src/memory.js | 373 | whatsapp_messages | SELECT message_text as text, from_me as fromMe, message_type, created_at FROM whatsapp_messages WHERE phone_number = ? ORDER BY created_at DESC LIMIT ? |
| src/memory.js | 1156 | whatsapp_messages | INSERT INTO whatsapp_messages (phone_number, message_text, from_me, message_type) VALUES (?, ?, ?, ?) |
| src/models/Account.js | 51 | contacts | SELECT * FROM contacts WHERE account_id = ? |
| src/models/Account.js | 52 | opportunities | SELECT * FROM opportunities WHERE account_id = ? |
| src/models/Account.js | 73 | accounts | SELECT tipo, COUNT(*) as count FROM accounts GROUP BY tipo |
| src/models/Account.js | 78 | accounts | SELECT setor, COUNT(*) as count FROM accounts WHERE setor IS NOT NULL GROUP BY setor ORDER BY count DESC LIMIT 10 |
| src/models/Activity.js | 55 | activities | SELECT * FROM activities WHERE assigned_to = ? |
| src/models/Activity.js | 79 | leads, contacts, opportunities, activities | SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name FROM activities a LEFT JOIN leads l ON a.lead_id = l.id LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN opport |
| src/models/Activity.js | 106 | leads, contacts, opportunities, activities | s activities */ findToday(userId = null) { const db = this.getDb(); try { let query = ` SELECT a.*, l.nome as lead_name, c.nome as contact_name, o.nome as opportunity_name FROM activities a LEFT JOIN  |
| src/models/Activity.js | 127 | leads, contacts, opportunities, activities | ; const stmt = db.prepare(query); return stmt.all(...params); } catch (error) { throw error; } } /** * Find upcoming activities */ findUpcoming(userId = null, { days = 7, limit = 50 } = {}) { const db |
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
| src/models/Notification.js | 19 | notifications | SELECT * FROM notifications WHERE user_id = ? |
| src/models/Notification.js | 45 | notifications | SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 |
| src/models/Notification.js | 97 | notifications | UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE user_id = ? AND is_read = 0 |
| src/models/Notification.js | 115 | notifications | SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT ? OFFSET ? |
| src/models/Notification.js | 133 | notifications | SELECT * FROM notifications WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC |
| src/models/Notification.js | 150 | notifications | DELETE FROM notifications WHERE created_at < datetime('now', '-' \|\| ? \|\| ' days') AND is_read = 1 |
| src/models/Notification.js | 168 | notifications | INSERT INTO notifications (id, user_id, type, title, message, priority, entity_type, entity_id, action_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) |
| src/models/Opportunity.js | 73 | accounts | SELECT * FROM accounts WHERE id = ? |
| src/models/Opportunity.js | 78 | contacts | SELECT * FROM contacts WHERE id = ? |
| src/models/Opportunity.js | 82 | activities | SELECT * FROM activities WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT 20 |
| src/models/Opportunity.js | 272 | opportunities | SELECT AVG(ciclo_venda_dias) as avg_days FROM opportunities WHERE status = 'ganha' AND ciclo_venda_dias IS NOT NULL |
| src/models/User.js | 182 | leads | SELECT COUNT(*) as total FROM leads WHERE owner_id = ? ${dateFilter} |
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
| src/repositories/lead.repository.js | 344 | leads | ) { const db = this.getDb(); // Get all stages const stages = db.prepare(` SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY position ASC `).all(pipelineId); // Get leads for each stage con |
| src/repositories/lead.repository.js | 383 | leads | ); // Get total - use pipeline_id only if column exists let total = 0; if (hasPipelineId) { total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_id = ?`).get(pipelineId)?.count \|\| 0; |
| src/repositories/lead.repository.js | 437 | leads | `).get()?.count \|\| 0; const lost = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE stage_id = |
| src/repositories/lead.repository.js | 438 | leads | `).get()?.count \|\| 0; const conversionRate = total > 0 ? ((won / total) * 100).toFixed(2) : 0; const responseRate = total > 0 ? ((responded / total) * 100).toFixed(2) : 0; return { total, byStage, byC |
| src/repositories/lead.repository.js | 509 | leads, opportunities | ) { return this.getFunnelLeads(pipelineId); } /** * Add pipeline opportunity (for pipeline.routes.js compatibility) */ addPipelineOpportunity(data) { return this.create(data); } /** * Update pipeline  |
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

- ...and 50 more.
