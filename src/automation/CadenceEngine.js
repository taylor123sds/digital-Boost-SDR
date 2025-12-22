/**
 * @file CadenceEngine.js
 * @description Engine for executing 15-day outbound cadences
 * Handles: enrollment, day advancement, action execution, response detection
 */

import { EventEmitter } from 'events';
import cron from 'node-cron';
import { sendCadenceEmail } from '../services/EmailService.js';
import { getConversationContextService } from '../services/ConversationContextService.js';
import { leadRepository } from '../repositories/lead.repository.js';
import { getDeliveryTrackingService } from '../services/DeliveryTrackingService.js';
import simpleBotDetector from '../security/SimpleBotDetector.js';
import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';

/**
 * Cadence Engine
 * Manages the lifecycle of outbound cadences
 */
class CadenceEngine extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.scheduledJobs = [];
    this.stats = {
      enrollmentsProcessed: 0,
      actionsExecuted: 0,
      responsesDetected: 0,
      retriesSucceeded: 0,
      retriesFailed: 0,
      lastRun: null
    };

    //  FIX: Use singleton database connection instead of creating new connections
    this._db = null;
  }

  /**
   * Get database connection (singleton pattern)
   *  FIX: Prevents connection pool exhaustion
   */
  getDb() {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }

  /**
   * Retry helper with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {Object} options - Retry options
   * @returns {Promise} - Result of fn
   */
  async withRetry(fn, options = {}) {
    const {
      maxAttempts = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      operation = 'operation'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          log.error(`[CADENCE-ENGINE] ${operation} failed after ${maxAttempts} attempts`, {
            error: error.message
          });
          this.stats.retriesFailed++;
          throw error;
        }

        const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        log.warn(`[CADENCE-ENGINE] ${operation} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms`, {
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Initialize the cadence engine
   */
  async initialize() {
    console.log('[CADENCE-ENGINE] Initializing...');

    try {
      // Schedule daily jobs
      this.scheduleDailyJobs();

      // Schedule hourly action processing
      this.scheduleHourlyJobs();

      this.isRunning = true;
      console.log('[CADENCE-ENGINE] Initialized successfully');

      return true;
    } catch (error) {
      console.error('[CADENCE-ENGINE] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Schedule daily jobs (advance day, cleanup, etc.)
   */
  scheduleDailyJobs() {
    // Advance cadence day at 6 AM (before business hours)
    const advanceDayJob = cron.schedule('0 6 * * *', () => {
      console.log('[CADENCE-ENGINE] Running daily advance-day job');
      this.advanceAllEnrollments();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.scheduledJobs.push(advanceDayJob);
    console.log('[CADENCE-ENGINE] Scheduled daily advance-day job at 6 AM');
  }

  /**
   * Schedule hourly jobs (process pending actions)
   *  DISABLED: CadenceEngine follow-ups are disabled to prevent spam
   * The ProspectingEngine handles D1 correctly. Follow-ups need redesign with:
   * - Rate limiting (max X messages per hour)
   * - Intelligent contextual messages (not placeholders)
   * - Proper spacing between sends
   */
  scheduleHourlyJobs() {
    //  ENABLED - Rate limiting + real messages implemented
    const processActionsJob = cron.schedule('0 8-18 * * 1-5', () => {
      console.log('[CADENCE-ENGINE] Processing pending follow-up actions (D2+)');
      this.processPendingActions();
    }, {
      timezone: 'America/Sao_Paulo'
    });
    this.scheduledJobs.push(processActionsJob);
    console.log('[CADENCE-ENGINE]  Hourly follow-up job scheduled (8h-18h weekdays)');
  }

  /**
   * Enroll a lead in the default cadence
   * @param {string} leadId - Lead ID to enroll
   * @param {Object} options - Enrollment options
   * @param {string} options.cadenceId - Specific cadence ID (optional)
   * @param {string} options.enrolledBy - Source of enrollment
   * @param {boolean} options.skipInitialAction - If true, skip D1 action (already sent by caller)
   */
  async enrollLead(leadId, options = {}) {
    const db = this.getDb();
    try {
      const { cadenceId, enrolledBy, skipInitialAction = false } = options;

      //  FIX P0: Check if lead is a bot BEFORE enrolling
      // Get lead phone and tenant first
      const lead = db.prepare(`
        SELECT telefone, tenant_id
        FROM leads
        WHERE id = ?
      `).get(leadId);
      if (lead?.telefone && simpleBotDetector.isBlocked(lead.telefone)) {
        log.warn(`[CADENCE-ENGINE]  BOT BLOCKED - Cannot enroll: ${lead.telefone}`);
        return { success: false, error: 'bot_blocked', reason: 'Lead is a detected bot' };
      }

      if (!lead?.tenant_id) {
        throw new Error('Lead tenant not found');
      }

      const tenantId = lead.tenant_id;

      // Get default cadence if not specified
      const targetCadenceId = cadenceId || db.prepare(`
        SELECT id
        FROM cadences
        WHERE is_default = 1 AND is_active = 1 AND tenant_id = ?
        LIMIT 1
      `).get(tenantId)?.id;

      if (!targetCadenceId) {
        throw new Error('No active cadence found');
      }

      // Check if already enrolled
      const existing = db.prepare(`
        SELECT id FROM cadence_enrollments
        WHERE cadence_id = ? AND lead_id = ? AND status IN ('active', 'paused')
          AND tenant_id = ?
      `).get(targetCadenceId, leadId, tenantId);

      if (existing) {
        console.log(`[CADENCE-ENGINE] Lead ${leadId} already enrolled`);
        return { success: false, error: 'Already enrolled', enrollment_id: existing.id };
      }

      // Create enrollment - let SQLite auto-generate the INTEGER id
      const insertResult = db.prepare(`
        INSERT INTO cadence_enrollments (
          cadence_id, lead_id, status, current_day, enrolled_by, started_at, tenant_id
        )
        VALUES (?, ?, 'active', 1, ?, datetime('now'), ?)
      `).run(targetCadenceId, leadId, enrolledBy || 'system', tenantId);

      const enrollmentId = insertResult.lastInsertRowid;

      // Update lead
      db.prepare(`
        UPDATE leads SET
          cadence_id = ?,
          cadence_status = 'active',
          cadence_started_at = datetime('now'),
          cadence_day = 1,
          pipeline_id = 'pipeline_outbound_solar',
          stage_id = 'stage_em_cadencia',
          stage_entered_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(targetCadenceId, leadId, tenantId);

      // Log pipeline movement
      db.prepare(`
        INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
        VALUES (?, ?, 'stage_lead_novo', 'stage_em_cadencia', ?, 'Auto-enrolled in cadence D1')
      `).run(`ph_${Date.now()}`, leadId, enrolledBy || 'system');

      console.log(`[CADENCE-ENGINE] Lead ${leadId} enrolled in cadence ${targetCadenceId}`);

      // Emit event for immediate D1 action
      this.emit('lead_enrolled', { leadId, enrollmentId, cadenceId: targetCadenceId, day: 1 });

      // Process D1 immediately (unless caller already sent the message)
      if (!skipInitialAction) {
        await this.processEnrollmentActions(enrollmentId);
      } else {
        console.log(`[CADENCE-ENGINE] Skipping D1 action - already sent by ${enrolledBy}`);

        // Log D1 as already sent (so follow-ups know context)
        const step = db.prepare(`
          SELECT id FROM cadence_steps
          WHERE cadence_id = ? AND day = 1 AND channel = 'whatsapp'
          LIMIT 1
            AND tenant_id = ?
        `).get(targetCadenceId, tenantId);

        if (step) {
          const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          db.prepare(`
            INSERT INTO cadence_actions_log
              (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at, tenant_id)
            VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'Sent by prospecting_engine', datetime('now'), ?)
          `).run(actionId, enrollmentId, step.id, leadId, tenantId);
        }
      }

      return { success: true, enrollment_id: enrollmentId };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Enrollment error:', { error: error.message, leadId });
      return { success: false, error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Process actions for a specific enrollment
   */
  async processEnrollmentActions(enrollmentId) {
    const db = this.getDb();
    try {
      const enrollment = db.prepare(`
        SELECT e.*, l.nome, l.empresa, l.telefone, l.email, l.cidade
        FROM cadence_enrollments e
        JOIN leads l ON e.lead_id = l.id
        WHERE e.id = ?
          AND e.tenant_id = l.tenant_id
      `).get(enrollmentId);

      if (!enrollment || enrollment.status !== 'active') {
        return { success: false, error: 'Enrollment not active' };
      }

      // Get steps for current day
      const steps = db.prepare(`
        SELECT * FROM cadence_steps
        WHERE cadence_id = ? AND day = ? AND is_active = 1
          AND tenant_id = ?
        ORDER BY step_order
      `).all(enrollment.cadence_id, enrollment.current_day, enrollment.tenant_id);

      const results = [];

      for (const step of steps) {
        // Check if already executed
        const alreadyExecuted = db.prepare(`
          SELECT id FROM cadence_actions_log
          WHERE enrollment_id = ? AND step_id = ? AND day = ?
          AND status IN ('sent', 'delivered')
          AND tenant_id = ?
        `).get(enrollmentId, step.id, enrollment.current_day, enrollment.tenant_id);

        if (alreadyExecuted) {
          continue;
        }

        //  NEW: Check condition_type - skip 'if_no_response' steps if lead has responded
        if (step.condition_type === 'if_no_response') {
          const hasResponded = db.prepare(`
            SELECT 1 FROM cadence_enrollments
            WHERE id = ? AND last_response_at IS NOT NULL
              AND tenant_id = ?
          `).get(enrollmentId, enrollment.tenant_id);

          if (hasResponded) {
            console.log(`[CADENCE-ENGINE] Skipping D${enrollment.current_day} step "${step.name}" - lead has responded`);
            continue;
          }
        }

        // Skip if it's a task (no auto-execution)
        if (step.channel === 'task') {
          // Log task as pending for human action
          const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          db.prepare(`
            INSERT INTO cadence_actions_log
              (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, scheduled_at, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
          `).run(
            actionId,
            enrollmentId,
            step.id,
            enrollment.lead_id,
            step.action_type,
            step.channel,
            enrollment.current_day,
            step.content,
            enrollment.tenant_id
          );

          results.push({ step_id: step.id, status: 'task_created', action_id: actionId });
          continue;
        }

        // Execute message action
        const result = await this.executeAction(enrollment, step);
        results.push({ step_id: step.id, ...result });
      }

      log.info(`[CADENCE-ENGINE] Processed ${results.length} actions for enrollment ${enrollmentId}`);

      return { success: true, results };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Action processing error:', { error: error.message, enrollmentId });
      return { success: false, error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Execute a single cadence action (send WhatsApp, email, etc.)
   *
   *  INTELLIGENT FOLLOW-UP: If day > 1 and lead has conversation history,
   * generates contextual follow-up instead of static template
   */
  async executeAction(enrollment, step) {
    const db = this.getDb();
    try {
      //  FIX P0: Check if lead is a detected bot - STOP CADENCE COMPLETELY
      if (enrollment.telefone && simpleBotDetector.isBlocked(enrollment.telefone)) {
        log.warn(`[CADENCE-ENGINE]  BOT DETECTED - Stopping cadence for: ${enrollment.telefone}`);

        // 1. Stop the enrollment
        db.prepare(`
          UPDATE cadence_enrollments
          SET status = 'stopped',
              completion_reason = 'bot_detected',
              completed_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.id, enrollment.tenant_id);

        // 2.  FIX: Update leads table cadence_status (was missing!)
        db.prepare(`
          UPDATE leads
          SET cadence_status = 'stopped',
              stage_id = 'stage_bot_bloqueado',
              stage_entered_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.lead_id, enrollment.tenant_id);

        // 3. Log pipeline movement
        db.prepare(`
          INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
          VALUES (?, ?, 'stage_em_cadencia', 'stage_bot_bloqueado', 'bot_detector', 'Bot detected - cadence stopped')
        `).run(`ph_bot_${Date.now()}`, enrollment.lead_id);

        log.info(`[CADENCE-ENGINE]  Cadence fully stopped for bot: ${enrollment.telefone}`);

        return { success: false, reason: 'bot_detected', stopped: true };
      }

      const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      //  INTELLIGENT FOLLOW-UP: Check if should use contextual message
      let finalContent = step.content;
      let usedIntelligentFollowUp = false;

      if (enrollment.current_day > 1 && step.channel === 'whatsapp') {
        try {
          const contextService = getConversationContextService();
          const hasHistory = await contextService.hasConversationHistory(enrollment.telefone);

          if (hasHistory) {
            console.log(`[CADENCE-ENGINE]  Lead has conversation history - generating intelligent follow-up for D${enrollment.current_day}`);

            const intelligentFollowUp = await contextService.generateIntelligentFollowUp(
              enrollment.telefone,
              enrollment.current_day,
              { nome: enrollment.nome, empresa: enrollment.empresa }
            );

            if (intelligentFollowUp) {
              finalContent = intelligentFollowUp;
              usedIntelligentFollowUp = true;
              console.log(`[CADENCE-ENGINE]  Using intelligent follow-up instead of template`);
            } else {
              console.log(`[CADENCE-ENGINE]  Intelligent follow-up generation failed, using default template`);
            }
          }
        } catch (contextError) {
          console.error('[CADENCE-ENGINE] Context service error:', contextError.message);
          // Continue with default template
        }
      }

      // Personalize message content (only if not using intelligent follow-up)
      const personalizedContent = usedIntelligentFollowUp
        ? finalContent
        : this.personalizeContent(finalContent, enrollment);

      // Log action as pending
      db.prepare(`
        INSERT INTO cadence_actions_log
          (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, scheduled_at, tenant_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
      `).run(
        actionId,
        enrollment.id,
        step.id,
        enrollment.lead_id,
        step.action_type,
        step.channel,
        enrollment.current_day,
        personalizedContent,
        enrollment.tenant_id
      );

      let sendResult = { success: false };

      // Execute based on channel
      if (step.channel === 'whatsapp') {
        sendResult = await this.sendWhatsApp(enrollment.telefone, personalizedContent);
      } else if (step.channel === 'email') {
        //  FIX: Pass lead data for subject personalization
        const personalizedSubject = this.personalizeContent(step.subject, enrollment);
        sendResult = await this.sendEmail(enrollment.email, personalizedSubject, personalizedContent, enrollment);
      }

      // Update action status
      const newStatus = sendResult.success ? 'sent' : 'failed';
      db.prepare(`
        UPDATE cadence_actions_log
        SET status = ?, executed_at = datetime('now'), error_message = ?, message_id = ?
        WHERE id = ? AND tenant_id = ?
      `).run(newStatus, sendResult.error || null, sendResult.message_id || null, actionId, enrollment.tenant_id);

      // Register for delivery tracking if WhatsApp message
      if (sendResult.success && step.channel === 'whatsapp' && sendResult.message_id) {
        try {
          const deliveryService = getDeliveryTrackingService();
          deliveryService.registerMessage(actionId, sendResult.message_id, enrollment.telefone);
        } catch (trackingError) {
          console.warn('[CADENCE-ENGINE] Delivery tracking registration failed:', trackingError.message);
        }
      }

      // Update enrollment counters
      if (sendResult.success) {
        if (step.channel === 'whatsapp') {
          db.prepare(`
            UPDATE cadence_enrollments
            SET messages_sent = messages_sent + 1
            WHERE id = ? AND tenant_id = ?
          `).run(enrollment.id, enrollment.tenant_id);
        } else if (step.channel === 'email') {
          db.prepare(`
            UPDATE cadence_enrollments
            SET emails_sent = emails_sent + 1
            WHERE id = ? AND tenant_id = ?
          `).run(enrollment.id, enrollment.tenant_id);
        }

        // Update lead
        db.prepare(`
          UPDATE leads SET
            cadence_last_action_at = datetime('now'),
            cadence_attempt_count = cadence_attempt_count + 1,
            ultimo_contato = datetime('now'),
            updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.lead_id, enrollment.tenant_id);

        this.stats.actionsExecuted++;
      }

      return { success: sendResult.success, action_id: actionId, status: newStatus };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Action execution error:', { error: error.message });
      return { success: false, error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Personalize message content with lead data
   * Supports multiple variable formats: [var], {var}, {{var}}
   */
  personalizeContent(content, lead) {
    if (!content) return '';

    return content
      // [nome], [empresa], [cidade] format
      .replace(/\[nome\]/gi, lead.nome || '')
      .replace(/\[empresa\]/gi, lead.empresa || '')
      .replace(/\[cidade\]/gi, lead.cidade || '')
      .replace(/\[NOME\]/g, lead.nome || '')
      .replace(/\[EMPRESA\]/g, lead.empresa || '')
      .replace(/\[CIDADE\]/g, lead.cidade || '')
      // {nome}, {empresa}, {cidade} format
      .replace(/\{nome\}/gi, lead.nome || '')
      .replace(/\{empresa\}/gi, lead.empresa || '')
      .replace(/\{cidade\}/gi, lead.cidade || '')
      // {{nome}}, {{empresa}}, {{cidade}} format (used in cadence_steps templates)
      .replace(/\{\{nome\}\}/gi, lead.nome || '')
      .replace(/\{\{empresa\}\}/gi, lead.empresa || '')
      .replace(/\{\{cidade\}\}/gi, lead.cidade || '');
  }

  /**
   * Send WhatsApp message via Evolution API
   *  FIX: Added retry with exponential backoff
   */
  async sendWhatsApp(phone, message) {
    const normalizedPhone = phone.replace(/\D/g, '');

    try {
      const result = await this.withRetry(
        async () => {
          const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');
          const sendResult = await sendWhatsAppText(normalizedPhone, message);

          // If blocked by deduplication, don't retry
          if (sendResult.blocked) {
            return { success: false, blocked: true, reason: sendResult.reason };
          }

          // If we got a result without error, it's success
          if (sendResult.key?.id || sendResult.status === 'PENDING') {
            return { success: true, message_id: sendResult.key?.id };
          }

          // Check for transient errors that should trigger retry
          if (sendResult.error) {
            throw new Error(sendResult.error);
          }

          return { success: true, message_id: sendResult.key?.id };
        },
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 15000,
          operation: `WhatsApp send to ${normalizedPhone}`
        }
      );

      if (result.success) {
        this.stats.retriesSucceeded++;
        log.info(`[CADENCE-ENGINE] WhatsApp sent to ${normalizedPhone}`);
      }

      return result;
    } catch (error) {
      log.error('[CADENCE-ENGINE] WhatsApp send failed after retries:', {
        phone: normalizedPhone,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email via EmailService
   */
  async sendEmail(email, subject, body, lead = {}) {
    try {
      if (!email) {
        console.warn('[CADENCE-ENGINE] Email não fornecido para o lead');
        return { success: false, error: 'No email provided' };
      }

      console.log(`[CADENCE-ENGINE] Enviando email para ${email}: ${subject}`);

      const result = await sendCadenceEmail(email, subject, body, lead);

      if (result.success) {
        console.log(`[CADENCE-ENGINE] Email enviado com sucesso para ${email}`);
      }

      return result;
    } catch (error) {
      console.error('[CADENCE-ENGINE] Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Advance all active enrollments to the next day
   */
  async advanceAllEnrollments() {
    const db = this.getDb();
    try {
      const enrollments = db.prepare(`
        SELECT e.*, c.duration_days
        FROM cadence_enrollments e
        JOIN cadences c ON e.cadence_id = c.id
        WHERE e.status = 'active'
          AND e.tenant_id = c.tenant_id
      `).all();

      let advanced = 0;
      let completed = 0;

      for (const enrollment of enrollments) {
        const nextDay = enrollment.current_day + 1;

        if (nextDay > enrollment.duration_days) {
          // Cadence completed - move to nurture
          db.prepare(`
            UPDATE cadence_enrollments
            SET status = 'completed', completed_at = datetime('now'),
                completion_reason = 'Cadence completed without response'
            WHERE id = ? AND tenant_id = ?
          `).run(enrollment.id, enrollment.tenant_id);

          // Get lead data for sheets sync
          const lead = db.prepare(`
            SELECT nome, empresa, telefone, email
            FROM leads
            WHERE id = ? AND tenant_id = ?
          `).get(enrollment.lead_id, enrollment.tenant_id);

          db.prepare(`
            UPDATE leads SET
              cadence_status = 'completed',
              stage_id = 'stage_nutricao',
              stage_entered_at = datetime('now'),
              in_nurture_flow = 1,
              nurture_started_at = datetime('now'),
              reactivate_at = datetime('now', '+90 days'),
              updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
          `).run(enrollment.lead_id, enrollment.tenant_id);

          db.prepare(`
            INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
            VALUES (?, ?, 'stage_em_cadencia', 'stage_nutricao', 'system', '15-day cadence completed')
          `).run(`ph_${Date.now()}_${enrollment.id}`, enrollment.lead_id);

          //  Sync to SQLite (primary) via LeadRepository
          if (lead?.telefone) {
            try {
              leadRepository.upsert(lead.telefone, {
                nome: lead.nome,
                empresa: lead.empresa,
                email: lead.email,
                stage_id: 'stage_nutricao',
                cadence_status: 'completed',
                cadence_day: enrollment.duration_days
              }, enrollment.tenant_id);
            } catch (err) {
              console.error('[CADENCE-ENGINE] SQLite sync error:', err.message);
            }
          }

          completed++;
        } else {
          // Advance to next day
          db.prepare(`
            UPDATE cadence_enrollments
            SET current_day = ?
            WHERE id = ? AND tenant_id = ?
          `).run(nextDay, enrollment.id, enrollment.tenant_id);

          db.prepare(`
            UPDATE leads
            SET cadence_day = ?, updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
          `).run(nextDay, enrollment.lead_id, enrollment.tenant_id);

          advanced++;
        }
      }

      log.info(`[CADENCE-ENGINE] Advanced ${advanced} enrollments, completed ${completed}`);
      this.stats.enrollmentsProcessed += enrollments.length;
      this.stats.lastRun = new Date().toISOString();

      return { advanced, completed };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Advance error:', { error: error.message });
      return { error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Process all pending actions for active enrollments
   */
  async processPendingActions() {
    const db = this.getDb();
    try {
      const enrollments = db.prepare(`
        SELECT id, tenant_id
        FROM cadence_enrollments
        WHERE status = 'active'
          AND tenant_id IS NOT NULL
      `).all();

      let processed = 0;

      //  FIX: Rate limiting - max 20 messages per batch, 5 seconds between each
      const MAX_BATCH_SIZE = 20;
      const DELAY_BETWEEN_SENDS_MS = 5000; // 5 segundos entre envios

      const enrollmentsToProcess = enrollments.slice(0, MAX_BATCH_SIZE);

      for (const enrollment of enrollmentsToProcess) {
        const result = await this.processEnrollmentActions(enrollment.id);
        if (result.success && result.results?.length > 0) {
          processed += result.results.length;

          // Rate limit: aguardar entre envios
          if (processed < enrollmentsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SENDS_MS));
          }
        }
      }

      if (enrollments.length > MAX_BATCH_SIZE) {
        log.warn(`[CADENCE-ENGINE] Rate limited: ${enrollments.length - MAX_BATCH_SIZE} enrollments queued for next run`);
      }

      log.info(`[CADENCE-ENGINE] Processed ${processed} pending actions`);
      return { processed };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Pending actions error:', { error: error.message });
      return { error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Handle response from a lead (stop cadence, move to next stage)
   */
  async handleResponse(leadId, responseData = {}) {
    const db = this.getDb();
    try {
      const { channel, responseType, content } = responseData;

      const leadTenant = db.prepare(`
        SELECT tenant_id
        FROM leads
        WHERE id = ?
      `).get(leadId);

      if (!leadTenant?.tenant_id) {
        return { success: false, error: 'Lead tenant not found' };
      }

      const tenantId = leadTenant.tenant_id;

      // Find active enrollment
      const enrollment = db.prepare(`
        SELECT * FROM cadence_enrollments
        WHERE lead_id = ? AND status = 'active'
          AND tenant_id = ?
        ORDER BY enrolled_at DESC LIMIT 1
      `).get(leadId, tenantId);

      if (!enrollment) {
        console.log(`[CADENCE-ENGINE] No active enrollment for lead ${leadId}`);
        return { success: false, error: 'No active enrollment' };
      }

      // Update enrollment
      db.prepare(`
        UPDATE cadence_enrollments
        SET status = 'responded',
            responded_at = datetime('now'),
            last_response_at = datetime('now'),
            first_response_channel = ?,
            first_response_day = current_day,
            response_type = ?
        WHERE id = ? AND tenant_id = ?
      `).run(channel || 'whatsapp', responseType, enrollment.id, tenantId);

      // Update lead
      db.prepare(`
        UPDATE leads SET
          cadence_status = 'responded',
          first_response_at = datetime('now'),
          first_response_channel = ?,
          response_type = ?,
          stage_id = 'stage_respondeu',
          stage_entered_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(channel || 'whatsapp', responseType, leadId, tenantId);

      // Log pipeline movement
      db.prepare(`
        INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
        VALUES (?, ?, 'stage_em_cadencia', 'stage_respondeu', 'system', 'Lead responded to cadence')
      `).run(`ph_${Date.now()}`, leadId);

      // Get lead data for sheets sync
      const lead = db.prepare(`
        SELECT nome, empresa, telefone, email
        FROM leads
        WHERE id = ? AND tenant_id = ?
      `).get(leadId, tenantId);

      //  Sync to SQLite (primary) via LeadRepository
      if (lead?.telefone) {
        try {
          leadRepository.upsert(lead.telefone, {
            nome: lead.nome,
            empresa: lead.empresa,
            email: lead.email,
            stage_id: 'stage_respondeu',
            cadence_status: 'responded',
            cadence_day: enrollment.current_day,
            response_type: responseType,
            first_response_at: new Date().toISOString()
          }, tenantId);
        } catch (err) {
          console.error('[CADENCE-ENGINE] SQLite sync error:', err.message);
        }
      }

      this.stats.responsesDetected++;

      console.log(`[CADENCE-ENGINE] Lead ${leadId} responded on day ${enrollment.current_day}`);

      // Emit event
      this.emit('lead_responded', {
        leadId,
        enrollmentId: enrollment.id,
        day: enrollment.current_day,
        channel,
        responseType
      });

      return { success: true, enrollment_id: enrollment.id, response_day: enrollment.current_day };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Response handling error:', { error: error.message, leadId });
      return { success: false, error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   *  FIX P0: Stop cadence when bot is detected
   * Called by SimpleBotDetector when a lead is blocked
   * @param {string} telefone - Lead phone number
   */
  stopCadenceForBot(telefone) {
    const db = this.getDb();
    const phone = telefone.replace(/\D/g, '');

    try {
      // Find active enrollment by phone
      const enrollment = db.prepare(`
        SELECT ce.id, ce.lead_id, ce.tenant_id
        FROM cadence_enrollments ce
        JOIN leads l ON ce.lead_id = l.id
        WHERE l.telefone LIKE ? AND ce.status = 'active'
          AND ce.tenant_id = l.tenant_id
        ORDER BY ce.enrolled_at DESC LIMIT 1
      `).get(`%${phone}%`);

      if (!enrollment) {
        log.info(`[CADENCE-ENGINE] No active enrollment to stop for bot: ${phone}`);
        return { success: true, message: 'no_enrollment' };
      }

      // 1. Stop the enrollment
      db.prepare(`
        UPDATE cadence_enrollments
        SET status = 'stopped',
            completion_reason = 'bot_detected',
            completed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment.id, enrollment.tenant_id);

      // 2. Update leads table
      db.prepare(`
        UPDATE leads
        SET cadence_status = 'stopped',
            stage_id = 'stage_bot_bloqueado',
            stage_entered_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).run(enrollment.lead_id, enrollment.tenant_id);

      // 3. Log pipeline movement
      db.prepare(`
        INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
        VALUES (?, ?, 'stage_em_cadencia', 'stage_bot_bloqueado', 'bot_detector', 'Bot detected - cadence stopped proactively')
      `).run(`ph_bot_${Date.now()}`, enrollment.lead_id);

      log.warn(`[CADENCE-ENGINE]  Cadence STOPPED for bot: ${phone} (enrollment: ${enrollment.id})`);

      return { success: true, enrollment_id: enrollment.id, stopped: true };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Error stopping cadence for bot:', { error: error.message, telefone });
      return { success: false, error: error.message };
    }
  }

  /**
   * Record lead interaction without stopping cadence
   * Used to track that lead responded but cadence may continue
   * @param {string} telefone - Lead phone number
   */
  recordInteraction(telefone, tenantId = 'default') {
    const db = this.getDb();
    try {
      // Find active enrollment by phone
      const enrollment = db.prepare(`
        SELECT ce.id, ce.tenant_id
        FROM cadence_enrollments ce
        JOIN leads l ON ce.lead_id = l.id
        WHERE l.telefone LIKE ? AND ce.status = 'active'
          AND ce.tenant_id = l.tenant_id
          AND ce.tenant_id = ?
        ORDER BY ce.enrolled_at DESC LIMIT 1
      `).get(`%${telefone.replace(/\D/g, '')}%`, tenantId);

      if (enrollment) {
        db.prepare(`
          UPDATE cadence_enrollments
          SET last_response_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ? AND tenant_id = ?
        `).run(enrollment.id, enrollment.tenant_id);

        log.info(`[CADENCE-ENGINE]  Recorded interaction for enrollment ${enrollment.id}`);
        return { success: true, enrollment_id: enrollment.id };
      }

      return { success: false, error: 'No active enrollment found' };
    } catch (error) {
      log.error('[CADENCE-ENGINE] Record interaction error:', { error: error.message, telefone });
      return { success: false, error: error.message };
    }
    //  FIX: Removed db.close() - using singleton connection
  }

  /**
   * Get engine stats
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      scheduledJobs: this.scheduledJobs.length
    };
  }

  /**
   * Stop the engine
   */
  stop() {
    this.scheduledJobs.forEach(job => job.stop());
    this.isRunning = false;
    console.log('[CADENCE-ENGINE] Stopped');
  }
}

// Singleton instance
let cadenceEngineInstance = null;

export function getCadenceEngine() {
  if (!cadenceEngineInstance) {
    cadenceEngineInstance = new CadenceEngine();
  }
  return cadenceEngineInstance;
}

export { CadenceEngine };
export default CadenceEngine;
