/**
 * @file rh-events.routes.js
 * @description Endpoint para receber eventos de RH do sistema SGA
 *
 * Recebe eventos no formato SGA e envia notificações via:
 * - WhatsApp (Evolution API)
 * - Email (quando configurado)
 *
 * Eventos suportados:
 * - FERIAS, ATESTADO, ADMISSAO, DEMISSAO, REALOCACAO, SUBSTITUTO
 */

import express from 'express';
import crypto from 'crypto';
import { getDatabase } from '../../db/index.js';

const router = express.Router();

/**
 * POST /api/rh-events/:agentPublicId
 * Recebe eventos de RH do sistema SGA e envia para WhatsApp/Email
 */
router.post('/api/rh-events/:agentPublicId', async (req, res) => {
  const startTime = Date.now();
  const { agentPublicId } = req.params;
  const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;

  console.log('[RH-EVENTS] Received request:', {
    eventId,
    agentPublicId,
    body: JSON.stringify(req.body).slice(0, 200)
  });

  try {
    const { eventType, message, channels, recipients, payload } = req.body;

    // Validate required fields
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'eventType is required',
        validTypes: ['FERIAS', 'ATESTADO', 'ADMISSAO', 'DEMISSAO', 'REALOCACAO', 'SUBSTITUTO']
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    // Find agent by public ID
    const db = getDatabase();
    let agent = db.prepare(`
      SELECT id, name, type, config_json, integrations
      FROM agents
      WHERE json_extract(integrations, '$.webhook.publicId') = ?
         OR json_extract(config_json, '$.documentHandler.webhookPublicId') = ?
         OR id = ?
         OR id LIKE ?
    `).get(agentPublicId, agentPublicId, agentPublicId, `agent_${agentPublicId}%`);

    if (!agent) {
      console.warn('[RH-EVENTS] Agent not found:', agentPublicId);
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        providedId: agentPublicId
      });
    }

    console.log('[RH-EVENTS] Agent found:', { id: agent.id, name: agent.name });

    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS rh_events (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        tenant_id TEXT DEFAULT 'default',
        event_type TEXT NOT NULL,
        message TEXT,
        channels TEXT DEFAULT '{}',
        recipients TEXT DEFAULT '{}',
        payload TEXT DEFAULT '{}',
        status TEXT DEFAULT 'received',
        whatsapp_result TEXT,
        email_result TEXT,
        processed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Store event
    db.prepare(`
      INSERT INTO rh_events (id, agent_id, event_type, message, channels, recipients, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?)
    `).run(
      eventId,
      agent.id,
      eventType,
      message,
      JSON.stringify(channels || {}),
      JSON.stringify(recipients || {}),
      JSON.stringify(payload || {}),
      new Date().toISOString()
    );

    // Process notifications
    const results = { whatsapp: null, email: null };

    // Send WhatsApp if enabled
    if (channels?.whatsapp && recipients?.whatsapp) {
      console.log('[RH-EVENTS] Sending WhatsApp to:', recipients.whatsapp);
      results.whatsapp = await sendWhatsApp(recipients.whatsapp, message);
    }

    // Send Email if enabled
    if (channels?.email && recipients?.email) {
      console.log('[RH-EVENTS] Sending Email to:', recipients.email);
      results.email = await sendEmail(recipients.email, eventType, message);
    }

    // Update event status
    const success =
      (!channels?.whatsapp || results.whatsapp?.success) &&
      (!channels?.email || results.email?.success);

    db.prepare(`
      UPDATE rh_events
      SET status = ?, whatsapp_result = ?, email_result = ?, processed_at = ?
      WHERE id = ?
    `).run(
      success ? 'sent' : 'partial',
      JSON.stringify(results.whatsapp),
      JSON.stringify(results.email),
      new Date().toISOString(),
      eventId
    );

    const duration = Date.now() - startTime;

    console.log('[RH-EVENTS] Processed:', {
      eventId,
      eventType,
      duration: `${duration}ms`,
      whatsapp: results.whatsapp?.success ?? 'not_requested',
      email: results.email?.success ?? 'not_requested'
    });

    return res.status(200).json({
      success: true,
      eventId,
      eventType,
      agentId: agent.id,
      agentName: agent.name,
      notifications: {
        whatsapp: results.whatsapp,
        email: results.email
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('[RH-EVENTS] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      eventId
    });
  }
});

/**
 * GET /api/rh-events/:agentPublicId/history
 * Lista histórico de eventos
 */
router.get('/api/rh-events/:agentPublicId/history', async (req, res) => {
  try {
    const { agentPublicId } = req.params;
    const { limit = 50 } = req.query;
    const db = getDatabase();

    const agent = db.prepare(`
      SELECT id FROM agents
      WHERE json_extract(integrations, '$.webhook.publicId') = ?
         OR json_extract(config_json, '$.documentHandler.webhookPublicId') = ?
         OR id = ? OR id LIKE ?
    `).get(agentPublicId, agentPublicId, agentPublicId, `agent_${agentPublicId}%`);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const events = db.prepare(`
      SELECT * FROM rh_events
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(agent.id, parseInt(limit));

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SEND FUNCTIONS
// ============================================================================

/**
 * Send WhatsApp via Evolution API
 */
async function sendWhatsApp(phone, message) {
  try {
    const evolutionUrl = process.env.EVOLUTION_BASE_URL || 'http://evolution-api:8080';
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE || 'default';

    if (!evolutionKey) {
      return { success: false, error: 'EVOLUTION_API_KEY not configured' };
    }

    // Format phone (remove non-digits)
    const formattedPhone = phone.replace(/\D/g, '');

    console.log('[RH-EVENTS] Evolution API call:', {
      url: `${evolutionUrl}/message/sendText/${instanceName}`,
      phone: formattedPhone
    });

    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      console.error('[RH-EVENTS] Evolution error:', response.status, responseText);
      return {
        success: false,
        error: `Evolution API: ${response.status}`,
        details: result
      };
    }

    console.log('[RH-EVENTS] WhatsApp sent successfully:', result.key?.id || 'ok');

    return {
      success: true,
      messageId: result.key?.id,
      phone: formattedPhone
    };

  } catch (error) {
    console.error('[RH-EVENTS] WhatsApp error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Email (placeholder - configure nodemailer)
 */
async function sendEmail(email, eventType, message) {
  try {
    // TODO: Implement with nodemailer when email service is configured
    console.log('[RH-EVENTS] Email would be sent to:', email);

    return {
      success: true,
      note: 'Email logged (service not configured)',
      to: email,
      subject: `[${eventType}] Notificação RH`
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default router;
