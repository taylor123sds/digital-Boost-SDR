/**
 * @file constants.js
 * @description Constants and enums for the follow-up automation system
 * @module automation/followup/constants
 */

/**
 * Follow-up stages enum
 * @readonly
 * @enum {number}
 */
export const FOLLOWUP_STAGES = {
  INITIAL: 0,
  D0_SENT: 1,
  D1_SENT: 2,
  D3_SENT: 3,
  DISCARDED: 4
};

/**
 * Lead status values
 * @readonly
 * @enum {string}
 */
export const LEAD_STATUS = {
  NEW: 'novo',
  CONTACTED: 'contatado',
  QUALIFIED: 'qualificado',
  CONVERTED: 'convertido',
  DISQUALIFIED: 'desqualificado',
  DISCARDED: 'descartado'
};

/**
 * Excluded statuses for follow-up processing
 * Leads with these statuses will not receive follow-ups
 * @readonly
 * @type {string[]}
 */
export const EXCLUDED_STATUSES = [
  LEAD_STATUS.CONVERTED,
  LEAD_STATUS.DISQUALIFIED,
  LEAD_STATUS.DISCARDED
];

/**
 * Notification types
 * @readonly
 * @enum {string}
 */
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Action types available in automations
 * @readonly
 * @enum {string}
 */
export const ACTION_TYPES = {
  SEND_WHATSAPP: 'send_whatsapp',
  UPDATE_FIELD: 'update_field',
  SEND_NOTIFICATION: 'send_notification',
  CREATE_TASK: 'create_task',
  LOG: 'log'
};

/**
 * Trigger types
 * @readonly
 * @enum {string}
 */
export const TRIGGER_TYPES = {
  SCHEDULE: 'schedule',
  EVENT: 'event'
};

/**
 * Condition operators
 * @readonly
 * @enum {string}
 */
export const OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  GREATER_OR_EQUAL: 'greater_or_equal',
  LESS_OR_EQUAL: 'less_or_equal',
  IN: 'in',
  NOT_IN: 'not_in',
  OLDER_THAN: 'older_than',
  NEWER_THAN: 'newer_than'
};

/**
 * Time windows for follow-up scheduling
 * @readonly
 * @type {Object}
 */
export const TIME_WINDOWS = {
  D0: {
    MIN_HOURS: 6,
    MAX_HOURS: 24,
    CRON: '0 18 * * *',
    DESCRIPTION: 'Same day, after 6 hours'
  },
  D1: {
    MIN_HOURS: 20,
    MAX_HOURS: 48,
    CRON: '0 10 * * *',
    DESCRIPTION: 'Next day, morning'
  },
  D3: {
    MIN_HOURS: 44,
    MAX_HOURS: 96,
    CRON: '0 14 * * *',
    DESCRIPTION: 'Day 3, afternoon'
  },
  DISCARD: {
    MIN_HOURS: 44,
    CRON: '0 9 * * *',
    DESCRIPTION: 'Day 5, morning cleanup'
  }
};

/**
 * Category for follow-up automations
 * @readonly
 * @type {string}
 */
export const FOLLOWUP_CATEGORY = 'follow_up';

/**
 * Dynamic template variables
 * @readonly
 * @type {Object}
 */
export const TEMPLATE_VARIABLES = {
  NAME: '{{nome}}',
  PAIN_SUMMARY: '{{dor_resumida}}',
  DESIRED_RESULT: '{{resultado_desejado}}',
  KEY_BENEFIT: '{{beneficio_chave}}',
  NOW: '{{now}}'
};

export default {
  FOLLOWUP_STAGES,
  LEAD_STATUS,
  EXCLUDED_STATUSES,
  NOTIFICATION_TYPES,
  ACTION_TYPES,
  TRIGGER_TYPES,
  OPERATORS,
  TIME_WINDOWS,
  FOLLOWUP_CATEGORY,
  TEMPLATE_VARIABLES
};
