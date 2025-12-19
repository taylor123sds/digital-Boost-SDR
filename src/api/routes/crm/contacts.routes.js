/**
 * @file contacts.routes.js
 * @description API routes for CRM Contacts (Individuals)
 */

import express from 'express';
import Contact from '../../../models/Contact.js';

const router = express.Router();
const contactModel = new Contact();

/**
 * GET /api/crm/contacts
 * List all contacts with pagination and filters
 */
router.get('/api/crm/contacts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      account_id,
      status,
      senioridade,
      is_decisor,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let contacts;
    let total;

    if (search) {
      contacts = contactModel.search(search, { limit: parseInt(limit), offset });
      total = contactModel.count();
    } else {
      const where = {};
      if (account_id) where.account_id = account_id;
      if (status) where.status = status;
      if (senioridade) where.senioridade = senioridade;
      if (is_decisor !== undefined) where.is_decisor = is_decisor === 'true' ? 1 : 0;

      contacts = contactModel.findAll({
        where,
        limit: parseInt(limit),
        offset
      });
      total = contactModel.count({ where });
    }

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(' Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/contacts/stats
 * Get contact statistics
 */
router.get('/api/crm/contacts/stats', async (req, res) => {
  try {
    const stats = contactModel.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(' Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/contacts/:id
 * Get contact by ID with related data
 */
router.get('/api/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { withDetails } = req.query;

    let contact;
    if (withDetails === 'true') {
      contact = contactModel.findByIdWithDetails(id);
    } else {
      contact = contactModel.findById(id);
    }

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error(' Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/contacts
 * Create new contact
 */
router.post('/api/crm/contacts', async (req, res) => {
  try {
    const contactData = req.body;

    // Validation
    if (!contactData.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome is required'
      });
    }

    const contact = contactModel.create(contactData);

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error(' Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/contacts/:id
 * Update contact
 */
router.put('/api/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;

    const contact = contactModel.update(id, updateData);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error(' Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/contacts/:id
 * Delete contact
 */
router.delete('/api/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = contactModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error(' Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/contacts/:id/consent
 * Record LGPD consent
 */
router.post('/api/crm/contacts/:id/consent', async (req, res) => {
  try {
    const { id } = req.params;
    const { consentType, value, ip } = req.body;

    // Validate consent type
    const validTypes = ['email', 'whatsapp', 'sms'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid consent type. Must be: email, whatsapp, or sms'
      });
    }

    const contact = contactModel.recordConsent(id, consentType, value, { ip });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact,
      message: 'Consent recorded successfully'
    });
  } catch (error) {
    console.error(' Error recording consent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/contacts/:id/score
 * Update contact score
 */
router.put('/api/crm/contacts/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body;

    if (typeof change !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Score change must be a number'
      });
    }

    const contact = contactModel.updateScore(id, change);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact,
      message: 'Score updated successfully'
    });
  } catch (error) {
    console.error(' Error updating score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
