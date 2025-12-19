// phone_normalizer.js
//  Utilitário centralizado para normalização de números de telefone brasileiros

/**
 * Normaliza número de telefone brasileiro para formato E.164
 * PRESERVA o número real - NÃO remove o "9" dos celulares
 *
 * @param {string} phone - Número de telefone em qualquer formato
 * @returns {string} - Número normalizado em E.164 (12 ou 13 dígitos)
 *
 * @example
 * normalizePhone('5584996250203')   // 13 dígitos (celular)  '5584996250203' (preservado!)
 * normalizePhone('558432123456')    // 12 dígitos (fixo)  '558432123456'
 * normalizePhone('5584996250203@s.whatsapp.net')  '5584996250203'
 * normalizePhone('+55 (84) 9 9625-0203')  '5584996250203'
 *
 * Formatos brasileiros:
 * - Celular: 55 + DDD(2) + 9 + número(8) = 13 dígitos
 * - Fixo: 55 + DDD(2) + número(8) = 12 dígitos
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    console.warn('[PHONE-NORMALIZER]  Telefone inválido:', phone);
    return '';
  }

  // 1. Remover sufixos do WhatsApp (incluindo @lid para listas de transmissão)
  let cleaned = phone
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .trim();

  // 2. Remover caracteres não-numéricos (parênteses, espaços, hífens, +)
  cleaned = cleaned.replace(/\D/g, '');

  // 3. Rejeitar IDs de grupo/lista (números muito longos ou que não começam com 55)
  if (cleaned.length > 13 && !cleaned.startsWith('55')) {
    console.warn(`[PHONE-NORMALIZER]  ID de grupo/lista detectado (ignorando): ${phone}`);
    return '';
  }

  // Se começa com 55 mas tem mais de 13 dígitos, é inválido
  if (cleaned.startsWith('55') && cleaned.length > 13) {
    console.warn(`[PHONE-NORMALIZER]  Número brasileiro inválido (muitos dígitos): ${phone}`);
    return '';
  }

  // 4. Adicionar código de país se necessário
  // 11 dígitos = DDD(2) + 9 + número(8)  celular sem código país
  // 10 dígitos = DDD(2) + número(8)  fixo sem código país
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
    console.log(`[PHONE-NORMALIZER]  Adicionado código país: ${phone}  ${cleaned}`);
  }

  // 5. Validar comprimento final
  // Celular brasileiro: 13 dígitos (55 + DDD + 9 + 8)
  // Fixo brasileiro: 12 dígitos (55 + DDD + 8)
  if (cleaned.startsWith('55')) {
    if (cleaned.length < 12 || cleaned.length > 13) {
      console.warn(`[PHONE-NORMALIZER]  Comprimento inválido (${cleaned.length}): ${phone}`);
    }
  }

  return cleaned;
}

/**
 * Valida se um número de telefone brasileiro é válido
 * @param {string} phone - Número normalizado
 * @returns {boolean}
 */
export function isValidBrazilianPhone(phone) {
  const normalized = normalizePhone(phone);

  // Formato esperado: 12 dígitos (fixo) ou 13 dígitos (celular)
  if (normalized.length !== 12 && normalized.length !== 13) return false;

  // Deve começar com 55
  if (!normalized.startsWith('55')) return false;

  // DDD válidos no Brasil (11-99)
  const ddd = parseInt(normalized.substring(2, 4));
  if (ddd < 11 || ddd > 99) return false;

  return true;
}

/**
 * Formata número para exibição amigável
 * @param {string} phone - Número normalizado
 * @returns {string} - Formato: +55 (84) 9 9625-0203 (celular) ou +55 (84) 3212-3456 (fixo)
 */
export function formatPhoneDisplay(phone) {
  const normalized = normalizePhone(phone);

  if (!isValidBrazilianPhone(normalized)) {
    return phone; // Retorna original se inválido
  }

  const country = normalized.substring(0, 2);
  const ddd = normalized.substring(2, 4);

  if (normalized.length === 13) {
    // Celular: +55 (84) 9 9625-0203
    const ninthDigit = normalized.substring(4, 5);
    const firstPart = normalized.substring(5, 9);
    const secondPart = normalized.substring(9, 13);
    return `+${country} (${ddd}) ${ninthDigit} ${firstPart}-${secondPart}`;
  } else {
    // Fixo: +55 (84) 3212-3456
    const firstPart = normalized.substring(4, 8);
    const secondPart = normalized.substring(8, 12);
    return `+${country} (${ddd}) ${firstPart}-${secondPart}`;
  }
}

/**
 * Extrai estatísticas de normalização (para debugging)
 */
export const normalizationStats = {
  total: 0,
  normalized13to12: 0,
  alreadyNormalized: 0,
  invalid: 0,

  reset() {
    this.total = 0;
    this.normalized13to12 = 0;
    this.alreadyNormalized = 0;
    this.invalid = 0;
  },

  getReport() {
    return {
      total: this.total,
      normalized13to12: this.normalized13to12,
      alreadyNormalized: this.alreadyNormalized,
      invalid: this.invalid,
      successRate: this.total > 0
        ? ((this.normalized13to12 + this.alreadyNormalized) / this.total * 100).toFixed(1) + '%'
        : '0%'
    };
  }
};

export default {
  normalizePhone,
  isValidBrazilianPhone,
  formatPhoneDisplay,
  normalizationStats
};
