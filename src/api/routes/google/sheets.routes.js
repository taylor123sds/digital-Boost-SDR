/**
 * @file sheets.routes.js
 * @description Rotas do Google Sheets (leads e dashboard)
 * Extraído de server.js (linhas 1723-1784)
 */

import express from 'express';
import * as googleSheets from '../../../tools/google_sheets.js';

const router = express.Router();

/**
 * GET /api/leads
 * Buscar leads do Google Sheets com filtro de busca opcional
 */
router.get('/api/leads', async (req, res) => {
  try {
    const { q } = req.query;

    // Carrega leads do Google Sheets
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Filtra se houver query de busca
    let filteredLeads = allLeads;
    if (q) {
      const query = q.toLowerCase();
      filteredLeads = allLeads.filter(lead =>
        (lead.Nome && lead.Nome.toLowerCase().includes(query)) ||
        (lead.Empresa && lead.Empresa.toLowerCase().includes(query)) ||
        (lead.Telefone && lead.Telefone.includes(query)) ||
        (lead.Segmento && lead.Segmento.toLowerCase().includes(query))
      );
    }

    res.json({
      leads: filteredLeads,
      total: filteredLeads.length,
      totalAll: allLeads.length,
      query: q || '',
      source: 'Google Sheets'
    });
  } catch (error) {
    console.error(' Erro ao carregar leads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/leads
 * Estatísticas dos leads do Google Sheets para o dashboard
 */
router.get('/api/dashboard/leads', async (req, res) => {
  try {
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    // Calcula estatísticas dos leads
    const total = allLeads.length;
    const qualified = allLeads.filter(lead =>
      lead.Status && (lead.Status.toLowerCase().includes('qualificado') || lead.Status.toLowerCase().includes('interessado'))
    ).length;
    const contacted = allLeads.filter(lead =>
      lead.Status && lead.Status.toLowerCase().includes('contato')
    ).length;
    const converted = allLeads.filter(lead =>
      lead.Status && (lead.Status.toLowerCase().includes('convertido') || lead.Status.toLowerCase().includes('fechado'))
    ).length;

    res.json({
      total,
      qualified,
      contacted,
      converted,
      source: 'Google Sheets',
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao carregar dashboard de leads:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
