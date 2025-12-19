/**
 * @file website.routes.js
 * @description API routes for Website Form Submissions (Digital Boost Landing Page)
 *
 * Public endpoints (no auth required) for:
 * - Contact form submissions
 * - Newsletter subscriptions
 *
 * CORS is configured to accept requests from the landing page domain.
 */

import express from 'express';
import Lead from '../../models/Lead.js';
import { defaultLogger } from '../../utils/logger.enhanced.js';

const router = express.Router();
const leadModel = new Lead();
const logger = defaultLogger.child({ module: 'WebsiteRoutes' });

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://orbiondgb.vercel.app',
  'https://digitalboost.vercel.app',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://127.0.0.1:3000'
];

/**
 * CORS middleware for website routes
 */
const websiteCors = (req, res, next) => {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// Apply CORS to all website routes
router.use('/api/website', websiteCors);

/**
 * POST /api/website/contact
 * Receive contact form submissions from the landing page
 */
router.post('/api/website/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Nome, email e mensagem são obrigatórios'
      });
    }

    // Create lead in database
    const leadData = {
      nome: name,
      email: email,
      telefone: phone || null,
      origem: 'website_contact',
      status: 'novo',
      notas: `Assunto: ${subject || 'Não especificado'}\n\nMensagem:\n${message}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const leadId = leadModel.create(leadData);

    logger.info(' New contact form submission', {
      leadId,
      name,
      email,
      subject,
      origin: 'website_contact'
    });

    res.status(201).json({
      success: true,
      message: 'Mensagem recebida com sucesso! Entraremos em contato em breve.',
      data: { id: leadId }
    });

  } catch (error) {
    logger.error(' Error processing contact form:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erro ao processar sua mensagem. Tente novamente.'
    });
  }
});

/**
 * POST /api/website/newsletter
 * Receive newsletter subscriptions from the landing page
 */
router.post('/api/website/newsletter', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
    }

    // Check if already subscribed
    const existingLead = leadModel.findByEmail(email);

    if (existingLead) {
      // Update existing lead to include newsletter
      leadModel.update(existingLead.id, {
        newsletter: 1,
        updated_at: new Date().toISOString()
      });

      logger.info(' Existing lead subscribed to newsletter', { email });
    } else {
      // Create new lead with newsletter subscription
      const leadData = {
        email: email,
        origem: 'website_newsletter',
        status: 'newsletter',
        newsletter: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      leadModel.create(leadData);
      logger.info(' New newsletter subscription', { email });
    }

    res.status(201).json({
      success: true,
      message: 'Inscrição realizada com sucesso!'
    });

  } catch (error) {
    logger.error(' Error processing newsletter subscription:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erro ao processar sua inscrição. Tente novamente.'
    });
  }
});

/**
 * GET /api/website/health
 * Health check for the website API
 */
router.get('/api/website/health', (req, res) => {
  res.json({
    success: true,
    message: 'Website API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
