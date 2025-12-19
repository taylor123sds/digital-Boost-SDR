/**
 * @file debug.routes.js
 * @description Rotas de debug e diagnóstico
 * Extraído de server.js (linhas 2481-2517)
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/debug/sheets
 * Debug endpoint para testar Google Sheets integration
 */
router.get('/api/debug/sheets', async (req, res) => {
  try {
    console.log(' DEBUG: Testando Google Sheets...');

    // Teste 1: Verificar variável de ambiente
    const sheetId = process.env.GOOGLE_LEADS_SHEET_ID;
    console.log(' DEBUG: GOOGLE_LEADS_SHEET_ID =', sheetId);

    // Teste 2: Carregar dados do Google Sheets
    const { getLeadsFromGoogleSheets } = await import('../../tools/google_sheets.js');
    const leads = await getLeadsFromGoogleSheets();
    console.log(' DEBUG: Leads carregados =', leads.length);

    // Teste 3: Resposta detalhada
    res.json({
      success: true,
      debug: {
        sheetId: sheetId || 'NÃO CONFIGURADO',
        leadsCount: leads.length,
        leads: leads,
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT
        }
      }
    });
  } catch (error) {
    console.error(' DEBUG: Erro =', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
