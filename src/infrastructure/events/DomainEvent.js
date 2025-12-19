/**
 * @file infrastructure/events/DomainEvent.js
 * @description Base domain event class
 * Wave 4: Infrastructure Layer - Events
 */

import { randomUUID } from 'crypto';

/**
 * Base Domain Event
 * All domain events should extend this class
 */
export class DomainEvent {
  /**
   * @param {string} name - Event name
   * @param {Object} data - Event data
   * @param {Object} metadata - Event metadata
   */
  constructor(name, data, metadata = {}) {
    this.id = randomUUID();
    this.name = name;
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata
    };

    Object.freeze(this);
  }

  /**
   * Get event age in milliseconds
   * @returns {number} Age in ms
   */
  getAge() {
    return Date.now() - new Date(this.metadata.timestamp).getTime();
  }

  /**
   * Check if event is recent
   * @param {number} thresholdMs - Threshold in milliseconds
   * @returns {boolean} True if recent
   */
  isRecent(thresholdMs = 60000) {
    return this.getAge() < thresholdMs;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      metadata: this.metadata
    };
  }

  /**
   * Create from JSON
   * @param {Object} json - JSON object
   * @returns {DomainEvent} Event instance
   */
  static fromJSON(json) {
    return new DomainEvent(json.name, json.data, json.metadata);
  }
}

/**
 * Lead Created Event
 */
export class LeadCreatedEvent extends DomainEvent {
  constructor(lead) {
    super('lead.created', {
      phoneNumber: lead.phoneNumber.value,
      name: lead.name,
      company: lead.company,
      sector: lead.sector,
      qualificationScore: lead.qualificationScore.value
    });
  }
}

/**
 * Lead Qualified Event
 */
export class LeadQualifiedEvent extends DomainEvent {
  constructor(lead) {
    super('lead.qualified', {
      phoneNumber: lead.phoneNumber.value,
      name: lead.name,
      company: lead.company,
      qualificationScore: lead.qualificationScore.value,
      bantStage: lead.bantStage.value
    });
  }
}

/**
 * Lead Disqualified Event
 */
export class LeadDisqualifiedEvent extends DomainEvent {
  constructor(lead, reason) {
    super('lead.disqualified', {
      phoneNumber: lead.phoneNumber.value,
      reason,
      qualificationScore: lead.qualificationScore.value,
      bantStage: lead.bantStage.value
    });
  }
}

/**
 * BANT Stage Changed Event
 */
export class BANTStageChangedEvent extends DomainEvent {
  constructor(lead, previousStage, newStage) {
    super('bant.stage_changed', {
      phoneNumber: lead.phoneNumber.value,
      previousStage,
      newStage,
      qualificationScore: lead.qualificationScore.value
    });
  }
}

/**
 * Qualification Score Changed Event
 */
export class QualificationScoreChangedEvent extends DomainEvent {
  constructor(lead, previousScore, newScore, change) {
    super('qualification.score_changed', {
      phoneNumber: lead.phoneNumber.value,
      previousScore,
      newScore,
      change,
      newLevel: lead.qualificationScore.getLevel()
    });
  }
}

/**
 * Message Received Event
 */
export class MessageReceivedEvent extends DomainEvent {
  constructor(phoneNumber, message) {
    super('message.received', {
      phoneNumber,
      text: message.text,
      type: message.type,
      fromMe: message.fromMe
    });
  }
}

/**
 * Message Sent Event
 */
export class MessageSentEvent extends DomainEvent {
  constructor(phoneNumber, message) {
    super('message.sent', {
      phoneNumber,
      text: message.text,
      type: message.type,
      messageId: message.id
    });
  }
}

/**
 * Conversation Started Event
 */
export class ConversationStartedEvent extends DomainEvent {
  constructor(phoneNumber) {
    super('conversation.started', {
      phoneNumber
    });
  }
}

/**
 * Conversation Ended Event
 */
export class ConversationEndedEvent extends DomainEvent {
  constructor(phoneNumber, reason) {
    super('conversation.ended', {
      phoneNumber,
      reason
    });
  }
}

/**
 * Agent Assigned Event
 */
export class AgentAssignedEvent extends DomainEvent {
  constructor(lead, previousAgent, newAgent) {
    super('agent.assigned', {
      phoneNumber: lead.phoneNumber.value,
      previousAgent,
      newAgent,
      reason: 'escalation'
    });
  }
}

export default DomainEvent;
