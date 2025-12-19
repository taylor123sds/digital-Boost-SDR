/**
 * @file config/index.js
 * @description Centralized configuration system for LEADLY agent
 * Wave 1: Foundation Layer - Configuration Module
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Configuration validation schema
 * Defines required and optional configuration keys
 */
const CONFIG_SCHEMA = {
  required: {
    OPENAI_API_KEY: 'OpenAI API key is required for AI functionality',
    JWT_SECRET: 'JWT secret is required for authentication'
  },
  optional: {
    PORT: '3000',
    PIPELINE_TIMEOUT_MS: '8000',
    OPENAI_CHAT_MODEL: 'gpt-4o-mini',
    OPENAI_EMB_MODEL: 'text-embedding-3-small',
    EVOLUTION_BASE_URL: 'http://localhost:8080',
    EVOLUTION_API_KEY: '',
    EVOLUTION_INSTANCE: 'digitalboost',
    LEADS_FILE: 'data/leads.xlsx',
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    DATABASE_PATH: './orbion.db',
    MAX_RETRIES: '3',
    REQUEST_TIMEOUT: '30000'
  }
};

/**
 * Configuration validation errors
 */
export class ConfigurationError extends Error {
  constructor(message, missingKeys = []) {
    super(message);
    this.name = 'ConfigurationError';
    this.missingKeys = missingKeys;
  }
}

/**
 * Validates configuration against schema
 * @throws {ConfigurationError} If required keys are missing
 */
function validateConfig() {
  const missingKeys = [];

  for (const [key, errorMessage] of Object.entries(CONFIG_SCHEMA.required)) {
    if (!process.env[key]) {
      missingKeys.push({ key, message: errorMessage });
    }
  }

  if (missingKeys.length > 0) {
    const errorMessages = missingKeys.map(({ key, message }) => `  - ${key}: ${message}`).join('\n');
    throw new ConfigurationError(
      `Missing required configuration:\n${errorMessages}\n\nPlease check your .env file.`,
      missingKeys.map(k => k.key)
    );
  }
}

/**
 * Gets a configuration value with optional default
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key is not set
 * @returns {*} Configuration value
 */
function get(key, defaultValue = undefined) {
  const value = process.env[key];

  if (value === undefined) {
    // Check if key has a default in schema
    if (CONFIG_SCHEMA.optional[key] !== undefined) {
      return CONFIG_SCHEMA.optional[key];
    }
    return defaultValue;
  }

  return value;
}

/**
 * Gets a configuration value as integer
 * @param {string} key - Configuration key
 * @param {number} defaultValue - Default value if key is not set or invalid
 * @returns {number} Integer value
 */
function getInt(key, defaultValue = 0) {
  const value = get(key);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Gets a configuration value as boolean
 * @param {string} key - Configuration key
 * @param {boolean} defaultValue - Default value if key is not set
 * @returns {boolean} Boolean value
 */
function getBool(key, defaultValue = false) {
  const value = get(key);
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Configuration object with typed accessors
 */
export const config = {
  // Environment
  env: get('NODE_ENV', 'development'),
  isDevelopment: get('NODE_ENV', 'development') === 'development',
  isProduction: get('NODE_ENV', 'development') === 'production',
  isTest: get('NODE_ENV', 'development') === 'test',

  // Server
  server: {
    port: getInt('PORT', 3001),
    requestTimeout: getInt('REQUEST_TIMEOUT', 30000),
    pipelineTimeout: getInt('PIPELINE_TIMEOUT_MS', 8000),
    maxRetries: getInt('MAX_RETRIES', 3)
  },

  // OpenAI
  openai: {
    apiKey: get('OPENAI_API_KEY'),
    chatModel: get('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
    embeddingModel: get('OPENAI_EMB_MODEL', 'text-embedding-3-small'),
    maxTokens: getInt('OPENAI_MAX_TOKENS', 4096),
    temperature: parseFloat(get('OPENAI_TEMPERATURE', '0.7'))
  },

  // Evolution API (WhatsApp)
  evolution: {
    baseUrl: get('EVOLUTION_BASE_URL', 'http://localhost:8080'),
    apiKey: get('EVOLUTION_API_KEY'),
    instance: get('EVOLUTION_INSTANCE', 'digitalboost'),
    enabled: getBool('EVOLUTION_ENABLED', true)
  },

  // Database
  database: {
    path: get('DATABASE_PATH', './orbion.db'),
    enableWAL: getBool('DATABASE_WAL', true),
    timeout: getInt('DATABASE_TIMEOUT', 5000)
  },

  // Logging
  logging: {
    level: get('LOG_LEVEL', 'info'),
    fileEnabled: getBool('LOG_FILE_ENABLED', true),
    filePath: get('LOG_FILE_PATH', './logs/orbion.log'),
    maxSize: get('LOG_MAX_SIZE', '10m'),
    maxFiles: getInt('LOG_MAX_FILES', 5)
  },

  // Features
  features: {
    leadsFile: get('LEADS_FILE', 'data/leads.xlsx'),
    enableScheduling: getBool('ENABLE_SCHEDULING', true),
    enableCampaigns: getBool('ENABLE_CAMPAIGNS', true),
    enableRAG: getBool('ENABLE_RAG', true)
  },

  // Security
  security: {
    rateLimitWindow: getInt('RATE_LIMIT_WINDOW', 60000),
    rateLimitMax: getInt('RATE_LIMIT_MAX', 100),
    enableBlacklist: getBool('ENABLE_BLACKLIST', true)
  },

  // Utilities
  get,
  getInt,
  getBool,

  /**
   * Validates all required configuration
   * @throws {ConfigurationError} If validation fails
   */
  validate() {
    validateConfig();
  },

  /**
   * Gets all configuration as plain object (for debugging)
   * Sensitive values are masked
   */
  toObject() {
    const mask = (value) => {
      if (!value) return value;
      if (value.length <= 8) return '***';
      return value.substring(0, 4) + '***' + value.substring(value.length - 4);
    };

    return {
      env: this.env,
      server: this.server,
      openai: {
        ...this.openai,
        apiKey: mask(this.openai.apiKey)
      },
      evolution: {
        ...this.evolution,
        apiKey: mask(this.evolution.apiKey)
      },
      database: this.database,
      logging: this.logging,
      features: this.features,
      security: this.security
    };
  }
};

// Validate configuration on load (can be disabled with SKIP_CONFIG_VALIDATION)
if (!getBool('SKIP_CONFIG_VALIDATION')) {
  try {
    config.validate();
    console.log(' Configuration validated successfully');
  } catch (error) {
    console.error(' Configuration validation failed:', error.message);
    if (!config.isTest) {
      process.exit(1);
    }
  }
}

export default config;
