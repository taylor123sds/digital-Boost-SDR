/**
 * @file application/use-cases/lead/QualifyLeadUseCase.js
 * @description Qualify Lead Use Case
 * Wave 5: Application Layer - Use Cases
 */

import { ValidationError } from '../../../utils/errors/index.js';
import { LeadQualifiedEvent } from '../../../infrastructure/events/index.js';

/**
 * Qualify Lead Use Case
 * Orchestrates lead qualification with validation and events
 */
export class QualifyLeadUseCase {
  /**
   * @param {Object} leadService - Lead domain service
   * @param {Object} eventBus - Event bus
   * @param {Object} logger - Logger instance
   */
  constructor(leadService, eventBus, logger) {
    this.leadService = leadService;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Execute use case
   * @param {Object} input - Input data
   * @param {string} input.phoneNumber - Phone number
   * @returns {Promise<Object>} Qualified lead
   */
  async execute(input) {
    this.logger.info('QualifyLeadUseCase: Executing', {
      phoneNumber: input.phoneNumber
    });

    // Validate input
    this.validate(input);

    try {
      // Evaluate if can be qualified
      const evaluation = await this.leadService.evaluateQualification(input.phoneNumber);

      if (!evaluation.qualified) {
        throw new ValidationError('Lead cannot be qualified', {
          reasons: evaluation.reasons,
          score: evaluation.score
        });
      }

      // Qualify lead
      const lead = await this.leadService.qualify(input.phoneNumber);

      // Publish domain event
      await this.eventBus.publish(new LeadQualifiedEvent(lead));

      this.logger.info('QualifyLeadUseCase: Lead qualified', {
        phoneNumber: lead.getId(),
        score: lead.qualificationScore.value
      });

      return this.formatOutput(lead);
    } catch (error) {
      this.logger.error('QualifyLeadUseCase: Failed', {
        phoneNumber: input.phoneNumber,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate input
   * @private
   * @param {Object} input - Input data
   */
  validate(input) {
    if (!input.phoneNumber) {
      throw new ValidationError('Phone number is required', {
        field: 'phoneNumber'
      });
    }
  }

  /**
   * Format output
   * @private
   * @param {Object} lead - Lead entity
   * @returns {Object} Formatted lead
   */
  formatOutput(lead) {
    return {
      phoneNumber: lead.phoneNumber.value,
      name: lead.name,
      company: lead.company,
      qualificationScore: lead.qualificationScore.value,
      qualificationLevel: lead.qualificationScore.getLevel(),
      bantStage: lead.bantStage.value,
      isQualified: lead.isQualified(),
      qualificationStatus: lead.getQualificationStatus()
    };
  }
}

export default QualifyLeadUseCase;
