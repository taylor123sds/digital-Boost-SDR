/**
 * @file domain/value-objects/QualificationScore.js
 * @description QualificationScore value object
 * Wave 3: Domain Layer - Value Objects
 */

import { ValidationError } from '../../utils/errors/index.js';

/**
 * QualificationScore Value Object
 * Represents a lead qualification score (0-100)
 */
export class QualificationScore {
  /**
   * @param {number} value - Score value (0-100)
   */
  constructor(value) {
    this.validate(value);
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Validate score value
   * @param {number} value - Score value
   */
  validate(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError('Qualification score must be a number', {
        field: 'qualification_score',
        value
      });
    }

    if (value < 0 || value > 100) {
      throw new ValidationError('Qualification score must be between 0 and 100', {
        field: 'qualification_score',
        value
      });
    }
  }

  /**
   * Get the value
   * @returns {number} Score value
   */
  get value() {
    return this._value;
  }

  /**
   * Get qualification level
   * @returns {string} Level (low, medium, high, very_high)
   */
  getLevel() {
    if (this._value >= 80) return 'very_high';
    if (this._value >= 60) return 'high';
    if (this._value >= 40) return 'medium';
    return 'low';
  }

  /**
   * Check if qualified (>= 60)
   * @returns {boolean} True if qualified
   */
  isQualified() {
    return this._value >= 60;
  }

  /**
   * Check if highly qualified (>= 80)
   * @returns {boolean} True if highly qualified
   */
  isHighlyQualified() {
    return this._value >= 80;
  }

  /**
   * Add points to score
   * @param {number} points - Points to add
   * @returns {QualificationScore} New score instance
   */
  add(points) {
    const newValue = Math.min(100, this._value + points);
    return new QualificationScore(newValue);
  }

  /**
   * Subtract points from score
   * @param {number} points - Points to subtract
   * @returns {QualificationScore} New score instance
   */
  subtract(points) {
    const newValue = Math.max(0, this._value - points);
    return new QualificationScore(newValue);
  }

  /**
   * Set new score
   * @param {number} value - New score value
   * @returns {QualificationScore} New score instance
   */
  set(value) {
    return new QualificationScore(value);
  }

  /**
   * Compare with another score
   * @param {QualificationScore} other - Other score
   * @returns {number} -1 if less, 0 if equal, 1 if greater
   */
  compareTo(other) {
    if (!(other instanceof QualificationScore)) {
      throw new ValidationError('Can only compare with QualificationScore instance');
    }

    if (this._value < other._value) return -1;
    if (this._value > other._value) return 1;
    return 0;
  }

  /**
   * Check if equals another score
   * @param {QualificationScore} other - Other score
   * @returns {boolean} True if equal
   */
  equals(other) {
    if (!(other instanceof QualificationScore)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns {string} Score as string
   */
  toString() {
    return `${this._value}/100 (${this.getLevel()})`;
  }

  /**
   * Convert to JSON
   * @returns {number} Score value
   */
  toJSON() {
    return this._value;
  }

  /**
   * Create from value
   * @param {number} value - Score value
   * @returns {QualificationScore} Score instance
   */
  static from(value) {
    return new QualificationScore(value);
  }

  /**
   * Create zero score
   * @returns {QualificationScore} Zero score
   */
  static zero() {
    return new QualificationScore(0);
  }

  /**
   * Create maximum score
   * @returns {QualificationScore} Maximum score
   */
  static max() {
    return new QualificationScore(100);
  }
}

export default QualificationScore;
