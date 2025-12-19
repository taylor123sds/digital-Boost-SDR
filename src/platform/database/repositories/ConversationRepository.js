/**
 * CONVERSATION REPOSITORY
 * Repositorio para operacoes de conversas
 */

import { BaseRepository } from './BaseRepository.js';
import { Conversation } from '../models/Conversation.js';

export class ConversationRepository extends BaseRepository {
  constructor(db) {
    super(db, 'conversations', Conversation);
  }

  /**
   * Busca conversa ativa por contato
   */
  findActiveByContact(tenantId, contactId, channel = 'whatsapp') {
    return this.findOne({
      tenant_id: tenantId,
      contact_id: contactId,
      channel: channel,
      status: 'active',
    });
  }

  /**
   * Busca ou cria conversa para contato
   */
  findOrCreate(tenantId, agentId, contactId, channel = 'whatsapp') {
    let conversation = this.findActiveByContact(tenantId, contactId, channel);

    if (!conversation) {
      conversation = new Conversation({
        tenant_id: tenantId,
        agent_id: agentId,
        contact_id: contactId,
        channel: channel,
        status: 'active',
      });
      this.create(conversation);
    }

    return conversation;
  }

  /**
   * Busca conversas por agente
   */
  findByAgent(agentId, options = {}) {
    return this.findAll({ agent_id: agentId }, {
      orderBy: options.orderBy || 'last_message_at',
      orderDesc: true,
      limit: options.limit || 50,
      offset: options.offset,
    });
  }

  /**
   * Busca conversas aguardando humano
   */
  findWaitingHuman(tenantId) {
    return this.findAll({
      tenant_id: tenantId,
      status: 'waiting_human',
    }, {
      orderBy: 'started_at',
      orderDesc: false, // Mais antigas primeiro
    });
  }

  /**
   * Busca conversas por usuario atribuido
   */
  findByAssignedUser(userId) {
    return this.findAll({
      assigned_to: userId,
      status: 'waiting_human',
    });
  }

  /**
   * Atualiza estado da state machine
   */
  updateStateMachine(conversationId, stateData) {
    return this.update(conversationId, {
      state_machine_data: JSON.stringify(stateData),
      last_message_at: new Date().toISOString(),
    });
  }

  /**
   * Atualiza qualificacao
   */
  updateQualification(conversationId, qualificationData, score, status) {
    return this.update(conversationId, {
      qualification_data: JSON.stringify(qualificationData),
      lead_score: score,
      lead_status: status,
    });
  }

  /**
   * Escalona para humano
   */
  escalateToHuman(conversationId, userId, reason) {
    const conversation = this.findById(conversationId);
    if (!conversation) return null;

    conversation.escalateToHuman(userId, reason);
    return this.update(conversationId, conversation.toDBRow());
  }

  /**
   * Retorna para agente
   */
  returnToAgent(conversationId) {
    return this.update(conversationId, {
      status: 'active',
      assigned_to: null,
    });
  }

  /**
   * Fecha conversa
   */
  close(conversationId, reason = 'completed') {
    return this.update(conversationId, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      close_reason: reason,
    });
  }

  /**
   * Busca estatisticas por agente
   */
  getStatsByAgent(agentId, period = 'day') {
    const periodMap = {
      day: "datetime('now', '-1 day')",
      week: "datetime('now', '-7 days')",
      month: "datetime('now', '-30 days')",
    };

    const since = periodMap[period] || periodMap.day;

    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'waiting_human' THEN 1 ELSE 0 END) as waiting_human,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN lead_status = 'SQL' THEN 1 ELSE 0 END) as sql_count,
        SUM(CASE WHEN lead_status = 'MQL' THEN 1 ELSE 0 END) as mql_count,
        AVG(lead_score) as avg_score
      FROM conversations
      WHERE agent_id = ? AND started_at >= ${since}
    `).get(agentId);

    return stats;
  }

  /**
   * Busca leads qualificados
   */
  findQualifiedLeads(tenantId, status = 'SQL') {
    return this.findAll({
      tenant_id: tenantId,
      lead_status: status,
    }, {
      orderBy: 'lead_score',
      orderDesc: true,
    });
  }

  /**
   * Busca conversas recentes para inbox
   */
  getInbox(tenantId, options = {}) {
    const { status, assignedTo, limit = 50, offset = 0 } = options;

    let query = `
      SELECT c.*,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      WHERE c.tenant_id = ?
    `;
    const params = [tenantId];

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (assignedTo) {
      query += ` AND c.assigned_to = ?`;
      params.push(assignedTo);
    }

    query += ` ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params);

    return rows.map(row => ({
      conversation: Conversation.fromDBRow(row),
      lastMessage: row.last_message,
    }));
  }
}

export default ConversationRepository;
