/**
 * @file BANTEngineAdapter.js
 * @description P2-2: Adapter entre BANT Stages e DynamicConsultativeEngine
 *
 * PROPÓSITO:
 * - Extrai dados BANT durante conversa SPIN
 * - Sincroniza estado entre SPIN (conversa) e BANT (tracking)
 * - Fornece dados estruturados para o Planner
 *
 * FILOSOFIA:
 * - SPIN controla o fluxo de conversa
 * - BANT extrai dados silenciosamente em background
 * - Este adapter faz a ponte entre os dois sistemas
 *
 * @version 1.0.0
 */

import { getDatabase } from '../db/index.js';
import log from '../utils/logger-wrapper.js';

// Mapeamento SPIN → BANT
const SPIN_TO_BANT_MAPPING = {
  // Fase SPIN → Campos BANT que podem ser coletados
  situation: ['need_caminho_orcamento', 'need_presenca_digital', 'need_regiao', 'need_volume'],
  problem: ['need_problema_sazonalidade', 'need_problema_dependencia', 'need_custo_dor'],
  implication: ['timing_urgencia', 'need_impacto_crescimento', 'need_impacto_financeiro'],
  needPayoff: ['budget_interesse', 'timing_prazo', 'authority_decisor'],
  closing: ['scheduling_confirmado', 'scheduling_horario']
};

// Padrões de extração para cada campo BANT
const EXTRACTION_PATTERNS = {
  // BUDGET
  budget_interesse: {
    patterns: [
      /quanto (?:custa|vale|seria|fica)/i,
      /(?:investimento|orçamento|valor)/i,
      /(?:preço|plano|pacote)/i
    ],
    type: 'boolean',
    weight: 40
  },
  faixa_investimento: {
    patterns: [
      /(?:até|cerca de|mais ou menos)\s*R?\$?\s*(\d+(?:\.\d{3})*(?:,\d{2})?)/i,
      /R?\$?\s*(\d+(?:\.\d{3})*(?:,\d{2})?)\s*(?:por mês|mensal)/i
    ],
    type: 'currency',
    weight: 40
  },

  // AUTHORITY
  authority_decisor: {
    patterns: [
      /(?:eu decido|decido sozinho|sou o dono|sou proprietário)/i,
      /(?:com|junto com)\s*(?:meu|minha)?\s*(?:sócio|esposa|marido|pai|mãe)/i,
      /(?:preciso|tenho que)\s*(?:falar|conversar|consultar)/i
    ],
    type: 'enum',
    values: { 'eu_sozinho': 1, 'com_socio': 0.7, 'precisa_aprovar': 0.4 },
    weight: 40
  },
  autonomia_decisao: {
    patterns: [
      /(?:eu mesmo|por minha conta|tenho autonomia)/i,
      /(?:preciso|tenho que)\s*(?:aprovar|validar|consultar)/i
    ],
    type: 'enum',
    values: { 'total': 1, 'parcial': 0.7, 'nenhuma': 0.3 },
    weight: 30
  },

  // NEED
  need_problema_principal: {
    patterns: [
      /(?:maior|principal|grande)\s*(?:problema|dificuldade|desafio|dor)/i,
      /(?:preciso|quero|gostaria)\s*(?:de|resolver|melhorar)/i,
      /(?:não consigo|difícil|complicado)\s*(?:controlar|organizar|gerenciar)/i
    ],
    type: 'text',
    weight: 20
  },
  need_intensidade: {
    patterns: [
      /(?:muito|bastante|demais)\s*(?:problema|difícil|complicado)/i,
      /(?:urgente|crítico|grave)/i,
      /nota\s*(\d+)/i
    ],
    type: 'scale',
    weight: 15
  },

  // TIMING
  timing_urgencia: {
    patterns: [
      /(?:agora|já|imediatamente|urgente)/i,
      /(?:essa|próxima)\s*(?:semana|mês)/i,
      /(?:pode esperar|sem pressa|mais pra frente)/i
    ],
    type: 'enum',
    values: { 'agora': 1, 'proximo_mes': 0.7, 'pode_esperar': 0.3 },
    weight: 50
  },
  timing_prazo: {
    patterns: [
      /(?:até|antes de|no máximo)\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
      /(?:em|dentro de)\s*(\d+)\s*(?:dias|semanas|meses)/i
    ],
    type: 'date',
    weight: 50
  }
};

class BANTEngineAdapter {
  constructor() {
    this.extractionCache = new Map();
    this.cacheTTL = 300000; // 5 minutos

    log.info('[BANT-ADAPTER] Inicializado');
  }

  /**
   * Extrai dados BANT de uma mensagem
   * @param {string} message - Mensagem do lead
   * @param {string} currentSpinStage - Estágio SPIN atual
   * @returns {object} Dados BANT extraídos
   */
  extractBANTFromMessage(message, currentSpinStage = 'situation') {
    const extracted = {
      budget: {},
      authority: {},
      need: {},
      timing: {},
      confidence: 0,
      rawExtractions: []
    };

    if (!message) return extracted;

    const messageLower = message.toLowerCase();
    const relevantFields = SPIN_TO_BANT_MAPPING[currentSpinStage] || [];

    // Extrair campos relevantes para o estágio atual
    for (const [fieldName, config] of Object.entries(EXTRACTION_PATTERNS)) {
      const isRelevant = relevantFields.some(f => fieldName.includes(f.replace('_', '')) || fieldName.startsWith(f.split('_')[0]));

      for (const pattern of config.patterns) {
        const match = messageLower.match(pattern);
        if (match) {
          const extraction = {
            field: fieldName,
            value: this.parseExtractionValue(match, config.type),
            confidence: isRelevant ? 0.9 : 0.6,
            weight: config.weight,
            matchedPattern: pattern.toString()
          };

          extracted.rawExtractions.push(extraction);

          // Categorizar por tipo BANT
          const category = this.getBANTCategory(fieldName);
          if (category) {
            extracted[category][fieldName] = extraction.value;
          }
        }
      }
    }

    // Calcular confiança geral
    if (extracted.rawExtractions.length > 0) {
      extracted.confidence = extracted.rawExtractions.reduce((sum, e) => sum + e.confidence, 0) / extracted.rawExtractions.length;
    }

    return extracted;
  }

  /**
   * Parseia valor extraído baseado no tipo
   */
  parseExtractionValue(match, type) {
    switch (type) {
      case 'boolean':
        return true;

      case 'currency':
        if (match[1]) {
          return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        return null;

      case 'enum':
        return match[0];

      case 'scale':
        if (match[1]) {
          return parseInt(match[1]);
        }
        // Inferir de palavras
        if (/muito|bastante|demais/.test(match[0])) return 8;
        if (/moderado|médio/.test(match[0])) return 5;
        return 3;

      case 'date':
        return match[0];

      case 'text':
      default:
        return match[0];
    }
  }

  /**
   * Determina categoria BANT de um campo
   */
  getBANTCategory(fieldName) {
    if (fieldName.startsWith('budget') || fieldName.includes('faixa_investimento') || fieldName.includes('roi')) {
      return 'budget';
    }
    if (fieldName.startsWith('authority') || fieldName.includes('decisor') || fieldName.includes('autonomia')) {
      return 'authority';
    }
    if (fieldName.startsWith('need') || fieldName.includes('problema') || fieldName.includes('impacto')) {
      return 'need';
    }
    if (fieldName.startsWith('timing') || fieldName.includes('urgencia') || fieldName.includes('prazo')) {
      return 'timing';
    }
    return null;
  }

  /**
   * Calcula score BANT baseado nos dados coletados
   * @param {object} bantData - Dados BANT acumulados
   * @returns {object} Score por categoria e total
   */
  calculateBANTScore(bantData) {
    const scores = {
      budget: 0,
      authority: 0,
      need: 0,
      timing: 0,
      total: 0,
      completeness: 0,
      readyForClosing: false
    };

    // Budget (0-25 pontos)
    if (bantData.budget?.budget_interesse) scores.budget += 15;
    if (bantData.budget?.faixa_investimento) scores.budget += 10;

    // Authority (0-25 pontos)
    if (bantData.authority?.authority_decisor) {
      const value = bantData.authority.authority_decisor.toLowerCase();
      if (/eu|sozinho|dono/.test(value)) scores.authority += 25;
      else if (/sócio/.test(value)) scores.authority += 18;
      else scores.authority += 10;
    }

    // Need (0-25 pontos)
    if (bantData.need?.need_problema_principal) scores.need += 15;
    if (bantData.need?.need_intensidade) {
      scores.need += Math.min(10, bantData.need.need_intensidade);
    }

    // Timing (0-25 pontos)
    if (bantData.timing?.timing_urgencia) {
      const value = bantData.timing.timing_urgencia.toLowerCase();
      if (/agora|já|urgente/.test(value)) scores.timing += 25;
      else if (/próxim/.test(value)) scores.timing += 18;
      else scores.timing += 8;
    }

    // Total
    scores.total = scores.budget + scores.authority + scores.need + scores.timing;

    // Completeness (quantos componentes têm dados)
    let filled = 0;
    if (scores.budget > 0) filled++;
    if (scores.authority > 0) filled++;
    if (scores.need > 0) filled++;
    if (scores.timing > 0) filled++;
    scores.completeness = (filled / 4) * 100;

    // Ready for closing
    scores.readyForClosing = scores.total >= 60 && scores.completeness >= 75;

    return scores;
  }

  /**
   * Persiste dados BANT no banco
   * @param {string} contactId - ID do contato
   * @param {object} bantData - Dados BANT extraídos
   */
  async persistBANTData(contactId, bantData) {
    try {
      const db = getDatabase();

      // Upsert na tabela lead_bant_data
      db.prepare(`
        INSERT INTO lead_bant_data (
          contact_id,
          budget_data,
          authority_data,
          need_data,
          timing_data,
          total_score,
          completeness,
          ready_for_closing,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(contact_id) DO UPDATE SET
          budget_data = COALESCE(json_patch(budget_data, excluded.budget_data), excluded.budget_data),
          authority_data = COALESCE(json_patch(authority_data, excluded.authority_data), excluded.authority_data),
          need_data = COALESCE(json_patch(need_data, excluded.need_data), excluded.need_data),
          timing_data = COALESCE(json_patch(timing_data, excluded.timing_data), excluded.timing_data),
          total_score = excluded.total_score,
          completeness = excluded.completeness,
          ready_for_closing = excluded.ready_for_closing,
          updated_at = datetime('now')
      `).run(
        contactId,
        JSON.stringify(bantData.budget || {}),
        JSON.stringify(bantData.authority || {}),
        JSON.stringify(bantData.need || {}),
        JSON.stringify(bantData.timing || {}),
        bantData.scores?.total || 0,
        bantData.scores?.completeness || 0,
        bantData.scores?.readyForClosing ? 1 : 0
      );

      log.debug(`[BANT-ADAPTER] Dados persistidos para ${contactId}`);
    } catch (error) {
      // Tabela pode não existir - criar
      if (error.message.includes('no such table')) {
        await this.initTable();
        await this.persistBANTData(contactId, bantData);
      } else {
        log.error('[BANT-ADAPTER] Erro ao persistir dados', error);
      }
    }
  }

  /**
   * Inicializa tabela de BANT data
   */
  async initTable() {
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_bant_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL UNIQUE,
        budget_data TEXT DEFAULT '{}',
        authority_data TEXT DEFAULT '{}',
        need_data TEXT DEFAULT '{}',
        timing_data TEXT DEFAULT '{}',
        total_score INTEGER DEFAULT 0,
        completeness REAL DEFAULT 0,
        ready_for_closing INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log.info('[BANT-ADAPTER] Tabela lead_bant_data criada');
  }

  /**
   * Recupera dados BANT do banco
   * @param {string} contactId - ID do contato
   * @returns {object} Dados BANT
   */
  async getBANTData(contactId) {
    try {
      const db = getDatabase();
      const row = db.prepare(`
        SELECT * FROM lead_bant_data WHERE contact_id = ?
      `).get(contactId);

      if (!row) return null;

      return {
        budget: JSON.parse(row.budget_data || '{}'),
        authority: JSON.parse(row.authority_data || '{}'),
        need: JSON.parse(row.need_data || '{}'),
        timing: JSON.parse(row.timing_data || '{}'),
        scores: {
          total: row.total_score,
          completeness: row.completeness,
          readyForClosing: row.ready_for_closing === 1
        }
      };
    } catch (error) {
      log.error('[BANT-ADAPTER] Erro ao recuperar dados', error);
      return null;
    }
  }

  /**
   * Gera instrução para o Planner baseada nos dados BANT
   * @param {object} bantData - Dados BANT
   * @returns {string} Instrução para o Planner
   */
  generatePlannerInstruction(bantData) {
    if (!bantData || !bantData.scores) {
      return '\n\n## BANT STATUS: Dados insuficientes - continue qualificação SPIN\n';
    }

    const { scores, budget, authority, need, timing } = bantData;
    let instruction = `\n\n## BANT STATUS (${scores.total}/100 - ${scores.completeness}% completo)\n`;

    // Budget
    instruction += `\n### Budget: ${scores.budget || 0}/25\n`;
    if (Object.keys(budget).length === 0) {
      instruction += '- **FALTANDO**: Não sabemos faixa de investimento\n';
      instruction += '- **AÇÃO**: Descobrir capacidade de investimento\n';
    } else {
      instruction += `- Dados: ${JSON.stringify(budget)}\n`;
    }

    // Authority
    instruction += `\n### Authority: ${scores.authority || 0}/25\n`;
    if (Object.keys(authority).length === 0) {
      instruction += '- **FALTANDO**: Não sabemos quem decide\n';
      instruction += '- **AÇÃO**: Perguntar sobre processo de decisão\n';
    } else {
      instruction += `- Dados: ${JSON.stringify(authority)}\n`;
    }

    // Need
    instruction += `\n### Need: ${scores.need || 0}/25\n`;
    if (Object.keys(need).length === 0) {
      instruction += '- **FALTANDO**: Problema não está claro\n';
      instruction += '- **AÇÃO**: Aprofundar na dor e impacto\n';
    } else {
      instruction += `- Dados: ${JSON.stringify(need)}\n`;
    }

    // Timing
    instruction += `\n### Timing: ${scores.timing || 0}/25\n`;
    if (Object.keys(timing).length === 0) {
      instruction += '- **FALTANDO**: Não sabemos urgência\n';
      instruction += '- **AÇÃO**: Descobrir prazo ideal\n';
    } else {
      instruction += `- Dados: ${JSON.stringify(timing)}\n`;
    }

    // Recomendação
    if (scores.readyForClosing) {
      instruction += `\n### RECOMENDAÇÃO: PRONTO PARA FECHAMENTO!\n`;
      instruction += 'BANT completo - Direcione para agendamento de reunião.\n';
    } else if (scores.completeness >= 50) {
      instruction += `\n### RECOMENDAÇÃO: Quase lá\n`;
      instruction += 'Continue coletando dados faltantes antes de fechar.\n';
    } else {
      instruction += `\n### RECOMENDAÇÃO: Continue qualificação\n`;
      instruction += 'Dados BANT incompletos - foque em descobrir mais.\n';
    }

    return instruction;
  }

  /**
   * Processa mensagem e atualiza BANT
   * Entry point principal para integração com DynamicConsultativeEngine
   */
  async processMessage(contactId, message, currentSpinStage) {
    // 1. Extrair dados da mensagem
    const extracted = this.extractBANTFromMessage(message, currentSpinStage);

    // 2. Recuperar dados existentes
    let existingData = await this.getBANTData(contactId);
    if (!existingData) {
      existingData = { budget: {}, authority: {}, need: {}, timing: {} };
    }

    // 3. Mesclar dados
    const mergedData = {
      budget: { ...existingData.budget, ...extracted.budget },
      authority: { ...existingData.authority, ...extracted.authority },
      need: { ...existingData.need, ...extracted.need },
      timing: { ...existingData.timing, ...extracted.timing }
    };

    // 4. Calcular scores
    mergedData.scores = this.calculateBANTScore(mergedData);

    // 5. Persistir
    await this.persistBANTData(contactId, mergedData);

    // 6. Retornar para uso no engine
    return {
      ...mergedData,
      plannerInstruction: this.generatePlannerInstruction(mergedData),
      newExtractions: extracted.rawExtractions
    };
  }
}

// Singleton
let instance = null;

export function getBANTEngineAdapter() {
  if (!instance) {
    instance = new BANTEngineAdapter();
  }
  return instance;
}

export default BANTEngineAdapter;
