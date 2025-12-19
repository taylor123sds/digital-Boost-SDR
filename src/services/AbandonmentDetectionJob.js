/**
 * @file AbandonmentDetectionJob.js
 * @description Job periódico para detectar conversas abandonadas
 *
 * Este job roda periodicamente e identifica conversas que foram
 * abandonadas (inatividade por X horas) para registrar no FeedbackLoop.
 */

import { getOutcomeTracker } from '../intelligence/ConversationOutcomeTracker.js';

// Configuração
const CONFIG = {
  // Intervalo de execução (1 hora)
  RUN_INTERVAL_MS: 60 * 60 * 1000,

  // Threshold de inatividade para considerar abandono (24 horas)
  INACTIVITY_THRESHOLD_HOURS: 24,

  // Habilitado por padrão
  ENABLED: true
};

let jobInterval = null;
let isRunning = false;

/**
 * Executa detecção de abandonos
 */
async function runDetection() {
  if (isRunning) {
    console.log(' [ABANDONMENT-JOB] Job já em execução, pulando...');
    return;
  }

  isRunning = true;
  console.log(' [ABANDONMENT-JOB] Iniciando detecção de abandonos...');

  try {
    const outcomeTracker = getOutcomeTracker();
    const result = await outcomeTracker.detectAbandonedConversations(
      CONFIG.INACTIVITY_THRESHOLD_HOURS
    );

    console.log(` [ABANDONMENT-JOB] Detecção completa:`, {
      detected: result.detected,
      recorded: result.recorded,
      error: result.error || null
    });

    return result;
  } catch (error) {
    console.error(' [ABANDONMENT-JOB] Erro na detecção:', error.message);
    return { detected: 0, recorded: 0, error: error.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia o job de detecção periódica
 */
export function startAbandonmentDetectionJob() {
  if (!CONFIG.ENABLED) {
    console.log(' [ABANDONMENT-JOB] Job desabilitado');
    return;
  }

  if (jobInterval) {
    console.log(' [ABANDONMENT-JOB] Job já está rodando');
    return;
  }

  console.log(` [ABANDONMENT-JOB] Iniciando job (intervalo: ${CONFIG.RUN_INTERVAL_MS / 1000 / 60} min)`);

  // Rodar imediatamente na primeira vez
  setTimeout(() => runDetection(), 5000); // Aguarda 5s para sistema inicializar

  // Agendar execuções periódicas
  jobInterval = setInterval(runDetection, CONFIG.RUN_INTERVAL_MS);
}

/**
 * Para o job de detecção
 */
export function stopAbandonmentDetectionJob() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log(' [ABANDONMENT-JOB] Job parado');
  }
}

/**
 * Executa detecção manualmente (para testes/admin)
 */
export async function runManualDetection(inactivityHours = CONFIG.INACTIVITY_THRESHOLD_HOURS) {
  console.log(` [ABANDONMENT-JOB] Execução manual (threshold: ${inactivityHours}h)`);

  const outcomeTracker = getOutcomeTracker();
  return await outcomeTracker.detectAbandonedConversations(inactivityHours);
}

/**
 * Retorna status do job
 */
export function getJobStatus() {
  return {
    enabled: CONFIG.ENABLED,
    running: !!jobInterval,
    isExecuting: isRunning,
    intervalMs: CONFIG.RUN_INTERVAL_MS,
    inactivityThresholdHours: CONFIG.INACTIVITY_THRESHOLD_HOURS
  };
}

export default {
  startAbandonmentDetectionJob,
  stopAbandonmentDetectionJob,
  runManualDetection,
  getJobStatus
};
