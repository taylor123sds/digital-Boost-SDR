/**
 * @file tenant-profile.routes.js
 * @description Tenant profile + integration diagnostics endpoints
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { authenticate } from '../../middleware/auth.middleware.js';
import { tenantContext, requireTenant } from '../../middleware/tenant.middleware.js';
import { tenantProfileRepository } from '../../repositories/tenantProfile.repository.js';
import { normalizeTenantProfile, normalizeIntegrations } from '../../services/TenantProfileService.js';
import { diagnoseIntegration } from '../../services/IntegrationDiagnosticsService.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const logger = defaultLogger.child({ module: 'TenantProfileRoutes' });

function mergeIntegration(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    auth: incoming.auth || existing.auth || {},
    capabilities: incoming.capabilities || existing.capabilities || [],
    mapping: incoming.mapping || existing.mapping || {},
    probePaths: incoming.probePaths || existing.probePaths || []
  };
}

function upsertIntegrationList(integrations, incoming) {
  const list = Array.isArray(integrations) ? [...integrations] : [];
  const incomingId = incoming.id;
  const matchIndex = list.findIndex(item => {
    if (incomingId && item.id === incomingId) return true;
    if (!incomingId && item.provider && incoming.baseUrl) {
      return item.provider === incoming.provider && item.baseUrl === incoming.baseUrl;
    }
    return false;
  });

  if (matchIndex >= 0) {
    list[matchIndex] = mergeIntegration(list[matchIndex], incoming);
    return list;
  }

  list.push({
    ...incoming,
    id: incoming.id || `integration_${randomUUID()}`
  });

  return list;
}

/**
 * GET /api/tenant-profile
 * Retorna o perfil do tenant (defaults aplicados)
 */
router.get('/api/tenant-profile', authenticate, tenantContext, requireTenant, (req, res) => {
  try {
    const tenantId = req.tenantId;
    const record = tenantProfileRepository.getByTenant(tenantId);

    const profile = normalizeTenantProfile(record?.profile || {});
    const integrations = normalizeIntegrations(record?.integrations || []);

    res.json({
      success: true,
      data: {
        tenantId,
        profile,
        integrations
      }
    });
  } catch (error) {
    logger.error('Failed to load tenant profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao carregar perfil do tenant' });
  }
});

/**
 * PUT /api/tenant-profile
 * Atualiza o perfil do tenant
 */
router.put('/api/tenant-profile', authenticate, tenantContext, requireTenant, (req, res) => {
  try {
    const tenantId = req.tenantId;
    const payload = req.body || {};
    const rawProfile = payload.profile || payload;
    const profileInput = { ...(rawProfile || {}) };

    let integrationsInput = Array.isArray(payload.integrations) ? payload.integrations : null;
    if (!integrationsInput && Array.isArray(profileInput.integrations)) {
      integrationsInput = profileInput.integrations;
    }
    delete profileInput.integrations;

    const normalizedProfile = normalizeTenantProfile(profileInput);
    const normalizedIntegrations = normalizeIntegrations(integrationsInput || []);

    const saved = tenantProfileRepository.upsert(
      tenantId,
      normalizedProfile,
      normalizedIntegrations
    );

    res.json({
      success: true,
      data: {
        tenantId,
        profile: normalizeTenantProfile(saved.profile),
        integrations: normalizeIntegrations(saved.integrations)
      }
    });
  } catch (error) {
    logger.error('Failed to update tenant profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao salvar perfil do tenant' });
  }
});

/**
 * POST /api/tenant-profile/diagnose
 * Diagnostico de integracao
 */
router.post('/api/tenant-profile/diagnose', authenticate, tenantContext, requireTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { integration, save = false } = req.body || {};

    if (!integration || !integration.baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'integration.baseUrl obrigatorio'
      });
    }

    const result = await diagnoseIntegration(integration);
    const diagnosis = {
      ...result,
      diagnosedAt: new Date().toISOString()
    };

    if (save) {
      const record = tenantProfileRepository.getByTenant(tenantId);
      const profile = normalizeTenantProfile(record?.profile || {});
      const integrations = normalizeIntegrations(record?.integrations || []);
      const updated = upsertIntegrationList(integrations, {
        ...integration,
        lastDiagnosis: diagnosis
      });

      tenantProfileRepository.upsert(tenantId, profile, updated);
    }

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    logger.error('Failed to diagnose integration', { error: error.message });
    res.status(500).json({ success: false, error: 'Erro ao diagnosticar integracao' });
  }
});

export default router;
