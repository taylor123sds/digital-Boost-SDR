/**
 * @file domain/value-objects/PhoneNumber.js
 * @description PhoneNumber value object
 * Wave 3: Domain Layer - Value Objects
 */

import { ValidationError } from '../../utils/errors/index.js';

/**
 * PhoneNumber Value Object
 * Immutable representation of a phone number with validation
 */
export class PhoneNumber {
  /**
   * @param {string} value - Phone number string
   */
  constructor(value) {
    this.validate(value);
    this._value = this.normalize(value);
    Object.freeze(this);
  }

  /**
   * Validate phone number format
   * @param {string} value - Phone number
   */
  validate(value) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Phone number is required', { field: 'phone_number' });
    }

    // Remove all non-numeric characters for validation
    const digits = value.replace(/\D/g, '');

    // Must have at least 10 digits (minimum for valid phone)
    if (digits.length < 10) {
      throw new ValidationError('Phone number must have at least 10 digits', {
        field: 'phone_number',
        value
      });
    }

    // Maximum 15 digits (E.164 standard)
    if (digits.length > 15) {
      throw new ValidationError('Phone number cannot exceed 15 digits', {
        field: 'phone_number',
        value
      });
    }
  }

  /**
   * Normalize phone number to standard format
   * @param {string} value - Phone number
   * @returns {string} Normalized phone number
   */
  normalize(value) {
    // Remove all non-numeric and non-plus characters
    let normalized = value.replace(/[^\d+]/g, '');

    // If doesn't start with +, add +55 (Brazil) as default
    if (!normalized.startsWith('+')) {
      normalized = '+55' + normalized;
    }

    return normalized;
  }

  /**
   * Get the value
   * @returns {string} Phone number value
   */
  get value() {
    return this._value;
  }

  /**
   * Get formatted phone number (for display)
   * @returns {string} Formatted phone number
   */
  formatted() {
    const digits = this._value.replace(/\D/g, '');

    // Brazilian format: +55 (11) 99999-9999
    if (digits.startsWith('55') && digits.length === 13) {
      return `+55 (${digits.substr(2, 2)}) ${digits.substr(4, 5)}-${digits.substr(9, 4)}`;
    }

    // International format: +XX XXXXX...
    return this._value;
  }

  /**
   * Check if equals another PhoneNumber
   * @param {PhoneNumber} other - Other phone number
   * @returns {boolean} True if equal
   */
  equals(other) {
    if (!(other instanceof PhoneNumber)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns {string} Phone number
   */
  toString() {
    return this._value;
  }

  /**
   * Convert to JSON
   * @returns {string} Phone number
   */
  toJSON() {
    return this._value;
  }

  /**
   * Create from any format
   * @param {string} value - Phone number
   * @returns {PhoneNumber} PhoneNumber instance
   */
  static from(value) {
    return new PhoneNumber(value);
  }

  /**
   * Check if value is valid phone number
   * @param {string} value - Phone number
   * @returns {boolean} True if valid
   */
  static isValid(value) {
    try {
      new PhoneNumber(value);
      return true;
    } catch {
      return false;
    }
  }
}

export default PhoneNumber;
