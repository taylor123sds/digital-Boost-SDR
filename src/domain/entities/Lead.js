/**
 * @file domain/entities/Lead.js
 * @description Lead entity - Core domain aggregate root
 * Wave 3: Domain Layer - Entities
 */

import { PhoneNumber } from '../value-objects/PhoneNumber.js';
import { QualificationScore } from '../value-objects/QualificationScore.js';
import { BANTStage } from '../value-objects/BANTStage.js';
import { ValidationError, BusinessRuleError } from '../../utils/errors/index.js';

/**
 * Lead Entity
 * Aggregate root for lead qualification process
 */
export class Lead {
  /**
   * @param {Object} props - Lead properties
   * @param {string|PhoneNumber} props.phoneNumber - Phone number
   * @param {string} props.name - Lead name
   * @param {string} props.company - Company name
   * @param {string|BANTStage} props.bantStage - Current BANT stage
   * @param {number|QualificationScore} props.qualificationScore - Qualification score
   * @param {Object} props.bantData - BANT stage data
   * @param {string} props.sector - Business sector
   * @param {string} props.currentAgent - Current agent handling lead
   * @param {string} props.currentState - Current conversation state
   * @param {Object} props.metadata - Additional metadata
   */
  constructor(props) {
    this.validateProps(props);

    // Value objects
    this.phoneNumber = props.phoneNumber instanceof PhoneNumber
      ? props.phoneNumber
      : new PhoneNumber(props.phoneNumber);

    this.bantStage = props.bantStage instanceof BANTStage
      ? props.bantStage
      : new BANTStage(props.bantStage || 'pain_discovery');

    this.qualificationScore = props.qualificationScore instanceof QualificationScore
      ? props.qualificationScore
      : new QualificationScore(props.qualificationScore || 0);

    // Primitive properties
    this.name = props.name || null;
    this.company = props.company || null;
    this.sector = props.sector || null;
    this.currentAgent = props.currentAgent || 'sdr';
    this.currentState = props.currentState || 'DISCOVERY';

    // Complex data
    this.bantData = props.bantData || {};
    this.metadata = props.metadata || {};

    // Timestamps
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
    this.lastInteractionAt = props.lastInteractionAt ? new Date(props.lastInteractionAt) : new Date();

    // Counters
    this.messageCount = props.messageCount || 0;
    this.interactionCount = props.interactionCount || 0;
  }

  /**
   * Validate constructor properties
   * @param {Object} props - Properties to validate
   */
  validateProps(props) {
    if (!props) {
      throw new ValidationError('Lead props are required');
    }

    if (!props.phoneNumber) {
      throw new ValidationError('Phone number is required for Lead', {
        field: 'phoneNumber'
      });
    }
  }

  /**
   * Get lead's unique identifier (phone number)
   * @returns {string} Phone number
   */
  getId() {
    return this.phoneNumber.value;
  }

  /**
   * Update lead's name
   * @param {string} name - New name
   * @returns {Lead} This lead (for chaining)
   */
  updateName(name) {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Name must be a non-empty string', { field: 'name' });
    }
    this.name = name.trim();
    this.touch();
    return this;
  }

  /**
   * Update lead's company
   * @param {string} company - New company name
   * @returns {Lead} This lead (for chaining)
   */
  updateCompany(company) {
    if (!company || typeof company !== 'string') {
      throw new ValidationError('Company must be a non-empty string', { field: 'company' });
    }
    this.company = company.trim();
    this.touch();
    return this;
  }

  /**
   * Update lead's sector
   * @param {string} sector - Business sector
   * @returns {Lead} This lead (for chaining)
   */
  updateSector(sector) {
    if (!sector || typeof sector !== 'string') {
      throw new ValidationError('Sector must be a non-empty string', { field: 'sector' });
    }
    this.sector = sector.trim();
    this.touch();
    return this;
  }

  /**
   * Advance to next BANT stage
   * @param {Object} stageData - Data to store for current stage
   * @returns {Lead} This lead (for chaining)
   */
  advanceBANTStage(stageData = {}) {
    if (this.bantStage.isFinal()) {
      throw new BusinessRuleError(
        'Cannot advance from final BANT stage',
        { currentStage: this.bantStage.value }
      );
    }

    const nextStage = this.bantStage.next();
    if (!nextStage) {
      throw new BusinessRuleError(
        'No next BANT stage available',
        { currentStage: this.bantStage.value }
      );
    }

    // Store data for current stage before advancing
    this.updateBANTStageData(this.bantStage.value, stageData);

    // Advance to next stage
    this.bantStage = nextStage;
    this.touch();

    return this;
  }

  /**
   * Move to specific BANT stage
   * @param {string|BANTStage} stage - Target stage
   * @param {Object} stageData - Data for the stage
   * @returns {Lead} This lead (for chaining)
   */
  moveToBANTStage(stage, stageData = {}) {
    const targetStage = stage instanceof BANTStage ? stage : new BANTStage(stage);

    this.bantStage = targetStage;
    this.updateBANTStageData(targetStage.value, stageData);
    this.touch();

    return this;
  }

  /**
   * Update data for specific BANT stage
   * @param {string} stage - Stage name
   * @param {Object} data - Data to store
   * @returns {Lead} This lead (for chaining)
   */
  updateBANTStageData(stage, data) {
    if (!BANTStage.getValidStages().includes(stage)) {
      throw new ValidationError(`Invalid BANT stage: ${stage}`, {
        field: 'stage',
        validStages: BANTStage.getValidStages()
      });
    }

    this.bantData[stage] = {
      ...this.bantData[stage],
      ...data,
      updated_at: new Date().toISOString()
    };

    this.touch();
    return this;
  }

  /**
   * Get data for specific BANT stage
   * @param {string} stage - Stage name
   * @returns {Object|null} Stage data or null
   */
  getBANTStageData(stage) {
    return this.bantData[stage] || null;
  }

  /**
   * Check if BANT stage is completed
   * @param {string} stage - Stage to check
   * @returns {boolean} True if completed
   */
  isBANTStageCompleted(stage) {
    const stageData = this.getBANTStageData(stage);
    return stageData && stageData.completed === true;
  }

  /**
   * Mark BANT stage as completed
   * @param {string} stage - Stage to complete
   * @returns {Lead} This lead (for chaining)
   */
  completeBANTStage(stage) {
    this.updateBANTStageData(stage, { completed: true });
    return this;
  }

  /**
   * Update qualification score
   * @param {number|QualificationScore} score - New score
   * @returns {Lead} This lead (for chaining)
   */
  updateQualificationScore(score) {
    this.qualificationScore = score instanceof QualificationScore
      ? score
      : new QualificationScore(score);

    this.touch();
    return this;
  }

  /**
   * Add points to qualification score
   * @param {number} points - Points to add
   * @returns {Lead} This lead (for chaining)
   */
  addQualificationPoints(points) {
    this.qualificationScore = this.qualificationScore.add(points);
    this.touch();
    return this;
  }

  /**
   * Subtract points from qualification score
   * @param {number} points - Points to subtract
   * @returns {Lead} This lead (for chaining)
   */
  subtractQualificationPoints(points) {
    this.qualificationScore = this.qualificationScore.subtract(points);
    this.touch();
    return this;
  }

  /**
   * Qualify the lead
   * @returns {Lead} This lead (for chaining)
   */
  qualify() {
    if (!this.canBeQualified()) {
      throw new BusinessRuleError(
        'Lead cannot be qualified yet',
        {
          score: this.qualificationScore.value,
          stage: this.bantStage.value,
          reason: this.getDisqualificationReason()
        }
      );
    }

    this.bantStage = BANTStage.qualified();
    this.touch();

    return this;
  }

  /**
   * Disqualify the lead
   * @param {string} reason - Disqualification reason
   * @returns {Lead} This lead (for chaining)
   */
  disqualify(reason) {
    if (!reason || typeof reason !== 'string') {
      throw new ValidationError('Disqualification reason is required', {
        field: 'reason'
      });
    }

    this.bantStage = BANTStage.disqualified();
    this.metadata.disqualification_reason = reason;
    this.metadata.disqualified_at = new Date().toISOString();
    this.touch();

    return this;
  }

  /**
   * Check if lead can be qualified
   * @returns {boolean} True if can be qualified
   */
  canBeQualified() {
    // Must have minimum qualification score
    if (!this.qualificationScore.isQualified()) {
      return false;
    }

    // Must have completed key BANT stages
    const requiredStages = ['pain_discovery', 'budget', 'authority'];
    const completedRequired = requiredStages.every(stage =>
      this.isBANTStageCompleted(stage)
    );

    return completedRequired;
  }

  /**
   * Get reason why lead cannot be qualified
   * @returns {string|null} Reason or null if can be qualified
   */
  getDisqualificationReason() {
    if (!this.qualificationScore.isQualified()) {
      return `Qualification score too low (${this.qualificationScore.value}/100, minimum 60)`;
    }

    const requiredStages = ['pain_discovery', 'budget', 'authority'];
    const incompleteStages = requiredStages.filter(stage =>
      !this.isBANTStageCompleted(stage)
    );

    if (incompleteStages.length > 0) {
      return `Incomplete BANT stages: ${incompleteStages.join(', ')}`;
    }

    return null;
  }

  /**
   * Check if lead is qualified
   * @returns {boolean} True if qualified
   */
  isQualified() {
    return this.bantStage.isQualified();
  }

  /**
   * Check if lead is disqualified
   * @returns {boolean} True if disqualified
   */
  isDisqualified() {
    return this.bantStage.isDisqualified();
  }

  /**
   * Update current agent
   * @param {string} agent - Agent identifier
   * @returns {Lead} This lead (for chaining)
   */
  assignToAgent(agent) {
    if (!agent || typeof agent !== 'string') {
      throw new ValidationError('Agent must be a non-empty string', { field: 'agent' });
    }

    this.currentAgent = agent;
    this.touch();

    return this;
  }

  /**
   * Update current state
   * @param {string} state - New state
   * @returns {Lead} This lead (for chaining)
   */
  updateState(state) {
    if (!state || typeof state !== 'string') {
      throw new ValidationError('State must be a non-empty string', { field: 'state' });
    }

    this.currentState = state;
    this.touch();

    return this;
  }

  /**
   * Record a new interaction
   * @returns {Lead} This lead (for chaining)
   */
  recordInteraction() {
    this.interactionCount += 1;
    this.messageCount += 1;
    this.lastInteractionAt = new Date();
    this.touch();

    return this;
  }

  /**
   * Update metadata
   * @param {Object} metadata - Metadata to merge
   * @returns {Lead} This lead (for chaining)
   */
  updateMetadata(metadata) {
    if (typeof metadata !== 'object' || metadata === null) {
      throw new ValidationError('Metadata must be an object', { field: 'metadata' });
    }

    this.metadata = { ...this.metadata, ...metadata };
    this.touch();

    return this;
  }

  /**
   * Touch the entity (update timestamp)
   */
  touch() {
    this.updatedAt = new Date();
  }

  /**
   * Get lead's full qualification status
   * @returns {Object} Status object
   */
  getQualificationStatus() {
    return {
      stage: this.bantStage.value,
      stageDisplay: this.bantStage.getDisplayName(),
      score: this.qualificationScore.value,
      scoreLevel: this.qualificationScore.getLevel(),
      progress: this.bantStage.getProgress(),
      isQualified: this.isQualified(),
      isDisqualified: this.isDisqualified(),
      canBeQualified: this.canBeQualified(),
      disqualificationReason: this.getDisqualificationReason(),
      completedStages: Object.keys(this.bantData).filter(stage =>
        this.isBANTStageCompleted(stage)
      )
    };
  }

  /**
   * Convert to plain object (for persistence)
   * @returns {Object} Plain object representation
   */
  toObject() {
    // Store lead profile in company_profile JSON field
    const companyProfile = {
      name: this.name,
      company: this.company,
      sector: this.sector
    };

    return {
      phone_number: this.phoneNumber.value,
      current_agent: this.currentAgent,
      current_state: this.currentState,
      bant_stage: this.bantStage.value,
      bant_stages: JSON.stringify(this.bantData),
      qualification_score: this.qualificationScore.value,
      message_count: this.messageCount,
      company_profile: JSON.stringify(companyProfile),
      metadata: JSON.stringify(this.metadata),
      updated_at: this.updatedAt.toISOString()
    };
  }

  /**
   * Create from database record
   * @param {Object} record - Database record
   * @returns {Lead} Lead instance
   */
  static fromDatabase(record) {
    // Parse company_profile JSON field
    const companyProfile = record.company_profile
      ? JSON.parse(record.company_profile)
      : {};

    return new Lead({
      phoneNumber: record.phone_number,
      name: companyProfile.name || null,
      company: companyProfile.company || null,
      sector: companyProfile.sector || null,
      currentAgent: record.current_agent,
      currentState: record.current_state,
      bantStage: record.bant_stage,
      qualificationScore: record.qualification_score || 0,
      bantData: record.bant_stages ? JSON.parse(record.bant_stages) : {},
      metadata: record.metadata ? JSON.parse(record.metadata) : {},
      messageCount: record.message_count || 0,
      interactionCount: 0,  // Not stored in DB currently
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      lastInteractionAt: record.updated_at  // Use updated_at as fallback
    });
  }

  /**
   * Create new lead
   * @param {string} phoneNumber - Phone number
   * @param {Object} props - Additional properties
   * @returns {Lead} New lead instance
   */
  static create(phoneNumber, props = {}) {
    return new Lead({
      phoneNumber,
      ...props,
      bantStage: props.bantStage || 'pain_discovery',
      qualificationScore: props.qualificationScore || 0,
      currentAgent: props.currentAgent || 'sdr',
      currentState: props.currentState || 'DISCOVERY'
    });
  }
}

export default Lead;
