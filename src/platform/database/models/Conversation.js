/**
 * CONVERSATION MODEL
 * Modelo para conversas entre agentes e contatos
 */

import { randomUUID } from 'crypto';

export class Conversation {
  constructor(data = {}) {
    this.id = data.id || `conv_${randomUUID()}`;
    this.tenantId = data.tenant_id || data.tenantId;
    this.agentId = data.agent_id || data.agentId;
    this.agentVersionId = data.agent_version_id || data.agentVersionId;
    this.contactId = data.contact_id || data.contactId;
    this.channel = data.channel || 'whatsapp';
    this.status = data.status || 'active'; // active, waiting_human, closed, archived
    this.stateMachineData = data.state_machine_data || data.stateMachineData || {};
    this.qualificationData = data.qualification_data || data.qualificationData || this.getDefaultQualification();
    this.leadScore = data.lead_score || data.leadScore || 0;
    this.leadStatus = data.lead_status || data.leadStatus; // SQL, MQL, nurturing, disqualified
    this.assignedTo = data.assigned_to || data.assignedTo;
    this.metadata = data.metadata || {};
    this.startedAt = data.started_at || data.startedAt || new Date().toISOString();
    this.lastMessageAt = data.last_message_at || data.lastMessageAt;
    this.closedAt = data.closed_at || data.closedAt;
    this.closeReason = data.close_reason || data.closeReason;
  }

  getDefaultQualification() {
    return {
      spin: {
        situation: { collected: false, data: {} },
        problem: { collected: false, data: {} },
        implication: { collected: false, data: {} },
        needPayoff: { collected: false, data: {} },
      },
      bant: {
        budget: { level: 'unknown', data: null },
        authority: { level: 'unknown', data: null },
        need: { level: 'unknown', data: null },
        timeline: { level: 'unknown', data: null },
      },
    };
  }

  isActive() {
    return this.status === 'active';
  }

  isWaitingHuman() {
    return this.status === 'waiting_human';
  }

  isClosed() {
    return this.status === 'closed' || this.status === 'archived';
  }

  escalateToHuman(assignedUserId, reason = 'user_request') {
    this.status = 'waiting_human';
    this.assignedTo = assignedUserId;
    this.metadata = {
      ...(typeof this.metadata === 'string' ? JSON.parse(this.metadata) : this.metadata),
      escalatedAt: new Date().toISOString(),
      escalationReason: reason,
    };
  }

  returnToAgent() {
    this.status = 'active';
    this.assignedTo = null;
  }

  close(reason = 'completed') {
    this.status = 'closed';
    this.closedAt = new Date().toISOString();
    this.closeReason = reason;
  }

  updateQualification(spinData, bantData) {
    const qual = typeof this.qualificationData === 'string'
      ? JSON.parse(this.qualificationData)
      : this.qualificationData;

    if (spinData) {
      for (const [stage, data] of Object.entries(spinData)) {
        if (qual.spin[stage]) {
          qual.spin[stage] = { ...qual.spin[stage], ...data };
        }
      }
    }

    if (bantData) {
      for (const [criterio, data] of Object.entries(bantData)) {
        if (qual.bant[criterio]) {
          qual.bant[criterio] = { ...qual.bant[criterio], ...data };
        }
      }
    }

    this.qualificationData = qual;
  }

  updateLeadScore(score, status) {
    this.leadScore = score;
    this.leadStatus = status;
  }

  updateStateMachine(stateData) {
    this.stateMachineData = stateData;
    this.lastMessageAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      agentId: this.agentId,
      agentVersionId: this.agentVersionId,
      contactId: this.contactId,
      channel: this.channel,
      status: this.status,
      stateMachineData: typeof this.stateMachineData === 'string'
        ? JSON.parse(this.stateMachineData) : this.stateMachineData,
      qualificationData: typeof this.qualificationData === 'string'
        ? JSON.parse(this.qualificationData) : this.qualificationData,
      leadScore: this.leadScore,
      leadStatus: this.leadStatus,
      assignedTo: this.assignedTo,
      metadata: typeof this.metadata === 'string' ? JSON.parse(this.metadata) : this.metadata,
      startedAt: this.startedAt,
      lastMessageAt: this.lastMessageAt,
      closedAt: this.closedAt,
      closeReason: this.closeReason,
    };
  }

  toDBRow() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      agent_id: this.agentId,
      agent_version_id: this.agentVersionId,
      contact_id: this.contactId,
      channel: this.channel,
      status: this.status,
      state_machine_data: typeof this.stateMachineData === 'object'
        ? JSON.stringify(this.stateMachineData) : this.stateMachineData,
      qualification_data: typeof this.qualificationData === 'object'
        ? JSON.stringify(this.qualificationData) : this.qualificationData,
      lead_score: this.leadScore,
      lead_status: this.leadStatus,
      assigned_to: this.assignedTo,
      metadata: typeof this.metadata === 'object' ? JSON.stringify(this.metadata) : this.metadata,
      started_at: this.startedAt,
      last_message_at: this.lastMessageAt,
      closed_at: this.closedAt,
      close_reason: this.closeReason,
    };
  }

  static fromDBRow(row) {
    return new Conversation({
      id: row.id,
      tenant_id: row.tenant_id,
      agent_id: row.agent_id,
      agent_version_id: row.agent_version_id,
      contact_id: row.contact_id,
      channel: row.channel,
      status: row.status,
      state_machine_data: row.state_machine_data ? JSON.parse(row.state_machine_data) : {},
      qualification_data: row.qualification_data ? JSON.parse(row.qualification_data) : {},
      lead_score: row.lead_score,
      lead_status: row.lead_status,
      assigned_to: row.assigned_to,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      started_at: row.started_at,
      last_message_at: row.last_message_at,
      closed_at: row.closed_at,
      close_reason: row.close_reason,
    });
  }
}

export default Conversation;
