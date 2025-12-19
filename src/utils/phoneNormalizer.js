/**
 * @file phoneNormalizer.js
 * @description Unified phone number normalization utility
 * Centralizes all phone normalization logic to avoid inconsistencies
 */

/**
 * Normalize a phone number to a consistent E.164 format
 *
 * Rules:
 * 1. Remove all non-digit characters
 * 2. Remove WhatsApp suffixes (@s.whatsapp.net, @lid, etc.)
 * 3. Ensure country code is present (default: 55 for Brazil)
 * 4. PRESERVE the real number - do NOT remove the "9" from mobile numbers
 *
 * Brazilian formats:
 * - Mobile: 55 + DDD(2) + 9 + number(8) = 13 digits (ex: 5584996250203)
 * - Landline: 55 + DDD(2) + number(8) = 12 digits (ex: 558432123456)
 *
 * @param {string} phone - Raw phone number
 * @param {Object} options - Normalization options
 * @param {boolean} options.log - Whether to log normalization steps
 * @returns {string} Normalized phone number in E.164 format
 */
export function normalizePhone(phone, options = {}) {
  const { log = false } = options;

  if (!phone || typeof phone !== 'string') {
    if (log) console.log('[PHONE-NORMALIZER] Invalid input:', phone);
    return '';
  }

  // Store original for logging
  const original = phone;

  // 1. Remove WhatsApp suffixes
  let normalized = phone
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@lid/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/@g\.us/gi, '');

  // 2. Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');

  // 3. Handle empty result
  if (!normalized || normalized.length < 10) {
    if (log) console.log(`[PHONE-NORMALIZER] Invalid phone (too short): ${original}`);
    return '';
  }

  // 4. Reject group/list IDs (too long or don't start with 55)
  if (normalized.length > 13 && !normalized.startsWith('55')) {
    if (log) console.log(`[PHONE-NORMALIZER] Group/list ID detected: ${original}`);
    return '';
  }
  if (normalized.startsWith('55') && normalized.length > 13) {
    if (log) console.log(`[PHONE-NORMALIZER] Invalid Brazilian number (too long): ${original}`);
    return '';
  }

  // 5. Add Brazil country code if missing
  // 11 digits = DDD(2) + 9 + number(8)  add 55  13 digits (mobile)
  // 10 digits = DDD(2) + number(8)  add 55  12 digits (landline)
  if (normalized.length === 10 || normalized.length === 11) {
    normalized = '55' + normalized;
    if (log) {
      console.log(`[PHONE-NORMALIZER] Added country code: ${original}  ${normalized}`);
    }
  }

  // 6. Validate final length
  // Brazilian mobile: 13 digits (55 + DDD + 9 + 8)
  // Brazilian landline: 12 digits (55 + DDD + 8)
  if (normalized.startsWith('55')) {
    if (normalized.length < 12 || normalized.length > 13) {
      if (log) {
        console.log(`[PHONE-NORMALIZER] Invalid length (${normalized.length}): ${normalized}`);
      }
    }
  }

  if (log && original !== normalized) {
    console.log(`[PHONE-NORMALIZER] Normalized: ${original}  ${normalized}`);
  }

  return normalized;
}

/**
 * Validate if a phone number is valid
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  const normalized = normalizePhone(phone);

  // Brazilian numbers: 12 digits (landline) or 13 digits (mobile) starting with 55
  if (normalized.startsWith('55')) {
    return normalized.length === 12 || normalized.length === 13;
  }

  // Other international numbers: at least 10 digits
  return normalized.length >= 10;
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone (e.g., +55 84 9 9625-0203)
 */
export function formatPhoneDisplay(phone) {
  const normalized = normalizePhone(phone);

  if (!normalized || normalized.length < 12) {
    return phone || '';
  }

  if (normalized.startsWith('55') && normalized.length === 13) {
    // Brazilian mobile format: +55 XX 9 XXXX-XXXX
    return `+${normalized.substring(0, 2)} ${normalized.substring(2, 4)} ${normalized.substring(4, 5)} ${normalized.substring(5, 9)}-${normalized.substring(9)}`;
  }

  if (normalized.startsWith('55') && normalized.length === 12) {
    // Brazilian landline format: +55 XX XXXX-XXXX
    return `+${normalized.substring(0, 2)} ${normalized.substring(2, 4)} ${normalized.substring(4, 8)}-${normalized.substring(8)}`;
  }

  // Generic international format
  return `+${normalized}`;
}

/**
 * Extract DDD (area code) from Brazilian number
 * @param {string} phone - Phone number
 * @returns {string|null} DDD or null
 */
export function extractDDD(phone) {
  const normalized = normalizePhone(phone);

  if (normalized.startsWith('55') && normalized.length >= 12) {
    return normalized.substring(2, 4);
  }

  return null;
}

/**
 * Compare two phone numbers for equality
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean} True if they represent the same number
 */
export function phonesMatch(phone1, phone2) {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 *  FIX P0: Extract contact ID from Evolution API webhook data
 *
 * Handles broadcast lists (@lid) correctly:
 * - For @lid (broadcast lists): uses key.participant or data.sender
 * - For regular chats: uses remoteJid
 *
 * @param {Object} webhookData - Raw webhook data from Evolution API
 * @returns {Object} { contactId: string, isBroadcastList: boolean, broadcastListId?: string }
 */
export function extractContactFromWebhook(webhookData) {
  const data = webhookData?.data || {};
  const key = data.key || {};
  const remoteJid = key.remoteJid || data.from || '';

  // Check if broadcast list (@lid)
  if (remoteJid.includes('@lid')) {
    // For broadcast lists, real contact is in key.participant or webhookData.sender
    const participant = key.participant || webhookData.sender || '';

    if (participant) {
      return {
        contactId: normalizePhone(participant),
        isBroadcastList: true,
        broadcastListId: remoteJid.replace('@lid', '')
      };
    }

    // No participant found - invalid
    return {
      contactId: '',
      isBroadcastList: true,
      broadcastListId: remoteJid.replace('@lid', ''),
      error: 'broadcast_list_no_participant'
    };
  }

  // Regular chat - use remoteJid
  return {
    contactId: normalizePhone(remoteJid),
    isBroadcastList: false
  };
}

/**
 * Check if a remoteJid is a broadcast list
 * @param {string} jid - JID to check
 * @returns {boolean}
 */
export function isBroadcastList(jid) {
  return jid?.includes('@lid') || false;
}

export default {
  normalizePhone,
  isValidPhone,
  formatPhoneDisplay,
  extractDDD,
  phonesMatch,
  extractContactFromWebhook,
  isBroadcastList
};
