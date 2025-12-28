/**
 * @file TenantProfileService.js
 * @description Default profile schema + normalization utilities
 */

export const DEFAULT_TENANT_PROFILE = {
  version: 1,
  projectProfile: {
    name: '',
    domain: '',
    description: '',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  },
  compliance: {
    atestado: {
      requiredFields: ['employeeName', 'periodStart', 'periodEnd'],
      requiresReviewer: true
    },
    ferias: {
      requiredFields: ['employeeName', 'periodStart', 'periodEnd'],
      requiresReviewer: true
    }
  },
  channels: {
    email: {
      enabled: false,
      from: '',
      defaultRecipients: []
    },
    whatsapp: {
      enabled: false,
      defaultRecipients: [],
      sendDocuments: false
    }
  },
  agents: {
    documentReview: {
      enabled: true,
      model: 'gpt-4o-mini',
      promptHints: []
    },
    notification: {
      enabled: true,
      channelsPriority: ['email', 'whatsapp']
    }
  }
};

function mergeDeep(target, source) {
  if (!source || typeof source !== 'object') return target;
  const output = Array.isArray(target) ? [...target] : { ...target };

  Object.keys(source).forEach(key => {
    const value = source[key];
    if (Array.isArray(value)) {
      output[key] = value;
    } else if (value && typeof value === 'object') {
      output[key] = mergeDeep(target[key] || {}, value);
    } else if (value !== undefined) {
      output[key] = value;
    }
  });

  return output;
}

export function normalizeTenantProfile(profile) {
  return mergeDeep(DEFAULT_TENANT_PROFILE, profile || {});
}

export function normalizeIntegrations(integrations) {
  if (!Array.isArray(integrations)) return [];
  return integrations.map(item => ({
    id: item.id || '',
    type: item.type || '',
    provider: item.provider || '',
    baseUrl: item.baseUrl || '',
    auth: item.auth || {},
    capabilities: item.capabilities || [],
    mapping: item.mapping || {},
    probePaths: item.probePaths || [],
    lastDiagnosis: item.lastDiagnosis || null
  }));
}
