// intelligence/MessageFormatter.js
//  Sistema de Formatação de Mensagens - Estrutura e Organização Visual

/**
 * PROBLEMA RESOLVIDO:
 * - Mensagens sem estrutura, blocos de texto longos
 * - Falta de separação visual entre tópicos
 * - Informações importantes perdidas em parágrafos
 *
 * SOLUÇÃO:
 * - Formatação automática com bullet points
 * - Separação visual de blocos
 * - Destaque de informações importantes
 * - Limite de comprimento por parágrafo
 */

export class MessageFormatter {
  constructor() {
    this.maxParagraphLength = 280; // Caracteres por parágrafo
    this.maxBulletsPerSection = 4;
  }

  /**
   * FORMATAR MENSAGEM COMPLETA
   * Aplica formatação estruturada automaticamente
   */
  format(message, options = {}) {
    const {
      addGreeting = false,
      addEmoji = false,
      structureType = 'auto', // 'auto', 'bullets', 'numbered', 'paragraphs'
      emphasize = [] // Palavras para dar ênfase
    } = options;

    let formatted = message;

    // 1. Limpar espaços excessivos
    formatted = this._cleanWhitespace(formatted);

    // 2. Aplicar estrutura baseada no tipo
    if (structureType === 'auto') {
      formatted = this._autoStructure(formatted);
    } else if (structureType === 'bullets') {
      formatted = this._applyBulletPoints(formatted);
    } else if (structureType === 'numbered') {
      formatted = this._applyNumberedList(formatted);
    }

    // 3. Quebrar parágrafos longos
    formatted = this._breakLongParagraphs(formatted);

    // 4. Aplicar ênfases
    if (emphasize.length > 0) {
      formatted = this._applyEmphasis(formatted, emphasize);
    }

    return formatted;
  }

  /**
   * FORMATAR PERGUNTAS DO BANT
   * Estrutura perguntas de forma visual e clara
   */
  formatBantQuestion(opening, questions, context = null) {
    const parts = [];

    // Abertura
    if (opening) {
      parts.push(opening);
    }

    // Contexto adicional (opcional)
    if (context) {
      parts.push(`\n${context}`);
    }

    // Perguntas
    if (Array.isArray(questions)) {
      parts.push('\n' + questions.map(q => `• ${q}`).join('\n'));
    } else {
      parts.push(`\n${questions}`);
    }

    return parts.join('\n');
  }

  /**
   * FORMATAR LISTA DE OPÇÕES
   * Para escolhas ou alternativas
   */
  formatOptions(intro, options, outro = null) {
    const parts = [];

    if (intro) parts.push(intro);

    parts.push(''); // Linha em branco

    options.forEach((option, index) => {
      if (typeof option === 'string') {
        parts.push(`${index + 1}. ${option}`);
      } else if (option.label && option.description) {
        parts.push(`${index + 1}. **${option.label}**`);
        parts.push(`   ${option.description}`);
      }
    });

    if (outro) {
      parts.push('');
      parts.push(outro);
    }

    return parts.join('\n');
  }

  /**
   * FORMATAR CONFIRMAÇÃO/RESUMO
   * Para resumir o que foi coletado
   */
  formatSummary(title, items) {
    const parts = [title, ''];

    Object.entries(items).forEach(([key, value]) => {
      if (value) {
        const label = this._humanizeKey(key);
        parts.push(` ${label}: ${value}`);
      }
    });

    return parts.join('\n');
  }

  /**
   * FORMATAR TRANSIÇÃO DE STAGE
   * Para mudanças de etapa no BANT
   */
  formatStageTransition(fromStage, toStage, summary = null) {
    const stageNames = {
      need: 'Necessidade',
      budget: 'Investimento',
      authority: 'Decisão',
      timing: 'Timing'
    };

    const parts = [];

    if (summary) {
      parts.push(`Show! ${summary}`);
      parts.push('');
    }

    parts.push(`Agora vamos conversar sobre ${stageNames[toStage].toLowerCase()}.`);

    return parts.join('\n');
  }

  /**
   * MÉTODOS PRIVADOS
   */

  _cleanWhitespace(text) {
    return text
      .replace(/\n{3,}/g, '\n\n') // Máximo 2 quebras de linha
      .replace(/[ \t]+/g, ' ')     // Múltiplos espaços  1 espaço
      .trim();
  }

  _autoStructure(text) {
    // Detectar se texto tem múltiplos pontos ou perguntas
    const sentences = text.split(/[.!?]\s+/);

    if (sentences.length >= 3) {
      // Transformar em bullets se houver 3+ sentenças
      return this._applyBulletPoints(text);
    }

    return text;
  }

  _applyBulletPoints(text) {
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);

    if (sentences.length <= 2) {
      return text; // Muito curto, manter como está
    }

    // Primeira sentença como introdução, resto como bullets
    const intro = sentences[0];
    const bullets = sentences.slice(1, this.maxBulletsPerSection + 1);

    return `${intro}:\n\n${bullets.map(b => `• ${b}`).join('\n')}`;
  }

  _applyNumberedList(text) {
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);

    if (sentences.length <= 2) {
      return text;
    }

    const intro = sentences[0];
    const items = sentences.slice(1, this.maxBulletsPerSection + 1);

    return `${intro}:\n\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
  }

  _breakLongParagraphs(text) {
    const paragraphs = text.split('\n\n');

    return paragraphs.map(para => {
      if (para.length <= this.maxParagraphLength) {
        return para;
      }

      // Quebrar em sentenças
      const sentences = para.split(/([.!?]\s+)/);
      const chunks = [];
      let current = '';

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        if ((current + sentence).length > this.maxParagraphLength && current.length > 0) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }

      if (current.trim()) {
        chunks.push(current.trim());
      }

      return chunks.join('\n\n');
    }).join('\n\n');
  }

  _applyEmphasis(text, keywords) {
    let result = text;

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      result = result.replace(regex, `*${keyword}*`);
    });

    return result;
  }

  _humanizeKey(key) {
    const labels = {
      nome_pessoa: 'Nome',
      nome_negocio: 'Negócio',
      nicho: 'Setor',
      problema_principal: 'Desafio Principal',
      receita_mensal: 'Receita Mensal',
      funcionarios: 'Equipe',
      faixa_investimento: 'Investimento',
      decisor_principal: 'Decisor',
      urgencia: 'Urgência'
    };

    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * VALIDADOR DE MENSAGEM
   * Verifica se mensagem está dentro dos padrões de qualidade
   */
  validate(message) {
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    };

    // Verificar comprimento total
    if (message.length > 1000) {
      validation.warnings.push('Mensagem muito longa (>1000 caracteres)');
    }

    // Verificar parágrafos excessivamente longos
    const paragraphs = message.split('\n\n');
    paragraphs.forEach((para, index) => {
      if (para.length > 400) {
        validation.warnings.push(`Parágrafo ${index + 1} muito longo (${para.length} caracteres)`);
      }
    });

    // Verificar quantidade de linhas em branco
    const blankLines = (message.match(/\n{3,}/g) || []).length;
    if (blankLines > 2) {
      validation.issues.push('Muitas linhas em branco consecutivas');
    }

    // Verificar sentenças muito longas (>200 caracteres)
    const sentences = message.split(/[.!?]\s+/);
    sentences.forEach((sentence, index) => {
      if (sentence.length > 200) {
        validation.warnings.push(`Sentença ${index + 1} muito longa`);
      }
    });

    if (validation.issues.length > 0) {
      validation.isValid = false;
    }

    return validation;
  }
}

// Singleton
let instance = null;

export function getMessageFormatter() {
  if (!instance) {
    instance = new MessageFormatter();
  }
  return instance;
}

export default MessageFormatter;
