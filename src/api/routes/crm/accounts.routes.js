/**
 * @file accounts.routes.js
 * @description API routes for CRM Accounts (Companies/Organizations)
 */

import express from 'express';
import Account from '../../../models/Account.js';

const router = express.Router();
const accountModel = new Account();

/**
 * GET /api/crm/accounts
 * List all accounts with pagination and filters
 */
router.get('/api/crm/accounts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      tipo,
      setor,
      owner_id,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let accounts;
    let total;

    if (search) {
      // Search mode
      accounts = accountModel.search(search, { limit: parseInt(limit), offset });
      total = accountModel.count();
    } else {
      // Filter mode
      const where = {};
      if (tipo) where.tipo = tipo;
      if (setor) where.setor = setor;
      if (owner_id) where.owner_id = owner_id;

      accounts = accountModel.findAll({
        where,
        limit: parseInt(limit),
        offset
      });
      total = accountModel.count({ where });
    }

    res.json({
      success: true,
      data: accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(' Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/accounts/stats
 * Get account statistics
 */
router.get('/api/crm/accounts/stats', async (req, res) => {
  try {
    const stats = accountModel.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(' Error fetching account stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/accounts/:id
 * Get account by ID with related data
 */
router.get('/api/crm/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { withContacts } = req.query;

    let account;
    if (withContacts === 'true') {
      account = accountModel.findByIdWithContacts(id);
    } else {
      account = accountModel.findById(id);
    }

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error(' Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crm/accounts
 * Create new account
 */
router.post('/api/crm/accounts', async (req, res) => {
  try {
    const accountData = req.body;

    // Validation
    if (!accountData.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome is required'
      });
    }

    const account = accountModel.create(accountData);

    res.status(201).json({
      success: true,
      data: account,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error(' Error creating account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/crm/accounts/:id
 * Update account
 */
router.put('/api/crm/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove id from update data if present
    delete updateData.id;

    const account = accountModel.update(id, updateData);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account,
      message: 'Account updated successfully'
    });
  } catch (error) {
    console.error(' Error updating account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/crm/accounts/:id
 * Delete account
 */
router.delete('/api/crm/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = accountModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error(' Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
