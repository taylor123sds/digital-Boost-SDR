/**
 * @file funil.routes.js
 * @description Rotas do Funil BANT (qualificação de leads)
 * Extraído de server.js (linhas 2223-2338)
 *
 * REFACTORED: SQLite as primary, Google Sheets as optional sync
 */

import express from 'express';
import { leadRepository } from '../../repositories/lead.repository.js';
import { getDatabase } from '../../db/connection.js';
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
 * GET /api/funil/bant
 * Buscar todos os leads do funil BANT (SQLite primary)
 */
router.get('/api/funil/bant', async (req, res) => {
  try {
    // Importar stateManager para dados BANT detalhados
    const { getLeadState } = await import('../../utils/stateManager.js');
    const tenantId = extractTenantId(req);

    // Buscar leads do SQLite (fonte primaria)
    const sqliteLeads = leadRepository.findAll({
      limit: 500,
      orderBy: 'updated_at',
      order: 'DESC',
      tenantId
    });

    // Formatar leads do SQLite para o formato esperado pelo frontend
    const funnelLeadsPromises = sqliteLeads.map(async (lead) => {
      // Ignorar leads sem telefone
      if (!lead.telefone && !lead.whatsapp) {
        return null;
      }

      const phone = lead.telefone || lead.whatsapp;

      // Buscar estado BANT detalhado do stateManager
      const leadState = await getLeadState(phone);

      // Verificar se o lead esta bloqueado
      const blocked = leadState?.metadata?.blocked;
      if (blocked) {
        return null;
      }

      // Usar dados do SQLite como fonte primaria
      const currentAgent = leadState?.currentAgent || 'sdr';
      const messageCount = leadState?.messageCount || 0;

      // Detectar "completed" via metadata.conversationCompleted
      const isCompleted = leadState?.metadata?.conversationCompleted || false;
      const displayStage = isCompleted ? 'completed' : (leadState?.bantStages?.currentStage || lead.stage_id || 'need');

      // Extrair campos BANT do stateManager
      const needCampos = leadState?.bantStages?.stageData?.need?.campos || {};
      const budgetCampos = leadState?.bantStages?.stageData?.budget?.campos || {};
      const authorityCampos = leadState?.bantStages?.stageData?.authority?.campos || {};
      const timingCampos = leadState?.bantStages?.stageData?.timing?.campos || {};

      return {
        contactId: phone,
        contactName: lead.nome || needCampos.nome_negocio || phone,
        currentStage: displayStage,
        currentAgent: currentAgent,
        lastUpdate: lead.updated_at || new Date().toISOString(),
        messageCount: messageCount,

        // Perfil da Empresa
        nome: lead.nome || needCampos.nome_pessoa || needCampos.nome_negocio || '',
        empresa: lead.empresa || needCampos.nome_negocio || '',
        setor: lead.segmento || needCampos.nicho || '',

        // NEED Stage
        nome_pessoa: needCampos.nome_pessoa || lead.nome || '',
        nome_negocio: needCampos.nome_negocio || lead.empresa || '',
        nicho: needCampos.nicho || lead.segmento || '',
        cargo_funcao: needCampos.cargo_funcao || lead.cargo || '',
        problema_principal: needCampos.problema_principal || lead.bant_need || '',
        intensidade_problema: needCampos.intensidade_problema || '',
        receita_mensal: needCampos.receita_mensal || '',
        funcionarios: needCampos.funcionarios || '',
        servico_identificado: needCampos.servico_identificado || lead.interesse || '',

        // BUDGET Stage
        verba_disponivel: budgetCampos.faixa_investimento || lead.bant_budget || '',
        roi_esperado: budgetCampos.roi_esperado || '',

        // AUTHORITY Stage
        decisor_principal: authorityCampos.decisor_principal || lead.bant_authority || '',
        autonomia_decisao: authorityCampos.autonomia_decisao || '',

        // TIMING Stage
        urgencia: timingCampos.urgencia || lead.bant_timing || '',
        prazo_ideal: timingCampos.prazo_ideal || '',

        // Metadata
        score: lead.bant_score || lead.score || 0,
        origin: lead.origem || 'WhatsApp',
        status: isCompleted ? 'COMPLETO' : 'EM_ANDAMENTO',

        // Pipeline info
        pipeline_stage: lead.stage_id,
        cadence_status: lead.cadence_status,
        cadence_day: lead.cadence_day
      };
    });

    const funnelLeadsWithNulls = await Promise.all(funnelLeadsPromises);
    const funnelLeads = funnelLeadsWithNulls
      .filter(lead => lead !== null) // Remover leads bloqueados
      .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)); // Mais recentes primeiro

    // Estatísticas do funil
    const stats = {
      total: funnelLeads.length,
      byStage: {
        need: funnelLeads.filter(l => l.currentStage === 'need').length,
        budget: funnelLeads.filter(l => l.currentStage === 'budget').length,
        authority: funnelLeads.filter(l => l.currentStage === 'authority').length,
        timing: funnelLeads.filter(l => l.currentStage === 'timing').length,
        scheduler: funnelLeads.filter(l => l.currentStage === 'scheduler').length,
        completed: funnelLeads.filter(l => l.currentStage === 'completed').length
      },
      byStatus: {
        em_andamento: funnelLeads.filter(l => l.status === 'EM_ANDAMENTO').length,
        completo: funnelLeads.filter(l => l.status === 'COMPLETO').length
      },
      avgScore: funnelLeads.reduce((sum, l) => sum + l.score, 0) / (funnelLeads.length || 1)
    };

    console.log(` [FUNIL-BANT] ${funnelLeads.length} leads carregados do SQLite`);

    res.json({
      success: true,
      leads: funnelLeads,
      stats,
      source: 'sqlite', // SQLite is now primary
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar funil BANT:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      leads: [],
      stats: { total: 0, byStage: {}, byStatus: {}, avgScore: 0 }
    });
  }
});

/**
 * GET /api/funil/stats
 * Estatísticas gerais do funil (SQLite primary)
 */
router.get('/api/funil/stats', async (req, res) => {
  try {
    // Use LeadRepository for stats (SQLite primary)
    const tenantId = extractTenantId(req);
    const stats = leadRepository.getFunnelStats('pipeline_outbound_solar', tenantId);

    res.json({
      success: true,
      stats: {
        total: stats.total,
        byStage: stats.byStage.reduce((acc, s) => { acc[s.stage_id] = s.count; return acc; }, {}),
        byStatus: stats.byCadenceStatus.reduce((acc, s) => { acc[s.cadence_status] = s.count; return acc; }, {}),
        avgScore: parseFloat(stats.avgBantScore) || 0,
        responded: stats.responded,
        won: stats.won,
        lost: stats.lost,
        conversionRate: stats.conversionRate,
        responseRate: stats.responseRate
      },
      source: 'sqlite',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FUNIL-STATS] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stats: { total: 0, byStage: {}, byStatus: {}, avgScore: 0 }
    });
  }
});

/**
 * GET /api/funil/bant/:contactId
 * Buscar lead específico do funil BANT
 */
router.get('/api/funil/bant/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { getLeadState } = await import('../../utils/stateManager.js'); //  FIX: Use canonical stateManager
    const state = await getLeadState(contactId);

    if (!state || !state.bantStages) {
      return res.status(404).json({
        success: false,
        error: 'Lead não encontrado ou sem dados BANT'
      });
    }

    res.json({
      success: true,
      lead: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(' Erro ao buscar lead do funil:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/leads/update-stage
 * Atualizar estágio do lead no funil BANT (usado pelo dashboard kanban drag & drop)
 */
router.post('/api/leads/update-stage', async (req, res) => {
  try {
    const { leadId, stage } = req.body;

    if (!leadId || !stage) {
      return res.status(400).json({
        success: false,
        error: 'leadId and stage are required'
      });
    }

    // Importar dependências
    const { getLeadState, saveLeadState } = await import('../../utils/stateManager.js');

    // Buscar estado atual do lead
    const leadState = await getLeadState(leadId);

    if (!leadState) {
      return res.status(404).json({
        success: false,
        error: 'Lead não encontrado'
      });
    }

    // Mapear stage para currentAgent e bantStages.currentStage
    const bantStages = ['need', 'budget', 'authority', 'timing'];
    const agents = ['sdr', 'specialist', 'scheduler'];
    const specialStages = ['completed']; // Stages especiais que usam metadata

    if (bantStages.includes(stage)) {
      // É um estágio BANT - atualizar bantStages.currentStage e manter currentAgent como specialist
      if (!leadState.bantStages) {
        leadState.bantStages = {
          currentStage: stage,
          stageIndex: bantStages.indexOf(stage),
          isComplete: false,
          stageData: {
            need: { campos: {}, tentativas: 0, lastUpdate: null },
            budget: { campos: {}, tentativas: 0, lastUpdate: null },
            authority: { campos: {}, tentativas: 0, lastUpdate: null },
            timing: { campos: {}, tentativas: 0, lastUpdate: null }
          }
        };
      } else {
        leadState.bantStages.currentStage = stage;
        leadState.bantStages.stageIndex = bantStages.indexOf(stage);
      }
      leadState.currentAgent = 'specialist'; // BANT stages são gerenciados pelo specialist
    } else if (agents.includes(stage)) {
      // É um agente - atualizar currentAgent
      leadState.currentAgent = stage;
    } else if (stage === 'completed') {
      //  FIX: "completed" não é um currentAgent válido
      // Usar metadata.conversationCompleted = true e manter currentAgent = scheduler
      leadState.currentAgent = 'scheduler'; // Manter no scheduler
      if (!leadState.metadata) leadState.metadata = {};
      leadState.metadata.conversationCompleted = true;
      leadState.metadata.completedAt = new Date().toISOString();
      leadState.metadata.meetingScheduled = true;
    } else {
      return res.status(400).json({
        success: false,
        error: `Invalid stage: ${stage}. Must be one of: ${[...bantStages, ...agents, ...specialStages].join(', ')}`
      });
    }

    // Salvar estado atualizado
    await saveLeadState(leadState);

    console.log(` [FUNIL-UPDATE] Lead ${leadId} movido para estágio ${stage}`);

    res.json({
      success: true,
      message: `Lead atualizado para estágio ${stage}`,
      data: {
        leadId,
        currentAgent: leadState.currentAgent,
        bantStage: leadState.bantStages?.currentStage
      }
    });
  } catch (error) {
    console.error(' [FUNIL-UPDATE] Erro ao atualizar estágio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/funil/cleanup-prospecting
 * Remove da Sheets1 todos os leads que já foram prospectados (têm mensagens)
 * Mantém apenas leads que ainda não receberam contato
 */
router.post('/api/funil/cleanup-prospecting', async (req, res) => {
  try {
    const { moveLeadFromProspectingToFunil } = await import('../../utils/sheetsManager.js');
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId, 'wm');

    // Buscar todos os leads que têm mensagens (já foram prospectados)
    const prospectedLeads = db.prepare(`
      SELECT DISTINCT l.whatsapp
      FROM leads l /* tenant-guard: ignore */
      WHERE EXISTS (
        SELECT 1 FROM whatsapp_messages wm /* tenant-guard: ignore */
        WHERE wm.phone_number = l.whatsapp
        ${messageFilter.tenantAnd}
      )
      ${leadFilter.tenantAnd}
    `).all(...messageFilter.tenantParam, ...leadFilter.tenantParam);

    console.log(` [CLEANUP] Encontrados ${prospectedLeads.length} leads já prospectados`);

    const results = {
      total: prospectedLeads.length,
      removed: 0,
      notFound: 0,
      errors: 0
    };

    // Remover cada lead da Sheets1
    for (const lead of prospectedLeads) {
      try {
        const result = await moveLeadFromProspectingToFunil(lead.whatsapp);
        if (result.action === 'REMOVED_FROM_SHEETS1') {
          results.removed++;
        } else if (result.action === 'NOT_FOUND_IN_SHEETS1') {
          results.notFound++;
        }
      } catch (err) {
        results.errors++;
        console.error(` Erro ao remover ${lead.whatsapp}:`, err.message);
      }
    }

    console.log(` [CLEANUP] Concluído: ${results.removed} removidos, ${results.notFound} não encontrados, ${results.errors} erros`);

    res.json({
      success: true,
      message: `Limpeza concluída: ${results.removed} leads removidos da Sheets1`,
      results
    });

  } catch (error) {
    console.error(' [CLEANUP] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/funil/sheets-sync/enable
 * Habilitar sync automatico em background para Google Sheets
 */
router.post('/api/funil/sheets-sync/enable', async (req, res) => {
  try {
    const { intervalMs = 60000 } = req.body; // Default: 1 minute
    leadRepository.enableSheetsSync(intervalMs);

    res.json({
      success: true,
      message: `Google Sheets sync enabled (interval: ${intervalMs}ms)`,
      status: 'enabled'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/funil/sheets-sync/disable
 * Desabilitar sync automatico para Google Sheets
 */
router.post('/api/funil/sheets-sync/disable', async (req, res) => {
  try {
    leadRepository.disableSheetsSync();

    res.json({
      success: true,
      message: 'Google Sheets sync disabled',
      status: 'disabled'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/funil/sync-to-sheets
 * Sincronizar TODOS os leads do CRM para o Google Sheets (manual, one-time)
 * Unifica: leads, pipeline, cadence, clientes
 */
router.post('/api/funil/sync-to-sheets', async (req, res) => {
  try {
    const { writeSheet } = await import('../../tools/google_sheets.js');

    const SHEET_ID = process.env.GOOGLE_LEADS_SHEET_ID;
    const SHEET_NAME = 'pipeline_unificado';

    if (!SHEET_ID) {
      return res.status(400).json({ success: false, error: 'GOOGLE_LEADS_SHEET_ID não configurado' });
    }

    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);
    const leadStateFilter = getTenantFilters(db, 'lead_states', tenantId);

    // Headers para a planilha unificada
    const HEADERS = [
      'ID', 'Nome', 'Empresa', 'WhatsApp', 'Email',
      'Pipeline Stage', 'Stage Display', 'Cadence Status', 'Cadence Day',
      'Response Type', 'First Response', 'BANT Score',
      'Origem', 'Status', 'Created At', 'Updated At',
      'Última Mensagem', 'Total Mensagens'
    ];

    // Buscar todos os leads do CRM com info adicional
    const leads = db.prepare(`
      SELECT
        l.*,
        ps.name as stage_name,
        ps.color as stage_color,
        (SELECT COUNT(*) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as total_messages,
        (SELECT MAX(created_at) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as last_message,
        (SELECT message_count FROM lead_states WHERE phone_number = l.whatsapp ${leadStateFilter.tenantAnd}) as state_message_count
      FROM leads l /* tenant-guard: ignore */
      LEFT JOIN pipeline_stages ps /* tenant-guard: ignore */ ON l.stage_id = ps.id
      WHERE 1=1
      ${leadFilter.tenantAnd}
      ORDER BY l.updated_at DESC
    `).all(
      ...leadFilter.tenantParam,
      ...messageFilter.tenantParam,
      ...messageFilter.tenantParam,
      ...leadStateFilter.tenantParam
    );

    // Preparar dados para a planilha
    const rows = leads.map(lead => [
      lead.id,
      lead.nome || lead.whatsapp,
      lead.empresa || '',
      lead.whatsapp,
      lead.email || '',
      lead.stage_id || 'stage_lead_novo',
      lead.stage_name || 'Lead Novo',
      lead.cadence_status || 'not_started',
      lead.cadence_day || 0,
      lead.response_type || '',
      lead.first_response_at || '',
      lead.bant_score || 0,
      lead.origem || 'whatsapp',
      lead.status || 'novo',
      lead.created_at || '',
      lead.updated_at || '',
      lead.last_message || '',
      lead.total_messages || 0
    ]);

    // Escrever no Google Sheets
    // Primeiro, tentar criar/limpar a aba
    try {
      // Escrever headers
      await writeSheet(SHEET_ID, `${SHEET_NAME}!A1:R1`, [HEADERS]);

      // Escrever dados (começando da linha 2)
      if (rows.length > 0) {
        await writeSheet(SHEET_ID, `${SHEET_NAME}!A2:R${rows.length + 1}`, rows);
      }

      console.log(` [SYNC-SHEETS] ${rows.length} leads sincronizados para ${SHEET_NAME}`);

      res.json({
        success: true,
        message: `${rows.length} leads sincronizados para Google Sheets`,
        sheet: SHEET_NAME,
        stats: {
          total: rows.length,
          byStage: leads.reduce((acc, l) => {
            const stage = l.stage_name || 'Lead Novo';
            acc[stage] = (acc[stage] || 0) + 1;
            return acc;
          }, {}),
          byCadenceStatus: leads.reduce((acc, l) => {
            const status = l.cadence_status || 'not_started';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})
        }
      });
    } catch (sheetError) {
      // Se a aba não existe, tentar criar
      console.error(' [SYNC-SHEETS] Erro ao escrever:', sheetError.message);

      // Fallback: usar a aba existente 'funil'
      await writeSheet(SHEET_ID, `funil!A1:R1`, [HEADERS]);
      if (rows.length > 0) {
        await writeSheet(SHEET_ID, `funil!A2:R${rows.length + 1}`, rows);
      }

      res.json({
        success: true,
        message: `${rows.length} leads sincronizados para aba 'funil' (fallback)`,
        sheet: 'funil',
        stats: {
          total: rows.length
        }
      });
    }

  } catch (error) {
    console.error(' [SYNC-SHEETS] Erro na sincronização:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/funil/pipeline-unificado
 * Retorna todos os leads do CRM com dados do pipeline unificados
 */
router.get('/api/funil/pipeline-unificado', async (req, res) => {
  try {
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId, 'l');
    const stageFilter = getTenantFilters(db, 'pipeline_stages', tenantId, 'ps');
    const enrollmentFilter = getTenantFilters(db, 'cadence_enrollments', tenantId, 'ce');
    const messageFilter = getTenantFilters(db, 'whatsapp_messages', tenantId);

    // Buscar leads com todas as informações relevantes
    const leads = db.prepare(`
      SELECT
        l.*,
        ps.name as stage_name,
        ps.color as stage_color,
        ps.position as stage_position,
        ce.current_day as enrollment_day,
        ce.status as enrollment_status,
        (SELECT COUNT(*) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as total_messages,
        (SELECT MAX(created_at) FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp ${messageFilter.tenantAnd}) as last_message_at,
        (SELECT message_text FROM whatsapp_messages /* tenant-guard: ignore */ WHERE phone_number = l.whatsapp AND from_me = 0 ${messageFilter.tenantAnd} ORDER BY created_at DESC LIMIT 1) as last_lead_message
      FROM leads l /* tenant-guard: ignore */
      LEFT JOIN pipeline_stages ps /* tenant-guard: ignore */ ON l.stage_id = ps.id ${stageFilter.tenantAnd}
      LEFT JOIN cadence_enrollments ce /* tenant-guard: ignore */ ON ce.lead_id = l.id AND ce.status = 'active' ${enrollmentFilter.tenantAnd}
      WHERE 1=1
      ${leadFilter.tenantAnd}
      ORDER BY ps.position ASC, l.updated_at DESC
    `).all(
      ...messageFilter.tenantParam,
      ...messageFilter.tenantParam,
      ...messageFilter.tenantParam,
      ...stageFilter.tenantParam,
      ...enrollmentFilter.tenantParam,
      ...leadFilter.tenantParam
    );

    // Agrupar por stage
    const byStage = {};
    const stages = db.prepare(`
      SELECT * FROM pipeline_stages /* tenant-guard: ignore */
      ${stageFilter.tenantWhere}
      ORDER BY position
    `).all(...stageFilter.tenantParam);

    stages.forEach(stage => {
      byStage[stage.slug] = {
        ...stage,
        leads: leads.filter(l => l.stage_id === stage.id)
      };
    });

    res.json({
      success: true,
      total: leads.length,
      stages: byStage,
      leads: leads,
      stats: {
        byStage: stages.map(s => ({
          name: s.name,
          slug: s.slug,
          color: s.color,
          count: leads.filter(l => l.stage_id === s.id).length
        })),
        byCadenceStatus: {
          active: leads.filter(l => l.cadence_status === 'active').length,
          responded: leads.filter(l => l.cadence_status === 'responded').length,
          completed: leads.filter(l => l.cadence_status === 'completed').length,
          not_started: leads.filter(l => l.cadence_status === 'not_started').length
        },
        withResponse: leads.filter(l => l.first_response_at).length,
        totalMessages: leads.reduce((sum, l) => sum + (l.total_messages || 0), 0)
      }
    });

  } catch (error) {
    console.error(' [PIPELINE-UNIFICADO] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// ENDPOINT DE RECEBIMENTO DE LEADS (instagram-automation  Hetzner)
// ========================================

/**
 * POST /api/leads/ingest
 * Recebe leads da automação local (instagram-automation) e salva no orbion.db
 *
 * Headers requeridos:
 *   X-API-KEY: chave de autenticação (LEADS_INGEST_API_KEY)
 *
 * Body (single lead):
 *   { empresa, whatsapp, email, segmento, ... }
 *
 * Body (batch):
 *   { leads: [{ empresa, whatsapp, ... }, ...] }
 */
router.post('/api/leads/ingest', async (req, res) => {
  try {
    // Validar API Key
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.LEADS_INGEST_API_KEY || 'orbion-ingest-2024';
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(getDatabase(), 'leads', tenantId);

    if (apiKey !== validKey) {
      console.warn(' [LEADS-INGEST] Tentativa com API key inválida');
      return res.status(401).json({
        success: false,
        error: 'API key inválida'
      });
    }

    const { leads, ...singleLead } = req.body;

    // Determinar se é batch ou single
    const leadsToProcess = leads || [singleLead];

    if (!leadsToProcess || leadsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum lead fornecido'
      });
    }

    console.log(` [LEADS-INGEST] Recebendo ${leadsToProcess.length} leads da automação...`);

    //  FIX GAP-001: Conexão com banco de dados - obter fresh a cada operação
    // NÃO armazenar em variável para evitar "connection not open" se fechada entre operações

    const results = {
      received: leadsToProcess.length,
      created: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      details: []
    };

    for (const leadData of leadsToProcess) {
      try {
        // Normalizar telefone -  FIX: Preservar 9 em celulares (E.164)
        let phone = leadData.whatsapp || leadData.telefone || leadData.phone;
        if (phone) {
          phone = String(phone).replace(/\D/g, '');
          // Adicionar código país se necessário (não remover o 9!)
          if (phone.length === 10 || phone.length === 11) {
            phone = '55' + phone;
          }
        }

        if (!phone && !leadData.empresa && !leadData.email) {
          results.errors++;
          results.details.push({ error: 'Lead sem dados mínimos', data: leadData });
          continue;
        }

        // Verificar se já existe
        const existing = phone ? leadRepository.findByPhone(phone, tenantId) : null;

        if (existing) {
          // Atualizar lead existente (merge de dados)
          const updateData = {
            updated_at: new Date().toISOString()
          };

          // Só atualizar campos que não estão vazios no novo dado
          if (leadData.empresa && !existing.empresa) updateData.empresa = leadData.empresa;
          if (leadData.email && !existing.email) updateData.email = leadData.email;
          if (leadData.segmento && !existing.segmento) updateData.segmento = leadData.segmento;

          // Merge custom_fields
          if (leadData.custom_fields || leadData.cnpj || leadData.endereco) {
            const existingCustom = JSON.parse(existing.custom_fields || '{}');
            updateData.custom_fields = JSON.stringify({
              ...existingCustom,
              ...leadData.custom_fields,
              cnpj: leadData.cnpj || existingCustom.cnpj,
              endereco: leadData.endereco || existingCustom.endereco,
              cidade_estado: leadData.cidadeEstado || existingCustom.cidade_estado,
              site: leadData.site || existingCustom.site
            });
          }

          leadRepository.update(existing.id, updateData, tenantId);
          results.updated++;
          results.details.push({ action: 'updated', phone, id: existing.id });

        } else {
          //  FIX: Salvar em prospect_leads para entrar na fila do ProspectingEngine
          // Em vez de criar direto em leads, adiciona à fila de prospecção

          // Validar telefone antes de inserir
          if (!phone || phone.length < 10) {
            results.errors++;
            results.details.push({ error: 'Telefone inválido ou vazio', phone, data: leadData });
            continue;
          }

          //  FIX CRÍTICO: Verificar se já existe na tabela LEADS (já recebeu D1)
          const existingInFunnel = getDatabase().prepare(`
            SELECT id, stage_id FROM leads /* tenant-guard: ignore */ WHERE telefone = ? ${leadFilter.tenantAnd}
          `).get(phone, ...leadFilter.tenantParam);

          if (existingInFunnel) {
            results.duplicates++;
            results.details.push({
              action: 'already_in_funnel',
              phone,
              stage: existingInFunnel.stage_id,
              message: 'Lead já está no funil de vendas - não adicionar novamente'
            });
            continue;
          }

          // Verificar se já existe em prospect_leads
          const existingProspect = getDatabase().prepare(`
            SELECT id FROM prospect_leads WHERE telefone_normalizado = ?
          `).get(phone);

          if (existingProspect) {
            results.duplicates++;
            results.details.push({ action: 'duplicate_in_queue', phone });
            continue;
          }

          // Criar ID único
          const prospectId = `pl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

          // Inserir em prospect_leads (fila do ProspectingEngine)
          //  FIX: Incluir TODOS os campos da tabela, especialmente whatsapp (NOT NULL)
          getDatabase().prepare(`
            INSERT INTO prospect_leads (
              id, empresa, nome, cnpj, segmento, porte, faturamento_estimado,
              cidade, estado, endereco, bairro, cep,
              whatsapp, telefone, telefone_normalizado, email, site,
              origem, fonte_lista, status, prioridade, custom_fields,
              created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, 'pendente', 0, ?,
              datetime('now'), datetime('now')
            )
          `).run(
            prospectId,
            // Dados básicos
            leadData.empresa || leadData.nome || 'Sem nome',
            leadData.nome || leadData.empresa || null,
            leadData.cnpj || null,
            leadData.segmento || null,
            leadData.porte || null,
            leadData.faturamentoEstimado || null,
            // Localização
            leadData.cidade || (leadData.cidadeEstado ? leadData.cidadeEstado.split('/')[0]?.trim() : null),
            leadData.estado || (leadData.cidadeEstado ? leadData.cidadeEstado.split('/')[1]?.trim() : null),
            leadData.endereco || null,
            leadData.bairro || null,
            leadData.cep || null,
            // Contato -  CRÍTICO: whatsapp é NOT NULL
            phone,  // whatsapp
            phone,  // telefone
            phone,  // telefone_normalizado
            leadData.email || null,
            leadData.site || null,
            // Origem
            leadData.origem || 'instagram_prospector',
            leadData.tema || leadData.campanha || 'instagram-automation',
            // Metadados extras + Dados V2 de Scoring
            JSON.stringify({
              // Dados básicos
              razao_social: leadData.razaoSocial || null,
              capital_social: leadData.capitalSocial || null,
              telefones_adicionais: leadData.telefones?.slice(1)?.join(', ') || null,
              tema_busca: leadData.tema || null,
              data_prospeccao: new Date().toISOString(),
              fonte: 'instagram-automation',

              //  NOVO: Dados V2 de Lead Scoring
              score_v2: leadData.score || null,           // Score 0-100
              tier_v2: leadData.tier || null,              // A+, A, B, C, D
              cluster_v2: leadData.cluster || null,        // A, B, C, D (cluster CNAE)
              cluster_name: leadData.clusterName || null,  // Nome do cluster (Lojas Físicas, etc)
              ofertas_recomendadas: Array.isArray(leadData.ofertasRecomendadas)
                ? leadData.ofertasRecomendadas.join(', ')
                : (leadData.ofertasRecomendadas || null),
              data_abertura: leadData.dataAbertura || null,
              situacao_cadastral: leadData.situacao || null,
              cnae_descricao: leadData.cnaeDescricao || leadData.segmento || null
            })
          );

          results.created++;
          results.details.push({ action: 'queued_for_prospecting', phone, id: prospectId });
        }

      } catch (leadError) {
        results.errors++;
        results.details.push({ error: leadError.message, data: leadData });
      }
    }

    console.log(` [LEADS-INGEST] Processados: ${results.created} adicionados à fila, ${results.updated} atualizados, ${results.duplicates} duplicados, ${results.errors} erros`);

    res.json({
      success: true,
      message: `${results.created} leads adicionados à fila de prospecção, ${results.updated} atualizados`,
      results,
      info: 'Leads novos são adicionados à prospect_leads. ProspectingEngine enviará a mensagem D1 automaticamente (8h-18h, Seg-Sex).'
    });

  } catch (error) {
    console.error(' [LEADS-INGEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leads/ingest/stats
 * Estatísticas dos leads recebidos da automação
 */
router.get('/api/leads/ingest/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const tenantId = extractTenantId(req);
    const leadFilter = getTenantFilters(db, 'leads', tenantId);

    const stats = {
      total: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
      hoje: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' AND DATE(created_at) = DATE('now') ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
      semana: db.prepare(`SELECT COUNT(*) as count FROM leads /* tenant-guard: ignore */ WHERE origem = 'instagram_prospector' AND created_at >= datetime('now', '-7 days') ${leadFilter.tenantAnd}`).get(...leadFilter.tenantParam).count,
      porTema: db.prepare(`
        SELECT
          json_extract(custom_fields, '$.tema_busca') as tema,
          COUNT(*) as count
        FROM leads /* tenant-guard: ignore */
        WHERE origem = 'instagram_prospector'
        ${leadFilter.tenantAnd}
        GROUP BY tema
      `).all(...leadFilter.tenantParam),
      porCidade: db.prepare(`
        SELECT
          json_extract(custom_fields, '$.cidade_estado') as cidade,
          COUNT(*) as count
        FROM leads /* tenant-guard: ignore */
        WHERE origem = 'instagram_prospector'
        ${leadFilter.tenantAnd}
        GROUP BY cidade
        ORDER BY count DESC
        LIMIT 10
      `).all(...leadFilter.tenantParam)
    };

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' [LEADS-INGEST-STATS] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
