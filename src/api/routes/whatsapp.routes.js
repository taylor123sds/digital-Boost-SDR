/**
 * @file whatsapp.routes.js
 * @description Rotas de WhatsApp e campaign trigger (simplificado)
 * Campaign agora é apenas um trigger que chama o SDR Agent
 * Data source: SQLite (primary) with optional Google Sheets fallback
 */

import express from 'express';
import globalErrorHandler from '../../utils/error_handler.js';
import { leadRepository } from '../../repositories/lead.repository.js';
import { triggerCampaign } from '../../tools/campaign_trigger.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

/**
 * POST /api/whatsapp/send
 * Enviar mensagem via WhatsApp (Evolution API)
 */
router.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: 'Numero (to) e mensagem (message) sao obrigatorios'
      });
    }

    // Usar o Evolution API diretamente
    const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'ORBION_KEY_123456';
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'digitalboost';

    const { success, data: result, error } = await globalErrorHandler.safeAsync(
      'WHATSAPP_SEND_MESSAGE',
      async () => {
        const response = await globalErrorHandler.withTimeout(
          'WHATSAPP_API_REQUEST',
          () => fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({
              number: to,
              text: message
            })
          }),
          15000, // 15 segundos timeout para API externa
          { to, messageLength: message.length }
        );
        return response.json();
      },
      { to, message: message.substring(0, 100) }
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: error
      });
    }

    if (result && result.status === 'success') {
      console.log(`[WHATSAPP] Mensagem enviada para ${to}: ${message}`);
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result,
        to,
        text: message
      });
    } else {
      console.log(`[WHATSAPP] Erro ao enviar mensagem para ${to}:`, result);
      res.status(400).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: result
      });
    }

  } catch (error) {
    console.error('[WHATSAPP] Erro no endpoint send:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * POST /api/campaign/run
 * Trigger simplificado: apenas chama SDR Agent para cada telefone
 * Source: SQLite (primary)
 */
router.post('/api/campaign/run', async (req, res) => {
  try {
    const { maxMessages = 50, source = 'sqlite' } = req.body;
    const tenantId = extractTenantId(req);

    console.log(`[CAMPAIGN-TRIGGER] Iniciando (max: ${maxMessages}, source: ${source})`);

    let phones = [];

    // Primary source: SQLite
    if (source === 'sqlite' || source === 'auto') {
      const leads = leadRepository.findAll({ limit: maxMessages, orderBy: 'created_at', order: 'DESC', tenantId });
      phones = leads
        .map(lead => lead.telefone || lead.whatsapp || '')
        .filter(phone => phone);

      console.log(`[CAMPAIGN-TRIGGER] ${phones.length} telefones do SQLite`);
    }

    // Fallback: Google Sheets (if configured and no SQLite leads)
    if (phones.length === 0 && process.env.GOOGLE_LEADS_SHEET_ID) {
      try {
        const googleSheets = await import('../../tools/google_sheets.js');
        const sheetLeads = await googleSheets.getLeadsFromGoogleSheets(process.env.GOOGLE_LEADS_SHEET_ID, 'A:Z');
        phones = sheetLeads
          .map(lead => lead.Telefone || lead.telefone || lead.Phone || lead.phone || lead.WhatsApp || lead.whatsapp || '')
          .filter(phone => phone)
          .slice(0, maxMessages);

        console.log(`[CAMPAIGN-TRIGGER] ${phones.length} telefones do Google Sheets (fallback)`);
      } catch (err) {
        console.warn(`[CAMPAIGN-TRIGGER] Google Sheets fallback falhou:`, err.message);
      }
    }

    if (phones.length === 0) {
      return res.json({
        success: true,
        results: { total: 0, sent: 0, failed: 0 },
        message: 'Nenhum lead encontrado',
        source: 'sqlite'
      });
    }

    // Trigger: chamar SDR Agent para cada telefone
    const results = await triggerCampaign(phones, {
      delayMs: 7000,
      maxPhones: maxMessages
    });

    res.json({
      success: true,
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed
      },
      source: 'sqlite'
    });

  } catch (error) {
    console.error('[CAMPAIGN-TRIGGER] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/campaign-status
 * Returns campaign stats from SQLite
 */
router.get('/api/whatsapp/campaign-status', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const stats = leadRepository.getFunnelStats('pipeline_outbound_solar', tenantId);

    res.json({
      message: 'Campaign stats from SQLite',
      total_leads: stats.total,
      responded: stats.responded,
      won: stats.won,
      lost: stats.lost,
      responseRate: stats.responseRate,
      conversionRate: stats.conversionRate,
      source: 'sqlite'
    });
  } catch (error) {
    console.error('[CAMPAIGN-STATUS] Erro:', error);
    res.json({
      message: 'Campaign status error',
      analyzed: 0,
      sent: 0,
      responses: 0,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/intelligent-campaign
 * Simplified: now just triggers SDR Agent (backward compatibility)
 * Source: SQLite (primary)
 */
router.post('/api/whatsapp/intelligent-campaign', async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    const tenantId = extractTenantId(req);

    console.log(`[CAMPAIGN-TRIGGER-LEGACY] Iniciando (limit: ${limit})`);

    // Get leads from SQLite
    const leads = leadRepository.findAll({ limit, orderBy: 'created_at', order: 'DESC', tenantId });
    let phones = leads
      .map(lead => lead.telefone || lead.whatsapp || '')
      .filter(phone => phone);

    // Fallback to Google Sheets if no SQLite leads
    if (phones.length === 0 && process.env.GOOGLE_LEADS_SHEET_ID) {
      try {
        const googleSheets = await import('../../tools/google_sheets.js');
        const sheetLeads = await googleSheets.getLeadsFromGoogleSheets(process.env.GOOGLE_LEADS_SHEET_ID, 'A:Z');
        phones = sheetLeads
          .map(lead => lead.Telefone || lead.telefone || lead.Phone || lead.phone || lead.WhatsApp || lead.whatsapp || '')
          .filter(phone => phone)
          .slice(0, limit);

        console.log(`[CAMPAIGN-TRIGGER-LEGACY] ${phones.length} telefones do Google Sheets (fallback)`);
      } catch (err) {
        console.warn(`[CAMPAIGN-TRIGGER-LEGACY] Google Sheets fallback falhou:`, err.message);
      }
    }

    if (phones.length === 0) {
      return res.json({
        success: false,
        sent: 0,
        failed: 0,
        message: 'Nenhum lead encontrado',
        source: 'sqlite'
      });
    }

    // Trigger: chamar SDR Agent para cada telefone
    const results = await triggerCampaign(phones, {
      delayMs: 7000,
      maxPhones: limit
    });

    res.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      total: results.total,
      source: 'sqlite'
    });

  } catch (error) {
    console.error('[CAMPAIGN-TRIGGER-LEGACY] Erro:', error);
    res.status(500).json({
      success: false,
      sent: 0,
      failed: 0,
      error: error.message
    });
  }
});

/**
 * GET /api/leads
 * Get all leads from SQLite (used by dashboard)
 */
router.get('/api/leads', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const tenantId = extractTenantId(req);

    const leads = leadRepository.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'updated_at',
      order: 'DESC',
      tenantId
    });

    res.json({
      success: true,
      leads,
      count: leads.length,
      source: 'sqlite'
    });
  } catch (error) {
    console.error('[LEADS-API] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      leads: []
    });
  }
});

/**
 * POST /api/leads/update-stage
 * Update lead stage (used by dashboard drag & drop)
 */
router.post('/api/leads/update-stage', async (req, res) => {
  try {
    const { leadId, contactId, newStage, stageId } = req.body;

    const id = leadId || contactId;
    const stage = stageId || newStage;

    if (!id || !stage) {
      return res.status(400).json({
        success: false,
        error: 'leadId/contactId e newStage/stageId sao obrigatorios'
      });
    }

    console.log(`[LEADS-API] Updating lead ${id} to stage ${stage}`);

    const result = leadRepository.updateStage(id, stage);

    if (result) {
      res.json({
        success: true,
        message: `Lead movido para ${stage}`,
        lead: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Lead nao encontrado'
      });
    }
  } catch (error) {
    console.error('[LEADS-API] Erro ao atualizar stage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
