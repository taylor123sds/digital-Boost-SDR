/**
 * @file application/use-cases/lead/CreateLeadUseCase.js
 * @description Create Lead Use Case
 * Wave 5: Application Layer - Use Cases
 */

import { ValidationError } from '../../../utils/errors/index.js';
import { LeadCreatedEvent } from '../../../infrastructure/events/index.js';

/**
 * Create Lead Use Case
 * Orchestrates lead creation with validation and events
 */
export class CreateLeadUseCase {
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
   * @param {string} input.name - Lead name (optional)
   * @param {string} input.company - Company name (optional)
   * @param {string} input.sector - Business sector (optional)
   * @returns {Promise<Object>} Created lead
   */
  async execute(input) {
    this.logger.info('CreateLeadUseCase: Executing', {
      phoneNumber: input.phoneNumber
    });

    // Validate input
    this.validate(input);

    try {
      // Create lead via domain service
      const lead = await this.leadService.create(input.phoneNumber, {
        name: input.name,
        company: input.company,
        sector: input.sector
      });

      // Publish domain event
      await this.eventBus.publish(new LeadCreatedEvent(lead));

      this.logger.info('CreateLeadUseCase: Lead created', {
        phoneNumber: lead.getId(),
        name: lead.name
      });

      return this.formatOutput(lead);
    } catch (error) {
      this.logger.error('CreateLeadUseCase: Failed', {
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
      sector: lead.sector,
      qualificationScore: lead.qualificationScore.value,
      bantStage: lead.bantStage.value,
      currentState: lead.currentState,
      createdAt: lead.createdAt.toISOString()
    };
  }
}

export default CreateLeadUseCase;
