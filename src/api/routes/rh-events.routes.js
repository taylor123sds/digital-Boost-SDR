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

    // Get notification settings from agent config
    const agentConfig = JSON.parse(agent.config_json || '{}');
    const notificationConfig = agentConfig.notifications || {};

    // Use agent config if recipients not provided in request
    const finalChannels = {
      whatsapp: channels?.whatsapp ?? notificationConfig.whatsapp?.enabled ?? false,
      email: channels?.email ?? notificationConfig.email?.enabled ?? false
    };

    const finalRecipients = {
      whatsapp: recipients?.whatsapp || notificationConfig.whatsapp?.number || '',
      email: recipients?.email || notificationConfig.email?.address || ''
    };

    console.log('[RH-EVENTS] Using recipients:', {
      whatsapp: finalRecipients.whatsapp ? '***' + finalRecipients.whatsapp.slice(-4) : 'none',
      email: finalRecipients.email ? '***@' + finalRecipients.email.split('@')[1] : 'none',
      source: recipients?.whatsapp ? 'request' : 'agent_config'
    });

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
      JSON.stringify(finalChannels),
      JSON.stringify(finalRecipients),
      JSON.stringify(payload || {}),
      new Date().toISOString()
    );

    // Process notifications
    const results = { whatsapp: null, email: null };

    // Send WhatsApp if enabled
    if (finalChannels.whatsapp && finalRecipients.whatsapp) {
      console.log('[RH-EVENTS] Sending WhatsApp to:', finalRecipients.whatsapp);
      results.whatsapp = await sendWhatsApp(finalRecipients.whatsapp, message);
    }

    // Send Email if enabled
    if (finalChannels.email && finalRecipients.email) {
      console.log('[RH-EVENTS] Sending Email to:', finalRecipients.email);
      results.email = await sendEmail(finalRecipients.email, eventType, message);
    }

    // Update event status
    const success =
      (!finalChannels.whatsapp || results.whatsapp?.success) &&
      (!finalChannels.email || results.email?.success);

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
 * GET /api/rh-events/:agentPublicId/config
 * Ver configuração de notificações do agente
 */
router.get('/api/rh-events/:agentPublicId/config', async (req, res) => {
  try {
    const { agentPublicId } = req.params;
    const db = getDatabase();

    const agent = db.prepare(`
      SELECT id, name, config_json FROM agents
      WHERE json_extract(integrations, '$.webhook.publicId') = ?
         OR json_extract(config_json, '$.documentHandler.webhookPublicId') = ?
         OR id = ? OR id LIKE ?
    `).get(agentPublicId, agentPublicId, agentPublicId, `agent_${agentPublicId}%`);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const config = JSON.parse(agent.config_json || '{}');

    res.json({
      success: true,
      agentId: agent.id,
      agentName: agent.name,
      notifications: config.notifications || {
        whatsapp: { enabled: false, number: '' },
        email: { enabled: false, address: '' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/rh-events/:agentPublicId/config
 * Atualizar configuração de notificações do agente
 */
router.put('/api/rh-events/:agentPublicId/config', async (req, res) => {
  try {
    const { agentPublicId } = req.params;
    const { whatsapp, email } = req.body;
    const db = getDatabase();

    const agent = db.prepare(`
      SELECT id, name, config_json FROM agents
      WHERE json_extract(integrations, '$.webhook.publicId') = ?
         OR json_extract(config_json, '$.documentHandler.webhookPublicId') = ?
         OR id = ? OR id LIKE ?
    `).get(agentPublicId, agentPublicId, agentPublicId, `agent_${agentPublicId}%`);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const config = JSON.parse(agent.config_json || '{}');

    // Update notifications
    config.notifications = {
      whatsapp: {
        enabled: whatsapp?.enabled ?? config.notifications?.whatsapp?.enabled ?? false,
        number: whatsapp?.number ?? config.notifications?.whatsapp?.number ?? ''
      },
      email: {
        enabled: email?.enabled ?? config.notifications?.email?.enabled ?? false,
        address: email?.address ?? config.notifications?.email?.address ?? ''
      }
    };

    db.prepare('UPDATE agents SET config_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(config),
      new Date().toISOString(),
      agent.id
    );

    console.log('[RH-EVENTS] Config updated:', {
      agentId: agent.id,
      whatsapp: config.notifications.whatsapp.number ? '***' + config.notifications.whatsapp.number.slice(-4) : 'none',
      email: config.notifications.email.address || 'none'
    });

    res.json({
      success: true,
      message: 'Configuração atualizada',
      agentId: agent.id,
      notifications: config.notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
 * Send Email via SMTP (Gmail)
 */
async function sendEmail(emailTo, eventType, message) {
  try {
    const nodemailer = await import('nodemailer');

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || emailUser;
    const emailFromName = process.env.EMAIL_FROM_NAME || 'ORBION RH';

    if (!emailUser || !emailPass) {
      console.warn('[RH-EVENTS] Email not configured: EMAIL_USER or EMAIL_PASSWORD missing');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    // Create transporter with Gmail
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Format message for email (convert WhatsApp formatting)
    const htmlMessage = message
      .replace(/\n/g, '<br>')
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: emailTo,
      subject: `[${eventType}] Notificação RH - ORBION`,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #18c5ff;">📋 Notificação RH</h2>
            <p style="margin: 5px 0 0 0; color: #888;">Tipo: ${eventType}</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #18c5ff;">
              ${htmlMessage}
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">
              Enviado automaticamente pelo sistema ORBION
            </p>
          </div>
        </div>
      `
    };

    console.log('[RH-EVENTS] Sending email to:', emailTo);
    const info = await transporter.sendMail(mailOptions);
    console.log('[RH-EVENTS] Email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      to: emailTo
    };

  } catch (error) {
    console.error('[RH-EVENTS] Email error:', error.message);
    return { success: false, error: error.message };
  }
}

export default router;
