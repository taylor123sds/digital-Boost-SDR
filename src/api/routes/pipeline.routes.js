/**
 * ORBION Pipeline Routes
 * API endpoints for Sales Pipeline management (post-BANT opportunities)
 * Data source: SQLite (primary) with optional Google Sheets sync
 */

import express from 'express';
import { leadRepository } from '../../repositories/lead.repository.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { enforceIsolation, requireTenant } from '../../middleware/tenant.middleware.js';
import { extractTenantId } from '../../utils/tenantCompat.js';

const router = express.Router();

// Limit auth middleware to the pipeline API scope to avoid /app/* conflicts.
router.use('/api/pipeline', authenticate, enforceIsolation, requireTenant);

/**
 * GET /api/pipeline
 * Obtém todas as oportunidades do pipeline
 *
 * @returns {Object} { success, opportunities, stats }
 */
router.get('/api/pipeline', async (req, res) => {
  try {
    console.log('[PIPELINE-API] Fetching pipeline opportunities...');
    const tenantId = extractTenantId(req);

    // Get leads from SQLite
    const allLeads = leadRepository.findAll({ limit: 500, orderBy: 'updated_at', order: 'DESC', tenantId });

    //  FIX CORRETO: Pipeline de VENDAS só deve mostrar leads que:
    // 1. TÊM REUNIÃO AGENDADA (Discovery) - verificar na tabela meetings
    // 2. OU estão em estágios de vendas avançados (proposta, negociação, ganhou)
    //
    // Estágios de PROSPECÇÃO (NÃO aparecem no pipeline):
    // - stage_lead_novo
    // - stage_em_cadencia
    // - stage_respondeu (apenas respondeu, ainda não agendou reunião)
    const prospectingStages = ['stage_lead_novo', 'stage_em_cadencia', 'stage_respondeu'];
    const salesStages = ['stage_qualificado', 'stage_proposta', 'stage_negociacao', 'stage_ganhou', 'stage_perdeu'];

    // Buscar leads com reunião agendada (para Discovery)
    const { getDatabase } = await import('../../db/index.js');
    const db = getDatabase();
    const leadsWithMeetings = db.prepare(`
      SELECT DISTINCT l.id
      FROM leads l
      INNER JOIN meetings m ON m.lead_id = l.id
      WHERE m.status NOT IN ('cancelada', 'cancelled')
        AND l.tenant_id = ?
        AND m.tenant_id = ?
    `).all(tenantId, tenantId).map(r => r.id);

    // Filtrar leads para o pipeline:
    // - Leads com reunião agendada (Discovery)
    // - OU leads em estágios de vendas avançados
    const leads = allLeads.filter(lead => {
      // Lead tem reunião agendada?  Discovery
      if (leadsWithMeetings.includes(lead.id)) return true;

      // Lead está em estágio de vendas avançado?
      if (salesStages.includes(lead.stage_id)) return true;

      // Senão, não entra no pipeline
      return false;
    });

    console.log(`[PIPELINE-API] Filtered: ${allLeads.length} total  ${leads.length} in sales pipeline (${leadsWithMeetings.length} with meetings)`);

    // Map leads to opportunities format
    const opportunities = leads.map(lead => {
      // Determinar o stage do pipeline
      // Se tem reunião  discovery, senão usa o mapeamento padrão
      const hasMeeting = leadsWithMeetings.includes(lead.id);
      const pipelineStage = hasMeeting && !salesStages.includes(lead.stage_id)
        ? 'discovery'
        : mapStageToSalesStage(lead.stage_id);

      return {
        id: lead.id,
        nome: lead.nome || lead.empresa || 'Sem nome',
        empresa: lead.empresa || '',
        valor: parseFloat(lead.valor || lead.bant_budget || 0),
        email: lead.email || '',
        telefone: lead.telefone || lead.whatsapp || '',
        setor: lead.segmento || lead.setor || '',
        dor: lead.interesse || '',
        pipeline_stage: pipelineStage,
        probability: hasMeeting ? 25 : getProbabilityForStage(lead.stage_id),
      close_date: lead.close_date || '',
      bant_score: lead.bant_score || 0,
      created_at: lead.created_at,
      updated_at: lead.updated_at
      };
    });

    // Calcular estatísticas
    const stats = {
      total_opportunities: opportunities.length,
      pipeline_total_value: opportunities.reduce((sum, opp) => sum + (parseFloat(opp.valor) || 0), 0),
      weighted_value: opportunities.reduce((sum, opp) => {
        const value = parseFloat(opp.valor) || 0;
        const probability = parseFloat(opp.probability) || 0;
        return sum + (value * probability / 100);
      }, 0),
      avg_deal_size: opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + (parseFloat(opp.valor) || 0), 0) / opportunities.length
        : 0,
      by_stage: {
        discovery: opportunities.filter(o => o.pipeline_stage === 'discovery').length,
        qualification: opportunities.filter(o => o.pipeline_stage === 'qualification').length,
        proposal: opportunities.filter(o => o.pipeline_stage === 'proposal').length,
        negotiation: opportunities.filter(o => o.pipeline_stage === 'negotiation').length,
        closed_won: opportunities.filter(o => o.pipeline_stage === 'closed_won').length
      }
    };

    console.log(`[PIPELINE-API] Found ${opportunities.length} opportunities`);

    res.json({
      success: true,
      opportunities,
      stats,
      source: 'sqlite'
    });

  } catch (error) {
    console.error('[PIPELINE-API] Error fetching pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pipeline/stats
 * Obtém apenas estatísticas do pipeline
 *
 * @returns {Object} { success, stats }
 */
router.get('/api/pipeline/stats', async (req, res) => {
  try {
    console.log('[PIPELINE-API] Fetching pipeline stats...');

    const tenantId = extractTenantId(req);
    const stats = leadRepository.getFunnelStats('pipeline_outbound_solar', tenantId);

    res.json({
      success: true,
      stats: {
        total_opportunities: stats.total,
        byStage: stats.byStage,
        avgBantScore: stats.avgBantScore,
        won: stats.won,
        lost: stats.lost,
        conversionRate: stats.conversionRate,
        responseRate: stats.responseRate
      },
      source: 'sqlite'
    });

  } catch (error) {
    console.error('[PIPELINE-API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pipeline
 * Cria uma nova oportunidade no pipeline
 *
 * @body {Object} { nome, empresa, valor, email, telefone, setor, dor, pipeline_stage?, probability?, close_date? }
 * @returns {Object} { success, id, opportunity }
 */
router.post('/api/pipeline', async (req, res) => {
  try {
    console.log('[PIPELINE-API] Creating new opportunity...');
    const tenantId = extractTenantId(req);

    const opportunityData = {
      tenant_id: tenantId,
      nome: req.body.nome || req.body.name || '',
      empresa: req.body.empresa || req.body.account_name || '',
      valor: parseFloat(req.body.valor || req.body.value || 0),
      email: req.body.email || '',
      telefone: req.body.telefone || req.body.phone || '',
      segmento: req.body.setor || req.body.sector || '',
      interesse: req.body.dor || req.body.problema_principal || req.body.pain || '',
      stage_id: mapSalesStageToStageId(req.body.pipeline_stage || req.body.stage || 'discovery'),
      bant_score: parseInt(req.body.probability || 20),
      close_date: req.body.close_date || ''
    };

    // Validação básica
    if (!opportunityData.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome da oportunidade é obrigatório'
      });
    }

    const lead = leadRepository.create(opportunityData);

    console.log(`[PIPELINE-API] Opportunity ${lead.id} created`);
    res.json({
      success: true,
      id: lead.id,
      opportunity: {
        ...opportunityData,
        id: lead.id,
        pipeline_stage: req.body.pipeline_stage || 'discovery'
      }
    });

  } catch (error) {
    console.error('[PIPELINE-API] Error creating opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/pipeline/:id/stage
 * Atualiza o estágio de uma oportunidade (drag & drop)
 *
 * @param {string} id - ID da oportunidade
 * @body {Object} { pipeline_stage, valor?, close_date? }
 * @returns {Object} { success, message, needsInfo? }
 */
router.put('/api/pipeline/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { pipeline_stage, stage, valor, close_date } = req.body;
    const tenantId = extractTenantId(req);

    const newStage = pipeline_stage || stage;

    if (!newStage) {
      return res.status(400).json({
        success: false,
        error: 'pipeline_stage é obrigatório'
      });
    }

    // Validar estágios válidos
    const validStages = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won'];
    if (!validStages.includes(newStage)) {
      return res.status(400).json({
        success: false,
        error: `Estágio inválido. Valores válidos: ${validStages.join(', ')}`
      });
    }

    console.log(`[PIPELINE-API] Updating opportunity ${id} to stage ${newStage}`);

    // Buscar lead atual
    const currentLead = leadRepository.findById(id);
    if (!currentLead || currentLead.tenant_id !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }

    // Quando mover para Negociação ou Ganho, verificar se já tem valor e prazo salvos
    if (newStage === 'negotiation' || newStage === 'closed_won') {
      const finalValor = valor || currentLead.valor || currentLead.bant_budget;
      const finalCloseDate = close_date || currentLead.close_date;

      if (!finalValor || !finalCloseDate) {
        console.log(`[PIPELINE-API] Stage ${newStage} requires valor and close_date`);
        return res.status(400).json({
          success: false,
          needsInfo: true,
          stage: newStage,
          error: 'Para avançar para este estágio, é necessário ter salvo a proposta com valor e data de início',
          requiredFields: ['proposal_valor_final', 'proposal_data_inicio']
        });
      }
    }

    // Map sales stage to internal stage_id
    const newStageId = mapSalesStageToStageId(newStage);

    const updateData = {
      stage_id: newStageId,
      stage_entered_at: new Date().toISOString()
    };

    // Adicionar valor e close_date se fornecidos
    if (valor) {
      updateData.valor = parseFloat(valor);
    }
    if (close_date) {
      updateData.close_date = close_date;
    }

    // Se movendo para closed_won, adicionar data de fechamento
    if (newStage === 'closed_won' && !updateData.close_date) {
      updateData.close_date = new Date().toISOString().split('T')[0];
    }

    leadRepository.update(id, updateData);

    console.log(`[PIPELINE-API] Opportunity ${id} updated to ${newStage}`);
    res.json({
      success: true,
      message: `Oportunidade movida para ${newStage}`,
      id,
      stage: newStage,
      valor: updateData.valor,
      close_date: updateData.close_date
    });

  } catch (error) {
    console.error('[PIPELINE-API] Error updating stage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/pipeline/:id
 * Atualiza qualquer campo de uma oportunidade
 *
 * @param {string} id - ID da oportunidade
 * @body {Object} - Campos para atualizar
 * @returns {Object} { success, message }
 */
router.put('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = extractTenantId(req);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum dado para atualizar'
      });
    }

    console.log(`[PIPELINE-API] Updating opportunity ${id}:`, updateData);

    // Map frontend field names to database field names
    const mappedData = {};
    if (updateData.nome) mappedData.nome = updateData.nome;
    if (updateData.empresa) mappedData.empresa = updateData.empresa;
    if (updateData.valor) mappedData.valor = parseFloat(updateData.valor);
    if (updateData.email) mappedData.email = updateData.email;
    if (updateData.telefone) mappedData.telefone = updateData.telefone;
    if (updateData.setor) mappedData.segmento = updateData.setor;
    if (updateData.dor) mappedData.interesse = updateData.dor;
    if (updateData.pipeline_stage) mappedData.stage_id = mapSalesStageToStageId(updateData.pipeline_stage);
    if (updateData.close_date) mappedData.close_date = updateData.close_date;

    const currentLead = leadRepository.findById(id);
    if (!currentLead || currentLead.tenant_id !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }

    const result = leadRepository.update(id, mappedData);

    if (result) {
      console.log(`[PIPELINE-API] Opportunity ${id} updated successfully`);
      res.json({
        success: true,
        message: 'Oportunidade atualizada com sucesso',
        id,
        updatedFields: Object.keys(mappedData)
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }

  } catch (error) {
    console.error('[PIPELINE-API] Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pipeline/:id
 * Obtém detalhes de uma oportunidade específica
 *
 * @param {string} id - ID da oportunidade
 * @returns {Object} { success, opportunity }
 */
router.get('/api/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = extractTenantId(req);

    console.log(`[PIPELINE-API] Fetching opportunity ${id}...`);

    const lead = leadRepository.findById(id);

    if (lead && lead.tenant_id === tenantId) {
      const opportunity = {
        id: lead.id,
        nome: lead.nome || lead.empresa || 'Sem nome',
        empresa: lead.empresa || '',
        valor: parseFloat(lead.valor || lead.bant_budget || 0),
        email: lead.email || '',
        telefone: lead.telefone || lead.whatsapp || '',
        setor: lead.segmento || '',
        dor: lead.interesse || '',
        pipeline_stage: mapStageToSalesStage(lead.stage_id),
        probability: getProbabilityForStage(lead.stage_id),
        close_date: lead.close_date || '',
        bant_score: lead.bant_score || 0,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      };

      res.json({
        success: true,
        opportunity
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }

  } catch (error) {
    console.error('[PIPELINE-API] Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// Helper Functions
// ==========================================

/**
 * Map internal stage_id to sales pipeline stage
 *
 * FLUXO DE VENDAS:
 * 1. stage_respondeu  discovery (lead respondeu, iniciando conversa de discovery)
 * 2. stage_qualificado  qualification (passou pelo BANT, qualificado)
 * 3. stage_proposta  proposal (proposta enviada)
 * 4. stage_negociacao  negotiation (negociando)
 * 5. stage_ganhou  closed_won (fechou!)
 *
 * NOTA: stage_lead_novo e stage_em_cadencia são filtrados e NÃO aparecem no pipeline
 */
function mapStageToSalesStage(stageId) {
  const mapping = {
    // Prospecção (FILTRADOS - não aparecem no pipeline de vendas)
    // 'stage_lead_novo': null,
    // 'stage_em_cadencia': null,

    // Pipeline de Vendas
    'stage_respondeu': 'discovery',      // Respondeu = início do discovery
    'stage_qualificado': 'qualification', // Qualificado pelo BANT
    'stage_proposta': 'proposal',         // Proposta enviada
    'stage_negociacao': 'negotiation',    // Em negociação
    'stage_ganhou': 'closed_won',         // Fechou!
    'stage_perdeu': 'closed_lost'         // Perdeu
  };
  return mapping[stageId] || 'discovery';
}

/**
 * Map sales pipeline stage to internal stage_id
 */
function mapSalesStageToStageId(salesStage) {
  const mapping = {
    'discovery': 'stage_em_cadencia',
    'qualification': 'stage_qualificado',
    'proposal': 'stage_proposta',
    'negotiation': 'stage_negociacao',
    'closed_won': 'stage_ganhou',
    'closed_lost': 'stage_perdeu'
  };
  return mapping[salesStage] || 'stage_em_cadencia';
}

/**
 * Get probability percentage for a stage
 */
function getProbabilityForStage(stageId) {
  const probabilities = {
    'stage_lead_novo': 10,
    'stage_em_cadencia': 20,
    'stage_respondeu': 30,
    'stage_qualificado': 40,
    'stage_proposta': 60,
    'stage_negociacao': 80,
    'stage_ganhou': 100,
    'stage_perdeu': 0
  };
  return probabilities[stageId] || 20;
}

export default router;
