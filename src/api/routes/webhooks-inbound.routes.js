/**
 * @file webhooks-inbound.routes.js
 * @description Canonical inbound webhook handler for multi-tenant integrations
 *
 * CANONICAL FLOW (P0):
 * 1. Validate webhook (secret check)
 * 2. Stage in inbound_events table (idempotency)
 * 3. Create async_job for processing
 * 4. Worker picks up and processes
 *
 * This is the ONLY entry point for external webhooks.
 * /api/webhook/evolution is DEPRECATED.
 */

import express from 'express';
import crypto from 'crypto';
import { getIntegrationService } from '../../services/IntegrationService.js';
import { getInboundEventsService } from '../../services/InboundEventsService.js';
import { getAsyncJobsService, JobType, JobPriority } from '../../services/AsyncJobsService.js';

const router = express.Router();

/**
 * POST /api/webhooks/inbound/:webhookPublicId
 * Generic inbound webhook handler
 *
 * Validates webhook secret and routes to appropriate processor
 */
router.post('/api/webhooks/inbound/:webhookPublicId', async (req, res) => {
  const startTime = Date.now();
  const { webhookPublicId } = req.params;

  try {
    // Get webhook secret from header
    const providedSecret = req.headers['x-webhook-secret'];
    const signatureHeader = req.headers['x-webhook-signature'] || req.headers['x-signature'] || req.headers['x-hub-signature-256'];

    // Validate webhook
    const integrationService = getIntegrationService();
    const validation = integrationService.validateWebhook(webhookPublicId, providedSecret, {
      query: req.query,
      queryToken: req.query?.token || req.query?.webhook_token,
      signature: signatureHeader,
      rawBody: req.rawBody,
      headers: req.headers
    });

    if (!validation.valid) {
      console.warn('[WEBHOOK-INBOUND] Invalid webhook:', {
        webhookPublicId,
        error: validation.error,
        hasSecret: !!providedSecret
      });

      // Return 200 to avoid retries (but log the error)
      return res.status(200).json({
        received: true,
        valid: false,
        error: validation.error
      });
    }

    const integration = validation.integration;

    const inboundService = getInboundEventsService();
    const asyncJobsService = getAsyncJobsService();

    const { getDatabase } = await import('../../db/connection.js');
    const db = getDatabase();
    const intRecord = db.prepare('SELECT tenant_id FROM integrations WHERE id = ?').get(integration.id);
    const tenantId = intRecord?.tenant_id || 'default';

    const normalizedEvent = req.body?.event?.toLowerCase()?.replace(/_/g, '.') || 'unknown';
    const isLifecycleEvent = normalizedEvent === 'connection.update' || normalizedEvent === 'qrcode.updated';
    const providerEventId = isLifecycleEvent
      ? buildLifecycleEventId({
          provider: integration.provider,
          instanceName: integration.instance_name,
          event: normalizedEvent,
          state: req.body?.data?.state || req.body?.data?.instance?.state,
          qrcodeBase64: req.body?.data?.qrcode?.base64
        })
      : null;

    const stageResult = inboundService.stageWebhook(req.body, integration.provider, tenantId, {
      providerEventId
    });
    const contactPhone = inboundService.extractContactPhone(req.body);

    if (stageResult.isDuplicate) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        integrationId: integration.id,
        provider: integration.provider
      });
    }

    const isMessageEvent = normalizedEvent.startsWith('messages.');
    const priority = isMessageEvent ? JobPriority.HIGH : JobPriority.NORMAL;

    const job = asyncJobsService.enqueue(
      JobType.MESSAGE_PROCESS,
      {
        inboundEventId: stageResult.id,
        integrationId: integration.id,
        instanceName: integration.instance_name,
        tenantId,
        provider: integration.provider,
        payload: req.body
      },
      {
        tenantId,
        contactId: contactPhone,
        priority,
        maxRetries: 3,
        timeoutSeconds: 120
      }
    );

    console.log('[WEBHOOK-INBOUND] Enqueued job', {
      jobId: job.id,
      inboundEventId: stageResult.id,
      event: req.body?.event,
      provider: integration.provider,
      tenantId,
      durationMs: Date.now() - startTime
    });

    return res.status(200).json({
      received: true,
      timestamp: Date.now(),
      integrationId: integration.id,
      provider: integration.provider,
      jobId: job.id
    });

  } catch (error) {
    console.error('[WEBHOOK-INBOUND] Error:', error);

    // Still return 200 to avoid retries
    res.status(200).json({
      received: true,
      error: 'Internal error'
    });
  }
});

function buildLifecycleEventId({ provider, instanceName, event, state, qrcodeBase64 }) {
  const bucket = Math.floor(Date.now() / 15000); // 15s bucket to dedup rapid retries
  const qrHash = qrcodeBase64 ? crypto.createHash('sha256').update(qrcodeBase64).digest('hex').slice(0, 16) : '';
  const raw = [provider, instanceName, event, state, qrHash, bucket].filter(Boolean).join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export default router;
