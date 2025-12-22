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
import { incrementInboundMetric } from '../../services/InboundPipelineMetrics.js';
import { processWebhook } from './webhook.routes.js';
import logger from '../../utils/logger.enhanced.js';

const router = express.Router();
const LEGACY_WEBHOOK_PIPELINE = process.env.LEGACY_WEBHOOK_PIPELINE === 'true';

function logInboundEvent(event, payload) {
  const record = {
    event,
    ...payload,
    timestamp: new Date().toISOString()
  };
  logger.info('[INBOUND]', record);
}

/**
 * POST /api/webhooks/inbound/:webhookPublicId
 * Generic inbound webhook handler
 *
 * Validates webhook secret and routes to appropriate processor
 */
router.post('/api/webhooks/inbound/:webhookPublicId', async (req, res) => {
  const startTime = Date.now();
  const { webhookPublicId } = req.params;
  const correlationId = crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex');

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

    const tenantId = integration?.tenant_id || 'default';

    const rawEvent = req.body?.event;
    const normalizedEvent = rawEvent?.toLowerCase()?.replace(/_/g, '.') || 'unknown';
    const normalizedPayload = normalizeInboundPayload(req.body, normalizedEvent);
    if (rawEvent && rawEvent !== normalizedEvent) {
      console.log('[WEBHOOK-INBOUND] Normalized event', {
        rawEvent,
        normalizedEvent
      });
    }
    if (Array.isArray(req.body?.data)) {
      console.log('[WEBHOOK-INBOUND] Normalized array payload', {
        normalizedEvent,
        dataLength: req.body.data.length
      });
    }
    const isLifecycleEvent = normalizedEvent === 'connection.update' || normalizedEvent === 'qrcode.updated';
    const providerEventId = isLifecycleEvent
      ? buildLifecycleEventId({
          provider: integration.provider,
          instanceName: integration.instance_name,
          event: normalizedEvent,
          state: normalizedPayload?.data?.state || normalizedPayload?.data?.instance?.state,
          qrcodeBase64: normalizedPayload?.data?.qrcode?.base64
        })
      : inboundService.extractProviderEventId(normalizedPayload);
    const contactPhone = inboundService.extractContactPhone(normalizedPayload);

    incrementInboundMetric('inbound_received');
    logInboundEvent('inbound_received', {
      tenantId,
      integrationId: integration.id,
      provider_event_id: providerEventId,
      correlation_id: correlationId,
      event: normalizedEvent
    });

    if (LEGACY_WEBHOOK_PIPELINE) {
      try {
        console.warn('[WEBHOOK-INBOUND] LEGACY_WEBHOOK_PIPELINE enabled - processing inline');
        await processWebhook(normalizedPayload, null, {
          integrationId: integration.id,
          instanceName: integration.instance_name,
          tenantId,
          provider: integration.provider,
          providerEventId,
          correlationId
        });

        incrementInboundMetric('job_processed_ok');
        logInboundEvent('job_processed_ok', {
          tenantId,
          integrationId: integration.id,
          provider_event_id: providerEventId,
          correlation_id: correlationId,
          event: normalizedEvent,
          duration_ms: Date.now() - startTime
        });

        return res.status(200).json({
          received: true,
          processed: true,
          timestamp: Date.now(),
          integrationId: integration.id,
          provider: integration.provider,
          correlationId
        });
      } catch (error) {
        incrementInboundMetric('job_failed');
        logInboundEvent('job_failed', {
          tenantId,
          integrationId: integration.id,
          provider_event_id: providerEventId,
          correlation_id: correlationId,
          event: normalizedEvent,
          error: error.message,
          duration_ms: Date.now() - startTime
        });

        return res.status(200).json({
          received: true,
          error: 'Internal error',
          correlationId
        });
      }
    }

    const stageResult = inboundService.stageWebhook(normalizedPayload, integration.provider, tenantId, {
      providerEventId
    });
    incrementInboundMetric('inbound_staged');
    logInboundEvent('inbound_staged', {
      tenantId,
      integrationId: integration.id,
      provider_event_id: providerEventId,
      correlation_id: correlationId,
      event: normalizedEvent
    });

    if (stageResult.isDuplicate) {
      incrementInboundMetric('dedup_dropped');
      logInboundEvent('dedup_dropped', {
        tenantId,
        integrationId: integration.id,
        provider_event_id: providerEventId,
        correlation_id: correlationId,
        event: normalizedEvent
      });
      return res.status(200).json({
        received: true,
        duplicate: true,
        integrationId: integration.id,
        provider: integration.provider,
        correlationId
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
        providerEventId,
        correlationId,
        payload: normalizedPayload
      },
      {
        tenantId,
        contactId: contactPhone,
        priority,
        maxRetries: 3,
        timeoutSeconds: 120
      }
    );
    incrementInboundMetric('job_enqueued');
    logInboundEvent('job_enqueued', {
      tenantId,
      integrationId: integration.id,
      provider_event_id: providerEventId,
      job_id: job.id,
      correlation_id: correlationId,
      event: normalizedEvent,
      duration_ms: Date.now() - startTime
    });

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
      jobId: job.id,
      correlationId
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

function normalizeInboundPayload(payload, normalizedEvent) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const normalized = { ...payload };
  if (normalizedEvent) {
    normalized.event = normalizedEvent;
  }

  if (Array.isArray(normalized.data)) {
    normalized.data = normalized.data[0] || {};
  }

  return normalized;
}

export default router;
