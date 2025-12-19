/**
 * @file domain/rules/LeadQualificationRules.js
 * @description Lead qualification business rules
 * Wave 3: Domain Layer - Business Rules
 */

import { BusinessRuleError } from '../../utils/errors/index.js';

/**
 * Lead Qualification Business Rules
 * Defines and validates business rules for lead qualification
 */
export class LeadQualificationRules {
  /**
   * Minimum qualification score threshold
   */
  static MIN_QUALIFICATION_SCORE = 60;

  /**
   * Maximum qualification score
   */
  static MAX_QUALIFICATION_SCORE = 100;

  /**
   * Minimum score for disqualification
   */
  static DISQUALIFICATION_THRESHOLD = 20;

  /**
   * Required BANT stages for qualification
   */
  static REQUIRED_BANT_STAGES = ['pain_discovery', 'budget', 'authority'];

  /**
   * Minimum interactions before qualification
   */
  static MIN_INTERACTIONS_FOR_QUALIFICATION = 3;

  /**
   * Maximum days of inactivity before auto-disqualification
   */
  static MAX_INACTIVITY_DAYS = 30;

  /**
   * Validate if lead can be qualified
   * @param {Lead} lead - Lead entity
   * @throws {BusinessRuleError} If cannot be qualified
   */
  static validateQualification(lead) {
    const errors = [];

    // Rule 1: Minimum score
    if (lead.qualificationScore.value < this.MIN_QUALIFICATION_SCORE) {
      errors.push(
        `Qualification score (${lead.qualificationScore.value}) is below minimum (${this.MIN_QUALIFICATION_SCORE})`
      );
    }

    // Rule 2: Required BANT stages completed
    const incompleteStages = this.REQUIRED_BANT_STAGES.filter(
      stage => !lead.isBANTStageCompleted(stage)
    );

    if (incompleteStages.length > 0) {
      errors.push(
        `Required BANT stages not completed: ${incompleteStages.join(', ')}`
      );
    }

    // Rule 3: Not already qualified or disqualified
    if (lead.isQualified()) {
      errors.push('Lead is already qualified');
    }

    if (lead.isDisqualified()) {
      errors.push('Lead is disqualified and cannot be qualified');
    }

    // Rule 4: Minimum interactions
    if (lead.interactionCount < this.MIN_INTERACTIONS_FOR_QUALIFICATION) {
      errors.push(
        `Insufficient interactions (${lead.interactionCount}/${this.MIN_INTERACTIONS_FOR_QUALIFICATION})`
      );
    }

    if (errors.length > 0) {
      throw new BusinessRuleError(
        'Lead cannot be qualified',
        {
          phoneNumber: lead.getId(),
          errors,
          currentScore: lead.qualificationScore.value,
          currentStage: lead.bantStage.value
        }
      );
    }
  }

  /**
   * Validate if lead should be disqualified
   * @param {Lead} lead - Lead entity
   * @returns {Object} Validation result
   */
  static validateDisqualification(lead) {
    const reasons = [];

    // Rule 1: Score too low
    if (lead.qualificationScore.value < this.DISQUALIFICATION_THRESHOLD) {
      reasons.push(
        `Score critically low (${lead.qualificationScore.value} < ${this.DISQUALIFICATION_THRESHOLD})`
      );
    }

    // Rule 2: No budget
    const budgetData = lead.getBANTStageData('budget');
    if (budgetData && budgetData.budget_confirmed === false) {
      reasons.push('No budget available');
    }

    // Rule 3: No authority
    const authorityData = lead.getBANTStageData('authority');
    if (authorityData && authorityData.decision_power === 'none') {
      reasons.push('No decision authority');
    }

    // Rule 4: No timeline
    const timelineData = lead.getBANTStageData('timeline');
    if (timelineData && timelineData.urgency === 'none') {
      reasons.push('No implementation timeline');
    }

    // Rule 5: Inactivity
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - lead.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction > this.MAX_INACTIVITY_DAYS) {
      reasons.push(
        `Inactive for ${daysSinceLastInteraction} days (max ${this.MAX_INACTIVITY_DAYS})`
      );
    }

    const shouldDisqualify = reasons.length >= 2; // At least 2 reasons

    return {
      should_disqualify: shouldDisqualify,
      reasons,
      confidence: shouldDisqualify ? 'high' : 'low'
    };
  }

  /**
   * Validate BANT stage transition
   * @param {Lead} lead - Lead entity
   * @param {string} targetStage - Target stage
   * @throws {BusinessRuleError} If transition is invalid
   */
  static validateStageTransition(lead, targetStage) {
    // Rule 1: Cannot move to same stage
    if (lead.bantStage.value === targetStage) {
      throw new BusinessRuleError(
        'Cannot transition to same stage',
        {
          currentStage: lead.bantStage.value,
          targetStage
        }
      );
    }

    // Rule 2: Cannot move from final stage
    if (lead.bantStage.isFinal()) {
      throw new BusinessRuleError(
        'Cannot transition from final stage',
        {
          currentStage: lead.bantStage.value,
          targetStage
        }
      );
    }

    // Rule 3: For sequential advancement, current stage must be completed
    const currentStageCompleted = lead.isBANTStageCompleted(lead.bantStage.value);

    if (!currentStageCompleted) {
      const nextStage = lead.bantStage.next();
      if (nextStage && nextStage.value === targetStage) {
        throw new BusinessRuleError(
          'Current stage must be completed before advancing',
          {
            currentStage: lead.bantStage.value,
            targetStage,
            completed: false
          }
        );
      }
    }
  }

  /**
   * Validate score adjustment
   * @param {Lead} lead - Lead entity
   * @param {number} adjustment - Score adjustment
   * @throws {BusinessRuleError} If adjustment is invalid
   */
  static validateScoreAdjustment(lead, adjustment) {
    const newScore = lead.qualificationScore.value + adjustment;

    // Rule 1: Score cannot exceed maximum
    if (newScore > this.MAX_QUALIFICATION_SCORE) {
      throw new BusinessRuleError(
        'Score adjustment would exceed maximum',
        {
          currentScore: lead.qualificationScore.value,
          adjustment,
          newScore,
          maximum: this.MAX_QUALIFICATION_SCORE
        }
      );
    }

    // Rule 2: Score cannot go below 0
    if (newScore < 0) {
      throw new BusinessRuleError(
        'Score adjustment would go below zero',
        {
          currentScore: lead.qualificationScore.value,
          adjustment,
          newScore
        }
      );
    }

    // Rule 3: Cannot adjust score of disqualified lead
    if (lead.isDisqualified()) {
      throw new BusinessRuleError(
        'Cannot adjust score of disqualified lead',
        {
          phoneNumber: lead.getId(),
          adjustment
        }
      );
    }
  }

  /**
   * Check if lead is at risk of disqualification
   * @param {Lead} lead - Lead entity
   * @returns {Object} Risk assessment
   */
  static assessDisqualificationRisk(lead) {
    let riskScore = 0;
    const factors = [];

    // Factor 1: Low score
    if (lead.qualificationScore.value < 40) {
      riskScore += 30;
      factors.push('Low qualification score');
    }

    // Factor 2: Incomplete key stages
    const keyStagesCompleted = this.REQUIRED_BANT_STAGES.filter(
      stage => lead.isBANTStageCompleted(stage)
    ).length;

    if (keyStagesCompleted < 2) {
      riskScore += 25;
      factors.push('Key BANT stages incomplete');
    }

    // Factor 3: Low engagement
    if (lead.interactionCount < 5) {
      riskScore += 20;
      factors.push('Low engagement');
    }

    // Factor 4: Inactivity
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - lead.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction > 14) {
      riskScore += 25;
      factors.push(`Inactive for ${daysSinceLastInteraction} days`);
    }

    const riskLevel = riskScore > 60 ? 'high' : (riskScore > 30 ? 'medium' : 'low');

    return {
      risk_level: riskLevel,
      risk_score: Math.min(riskScore, 100),
      factors,
      recommendation: riskLevel === 'high'
        ? 'Consider disqualifying or re-engaging'
        : (riskLevel === 'medium' ? 'Monitor closely' : 'Continue nurturing')
    };
  }

  /**
   * Validate minimum BANT stage data
   * @param {string} stage - BANT stage
   * @param {Object} stageData - Stage data
   * @throws {BusinessRuleError} If data is insufficient
   */
  static validateBANTStageData(stage, stageData) {
    const requiredFields = {
      pain_discovery: ['pain_points'],
      budget: ['budget_range'],
      authority: ['role', 'decision_power'],
      need: ['solution_fit'],
      timeline: ['implementation_timeline']
    };

    const required = requiredFields[stage];

    if (!required) {
      return; // No validation for this stage
    }

    const missing = required.filter(field => !stageData[field]);

    if (missing.length > 0) {
      throw new BusinessRuleError(
        `Missing required data for ${stage} stage`,
        {
          stage,
          missing_fields: missing,
          required_fields: required
        }
      );
    }
  }
}

export default LeadQualificationRules;
