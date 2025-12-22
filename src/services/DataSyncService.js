/**
 * @file DataSyncService.js
 * @description Serviço de sincronização de dados entre tabelas
 *
 * Responsabilidades:
 * 1. Manter consistência entre prospect_leads, leads e cadence_enrollments
 * 2. Executar jobs de sincronização automática (noturno)
 * 3. Corrigir inconsistências detectadas
 * 4. Retry de ações de cadência falhadas
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import cron from 'node-cron';
import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';

let instance = null;

class DataSyncService {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;

    this.isRunning = false;
    this.lastSync = null;
    this.stats = {
      totalSyncs: 0,
      enrollmentsCreated: 0,
      leadsFixed: 0,
      prospectsUpdated: 0,
      actionsRetried: 0,
      errors: 0
    };

    this.scheduledJobs = [];

    log.info('[DATA-SYNC] Service initialized');
  }

  /**
   * Inicializa os jobs de sincronização
   */
  initialize() {
    log.info('[DATA-SYNC] Scheduling automatic sync jobs...');

    // Job noturno às 2h da manhã - sincronização completa
    const nightlyJob = cron.schedule('0 2 * * *', async () => {
      log.info('[DATA-SYNC]  Starting nightly sync job...');
      await this.runFullSync();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.scheduledJobs.push(nightlyJob);

    // Job a cada 6 horas - sincronização rápida
    const quickSyncJob = cron.schedule('0 */6 * * *', async () => {
      log.info('[DATA-SYNC]  Starting quick sync...');
      await this.runQuickSync();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.scheduledJobs.push(quickSyncJob);

    // Job a cada hora - retry de ações falhadas
    const retryJob = cron.schedule('30 * * * *', async () => {
      log.info('[DATA-SYNC]  Retrying failed cadence actions...');
      await this.retryFailedActions();
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.scheduledJobs.push(retryJob);

    log.info('[DATA-SYNC]  Jobs scheduled: nightly (2h), quick (every 6h), retry (every hour)');

    return this;
  }

  /**
   * Sincronização completa - roda à noite
   */
  async runFullSync() {
    if (this.isRunning) {
      log.warn('[DATA-SYNC] Sync already running, skipping...');
      return { success: false, reason: 'already_running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    const results = {
      enrollmentsCreated: 0,
      leadsFixed: 0,
      prospectsUpdated: 0,
      duplicatesRemoved: 0,
      orphansFixed: 0,
      errors: []
    };

    try {
      const db = getDatabase();

      // 1. Criar enrollments para leads em cadência sem enrollment
      log.info('[DATA-SYNC] Step 1: Checking leads without enrollments...');
      const leadsWithoutEnrollment = db.prepare(`
        SELECT l.id, l.telefone, l.empresa
        FROM leads l
        WHERE l.stage_id = 'stage_em_cadencia'
        AND l.cadence_status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM cadence_enrollments ce
          WHERE ce.lead_id = l.id AND ce.status = 'active'
        )
      `).all();

      for (const lead of leadsWithoutEnrollment) {
        try {
          const enrollmentId = `enr_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          db.prepare(`
            INSERT INTO cadence_enrollments (
              id, cadence_id, lead_id, status, current_day, enrolled_by,
              started_at, created_at
            ) VALUES (?, 'cadence_outbound_solar_15d', ?, 'active', 1, 'data_sync', datetime('now'), datetime('now'))
          `).run(enrollmentId, lead.id);

          //  FIX: Registrar D1 como já enviado para evitar duplicação
          // Buscar step D1 e marcar como sent
          const stepD1 = db.prepare(`
            SELECT id FROM cadence_steps
            WHERE cadence_id = 'cadence_outbound_solar_15d' AND day = 1 AND channel = 'whatsapp'
            LIMIT 1
          `).get();

          if (stepD1) {
            const actionId = `act_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            db.prepare(`
              INSERT INTO cadence_actions_log
                (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at)
              VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'D1 marcado como enviado por data_sync', datetime('now'))
            `).run(actionId, enrollmentId, stepD1.id, lead.id);
          }

          results.enrollmentsCreated++;
          log.info(`[DATA-SYNC] Created enrollment for lead ${lead.empresa} (D1 marked as sent)`);
        } catch (err) {
          results.errors.push({ type: 'enrollment', lead: lead.id, error: err.message });
        }
      }

      // 2. Atualizar prospect_leads com status 'enviado' para leads que existem
      log.info('[DATA-SYNC] Step 2: Syncing prospect_leads status...');
      const prospectsToUpdate = db.prepare(`
        SELECT p.id, p.telefone_normalizado
        FROM prospect_leads p
        WHERE p.status = 'pendente'
        AND EXISTS (
          SELECT 1 FROM leads l
          WHERE l.telefone = p.telefone_normalizado
        )
      `).all();

      for (const prospect of prospectsToUpdate) {
        try {
          db.prepare(`
            UPDATE prospect_leads
            SET status = 'enviado', processado_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
          `).run(prospect.id);

          results.prospectsUpdated++;
        } catch (err) {
          results.errors.push({ type: 'prospect', id: prospect.id, error: err.message });
        }
      }

      // 3. Criar leads para prospects 'enviado' sem lead correspondente
      log.info('[DATA-SYNC] Step 3: Creating missing leads for sent prospects...');
      const orphanedProspects = db.prepare(`
        SELECT p.*
        FROM prospect_leads p
        WHERE p.status = 'enviado'
        AND NOT EXISTS (
          SELECT 1 FROM leads l
          WHERE l.telefone = p.telefone_normalizado
        )
      `).all();

      for (const prospect of orphanedProspects) {
        try {
          const leadId = `lead_${prospect.telefone_normalizado}`;

          db.prepare(`
            INSERT INTO leads (
              id, nome, empresa, telefone, whatsapp, email, cidade,
              origem, pipeline_id, stage_id, cadence_status, cadence_day,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'prospecção_automática', 'pipeline_outbound_solar',
              'stage_em_cadencia', 'active', 1, datetime('now'), datetime('now'))
          `).run(
            leadId,
            prospect.empresa || prospect.nome,
            prospect.empresa,
            prospect.telefone_normalizado,
            prospect.telefone_normalizado,
            prospect.email,
            prospect.cidade
          );

          // Criar enrollment também
          const enrollmentId = `enr_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          db.prepare(`
            INSERT INTO cadence_enrollments (
              id, cadence_id, lead_id, status, current_day, enrolled_by,
              started_at, created_at
            ) VALUES (?, 'cadence_outbound_solar_15d', ?, 'active', 1, 'data_sync', datetime('now'), datetime('now'))
          `).run(enrollmentId, leadId);

          //  FIX: Registrar D1 como já enviado (prospect já recebeu mensagem do ProspectingEngine)
          const stepD1 = db.prepare(`
            SELECT id FROM cadence_steps
            WHERE cadence_id = 'cadence_outbound_solar_15d' AND day = 1 AND channel = 'whatsapp'
            LIMIT 1
          `).get();

          if (stepD1) {
            const actionId = `act_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            db.prepare(`
              INSERT INTO cadence_actions_log
                (id, enrollment_id, step_id, lead_id, action_type, channel, day, status, content_sent, executed_at)
              VALUES (?, ?, ?, ?, 'send_message', 'whatsapp', 1, 'sent', 'D1 enviado pelo ProspectingEngine', datetime('now'))
            `).run(actionId, enrollmentId, stepD1.id, leadId);
          }

          results.orphansFixed++;
          log.info(`[DATA-SYNC] Created lead and enrollment for orphaned prospect ${prospect.empresa} (D1 marked as sent)`);
        } catch (err) {
          results.errors.push({ type: 'orphan', prospect: prospect.id, error: err.message });
        }
      }

      // 4. Corrigir leads com stage_id inconsistente com cadence_status
      log.info('[DATA-SYNC] Step 4: Fixing stage/status inconsistencies...');

      // Leads com stage_em_cadencia mas cadence_status != active
      const inconsistentLeads = db.prepare(`
        UPDATE leads
        SET cadence_status = 'active'
        WHERE stage_id = 'stage_em_cadencia' AND cadence_status != 'active'
      `).run();

      results.leadsFixed += inconsistentLeads.changes;

      // Leads com cadence_status = responded mas stage != respondeu
      db.prepare(`
        UPDATE leads
        SET stage_id = 'stage_respondeu'
        WHERE cadence_status = 'responded' AND stage_id = 'stage_em_cadencia'
      `).run();

      // 5. Remover duplicatas em prospect_leads
      log.info('[DATA-SYNC] Step 5: Checking for duplicates...');
      const duplicates = db.prepare(`
        SELECT telefone_normalizado, COUNT(*) as count
        FROM prospect_leads
        GROUP BY telefone_normalizado
        HAVING count > 1
      `).all();

      for (const dup of duplicates) {
        // Manter apenas o mais recente
        db.prepare(`
          DELETE FROM prospect_leads
          WHERE telefone_normalizado = ?
          AND id NOT IN (
            SELECT id FROM prospect_leads
            WHERE telefone_normalizado = ?
            ORDER BY created_at DESC
            LIMIT 1
          )
        `).run(dup.telefone_normalizado, dup.telefone_normalizado);

        results.duplicatesRemoved++;
      }

      const duration = Date.now() - startTime;
      this.lastSync = new Date().toISOString();
      this.stats.totalSyncs++;
      this.stats.enrollmentsCreated += results.enrollmentsCreated;
      this.stats.leadsFixed += results.leadsFixed;
      this.stats.prospectsUpdated += results.prospectsUpdated;

      log.success(`[DATA-SYNC]  Full sync completed in ${duration}ms`, results);

      return { success: true, results, duration };

    } catch (error) {
      log.error('[DATA-SYNC]  Full sync failed', { error: error.message });
      this.stats.errors++;
      return { success: false, error: error.message };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sincronização rápida - apenas verifica inconsistências críticas
   */
  async runQuickSync() {
    const db = getDatabase();

    try {
      // Apenas contar inconsistências
      const stats = {
        leadsWithoutEnrollment: db.prepare(`
          SELECT COUNT(*) as count FROM leads l
          WHERE l.stage_id = 'stage_em_cadencia' AND l.cadence_status = 'active'
          AND NOT EXISTS (SELECT 1 FROM cadence_enrollments ce WHERE ce.lead_id = l.id AND ce.status = 'active')
        `).get().count,

        orphanedProspects: db.prepare(`
          SELECT COUNT(*) as count FROM prospect_leads p
          WHERE p.status = 'enviado'
          AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado)
        `).get().count,

        pendingProspectsInLeads: db.prepare(`
          SELECT COUNT(*) as count FROM prospect_leads p
          WHERE p.status = 'pendente'
          AND EXISTS (SELECT 1 FROM leads l WHERE l.telefone = p.telefone_normalizado)
        `).get().count
      };

      const hasIssues = Object.values(stats).some(v => v > 0);

      if (hasIssues) {
        log.warn('[DATA-SYNC]  Quick sync found inconsistencies', stats);
        // Rodar full sync se encontrar problemas
        await this.runFullSync();
      } else {
        log.info('[DATA-SYNC]  Quick sync: no issues found');
      }

      return { success: true, hasIssues, stats };

    } catch (error) {
      log.error('[DATA-SYNC] Quick sync error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry de ações de cadência falhadas
   */
  async retryFailedActions() {
    const db = getDatabase();

    try {
      // Buscar ações falhadas das últimas 24h que não foram retentadas mais de 3 vezes
      const failedActions = db.prepare(`
        SELECT cal.*, l.telefone, l.empresa
        FROM cadence_actions_log cal
        JOIN cadence_enrollments ce ON cal.enrollment_id = ce.id
        JOIN leads l ON ce.lead_id = l.id
        WHERE cal.status = 'failed'
        AND cal.executed_at >= datetime('now', '-24 hours')
        AND ce.status = 'active'
        AND (cal.retry_count IS NULL OR cal.retry_count < 3)
      `).all();

      log.info(`[DATA-SYNC] Found ${failedActions.length} failed actions to retry`);

      let retried = 0;
      let succeeded = 0;

      for (const action of failedActions) {
        try {
          // Importar função de envio
          const { sendWhatsAppText } = await import('./whatsappAdapterProvider.js');

          // Tentar reenviar
          const result = await sendWhatsAppText(action.telefone, action.content_sent);

          if (result && !result.error) {
            // Sucesso - atualizar status
            db.prepare(`
              UPDATE cadence_actions_log
              SET status = 'sent',
                  executed_at = datetime('now'),
                  retry_count = COALESCE(retry_count, 0) + 1,
                  error_message = NULL
              WHERE id = ?
            `).run(action.id);

            succeeded++;
            log.info(`[DATA-SYNC]  Retry succeeded for ${action.empresa}`);
          } else {
            // Falhou novamente
            db.prepare(`
              UPDATE cadence_actions_log
              SET retry_count = COALESCE(retry_count, 0) + 1,
                  error_message = ?
              WHERE id = ?
            `).run(result?.error || 'Unknown error', action.id);
          }

          retried++;

          // Rate limit entre retries
          await new Promise(r => setTimeout(r, 5000));

        } catch (err) {
          log.error(`[DATA-SYNC] Retry failed for action ${action.id}`, { error: err.message });
        }
      }

      this.stats.actionsRetried += retried;

      log.info(`[DATA-SYNC] Retry complete: ${succeeded}/${retried} succeeded`);

      return { success: true, retried, succeeded };

    } catch (error) {
      log.error('[DATA-SYNC] Retry job error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter estatísticas do serviço
   */
  getStats() {
    return {
      ...this.stats,
      lastSync: this.lastSync,
      isRunning: this.isRunning,
      scheduledJobs: this.scheduledJobs.length
    };
  }

  /**
   * Parar todos os jobs
   */
  stop() {
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    log.info('[DATA-SYNC] Service stopped');
  }
}

export function getDataSyncService() {
  if (!instance) {
    instance = new DataSyncService();
  }
  return instance;
}

export default DataSyncService;
