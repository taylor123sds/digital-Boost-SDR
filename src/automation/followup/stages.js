/**
 * @file stages.js
 * @description Stage definitions for the follow-up automation system
 * @module automation/followup/stages
 */

import {
  FOLLOWUP_STAGES,
  EXCLUDED_STATUSES,
  TIME_WINDOWS,
  FOLLOWUP_CATEGORY,
  LEAD_STATUS,
  TEMPLATE_VARIABLES
} from './constants.js';

import {
  TEMPLATE_D0_COMPETING,
  TEMPLATE_D1_INVOICE,
  TEMPLATE_D3_SELF_DEPRECATING
} from './templates.js';

import {
  olderThan,
  newerThan,
  equals,
  lessThan,
  notIn,
  sendWhatsApp,
  updateField,
  updateFieldWithNow,
  notifyInfo,
  log,
  scheduleTrigger
} from './builders.js';

/**
 * @typedef {Object} StageDefinition
 * @property {string} id - Unique stage identifier
 * @property {string} name - Display name
 * @property {string} description - Stage description
 * @property {Object} trigger - Trigger configuration
 * @property {Array} conditions - Conditions for execution
 * @property {Array} actions - Actions to execute
 */

/**
 * D+0 Stage: First follow-up (same day, 6h+ after last contact)
 * @type {StageDefinition}
 */
export const STAGE_D0 = {
  id: 'followup_d0',
  name: 'Follow-up D+0 - Competindo com Notificações',
  description: 'Primeiro follow-up humorístico (6h+ após último contato)',
  category: FOLLOWUP_CATEGORY,
  trigger: scheduleTrigger(TIME_WINDOWS.D0.CRON),
  conditions: [
    olderThan('ultimo_contato', `${TIME_WINDOWS.D0.MIN_HOURS}h`),
    newerThan('ultimo_contato', `${TIME_WINDOWS.D0.MAX_HOURS}h`),
    notIn('status', EXCLUDED_STATUSES),
    lessThan('followup_stage', FOLLOWUP_STAGES.D0_SENT)
  ],
  actions: [
    sendWhatsApp(TEMPLATE_D0_COMPETING),
    updateField('followup_stage', FOLLOWUP_STAGES.D0_SENT),
    updateFieldWithNow('last_followup_date'),
    log(`Follow-up D+0 enviado para ${TEMPLATE_VARIABLES.NAME}`)
  ]
};

/**
 * D+1 Stage: Second follow-up (next day, 20-48h after D+0)
 * @type {StageDefinition}
 */
export const STAGE_D1 = {
  id: 'followup_d1',
  name: 'Follow-up D+1 - Boleto no Começo do Mês',
  description: 'Segundo follow-up com virada séria (24h após D+0)',
  category: FOLLOWUP_CATEGORY,
  trigger: scheduleTrigger(TIME_WINDOWS.D1.CRON),
  conditions: [
    olderThan('last_followup_date', `${TIME_WINDOWS.D1.MIN_HOURS}h`),
    newerThan('last_followup_date', `${TIME_WINDOWS.D1.MAX_HOURS}h`),
    equals('followup_stage', FOLLOWUP_STAGES.D0_SENT),
    notIn('status', EXCLUDED_STATUSES)
  ],
  actions: [
    sendWhatsApp(TEMPLATE_D1_INVOICE),
    updateField('followup_stage', FOLLOWUP_STAGES.D1_SENT),
    updateFieldWithNow('last_followup_date'),
    log(`Follow-up D+1 enviado para ${TEMPLATE_VARIABLES.NAME}`)
  ]
};

/**
 * D+3 Stage: Third and final follow-up (48h after D+1)
 * @type {StageDefinition}
 */
export const STAGE_D3 = {
  id: 'followup_d3',
  name: 'Follow-up D+3 - Auto-zoação de Vendedor',
  description: 'Último follow-up antes do descarte (48h após D+1)',
  category: FOLLOWUP_CATEGORY,
  trigger: scheduleTrigger(TIME_WINDOWS.D3.CRON),
  conditions: [
    olderThan('last_followup_date', `${TIME_WINDOWS.D3.MIN_HOURS}h`),
    newerThan('last_followup_date', `${TIME_WINDOWS.D3.MAX_HOURS}h`),
    equals('followup_stage', FOLLOWUP_STAGES.D1_SENT),
    notIn('status', EXCLUDED_STATUSES)
  ],
  actions: [
    sendWhatsApp(TEMPLATE_D3_SELF_DEPRECATING),
    updateField('followup_stage', FOLLOWUP_STAGES.D3_SENT),
    updateFieldWithNow('last_followup_date'),
    log(`Follow-up D+3 (último) enviado para ${TEMPLATE_VARIABLES.NAME}`)
  ]
};

/**
 * Discard Stage: Automatic discard after D+3 with no response
 * @type {StageDefinition}
 */
export const STAGE_DISCARD = {
  id: 'followup_discard',
  name: 'Descarte Automático - Sem Resposta',
  description: 'Descarta lead após ciclo completo sem resposta (48h após D+3)',
  category: FOLLOWUP_CATEGORY,
  trigger: scheduleTrigger(TIME_WINDOWS.DISCARD.CRON),
  conditions: [
    olderThan('last_followup_date', `${TIME_WINDOWS.DISCARD.MIN_HOURS}h`),
    equals('followup_stage', FOLLOWUP_STAGES.D3_SENT),
    notIn('status', EXCLUDED_STATUSES)
  ],
  actions: [
    updateField('status', LEAD_STATUS.DISCARDED),
    updateField('motivo_descarte', 'Sem resposta após 3 follow-ups (D+0, D+1, D+3)'),
    updateField('followup_stage', FOLLOWUP_STAGES.DISCARDED),
    notifyInfo(
      'Lead descartado automaticamente',
      `${TEMPLATE_VARIABLES.NAME} foi descartado após 3 follow-ups sem resposta`
    ),
    log(`Lead ${TEMPLATE_VARIABLES.NAME} descartado - ciclo completo sem resposta`)
  ]
};

/**
 * All follow-up stages in execution order
 * @type {StageDefinition[]}
 */
export const ALL_STAGES = [
  STAGE_D0,
  STAGE_D1,
  STAGE_D3,
  STAGE_DISCARD
];

/**
 * Get stage by identifier
 * @param {string} stageId - Stage identifier
 * @returns {StageDefinition|null} Stage definition or null
 */
export function getStageById(stageId) {
  return ALL_STAGES.find(stage => stage.id === stageId) || null;
}

/**
 * Get stages count
 * @returns {number} Number of stages
 */
export function getStagesCount() {
  return ALL_STAGES.length;
}

export default {
  STAGE_D0,
  STAGE_D1,
  STAGE_D3,
  STAGE_DISCARD,
  ALL_STAGES,
  getStageById,
  getStagesCount
};
