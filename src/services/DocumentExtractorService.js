/**
 * DocumentExtractorService
 *
 * Extracts structured fields from documents with evidence tracking.
 * Supports multiple schema types (licitacao, contrato, termo_referencia).
 */

import OpenAI from 'openai';
import { defaultLogger } from '../utils/logger.enhanced.js';
import { getSchema, validateFieldValue, FieldTypes } from '../schemas/document-schemas.js';

const logger = defaultLogger.child({ module: 'DocumentExtractorService' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Segments text into pages based on markers
 */
function segmentByPages(text) {
  // Common page markers
  const pagePatterns = [
    /--- Página (\d+) ---/gi,
    /\[Página (\d+)\]/gi,
    /Página (\d+) de \d+/gi,
    /- (\d+) -/g,
    /\f/g // Form feed character
  ];

  const segments = [];
  let currentPage = 1;
  let lastIndex = 0;

  // Try to find page markers
  const pageMarkerRegex = /(?:Página|Page|Pág\.?)\s*(\d+)/gi;
  let match;

  while ((match = pageMarkerRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        page: currentPage,
        start: lastIndex,
        end: match.index,
        text: text.slice(lastIndex, match.index)
      });
    }
    currentPage = parseInt(match[1], 10);
    lastIndex = match.index;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      page: currentPage,
      start: lastIndex,
      end: text.length,
      text: text.slice(lastIndex)
    });
  }

  // If no markers found, treat entire text as page 1
  if (segments.length === 0) {
    segments.push({
      page: 1,
      start: 0,
      end: text.length,
      text: text
    });
  }

  return segments;
}

/**
 * Finds evidence in text for a given value
 */
function findEvidence(text, value, pageSegments) {
  if (!value || typeof value !== 'string') return null;

  const searchValue = value.toString().trim();
  if (searchValue.length < 3) return null;

  // Search in each page segment
  for (const segment of pageSegments) {
    const index = segment.text.toLowerCase().indexOf(searchValue.toLowerCase());
    if (index !== -1) {
      // Get context around the match
      const contextStart = Math.max(0, index - 50);
      const contextEnd = Math.min(segment.text.length, index + searchValue.length + 50);
      const quote = segment.text.slice(contextStart, contextEnd).trim();

      return {
        page: segment.page,
        quote: contextStart > 0 ? '...' + quote : quote,
        position: {
          start: segment.start + index,
          end: segment.start + index + searchValue.length
        }
      };
    }
  }

  return null;
}

/**
 * Build extraction prompt for a schema
 */
function buildExtractionPrompt(schema, text, options = {}) {
  const fieldsDescription = [];

  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    let desc = `- ${fieldName} (${fieldDef.type})`;
    if (fieldDef.label) desc += `: ${fieldDef.label}`;
    if (fieldDef.required) desc += ' [OBRIGATORIO]';
    if (fieldDef.type === 'enum' && fieldDef.values) {
      desc += ` Valores: ${fieldDef.values.join(', ')}`;
    }
    fieldsDescription.push(desc);
  }

  const prompt = `
Voce e um especialista em analise de documentos de ${schema.displayName}.
Extraia os seguintes campos do documento abaixo, retornando um JSON estruturado.

Para cada campo extraido, inclua:
- value: o valor extraido
- evidence: objeto com { page: numero da pagina, quote: trecho exato do documento }
- confidence: nivel de confianca de 0 a 1

Campos a extrair:
${fieldsDescription.join('\n')}

REGRAS:
1. Se um campo nao for encontrado, omita-o do resultado
2. Para datas, use formato ISO (YYYY-MM-DD)
3. Para valores monetarios, retorne apenas o numero (sem R$ ou pontuacao)
4. Para arrays, retorne uma lista de objetos
5. Sempre inclua o trecho exato do documento como evidencia
6. Se houver conflitos (valores diferentes em locais diferentes), liste todos em "conflicts"

Retorne APENAS JSON valido no formato:
{
  "fields": {
    "campo1": {
      "value": "valor extraido",
      "evidence": { "page": 1, "quote": "trecho do documento" },
      "confidence": 0.95
    },
    ...
  },
  "metadata": {
    "total_pages_analyzed": numero,
    "extraction_notes": "observacoes"
  }
}

DOCUMENTO:
${text.substring(0, 15000)}
`.trim();

  return prompt;
}

/**
 * Main extraction class
 */
export class DocumentExtractorService {
  constructor(options = {}) {
    this.model = options.model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    this.maxTokens = options.maxTokens || 4000;
    this.temperature = options.temperature || 0.1;
  }

  /**
   * Classify document type
   */
  async classifyDocument(text) {
    const prompt = `
Classifique o tipo do documento abaixo.
Retorne JSON com:
- type: "licitacao", "contrato", "termo_referencia", "edital", "minuta", "anexo", ou "outro"
- confidence: 0 a 1
- role: papel do documento (ex: "edital_principal", "termo_referencia", "minuta_contrato", "anexo_tecnico", etc)
- process_number: numero do processo se encontrado
- organization: orgao/empresa se identificado

DOCUMENTO:
${text.substring(0, 5000)}
`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um classificador de documentos juridicos e licitatorios. Responda apenas em JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { type: 'outro', confidence: 0, role: 'unknown' };
    } catch (error) {
      logger.error('Error classifying document', { error: error.message });
      return { type: 'outro', confidence: 0, role: 'unknown', error: error.message };
    }
  }

  /**
   * Extract fields from document using a schema
   */
  async extractFields(text, schemaType, options = {}) {
    const startTime = Date.now();
    const schema = getSchema(schemaType);

    if (!schema) {
      return {
        success: false,
        error: `Schema "${schemaType}" not found`,
        fields: {},
        metadata: {}
      };
    }

    const pageSegments = segmentByPages(text);
    const prompt = buildExtractionPrompt(schema, text, options);

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Voce e um extrator de dados especializado em documentos de ${schema.displayName}. Responda APENAS em JSON valido.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const usage = response.usage || {};

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const extractedFields = parsed.fields || {};

      // Enhance evidence with page segment data
      for (const [fieldName, fieldData] of Object.entries(extractedFields)) {
        if (fieldData.value && !fieldData.evidence?.quote) {
          const foundEvidence = findEvidence(text, String(fieldData.value), pageSegments);
          if (foundEvidence) {
            fieldData.evidence = foundEvidence;
          }
        }
      }

      // Validate extracted fields
      const validationResults = this.validateExtraction(extractedFields, schema);

      return {
        success: true,
        schemaType,
        schemaVersion: schema.version,
        fields: extractedFields,
        validation: validationResults,
        metadata: {
          ...parsed.metadata,
          model: this.model,
          processing_time_ms: Date.now() - startTime,
          tokens_input: usage.prompt_tokens,
          tokens_output: usage.completion_tokens,
          pages_detected: pageSegments.length
        }
      };
    } catch (error) {
      logger.error('Error extracting fields', {
        schemaType,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        schemaType,
        fields: {},
        metadata: {
          model: this.model,
          processing_time_ms: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Validate extracted fields against schema
   */
  validateExtraction(extractedFields, schema) {
    const results = {
      valid: true,
      missingRequired: [],
      invalidFields: [],
      warnings: []
    };

    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.required) {
        const extracted = extractedFields[fieldName];
        if (!extracted || extracted.value === null || extracted.value === undefined) {
          results.valid = false;
          results.missingRequired.push({
            field: fieldName,
            label: fieldDef.label
          });
        }
      }
    }

    // Validate field types
    for (const [fieldName, fieldData] of Object.entries(extractedFields)) {
      const fieldDef = schema.fields[fieldName];
      if (!fieldDef) {
        results.warnings.push({
          field: fieldName,
          message: 'Campo nao definido no schema'
        });
        continue;
      }

      const validation = validateFieldValue(fieldData.value, fieldDef);
      if (!validation.valid) {
        results.invalidFields.push({
          field: fieldName,
          value: fieldData.value,
          error: validation.error
        });
      }

      // Check confidence
      if (fieldData.confidence && fieldData.confidence < 0.5) {
        results.warnings.push({
          field: fieldName,
          message: `Baixa confianca: ${fieldData.confidence}`
        });
      }
    }

    if (results.invalidFields.length > 0) {
      results.valid = false;
    }

    return results;
  }

  /**
   * Generate a report from extracted data
   */
  async generateReport(extractedData, reportType, options = {}) {
    const reportTypes = {
      resumo_executivo: this.generateResumoExecutivo,
      checklist: this.generateChecklist,
      riscos: this.generateRiscos,
      cronograma: this.generateCronograma,
      comparativo: this.generateComparativo
    };

    const generator = reportTypes[reportType];
    if (!generator) {
      return {
        success: false,
        error: `Report type "${reportType}" not supported`
      };
    }

    return generator.call(this, extractedData, options);
  }

  /**
   * Generate executive summary
   */
  async generateResumoExecutivo(extractedData, options = {}) {
    const fields = extractedData.fields || {};
    const schemaType = extractedData.schemaType;

    const prompt = `
Com base nos dados extraidos abaixo, gere um RESUMO EXECUTIVO em formato Markdown.
O resumo deve ser conciso (max 500 palavras) e destacar:
1. Identificacao do documento
2. Objeto/Objetivo principal
3. Valores envolvidos
4. Datas importantes
5. Pontos de atencao

Tipo de documento: ${schemaType}
Dados extraidos: ${JSON.stringify(fields, null, 2)}

Retorne o resumo em Markdown.
`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um analista que gera resumos executivos de documentos juridicos.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      return {
        success: true,
        reportType: 'resumo_executivo',
        content: response.choices?.[0]?.message?.content || '',
        format: 'markdown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate compliance checklist
   */
  async generateChecklist(extractedData, options = {}) {
    const fields = extractedData.fields || {};
    const schemaType = extractedData.schemaType;
    const validation = extractedData.validation || {};

    const checklistItems = [];

    // Required fields check
    if (validation.missingRequired?.length > 0) {
      for (const missing of validation.missingRequired) {
        checklistItems.push({
          item: missing.label || missing.field,
          status: 'missing',
          priority: 'high',
          action: `Verificar/obter ${missing.label}`
        });
      }
    }

    // Schema-specific checks
    if (schemaType === 'licitacao') {
      // Habilitacao documents
      const docs = fields.documentos_habilitacao?.value || [];
      checklistItems.push({
        item: 'Documentos de Habilitacao',
        status: docs.length > 0 ? 'found' : 'missing',
        count: docs.length,
        priority: docs.length > 0 ? 'low' : 'high'
      });

      // Technical qualification
      const techQual = fields.qualificacao_tecnica?.value || [];
      checklistItems.push({
        item: 'Qualificacao Tecnica',
        status: techQual.length > 0 ? 'found' : 'verify',
        count: techQual.length,
        priority: 'high'
      });

      // Dates
      if (fields.data_abertura?.value) {
        const abertura = new Date(fields.data_abertura.value);
        const today = new Date();
        const daysUntil = Math.ceil((abertura - today) / (1000 * 60 * 60 * 24));
        checklistItems.push({
          item: 'Data de Abertura',
          status: daysUntil > 0 ? 'upcoming' : 'passed',
          value: fields.data_abertura.value,
          daysUntil,
          priority: daysUntil < 7 ? 'high' : 'medium'
        });
      }
    }

    if (schemaType === 'contrato') {
      // Vigencia
      if (fields.vigencia_fim?.value) {
        const fim = new Date(fields.vigencia_fim.value);
        const today = new Date();
        const daysUntil = Math.ceil((fim - today) / (1000 * 60 * 60 * 24));
        checklistItems.push({
          item: 'Vigencia do Contrato',
          status: daysUntil > 0 ? 'active' : 'expired',
          value: fields.vigencia_fim.value,
          daysUntil,
          priority: daysUntil < 30 ? 'high' : 'low'
        });
      }

      // Garantias
      const garantia = fields.garantia_contratual?.value;
      if (garantia?.exigida) {
        checklistItems.push({
          item: 'Garantia Contratual',
          status: 'required',
          value: garantia.percentual ? `${garantia.percentual}%` : 'Verificar',
          priority: 'high'
        });
      }
    }

    return {
      success: true,
      reportType: 'checklist',
      content: {
        items: checklistItems,
        summary: {
          total: checklistItems.length,
          missing: checklistItems.filter(i => i.status === 'missing').length,
          highPriority: checklistItems.filter(i => i.priority === 'high').length
        }
      },
      format: 'json'
    };
  }

  /**
   * Generate risk analysis
   */
  async generateRiscos(extractedData, options = {}) {
    const fields = extractedData.fields || {};
    const schemaType = extractedData.schemaType;

    const prompt = `
Analise os dados extraidos abaixo e identifique RISCOS potenciais.
Para cada risco, informe:
- descricao: o que e o risco
- categoria: financeiro, juridico, operacional, prazo, tecnico
- severidade: alta, media, baixa
- mitigacao: como mitigar o risco

Tipo de documento: ${schemaType}
Dados extraidos: ${JSON.stringify(fields, null, 2)}

Retorne um JSON com array "riscos".
`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um analista de riscos especializado em licitacoes e contratos.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { riscos: [] };

      return {
        success: true,
        reportType: 'riscos',
        content: {
          riscos: parsed.riscos || [],
          summary: {
            total: (parsed.riscos || []).length,
            alta: (parsed.riscos || []).filter(r => r.severidade === 'alta').length,
            media: (parsed.riscos || []).filter(r => r.severidade === 'media').length,
            baixa: (parsed.riscos || []).filter(r => r.severidade === 'baixa').length
          }
        },
        format: 'json'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate timeline/schedule
   */
  async generateCronograma(extractedData, options = {}) {
    const fields = extractedData.fields || {};
    const events = [];

    // Extract date fields
    const dateFields = [
      { key: 'data_publicacao', label: 'Publicacao' },
      { key: 'prazo_esclarecimentos', label: 'Prazo Esclarecimentos' },
      { key: 'prazo_impugnacao', label: 'Prazo Impugnacao' },
      { key: 'data_abertura', label: 'Abertura' },
      { key: 'data_assinatura', label: 'Assinatura' },
      { key: 'vigencia_inicio', label: 'Inicio Vigencia' },
      { key: 'vigencia_fim', label: 'Fim Vigencia' }
    ];

    for (const df of dateFields) {
      if (fields[df.key]?.value) {
        events.push({
          date: fields[df.key].value,
          event: df.label,
          evidence: fields[df.key].evidence
        });
      }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      success: true,
      reportType: 'cronograma',
      content: {
        events,
        summary: {
          total_events: events.length,
          first_date: events[0]?.date,
          last_date: events[events.length - 1]?.date
        }
      },
      format: 'json'
    };
  }

  /**
   * Generate comparison report (for multiple documents)
   */
  async generateComparativo(extractedDataList, options = {}) {
    if (!Array.isArray(extractedDataList) || extractedDataList.length < 2) {
      return {
        success: false,
        error: 'Comparativo requires at least 2 documents'
      };
    }

    const comparison = {
      documents: [],
      differences: [],
      conflicts: []
    };

    // Index documents
    for (let i = 0; i < extractedDataList.length; i++) {
      comparison.documents.push({
        index: i,
        schemaType: extractedDataList[i].schemaType,
        fieldCount: Object.keys(extractedDataList[i].fields || {}).length
      });
    }

    // Compare fields
    const allFields = new Set();
    for (const data of extractedDataList) {
      for (const key of Object.keys(data.fields || {})) {
        allFields.add(key);
      }
    }

    for (const field of allFields) {
      const values = extractedDataList.map((d, i) => ({
        docIndex: i,
        value: d.fields?.[field]?.value,
        evidence: d.fields?.[field]?.evidence
      }));

      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)));
      if (uniqueValues.size > 1) {
        comparison.differences.push({
          field,
          values
        });

        // Check for conflicts (different non-null values)
        const nonNullValues = values.filter(v => v.value != null);
        if (nonNullValues.length > 1) {
          const uniqueNonNull = new Set(nonNullValues.map(v => JSON.stringify(v.value)));
          if (uniqueNonNull.size > 1) {
            comparison.conflicts.push({
              field,
              values: nonNullValues
            });
          }
        }
      }
    }

    return {
      success: true,
      reportType: 'comparativo',
      content: comparison,
      format: 'json'
    };
  }
}

// Export singleton instance
export const documentExtractor = new DocumentExtractorService();

export default DocumentExtractorService;
