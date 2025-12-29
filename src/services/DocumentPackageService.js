/**
 * DocumentPackageService
 *
 * Manages document packages - groups of related documents
 * that belong to the same bidding process or contract.
 */

import OpenAI from 'openai';
import { defaultLogger } from '../utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'DocumentPackageService' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Document roles in a package
export const DocumentRoles = {
  // Licitacao
  EDITAL: 'edital',
  TERMO_REFERENCIA: 'termo_referencia',
  MINUTA_CONTRATO: 'minuta_contrato',
  ANEXO_TECNICO: 'anexo_tecnico',
  ANEXO_ECONOMICO: 'anexo_economico',
  PLANILHA_PRECOS: 'planilha_precos',
  PROJETO_BASICO: 'projeto_basico',

  // Contrato
  CONTRATO_PRINCIPAL: 'contrato_principal',
  ADITIVO: 'aditivo',
  APOSTILAMENTO: 'apostilamento',
  ORDEM_SERVICO: 'ordem_servico',
  NOTA_EMPENHO: 'nota_empenho',

  // Comum
  COMPROVANTE: 'comprovante',
  CERTIDAO: 'certidao',
  DECLARACAO: 'declaracao',
  PROCURACAO: 'procuracao',
  OUTRO: 'outro'
};

// Package types
export const PackageTypes = {
  LICITACAO: 'licitacao',
  CONTRATO: 'contrato',
  ADITIVO: 'aditivo',
  CUSTOM: 'custom'
};

// Package status
export const PackageStatus = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  REVIEW: 'review',
  COMPLETED: 'completed',
  DISTRIBUTED: 'distributed',
  ARCHIVED: 'archived'
};

/**
 * Document Package Service
 */
export class DocumentPackageService {
  constructor(options = {}) {
    this.model = options.model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  }

  /**
   * Classify the role of a document within a package
   */
  async classifyDocumentRole(text, packageType = null) {
    const prompt = `
Classifique o PAPEL deste documento em um processo de ${packageType || 'licitacao/contrato'}.

Possiveis papeis:
- edital: documento principal do edital de licitacao
- termo_referencia: termo de referencia ou especificacoes tecnicas
- minuta_contrato: minuta de contrato
- anexo_tecnico: anexo com especificacoes tecnicas
- anexo_economico: anexo com informacoes economicas/financeiras
- planilha_precos: planilha de formacao de precos
- projeto_basico: projeto basico
- contrato_principal: contrato assinado
- aditivo: termo aditivo ao contrato
- apostilamento: apostilamento de reajuste
- ordem_servico: ordem de servico
- nota_empenho: nota de empenho
- comprovante: comprovante de qualquer tipo
- certidao: certidao (negativa, positiva, etc)
- declaracao: declaracao
- procuracao: procuracao
- outro: outros documentos

Retorne JSON com:
- role: papel do documento
- confidence: 0 a 1
- title: titulo sugerido para o documento
- summary: resumo em 1 frase

DOCUMENTO (primeiros 3000 caracteres):
${text.substring(0, 3000)}
`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um classificador de documentos licitatorios. Responda apenas em JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { role: 'outro', confidence: 0, title: 'Documento', summary: '' };
    } catch (error) {
      logger.error('Error classifying document role', { error: error.message });
      return { role: 'outro', confidence: 0, title: 'Documento', error: error.message };
    }
  }

  /**
   * Detect process number from document text
   */
  detectProcessNumber(text) {
    const patterns = [
      // Pregao Eletronico
      /Preg[aã]o\s*(?:Eletr[oô]nico)?\s*(?:N[º°]?\.?\s*)?(\d+[\/.]\d{4})/gi,
      // Processo
      /Processo\s*(?:Administrativo)?\s*(?:N[º°]?\.?\s*)?([\d.\/]+(?:\/\d{4})?)/gi,
      // UASG
      /UASG\s*(?:N[º°]?\.?\s*)?(\d{6})/gi,
      // Generic number/year
      /N[º°]?\s*(\d{2,5}[\/.]\d{4})/gi
    ];

    const matches = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          value: match[1] || match[0],
          type: pattern.source.includes('Preg') ? 'pregao' :
            pattern.source.includes('UASG') ? 'uasg' : 'processo',
          position: match.index
        });
      }
    }

    // Return the most likely process number (first non-UASG match)
    const processMatch = matches.find(m => m.type !== 'uasg');
    return processMatch ? processMatch.value : (matches[0]?.value || null);
  }

  /**
   * Detect organization from document text
   */
  detectOrganization(text) {
    const patterns = [
      // Ministerios
      /Minist[eé]rio\s+(?:d[aeo]\s+)?[\w\s]+/gi,
      // Secretarias
      /Secretaria\s+(?:d[aeo]\s+)?[\w\s]+/gi,
      // Prefeituras
      /Prefeitura\s+(?:Municipal\s+)?(?:d[aeo]\s+)?[\w\s]+/gi,
      // Universidades
      /Universidade\s+(?:Federal|Estadual)?\s*(?:d[aeo]\s+)?[\w\s]+/gi,
      // CNPJ context
      /(?:CONTRATANTE|ORGAO|LICITANTE)[:\s]+([^\n]+)/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[0].trim().substring(0, 100);
      }
    }

    return null;
  }

  /**
   * Auto-link documents to a package based on process number
   */
  async suggestPackageLinks(documents, existingPackages = []) {
    const suggestions = [];
    const documentsWithProcess = [];

    // Extract process numbers from documents
    for (const doc of documents) {
      const processNumber = this.detectProcessNumber(doc.text || '');
      if (processNumber) {
        documentsWithProcess.push({
          ...doc,
          detectedProcessNumber: processNumber
        });
      }
    }

    // Group documents by process number
    const groupedByProcess = {};
    for (const doc of documentsWithProcess) {
      const key = doc.detectedProcessNumber;
      if (!groupedByProcess[key]) {
        groupedByProcess[key] = [];
      }
      groupedByProcess[key].push(doc);
    }

    // Create suggestions
    for (const [processNumber, docs] of Object.entries(groupedByProcess)) {
      // Check if package already exists
      const existingPackage = existingPackages.find(p =>
        p.process_number === processNumber
      );

      if (existingPackage) {
        suggestions.push({
          action: 'add_to_existing',
          packageId: existingPackage.id,
          packageName: existingPackage.name,
          processNumber,
          documents: docs.map(d => ({ id: d.id, name: d.name }))
        });
      } else if (docs.length > 1) {
        suggestions.push({
          action: 'create_new',
          processNumber,
          suggestedName: `Processo ${processNumber}`,
          suggestedType: this.inferPackageType(docs),
          documents: docs.map(d => ({ id: d.id, name: d.name }))
        });
      }
    }

    return suggestions;
  }

  /**
   * Infer package type from documents
   */
  inferPackageType(documents) {
    const roles = documents.map(d => d.role).filter(Boolean);

    if (roles.includes('edital') || roles.includes('termo_referencia')) {
      return PackageTypes.LICITACAO;
    }
    if (roles.includes('contrato_principal')) {
      return PackageTypes.CONTRATO;
    }
    if (roles.includes('aditivo')) {
      return PackageTypes.ADITIVO;
    }

    return PackageTypes.CUSTOM;
  }

  /**
   * Validate package completeness
   */
  validatePackageCompleteness(documents, packageType) {
    const results = {
      complete: true,
      missingRoles: [],
      warnings: [],
      score: 0
    };

    // Required roles by package type
    const requiredRoles = {
      [PackageTypes.LICITACAO]: ['edital'],
      [PackageTypes.CONTRATO]: ['contrato_principal'],
      [PackageTypes.ADITIVO]: ['aditivo', 'contrato_principal']
    };

    // Recommended roles
    const recommendedRoles = {
      [PackageTypes.LICITACAO]: ['termo_referencia', 'minuta_contrato'],
      [PackageTypes.CONTRATO]: []
    };

    const documentRoles = documents.map(d => d.role).filter(Boolean);
    const required = requiredRoles[packageType] || [];
    const recommended = recommendedRoles[packageType] || [];

    // Check required
    for (const role of required) {
      if (!documentRoles.includes(role)) {
        results.complete = false;
        results.missingRoles.push({
          role,
          required: true,
          label: this.getRoleLabel(role)
        });
      }
    }

    // Check recommended
    for (const role of recommended) {
      if (!documentRoles.includes(role)) {
        results.warnings.push({
          role,
          required: false,
          label: this.getRoleLabel(role),
          message: `Recomendado incluir: ${this.getRoleLabel(role)}`
        });
      }
    }

    // Calculate completeness score
    const totalExpected = required.length + recommended.length;
    const found = documentRoles.filter(r =>
      required.includes(r) || recommended.includes(r)
    ).length;

    results.score = totalExpected > 0 ? Math.round((found / totalExpected) * 100) : 100;

    return results;
  }

  /**
   * Get human-readable role label
   */
  getRoleLabel(role) {
    const labels = {
      [DocumentRoles.EDITAL]: 'Edital',
      [DocumentRoles.TERMO_REFERENCIA]: 'Termo de Referencia',
      [DocumentRoles.MINUTA_CONTRATO]: 'Minuta de Contrato',
      [DocumentRoles.ANEXO_TECNICO]: 'Anexo Tecnico',
      [DocumentRoles.ANEXO_ECONOMICO]: 'Anexo Economico',
      [DocumentRoles.PLANILHA_PRECOS]: 'Planilha de Precos',
      [DocumentRoles.PROJETO_BASICO]: 'Projeto Basico',
      [DocumentRoles.CONTRATO_PRINCIPAL]: 'Contrato Principal',
      [DocumentRoles.ADITIVO]: 'Termo Aditivo',
      [DocumentRoles.APOSTILAMENTO]: 'Apostilamento',
      [DocumentRoles.ORDEM_SERVICO]: 'Ordem de Servico',
      [DocumentRoles.NOTA_EMPENHO]: 'Nota de Empenho',
      [DocumentRoles.COMPROVANTE]: 'Comprovante',
      [DocumentRoles.CERTIDAO]: 'Certidao',
      [DocumentRoles.DECLARACAO]: 'Declaracao',
      [DocumentRoles.PROCURACAO]: 'Procuracao',
      [DocumentRoles.OUTRO]: 'Outro'
    };

    return labels[role] || role;
  }

  /**
   * Generate package summary
   */
  async generatePackageSummary(packageData, documents) {
    const docsSummary = documents.map(d => ({
      role: d.role,
      title: d.title,
      summary: d.summary
    }));

    const prompt = `
Gere um resumo do pacote de documentos abaixo.

Pacote:
- Tipo: ${packageData.package_type}
- Processo: ${packageData.process_number || 'Nao identificado'}
- Orgao: ${packageData.organization || 'Nao identificado'}

Documentos:
${JSON.stringify(docsSummary, null, 2)}

Retorne JSON com:
- title: titulo sugerido para o pacote
- summary: resumo em 2-3 frases
- key_dates: datas importantes identificadas
- key_values: valores importantes identificados
- recommendations: lista de recomendacoes
`.trim();

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Voce e um analista de documentos licitatorios. Responda apenas em JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { title: packageData.name, summary: '', recommendations: [] };
    } catch (error) {
      logger.error('Error generating package summary', { error: error.message });
      return { title: packageData.name, summary: '', error: error.message };
    }
  }

  /**
   * Merge extractions from multiple documents in a package
   */
  mergePackageExtractions(extractions, schemaType) {
    const merged = {
      fields: {},
      conflicts: [],
      sources: []
    };

    for (let i = 0; i < extractions.length; i++) {
      const extraction = extractions[i];
      const docId = extraction.documentId || i;

      merged.sources.push({
        docId,
        schemaType: extraction.schemaType,
        fieldCount: Object.keys(extraction.fields || {}).length
      });

      for (const [fieldName, fieldData] of Object.entries(extraction.fields || {})) {
        if (!merged.fields[fieldName]) {
          // First occurrence
          merged.fields[fieldName] = {
            ...fieldData,
            sourceDoc: docId
          };
        } else {
          // Check for conflict
          const existing = merged.fields[fieldName];
          const existingValue = JSON.stringify(existing.value);
          const newValue = JSON.stringify(fieldData.value);

          if (existingValue !== newValue && fieldData.value != null) {
            // Conflict detected
            merged.conflicts.push({
              field: fieldName,
              values: [
                { value: existing.value, source: existing.sourceDoc, evidence: existing.evidence },
                { value: fieldData.value, source: docId, evidence: fieldData.evidence }
              ]
            });

            // Keep higher confidence value
            if ((fieldData.confidence || 0) > (existing.confidence || 0)) {
              merged.fields[fieldName] = {
                ...fieldData,
                sourceDoc: docId,
                hasConflict: true
              };
            }
          }
        }
      }
    }

    return merged;
  }
}

// Export singleton instance
export const documentPackageService = new DocumentPackageService();

export default DocumentPackageService;
