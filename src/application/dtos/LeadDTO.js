/**
 * @file application/dtos/LeadDTO.js
 * @description Lead Data Transfer Objects
 * Wave 5: Application Layer - DTOs
 */

/**
 * Create Lead DTO
 */
export class CreateLeadDTO {
  /**
   * @param {Object} data - Raw data
   */
  constructor(data) {
    this.phoneNumber = data.phoneNumber || data.phone_number;
    this.name = data.name;
    this.company = data.company;
    this.sector = data.sector;
  }

  /**
   * Validate DTO
   * @returns {Array<string>} Validation errors
   */
  validate() {
    const errors = [];

    if (!this.phoneNumber) {
      errors.push('Phone number is required');
    }

    return errors;
  }

  /**
   * Check if valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.validate().length === 0;
  }
}

/**
 * Update BANT Stage DTO
 */
export class UpdateBANTStageDTO {
  /**
   * @param {Object} data - Raw data
   */
  constructor(data) {
    this.phoneNumber = data.phoneNumber || data.phone_number;
    this.stage = data.stage || data.bant_stage;
    this.stageData = data.stageData || data.stage_data || {};
  }

  /**
   * Validate DTO
   * @returns {Array<string>} Validation errors
   */
  validate() {
    const errors = [];

    if (!this.phoneNumber) {
      errors.push('Phone number is required');
    }

    if (!this.stage) {
      errors.push('BANT stage is required');
    }

    const validStages = ['pain_discovery', 'budget', 'authority', 'need', 'timeline'];
    if (this.stage && !validStages.includes(this.stage)) {
      errors.push(`Invalid BANT stage. Must be one of: ${validStages.join(', ')}`);
    }

    if (typeof this.stageData !== 'object') {
      errors.push('Stage data must be an object');
    }

    return errors;
  }

  /**
   * Check if valid
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.validate().length === 0;
  }
}

/**
 * Lead Response DTO
 */
export class LeadResponseDTO {
  /**
   * @param {Object} lead - Lead entity
   */
  constructor(lead) {
    this.phoneNumber = lead.phoneNumber?.value || lead.phoneNumber;
    this.name = lead.name;
    this.company = lead.company;
    this.sector = lead.sector;
    this.qualificationScore = lead.qualificationScore?.value ?? lead.qualificationScore;
    this.qualificationLevel = lead.qualificationScore?.getLevel?.() || null;
    this.bantStage = lead.bantStage?.value || lead.bantStage;
    this.bantProgress = lead.bantStage?.getProgress?.() || null;
    this.currentState = lead.currentState;
    this.currentAgent = lead.currentAgent;
    this.isQualified = lead.isQualified?.() || false;
    this.isDisqualified = lead.isDisqualified?.() || false;
    this.createdAt = lead.createdAt;
    this.updatedAt = lead.updatedAt;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      phone_number: this.phoneNumber,
      name: this.name,
      company: this.company,
      sector: this.sector,
      qualification_score: this.qualificationScore,
      qualification_level: this.qualificationLevel,
      bant_stage: this.bantStage,
      bant_progress: this.bantProgress,
      current_state: this.currentState,
      current_agent: this.currentAgent,
      is_qualified: this.isQualified,
      is_disqualified: this.isDisqualified,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }
}

export default {
  CreateLeadDTO,
  UpdateBANTStageDTO,
  LeadResponseDTO
};
