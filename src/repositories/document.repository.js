/**
 * @file repositories/document.repository.js
 * @description Repository for document handler entities
 *
 * Handles CRUD operations for:
 * - documents
 * - document_versions
 * - document_packages
 * - package_documents
 * - extraction_runs
 * - extracted_fields
 * - document_reports
 */

import { BaseTenantRepository } from './base-tenant.repository.js';
import { DatabaseError } from '../utils/errors/index.js';
import { nanoid } from 'nanoid';

/**
 * Documents Repository
 */
export class DocumentRepository extends BaseTenantRepository {
  constructor(db, logger) {
    super(db, logger, 'documents');
  }

  /**
   * Create a new document with version
   */
  createWithVersion(tenantId, documentData, versionData) {
    const documentId = documentData.id || nanoid();
    const versionId = versionData.id || nanoid();

    try {
      this.db.transaction(() => {
        // Create document
        this.createForTenant(tenantId, {
          id: documentId,
          name: documentData.name,
          agent_id: documentData.agentId,
          origin: documentData.origin || 'upload',
          status: documentData.status || 'pending',
          metadata: documentData.metadata ? JSON.stringify(documentData.metadata) : null
        });

        // Create version
        const versionSql = `
          INSERT INTO document_versions (id, document_id, version, file_name, file_hash,
            storage_path, storage_url, mime_type, file_size, page_count, text_content, ocr_applied)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.prepare(versionSql).run(
          versionId,
          documentId,
          versionData.version || 1,
          versionData.fileName,
          versionData.fileHash,
          versionData.storagePath,
          versionData.storageUrl,
          versionData.mimeType,
          versionData.fileSize,
          versionData.pageCount || null,
          versionData.textContent || null,
          versionData.ocrApplied ? 1 : 0
        );
      })();

      return { documentId, versionId };
    } catch (error) {
      this.logger.error('createWithVersion failed', { error: error.message });
      throw new DatabaseError('Failed to create document with version', 'createWithVersion', error);
    }
  }

  /**
   * Get document with all versions
   */
  getWithVersions(tenantId, documentId) {
    try {
      const document = this.findByIdForTenant(documentId, tenantId);
      if (!document) return null;

      const versions = this.db.prepare(`
        SELECT * FROM document_versions
        WHERE document_id = ?
        ORDER BY version DESC
      `).all(documentId);

      return { ...document, versions };
    } catch (error) {
      this.logger.error('getWithVersions failed', { error: error.message });
      throw new DatabaseError('Failed to get document with versions', 'getWithVersions', error);
    }
  }

  /**
   * Get document with latest version
   */
  getWithLatestVersion(tenantId, documentId) {
    try {
      const document = this.findByIdForTenant(documentId, tenantId);
      if (!document) return null;

      const latestVersion = this.db.prepare(`
        SELECT * FROM document_versions
        WHERE document_id = ?
        ORDER BY version DESC
        LIMIT 1
      `).get(documentId);

      return { ...document, latestVersion };
    } catch (error) {
      this.logger.error('getWithLatestVersion failed', { error: error.message });
      throw new DatabaseError('Failed to get document with latest version', 'getWithLatestVersion', error);
    }
  }

  /**
   * Update document status
   */
  updateStatus(tenantId, documentId, status, errorMessage = null) {
    return this.updateForTenant(tenantId, documentId, {
      status,
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Find documents by agent
   */
  findByAgent(tenantId, agentId, options = {}) {
    return this.findByForTenant(tenantId, { agent_id: agentId }, options);
  }

  /**
   * Find documents by status
   */
  findByStatus(tenantId, status, options = {}) {
    return this.findByForTenant(tenantId, { status }, options);
  }

  /**
   * Add new version to existing document
   */
  addVersion(documentId, versionData) {
    const versionId = versionData.id || nanoid();

    try {
      // Get current max version
      const currentMax = this.db.prepare(`
        SELECT MAX(version) as max_version FROM document_versions WHERE document_id = ?
      `).get(documentId);

      const newVersion = (currentMax?.max_version || 0) + 1;

      const sql = `
        INSERT INTO document_versions (id, document_id, version, file_name, file_hash,
          storage_path, storage_url, mime_type, file_size, page_count, text_content, ocr_applied)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.prepare(sql).run(
        versionId,
        documentId,
        newVersion,
        versionData.fileName,
        versionData.fileHash,
        versionData.storagePath,
        versionData.storageUrl,
        versionData.mimeType,
        versionData.fileSize,
        versionData.pageCount || null,
        versionData.textContent || null,
        versionData.ocrApplied ? 1 : 0
      );

      return { versionId, version: newVersion };
    } catch (error) {
      this.logger.error('addVersion failed', { error: error.message });
      throw new DatabaseError('Failed to add document version', 'addVersion', error);
    }
  }

  /**
   * Get version by ID
   */
  getVersion(versionId) {
    try {
      return this.db.prepare('SELECT * FROM document_versions WHERE id = ?').get(versionId);
    } catch (error) {
      this.logger.error('getVersion failed', { error: error.message });
      throw new DatabaseError('Failed to get document version', 'getVersion', error);
    }
  }

  /**
   * Update version text content
   */
  updateVersionText(versionId, textContent, pageCount = null, ocrApplied = false) {
    try {
      this.db.prepare(`
        UPDATE document_versions
        SET text_content = ?, page_count = ?, ocr_applied = ?
        WHERE id = ?
      `).run(textContent, pageCount, ocrApplied ? 1 : 0, versionId);
    } catch (error) {
      this.logger.error('updateVersionText failed', { error: error.message });
      throw new DatabaseError('Failed to update version text', 'updateVersionText', error);
    }
  }
}

/**
 * Document Packages Repository
 */
export class DocumentPackageRepository extends BaseTenantRepository {
  constructor(db, logger) {
    super(db, logger, 'document_packages');
  }

  /**
   * Create package
   */
  createPackage(tenantId, data) {
    const id = data.id || nanoid();

    return this.createForTenant(tenantId, {
      id,
      name: data.name,
      agent_id: data.agentId,
      process_number: data.processNumber,
      organization: data.organization,
      package_type: data.packageType || 'custom',
      status: data.status || 'draft',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    });
  }

  /**
   * Get package with documents
   */
  getWithDocuments(tenantId, packageId) {
    try {
      const pkg = this.findByIdForTenant(packageId, tenantId);
      if (!pkg) return null;

      const documents = this.db.prepare(`
        SELECT pd.*, dv.*, d.name as document_name, d.status as document_status
        FROM package_documents pd
        JOIN document_versions dv ON pd.document_version_id = dv.id
        JOIN documents d ON dv.document_id = d.id
        WHERE pd.package_id = ?
        ORDER BY pd.position
      `).all(packageId);

      return { ...pkg, documents };
    } catch (error) {
      this.logger.error('getWithDocuments failed', { error: error.message });
      throw new DatabaseError('Failed to get package with documents', 'getWithDocuments', error);
    }
  }

  /**
   * Add document to package
   */
  addDocument(packageId, documentVersionId, role, position = 0, notes = null) {
    const id = nanoid();

    try {
      this.db.prepare(`
        INSERT INTO package_documents (id, package_id, document_version_id, role, position, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, packageId, documentVersionId, role, position, notes);

      return id;
    } catch (error) {
      this.logger.error('addDocument failed', { error: error.message });
      throw new DatabaseError('Failed to add document to package', 'addDocument', error);
    }
  }

  /**
   * Remove document from package
   */
  removeDocument(packageId, documentVersionId) {
    try {
      const result = this.db.prepare(`
        DELETE FROM package_documents WHERE package_id = ? AND document_version_id = ?
      `).run(packageId, documentVersionId);

      return result.changes > 0;
    } catch (error) {
      this.logger.error('removeDocument failed', { error: error.message });
      throw new DatabaseError('Failed to remove document from package', 'removeDocument', error);
    }
  }

  /**
   * Update package status
   */
  updateStatus(tenantId, packageId, status) {
    return this.updateForTenant(tenantId, packageId, {
      status,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Find by process number
   */
  findByProcessNumber(tenantId, processNumber) {
    return this.findOneByForTenant(tenantId, { process_number: processNumber });
  }

  /**
   * Find by agent
   */
  findByAgent(tenantId, agentId, options = {}) {
    return this.findByForTenant(tenantId, { agent_id: agentId }, options);
  }
}

/**
 * Extraction Runs Repository
 */
export class ExtractionRunRepository extends BaseTenantRepository {
  constructor(db, logger) {
    super(db, logger, 'extraction_runs', { tenantOptional: true });
  }

  /**
   * Create extraction run
   */
  createRun(data) {
    const id = data.id || nanoid();

    try {
      this.db.prepare(`
        INSERT INTO extraction_runs (id, document_version_id, package_id, schema_type,
          model, prompt_version, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.documentVersionId || null,
        data.packageId || null,
        data.schemaType,
        data.model,
        data.promptVersion,
        'running'
      );

      return id;
    } catch (error) {
      this.logger.error('createRun failed', { error: error.message });
      throw new DatabaseError('Failed to create extraction run', 'createRun', error);
    }
  }

  /**
   * Complete extraction run
   */
  completeRun(runId, result) {
    try {
      this.db.prepare(`
        UPDATE extraction_runs
        SET status = ?, error_message = ?, tokens_input = ?, tokens_output = ?,
            cost_usd = ?, processing_time_ms = ?, completed_at = ?
        WHERE id = ?
      `).run(
        result.success ? 'completed' : 'failed',
        result.error || null,
        result.tokensInput || null,
        result.tokensOutput || null,
        result.costUsd || null,
        result.processingTimeMs || null,
        new Date().toISOString(),
        runId
      );
    } catch (error) {
      this.logger.error('completeRun failed', { error: error.message });
      throw new DatabaseError('Failed to complete extraction run', 'completeRun', error);
    }
  }

  /**
   * Get run with fields
   */
  getWithFields(runId) {
    try {
      const run = this.db.prepare('SELECT * FROM extraction_runs WHERE id = ?').get(runId);
      if (!run) return null;

      const fields = this.db.prepare(`
        SELECT * FROM extracted_fields WHERE extraction_run_id = ?
      `).all(runId);

      return { ...run, fields };
    } catch (error) {
      this.logger.error('getWithFields failed', { error: error.message });
      throw new DatabaseError('Failed to get run with fields', 'getWithFields', error);
    }
  }

  /**
   * Find runs by document version
   */
  findByDocumentVersion(documentVersionId) {
    try {
      return this.db.prepare(`
        SELECT * FROM extraction_runs WHERE document_version_id = ? ORDER BY created_at DESC
      `).all(documentVersionId);
    } catch (error) {
      this.logger.error('findByDocumentVersion failed', { error: error.message });
      throw new DatabaseError('Failed to find runs by document version', 'findByDocumentVersion', error);
    }
  }

  /**
   * Find runs by package
   */
  findByPackage(packageId) {
    try {
      return this.db.prepare(`
        SELECT * FROM extraction_runs WHERE package_id = ? ORDER BY created_at DESC
      `).all(packageId);
    } catch (error) {
      this.logger.error('findByPackage failed', { error: error.message });
      throw new DatabaseError('Failed to find runs by package', 'findByPackage', error);
    }
  }
}

/**
 * Extracted Fields Repository
 */
export class ExtractedFieldRepository extends BaseTenantRepository {
  constructor(db, logger) {
    super(db, logger, 'extracted_fields', { tenantOptional: true });
  }

  /**
   * Save extracted fields
   */
  saveFields(extractionRunId, fields) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO extracted_fields (id, extraction_run_id, field_name, field_path,
          field_value, value_type, evidence, confidence, conflicts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const savedIds = [];

      this.db.transaction(() => {
        for (const [fieldName, fieldData] of Object.entries(fields)) {
          const id = nanoid();
          stmt.run(
            id,
            extractionRunId,
            fieldName,
            fieldData.path || fieldName,
            JSON.stringify(fieldData.value),
            fieldData.valueType || 'string',
            fieldData.evidence ? JSON.stringify(fieldData.evidence) : null,
            fieldData.confidence || null,
            fieldData.conflicts ? JSON.stringify(fieldData.conflicts) : null
          );
          savedIds.push(id);
        }
      })();

      return savedIds;
    } catch (error) {
      this.logger.error('saveFields failed', { error: error.message });
      throw new DatabaseError('Failed to save extracted fields', 'saveFields', error);
    }
  }

  /**
   * Validate field
   */
  validateField(fieldId, validatedBy) {
    try {
      this.db.prepare(`
        UPDATE extracted_fields
        SET validated = 1, validated_by = ?, validated_at = ?
        WHERE id = ?
      `).run(validatedBy, new Date().toISOString(), fieldId);
    } catch (error) {
      this.logger.error('validateField failed', { error: error.message });
      throw new DatabaseError('Failed to validate field', 'validateField', error);
    }
  }

  /**
   * Update field value
   */
  updateFieldValue(fieldId, value, updatedBy) {
    try {
      this.db.prepare(`
        UPDATE extracted_fields
        SET field_value = ?, validated = 1, validated_by = ?, validated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(value), updatedBy, new Date().toISOString(), fieldId);
    } catch (error) {
      this.logger.error('updateFieldValue failed', { error: error.message });
      throw new DatabaseError('Failed to update field value', 'updateFieldValue', error);
    }
  }
}

/**
 * Document Reports Repository
 */
export class DocumentReportRepository extends BaseTenantRepository {
  constructor(db, logger) {
    super(db, logger, 'document_reports');
  }

  /**
   * Create report
   */
  createReport(tenantId, data) {
    const id = data.id || nanoid();

    return this.createForTenant(tenantId, {
      id,
      package_id: data.packageId,
      extraction_run_id: data.extractionRunId,
      report_type: data.reportType,
      title: data.title,
      content: data.content ? JSON.stringify(data.content) : null,
      format: data.format || 'json',
      recipients: data.recipients ? JSON.stringify(data.recipients) : null,
      status: 'draft'
    });
  }

  /**
   * Update report content
   */
  updateContent(tenantId, reportId, content) {
    return this.updateForTenant(tenantId, reportId, {
      content: JSON.stringify(content),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Mark as sent
   */
  markSent(tenantId, reportId, recipients) {
    return this.updateForTenant(tenantId, reportId, {
      status: 'sent',
      recipients: JSON.stringify(recipients),
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Find by package
   */
  findByPackage(tenantId, packageId) {
    return this.findByForTenant(tenantId, { package_id: packageId });
  }

  /**
   * Find by type
   */
  findByType(tenantId, reportType, options = {}) {
    return this.findByForTenant(tenantId, { report_type: reportType }, options);
  }
}

/**
 * Factory function to create all document repositories
 */
export function createDocumentRepositories(db, logger) {
  return {
    documents: new DocumentRepository(db, logger),
    packages: new DocumentPackageRepository(db, logger),
    extractionRuns: new ExtractionRunRepository(db, logger),
    extractedFields: new ExtractedFieldRepository(db, logger),
    reports: new DocumentReportRepository(db, logger)
  };
}

export default {
  DocumentRepository,
  DocumentPackageRepository,
  ExtractionRunRepository,
  ExtractedFieldRepository,
  DocumentReportRepository,
  createDocumentRepositories
};
