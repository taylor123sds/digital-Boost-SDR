/**
 * @file index.js
 * @description Main export for the follow-up automation module
 * @module automation/followup
 *
 * @example
 * // Install all follow-up automations
 * import { installAllFollowups } from './followup/index.js';
 * const result = installAllFollowups();
 *
 * @example
 * // Get status
 * import { getFollowupStatus } from './followup/index.js';
 * const status = getFollowupStatus();
 *
 * @example
 * // Access stages directly
 * import { STAGE_D0, ALL_STAGES } from './followup/index.js';
 */

// Constants
export {
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
} from './constants.js';

// Templates
export {
  TEMPLATE_D0_COMPETING,
  TEMPLATE_D1_INVOICE,
  TEMPLATE_D3_SELF_DEPRECATING,
  getTemplateByStage,
  TEMPLATES
} from './templates.js';

// Builders
export {
  condition,
  olderThan,
  newerThan,
  equals,
  lessThan,
  notIn,
  sendWhatsApp,
  updateField,
  updateFieldWithNow,
  sendNotification,
  notifyInfo,
  log,
  scheduleTrigger,
  eventTrigger
} from './builders.js';

// Stages
export {
  STAGE_D0,
  STAGE_D1,
  STAGE_D3,
  STAGE_DISCARD,
  ALL_STAGES,
  getStageById,
  getStagesCount
} from './stages.js';

// Installer
export {
  installAllFollowups,
  uninstallAllFollowups,
  getFollowupStatus,
  reinstallFollowups
} from './installer.js';

// Default export with main functions
export default {
  // Installation
  installAllFollowups: (await import('./installer.js')).installAllFollowups,
  uninstallAllFollowups: (await import('./installer.js')).uninstallAllFollowups,
  getFollowupStatus: (await import('./installer.js')).getFollowupStatus,
  reinstallFollowups: (await import('./installer.js')).reinstallFollowups,

  // Stages
  ALL_STAGES: (await import('./stages.js')).ALL_STAGES,
  getStageById: (await import('./stages.js')).getStageById,

  // Constants
  FOLLOWUP_STAGES: (await import('./constants.js')).FOLLOWUP_STAGES,
  TIME_WINDOWS: (await import('./constants.js')).TIME_WINDOWS
};
