// src/tools/personalization_engine.js
// Engine de personalização baseado em firmographics e ICP

import { db } from '../memory.js';

/**
 * PERSONALIZATION ENGINE
 *
 * Personaliza pitch e abordagem baseado em:
 * - Firmographics (indústria, tamanho, localização)
 * - ICP (Ideal Customer Profile)
 * - Histórico de interações
 * - Arquétipo comportamental
 */

export class PersonalizationEngine {
  constructor() {
    this.initDatabase();

    // ICPs (Ideal Customer Profiles) da Digital Boost
    this.icps = {
      HEALTHCARE: {
        name: 'Clínicas e Saúde',
        industries: ['clínica', 'consultório', 'saúde', 'médico', 'dentista', 'fisioterapia'],
        sizes: ['5-50', '10-50'],
        painPoints: [
          'Confirmação de consultas',
          'No-show alto',
          'Atendimento fora do horário',
          'Follow-up pós-consulta'
        ],
        solutions: [
          'Agente confirma consultas automaticamente via WhatsApp',
          'Reduz no-show em até 60%',
          'Atende 24/7 para agendamentos',
          'Follow-up automático de retornos'
        ],
        caseStudy: 'Clínica em Natal reduziu no-show de 30% para 8% em 2 meses',
        roi: '3-4x do investimento em 6 meses',
        priority: 10
      },

      LAW_FIRM: {
        name: 'Escritórios de Advocacia',
        industries: ['advocacia', 'advogado', 'jurídico', 'escritório de advocacia'],
        sizes: ['3-30', '5-50'],
        painPoints: [
          'Qualificação de leads',
          'Tempo gasto com consultas básicas',
          'Agendamento de consultas',
          'Follow-up de clientes'
        ],
        solutions: [
          'Agente qualifica leads antes da consulta',
          'Responde dúvidas básicas 24/7',
          'Agenda consultas automaticamente',
          'Acompanha andamento de casos'
        ],
        caseStudy: 'Escritório em Natal economizou 15h/semana com automação',
        roi: '5x do investimento em 4 meses',
        priority: 9
      },

      ACCOUNTING: {
        name: 'Contabilidade',
        industries: ['contabilidade', 'contador', 'contábil'],
        sizes: ['3-50'],
        painPoints: [
          'Demanda sazonal (fechamento)',
          'Atendimento a múltiplos clientes',
          'Envio de documentos',
          'Lembretes de prazos'
        ],
        solutions: [
          'Agente gerencia demanda de clientes',
          'Envia lembretes automáticos de documentos',
          'Atende dúvidas frequentes',
          'Organiza comunicação por prioridade'
        ],
        caseStudy: 'Contabilidade atendeu 40% mais clientes sem contratar',
        roi: '6x do investimento em 3 meses',
        priority: 8
      },

      EDUCATION: {
        name: 'Educação e Cursos',
        industries: ['escola', 'curso', 'educação', 'faculdade', 'universidade', 'treinamento'],
        sizes: ['5-100'],
        painPoints: [
          'Captação de alunos',
          'Matrículas',
          'Comunicação com responsáveis',
          'Retenção de alunos'
        ],
        solutions: [
          'Agente atende interessados 24/7',
          'Facilita processo de matrícula',
          'Mantém pais informados',
          'Reduz evasão com acompanhamento'
        ],
        caseStudy: 'Escola em Natal aumentou matrículas em 35%',
        roi: '4x do investimento em 5 meses',
        priority: 8
      },

      RETAIL: {
        name: 'Varejo e E-commerce',
        industries: ['loja', 'varejo', 'e-commerce', 'comércio'],
        sizes: ['3-100'],
        painPoints: [
          'Atendimento durante vendas',
          'Carrinho abandonado',
          'Pós-venda',
          'Dúvidas sobre produtos'
        ],
        solutions: [
          'Agente atende clientes instantaneamente',
          'Recupera carrinhos abandonados',
          'Faz follow-up pós-venda',
          'Responde dúvidas técnicas'
        ],
        caseStudy: 'Loja online aumentou conversão em 28%',
        roi: '5-7x do investimento em 3 meses',
        priority: 7
      },

      REAL_ESTATE: {
        name: 'Imobiliárias',
        industries: ['imobiliária', 'imóveis', 'corretora'],
        sizes: ['2-50'],
        painPoints: [
          'Qualificação de leads',
          'Agendamento de visitas',
          'Follow-up constante',
          'Disponibilidade 24/7'
        ],
        solutions: [
          'Agente qualifica interessados',
          'Agenda visitas automaticamente',
          'Follow-up persistente mas educado',
          'Atende leads fora do horário'
        ],
        caseStudy: 'Imobiliária dobrou visitas qualificadas',
        roi: '4-6x do investimento em 4 meses',
        priority: 7
      },

      GENERIC_SMB: {
        name: 'PME Genérica',
        industries: ['empresa', 'negócio', 'serviço'],
        sizes: ['1-100'],
        painPoints: [
          'Atendimento ao cliente',
          'Qualificação de leads',
          'Organização comercial',
          'Métricas de vendas'
        ],
        solutions: [
          'Agente atende 24/7 no WhatsApp',
          'Qualifica leads automaticamente',
          'Integra com CRM',
          'Gera relatórios de performance'
        ],
        caseStudy: 'Empresas aumentam conversão em 25-40% em média',
        roi: '3-5x do investimento',
        priority: 5
      }
    };

    // Mensagens personalizadas por perfil
    this.personalizedMessages = {
      HEALTHCARE: {
        greeting: "Oi! Sou ORBION, especialista em automação para clínicas e saúde.",
        pain_discovery: "Qual o maior desafio no dia a dia da clínica: agendamentos, confirmações ou no-show?",
        solution: "Nosso agente de IA confirma consultas no WhatsApp e reduz no-show em até 60%. Funciona 24/7.",
        case_mention: "Temos clínicas em Natal que reduziram no-show de 30% para 8%.",
        cta: "Bora agendar 15min para eu mostrar o sistema funcionando com dados reais da sua clínica?"
      },

      LAW_FIRM: {
        greeting: "Oi! Sou ORBION, especialista em automação inteligente para escritórios de advocacia.",
        pain_discovery: "O que toma mais tempo do time: qualificação de leads, agendamentos ou follow-up de clientes?",
        solution: "Nosso agente de IA qualifica leads, agenda consultas e faz follow-up. Escritórios economizam 15h/semana.",
        case_mention: "Escritórios em Natal estão economizando 15h/semana e focando só nos casos.",
        cta: "Que tal 15min para ver como isso funcionaria no seu escritório?"
      },

      ACCOUNTING: {
        greeting: "Oi! Sou ORBION, especialista em automação para contabilidades.",
        pain_discovery: "Qual o maior gargalo: volume de clientes, envio de documentos ou comunicação?",
        solution: "Nosso agente gerencia comunicação com clientes, envia lembretes e organiza demandas automaticamente.",
        case_mention: "Contabilidades aqui de Natal conseguiram atender 40% mais clientes sem contratar.",
        cta: "Bora conversar 15min sobre como aplicar isso na sua contabilidade?"
      },

      EDUCATION: {
        greeting: "Oi! Sou ORBION, especialista em automação para instituições de ensino.",
        pain_discovery: "Qual o maior desafio: captação de alunos, matrículas ou comunicação com pais?",
        solution: "Nosso agente atende interessados 24/7, facilita matrículas e mantém pais informados automaticamente.",
        case_mention: "Escolas em Natal aumentaram matrículas em 35% com nosso agente.",
        cta: "Que tal 15min para ver como funciona com dados da sua instituição?"
      },

      GENERIC_SMB: {
        greeting: "Oi! Sou ORBION, especialista em automação comercial para PMEs.",
        pain_discovery: "Qual o maior gargalo no comercial: atendimento, qualificação ou organização?",
        solution: "Nosso agente de IA atende no WhatsApp 24/7, qualifica leads e integra com seu CRM.",
        case_mention: "Empresas aqui de Natal aumentam conversão em 25-40% em média.",
        cta: "Bora agendar 15min para eu te mostrar como funciona?"
      }
    };

    console.log('🎨 Personalization Engine inicializado');
  }

  /**
   * Inicializa tabelas de firmographics
   */
  initDatabase() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_firmographics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL UNIQUE,
        industry TEXT,
        company_size TEXT,
        location TEXT,
        icp_match TEXT,
        confidence REAL DEFAULT 0.5,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS personalization_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        personalization_type TEXT,
        content TEXT,
        effectiveness REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Personalization Database tables initialized');
  }

  /**
   * Identifica ICP do lead baseado em informações
   * @param {object} data - Dados do lead (indústria, tamanho, etc)
   * @returns {object} - ICP identificado
   */
  async identifyICP(data) {
    try {
      const industry = (data.industry || data.segmento || data.ramo || '').toLowerCase();
      const size = data.companySize || data.tamanho || '';
      const location = (data.location || data.localizacao || '').toLowerCase();

      let bestMatch = null;
      let bestScore = 0;

      // Comparar com cada ICP
      for (const [key, icp] of Object.entries(this.icps)) {
        let score = 0;

        // Match de indústria (peso 60%)
        if (icp.industries.some(ind => industry.includes(ind) || ind.includes(industry))) {
          score += 60;
        }

        // Match de tamanho (peso 20%)
        if (icp.sizes.includes(size)) {
          score += 20;
        }

        // Bonus para Natal/RN (peso 10%)
        if (location.includes('natal') || location.includes('rn') || location.includes('nordeste')) {
          score += 10;
        }

        // Bonus para tamanho ideal (peso 10%)
        if (size === '10-50' || size === '5-50') {
          score += 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { key, ...icp, matchScore: score };
        }
      }

      // Se score < 30, usar GENERIC_SMB
      if (bestScore < 30) {
        bestMatch = { key: 'GENERIC_SMB', ...this.icps.GENERIC_SMB, matchScore: bestScore };
      }

      console.log(`🎯 [PERSONALIZATION] ICP identificado: ${bestMatch.name} (score: ${bestScore})`);

      return bestMatch;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Erro ao identificar ICP:', error);
      return { key: 'GENERIC_SMB', ...this.icps.GENERIC_SMB };
    }
  }

  /**
   * Gera mensagem personalizada baseada no ICP
   * @param {string} icpKey - Chave do ICP
   * @param {string} messageType - Tipo de mensagem (greeting, pain_discovery, solution, cta)
   * @param {object} context - Contexto adicional
   * @returns {string} - Mensagem personalizada
   */
  generatePersonalizedMessage(icpKey, messageType, context = {}) {
    const messages = this.personalizedMessages[icpKey] || this.personalizedMessages.GENERIC_SMB;
    let message = messages[messageType] || messages.greeting;

    // Substituir variáveis dinâmicas
    if (context.companyName) {
      message = message.replace(/sua empresa/g, context.companyName);
    }

    if (context.userName) {
      message = message.replace(/Oi!/g, `Oi, ${context.userName}!`);
    }

    return message;
  }

  /**
   * Salva firmographics do contato
   */
  async saveFirmographics(contactId, data) {
    try {
      const icp = await this.identifyICP(data);

      db.prepare(`
        INSERT INTO contact_firmographics (contact_id, industry, company_size, location, icp_match, confidence, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(contact_id) DO UPDATE SET
          industry = excluded.industry,
          company_size = excluded.company_size,
          location = excluded.location,
          icp_match = excluded.icp_match,
          confidence = excluded.confidence,
          updated_at = datetime('now')
      `).run(
        contactId,
        data.industry || '',
        data.companySize || '',
        data.location || '',
        icp.key,
        icp.matchScore / 100
      );

      console.log(`💾 [PERSONALIZATION] Firmographics salvos para ${contactId}`);

      return icp;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Erro ao salvar firmographics:', error);
      return null;
    }
  }

  /**
   * Obtém firmographics do contato
   */
  async getFirmographics(contactId) {
    try {
      const result = db.prepare(`
        SELECT * FROM contact_firmographics WHERE contact_id = ?
      `).get(contactId);

      return result || null;
    } catch (error) {
      console.error('❌ [PERSONALIZATION] Erro ao buscar firmographics:', error);
      return null;
    }
  }

  /**
   * Gera prompt personalizado para o agente baseado no ICP
   */
  async generatePersonalizedPrompt(contactId, context = {}) {
    try {
      const firmographics = await this.getFirmographics(contactId);

      if (!firmographics || !firmographics.icp_match) {
        return ''; // Sem personalização
      }

      const icp = this.icps[firmographics.icp_match];

      if (!icp) {
        return '';
      }

      return `
🎯 PERSONALIZAÇÃO ATIVA - ICP: ${icp.name}

DOR POINTS PRINCIPAIS:
${icp.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

SOLUÇÕES RELEVANTES:
${icp.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

CASE DE SUCESSO:
${icp.caseStudy}

ROI ESPERADO:
${icp.roi}

INSTRUÇÕES:
- Use as dores específicas deste segmento nas perguntas
- Mencione soluções relevantes para o segmento
- Cite o case quando apropriado
- Seja específico e técnico para este nicho
`;

    } catch (error) {
      console.error('❌ [PERSONALIZATION] Erro ao gerar prompt:', error);
      return '';
    }
  }

  /**
   * Extrai firmographics de mensagens do lead
   */
  async extractFirmographicsFromMessage(message) {
    const extracted = {
      industry: null,
      companySize: null,
      location: null
    };

    const textLower = message.toLowerCase();

    // Detectar indústria
    for (const [key, icp] of Object.entries(this.icps)) {
      if (icp.industries.some(ind => textLower.includes(ind))) {
        extracted.industry = icp.industries[0];
        break;
      }
    }

    // Detectar tamanho
    const sizePatterns = {
      '1-5': /1 a 5|um a cinco|solo|sozinho/i,
      '5-10': /5 a 10|cinco a dez/i,
      '10-50': /10 a 50|dez a cinquenta|pequena empresa|pequeno negócio/i,
      '50-200': /50 a 200|média empresa/i,
      '200+': /mais de 200|grande empresa|corporação/i
    };

    for (const [size, pattern] of Object.entries(sizePatterns)) {
      if (pattern.test(textLower)) {
        extracted.companySize = size;
        break;
      }
    }

    // Detectar localização
    if (textLower.includes('natal') || textLower.includes('natalense')) {
      extracted.location = 'Natal, RN';
    } else if (textLower.includes('rn') || textLower.includes('rio grande do norte')) {
      extracted.location = 'RN';
    } else if (textLower.includes('nordeste')) {
      extracted.location = 'Nordeste';
    }

    return extracted;
  }
}

// Singleton
const personalizationEngine = new PersonalizationEngine();
export default personalizationEngine;
