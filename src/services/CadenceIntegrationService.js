/**
 * @file CadenceIntegrationService.js
 * @description Facade service for cadence operations
 *
 * Responsabilidades:
 * - Parar cadência quando lead responde
 * - Fornecer contexto da cadência para o agente
 * - Centralizar operações de cadência
 *
 * @author ORBION Team
 * @version 1.0.0
 */

import { getCadenceEngine } from '../automation/CadenceEngine.js';
import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';
import { DEFAULT_TENANT_ID } from '../utils/tenantCompat.js';
import { assertTenantScoped, getTenantColumnOrThrow } from '../utils/tenantGuard.js';

/**
 * Singleton instance
 */
let instance = null;

class CadenceIntegrationService {
  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;
    log.info('[CADENCE-INTEGRATION] Service initialized');
  }

  /**
   * Processa resposta de um lead em cadência
   * Para a cadência e atualiza status
   *
   * @param {string} phone - Telefone do lead (normalizado)
   * @param {Object} responseData - Dados da resposta
   * @param {string} responseData.channel - Canal da resposta (whatsapp/email)
   * @param {string} responseData.responseType - Tipo (positive/negative/neutral)
   * @param {string} responseData.content - Conteúdo da mensagem
   * @returns {Promise<Object>} Resultado do processamento
   */
  async handleLeadResponse(phone, responseData = {}) {
    const startTime = Date.now();

    try {
      log.info('[CADENCE-INTEGRATION] Processando resposta de lead', { phone });
      const tenantId = responseData.tenantId || DEFAULT_TENANT_ID;

      // 1. Buscar lead pelo telefone
      const leadId = await this._findLeadIdByPhone(phone, tenantId);

      if (!leadId) {
        log.debug('[CADENCE-INTEGRATION] Lead não encontrado na cadência', { phone });
        return {
          success: true,
          action: 'no_action',
          reason: 'Lead não está em cadência ativa'
        };
      }

      // 2. Chamar CadenceEngine.handleResponse
      const cadenceEngine = getCadenceEngine();
      const result = await cadenceEngine.handleResponse(leadId, {
        channel: responseData.channel || 'whatsapp',
        responseType: responseData.responseType || 'neutral',
        content: responseData.content
      });

      const duration = Date.now() - startTime;

      if (result.success) {
        log.info('[CADENCE-INTEGRATION] Cadência pausada com sucesso', {
          leadId,
          enrollmentId: result.enrollment_id,
          responseDay: result.response_day,
          duration: `${duration}ms`
        });
      }

      return {
        success: true,
        action: 'cadence_stopped',
        leadId,
        ...result,
        processingTime: duration
      };

    } catch (error) {
      log.error('[CADENCE-INTEGRATION] Erro ao processar resposta', {
        phone,
        error: error.message
      });

      return {
        success: false,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * Registra interação de lead sem parar a cadência
   * Usado para marcar que o lead respondeu (para pular follow-ups if_no_response)
   * mas sem interromper completamente a cadência
   *
   * @param {string} phone - Telefone do lead
   * @returns {Object} Resultado do registro
   */
  trackInteraction(phone, tenantId = DEFAULT_TENANT_ID) {
    try {
      const cadenceEngine = getCadenceEngine();
      const result = cadenceEngine.recordInteraction(phone, tenantId);

      if (result.success) {
        log.debug('[CADENCE-INTEGRATION] Interação registrada', {
          phone,
          enrollmentId: result.enrollment_id
        });
      }

      return result;
    } catch (error) {
      log.error('[CADENCE-INTEGRATION] Erro ao registrar interação', {
        phone,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém contexto completo do lead para o agente
   *
   * @param {string} phone - Telefone do lead
   * @returns {Promise<Object>} Contexto do lead
   */
  async getLeadContext(phone, tenantId = DEFAULT_TENANT_ID) {
    try {
      const db = getDatabase();
      const leadTenantColumn = getTenantColumnOrThrow(db, 'leads', tenantId, 'cadence getLeadContext leads');
      const cadenceTenantColumn = getTenantColumnOrThrow(db, 'cadence_enrollments', tenantId, 'cadence getLeadContext enrollments');

      // Buscar lead pelo telefone
      const leadQuery = `
        SELECT
          l.*,
          ce.current_day as cadence_day,
          ce.status as enrollment_status,
          ce.enrolled_at,
          ce.responded_at,
          c.name as cadence_name
        FROM leads l
        LEFT JOIN cadence_enrollments ce ON l.id = ce.lead_id
          AND ce.status IN ('active', 'responded')
          AND ce.${cadenceTenantColumn} = l.${leadTenantColumn}
        LEFT JOIN cadences c ON ce.cadence_id = c.id
        WHERE (l.telefone = ? OR l.telefone LIKE ?)
          AND l.${leadTenantColumn} = ?
        ORDER BY l.updated_at DESC
        LIMIT 1
      `;
      assertTenantScoped(leadQuery, [phone, `%${phone.slice(-8)}%`, tenantId], {
        tenantId,
        tenantColumn: leadTenantColumn,
        operation: 'cadence lead lookup'
      });
      const lead = db.prepare(leadQuery).get(phone, `%${phone.slice(-8)}%`, tenantId);

      if (!lead) {
        return {
          isKnownLead: false,
          isInCadence: false,
          context: null
        };
      }

      // Buscar histórico de ações da cadência
      const cadenceActions = db.prepare(`
        SELECT
          cal.day,
          cal.channel,
          cal.action_type,
          cal.status,
          cal.executed_at,
          cs.content
        FROM cadence_actions_log cal
        JOIN cadence_steps cs ON cal.step_id = cs.id
        WHERE cal.lead_id = ?
        ORDER BY cal.executed_at DESC
        LIMIT 5
      `).all(lead.id);

      // Determinar contexto
      const isInCadence = lead.enrollment_status === 'active';
      const hasResponded = lead.enrollment_status === 'responded';
      const wasProspected = lead.pipeline_id === 'pipeline_outbound_solar';

      // Mapear estágio para display amigável
      const stageDisplay = {
        'stage_lead_novo': 'Lead Novo',
        'stage_prospectado': 'Prospectado',
        'stage_em_cadencia': 'Em Cadência',
        'stage_respondeu': 'Respondeu / Em Interação',
        'stage_qualificado': 'Qualificado (BANT)',
        'stage_triagem_agendada': 'Reunião Agendada',
        'stage_agendado': 'Reunião Agendada',
        'stage_oportunidade': 'Oportunidade',
        'stage_proposta': 'Proposta Enviada',
        'stage_negociacao': 'Em Negociação',
        'stage_ganhou': 'GANHO ',
        'stage_convertido': 'Convertido / Cliente',
        'stage_perdeu': 'PERDIDO ',
        'stage_perdido': 'Perdido / Desqualificado',
        'stage_nutricao': 'Nutrição (Sem Resposta)'
      };

      return {
        isKnownLead: true,
        isInCadence,
        hasResponded,
        wasProspected,
        lead: {
          id: lead.id,
          nome: lead.nome,
          empresa: lead.empresa,
          telefone: lead.telefone,
          email: lead.email,
          cidade: lead.cidade,
          stage: lead.stage_id,
          stageDisplay: stageDisplay[lead.stage_id] || lead.stage_id,
          cadenceStatus: lead.cadence_status,
          cadenceDay: lead.cadence_day || 1,
          bantScore: lead.bant_score,
          firstResponseAt: lead.first_response_at,
          responseType: lead.response_type
        },
        cadence: isInCadence || hasResponded ? {
          name: lead.cadence_name,
          currentDay: lead.cadence_day,
          enrolledAt: lead.enrolled_at,
          respondedAt: lead.responded_at,
          recentActions: cadenceActions
        } : null,
        pipeline: {
          stage: lead.stage_id,
          stageDisplay: stageDisplay[lead.stage_id] || lead.stage_id,
          isWon: lead.stage_id === 'stage_ganhou',
          isLost: lead.stage_id === 'stage_perdeu' || lead.stage_id === 'stage_perdido',
          isInNurture: lead.stage_id === 'stage_nutricao',
          hasMeetingScheduled: lead.stage_id === 'stage_triagem_agendada' || lead.stage_id === 'stage_agendado'
        },
        agentInstructions: this._buildAgentInstructions(lead, isInCadence, hasResponded)
      };

    } catch (error) {
      log.error('[CADENCE-INTEGRATION] Erro ao obter contexto', {
        phone,
        error: error.message
      });

      return {
        isKnownLead: false,
        isInCadence: false,
        context: null,
        error: error.message
      };
    }
  }

  /**
   * Constrói instruções específicas para o agente baseado no contexto
   *
   * @private
   */
  _buildAgentInstructions(lead, isInCadence, hasResponded) {
    const instructions = [];

    // Identificar estágio
    const stageNames = {
      'stage_lead_novo': 'Lead Novo',
      'stage_em_cadencia': 'Em Cadência',
      'stage_respondeu': 'Respondeu',
      'stage_triagem_agendada': 'Reunião Agendada',
      'stage_agendado': 'Reunião Agendada',
      'stage_oportunidade': 'Oportunidade',
      'stage_proposta': 'Proposta Enviada',
      'stage_negociacao': 'Em Negociação',
      'stage_ganhou': 'Cliente Convertido',
      'stage_perdeu': 'Lead Perdido',
      'stage_nutricao': 'Em Nutrição'
    };

    const currentStage = stageNames[lead.stage_id] || lead.stage_id;

    // Adicionar info do estágio do pipeline
    instructions.push(` PIPELINE: ${currentStage}`);
    instructions.push(` Empresa: ${lead.empresa || 'Não informada'}`);
    if (lead.cidade) {
      instructions.push(` Cidade: ${lead.cidade}`);
    }

    if (isInCadence) {
      instructions.push(`\n CADÊNCIA: DIA ${lead.cadence_day}/15`);
      instructions.push(` Você JÁ enviou a mensagem de apresentação. NÃO se apresente novamente.`);
      instructions.push(` Continue a conversa focando em entender necessidades e qualificar.`);
    } else if (hasResponded) {
      instructions.push(`\n LEAD RESPONDEU no dia ${lead.cadence_day}.`);
      instructions.push(` Cadência pausada. Foque em QUALIFICAR e AGENDAR REUNIÃO.`);
    } else if (lead.stage_id === 'stage_triagem_agendada' || lead.stage_id === 'stage_agendado') {
      instructions.push(`\n REUNIÃO AGENDADA`);
      instructions.push(` Foque em confirmar detalhes e preparar para a reunião.`);
    } else if (lead.stage_id === 'stage_oportunidade') {
      instructions.push(`\n OPORTUNIDADE ATIVA`);
      instructions.push(` Lead qualificado. Prepare proposta ou diagnóstico.`);
    } else if (lead.stage_id === 'stage_nutricao') {
      instructions.push(`\n EM NUTRIÇÃO (sem resposta na cadência)`);
      instructions.push(` Lead foi reativado. Aborde de forma diferente.`);
    } else if (lead.pipeline_id === 'pipeline_outbound_solar') {
      instructions.push(`\n Lead prospectado pela Digital Boost.`);
    }

    // Adicionar BANT score se disponível
    if (lead.bant_score && lead.bant_score > 0) {
      instructions.push(`\n BANT Score: ${lead.bant_score}/100`);
    }

    return instructions.length > 0 ? instructions.join('\n') : null;
  }

  /**
   * Busca leadId pelo telefone
   * @private
   */
  async _findLeadIdByPhone(phone, tenantId = DEFAULT_TENANT_ID) {
    try {
      const db = getDatabase();
      const leadTenantColumn = getTenantColumnOrThrow(db, 'leads', tenantId, 'cadence _findLeadIdByPhone');

      // Tentar match exato primeiro
      const exactQuery = `
        SELECT id FROM leads
        WHERE telefone = ? AND ${leadTenantColumn} = ?
        LIMIT 1
      `;
      assertTenantScoped(exactQuery, [phone, tenantId], {
        tenantId,
        tenantColumn: leadTenantColumn,
        operation: 'cadence lead lookup (exact)'
      });
      let lead = db.prepare(exactQuery).get(phone, tenantId);

      // Se não encontrar, tentar match parcial (últimos 8 dígitos)
      if (!lead && phone.length >= 8) {
        const lastDigits = phone.slice(-8);
        const partialQuery = `
          SELECT id FROM leads
          WHERE telefone LIKE ? AND ${leadTenantColumn} = ?
          LIMIT 1
        `;
        assertTenantScoped(partialQuery, [`%${lastDigits}`, tenantId], {
          tenantId,
          tenantColumn: leadTenantColumn,
          operation: 'cadence lead lookup (partial)'
        });
        lead = db.prepare(partialQuery).get(`%${lastDigits}`, tenantId);
      }

      return lead?.id || null;
    } catch (error) {
      log.error('[CADENCE-INTEGRATION] Erro ao buscar lead', { phone, error: error.message });
      return null;
    }
  }

  /**
   * Verifica se lead está em cadência ativa
   *
   * @param {string} phone - Telefone do lead
   * @returns {Promise<boolean>}
   */
  async isLeadInActiveCadence(phone, tenantId = DEFAULT_TENANT_ID) {
    const context = await this.getLeadContext(phone, tenantId);
    return context.isInCadence;
  }

  /**
   *  FIX P0: Para cadência de um lead explicitamente
   * Usado quando reunião é agendada ou lead é desqualificado
   *
   * @param {string} phone - Telefone do lead
   * @param {Object} options - Opções
   * @param {string} options.reason - Razão para parar (meeting_scheduled, disqualified, etc)
   * @param {string} options.newStage - Novo estágio do pipeline (opcional)
   * @param {string} options.meetingId - ID da reunião (se aplicável)
   * @returns {Promise<Object>} Resultado
   */
  async stopCadenceForLead(phone, options = {}) {
    const { reason = 'manual_stop', newStage = null, meetingId = null } = options;

    const db = getDatabase();
    const normalizedPhone = phone.replace(/\D/g, '');

    log.info('[CADENCE-INTEGRATION] Parando cadência para lead', { phone: normalizedPhone, reason });

    // 1. Encontrar enrollment ativo (fora da transação - apenas leitura)
    const enrollment = db.prepare(`
      SELECT ce.id, ce.lead_id, ce.current_day
      FROM cadence_enrollments ce
      JOIN leads l ON ce.lead_id = l.id
      WHERE (l.telefone = ? OR l.telefone LIKE ?)
        AND ce.status = 'active'
      ORDER BY ce.enrolled_at DESC
      LIMIT 1
    `).get(normalizedPhone, `%${normalizedPhone.slice(-8)}%`);

    if (!enrollment) {
      log.debug('[CADENCE-INTEGRATION] Nenhum enrollment ativo encontrado', { phone: normalizedPhone });
      return { success: true, error: 'no_active_enrollment' };
    }

    //  FIX GAP-007: Usar transação para garantir consistência entre tabelas
    const completionReason = {
      'meeting_scheduled': 'Meeting scheduled with lead',
      'disqualified': 'Lead disqualified',
      'manual_stop': 'Manually stopped',
      'converted': 'Lead converted to customer'
    }[reason] || reason;

    const transaction = db.transaction(() => {
      // 2. Atualizar enrollment para stopped
      db.prepare(`
        UPDATE cadence_enrollments
        SET status = 'completed',
            completion_reason = ?,
            completed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(completionReason, enrollment.id);

      // 3. Atualizar lead
      const updateFields = {
        cadence_status: 'completed'
      };

      if (newStage) {
        updateFields.stage_id = newStage;
        updateFields.stage_entered_at = "datetime('now')";
      }

      if (meetingId) {
        updateFields.meeting_calendar_id = meetingId;
      }

      const setClause = Object.entries(updateFields)
        .map(([key, _]) => `${key} = ?`)
        .join(', ');

      const values = Object.values(updateFields);
      values.push(enrollment.lead_id);

      db.prepare(`
        UPDATE leads
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values);

      // 4. Registrar no histórico do pipeline
      if (newStage) {
        db.prepare(`
          INSERT INTO pipeline_history (id, lead_id, from_stage_id, to_stage_id, moved_by, reason)
          VALUES (?, ?, 'stage_em_cadencia', ?, 'system', ?)
        `).run(
          `ph_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          enrollment.lead_id,
          newStage,
          completionReason
        );
      }
    });

    try {
      transaction();

      log.success('[CADENCE-INTEGRATION] Cadência parada com sucesso (transação)', {
        enrollmentId: enrollment.id,
        leadId: enrollment.lead_id,
        reason,
        newStage
      });

      return {
        success: true,
        enrollment_id: enrollment.id,
        lead_id: enrollment.lead_id,
        cadence_day: enrollment.current_day,
        reason
      };

    } catch (error) {
      log.error('[CADENCE-INTEGRATION] Erro ao parar cadência (rollback automático)', {
        phone,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Obtém instância singleton do serviço
 */
export function getCadenceIntegrationService() {
  if (!instance) {
    instance = new CadenceIntegrationService();
  }
  return instance;
}

export default CadenceIntegrationService;
