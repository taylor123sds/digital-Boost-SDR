/**
 * @file document-review.routes.js
 * @description Revisao de documentos (PDF) via API e envio por email/WhatsApp
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { analyzeDocument } from '../../tools/document_analyzer.js';
import { reviewDocumentText } from '../../services/DocumentReviewService.js';
import { sendEmail } from '../../services/EmailService.js';
import { sendWhatsAppMedia, sendWhatsAppText } from '../../services/whatsappAdapterProvider.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant, tenantContext } from '../../middleware/tenant.middleware.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'DocumentReviewRoutes' });
const router = express.Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return cb(new Error('Apenas PDFs sao aceitos.'));
    }
    cb(null, true);
  }
});

function parseRecipientList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const text = value.toString().trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
      logger.warn('Falha ao parsear lista JSON de destinatarios', { error: error.message });
    }
  }
  return text.split(',').map(item => item.trim()).filter(Boolean);
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  if (!value) return false;
  return ['true', '1', 'yes', 'sim'].includes(value.toString().toLowerCase());
}

function buildReviewMessage(review, fileName) {
  const lines = [
    `Documento: ${fileName}`,
    `Tipo: ${review.type || 'outro'}`,
    `Decisao: ${review.decision || 'revisao_manual'}`,
    review.summary ? `Resumo: ${review.summary}` : null
  ].filter(Boolean);

  const extracted = review.extracted || {};
  if (extracted.employeeName || extracted.periodStart || extracted.periodEnd || extracted.issuer) {
    lines.push(
      `Extraido: ${[
        extracted.employeeName ? `Nome: ${extracted.employeeName}` : null,
        extracted.periodStart ? `Inicio: ${extracted.periodStart}` : null,
        extracted.periodEnd ? `Fim: ${extracted.periodEnd}` : null,
        extracted.issuer ? `Emissor: ${extracted.issuer}` : null
      ].filter(Boolean).join(' | ')}`
    );
  }

  if (review.missingFields?.length) {
    lines.push(`Pendencias: ${review.missingFields.join(', ')}`);
  }

  return lines.join('\n');
}

async function sendEmailResults(recipients, subject, text, file) {
  const attachments = [
    {
      filename: file.originalname,
      path: file.path,
      contentType: 'application/pdf'
    }
  ];

  const results = await Promise.allSettled(
    recipients.map(to => sendEmail({ to, subject, text, attachments }))
  );

  return results.map((result, index) => ({
    to: recipients[index],
    success: result.status === 'fulfilled' && result.value?.success !== false,
    result: result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
  }));
}

async function sendWhatsAppResults(recipients, text, file, sendDocument) {
  const textResults = await Promise.allSettled(
    recipients.map(number => sendWhatsAppText(number, text))
  );

  const documentResults = sendDocument
    ? await Promise.allSettled(
      recipients.map(number =>
        sendWhatsAppMedia(number, file.path, {
          type: 'document',
          fileName: file.originalname,
          caption: 'Documento revisado'
        })
      )
    )
    : [];

  return {
    text: textResults.map((result, index) => ({
      to: recipients[index],
      success: result.status === 'fulfilled' && result.value?.success !== false,
      result: result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
    })),
    document: documentResults.map((result, index) => ({
      to: recipients[index],
      success: result.status === 'fulfilled' && result.value?.success !== false,
      result: result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
    }))
  };
}

/**
 * POST /api/document-review
 * Body (multipart/form-data):
 * - file (PDF)
 * - emailTo (string | JSON array)
 * - whatsappTo (string | JSON array)
 * - subject (optional)
 * - sendWhatsAppDocument (optional)
 */
router.post(
  '/api/document-review',
  authenticate,
  tenantContext,
  requireTenant,
  upload.single('file'),
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo PDF obrigatorio.' });
    }

    const emailRecipients = parseRecipientList(req.body.emailTo);
    const whatsappRecipients = parseRecipientList(req.body.whatsappTo);
    const sendWhatsAppDocument = parseBoolean(req.body.sendWhatsAppDocument);

    if (emailRecipients.length === 0 && whatsappRecipients.length === 0) {
      return res.status(400).json({ error: 'Informe emailTo ou whatsappTo.' });
    }

    let analysis = null;
    let review = null;

    try {
      logger.info('Iniciando revisao de documento', {
        fileName: file.originalname,
        emailRecipients: emailRecipients.length,
        whatsappRecipients: whatsappRecipients.length
      });

      analysis = await analyzeDocument(file.path);
      review = await reviewDocumentText(analysis.content, { fallbackSummary: analysis.summary });

      const messageText = buildReviewMessage(review, file.originalname);
      const emailSubject = req.body.subject || `Revisao de documento (${review.type || 'outro'})`;

      const emailResults = emailRecipients.length
        ? await sendEmailResults(emailRecipients, emailSubject, messageText, file)
        : [];

      const whatsappResults = whatsappRecipients.length
        ? await sendWhatsAppResults(whatsappRecipients, messageText, file, sendWhatsAppDocument)
        : { text: [], document: [] };

      return res.json({
        success: true,
        review,
        email: emailResults,
        whatsapp: whatsappResults
      });
    } catch (error) {
      logger.error('Falha na revisao de documento', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Falha ao revisar documento',
        details: error.message
      });
    } finally {
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          logger.warn('Falha ao remover arquivo temporario', { error: error.message });
        }
      }
    }
  }
);

export default router;
