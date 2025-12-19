/**
 * @file config/index.js
 * @description Exporta todas as configurações centralizadas do sistema
 * @module config
 */

import env, { isProduction, isDevelopment, isTest, isDebug } from './environment.js';
import constants from './constants.js';

/**
 * Configuração centralizada do sistema ORBION
 * Todas as configs devem ser acessadas através deste módulo
 */
export const config = {
  // Environment
  env,
  isProduction: isProduction(),
  isDevelopment: isDevelopment(),
  isTest: isTest(),
  isDebug: isDebug(),

  // Server
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  },

  // Database
  database: {
    path: env.DATABASE_PATH,
  },

  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.OPENAI_CHAT_MODEL,
    embeddingModel: env.OPENAI_EMB_MODEL,
    timeouts: {
      chat: env.OPENAI_CHAT_TIMEOUT,
      embedding: env.OPENAI_EMBEDDING_TIMEOUT,
      whisper: env.OPENAI_WHISPER_TIMEOUT,
      tts: env.OPENAI_TTS_TIMEOUT,
    },
  },

  // Evolution API (WhatsApp)
  whatsapp: {
    baseUrl: env.EVOLUTION_BASE_URL,
    apiKey: env.EVOLUTION_API_KEY,
    instance: env.EVOLUTION_INSTANCE,
    timeouts: {
      send: env.WHATSAPP_SEND_TIMEOUT,
      audio: env.WHATSAPP_AUDIO_TIMEOUT,
      media: env.WHATSAPP_MEDIA_TIMEOUT,
    },
  },

  // Google APIs
  google: {
    credentials: {
      file: env.GOOGLE_CREDENTIALS_FILE,
      tokenPath: env.GOOGLE_TOKEN_PATH,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    sheets: {
      leadsSheetId: env.GOOGLE_LEADS_SHEET_ID,
      funilSheetId: env.GOOGLE_FUNIL_SHEET_ID,
      interactionsSheetId: env.GOOGLE_INTERACTIONS_SHEET_ID,
      bantSheetId: env.GOOGLE_BANT_SHEET_ID,
      timeout: env.SHEETS_TIMEOUT,
    },
  },

  // ElevenLabs
  elevenlabs: {
    apiKey: env.ELEVENLABS_API_KEY,
  },

  // Circuit Breaker
  circuitBreaker: {
    openai: {
      failureThreshold: env.CB_OPENAI_FAILURE_THRESHOLD,
      successThreshold: env.CB_OPENAI_SUCCESS_THRESHOLD,
      timeout: env.CB_OPENAI_TIMEOUT,
    },
    evolution: {
      failureThreshold: env.CB_EVOLUTION_FAILURE_THRESHOLD,
      successThreshold: env.CB_EVOLUTION_SUCCESS_THRESHOLD,
      timeout: env.CB_EVOLUTION_TIMEOUT,
    },
  },

  // Retry
  retry: {
    maxAttempts: env.RETRY_MAX_ATTEMPTS,
    initialDelay: env.RETRY_INITIAL_DELAY,
    maxDelay: env.RETRY_MAX_DELAY,
    multiplier: env.RETRY_MULTIPLIER,
  },

  // Constantes
  constants,
};

// Exportações individuais para conveniência
export { default as env } from './environment.js';
export { isProduction, isDevelopment, isTest, isDebug } from './environment.js';
export { default as constants } from './constants.js';

export default config;
