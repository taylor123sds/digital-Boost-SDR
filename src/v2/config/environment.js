/**
 * @file environment.js
 * @description Validação e parsing de variáveis de ambiente
 * @module config/environment
 */

import dotenv from 'dotenv';
import Joi from 'joi';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Schema de validação para variáveis de ambiente
 * Garante que todas as variáveis obrigatórias estão presentes e válidas
 */
const envSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Server
  PORT: Joi.number().port().default(3000),

  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_CHAT_MODEL: Joi.string().default('gpt-4o-mini'),
  OPENAI_EMB_MODEL: Joi.string().default('text-embedding-3-small'),
  OPENAI_CHAT_TIMEOUT: Joi.number().default(60000),
  OPENAI_EMBEDDING_TIMEOUT: Joi.number().default(30000),
  OPENAI_WHISPER_TIMEOUT: Joi.number().default(90000),
  OPENAI_TTS_TIMEOUT: Joi.number().default(30000),

  // Evolution API (WhatsApp)
  EVOLUTION_BASE_URL: Joi.string().uri().default('http://localhost:8080'),
  EVOLUTION_API_KEY: Joi.string().default('ORBION_KEY_123456'),
  EVOLUTION_INSTANCE: Joi.string().default('orbion'),
  WHATSAPP_SEND_TIMEOUT: Joi.number().default(30000),
  WHATSAPP_AUDIO_TIMEOUT: Joi.number().default(60000),
  WHATSAPP_MEDIA_TIMEOUT: Joi.number().default(45000),

  // Google APIs
  GOOGLE_CREDENTIALS_FILE: Joi.string().default('./google_credentials.json'),
  GOOGLE_TOKEN_PATH: Joi.string().default('./google_token.json'),
  GOOGLE_REDIRECT_URI: Joi.string().uri().default('http://localhost:3001/oauth2callback'),
  GOOGLE_LEADS_SHEET_ID: Joi.string().allow('').optional(),
  GOOGLE_FUNIL_SHEET_ID: Joi.string().allow('').optional(),
  GOOGLE_INTERACTIONS_SHEET_ID: Joi.string().allow('').optional(),
  GOOGLE_BANT_SHEET_ID: Joi.string().allow('').optional(),

  // ElevenLabs
  ELEVENLABS_API_KEY: Joi.string().optional(),

  // Database
  DATABASE_PATH: Joi.string().default('./data/orbion.db'),

  // Circuit Breaker - OpenAI
  CB_OPENAI_FAILURE_THRESHOLD: Joi.number().default(5),
  CB_OPENAI_SUCCESS_THRESHOLD: Joi.number().default(2),
  CB_OPENAI_TIMEOUT: Joi.number().default(60000),

  // Circuit Breaker - Evolution API
  CB_EVOLUTION_FAILURE_THRESHOLD: Joi.number().default(3),
  CB_EVOLUTION_SUCCESS_THRESHOLD: Joi.number().default(2),
  CB_EVOLUTION_TIMEOUT: Joi.number().default(30000),

  // Retry Configuration
  RETRY_MAX_ATTEMPTS: Joi.number().default(3),
  RETRY_INITIAL_DELAY: Joi.number().default(1000),
  RETRY_MAX_DELAY: Joi.number().default(10000),
  RETRY_MULTIPLIER: Joi.number().default(2),

  // Sheets Timeout
  SHEETS_TIMEOUT: Joi.number().default(5000),

  // Debug
  DEBUG: Joi.boolean().default(false),
}).unknown(true); // Permite outras variáveis não especificadas

/**
 * Valida e retorna variáveis de ambiente parseadas
 * @throws {Error} Se validação falhar
 * @returns {object} Variáveis de ambiente validadas
 */
function validateEnv() {
  const { error, value: envVars } = envSchema.validate(process.env);

  if (error) {
    throw new Error(` Erro na validação de variáveis de ambiente: ${error.message}`);
  }

  return envVars;
}

// Exporta variáveis validadas
const env = validateEnv();

export default env;

/**
 * Verifica se está em ambiente de produção
 * @returns {boolean}
 */
export function isProduction() {
  return env.NODE_ENV === 'production';
}

/**
 * Verifica se está em ambiente de desenvolvimento
 * @returns {boolean}
 */
export function isDevelopment() {
  return env.NODE_ENV === 'development';
}

/**
 * Verifica se está em ambiente de teste
 * @returns {boolean}
 */
export function isTest() {
  return env.NODE_ENV === 'test';
}

/**
 * Verifica se debug está ativo
 * @returns {boolean}
 */
export function isDebug() {
  return env.DEBUG === true || env.DEBUG === 'true';
}
