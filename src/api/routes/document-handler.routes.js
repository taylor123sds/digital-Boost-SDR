/**
 * @file document-handler.routes.js
 * @description API routes for Document Handler agent functionality
 *
 * Provides endpoints for:
 * - Document upload and processing
 * - Package management
 * - Structured field extraction
 * - Report generation and distribution
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { analyzeDocument } from '../../tools/document_analyzer.js';
import { DocumentExtractorService } from '../../services/DocumentExtractorService.js';
import { DocumentPackageService, PackageTypes, DocumentRoles } from '../../services/DocumentPackageService.js';
import { createDocumentRepositories } from '../../repositories/document.repository.js';
import { getSchemaTypes } from '../../schemas/document-schemas.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';
import { getDatabase } from '../../db/index.js';
import { DocumentDispatchService } from '../../services/DocumentDispatchService.js';
import { getAgentRepository } from '../../repositories/agent.repository.js';

const logger = defaultLogger.child({ module: 'DocumentHandlerRoutes' });
const dispatchService = new DocumentDispatchService();
const router = express.Router();

// Initialize services
const extractorService = new DocumentExtractorService();
const packageService = new DocumentPackageService();

// Upload directory
const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${nanoid(8)}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    const isAllowed = allowedTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isAllowed) {
      return cb(new Error('Apenas PDFs e imagens sao aceitos.'));
    }
    cb(null, true);
  }
});

// Helper to get repositories
function getRepositories(req) {
  const db = getDatabase();
  return createDocumentRepositories(db, logger);
}

// Calculate file hash
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// ============================================================================
// DOCUMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/documents/upload
 * Upload and process a document
 */
router.post(
  '/api/documents/upload',
  authenticate,
  tenantContext,
  requireTenant,
  upload.single('file'),
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo obrigatorio.' });
    }

    const tenantId = req.tenantId;
    const { agentId, packageId, processImmediately = true } = req.body;

    try {
      logger.info('Document upload started', {
        fileName: file.originalname,
        agentId,
        tenantId
      });

      const repos = getRepositories(req);
      const fileHash = calculateFileHash(file.path);
      const fileStats = fs.statSync(file.path);

      // Create document and version
      const { documentId, versionId } = repos.documents.createWithVersion(
        tenantId,
        {
          name: file.originalname,
          agentId,
          origin: 'upload',
          status: processImmediately ? 'processing' : 'pending'
        },
        {
          fileName: file.originalname,
          fileHash,
          storagePath: file.path,
          mimeType: file.mimetype,
          fileSize: fileStats.size
        }
      );

      let extractionResult = null;
      let classification = null;

      if (processImmediately) {
        // Analyze document (extract text)
        const analysis = await analyzeDocument(file.path);

        // Update version with text
        repos.documents.updateVersionText(
          versionId,
          analysis.content,
          analysis.pageCount,
          analysis.ocrApplied || false
        );

        // Classify document
        classification = await extractorService.classifyDocument(analysis.content);

        // Classify role
        const roleClassification = await packageService.classifyDocumentRole(
          analysis.content,
          classification.type
        );

        // If schema type detected, extract fields
        if (['licitacao', 'contrato', 'termo_referencia'].includes(classification.type)) {
          const runId = repos.extractionRuns.createRun({
            documentVersionId: versionId,
            schemaType: classification.type,
            model: extractorService.model,
            promptVersion: '1.0.0'
          });

          try {
            extractionResult = await extractorService.extractFields(
              analysis.content,
              classification.type
            );

            // Save extracted fields
            if (extractionResult.success && extractionResult.fields) {
              repos.extractedFields.saveFields(runId, extractionResult.fields);
            }

            // Complete run
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

        // If packageId provided, add to package
        if (packageId) {
          repos.packages.addDocument(
            packageId,
            versionId,
            roleClassification?.role || 'outro',
            0
          );
        }
      }

      return res.status(201).json({
        success: true,
        documentId,
        versionId,
        fileName: file.originalname,
        fileHash,
        classification,
        extraction: extractionResult ? {
          success: extractionResult.success,
          schemaType: extractionResult.schemaType,
          fieldCount: Object.keys(extractionResult.fields || {}).length,
          validation: extractionResult.validation
        } : null
      });
    } catch (error) {
      logger.error('Document upload failed', { error: error.message });

      // Cleanup file on error
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          logger.warn('Failed to cleanup file', { error: e.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Falha ao processar documento',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/documents
 * List documents
 */
router.get(
  '/api/documents',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { agentId, status, page = 1, limit = 20 } = req.query;

      let documents;
      const options = {
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        orderBy: 'created_at',
        order: 'DESC'
      };

      if (agentId) {
        documents = repos.documents.findByAgent(req.tenantId, agentId, options);
      } else if (status) {
        documents = repos.documents.findByStatus(req.tenantId, status, options);
      } else {
        documents = repos.documents.findAllForTenant(req.tenantId, options);
      }

      const total = repos.documents.countForTenant(req.tenantId);

      return res.json({
        success: true,
        documents,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    } catch (error) {
      logger.error('Failed to list documents', { error: error.message });
      return res.status(500).json({ error: 'Falha ao listar documentos' });
    }
  }
);

/**
 * GET /api/documents/:id
 * Get document with versions and extractions
 */
router.get(
  '/api/documents/:id',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const document = repos.documents.getWithVersions(req.tenantId, req.params.id);

      if (!document) {
        return res.status(404).json({ error: 'Documento nao encontrado' });
      }

      // Get extractions for each version
      for (const version of document.versions) {
        version.extractions = repos.extractionRuns.findByDocumentVersion(version.id);
      }

      return res.json({ success: true, document });
    } catch (error) {
      logger.error('Failed to get document', { error: error.message });
      return res.status(500).json({ error: 'Falha ao obter documento' });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Delete document
 */
router.delete(
  '/api/documents/:id',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const document = repos.documents.getWithVersions(req.tenantId, req.params.id);

      if (!document) {
        return res.status(404).json({ error: 'Documento nao encontrado' });
      }

      // Delete files
      for (const version of document.versions || []) {
        if (version.storage_path && fs.existsSync(version.storage_path)) {
          try {
            fs.unlinkSync(version.storage_path);
          } catch (e) {
            logger.warn('Failed to delete file', { path: version.storage_path });
          }
        }
      }

      // Delete from database (cascade will handle versions)
      repos.documents.deleteForTenant(req.tenantId, req.params.id);

      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete document', { error: error.message });
      return res.status(500).json({ error: 'Falha ao excluir documento' });
    }
  }
);

// ============================================================================
// EXTRACTION ENDPOINTS
// ============================================================================

/**
 * POST /api/documents/:id/extract
 * Re-run extraction on a document
 */
router.post(
  '/api/documents/:id/extract',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { schemaType } = req.body;

      if (!schemaType) {
        return res.status(400).json({ error: 'schemaType obrigatorio' });
      }

      const document = repos.documents.getWithLatestVersion(req.tenantId, req.params.id);

      if (!document) {
        return res.status(404).json({ error: 'Documento nao encontrado' });
      }

      const version = document.latestVersion;
      if (!version?.text_content) {
        return res.status(400).json({ error: 'Documento sem texto extraido' });
      }

      // Create extraction run
      const runId = repos.extractionRuns.createRun({
        documentVersionId: version.id,
        schemaType,
        model: extractorService.model,
        promptVersion: '1.0.0'
      });

      try {
        const result = await extractorService.extractFields(version.text_content, schemaType);

        if (result.success && result.fields) {
          repos.extractedFields.saveFields(runId, result.fields);
        }

        repos.extractionRuns.completeRun(runId, {
          success: result.success,
          error: result.error,
          tokensInput: result.metadata?.tokens_input,
          tokensOutput: result.metadata?.tokens_output,
          processingTimeMs: result.metadata?.processing_time_ms
        });

        return res.json({
          success: true,
          runId,
          extraction: result
        });
      } catch (error) {
        repos.extractionRuns.completeRun(runId, {
          success: false,
          error: error.message
        });
        throw error;
      }
    } catch (error) {
      logger.error('Extraction failed', { error: error.message });
      return res.status(500).json({ error: 'Falha na extracao' });
    }
  }
);

/**
 * GET /api/extractions/:runId
 * Get extraction run with fields
 */
router.get(
  '/api/extractions/:runId',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const run = repos.extractionRuns.getWithFields(req.params.runId);

      if (!run) {
        return res.status(404).json({ error: 'Extracao nao encontrada' });
      }

      // Parse JSON fields
      run.fields = run.fields.map(f => ({
        ...f,
        field_value: JSON.parse(f.field_value || 'null'),
        evidence: f.evidence ? JSON.parse(f.evidence) : null,
        conflicts: f.conflicts ? JSON.parse(f.conflicts) : null
      }));

      return res.json({ success: true, extraction: run });
    } catch (error) {
      logger.error('Failed to get extraction', { error: error.message });
      return res.status(500).json({ error: 'Falha ao obter extracao' });
    }
  }
);

/**
 * PATCH /api/extractions/:runId/fields/:fieldId
 * Validate or update extracted field
 */
router.patch(
  '/api/extractions/:runId/fields/:fieldId',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { value, validate } = req.body;

      if (validate) {
        repos.extractedFields.validateField(req.params.fieldId, req.user.id);
      } else if (value !== undefined) {
        repos.extractedFields.updateFieldValue(req.params.fieldId, value, req.user.id);
      }

      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to update field', { error: error.message });
      return res.status(500).json({ error: 'Falha ao atualizar campo' });
    }
  }
);

// ============================================================================
// PACKAGE ENDPOINTS
// ============================================================================

/**
 * POST /api/packages
 * Create a new document package
 */
router.post(
  '/api/packages',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { name, processNumber, organization, packageType, agentId, documentIds } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name obrigatorio' });
      }

      const pkg = repos.packages.createPackage(req.tenantId, {
        name,
        processNumber,
        organization,
        packageType: packageType || PackageTypes.CUSTOM,
        agentId
      });

      // Add documents if provided
      if (documentIds && Array.isArray(documentIds)) {
        for (let i = 0; i < documentIds.length; i++) {
          const docId = documentIds[i];
          const doc = repos.documents.getWithLatestVersion(req.tenantId, docId);
          if (doc?.latestVersion) {
            repos.packages.addDocument(pkg.id, doc.latestVersion.id, null, i);
          }
        }
      }

      return res.status(201).json({ success: true, package: pkg });
    } catch (error) {
      logger.error('Failed to create package', { error: error.message });
      return res.status(500).json({ error: 'Falha ao criar pacote' });
    }
  }
);

/**
 * GET /api/packages
 * List packages
 */
router.get(
  '/api/packages',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { agentId, status, type, page = 1, limit = 20 } = req.query;

      const options = {
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        orderBy: 'created_at',
        order: 'DESC'
      };

      let packages;
      const criteria = {};

      if (agentId) criteria.agent_id = agentId;
      if (status) criteria.status = status;
      if (type) criteria.package_type = type;

      if (Object.keys(criteria).length > 0) {
        packages = repos.packages.findByForTenant(req.tenantId, criteria, options);
      } else {
        packages = repos.packages.findAllForTenant(req.tenantId, options);
      }

      const total = repos.packages.countForTenant(req.tenantId);

      return res.json({
        success: true,
        packages,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    } catch (error) {
      logger.error('Failed to list packages', { error: error.message });
      return res.status(500).json({ error: 'Falha ao listar pacotes' });
    }
  }
);

/**
 * GET /api/packages/:id
 * Get package with documents
 */
router.get(
  '/api/packages/:id',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const pkg = repos.packages.getWithDocuments(req.tenantId, req.params.id);

      if (!pkg) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
      }

      // Get extractions for package
      const extractions = repos.extractionRuns.findByPackage(pkg.id);

      // Get reports
      const reports = repos.reports.findByPackage(req.tenantId, pkg.id);

      return res.json({
        success: true,
        package: {
          ...pkg,
          extractions,
          reports
        }
      });
    } catch (error) {
      logger.error('Failed to get package', { error: error.message });
      return res.status(500).json({ error: 'Falha ao obter pacote' });
    }
  }
);

/**
 * POST /api/packages/:id/documents
 * Add document to package
 */
router.post(
  '/api/packages/:id/documents',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { documentId, role, position } = req.body;

      if (!documentId) {
        return res.status(400).json({ error: 'documentId obrigatorio' });
      }

      const pkg = repos.packages.findByIdForTenant(req.params.id, req.tenantId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
      }

      const doc = repos.documents.getWithLatestVersion(req.tenantId, documentId);
      if (!doc?.latestVersion) {
        return res.status(404).json({ error: 'Documento nao encontrado' });
      }

      const linkId = repos.packages.addDocument(
        pkg.id,
        doc.latestVersion.id,
        role || null,
        position || 0
      );

      return res.status(201).json({ success: true, linkId });
    } catch (error) {
      logger.error('Failed to add document to package', { error: error.message });
      return res.status(500).json({ error: 'Falha ao adicionar documento' });
    }
  }
);

/**
 * DELETE /api/packages/:id/documents/:documentVersionId
 * Remove document from package
 */
router.delete(
  '/api/packages/:id/documents/:documentVersionId',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);

      const pkg = repos.packages.findByIdForTenant(req.params.id, req.tenantId);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
      }

      const removed = repos.packages.removeDocument(pkg.id, req.params.documentVersionId);

      return res.json({ success: removed });
    } catch (error) {
      logger.error('Failed to remove document from package', { error: error.message });
      return res.status(500).json({ error: 'Falha ao remover documento' });
    }
  }
);

/**
 * PATCH /api/packages/:id
 * Update package
 */
router.patch(
  '/api/packages/:id',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { name, status, processNumber, organization } = req.body;

      const updates = {};
      if (name) updates.name = name;
      if (status) updates.status = status;
      if (processNumber) updates.process_number = processNumber;
      if (organization) updates.organization = organization;
      updates.updated_at = new Date().toISOString();

      const updated = repos.packages.updateForTenant(req.tenantId, req.params.id, updates);

      if (!updated) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
      }

      return res.json({ success: true, package: updated });
    } catch (error) {
      logger.error('Failed to update package', { error: error.message });
      return res.status(500).json({ error: 'Falha ao atualizar pacote' });
    }
  }
);

// ============================================================================
// REPORT ENDPOINTS
// ============================================================================

/**
 * POST /api/packages/:id/reports
 * Generate report for package
 */
router.post(
  '/api/packages/:id/reports',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const { reportType, title } = req.body;

      if (!reportType) {
        return res.status(400).json({ error: 'reportType obrigatorio' });
      }

      const pkg = repos.packages.getWithDocuments(req.tenantId, req.params.id);
      if (!pkg) {
        return res.status(404).json({ error: 'Pacote nao encontrado' });
      }

      // Get latest extraction for the package
      const extractions = repos.extractionRuns.findByPackage(pkg.id);
      const latestExtraction = extractions.find(e => e.status === 'completed');

      if (!latestExtraction) {
        return res.status(400).json({ error: 'Nenhuma extracao completa encontrada' });
      }

      // Get extracted fields
      const runWithFields = repos.extractionRuns.getWithFields(latestExtraction.id);

      // Parse fields
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
      const reportResult = await extractorService.generateReport(extractedData, reportType);

      if (!reportResult.success) {
        return res.status(500).json({ error: reportResult.error });
      }

      // Save report
      const report = repos.reports.createReport(req.tenantId, {
        packageId: pkg.id,
        extractionRunId: latestExtraction.id,
        reportType,
        title: title || `Relatorio ${reportType}`,
        content: reportResult.content,
        format: reportResult.format
      });

      return res.status(201).json({
        success: true,
        report: {
          ...report,
          content: reportResult.content
        }
      });
    } catch (error) {
      logger.error('Failed to generate report', { error: error.message });
      return res.status(500).json({ error: 'Falha ao gerar relatorio' });
    }
  }
);

/**
 * GET /api/reports/:id
 * Get report
 */
router.get(
  '/api/reports/:id',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const repos = getRepositories(req);
      const report = repos.reports.findByIdForTenant(req.params.id, req.tenantId);

      if (!report) {
        return res.status(404).json({ error: 'Relatorio nao encontrado' });
      }

      // Parse JSON content
      report.content = report.content ? JSON.parse(report.content) : null;
      report.recipients = report.recipients ? JSON.parse(report.recipients) : null;

      return res.json({ success: true, report });
    } catch (error) {
      logger.error('Failed to get report', { error: error.message });
      return res.status(500).json({ error: 'Falha ao obter relatorio' });
    }
  }
);

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/document-handler/schemas
 * Get available schema types
 */
router.get(
  '/api/document-handler/schemas',
  authenticate,
  tenantContext,
  async (req, res) => {
    return res.json({
      success: true,
      schemas: getSchemaTypes(),
      roles: Object.values(DocumentRoles),
      packageTypes: Object.values(PackageTypes)
    });
  }
);

/**
 * POST /api/document-handler/classify
 * Classify document type without saving
 */
router.post(
  '/api/document-handler/classify',
  authenticate,
  tenantContext,
  requireTenant,
  upload.single('file'),
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo obrigatorio.' });
    }

    try {
      const analysis = await analyzeDocument(file.path);
      const classification = await extractorService.classifyDocument(analysis.content);
      const roleClassification = await packageService.classifyDocumentRole(
        analysis.content,
        classification.type
      );

      // Detect process number and organization
      const processNumber = packageService.detectProcessNumber(analysis.content);
      const organization = packageService.detectOrganization(analysis.content);

      return res.json({
        success: true,
        classification: {
          ...classification,
          ...roleClassification,
          processNumber,
          organization
        }
      });
    } catch (error) {
      logger.error('Classification failed', { error: error.message });
      return res.status(500).json({ error: 'Falha na classificacao' });
    } finally {
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          logger.warn('Failed to cleanup', { error: e.message });
        }
      }
    }
  }
);

// ============================================================================
// WEBHOOK ENDPOINTS (External System Integration)
// ============================================================================

/**
 * POST /api/webhook/documents/:agentId
 * Receive documents from external systems
 *
 * Authentication: Bearer token with agent API key
 * Content-Type: multipart/form-data
 *
 * Example:
 *   curl -X POST https://api.example.com/api/webhook/documents/agent_123 \
 *     -H "Authorization: Bearer dh_abc123..." \
 *     -F "file=@documento.pdf" \
 *     -F "metadata={\"origem\":\"sistema_rh\",\"tipo\":\"ferias\"}"
 */
router.post(
  '/api/webhook/documents/:agentId',
  upload.single('file'),
  async (req, res) => {
    const { agentId } = req.params;
    const file = req.file;

    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Use Authorization: Bearer <api_key>'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    try {
      // Validate API key and get agent
      const agentRepo = getAgentRepository();
      const agent = agentRepo.findByApiKey(apiKey);

      if (!agent) {
        logger.warn('Invalid API key used', { agentId });
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
      }

      // Verify agent ID matches
      if (agent.id !== agentId) {
        logger.warn('API key does not match agent', { agentId, actualAgentId: agent.id });
        return res.status(403).json({
          success: false,
          error: 'API key does not match agent'
        });
      }

      // Verify agent is document_handler type
      if (agent.type !== 'document_handler') {
        return res.status(400).json({
          success: false,
          error: 'Agent is not a document handler'
        });
      }

      // Parse metadata if provided
      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = typeof req.body.metadata === 'string'
            ? JSON.parse(req.body.metadata)
            : req.body.metadata;
        } catch (e) {
          logger.warn('Failed to parse metadata', { error: e.message });
        }
      }
      metadata.origin = metadata.origin || 'webhook';
      metadata.receivedAt = new Date().toISOString();

      logger.info('Webhook document received', {
        agentId,
        fileName: file.originalname,
        origin: metadata.origin
      });

      // Build agent config from stored data
      const agentConfig = {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        config: {
          documentRoutes: agent.behavior?.documentRoutes || agent.integrations?.documentRoutes || []
        }
      };

      // Process and dispatch
      const result = await dispatchService.processAndDispatch({
        filePath: file.path,
        fileName: file.originalname,
        mimeType: file.mimetype,
        agentConfig,
        metadata
      });

      // Return result
      return res.status(result.success ? 200 : 500).json({
        success: result.success,
        documentId: result.documentId,
        classification: result.classification,
        notifications: result.notifications?.map(n => ({
          type: n.type,
          to: n.to,
          success: n.success
        })),
        errors: result.errors,
        processingTimeMs: result.processingTimeMs
      });

    } catch (error) {
      logger.error('Webhook processing failed', { error: error.message, agentId });

      // Cleanup file on error
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          logger.warn('Failed to cleanup file', { error: e.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to process document',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/webhook/documents/:agentId/text
 * Receive text messages from external systems (not files)
 *
 * Example:
 *   curl -X POST https://api.example.com/api/webhook/documents/agent_123/text \
 *     -H "Authorization: Bearer dh_abc123..." \
 *     -H "Content-Type: application/json" \
 *     -d '{"message": "João Silva entrou de férias de 01/01 a 15/01", "metadata": {"origem": "sistema_rh"}}'
 */
router.post(
  '/api/webhook/documents/:agentId/text',
  async (req, res) => {
    const { agentId } = req.params;
    const { message, metadata = {} } = req.body;

    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Use Authorization: Bearer <api_key>'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    try {
      // Validate API key and get agent
      const agentRepo = getAgentRepository();
      const agent = agentRepo.findByApiKey(apiKey);

      if (!agent || agent.id !== agentId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key or agent mismatch'
        });
      }

      if (agent.type !== 'document_handler') {
        return res.status(400).json({
          success: false,
          error: 'Agent is not a document handler'
        });
      }

      metadata.origin = metadata.origin || 'webhook_text';
      metadata.receivedAt = new Date().toISOString();

      logger.info('Webhook text message received', {
        agentId,
        messageLength: message.length,
        origin: metadata.origin
      });

      // Classify and extract from text directly
      const classification = await extractorService.classifyDocument(message);

      let extraction = null;
      if (['licitacao', 'contrato', 'termo_referencia', 'atestado', 'ferias', 'nota_fiscal'].includes(classification.type)) {
        extraction = await extractorService.extractFields(message, classification.type);
      }

      // Build agent config
      const agentConfig = {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        config: {
          documentRoutes: agent.behavior?.documentRoutes || agent.integrations?.documentRoutes || []
        }
      };

      // Generate summary and send notifications
      const summary = await dispatchService.generateNotificationSummary(classification, extraction, message);
      const route = dispatchService.findMatchingRoute(classification.type, agentConfig);

      let notifications = [];
      if (route) {
        notifications = await dispatchService.sendNotifications({
          route,
          summary,
          classification,
          extraction,
          filePath: null,
          fileName: null,
          agentConfig,
          metadata
        });
      }

      return res.json({
        success: true,
        classification,
        extraction: extraction ? {
          success: extraction.success,
          fields: extraction.fields
        } : null,
        notifications: notifications.map(n => ({
          type: n.type,
          to: n.to,
          success: n.success
        }))
      });

    } catch (error) {
      logger.error('Webhook text processing failed', { error: error.message, agentId });
      return res.status(500).json({
        success: false,
        error: 'Failed to process message',
        details: error.message
      });
    }
  }
);

// ============================================================================
// API KEY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/agents/:agentId/api-key
 * Generate a new API key for an agent
 */
router.post(
  '/api/agents/:agentId/api-key',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const agentRepo = getAgentRepository();

      // Verify agent exists and belongs to tenant
      const agent = agentRepo.findByIdForTenant(agentId, req.tenantId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (agent.type !== 'document_handler') {
        return res.status(400).json({ error: 'API keys are only available for document handler agents' });
      }

      // Generate new API key
      const apiKey = agentRepo.generateApiKey(agentId, req.tenantId);

      logger.info('API key generated', { agentId, userId: req.user?.id });

      return res.json({
        success: true,
        apiKey,
        webhookUrl: `${process.env.BASE_URL || 'https://api.orbion.ai'}/api/webhook/documents/${agentId}`,
        message: 'Store this API key securely. It will not be shown again.'
      });
    } catch (error) {
      logger.error('Failed to generate API key', { error: error.message });
      return res.status(500).json({ error: 'Failed to generate API key' });
    }
  }
);

/**
 * DELETE /api/agents/:agentId/api-key
 * Revoke API key for an agent
 */
router.delete(
  '/api/agents/:agentId/api-key',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const agentRepo = getAgentRepository();

      // Verify agent exists and belongs to tenant
      const agent = agentRepo.findByIdForTenant(agentId, req.tenantId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Revoke API key
      agentRepo.revokeApiKey(agentId, req.tenantId);

      logger.info('API key revoked', { agentId, userId: req.user?.id });

      return res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      logger.error('Failed to revoke API key', { error: error.message });
      return res.status(500).json({ error: 'Failed to revoke API key' });
    }
  }
);

/**
 * GET /api/agents/:agentId/webhook-info
 * Get webhook URL and API key status (not the key itself)
 */
router.get(
  '/api/agents/:agentId/webhook-info',
  authenticate,
  tenantContext,
  requireTenant,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const agentRepo = getAgentRepository();

      const agent = agentRepo.findByIdForTenant(agentId, req.tenantId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const webhookConfig = agent.integrations?.webhook || {};
      const hasApiKey = !!webhookConfig.apiKey;
      const baseUrl = process.env.BASE_URL || 'https://api.orbion.ai';

      return res.json({
        success: true,
        webhookUrl: `${baseUrl}/api/webhook/documents/${agentId}`,
        textWebhookUrl: `${baseUrl}/api/webhook/documents/${agentId}/text`,
        hasApiKey,
        apiKeyCreatedAt: webhookConfig.createdAt || null,
        documentation: {
          fileUpload: {
            method: 'POST',
            url: `${baseUrl}/api/webhook/documents/${agentId}`,
            headers: {
              'Authorization': 'Bearer <API_KEY>',
              'Content-Type': 'multipart/form-data'
            },
            body: 'file (required), metadata (optional JSON)'
          },
          textMessage: {
            method: 'POST',
            url: `${baseUrl}/api/webhook/documents/${agentId}/text`,
            headers: {
              'Authorization': 'Bearer <API_KEY>',
              'Content-Type': 'application/json'
            },
            body: '{ "message": "texto...", "metadata": {} }'
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get webhook info', { error: error.message });
      return res.status(500).json({ error: 'Failed to get webhook info' });
    }
  }
);

export default router;
