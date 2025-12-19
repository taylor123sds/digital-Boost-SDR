/**
 * @file builders.js
 * @description Builder functions for creating automation conditions and actions
 * @module automation/followup/builders
 */

import {
  ACTION_TYPES,
  OPERATORS,
  TRIGGER_TYPES,
  TEMPLATE_VARIABLES,
  NOTIFICATION_TYPES
} from './constants.js';

// ============================================
// CONDITION BUILDERS
// ============================================

/**
 * Creates a condition object
 * @param {string} field - Field name to check
 * @param {string} operator - Comparison operator
 * @param {*} value - Value to compare against
 * @returns {Object} Condition object
 */
export function condition(field, operator, value) {
  return { field, operator, value };
}

/**
 * Creates a time-based condition (older than X hours)
 * @param {string} field - Date field name
 * @param {string} duration - Duration string (e.g., '6h', '24h')
 * @returns {Object} Condition object
 */
export function olderThan(field, duration) {
  return condition(field, OPERATORS.OLDER_THAN, duration);
}

/**
 * Creates a time-based condition (newer than X hours)
 * @param {string} field - Date field name
 * @param {string} duration - Duration string (e.g., '6h', '24h')
 * @returns {Object} Condition object
 */
export function newerThan(field, duration) {
  return condition(field, OPERATORS.NEWER_THAN, duration);
}

/**
 * Creates an equality condition
 * @param {string} field - Field name
 * @param {*} value - Value to equal
 * @returns {Object} Condition object
 */
export function equals(field, value) {
  return condition(field, OPERATORS.EQUALS, value);
}

/**
 * Creates a less-than condition
 * @param {string} field - Field name
 * @param {number} value - Value to compare
 * @returns {Object} Condition object
 */
export function lessThan(field, value) {
  return condition(field, OPERATORS.LESS_THAN, value);
}

/**
 * Creates a not-in condition
 * @param {string} field - Field name
 * @param {Array} values - Values to exclude
 * @returns {Object} Condition object
 */
export function notIn(field, values) {
  return condition(field, OPERATORS.NOT_IN, values);
}

// ============================================
// ACTION BUILDERS
// ============================================

/**
 * Creates a WhatsApp send action
 * @param {string} template - Message template with variables
 * @returns {Object} Action object
 */
export function sendWhatsApp(template) {
  return {
    type: ACTION_TYPES.SEND_WHATSAPP,
    template
  };
}

/**
 * Creates a field update action with a specific value
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Object} Action object
 */
export function updateField(field, value) {
  return {
    type: ACTION_TYPES.UPDATE_FIELD,
    field,
    value
  };
}

/**
 * Creates a field update action with current timestamp
 * @param {string} field - Field name to update
 * @returns {Object} Action object
 */
export function updateFieldWithNow(field) {
  return updateField(field, TEMPLATE_VARIABLES.NOW);
}

/**
 * Creates a notification action
 * @param {string} type - Notification type (info, success, warning, error)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Object} Action object
 */
export function sendNotification(type, title, message) {
  return {
    type: ACTION_TYPES.SEND_NOTIFICATION,
    notification_type: type,
    title,
    message
  };
}

/**
 * Creates an info notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @returns {Object} Action object
 */
export function notifyInfo(title, message) {
  return sendNotification(NOTIFICATION_TYPES.INFO, title, message);
}

/**
 * Creates a log action
 * @param {string} message - Log message
 * @returns {Object} Action object
 */
export function log(message) {
  return {
    type: ACTION_TYPES.LOG,
    message
  };
}

// ============================================
// TRIGGER BUILDERS
// ============================================

/**
 * Creates a scheduled trigger
 * @param {string} cron - Cron expression
 * @param {string} target - Target entity type (leads, meetings)
 * @returns {Object} Trigger object
 */
export function scheduleTrigger(cron, target = 'leads') {
  return {
    type: TRIGGER_TYPES.SCHEDULE,
    cron,
    target
  };
}

/**
 * Creates an event-based trigger
 * @param {string} event - Event name
 * @param {string} target - Target entity type
 * @returns {Object} Trigger object
 */
export function eventTrigger(event, target = 'leads') {
  return {
    type: TRIGGER_TYPES.EVENT,
    event,
    target
  };
}

export default {
  // Conditions
  condition,
  olderThan,
  newerThan,
  equals,
  lessThan,
  notIn,
  // Actions
  sendWhatsApp,
  updateField,
  updateFieldWithNow,
  sendNotification,
  notifyInfo,
  log,
  // Triggers
  scheduleTrigger,
  eventTrigger
};
