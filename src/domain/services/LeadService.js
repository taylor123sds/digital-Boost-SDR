/**
 * @file domain/services/LeadService.js
 * @description Lead Domain Service
 * Wave 3: Domain Layer - Services
 */

import { Lead } from '../entities/Lead.js';
import { PhoneNumber } from '../value-objects/PhoneNumber.js';
import { ValidationError, NotFoundError } from '../../utils/errors/index.js';

/**
 * Lead Domain Service
 * Orchestrates lead operations and business logic
 */
export class LeadService {
  /**
   * @param {Object} stateRepository - State repository
   * @param {Object} bantQualificationService - BANT qualification service
   * @param {Object} logger - Logger instance
   */
  constructor(stateRepository, bantQualificationService, logger) {
    this.stateRepository = stateRepository;
    this.bantQualificationService = bantQualificationService;
    this.logger = logger;
  }

  /**
   * Get lead by phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Lead|null} Lead entity or null
   */
  async getByPhoneNumber(phoneNumber) {
    this.logger.debug('Getting lead by phone number', { phoneNumber });

    const phoneValue = new PhoneNumber(phoneNumber).value;
    const record = this.stateRepository.findByPhone(phoneValue);

    if (!record) {
      return null;
    }

    return Lead.fromDatabase(record);
  }

  /**
   * Get lead by phone number or throw error
   * @param {string} phoneNumber - Phone number
   * @returns {Lead} Lead entity
   * @throws {NotFoundError} If lead not found
   */
  async getByPhoneNumberOrFail(phoneNumber) {
    const lead = await this.getByPhoneNumber(phoneNumber);

    if (!lead) {
      throw new NotFoundError(`Lead not found: ${phoneNumber}`, {
        phoneNumber
      });
    }

    return lead;
  }

  /**
   * Create new lead
   * @param {string} phoneNumber - Phone number
   * @param {Object} data - Lead data
   * @returns {Lead} Created lead
   */
  async create(phoneNumber, data = {}) {
    this.logger.info('Creating lead', { phoneNumber, data });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    // Check if already exists
    const existing = this.stateRepository.findByPhone(phoneValue);
    if (existing) {
      throw new ValidationError('Lead already exists', {
        phoneNumber: phoneValue
      });
    }

    // Create lead entity
    const lead = Lead.create(phoneValue, data);

    // Persist to database
    const record = this.stateRepository.create(lead.toObject());

    return Lead.fromDatabase(record);
  }

  /**
   * Get or create lead
   * @param {string} phoneNumber - Phone number
   * @param {Object} defaults - Default data if creating
   * @returns {Lead} Lead entity
   */
  async getOrCreate(phoneNumber, defaults = {}) {
    this.logger.debug('Getting or creating lead', { phoneNumber });

    const phoneValue = new PhoneNumber(phoneNumber).value;

    // Try to get existing
    let lead = await this.getByPhoneNumber(phoneValue);

    if (lead) {
      return lead;
    }

    // Create new
    return await this.create(phoneValue, defaults);
  }

  /**
   * Update lead
   * @param {Lead} lead - Lead entity
   * @returns {Lead} Updated lead
   */
  async update(lead) {
    if (!(lead instanceof Lead)) {
      throw new ValidationError('Must provide Lead entity');
    }

    this.logger.debug('Updating lead', { phoneNumber: lead.getId() });

    // Update in database
    const updated = this.stateRepository.updateByPhone(
      lead.getId(),
      lead.toObject()
    );

    if (!updated) {
      throw new NotFoundError(`Lead not found: ${lead.getId()}`);
    }

    return lead;
  }

  /**
   * Save lead (create or update)
   * @param {Lead} lead - Lead entity
   * @returns {Lead} Saved lead
   */
  async save(lead) {
    if (!(lead instanceof Lead)) {
      throw new ValidationError('Must provide Lead entity');
    }

    this.logger.debug('Saving lead', { phoneNumber: lead.getId() });

    // Upsert in database
    this.stateRepository.upsert(lead.getId(), lead.toObject());

    return lead;
  }

  /**
   * Delete lead
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if deleted
   */
  async delete(phoneNumber) {
    this.logger.info('Deleting lead', { phoneNumber });

    const phoneValue = new PhoneNumber(phoneNumber).value;
    const deleted = this.stateRepository.deleteByPhone(phoneValue);

    return deleted > 0;
  }

  /**
   * Update lead's BANT stage
   * @param {string} phoneNumber - Phone number
   * @param {string} stage - BANT stage
   * @param {Object} stageData - Stage data
   * @returns {Object} Update result
   */
  async updateBANTStage(phoneNumber, stage, stageData) {
    this.logger.info('Updating BANT stage', { phoneNumber, stage });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    // Use BANT qualification service to process stage
    const result = this.bantQualificationService.processStageUpdate(
      lead,
      stage,
      stageData
    );

    // Save updated lead
    await this.save(lead);

    return {
      ...result,
      lead: lead.getQualificationStatus()
    };
  }

  /**
   * Advance lead to next BANT stage
   * @param {string} phoneNumber - Phone number
   * @param {Object} stageData - Stage data
   * @returns {Object} Advancement result
   */
  async advanceBANTStage(phoneNumber, stageData = {}) {
    this.logger.info('Advancing BANT stage', { phoneNumber });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    // Use BANT qualification service to advance
    const result = this.bantQualificationService.advanceLead(lead, stageData);

    // Save updated lead
    await this.save(lead);

    return {
      ...result,
      lead: lead.getQualificationStatus()
    };
  }

  /**
   * Update lead's qualification score
   * @param {string} phoneNumber - Phone number
   * @param {number} score - New score
   * @returns {Lead} Updated lead
   */
  async updateQualificationScore(phoneNumber, score) {
    this.logger.info('Updating qualification score', { phoneNumber, score });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);
    lead.updateQualificationScore(score);

    return await this.save(lead);
  }

  /**
   * Add qualification points
   * @param {string} phoneNumber - Phone number
   * @param {number} points - Points to add
   * @returns {Lead} Updated lead
   */
  async addQualificationPoints(phoneNumber, points) {
    this.logger.info('Adding qualification points', { phoneNumber, points });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);
    lead.addQualificationPoints(points);

    return await this.save(lead);
  }

  /**
   * Qualify lead
   * @param {string} phoneNumber - Phone number
   * @returns {Lead} Qualified lead
   */
  async qualify(phoneNumber) {
    this.logger.info('Qualifying lead', { phoneNumber });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);
    lead.qualify();

    return await this.save(lead);
  }

  /**
   * Disqualify lead
   * @param {string} phoneNumber - Phone number
   * @param {string} reason - Disqualification reason
   * @returns {Lead} Disqualified lead
   */
  async disqualify(phoneNumber, reason) {
    this.logger.info('Disqualifying lead', { phoneNumber, reason });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);
    lead.disqualify(reason);

    return await this.save(lead);
  }

  /**
   * Evaluate if lead should be qualified
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Qualification evaluation
   */
  async evaluateQualification(phoneNumber) {
    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    return this.bantQualificationService.evaluateQualification(lead);
  }

  /**
   * Evaluate if lead should be disqualified
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Disqualification evaluation
   */
  async evaluateDisqualification(phoneNumber) {
    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    return this.bantQualificationService.evaluateDisqualification(lead);
  }

  /**
   * Record lead interaction
   * @param {string} phoneNumber - Phone number
   * @returns {Lead} Updated lead
   */
  async recordInteraction(phoneNumber) {
    this.logger.debug('Recording interaction', { phoneNumber });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);
    lead.recordInteraction();

    return await this.save(lead);
  }

  /**
   * Update lead profile
   * @param {string} phoneNumber - Phone number
   * @param {Object} profile - Profile data
   * @returns {Lead} Updated lead
   */
  async updateProfile(phoneNumber, profile) {
    this.logger.info('Updating lead profile', { phoneNumber, profile });

    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    if (profile.name) lead.updateName(profile.name);
    if (profile.company) lead.updateCompany(profile.company);
    if (profile.sector) lead.updateSector(profile.sector);

    return await this.save(lead);
  }

  /**
   * Get leads by BANT stage
   * @param {string} stage - BANT stage
   * @param {Object} options - Query options
   * @returns {Array<Lead>} Leads
   */
  async getByBANTStage(stage, options = {}) {
    this.logger.debug('Getting leads by BANT stage', { stage, options });

    const records = this.stateRepository.findByBANTStage(stage, options);

    return records.map(record => Lead.fromDatabase(record));
  }

  /**
   * Get qualified leads
   * @param {Object} options - Query options
   * @returns {Array<Lead>} Qualified leads
   */
  async getQualifiedLeads(options = {}) {
    return await this.getByBANTStage('qualified', options);
  }

  /**
   * Get high-value leads
   * @param {number} minScore - Minimum qualification score
   * @param {Object} options - Query options
   * @returns {Array<Lead>} High-value leads
   */
  async getHighValueLeads(minScore = 80, options = {}) {
    this.logger.debug('Getting high-value leads', { minScore, options });

    const records = this.stateRepository.findHighValueLeads(minScore, options);

    return records.map(record => Lead.fromDatabase(record));
  }

  /**
   * Get lead statistics
   * @returns {Object} Statistics
   */
  async getStatistics() {
    this.logger.debug('Getting lead statistics');

    const allRecords = this.stateRepository.findAll();

    const stats = {
      total: allRecords.length,
      by_stage: {},
      by_score_level: {
        very_high: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      qualified: 0,
      disqualified: 0
    };

    allRecords.forEach(record => {
      const lead = Lead.fromDatabase(record);

      // Count by stage
      const stage = lead.bantStage.value;
      stats.by_stage[stage] = (stats.by_stage[stage] || 0) + 1;

      // Count by score level
      const level = lead.qualificationScore.getLevel();
      stats.by_score_level[level]++;

      // Count qualified/disqualified
      if (lead.isQualified()) stats.qualified++;
      if (lead.isDisqualified()) stats.disqualified++;
    });

    return stats;
  }

  /**
   * Calculate ICP match for lead
   * @param {string} phoneNumber - Phone number
   * @param {Object} icpCriteria - ICP criteria
   * @returns {Object} ICP match result
   */
  async calculateICPMatch(phoneNumber, icpCriteria) {
    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    const result = this.bantQualificationService.calculateICPMatch(
      lead,
      icpCriteria
    );

    // Apply score adjustment if any
    if (result.score_adjustment !== 0) {
      if (result.score_adjustment > 0) {
        lead.addQualificationPoints(result.score_adjustment);
      } else {
        lead.subtractQualificationPoints(Math.abs(result.score_adjustment));
      }

      await this.save(lead);
    }

    return {
      ...result,
      newScore: lead.qualificationScore.value
    };
  }

  /**
   * Get next stage recommendation for lead
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Recommendation
   */
  async getNextStageRecommendation(phoneNumber) {
    const lead = await this.getByPhoneNumberOrFail(phoneNumber);

    return this.bantQualificationService.getNextStageRecommendation(lead);
  }
}

export default LeadService;
