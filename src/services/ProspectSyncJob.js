/**
 * @file ProspectSyncJob.js
 * @description Job de sincronização automática Sheet1  SQLite
 *
 * Roda periodicamente para importar novos leads da planilha
 * para a tabela prospect_leads no SQLite.
 *
 * Intervalo padrão: 30 minutos
 */

import cron from 'node-cron';
import { importLeadsFromSheets, getProspectStats } from './ProspectImportService.js';
import log from '../utils/logger-wrapper.js';

let syncJob = null;
let lastSyncResult = null;
let syncCount = 0;

/**
 * Executa sincronização manual
 */
export async function syncNow() {
  log.info('[PROSPECT-SYNC]  Iniciando sincronização manual...');

  try {
    const result = await importLeadsFromSheets({
      sheetName: 'Sheet1',
      skipExisting: true,
      updateExisting: false
    });

    lastSyncResult = {
      ...result,
      syncedAt: new Date().toISOString(),
      syncCount: ++syncCount
    };

    if (result.success) {
      log.info(`[PROSPECT-SYNC]  Sincronização concluída: ${result.stats.imported} novos, ${result.stats.duplicates} existentes`);
    } else {
      log.warn(`[PROSPECT-SYNC]  Sincronização com erro: ${result.error}`);
    }

    return lastSyncResult;

  } catch (error) {
    log.error(`[PROSPECT-SYNC]  Erro na sincronização: ${error.message}`);
    lastSyncResult = {
      success: false,
      error: error.message,
      syncedAt: new Date().toISOString(),
      syncCount: ++syncCount
    };
    return lastSyncResult;
  }
}

/**
 * Inicia o job de sincronização automática
 * @param {Object} options - Opções do job
 * @param {string} options.schedule - Cron schedule (padrão: a cada 30 min)
 * @param {boolean} options.runOnStart - Executar imediatamente ao iniciar
 */
export function startProspectSyncJob(options = {}) {
  const {
    schedule = '*/30 * * * *', // A cada 30 minutos
    runOnStart = true
  } = options;

  if (syncJob) {
    log.warn('[PROSPECT-SYNC] Job já está rodando');
    return { success: false, error: 'Job already running' };
  }

  log.info(`[PROSPECT-SYNC]  Iniciando job de sincronização (schedule: ${schedule})`);

  // Agendar job
  syncJob = cron.schedule(schedule, async () => {
    log.info('[PROSPECT-SYNC]  Executando sincronização automática...');
    await syncNow();
  }, {
    timezone: 'America/Sao_Paulo'
  });

  log.info('[PROSPECT-SYNC]  Job agendado com sucesso');

  // Executar imediatamente se configurado
  if (runOnStart) {
    log.info('[PROSPECT-SYNC]  Executando primeira sincronização...');
    syncNow().catch(err => {
      log.error('[PROSPECT-SYNC] Erro na sincronização inicial:', err.message);
    });
  }

  return { success: true, schedule };
}

/**
 * Para o job de sincronização
 */
export function stopProspectSyncJob() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    log.info('[PROSPECT-SYNC]  Job de sincronização parado');
    return { success: true };
  }
  return { success: false, error: 'Job not running' };
}

/**
 * Retorna status do job
 */
export function getProspectSyncStatus() {
  return {
    isRunning: syncJob !== null,
    lastSync: lastSyncResult,
    syncCount,
    stats: getProspectStats()
  };
}

export default {
  syncNow,
  startProspectSyncJob,
  stopProspectSyncJob,
  getProspectSyncStatus
};
