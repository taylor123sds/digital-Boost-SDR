/**
 * CORE TEMPLATES - Index
 * Exporta todos os templates core
 */

export {
  SYSTEM_TEMPLATE,
  compileSystemTemplate
} from './system.template.js';

export {
  SAFETY_TEMPLATE,
  OPT_OUT_TEMPLATE,
  LGPD_TEMPLATE,
  compileSafetyTemplate,
  detectOptOut,
  detectFraudIndicators
} from './safety.template.js';
