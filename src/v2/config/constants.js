/**
 * @file constants.js
 * @description Constantes do sistema ORBION
 * @module config/constants
 */

/**
 * Estágios do funil de vendas
 */
export const FUNNEL_STAGES = {
  SDR: 'sdr',
  NEED: 'need',
  BUDGET: 'budget',
  AUTHORITY: 'authority',
  TIMING: 'timing',
  SCHEDULER: 'scheduler',
  COMPLETED: 'completed',
  LOST: 'lost',
};

/**
 * Tipos de agentes
 */
export const AGENT_TYPES = {
  SDR: 'sdr',
  SPECIALIST: 'specialist',
  SCHEDULER: 'scheduler',
};

/**
 * Status de leads
 */
export const LEAD_STATUS = {
  NEW: 'novo',
  CONTACTED: 'contactado',
  QUALIFIED: 'qualificado',
  PROPOSAL: 'proposta',
  CLOSED: 'fechado',
  LOST: 'perdido',
  BLOCKED: 'bloqueado',
};

/**
 * Estágios BANT
 */
export const BANT_STAGES = {
  NEED: 'need',
  BUDGET: 'budget',
  AUTHORITY: 'authority',
  TIMING: 'timing',
};

/**
 * Scores de qualificação BANT
 */
export const QUALIFICATION_SCORES = {
  UNQUALIFIED: 0,
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  VERY_HIGH: 90,
  PERFECT: 100,
};

/**
 * Tipos de mensagem WhatsApp
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  AUDIO: 'audio',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  STICKER: 'sticker',
  LOCATION: 'location',
  CONTACT: 'contact',
};

/**
 * Tipos de interação
 */
export const INTERACTION_TYPES = {
  CALL: 'CALL',
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  MEETING: 'MEETING',
  FOLLOW_UP: 'FOLLOW_UP',
};

/**
 * Limites do sistema
 */
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 4096,
  MAX_CONVERSATION_HISTORY: 20,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_QUEUE_SIZE: 1000,
  CACHE_TTL_SECONDS: 3600, // 1 hora
  SESSION_TIMEOUT_MINUTES: 30,
};

/**
 * Timeouts (em milissegundos)
 */
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30s
  DATABASE_QUERY: 5000, // 5s
  WEBHOOK_RESPONSE: 10000, // 10s
  CACHE_OPERATION: 1000, // 1s
};

/**
 * Códigos de erro
 */
export const ERROR_CODES = {
  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_MESSAGE: 'INVALID_MESSAGE',

  // Autenticação
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Não encontrado
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',

  // Integr ações
  WHATSAPP_ERROR: 'WHATSAPP_ERROR',
  OPENAI_ERROR: 'OPENAI_ERROR',
  GOOGLE_SHEETS_ERROR: 'GOOGLE_SHEETS_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * Padrões RegEx
 */
export const REGEX = {
  BRAZILIAN_PHONE: /^55\d{10,11}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
};

/**
 * Configurações de cache
 */
export const CACHE_KEYS = {
  LEAD_STATE: 'lead_state:',
  BANT_STATE: 'bant_state_',
  CONVERSATION_METADATA: 'conversation_metadata_',
  GOOGLE_SHEETS_DATA: 'google_sheets:',
  ANALYTICS: 'analytics:',
};

/**
 * Eventos do sistema
 */
export const EVENTS = {
  // Lead events
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_BLOCKED: 'lead.blocked',

  // Agent events
  AGENT_HANDOFF: 'agent.handoff',
  AGENT_COMPLETED: 'agent.completed',
  AGENT_FAILED: 'agent.failed',

  // Message events
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_FAILED: 'message.failed',

  // Campaign events
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',

  // Meeting events
  MEETING_SCHEDULED: 'meeting.scheduled',
  MEETING_CONFIRMED: 'meeting.confirmed',
  MEETING_CANCELLED: 'meeting.cancelled',
};

/**
 * Prioridades de processamento
 */
export const PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

/**
 * Segmentos de mercado (Natal/RN)
 */
export const MARKET_SEGMENTS = {
  RESTAURANTS: 'restaurantes',
  RETAIL: 'varejo',
  SERVICES: 'servicos',
  HEALTH: 'saude',
  EDUCATION: 'educacao',
  REAL_ESTATE: 'imoveis',
  AUTOMOTIVE: 'automotivo',
  BEAUTY: 'beleza',
  TECH: 'tecnologia',
  OTHER: 'outros',
};

/**
 * Configurações padrão
 */
export const DEFAULTS = {
  AGENT: AGENT_TYPES.SDR,
  STAGE: FUNNEL_STAGES.SDR,
  STATUS: LEAD_STATUS.NEW,
  LANGUAGE: 'pt-BR',
  TIMEZONE: 'America/Fortaleza',
  CURRENCY: 'BRL',
};

/**
 * Mensagens do sistema
 */
export const SYSTEM_MESSAGES = {
  WELCOME: 'Olá! Sou a Leadly da Digital Boost. Como posso ajudar?',
  ERROR_GENERIC: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
  ERROR_TIMEOUT: 'A solicitação demorou muito. Por favor, tente novamente.',
  BLOCKED: 'Entendido. Você foi removido da lista de contatos.',
  MEETING_CONFIRMED: 'Reunião confirmada! Enviarei um lembrete próximo ao horário.',
};

export default {
  FUNNEL_STAGES,
  AGENT_TYPES,
  LEAD_STATUS,
  BANT_STAGES,
  QUALIFICATION_SCORES,
  MESSAGE_TYPES,
  INTERACTION_TYPES,
  LIMITS,
  TIMEOUTS,
  ERROR_CODES,
  REGEX,
  CACHE_KEYS,
  EVENTS,
  PRIORITIES,
  MARKET_SEGMENTS,
  DEFAULTS,
  SYSTEM_MESSAGES,
};
