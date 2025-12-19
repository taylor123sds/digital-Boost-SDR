/**
 * @file IntegrationOAuthRefreshJob.js
 * @description Periodic refresh for CRM OAuth tokens
 */

import { getDatabase } from '../db/connection.js';
import { getIntegrationOAuthService } from './IntegrationOAuthService.js';
import logger from '../utils/logger.enhanced.js';

const CONFIG = {
  ENABLED: process.env.OAUTH_REFRESH_ENABLED !== 'false',
  INTERVAL_MS: parseInt(process.env.OAUTH_REFRESH_INTERVAL_MS, 10) || 15 * 60 * 1000,
  BATCH_SIZE: parseInt(process.env.OAUTH_REFRESH_BATCH_SIZE, 10) || 200
};

let jobInterval = null;
let isRunning = false;

async function refreshTokensBatch() {
  if (isRunning) {
    logger.warn('[OAUTH-REFRESH] Job already running, skipping');
    return;
  }

  isRunning = true;

  try {
    const db = getDatabase();
    const oauthService = getIntegrationOAuthService(logger);

    const integrations = db.prepare(`
      SELECT id, tenant_id, provider, config_json
      FROM integrations
      WHERE status = 'connected'
        AND json_extract(config_json, '$.oauth_tokens_encrypted') IS NOT NULL
      LIMIT ?
    `).all(CONFIG.BATCH_SIZE);

    if (integrations.length === 0) {
      return;
    }

    for (const integration of integrations) {
      const result = await oauthService.refreshTokensIfNeeded(integration);
      if (!result.success) {
        logger.debug('[OAUTH-REFRESH] Refresh skipped', {
          integrationId: integration.id,
          provider: integration.provider,
          reason: result.error
        });
      }
    }
  } catch (error) {
    logger.error('[OAUTH-REFRESH] Job error', { error: error.message });
  } finally {
    isRunning = false;
  }
}

export function startIntegrationOAuthRefreshJob() {
  if (!CONFIG.ENABLED) {
    logger.info('[OAUTH-REFRESH] Job disabled');
    return { success: false, disabled: true };
  }

  if (jobInterval) {
    logger.warn('[OAUTH-REFRESH] Job already running');
    return { success: false, error: 'Job already running' };
  }

  logger.info('[OAUTH-REFRESH] Starting job', { intervalMs: CONFIG.INTERVAL_MS });
  jobInterval = setInterval(refreshTokensBatch, CONFIG.INTERVAL_MS);

  refreshTokensBatch();

  return { success: true };
}

export function stopIntegrationOAuthRefreshJob() {
  if (!jobInterval) {
    return { success: false, error: 'Job not running' };
  }

  clearInterval(jobInterval);
  jobInterval = null;
  logger.info('[OAUTH-REFRESH] Job stopped');
  return { success: true };
}

export function getOAuthRefreshJobStatus() {
  return {
    enabled: CONFIG.ENABLED,
    isRunning: jobInterval !== null,
    intervalMs: CONFIG.INTERVAL_MS
  };
}

export default {
  startIntegrationOAuthRefreshJob,
  stopIntegrationOAuthRefreshJob,
  getOAuthRefreshJobStatus
};
