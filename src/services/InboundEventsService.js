/**
 * @file InboundEventsService.js
 * @description P3-1: Service for webhook staging using inbound_events table
 *
 * PROPÓSITO:
 * 1. Persistir webhook ANTES de processar (fail-safe)
 * 2. Permitir retry de eventos que falharam
 * 3. Rastreabilidade completa de todos os webhooks recebidos
 * 4. Idempotência via UNIQUE(provider, provider_event_id)
 *
 * FLUXO:
 * 1. Webhook chega -> INSERT em inbound_events (status='pending')
 * 2. Processamento -> UPDATE status='processing'
 * 3. Sucesso -> UPDATE status='processed', processed_at=NOW
 * 4. Erro -> UPDATE status='error', error_message=..., retry_count++
 * 5. Job de retry -> SELECT WHERE status='error' AND retry_count < max
 *
 * @version 1.0.0
 */

import { getDatabase } from '../db/connection.js';
import log from '../utils/logger-wrapper.js';

class InboundEventsService {
  constructor() {
    this.workerId = `worker_${process.pid}_${Date.now()}`;
    log.info('[INBOUND-EVENTS] Service initialized', { workerId: this.workerId });
  }

  /**
   * Get database connection
   */
  getDb() {
    return getDatabase();
  }

  /**
   * Generate unique ID for event
   */
  generateId() {
    return `ie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stage incoming webhook (INSERT before processing)
   * @param {Object} webhookData - Raw webhook payload
   * @param {string} provider - Provider name ('evolution', 'meta', etc.)
   * @param {string} tenantId - Tenant ID (default 'default')
   * @returns {Object} { id, isNew, isDuplicate }
   */
  stageWebhook(webhookData, provider = 'evolution', tenantId = 'default', options = {}) {
    const db = this.getDb();

    try {
      // Extract provider event ID for idempotency
      const providerEventId = options.providerEventId || this.extractProviderEventId(webhookData);
      const eventType = webhookData.event || 'unknown';
      const contactPhone = this.extractContactPhone(webhookData);

      const id = this.generateId();
      const payloadJson = JSON.stringify(webhookData);

      // Try to insert (will fail if duplicate provider + provider_event_id)
      const stmt = db.prepare(`
        INSERT INTO inbound_events (
          id, tenant_id, provider, provider_event_id, event_type,
          contact_phone, payload_json, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(provider, provider_event_id) WHERE provider_event_id IS NOT NULL
        DO UPDATE SET updated_at = datetime('now')
      `);

      const result = stmt.run(id, tenantId, provider, providerEventId, eventType, contactPhone, payloadJson);

      const isNew = result.changes > 0 && result.lastInsertRowid;

      if (!isNew && providerEventId) {
        // Check if it was a duplicate
        const existing = db.prepare(`
          SELECT id, status FROM inbound_events
          WHERE provider = ? AND provider_event_id = ? AND tenant_id = ?
        `).get(provider, providerEventId, tenantId);

        if (existing) {
          log.debug('[INBOUND-EVENTS] Duplicate webhook detected', {
            provider,
            providerEventId,
            existingId: existing.id,
            existingStatus: existing.status
          });

          return {
            id: existing.id,
            isNew: false,
            isDuplicate: true,
            existingStatus: existing.status
          };
        }
      }

      log.debug('[INBOUND-EVENTS] Webhook staged', {
        id,
        provider,
        eventType,
        contactPhone
      });

      return { id, isNew: true, isDuplicate: false };

    } catch (error) {
      log.error('[INBOUND-EVENTS] Failed to stage webhook', error);
      throw error;
    }
  }

  /**
   * Mark event as processing
   * @param {string} eventId - Event ID
   */
  markProcessing(eventId, tenantId = null) {
    const db = this.getDb();

    const sql = tenantId
      ? `
      UPDATE inbound_events
      SET status = 'processing',
          processing_started_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `
      : `
      UPDATE inbound_events
      SET status = 'processing',
          processing_started_at = datetime('now')
      WHERE id = ?
    `;

    if (tenantId) {
      db.prepare(sql).run(eventId, tenantId);
    } else {
      // tenant-guard: ignore (eventId is globally unique)
      db.prepare(sql).run(eventId);
    }

    log.debug('[INBOUND-EVENTS] Marked as processing', { eventId });
  }

  /**
   * Mark event as processed (success)
   * @param {string} eventId - Event ID
   */
  markProcessed(eventId, tenantId = null) {
    const db = this.getDb();

    const sql = tenantId
      ? `
      UPDATE inbound_events
      SET status = 'processed',
          processed_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `
      : `
      UPDATE inbound_events
      SET status = 'processed',
          processed_at = datetime('now')
      WHERE id = ?
    `;

    if (tenantId) {
      db.prepare(sql).run(eventId, tenantId);
    } else {
      // tenant-guard: ignore (eventId is globally unique)
      db.prepare(sql).run(eventId);
    }

    log.debug('[INBOUND-EVENTS] Marked as processed', { eventId });
  }

  /**
   * Mark event as error (for retry)
   * @param {string} eventId - Event ID
   * @param {Error|string} error - Error object or message
   * @param {number} backoffMinutes - Base backoff for retry (multiplied by retry_count)
   */
  markError(eventId, error, backoffMinutes = 5, tenantId = null) {
    const db = this.getDb();

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    // Get current retry count
    const eventSql = tenantId
      ? 'SELECT retry_count FROM inbound_events WHERE id = ? AND tenant_id = ?'
      : 'SELECT retry_count FROM inbound_events WHERE id = ?';
    const event = tenantId
      ? db.prepare(eventSql).get(eventId, tenantId)
      : db.prepare(eventSql).get(eventId); // tenant-guard: ignore (eventId unique)
    const retryCount = (event?.retry_count || 0) + 1;

    const updateSql = tenantId
      ? `
      UPDATE inbound_events
      SET status = 'error',
          error_message = ?,
          error_stack = ?,
          retry_count = ?,
          next_retry_at = datetime('now', '+' || (? * ?) || ' minutes')
      WHERE id = ? AND tenant_id = ?
    `
      : `
      UPDATE inbound_events
      SET status = 'error',
          error_message = ?,
          error_stack = ?,
          retry_count = ?,
          next_retry_at = datetime('now', '+' || (? * ?) || ' minutes')
      WHERE id = ?
    `;

    if (tenantId) {
      db.prepare(updateSql).run(errorMessage, errorStack, retryCount, retryCount, backoffMinutes, eventId, tenantId);
    } else {
      // tenant-guard: ignore (eventId is globally unique)
      db.prepare(updateSql).run(errorMessage, errorStack, retryCount, retryCount, backoffMinutes, eventId);
    }

    log.warn('[INBOUND-EVENTS] Marked as error', {
      eventId,
      errorMessage,
      retryCount,
      nextRetryMinutes: retryCount * backoffMinutes
    });
  }

  /**
   * Mark event as skipped (not an error, just ignored)
   * @param {string} eventId - Event ID
   * @param {string} reason - Skip reason
   */
  markSkipped(eventId, reason, tenantId = null) {
    const db = this.getDb();

    const sql = tenantId
      ? `
      UPDATE inbound_events
      SET status = 'skipped',
          error_message = ?
      WHERE id = ? AND tenant_id = ?
    `
      : `
      UPDATE inbound_events
      SET status = 'skipped',
          error_message = ?
      WHERE id = ?
    `;

    if (tenantId) {
      db.prepare(sql).run(reason, eventId, tenantId);
    } else {
      // tenant-guard: ignore (eventId is globally unique)
      db.prepare(sql).run(reason, eventId);
    }

    log.debug('[INBOUND-EVENTS] Marked as skipped', { eventId, reason });
  }

  /**
   * Get events pending retry
   * @param {number} limit - Max events to return
   * @returns {Array} Events ready for retry
   */
  getEventsForRetry(limit = 10) {
    const db = this.getDb();

    const events = db.prepare(`
      SELECT * FROM inbound_events
      WHERE status = 'error'
        AND retry_count < max_retries
        AND (next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now'))
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit); // tenant-guard: ignore (global retry queue)

    return events.map(e => ({
      ...e,
      payload: JSON.parse(e.payload_json)
    }));
  }

  /**
   * Get events stuck in processing (timeout detection)
   * @param {number} timeoutMinutes - Processing timeout in minutes
   * @returns {Array} Stuck events
   */
  getStuckEvents(timeoutMinutes = 5) {
    const db = this.getDb();

    return db.prepare(`
      SELECT * FROM inbound_events
      WHERE status = 'processing'
        AND datetime(processing_started_at) < datetime('now', '-' || ? || ' minutes')
    `).all(timeoutMinutes); // tenant-guard: ignore (global watchdog)
  }

  /**
   * Reset stuck events to pending
   * @param {number} timeoutMinutes - Processing timeout in minutes
   * @returns {number} Number of events reset
   */
  resetStuckEvents(timeoutMinutes = 5) {
    const db = this.getDb();

    const result = db.prepare(`
      UPDATE inbound_events -- tenant-guard: ignore
      SET status = 'pending',
          retry_count = retry_count + 1,
          processing_started_at = NULL,
          error_message = 'Reset from stuck processing (timeout)'
      WHERE status = 'processing'
        AND datetime(processing_started_at) < datetime('now', '-' || ? || ' minutes')
    `).run(timeoutMinutes);

    if (result.changes > 0) {
      log.warn('[INBOUND-EVENTS] Reset stuck events', {
        count: result.changes,
        timeoutMinutes
      });
    }

    return result.changes;
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Object|null} Event data
   */
  getById(eventId) {
    const db = this.getDb();
    const event = db.prepare('SELECT * FROM inbound_events -- tenant-guard: ignore\nWHERE id = ?').get(eventId);

    if (event) {
      event.payload = JSON.parse(event.payload_json);
    }

    return event;
  }

  /**
   * Get events by contact phone
   * @param {string} phone - Contact phone
   * @param {number} limit - Max events
   * @returns {Array} Events
   */
  getByContact(phone, limit = 50) {
    const db = this.getDb();

    return db.prepare(`
      SELECT id, event_type, status, created_at, processed_at
      FROM inbound_events
      -- tenant-guard: ignore (admin lookup by contact)
      WHERE contact_phone = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(phone, limit);
  }

  /**
   * Get statistics
   * @returns {Object} Stats
   */
  getStats() {
    const db = this.getDb();

    const stats = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM inbound_events
      -- tenant-guard: ignore (global stats)
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY status
    `).all();

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      byStatus: Object.fromEntries(stats.map(s => [s.status, s.count])),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup old processed events
   * @param {number} daysToKeep - Days to keep processed events
   * @returns {number} Events deleted
   */
  cleanup(daysToKeep = 7) {
    const db = this.getDb();

    const result = db.prepare(`
      DELETE FROM inbound_events -- tenant-guard: ignore
      WHERE status IN ('processed', 'skipped')
        AND datetime(created_at) < datetime('now', '-' || ? || ' days')
    `).run(daysToKeep);

    if (result.changes > 0) {
      log.info('[INBOUND-EVENTS] Cleanup completed', {
        deleted: result.changes,
        daysToKeep
      });
    }

    return result.changes;
  }

  // =========================================
  // Helper methods
  // =========================================

  /**
   * Extract provider event ID from webhook payload
   */
  extractProviderEventId(webhookData) {
    // Evolution API
    if (webhookData.data?.key?.id) {
      return webhookData.data.key.id;
    }

    // Meta Cloud API
    if (webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id) {
      return webhookData.entry[0].changes[0].value.messages[0].id;
    }

    // Fallback: generate hash
    return null;
  }

  /**
   * Extract contact phone from webhook payload
   */
  extractContactPhone(webhookData) {
    // Evolution API
    const data = webhookData.data || {};
    const key = data.key || {};

    // Handle @lid (broadcast list)
    if (key.remoteJid?.includes('@lid')) {
      const remoteJidAlt = key.remoteJidAlt || '';
      if (remoteJidAlt.includes('@s.whatsapp.net')) {
        return remoteJidAlt.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      }
      const participant = key.participant || '';
      if (participant.includes('@s.whatsapp.net')) {
        return participant.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      }
    }

    // Normal number
    const remoteJid = key.remoteJid || data.from || '';
    return remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '') || null;
  }
}

// Singleton instance
let instance = null;

export function getInboundEventsService() {
  if (!instance) {
    instance = new InboundEventsService();
  }
  return instance;
}

export default InboundEventsService;
