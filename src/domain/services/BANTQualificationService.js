/**
 * @file domain/services/BANTQualificationService.js
 * @description BANT Qualification Domain Service
 * Wave 3: Domain Layer - Services
 */

import { Lead } from '../entities/Lead.js';
import { BANTStage } from '../value-objects/BANTStage.js';
import { QualificationScore } from '../value-objects/QualificationScore.js';
import { BusinessRuleError, ValidationError } from '../../utils/errors/index.js';

/**
 * BANT Qualification Scoring Rules
 */
const SCORING_RULES = {
  // Pain Discovery Stage
  pain_discovery: {
    identified: 15,
    urgent: 10,
    critical: 15,
    low_priority: -5
  },

  // Budget Stage
  budget: {
    confirmed: 20,
    estimated: 15,
    flexible: 10,
    no_budget: -20
  },

  // Authority Stage
  authority: {
    decision_maker: 20,
    influencer: 10,
    technical: 5,
    no_authority: -15
  },

  // Need Stage
  need: {
    confirmed: 15,
    exploring: 10,
    not_urgent: -5
  },

  // Timeline Stage
  timeline: {
    immediate: 15,   // < 1 month
    short_term: 10,  // 1-3 months
    medium_term: 5,  // 3-6 months
    long_term: 0,    // > 6 months
    no_timeline: -10
  },

  // Engagement
  engagement: {
    responsive: 10,
    active: 5,
    passive: 0,
    unresponsive: -15
  },

  // Company Profile
  company: {
    icp_match: 15,
    partial_match: 5,
    no_match: -10
  }
};

/**
 * BANT Stage Requirements
 */
const STAGE_REQUIREMENTS = {
  pain_discovery: {
    required_fields: ['pain_points'],
    min_interactions: 2
  },
  budget: {
    required_fields: ['budget_range'],
    min_interactions: 1
  },
  authority: {
    required_fields: ['role', 'decision_power'],
    min_interactions: 1
  },
  need: {
    required_fields: ['solution_fit'],
    min_interactions: 1
  },
  timeline: {
    required_fields: ['implementation_timeline'],
    min_interactions: 1
  }
};

/**
 * BANT Qualification Domain Service
 * Handles all BANT qualification business logic
 */
export class BANTQualificationService {
  /**
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Evaluate pain discovery stage
   * @param {Lead} lead - Lead entity
   * @param {Object} painData - Pain discovery data
   * @returns {Object} Evaluation result
   */
  evaluatePainDiscovery(lead, painData) {
    this.logger.debug('Evaluating pain discovery', {
      phoneNumber: lead.getId(),
      painData
    });

    const { pain_points, urgency, severity } = painData;

    let scoreAdjustment = 0;
    const evaluation = {
      completed: false,
      score_adjustment: 0,
      reasons: []
    };

    // Check if pain is identified
    if (pain_points && pain_points.length > 0) {
      scoreAdjustment += SCORING_RULES.pain_discovery.identified;
      evaluation.reasons.push('Pain points identified');

      // Check urgency
      if (urgency === 'urgent') {
        scoreAdjustment += SCORING_RULES.pain_discovery.urgent;
        evaluation.reasons.push('Pain is urgent');
      } else if (urgency === 'critical') {
        scoreAdjustment += SCORING_RULES.pain_discovery.critical;
        evaluation.reasons.push('Pain is critical');
      } else if (urgency === 'low') {
        scoreAdjustment += SCORING_RULES.pain_discovery.low_priority;
        evaluation.reasons.push('Pain has low priority');
      }

      evaluation.completed = true;
    } else {
      evaluation.reasons.push('No pain points identified yet');
    }

    evaluation.score_adjustment = scoreAdjustment;

    return evaluation;
  }

  /**
   * Evaluate budget stage
   * @param {Lead} lead - Lead entity
   * @param {Object} budgetData - Budget data
   * @returns {Object} Evaluation result
   */
  evaluateBudget(lead, budgetData) {
    this.logger.debug('Evaluating budget', {
      phoneNumber: lead.getId(),
      budgetData
    });

    const { budget_confirmed, budget_range, flexibility } = budgetData;

    let scoreAdjustment = 0;
    const evaluation = {
      completed: false,
      score_adjustment: 0,
      reasons: []
    };

    if (budget_confirmed === true) {
      scoreAdjustment += SCORING_RULES.budget.confirmed;
      evaluation.reasons.push('Budget confirmed');
      evaluation.completed = true;
    } else if (budget_range) {
      scoreAdjustment += SCORING_RULES.budget.estimated;
      evaluation.reasons.push('Budget estimated');
      evaluation.completed = true;
    } else if (budget_confirmed === false) {
      scoreAdjustment += SCORING_RULES.budget.no_budget;
      evaluation.reasons.push('No budget available');
      evaluation.completed = true;
    }

    // Check flexibility
    if (flexibility === 'flexible') {
      scoreAdjustment += SCORING_RULES.budget.flexible;
      evaluation.reasons.push('Budget is flexible');
    }

    evaluation.score_adjustment = scoreAdjustment;

    return evaluation;
  }

  /**
   * Evaluate authority stage
   * @param {Lead} lead - Lead entity
   * @param {Object} authorityData - Authority data
   * @returns {Object} Evaluation result
   */
  evaluateAuthority(lead, authorityData) {
    this.logger.debug('Evaluating authority', {
      phoneNumber: lead.getId(),
      authorityData
    });

    const { role, decision_power, decision_maker } = authorityData;

    let scoreAdjustment = 0;
    const evaluation = {
      completed: false,
      score_adjustment: 0,
      reasons: []
    };

    if (decision_maker === true || decision_power === 'final') {
      scoreAdjustment += SCORING_RULES.authority.decision_maker;
      evaluation.reasons.push('Is decision maker');
      evaluation.completed = true;
    } else if (decision_power === 'influencer') {
      scoreAdjustment += SCORING_RULES.authority.influencer;
      evaluation.reasons.push('Has influence on decision');
      evaluation.completed = true;
    } else if (decision_power === 'technical') {
      scoreAdjustment += SCORING_RULES.authority.technical;
      evaluation.reasons.push('Technical authority only');
      evaluation.completed = true;
    } else if (decision_power === 'none') {
      scoreAdjustment += SCORING_RULES.authority.no_authority;
      evaluation.reasons.push('No decision authority');
      evaluation.completed = true;
    }

    evaluation.score_adjustment = scoreAdjustment;

    return evaluation;
  }

  /**
   * Evaluate need stage
   * @param {Lead} lead - Lead entity
   * @param {Object} needData - Need data
   * @returns {Object} Evaluation result
   */
  evaluateNeed(lead, needData) {
    this.logger.debug('Evaluating need', {
      phoneNumber: lead.getId(),
      needData
    });

    const { solution_fit, urgency } = needData;

    let scoreAdjustment = 0;
    const evaluation = {
      completed: false,
      score_adjustment: 0,
      reasons: []
    };

    if (solution_fit === 'confirmed') {
      scoreAdjustment += SCORING_RULES.need.confirmed;
      evaluation.reasons.push('Solution fit confirmed');
      evaluation.completed = true;
    } else if (solution_fit === 'exploring') {
      scoreAdjustment += SCORING_RULES.need.exploring;
      evaluation.reasons.push('Exploring solutions');
      evaluation.completed = true;
    } else if (urgency === 'not_urgent') {
      scoreAdjustment += SCORING_RULES.need.not_urgent;
      evaluation.reasons.push('Need is not urgent');
      evaluation.completed = true;
    }

    evaluation.score_adjustment = scoreAdjustment;

    return evaluation;
  }

  /**
   * Evaluate timeline stage
   * @param {Lead} lead - Lead entity
   * @param {Object} timelineData - Timeline data
   * @returns {Object} Evaluation result
   */
  evaluateTimeline(lead, timelineData) {
    this.logger.debug('Evaluating timeline', {
      phoneNumber: lead.getId(),
      timelineData
    });

    const { implementation_timeline, urgency } = timelineData;

    let scoreAdjustment = 0;
    const evaluation = {
      completed: false,
      score_adjustment: 0,
      reasons: []
    };

    if (implementation_timeline) {
      evaluation.completed = true;

      if (urgency === 'immediate' || implementation_timeline === '< 1 month') {
        scoreAdjustment += SCORING_RULES.timeline.immediate;
        evaluation.reasons.push('Immediate timeline (< 1 month)');
      } else if (implementation_timeline === '1-3 months') {
        scoreAdjustment += SCORING_RULES.timeline.short_term;
        evaluation.reasons.push('Short-term timeline (1-3 months)');
      } else if (implementation_timeline === '3-6 months') {
        scoreAdjustment += SCORING_RULES.timeline.medium_term;
        evaluation.reasons.push('Medium-term timeline (3-6 months)');
      } else {
        scoreAdjustment += SCORING_RULES.timeline.long_term;
        evaluation.reasons.push('Long-term timeline (> 6 months)');
      }
    } else if (urgency === 'none') {
      scoreAdjustment += SCORING_RULES.timeline.no_timeline;
      evaluation.reasons.push('No timeline defined');
      evaluation.completed = true;
    }

    evaluation.score_adjustment = scoreAdjustment;

    return evaluation;
  }

  /**
   * Process BANT stage update
   * @param {Lead} lead - Lead entity
   * @param {string} stage - BANT stage
   * @param {Object} stageData - Stage data
   * @returns {Object} Update result with score adjustment
   */
  processStageUpdate(lead, stage, stageData) {
    this.logger.info('Processing BANT stage update', {
      phoneNumber: lead.getId(),
      stage,
      stageData
    });

    let evaluation;

    switch (stage) {
      case 'pain_discovery':
        evaluation = this.evaluatePainDiscovery(lead, stageData);
        break;
      case 'budget':
        evaluation = this.evaluateBudget(lead, stageData);
        break;
      case 'authority':
        evaluation = this.evaluateAuthority(lead, stageData);
        break;
      case 'need':
        evaluation = this.evaluateNeed(lead, stageData);
        break;
      case 'timeline':
        evaluation = this.evaluateTimeline(lead, stageData);
        break;
      default:
        throw new ValidationError(`Unknown BANT stage: ${stage}`, {
          field: 'stage',
          value: stage
        });
    }

    // Update lead
    lead.updateBANTStageData(stage, {
      ...stageData,
      completed: evaluation.completed,
      evaluated_at: new Date().toISOString()
    });

    // Apply score adjustment
    if (evaluation.score_adjustment !== 0) {
      if (evaluation.score_adjustment > 0) {
        lead.addQualificationPoints(evaluation.score_adjustment);
      } else {
        lead.subtractQualificationPoints(Math.abs(evaluation.score_adjustment));
      }
    }

    // Mark stage as completed if evaluation says so
    if (evaluation.completed) {
      lead.completeBANTStage(stage);
    }

    return {
      stage,
      evaluation,
      newScore: lead.qualificationScore.value,
      completed: evaluation.completed
    };
  }

  /**
   * Advance lead through BANT stages
   * @param {Lead} lead - Lead entity
   * @param {Object} stageData - Data for current stage
   * @returns {Object} Advancement result
   */
  advanceLead(lead, stageData = {}) {
    this.logger.info('Advancing lead through BANT', {
      phoneNumber: lead.getId(),
      currentStage: lead.bantStage.value
    });

    // Process current stage first
    const currentStageResult = this.processStageUpdate(
      lead,
      lead.bantStage.value,
      stageData
    );

    // Check if can advance
    if (!currentStageResult.completed) {
      return {
        advanced: false,
        reason: 'Current stage not completed',
        currentStage: lead.bantStage.value,
        result: currentStageResult
      };
    }

    // Try to advance
    try {
      const previousStage = lead.bantStage.value;
      lead.advanceBANTStage(stageData);

      return {
        advanced: true,
        previousStage,
        newStage: lead.bantStage.value,
        result: currentStageResult
      };
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return {
          advanced: false,
          reason: error.message,
          currentStage: lead.bantStage.value,
          result: currentStageResult
        };
      }
      throw error;
    }
  }

  /**
   * Evaluate if lead should be qualified
   * @param {Lead} lead - Lead entity
   * @returns {Object} Qualification evaluation
   */
  evaluateQualification(lead) {
    this.logger.info('Evaluating qualification', {
      phoneNumber: lead.getId(),
      score: lead.qualificationScore.value,
      stage: lead.bantStage.value
    });

    const canQualify = lead.canBeQualified();

    if (canQualify) {
      return {
        qualified: true,
        score: lead.qualificationScore.value,
        stage: lead.bantStage.value,
        recommendation: 'QUALIFY',
        reasons: ['Meets qualification criteria']
      };
    }

    const reason = lead.getDisqualificationReason();

    return {
      qualified: false,
      score: lead.qualificationScore.value,
      stage: lead.bantStage.value,
      recommendation: 'CONTINUE_QUALIFICATION',
      reasons: [reason]
    };
  }

  /**
   * Evaluate if lead should be disqualified
   * @param {Lead} lead - Lead entity
   * @returns {Object} Disqualification evaluation
   */
  evaluateDisqualification(lead) {
    this.logger.info('Evaluating disqualification', {
      phoneNumber: lead.getId(),
      score: lead.qualificationScore.value
    });

    const reasons = [];

    // Score too low
    if (lead.qualificationScore.value < 20) {
      reasons.push('Qualification score critically low (< 20)');
    }

    // No budget
    const budgetData = lead.getBANTStageData('budget');
    if (budgetData && budgetData.budget_confirmed === false) {
      reasons.push('No budget available');
    }

    // No authority
    const authorityData = lead.getBANTStageData('authority');
    if (authorityData && authorityData.decision_power === 'none') {
      reasons.push('No decision authority');
    }

    // No timeline
    const timelineData = lead.getBANTStageData('timeline');
    if (timelineData && timelineData.urgency === 'none') {
      reasons.push('No implementation timeline');
    }

    const shouldDisqualify = reasons.length >= 2; // At least 2 disqualifying factors

    return {
      disqualified: shouldDisqualify,
      score: lead.qualificationScore.value,
      recommendation: shouldDisqualify ? 'DISQUALIFY' : 'CONTINUE',
      reasons
    };
  }

  /**
   * Calculate ICP (Ideal Customer Profile) match score
   * @param {Lead} lead - Lead entity
   * @param {Object} icpCriteria - ICP criteria
   * @returns {Object} ICP match result
   */
  calculateICPMatch(lead, icpCriteria) {
    this.logger.debug('Calculating ICP match', {
      phoneNumber: lead.getId(),
      icpCriteria
    });

    let matchScore = 0;
    const matches = [];
    const mismatches = [];

    // Check sector match
    if (icpCriteria.sectors && lead.sector) {
      if (icpCriteria.sectors.includes(lead.sector)) {
        matchScore += SCORING_RULES.company.icp_match;
        matches.push('Sector matches ICP');
      } else {
        matchScore += SCORING_RULES.company.no_match;
        mismatches.push('Sector does not match ICP');
      }
    }

    // Check company size (from metadata)
    if (icpCriteria.company_sizes && lead.metadata.company_size) {
      if (icpCriteria.company_sizes.includes(lead.metadata.company_size)) {
        matchScore += SCORING_RULES.company.partial_match;
        matches.push('Company size matches');
      }
    }

    const matchLevel = matchScore > 0 ? 'match' : (matchScore < 0 ? 'no_match' : 'unknown');

    return {
      score_adjustment: matchScore,
      match_level: matchLevel,
      matches,
      mismatches
    };
  }

  /**
   * Get next recommended stage for lead
   * @param {Lead} lead - Lead entity
   * @returns {Object} Recommendation
   */
  getNextStageRecommendation(lead) {
    const currentStage = lead.bantStage.value;

    // If final stage, no recommendation
    if (lead.bantStage.isFinal()) {
      return {
        hasRecommendation: false,
        reason: 'Lead is in final stage'
      };
    }

    // Check if current stage is completed
    const isCurrentCompleted = lead.isBANTStageCompleted(currentStage);

    if (!isCurrentCompleted) {
      return {
        hasRecommendation: true,
        stage: currentStage,
        action: 'COMPLETE_CURRENT',
        message: `Complete ${currentStage} stage before advancing`
      };
    }

    // Recommend next stage
    const nextStage = lead.bantStage.next();

    return {
      hasRecommendation: true,
      stage: nextStage?.value,
      action: 'ADVANCE',
      message: `Advance to ${nextStage?.getDisplayName()}`
    };
  }
}

export default BANTQualificationService;
