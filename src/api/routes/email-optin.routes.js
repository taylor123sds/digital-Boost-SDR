/**
 * @file email-optin.routes.js
 * @description Rotas para gerenciamento de Email Opt-In
 *
 * FLUXO:
 * 1. POST /api/email-optin/import - Importar leads do instagram-automation
 * 2. GET /api/email-optin/status - Status do EmailOptInEngine
 * 3. POST /api/email-optin/start - Iniciar envio de emails
 * 4. POST /api/email-optin/stop - Parar envio de emails
 * 5. GET /api/email-optin/stats - Estatisticas de opt-ins
 * 6. POST /api/email-optin/send-single - Enviar email para um lead especifico
 */

import express from 'express';
import { getEmailOptInEngine } from '../../automation/EmailOptInEngine.js';
import { getDatabase } from '../../db/index.js';
import { normalizePhone } from '../../utils/phone_normalizer.js';
import { extractTenantId, getTenantColumnForTable } from '../../utils/tenantCompat.js';

const router = express.Router();

function getTenantFilters(db, tableName, tenantId, alias) {
  const tenantColumn = getTenantColumnForTable(tableName, db);
  const qualifiedColumn = tenantColumn ? (alias ? `${alias}.${tenantColumn}` : tenantColumn) : null;
  return {
    tenantColumn,
    tenantWhere: qualifiedColumn ? `WHERE ${qualifiedColumn} = ?` : '',
    tenantAnd: qualifiedColumn ? `AND ${qualifiedColumn} = ?` : '',
    tenantParam: tenantColumn ? [tenantId] : []
  };
}

/**
 * GET /api/email-optin/status
 * Retorna status atual do EmailOptInEngine
 */
router.get('/api/email-optin/status', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    res.json({
      success: true,
      ...engine.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email-optin/stats
 * Retorna estatisticas detalhadas
 */
router.get('/api/email-optin/stats', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    res.json({
      success: true,
      stats: engine.getStats(),
      metrics: engine.getMetrics()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/start
 * Inicia o EmailOptInEngine
 */
router.post('/api/email-optin/start', async (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    const config = req.body.config || {};

    const result = await engine.start({ config });

    res.json({
      success: result.success,
      message: result.success ? 'Email Opt-In Engine iniciado' : result.error,
      queueSize: result.queueSize
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/stop
 * Para o EmailOptInEngine
 */
router.post('/api/email-optin/stop', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    const result = engine.stop();

    res.json({
      success: result.success,
      message: result.success ? 'Email Opt-In Engine parado' : result.error,
      metrics: result.metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/pause
 * Pausa o EmailOptInEngine
 */
router.post('/api/email-optin/pause', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    const result = engine.pause();

    res.json({
      success: result.success,
      message: result.success ? 'Email Opt-In Engine pausado' : result.error
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/resume
 * Resume o EmailOptInEngine
 */
router.post('/api/email-optin/resume', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    const result = engine.resume();

    res.json({
      success: result.success,
      message: result.success ? 'Email Opt-In Engine resumido' : result.error
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/import
 * Importa leads de uma fonte externa (ex: instagram-automation)
 *
 * Body: { leads: [{ telefone, email, nome, empresa, cidade, fonte }] }
 */
router.post('/api/email-optin/import', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'Campo "leads" deve ser um array'
      });
    }

    const engine = getEmailOptInEngine();
    const result = await engine.importLeads(leads);

    res.json({
      success: true,
      message: `${result.imported} leads importados, ${result.skipped} ignorados`,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/send-single
 * Envia email opt-in para um lead especifico
 *
 * Body: { email, nome, empresa, telefone }
 */
router.post('/api/email-optin/send-single', async (req, res) => {
  try {
    const { email, nome, empresa, telefone } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Campo "email" e obrigatorio'
      });
    }

    const { sendConviteEmail } = await import('../../services/EmailService.js');

    const result = await sendConviteEmail(email, {
      nome: nome || empresa,
      empresa: empresa || ''
    });

    if (result.success) {
      // Registrar no banco
      const db = getDatabase();
      const phoneNormalized = telefone ? normalizePhone(telefone) : '';

      try {
        db.prepare(`
          INSERT INTO email_optins (email, telefone, nome, empresa, status, message_id, sent_at)
          VALUES (?, ?, ?, ?, 'sent', ?, datetime('now'))
          ON CONFLICT(email) DO UPDATE SET
            status = 'sent',
            message_id = excluded.message_id,
            sent_at = datetime('now'),
            updated_at = datetime('now')
        `).run(email.toLowerCase().trim(), phoneNormalized, nome, empresa, result.messageId);
      } catch (e) {
        console.error('[EMAIL-OPTIN] Erro ao registrar email:', e.message);
      }
    }

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email-optin/pending
 * Lista leads pendentes de envio de email
 */
router.get('/api/email-optin/pending', (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 50;

    const leads = db.prepare(`
      SELECT p.*
      FROM prospect_leads p
      WHERE p.status = 'pendente'
        AND p.email IS NOT NULL
        AND p.email != ''
        AND NOT EXISTS (
          SELECT 1 FROM email_optins e
          WHERE e.email = p.email
        )
      ORDER BY p.prioridade DESC, p.created_at ASC
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email-optin/sent
 * Lista emails ja enviados
 */
router.get('/api/email-optin/sent', (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 50;

    const optins = db.prepare(`
      SELECT *
      FROM email_optins
      WHERE status = 'sent'
      ORDER BY sent_at DESC
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      count: optins.length,
      optins
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email-optin/eligible
 * Lista leads elegiveis para WhatsApp (email enviado + delay expirado)
 */
router.get('/api/email-optin/eligible', (req, res) => {
  try {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 50;
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');

    const leads = db.prepare(`
      /* tenant-guard: ignore */
      SELECT l.*, e.sent_at as email_sent_at, e.message_id as email_message_id
      FROM leads l /* tenant-guard: ignore */
      LEFT JOIN email_optins e ON e.email = l.email
      WHERE l.whatsapp_eligible = 1
        AND l.cadence_status = 'not_started'
        ${leadFilter.tenantAnd}
      ORDER BY l.created_at ASC
      LIMIT ?
    `).all(...leadFilter.tenantParam, limit);

    res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/config
 * Atualiza configuracao do EmailOptInEngine
 */
router.post('/api/email-optin/config', (req, res) => {
  try {
    const engine = getEmailOptInEngine();
    const newConfig = engine.updateConfig(req.body);

    res.json({
      success: true,
      config: newConfig
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-optin/mark-eligible
 * Marca leads como elegiveis para WhatsApp manualmente
 *
 * Body: { emails: ['email1@test.com', 'email2@test.com'] } ou { all: true }
 */
router.post('/api/email-optin/mark-eligible', (req, res) => {
  try {
    const db = getDatabase();
    const { emails, all } = req.body;

    let result;

    if (all) {
      // Marcar todos os leads com email enviado como elegiveis
      const leadFilter = getTenantFilters(db, 'leads', extractTenantId(req));
      result = db.prepare(`
        UPDATE leads /* tenant-guard: ignore */
        SET whatsapp_eligible = 1,
            stage_id = 'stage_lead_novo',
            updated_at = datetime('now')
        WHERE email_optin_status = 'sent'
          AND whatsapp_eligible = 0
          ${leadFilter.tenantAnd}
      `).run(...leadFilter.tenantParam);
    } else if (emails && Array.isArray(emails)) {
      // Marcar emails especificos
      const leadFilter = getTenantFilters(db, 'leads', extractTenantId(req));
      let updated = 0;
      for (const email of emails) {
        const r = db.prepare(`
          UPDATE leads /* tenant-guard: ignore */
          SET whatsapp_eligible = 1,
              stage_id = 'stage_lead_novo',
              updated_at = datetime('now')
          WHERE email = ?
            AND whatsapp_eligible = 0
            ${leadFilter.tenantAnd}
        `).run(email.toLowerCase().trim(), ...leadFilter.tenantParam);
        updated += r.changes;
      }
      result = { changes: updated };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Informe "emails" (array) ou "all: true"'
      });
    }

    res.json({
      success: true,
      message: `${result.changes} leads marcados como elegiveis para WhatsApp`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
