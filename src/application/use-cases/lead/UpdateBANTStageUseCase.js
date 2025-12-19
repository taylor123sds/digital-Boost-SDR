/**
 * @file application/use-cases/lead/UpdateBANTStageUseCase.js
 * @description Update BANT Stage Use Case
 * Wave 5: Application Layer - Use Cases
 */

import { ValidationError } from '../../../utils/errors/index.js';
import { BANTStageChangedEvent } from '../../../infrastructure/events/index.js';

/**
 * Update BANT Stage Use Case
 * Orchestrates BANT stage updates with validation and events
 */
export class UpdateBANTStageUseCase {
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
   * @param {string} input.stage - BANT stage
   * @param {Object} input.stageData - Stage data
   * @returns {Promise<Object>} Updated lead
   */
  async execute(input) {
    this.logger.info('UpdateBANTStageUseCase: Executing', {
      phoneNumber: input.phoneNumber,
      stage: input.stage
    });

    // Validate input
    this.validate(input);

    try {
      // Get current lead state
      const leadBefore = await this.leadService.getByPhoneNumberOrFail(input.phoneNumber);
      const previousStage = leadBefore.bantStage.value;

      // Update BANT stage
      const result = await this.leadService.updateBANTStage(
        input.phoneNumber,
        input.stage,
        input.stageData
      );

      // Get updated lead
      const leadAfter = await this.leadService.getByPhoneNumberOrFail(input.phoneNumber);

      // Publish domain event if stage changed
      if (previousStage !== leadAfter.bantStage.value) {
        await this.eventBus.publish(
          new BANTStageChangedEvent(leadAfter, previousStage, leadAfter.bantStage.value)
        );
      }

      this.logger.info('UpdateBANTStageUseCase: Stage updated', {
        phoneNumber: input.phoneNumber,
        previousStage,
        newStage: leadAfter.bantStage.value,
        scoreChange: result.evaluation.score_adjustment
      });

      return this.formatOutput(result, leadAfter);
    } catch (error) {
      this.logger.error('UpdateBANTStageUseCase: Failed', {
        phoneNumber: input.phoneNumber,
        stage: input.stage,
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

    if (!input.stage) {
      throw new ValidationError('BANT stage is required', {
        field: 'stage'
      });
    }

    if (!input.stageData || typeof input.stageData !== 'object') {
      throw new ValidationError('Stage data must be an object', {
        field: 'stageData'
      });
    }
  }

  /**
   * Format output
   * @private
   * @param {Object} result - Update result
   * @param {Object} lead - Lead entity
   * @returns {Object} Formatted output
   */
  formatOutput(result, lead) {
    return {
      success: true,
      stage: result.stage,
      completed: result.completed,
      evaluation: result.evaluation,
      lead: {
        phoneNumber: lead.phoneNumber.value,
        qualificationScore: lead.qualificationScore.value,
        bantStage: lead.bantStage.value,
        qualificationStatus: lead.getQualificationStatus()
      }
    };
  }
}

export default UpdateBANTStageUseCase;
