/**
 * @file domain/value-objects/BANTStage.js
 * @description BANTStage value object
 * Wave 3: Domain Layer - Value Objects
 */

import { ValidationError } from '../../utils/errors/index.js';

/**
 * Valid BANT stages
 */
const VALID_STAGES = [
  'pain_discovery',     // Descoberta de dor/problema
  'budget',            // Budget - Orçamento disponível
  'authority',         // Authority - Tomador de decisão
  'need',              // Need - Necessidade confirmada
  'timeline',          // Timeline - Prazo para implementação
  'qualified',         // Qualificado (passou por todos)
  'disqualified'       // Desqualificado
];

/**
 * Stage order for progression
 */
const STAGE_ORDER = {
  'pain_discovery': 0,
  'budget': 1,
  'authority': 2,
  'need': 3,
  'timeline': 4,
  'qualified': 5,
  'disqualified': -1
};

/**
 * BANTStage Value Object
 * Represents a stage in the BANT qualification process
 */
export class BANTStage {
  /**
   * @param {string} value - Stage name
   */
  constructor(value) {
    this.validate(value);
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Validate stage value
   * @param {string} value - Stage value
   */
  validate(value) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('BANT stage is required', { field: 'bant_stage' });
    }

    if (!VALID_STAGES.includes(value)) {
      throw new ValidationError(`Invalid BANT stage: ${value}`, {
        field: 'bant_stage',
        value,
        validStages: VALID_STAGES
      });
    }
  }

  /**
   * Get the value
   * @returns {string} Stage value
   */
  get value() {
    return this._value;
  }

  /**
   * Get stage display name
   * @returns {string} Display name
   */
  getDisplayName() {
    const names = {
      'pain_discovery': 'Descoberta de Dor',
      'budget': 'Budget',
      'authority': 'Authority',
      'need': 'Need',
      'timeline': 'Timeline',
      'qualified': 'Qualificado',
      'disqualified': 'Desqualificado'
    };
    return names[this._value] || this._value;
  }

  /**
   * Get stage description
   * @returns {string} Description
   */
  getDescription() {
    const descriptions = {
      'pain_discovery': 'Identificando o problema ou necessidade do lead',
      'budget': 'Verificando se há orçamento disponível',
      'authority': 'Confirmando se é o tomador de decisão',
      'need': 'Validando a necessidade da solução',
      'timeline': 'Definindo prazo para implementação',
      'qualified': 'Lead qualificado e pronto para venda',
      'disqualified': 'Lead desqualificado'
    };
    return descriptions[this._value] || '';
  }

  /**
   * Get next stage in sequence
   * @returns {BANTStage|null} Next stage or null if at end
   */
  next() {
    const currentOrder = STAGE_ORDER[this._value];

    if (currentOrder === -1 || currentOrder >= 5) {
      return null; // disqualified or qualified
    }

    const nextStage = Object.keys(STAGE_ORDER).find(
      stage => STAGE_ORDER[stage] === currentOrder + 1
    );

    return nextStage ? new BANTStage(nextStage) : null;
  }

  /**
   * Get previous stage in sequence
   * @returns {BANTStage|null} Previous stage or null if at start
   */
  previous() {
    const currentOrder = STAGE_ORDER[this._value];

    if (currentOrder <= 0 || currentOrder === -1) {
      return null;
    }

    const prevStage = Object.keys(STAGE_ORDER).find(
      stage => STAGE_ORDER[stage] === currentOrder - 1
    );

    return prevStage ? new BANTStage(prevStage) : null;
  }

  /**
   * Check if is final stage (qualified or disqualified)
   * @returns {boolean} True if final
   */
  isFinal() {
    return this._value === 'qualified' || this._value === 'disqualified';
  }

  /**
   * Check if is qualified
   * @returns {boolean} True if qualified
   */
  isQualified() {
    return this._value === 'qualified';
  }

  /**
   * Check if is disqualified
   * @returns {boolean} True if disqualified
   */
  isDisqualified() {
    return this._value === 'disqualified';
  }

  /**
   * Check if is before another stage
   * @param {BANTStage} other - Other stage
   * @returns {boolean} True if before
   */
  isBefore(other) {
    if (!(other instanceof BANTStage)) {
      throw new ValidationError('Can only compare with BANTStage instance');
    }

    const thisOrder = STAGE_ORDER[this._value];
    const otherOrder = STAGE_ORDER[other._value];

    // Disqualified is not "before" anything
    if (thisOrder === -1 || otherOrder === -1) {
      return false;
    }

    return thisOrder < otherOrder;
  }

  /**
   * Check if is after another stage
   * @param {BANTStage} other - Other stage
   * @returns {boolean} True if after
   */
  isAfter(other) {
    if (!(other instanceof BANTStage)) {
      throw new ValidationError('Can only compare with BANTStage instance');
    }

    const thisOrder = STAGE_ORDER[this._value];
    const otherOrder = STAGE_ORDER[other._value];

    // Disqualified is not "after" anything
    if (thisOrder === -1 || otherOrder === -1) {
      return false;
    }

    return thisOrder > otherOrder;
  }

  /**
   * Get progress percentage (0-100)
   * @returns {number} Progress percentage
   */
  getProgress() {
    const order = STAGE_ORDER[this._value];

    if (order === -1) return 0; // disqualified
    if (order === 5) return 100; // qualified

    // Each stage is 20% (5 stages: pain_discovery, budget, authority, need, timeline)
    return Math.round((order / 5) * 100);
  }

  /**
   * Check if equals another stage
   * @param {BANTStage} other - Other stage
   * @returns {boolean} True if equal
   */
  equals(other) {
    if (!(other instanceof BANTStage)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns {string} Stage value
   */
  toString() {
    return this._value;
  }

  /**
   * Convert to JSON
   * @returns {string} Stage value
   */
  toJSON() {
    return this._value;
  }

  /**
   * Create from value
   * @param {string} value - Stage value
   * @returns {BANTStage} Stage instance
   */
  static from(value) {
    return new BANTStage(value);
  }

  /**
   * Get initial stage
   * @returns {BANTStage} Initial stage
   */
  static initial() {
    return new BANTStage('pain_discovery');
  }

  /**
   * Get qualified stage
   * @returns {BANTStage} Qualified stage
   */
  static qualified() {
    return new BANTStage('qualified');
  }

  /**
   * Get disqualified stage
   * @returns {BANTStage} Disqualified stage
   */
  static disqualified() {
    return new BANTStage('disqualified');
  }

  /**
   * Get all valid stages
   * @returns {Array<string>} Valid stages
   */
  static getValidStages() {
    return [...VALID_STAGES];
  }
}

export default BANTStage;
