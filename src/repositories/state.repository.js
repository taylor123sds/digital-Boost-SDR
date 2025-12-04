/**
 * @file repositories/state.repository.js
 * @description Repository for enhanced_conversation_states table
 * Wave 2: Database Layer - State Repository
 */

import { BaseRepository } from './base.repository.js';
import { NotFoundError, StateError } from '../utils/errors/index.js';

/**
 * State Repository
 * Manages conversation state data
 */
export class StateRepository extends BaseRepository {
  constructor(db, logger) {
    super(db, logger, 'enhanced_conversation_states');
  }

  /**
   * Find state by phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Object|null} State or null
   */
  findByPhone(phoneNumber) {
    try {
      const state = this.findOneBy({ phone_number: phoneNumber });

      this.logger.debug('findByPhone executed', { phoneNumber, found: !!state });
      return state;
    } catch (error) {
      this.logger.error('findByPhone failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to find state by phone', { phoneNumber });
    }
  }

  /**
   * Get or create state for phone number
   * @param {string} phoneNumber - Phone number
   * @param {Object} defaults - Default values if creating
   * @returns {Object} State record
   */
  getOrCreate(phoneNumber, defaults = {}) {
    try {
      let state = this.findByPhone(phoneNumber);

      if (!state) {
        const data = {
          phone_number: phoneNumber,
          current_state: defaults.current_state || 'DISCOVERY',
          current_agent: defaults.current_agent || 'sdr',
          bant_stage: defaults.bant_stage || 'pain_discovery',
          qualification_score: defaults.qualification_score || 0,
          sentiment_polarity: defaults.sentiment_polarity || 'neutral',
          sentiment_emotion: defaults.sentiment_emotion || 'neutral',
          sentiment_intensity: defaults.sentiment_intensity || 0.5,
          engagement_level: defaults.engagement_level || 'low',
          engagement_momentum: defaults.engagement_momentum || 'stable',
          next_best_action: defaults.next_best_action || 'continue_conversation',
          message_count: defaults.message_count || 0,
          metadata: defaults.metadata || '{}',
          bant_data: defaults.bant_data || '{}',
          bant_stages: defaults.bant_stages || '{}',
          company_profile: defaults.company_profile || '{}',
          state_transitions: defaults.state_transitions || '[]',
          handoff_history: defaults.handoff_history || '[]',
          agent_state_data: defaults.agent_state_data || '{}'
        };

        state = this.create(data);

        this.logger.info('State created for phone number', { phoneNumber });
      }

      return state;
    } catch (error) {
      this.logger.error('getOrCreate failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to get or create state', { phoneNumber });
    }
  }

  /**
   * Update state for phone number
   * @param {string} phoneNumber - Phone number
   * @param {Object} data - Data to update
   * @returns {Object} Updated state
   */
  updateByPhone(phoneNumber, data) {
    try {
      const state = this.findByPhone(phoneNumber);

      if (!state) {
        throw new NotFoundError('State', phoneNumber);
      }

      // Add updated_at timestamp
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const updated = this.update(state.id, updateData);

      this.logger.info('State updated', { phoneNumber, fields: Object.keys(data) });
      return updated;
    } catch (error) {
      this.logger.error('updateByPhone failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to update state', { phoneNumber });
    }
  }

  /**
   * Update or create state
   * @param {string} phoneNumber - Phone number
   * @param {Object} data - Data to update/create
   * @returns {Object} State record
   */
  upsert(phoneNumber, data) {
    try {
      const existing = this.findByPhone(phoneNumber);

      if (existing) {
        return this.updateByPhone(phoneNumber, data);
      }

      return this.create({
        phone_number: phoneNumber,
        ...data
      });
    } catch (error) {
      this.logger.error('upsert failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to upsert state', { phoneNumber });
    }
  }

  /**
   * Update BANT stage
   * @param {string} phoneNumber - Phone number
   * @param {string} stage - BANT stage
   * @param {Object} stageData - Stage-specific data
   * @returns {Object} Updated state
   */
  updateBANTStage(phoneNumber, stage, stageData = {}) {
    try {
      const state = this.getOrCreate(phoneNumber);

      // Parse existing BANT stages
      const bantStages = JSON.parse(state.bant_stages || '{}');
      bantStages[stage] = {
        ...stageData,
        updated_at: new Date().toISOString()
      };

      return this.updateByPhone(phoneNumber, {
        bant_stage: stage,
        bant_stages: JSON.stringify(bantStages)
      });
    } catch (error) {
      this.logger.error('updateBANTStage failed', { phoneNumber, stage, error: error.message });
      throw new StateError('Failed to update BANT stage', { phoneNumber, stage });
    }
  }

  /**
   * Update qualification score
   * @param {string} phoneNumber - Phone number
   * @param {number} score - New score
   * @returns {Object} Updated state
   */
  updateQualificationScore(phoneNumber, score) {
    try {
      return this.updateByPhone(phoneNumber, {
        qualification_score: score
      });
    } catch (error) {
      this.logger.error('updateQualificationScore failed', { phoneNumber, score, error: error.message });
      throw new StateError('Failed to update qualification score', { phoneNumber });
    }
  }

  /**
   * Increment message count
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Updated state
   */
  incrementMessageCount(phoneNumber) {
    try {
      const state = this.getOrCreate(phoneNumber);

      return this.updateByPhone(phoneNumber, {
        message_count: (state.message_count || 0) + 1
      });
    } catch (error) {
      this.logger.error('incrementMessageCount failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to increment message count', { phoneNumber });
    }
  }

  /**
   * Add state transition
   * @param {string} phoneNumber - Phone number
   * @param {string} fromState - Previous state
   * @param {string} toState - New state
   * @param {Object} metadata - Transition metadata
   * @returns {Object} Updated state
   */
  addStateTransition(phoneNumber, fromState, toState, metadata = {}) {
    try {
      const state = this.getOrCreate(phoneNumber);

      const transitions = JSON.parse(state.state_transitions || '[]');
      transitions.push({
        from: fromState,
        to: toState,
        timestamp: new Date().toISOString(),
        ...metadata
      });

      return this.updateByPhone(phoneNumber, {
        current_state: toState,
        state_transitions: JSON.stringify(transitions)
      });
    } catch (error) {
      this.logger.error('addStateTransition failed', { phoneNumber, fromState, toState, error: error.message });
      throw new StateError('Failed to add state transition', { phoneNumber });
    }
  }

  /**
   * Update sentiment
   * @param {string} phoneNumber - Phone number
   * @param {Object} sentiment - Sentiment data (polarity, emotion, intensity)
   * @returns {Object} Updated state
   */
  updateSentiment(phoneNumber, sentiment) {
    try {
      const data = {};

      if (sentiment.polarity !== undefined) data.sentiment_polarity = sentiment.polarity;
      if (sentiment.emotion !== undefined) data.sentiment_emotion = sentiment.emotion;
      if (sentiment.intensity !== undefined) data.sentiment_intensity = sentiment.intensity;

      return this.updateByPhone(phoneNumber, data);
    } catch (error) {
      this.logger.error('updateSentiment failed', { phoneNumber, sentiment, error: error.message });
      throw new StateError('Failed to update sentiment', { phoneNumber });
    }
  }

  /**
   * Update engagement
   * @param {string} phoneNumber - Phone number
   * @param {Object} engagement - Engagement data (level, momentum)
   * @returns {Object} Updated state
   */
  updateEngagement(phoneNumber, engagement) {
    try {
      const data = {};

      if (engagement.level !== undefined) data.engagement_level = engagement.level;
      if (engagement.momentum !== undefined) data.engagement_momentum = engagement.momentum;

      return this.updateByPhone(phoneNumber, data);
    } catch (error) {
      this.logger.error('updateEngagement failed', { phoneNumber, engagement, error: error.message });
      throw new StateError('Failed to update engagement', { phoneNumber });
    }
  }

  /**
   * Find states by BANT stage
   * @param {string} stage - BANT stage
   * @param {Object} options - Query options
   * @returns {Array} Matching states
   */
  findByBANTStage(stage, options = {}) {
    try {
      return this.findBy({ bant_stage: stage }, options);
    } catch (error) {
      this.logger.error('findByBANTStage failed', { stage, error: error.message });
      throw new StateError('Failed to find states by BANT stage', { stage });
    }
  }

  /**
   * Find states by current state
   * @param {string} currentState - Current state
   * @param {Object} options - Query options
   * @returns {Array} Matching states
   */
  findByCurrentState(currentState, options = {}) {
    try {
      return this.findBy({ current_state: currentState }, options);
    } catch (error) {
      this.logger.error('findByCurrentState failed', { currentState, error: error.message });
      throw new StateError('Failed to find states by current state', { currentState });
    }
  }

  /**
   * Find states by agent
   * @param {string} agent - Agent name
   * @param {Object} options - Query options
   * @returns {Array} Matching states
   */
  findByAgent(agent, options = {}) {
    try {
      return this.findBy({ current_agent: agent }, options);
    } catch (error) {
      this.logger.error('findByAgent failed', { agent, error: error.message });
      throw new StateError('Failed to find states by agent', { agent });
    }
  }

  /**
   * Find high-value leads (qualified leads with high scores)
   * @param {number} minScore - Minimum qualification score
   * @param {Object} options - Query options
   * @returns {Array} High-value leads
   */
  findHighValueLeads(minScore = 70, options = {}) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE qualification_score >= ?
        ORDER BY qualification_score DESC
      `;

      const params = [minScore];

      if (options.limit) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(options.limit, options.offset || 0);
      }

      return this.query(sql, params);
    } catch (error) {
      this.logger.error('findHighValueLeads failed', { minScore, error: error.message });
      throw new StateError('Failed to find high-value leads', { minScore });
    }
  }

  /**
   * Delete state by phone number
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if deleted
   */
  deleteByPhone(phoneNumber) {
    try {
      return this.deleteBy({ phone_number: phoneNumber }) > 0;
    } catch (error) {
      this.logger.error('deleteByPhone failed', { phoneNumber, error: error.message });
      throw new StateError('Failed to delete state', { phoneNumber });
    }
  }
}

export default StateRepository;
