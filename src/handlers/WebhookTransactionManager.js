/**
 * @file WebhookTransactionManager.js
 * @description P0-5: Transaction cascade for webhook response handling
 *
 * Groups multiple database operations into atomic transactions:
 * - Lead stage update
 * - Cadence status update
 * - Pipeline history
 * - Conversation context
 *
 * External operations (Google Sheets) run OUTSIDE the transaction.
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import { withTransaction } from '../db/transaction.js';
import log from '../utils/logger-wrapper.js';
import { appendTenantColumns } from '../utils/tenantCompat.js';
import { assertTenantScoped, getTenantColumnOrThrow } from '../utils/tenantGuard.js';

/**
 * WebhookTransactionManager
 * Handles atomic database updates when processing webhook responses
 */
export class WebhookTransactionManager {
  constructor() {
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      rolledBack: 0
    };
  }

  /**
   * Process lead response in a transaction
   * Atomically updates lead stage, cadence status, and logs history
   *
   * @param {string} contactId - Phone number of the lead
   * @param {Object} responseData - Response data
   * @param {string} responseData.responseType - Type: positive/negative/neutral
   * @param {string} responseData.messageText - Content of the message
   * @param {Object} responseData.intent - Detected intent from pipeline
   * @param {string} responseData.tenantId - Tenant ID (default: 'default')
   * @returns {Object} Transaction result
   */
  processLeadResponse(contactId, responseData = {}) {
    this.stats.totalTransactions++;

    const {
      responseType = 'neutral',
      messageText = '',
      intent = null,
      tenantId = 'default'
    } = responseData;

    const timestamp = new Date().toISOString();

    try {
      const db = getDatabase();
      const leadTenantColumn = getTenantColumnOrThrow(db, 'leads', tenantId, 'processLeadResponse leads');
      const cadenceTenantColumn = getTenantColumnOrThrow(db, 'cadence_enrollments', tenantId, 'processLeadResponse cadence');
      const pipelineTenantColumn = getTenantColumnOrThrow(db, 'pipeline_history', tenantId, 'processLeadResponse pipeline history');
      const contextTenantColumn = getTenantColumnOrThrow(db, 'conversation_contexts', tenantId, 'processLeadResponse contexts');

      // Execute atomic transaction
      const result = withTransaction(db, () => {
        // 1. Find the lead
        // tenant-guard: ignore (dynamic tenant column)
        const leadQuery = `
          SELECT id, stage_id, cadence_status, cadence_day, first_response_at
          FROM leads /* tenant-guard: ignore */
          WHERE ${leadTenantColumn} = ?
            AND (telefone = ? OR whatsapp = ?)
          ORDER BY created_at DESC
          LIMIT 1
        `;
        assertTenantScoped(leadQuery, [tenantId, contactId, contactId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads lookup'
        });
        const lead = db.prepare(leadQuery).get(tenantId, contactId, contactId);

        if (!lead) {
          // Create new lead if doesn't exist
          const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          let columns = [
            'id',
            'telefone',
            'whatsapp',
            'stage_id',
            'cadence_status',
            'response_type',
            'first_response_at',
            'stage_entered_at',
            'created_at',
            'updated_at'
          ];
          let values = [
            newLeadId,
            contactId,
            contactId,
            'stage_respondeu',
            'responded',
            responseType,
            timestamp,
            timestamp,
            timestamp,
            timestamp
          ];
          ({ columns, values } = appendTenantColumns(db, 'leads', columns, values, tenantId));
          const placeholders = columns.map(() => '?').join(', ');
          // tenant-guard: ignore (dynamic tenant columns)
          const insertLeadSql = `
            INSERT INTO leads /* tenant-guard: ignore */ (${columns.join(', ')})
            VALUES (${placeholders})
          `;
          assertTenantScoped(insertLeadSql, values, {
            tenantId,
            tenantColumn: leadTenantColumn,
            operation: 'leads insert'
          });
          db.prepare(insertLeadSql).run(...values);

          log.info('[TXN] New lead created in transaction', { leadId: newLeadId, contactId });

          return {
            action: 'lead_created',
            leadId: newLeadId,
            previousStage: null,
            newStage: 'stage_respondeu'
          };
        }

        const leadId = lead.id;
        const previousStage = lead.stage_id;
        const wasFirstResponse = !lead.first_response_at;

        // 2. Update lead stage and status
        // tenant-guard: ignore (dynamic tenant column)
        const updateSql = `
          UPDATE leads -- tenant-guard: ignore
          SET
            stage_id = 'stage_respondeu',
            cadence_status = 'responded',
            response_type = ?,
            first_response_at = COALESCE(first_response_at, ?),
            stage_entered_at = CASE
              WHEN stage_id != 'stage_respondeu' THEN datetime('now')
              ELSE stage_entered_at
            END,
            updated_at = datetime('now')
          WHERE id = ? AND ${leadTenantColumn} = ?
        `;

        assertTenantScoped(updateSql, [responseType, timestamp, leadId, tenantId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads update'
        });
        const updateStmt = db.prepare(updateSql);
        updateStmt.run(responseType, timestamp, leadId, tenantId);

        // 3. Log pipeline history if stage changed
        if (previousStage !== 'stage_respondeu') {
          let columns = [
            'id',
            'lead_id',
            'from_stage_id',
            'to_stage_id',
            'moved_by',
            'reason',
            'created_at'
          ];
          let values = [
            `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            leadId,
            previousStage,
            'stage_respondeu',
            'system',
            'Lead responded via webhook',
            new Date().toISOString()
          ];
          ({ columns, values } = appendTenantColumns(db, 'pipeline_history', columns, values, tenantId));
          const placeholders = columns.map(() => '?').join(', ');
          // tenant-guard: ignore (dynamic tenant columns)
          const pipelineInsertSql = `
            INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
            VALUES (${placeholders})
          `;
          assertTenantScoped(pipelineInsertSql, values, {
            tenantId,
            tenantColumn: pipelineTenantColumn,
            operation: 'pipeline_history insert'
          });
          db.prepare(pipelineInsertSql).run(...values);
        }

        // 4. Update cadence enrollment if exists
        // tenant-guard: ignore (dynamic tenant column)
        const enrollmentSql = `
          SELECT id, current_day
          FROM cadence_enrollments /* tenant-guard: ignore */
          WHERE lead_id = ? AND status = 'active' AND ${cadenceTenantColumn} = ?
          ORDER BY enrolled_at DESC
          LIMIT 1
        `;
        assertTenantScoped(enrollmentSql, [leadId, tenantId], {
          tenantId,
          tenantColumn: cadenceTenantColumn,
          operation: 'cadence_enrollments lookup'
        });
        const enrollment = db.prepare(enrollmentSql).get(leadId, tenantId);

        if (enrollment) {
          // tenant-guard: ignore (dynamic tenant column)
          const cadenceUpdateSql = `
            UPDATE cadence_enrollments -- tenant-guard: ignore
            SET
              status = 'responded',
              responded_at = datetime('now'),
              response_day = ?,
              updated_at = datetime('now')
            WHERE id = ? AND ${cadenceTenantColumn} = ?
          `;
          assertTenantScoped(cadenceUpdateSql, [enrollment.current_day, enrollment.id, tenantId], {
            tenantId,
            tenantColumn: cadenceTenantColumn,
            operation: 'cadence_enrollments update'
          });
          db.prepare(cadenceUpdateSql).run(enrollment.current_day, enrollment.id, tenantId);

          log.debug('[TXN] Cadence enrollment updated', {
            enrollmentId: enrollment.id,
            responseDay: enrollment.current_day
          });
        }

        // 5. Save conversation context snapshot (P1-2: include tenant_id)
        const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const contextInsertSql = `
          INSERT OR REPLACE INTO conversation_contexts (
            id, lead_id, phone, tenant_id, last_message, intent_json, response_type,
            cadence_day, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        assertTenantScoped(contextInsertSql, [
          contextId,
          leadId,
          contactId,
          tenantId,
          messageText.substring(0, 500),
          intent ? JSON.stringify(intent) : null,
          responseType,
          enrollment?.current_day || lead.cadence_day || 1
        ], {
          tenantId,
          tenantColumn: contextTenantColumn,
          operation: 'conversation_contexts insert'
        });
        db.prepare(contextInsertSql).run(
          contextId,
          leadId,
          contactId,
          tenantId,
          messageText.substring(0, 500), // Limit message length
          intent ? JSON.stringify(intent) : null,
          responseType,
          enrollment?.current_day || lead.cadence_day || 1
        );

        return {
          action: 'lead_updated',
          leadId,
          previousStage,
          newStage: 'stage_respondeu',
          wasFirstResponse,
          enrollmentUpdated: !!enrollment,
          responseDay: enrollment?.current_day || lead.cadence_day || 1
        };
      });

      this.stats.successfulTransactions++;

      log.success('[TXN] Transaction completed successfully', {
        contactId,
        action: result.action,
        leadId: result.leadId
      });

      return {
        success: true,
        ...result
      };

    } catch (error) {
      this.stats.failedTransactions++;
      this.stats.rolledBack++;

      log.error('[TXN] Transaction failed and rolled back', {
        contactId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        rolledBack: true
      };
    }
  }

  /**
   * Process meeting scheduled in a transaction
   * Atomically updates lead stage and stops cadence
   *
   * @param {string} contactId - Phone number
   * @param {Object} meetingData - Meeting data
   * @returns {Object} Transaction result
   */
  processMeetingScheduled(contactId, meetingData = {}) {
    this.stats.totalTransactions++;

    const {
      meetingId = null,
      scheduledAt = null,
      meetingType = 'triagem',
      tenantId = 'default'
    } = meetingData;

    try {
      const db = getDatabase();
      const leadTenantColumn = getTenantColumnOrThrow(db, 'leads', tenantId, 'processMeetingScheduled leads');
      const pipelineTenantColumn = getTenantColumnOrThrow(db, 'pipeline_history', tenantId, 'processMeetingScheduled pipeline history');
      const cadenceTenantColumn = getTenantColumnOrThrow(db, 'cadence_enrollments', tenantId, 'processMeetingScheduled cadence');

      const result = withTransaction(db, () => {
        // Find lead
        // tenant-guard: ignore (dynamic tenant column)
        const leadQuery = `
          SELECT id, stage_id FROM leads /* tenant-guard: ignore */
          WHERE ${leadTenantColumn} = ? AND (telefone = ? OR whatsapp = ?)
          LIMIT 1
        `;
        assertTenantScoped(leadQuery, [tenantId, contactId, contactId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads lookup (meeting)'
        });
        const lead = db.prepare(leadQuery).get(tenantId, contactId, contactId);

        if (!lead) {
          return { action: 'no_lead_found' };
        }

        const newStage = meetingType === 'triagem' ? 'stage_triagem_agendada' : 'stage_agendado';
        const previousStage = lead.stage_id;

        // Update lead
        // tenant-guard: ignore (dynamic tenant column)
        const updateSql = `
          UPDATE leads -- tenant-guard: ignore
          SET
            stage_id = ?,
            cadence_status = 'completed',
            meeting_calendar_id = ?,
            stage_entered_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = ? AND ${leadTenantColumn} = ?
        `;
        assertTenantScoped(updateSql, [newStage, meetingId, lead.id, tenantId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads update (meeting)'
        });
        db.prepare(updateSql).run(newStage, meetingId, lead.id, tenantId);

        // Stop cadence enrollment
        const cadenceSql = `
          UPDATE cadence_enrollments -- tenant-guard: ignore
          SET
            status = 'completed',
            completion_reason = 'Meeting scheduled',
            completed_at = datetime('now'),
            updated_at = datetime('now')
          WHERE lead_id = ? AND status IN ('active', 'responded') AND ${cadenceTenantColumn} = ?
        `;
        assertTenantScoped(cadenceSql, [lead.id, tenantId], {
          tenantId,
          tenantColumn: cadenceTenantColumn,
          operation: 'cadence_enrollments update (meeting)'
        });
        db.prepare(cadenceSql).run(lead.id, tenantId);

        // Log pipeline history
        let columns = [
          'id',
          'lead_id',
          'from_stage_id',
          'to_stage_id',
          'moved_by',
          'reason',
          'created_at'
        ];
        let values = [
          `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          lead.id,
          previousStage,
          newStage,
          'system',
          'Meeting scheduled',
          new Date().toISOString()
        ];
        ({ columns, values } = appendTenantColumns(db, 'pipeline_history', columns, values, tenantId));
        const placeholders = columns.map(() => '?').join(', ');
        // tenant-guard: ignore (dynamic tenant columns)
        const meetingPipelineSql = `
          INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
          VALUES (${placeholders})
        `;
        assertTenantScoped(meetingPipelineSql, values, {
          tenantId,
          tenantColumn: pipelineTenantColumn,
          operation: 'pipeline_history insert (meeting)'
        });
        db.prepare(meetingPipelineSql).run(...values);

        return {
          action: 'meeting_scheduled',
          leadId: lead.id,
          previousStage,
          newStage,
          meetingId
        };
      });

      this.stats.successfulTransactions++;

      log.success('[TXN] Meeting scheduled transaction completed', {
        contactId,
        result
      });

      return { success: true, ...result };

    } catch (error) {
      this.stats.failedTransactions++;
      this.stats.rolledBack++;

      log.error('[TXN] Meeting scheduled transaction failed', {
        contactId,
        error: error.message
      });

      return { success: false, error: error.message, rolledBack: true };
    }
  }

  /**
   * Process lead qualification (BANT score update) in a transaction
   *
   * @param {string} contactId - Phone number
   * @param {Object} bantData - BANT qualification data
   * @returns {Object} Transaction result
   */
  processQualification(contactId, bantData = {}) {
    this.stats.totalTransactions++;

    const {
      bantScore = 0,
      budget = null,
      authority = null,
      need = null,
      timing = null,
      tenantId = 'default'
    } = bantData;

    try {
      const db = getDatabase();
      const leadTenantColumn = getTenantColumnOrThrow(db, 'leads', tenantId, 'processQualification leads');
      const pipelineTenantColumn = getTenantColumnOrThrow(db, 'pipeline_history', tenantId, 'processQualification pipeline history');

      const result = withTransaction(db, () => {
        const leadQuery = `
          SELECT id, stage_id, bant_score FROM leads /* tenant-guard: ignore */
          WHERE ${leadTenantColumn} = ? AND (telefone = ? OR whatsapp = ?)
          LIMIT 1
        `;
        assertTenantScoped(leadQuery, [tenantId, contactId, contactId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads lookup (qualification)'
        });
        const lead = db.prepare(leadQuery).get(tenantId, contactId, contactId);

        if (!lead) {
          return { action: 'no_lead_found' };
        }

        const previousScore = lead.bant_score || 0;
        const previousStage = lead.stage_id;

        // Determine if lead qualifies (score >= 60)
        const isQualified = bantScore >= 60;
        const newStage = isQualified ? 'stage_qualificado' : lead.stage_id;

        // Update lead with BANT data
        const updateSql = `
          UPDATE leads -- tenant-guard: ignore
          SET
            bant_score = ?,
            bant_budget = COALESCE(?, bant_budget),
            bant_authority = COALESCE(?, bant_authority),
            bant_need = COALESCE(?, bant_need),
            bant_timing = COALESCE(?, bant_timing),
            stage_id = CASE
              WHEN ? >= 60 AND stage_id NOT IN ('stage_agendado', 'stage_triagem_agendada', 'stage_ganhou')
              THEN 'stage_qualificado'
              ELSE stage_id
            END,
            stage_entered_at = CASE
              WHEN ? >= 60 AND stage_id NOT IN ('stage_agendado', 'stage_triagem_agendada', 'stage_ganhou', 'stage_qualificado')
              THEN datetime('now')
              ELSE stage_entered_at
            END,
            updated_at = datetime('now')
          WHERE id = ? AND ${leadTenantColumn} = ?
        `;
        assertTenantScoped(updateSql, [bantScore, budget, authority, need, timing, bantScore, bantScore, lead.id, tenantId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'leads update (qualification)'
        });
        db.prepare(updateSql).run(bantScore, budget, authority, need, timing, bantScore, bantScore, lead.id, tenantId);

        // Log stage change if qualified
        if (isQualified && previousStage !== 'stage_qualificado') {
          let columns = [
            'id',
            'lead_id',
            'from_stage_id',
            'to_stage_id',
            'moved_by',
            'reason',
            'created_at'
          ];
          let values = [
            `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            lead.id,
            previousStage,
            'stage_qualificado',
            'system',
            'BANT qualification passed',
            new Date().toISOString()
          ];
          ({ columns, values } = appendTenantColumns(db, 'pipeline_history', columns, values, tenantId));
          const placeholders = columns.map(() => '?').join(', ');
          // tenant-guard: ignore (dynamic tenant columns)
          const qualificationPipelineSql = `
            INSERT INTO pipeline_history /* tenant-guard: ignore */ (${columns.join(', ')})
            VALUES (${placeholders})
          `;
          assertTenantScoped(qualificationPipelineSql, values, {
            tenantId,
            tenantColumn: pipelineTenantColumn,
            operation: 'pipeline_history insert (qualification)'
          });
          db.prepare(qualificationPipelineSql).run(...values);
        }

        return {
          action: isQualified ? 'qualified' : 'score_updated',
          leadId: lead.id,
          previousScore,
          newScore: bantScore,
          previousStage,
          newStage: isQualified ? 'stage_qualificado' : previousStage
        };
      });

      this.stats.successfulTransactions++;

      log.success('[TXN] Qualification transaction completed', {
        contactId,
        bantScore,
        result
      });

      return { success: true, ...result };

    } catch (error) {
      this.stats.failedTransactions++;
      this.stats.rolledBack++;

      log.error('[TXN] Qualification transaction failed', {
        contactId,
        error: error.message
      });

      return { success: false, error: error.message, rolledBack: true };
    }
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalTransactions > 0
        ? ((this.stats.successfulTransactions / this.stats.totalTransactions) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      rolledBack: 0
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get WebhookTransactionManager singleton
 * @returns {WebhookTransactionManager}
 */
export function getWebhookTransactionManager() {
  if (!instance) {
    instance = new WebhookTransactionManager();
  }
  return instance;
}

export default WebhookTransactionManager;
