/**
 * document_handler_agent.js
 * Document Handler Agent - Processes and analyzes documents
 *
 * RESPONSIBILITIES:
 * 1. Receive documents via WhatsApp/email/upload
 * 2. Extract text (with OCR if needed)
 * 3. Classify document type
 * 4. Extract structured fields with evidence
 * 5. Generate reports (summary, checklist, risks)
 * 6. Distribute to recipients
 */

import { analyzeDocument } from '../tools/document_analyzer.js';
import { DocumentExtractorService } from '../services/DocumentExtractorService.js';
import { DocumentPackageService, PackageTypes, DocumentRoles } from '../services/DocumentPackageService.js';
import { createDocumentRepositories } from '../repositories/document.repository.js';
import { getSchema, getSchemaTypes } from '../schemas/document-schemas.js';
import { sendEmail } from '../services/EmailService.js';
import { sendWhatsAppText } from '../services/whatsappAdapterProvider.js';
import { getDatabase } from '../db/index.js';
import { defaultLogger } from '../utils/logger.enhanced.js';
import openaiClient from '../core/openai_client.js';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

const logger = defaultLogger.child({ module: 'DocumentHandlerAgent' });

/**
 * Document Handler Agent
 * Specializes in processing legal/bidding documents
 */
export class DocumentHandlerAgent {
  constructor() {
    this.hub = null;
    this.name = 'document_handler';
    this.extractorService = new DocumentExtractorService();
    this.packageService = new DocumentPackageService();
  }

  /**
   * Get repositories
   */
  getRepositories() {
    const db = getDatabase();
    return createDocumentRepositories(db, logger);
  }

  /**
   * Process incoming message
   * Checks for document attachments and processes accordingly
   */
  async process(message, context) {
    const { fromContact, text } = message;
    const { leadState, metadata, agentConfig } = context;

    logger.info(`[DocumentHandler] Processing message from ${fromContact}`);

    try {
      // Check if message has document attachment
      const hasDocument = metadata?.mediaUrl || metadata?.documentUrl;

      if (hasDocument) {
        return await this.processDocumentMessage(message, context);
      }

      // No document - handle as regular conversation
      return await this.handleConversation(message, context);
    } catch (error) {
      logger.error('[DocumentHandler] Processing error', { error: error.message });

      return {
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        updateState: {
          metadata: {
            ...leadState.metadata,
            lastError: error.message,
            lastErrorAt: new Date().toISOString()
          }
        }
      };
    }
  }

  /**
   * Process message with document attachment
   */
  async processDocumentMessage(message, context) {
    const { fromContact } = message;
    const { leadState, metadata, agentConfig } = context;
    const tenantId = metadata?.tenantId || 'default';

    const documentUrl = metadata?.mediaUrl || metadata?.documentUrl;
    const fileName = metadata?.fileName || `document_${Date.now()}.pdf`;

    logger.info('[DocumentHandler] Processing document', { documentUrl, fileName });

    try {
      // Download document to temp location
      const tempPath = await this.downloadDocument(documentUrl, fileName);

      if (!tempPath) {
        return {
          message: 'Nao consegui baixar o documento. Por favor, envie novamente.',
          metadata: { error: 'download_failed' }
        };
      }

      // Analyze document (extract text)
      const analysis = await analyzeDocument(tempPath);

      // Classify document
      const classification = await this.extractorService.classifyDocument(analysis.content);

      // Classify role
      const roleClassification = await this.packageService.classifyDocumentRole(
        analysis.content,
        classification.type
      );

      // Detect process number and organization
      const processNumber = this.packageService.detectProcessNumber(analysis.content);
      const organization = this.packageService.detectOrganization(analysis.content);

      // Save to database
      const repos = this.getRepositories();
      const fileStats = fs.statSync(tempPath);

      const { documentId, versionId } = repos.documents.createWithVersion(
        tenantId,
        {
          name: fileName,
          agentId: agentConfig?.id,
          origin: 'whatsapp',
          status: 'processing'
        },
        {
          fileName,
          storagePath: tempPath,
          mimeType: 'application/pdf',
          fileSize: fileStats.size,
          textContent: analysis.content,
          pageCount: analysis.pageCount,
          ocrApplied: analysis.ocrApplied || false
        }
      );

      // Extract structured data if schema detected
      let extractionResult = null;
      let runId = null;

      if (['licitacao', 'contrato', 'termo_referencia'].includes(classification.type)) {
        runId = repos.extractionRuns.createRun({
          documentVersionId: versionId,
          schemaType: classification.type,
          model: this.extractorService.model,
          promptVersion: '1.0.0'
        });

        try {
          extractionResult = await this.extractorService.extractFields(
            analysis.content,
            classification.type
          );

          if (extractionResult.success && extractionResult.fields) {
            repos.extractedFields.saveFields(runId, extractionResult.fields);
          }

          repos.extractionRuns.completeRun(runId, {
            success: extractionResult.success,
            error: extractionResult.error,
            tokensInput: extractionResult.metadata?.tokens_input,
            tokensOutput: extractionResult.metadata?.tokens_output,
            processingTimeMs: extractionResult.metadata?.processing_time_ms
          });
        } catch (error) {
          repos.extractionRuns.completeRun(runId, {
            success: false,
            error: error.message
          });
        }
      }

      // Update document status
      repos.documents.updateStatus(tenantId, documentId, 'completed');

      // Build response message
      const response = this.buildDocumentResponse(
        fileName,
        classification,
        roleClassification,
        processNumber,
        organization,
        extractionResult
      );

      // Check if should auto-create package
      if (processNumber && agentConfig?.settings?.autoCreatePackage) {
        const existingPackage = repos.packages.findByProcessNumber(tenantId, processNumber);

        if (existingPackage) {
          repos.packages.addDocument(existingPackage.id, versionId, roleClassification?.role, 0);
          response.message += `\n\nDocumento adicionado ao pacote existente: ${existingPackage.name}`;
        } else {
          const pkg = repos.packages.createPackage(tenantId, {
            name: `Processo ${processNumber}`,
            processNumber,
            organization,
            packageType: classification.type === 'licitacao' ? PackageTypes.LICITACAO :
              classification.type === 'contrato' ? PackageTypes.CONTRATO : PackageTypes.CUSTOM,
            agentId: agentConfig?.id
          });
          repos.packages.addDocument(pkg.id, versionId, roleClassification?.role, 0);
          response.message += `\n\nPacote criado automaticamente: ${pkg.name}`;
        }
      }

      // Update lead state with document info
      return {
        message: response.message,
        updateState: {
          metadata: {
            ...leadState.metadata,
            lastDocumentId: documentId,
            lastDocumentType: classification.type,
            lastDocumentRole: roleClassification?.role,
            processNumber,
            organization,
            documentsProcessed: (leadState.metadata?.documentsProcessed || 0) + 1
          }
        },
        metadata: {
          documentId,
          classification,
          extraction: extractionResult
        }
      };
    } catch (error) {
      logger.error('[DocumentHandler] Document processing error', { error: error.message });

      return {
        message: `Erro ao processar documento: ${error.message}. Por favor, tente novamente ou envie em outro formato.`,
        updateState: {
          metadata: {
            ...leadState.metadata,
            lastError: error.message
          }
        }
      };
    }
  }

  /**
   * Handle regular conversation (no document)
   */
  async handleConversation(message, context) {
    const { text } = message;
    const { leadState, agentConfig } = context;

    // Check for commands
    const lowerText = (text || '').toLowerCase().trim();

    // Help command
    if (lowerText === 'ajuda' || lowerText === 'help' || lowerText === '/help') {
      return {
        message: this.getHelpMessage(agentConfig)
      };
    }

    // Status command
    if (lowerText === 'status' || lowerText === '/status') {
      return {
        message: this.getStatusMessage(leadState)
      };
    }

    // Generate report command
    if (lowerText.startsWith('relatorio') || lowerText.startsWith('report')) {
      return await this.handleReportCommand(text, leadState, context);
    }

    // Default: prompt for document
    return {
      message: this.getPromptMessage(agentConfig)
    };
  }

  /**
   * Download document from URL
   */
  async downloadDocument(url, fileName) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Create uploads directory if needed
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const tempPath = path.join(uploadsDir, `${Date.now()}_${nanoid(8)}_${fileName}`);
      fs.writeFileSync(tempPath, buffer);

      return tempPath;
    } catch (error) {
      logger.error('[DocumentHandler] Download failed', { url, error: error.message });
      return null;
    }
  }

  /**
   * Build response message for processed document
   */
  buildDocumentResponse(fileName, classification, roleClassification, processNumber, organization, extractionResult) {
    const lines = [
      `Documento recebido: ${fileName}`,
      '',
      `Tipo: ${this.getTypeLabel(classification.type)} (${Math.round(classification.confidence * 100)}% confianca)`,
      `Papel: ${this.packageService.getRoleLabel(roleClassification?.role || 'outro')}`
    ];

    if (processNumber) {
      lines.push(`Processo: ${processNumber}`);
    }

    if (organization) {
      lines.push(`Orgao: ${organization}`);
    }

    if (extractionResult?.success) {
      const fieldCount = Object.keys(extractionResult.fields || {}).length;
      lines.push('');
      lines.push(`Campos extraidos: ${fieldCount}`);

      // Show key fields
      const keyFields = this.getKeyFields(extractionResult.schemaType);
      for (const fieldName of keyFields) {
        const field = extractionResult.fields?.[fieldName];
        if (field?.value) {
          lines.push(`- ${this.getFieldLabel(fieldName)}: ${this.formatFieldValue(field.value)}`);
        }
      }

      if (extractionResult.validation?.missingRequired?.length > 0) {
        lines.push('');
        lines.push(`Campos pendentes: ${extractionResult.validation.missingRequired.map(f => f.label).join(', ')}`);
      }
    }

    lines.push('');
    lines.push('Deseja que eu gere um relatorio? Responda com:');
    lines.push('- "resumo" para resumo executivo');
    lines.push('- "checklist" para lista de verificacao');
    lines.push('- "riscos" para analise de riscos');
    lines.push('- "cronograma" para cronograma');

    return {
      message: lines.join('\n')
    };
  }

  /**
   * Get type label
   */
  getTypeLabel(type) {
    const labels = {
      licitacao: 'Licitacao',
      contrato: 'Contrato',
      termo_referencia: 'Termo de Referencia',
      edital: 'Edital',
      minuta: 'Minuta',
      anexo: 'Anexo',
      outro: 'Outro'
    };
    return labels[type] || type;
  }

  /**
   * Get key fields for schema type
   */
  getKeyFields(schemaType) {
    const keyFields = {
      licitacao: ['numero_processo', 'modalidade', 'orgao', 'data_abertura', 'valor_estimado', 'objeto_resumo'],
      contrato: ['numero_contrato', 'contratante', 'contratada', 'valor_total', 'data_assinatura', 'vigencia_fim'],
      termo_referencia: ['objeto', 'valor_estimado', 'prazo_execucao']
    };
    return keyFields[schemaType] || [];
  }

  /**
   * Get field label
   */
  getFieldLabel(fieldName) {
    const labels = {
      numero_processo: 'Processo',
      modalidade: 'Modalidade',
      orgao: 'Orgao',
      data_abertura: 'Abertura',
      valor_estimado: 'Valor',
      objeto_resumo: 'Objeto',
      numero_contrato: 'Contrato',
      contratante: 'Contratante',
      contratada: 'Contratada',
      valor_total: 'Valor Total',
      data_assinatura: 'Assinatura',
      vigencia_fim: 'Vigencia'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Format field value for display
   */
  formatFieldValue(value) {
    if (value === null || value === undefined) return '-';

    if (typeof value === 'object') {
      if (value.nome) return value.nome;
      return JSON.stringify(value).substring(0, 50);
    }

    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    }

    return String(value).substring(0, 100);
  }

  /**
   * Handle report generation command
   */
  async handleReportCommand(text, leadState, context) {
    const lastDocumentId = leadState.metadata?.lastDocumentId;

    if (!lastDocumentId) {
      return {
        message: 'Nenhum documento processado recentemente. Por favor, envie um documento primeiro.'
      };
    }

    const reportType = this.parseReportType(text);

    if (!reportType) {
      return {
        message: 'Tipo de relatorio nao reconhecido. Use: resumo, checklist, riscos ou cronograma.'
      };
    }

    try {
      const repos = this.getRepositories();
      const tenantId = context.metadata?.tenantId || 'default';

      // Get document with latest version
      const document = repos.documents.getWithLatestVersion(tenantId, lastDocumentId);

      if (!document?.latestVersion) {
        return {
          message: 'Documento nao encontrado. Por favor, envie o documento novamente.'
        };
      }

      // Get latest extraction
      const extractions = repos.extractionRuns.findByDocumentVersion(document.latestVersion.id);
      const latestExtraction = extractions.find(e => e.status === 'completed');

      if (!latestExtraction) {
        return {
          message: 'Nenhuma extracao encontrada para este documento. Por favor, envie novamente.'
        };
      }

      // Get extracted fields
      const runWithFields = repos.extractionRuns.getWithFields(latestExtraction.id);

      // Build extracted data
      const extractedData = {
        schemaType: latestExtraction.schema_type,
        fields: {}
      };

      for (const field of runWithFields.fields || []) {
        extractedData.fields[field.field_name] = {
          value: JSON.parse(field.field_value || 'null'),
          evidence: field.evidence ? JSON.parse(field.evidence) : null,
          confidence: field.confidence
        };
      }

      // Generate report
      const reportResult = await this.extractorService.generateReport(extractedData, reportType);

      if (!reportResult.success) {
        return {
          message: `Erro ao gerar relatorio: ${reportResult.error}`
        };
      }

      // Format report for WhatsApp
      const formattedReport = this.formatReportForWhatsApp(reportResult, reportType);

      // Save report
      repos.reports.createReport(tenantId, {
        extractionRunId: latestExtraction.id,
        reportType,
        title: `Relatorio ${reportType} - ${document.name}`,
        content: reportResult.content,
        format: reportResult.format
      });

      return {
        message: formattedReport,
        metadata: { reportGenerated: reportType }
      };
    } catch (error) {
      logger.error('[DocumentHandler] Report generation error', { error: error.message });
      return {
        message: `Erro ao gerar relatorio: ${error.message}`
      };
    }
  }

  /**
   * Parse report type from text
   */
  parseReportType(text) {
    const lower = text.toLowerCase();

    if (lower.includes('resumo') || lower.includes('executivo') || lower.includes('summary')) {
      return 'resumo_executivo';
    }
    if (lower.includes('checklist') || lower.includes('verificacao') || lower.includes('check')) {
      return 'checklist';
    }
    if (lower.includes('risco') || lower.includes('risk')) {
      return 'riscos';
    }
    if (lower.includes('cronograma') || lower.includes('prazo') || lower.includes('schedule')) {
      return 'cronograma';
    }

    return null;
  }

  /**
   * Format report for WhatsApp display
   */
  formatReportForWhatsApp(reportResult, reportType) {
    const content = reportResult.content;

    if (reportResult.format === 'markdown') {
      // Already markdown - return as is with header
      return `*Relatorio: ${this.getReportTypeLabel(reportType)}*\n\n${content}`;
    }

    if (reportResult.format === 'json') {
      // Convert JSON to readable format
      if (reportType === 'checklist' && content.items) {
        const lines = [`*Checklist de Verificacao*`, ''];

        for (const item of content.items) {
          const emoji = item.status === 'found' ? '' : item.status === 'missing' ? '' : '';
          const priority = item.priority === 'high' ? ' (ALTA)' : '';
          lines.push(`${emoji} ${item.item}${priority}`);
        }

        lines.push('');
        lines.push(`Total: ${content.summary.total} itens`);
        lines.push(`Pendentes: ${content.summary.missing}`);
        lines.push(`Alta prioridade: ${content.summary.highPriority}`);

        return lines.join('\n');
      }

      if (reportType === 'riscos' && content.riscos) {
        const lines = [`*Analise de Riscos*`, ''];

        for (const risco of content.riscos) {
          const emoji = risco.severidade === 'alta' ? '' : risco.severidade === 'media' ? '' : '';
          lines.push(`${emoji} *${risco.categoria}* (${risco.severidade})`);
          lines.push(`  ${risco.descricao}`);
          if (risco.mitigacao) {
            lines.push(`  Mitigacao: ${risco.mitigacao}`);
          }
          lines.push('');
        }

        lines.push(`Total: ${content.summary.total} riscos`);
        lines.push(`Alta: ${content.summary.alta} | Media: ${content.summary.media} | Baixa: ${content.summary.baixa}`);

        return lines.join('\n');
      }

      if (reportType === 'cronograma' && content.events) {
        const lines = [`*Cronograma*`, ''];

        for (const event of content.events) {
          lines.push(`${event.date}: ${event.event}`);
        }

        return lines.join('\n');
      }

      // Fallback: stringify JSON
      return `*${this.getReportTypeLabel(reportType)}*\n\n${JSON.stringify(content, null, 2)}`;
    }

    return content;
  }

  /**
   * Get report type label
   */
  getReportTypeLabel(type) {
    const labels = {
      resumo_executivo: 'Resumo Executivo',
      checklist: 'Checklist de Verificacao',
      riscos: 'Analise de Riscos',
      cronograma: 'Cronograma'
    };
    return labels[type] || type;
  }

  /**
   * Get help message
   */
  getHelpMessage(agentConfig) {
    const lines = [
      '*Assistente de Documentos*',
      '',
      'Envie um documento PDF e eu vou:',
      ' Extrair o texto',
      ' Classificar o tipo',
      ' Extrair campos importantes',
      ' Gerar relatorios',
      '',
      '*Comandos disponiveis:*',
      '- ajuda: mostra esta mensagem',
      '- status: mostra documentos processados',
      '- resumo: gera resumo executivo',
      '- checklist: gera lista de verificacao',
      '- riscos: gera analise de riscos',
      '- cronograma: gera cronograma',
      '',
      '*Tipos de documento suportados:*',
      '- Editais de licitacao',
      '- Contratos',
      '- Termos de referencia',
      '- Minutas',
      '- Anexos tecnicos'
    ];

    return lines.join('\n');
  }

  /**
   * Get prompt message
   */
  getPromptMessage(agentConfig) {
    return 'Ola! Sou o assistente de documentos. Envie um PDF de licitacao, contrato ou termo de referencia para analise. Digite "ajuda" para mais informacoes.';
  }

  /**
   * Get status message
   */
  getStatusMessage(leadState) {
    const processed = leadState.metadata?.documentsProcessed || 0;
    const lastType = leadState.metadata?.lastDocumentType;
    const processNumber = leadState.metadata?.processNumber;

    const lines = [
      '*Status*',
      '',
      `Documentos processados: ${processed}`
    ];

    if (lastType) {
      lines.push(`Ultimo tipo: ${this.getTypeLabel(lastType)}`);
    }

    if (processNumber) {
      lines.push(`Processo: ${processNumber}`);
    }

    if (processed === 0) {
      lines.push('');
      lines.push('Envie um documento para comecar.');
    }

    return lines.join('\n');
  }
}

// Export singleton
export const documentHandlerAgent = new DocumentHandlerAgent();

export default DocumentHandlerAgent;
