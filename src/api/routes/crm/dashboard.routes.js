/**
 * @file dashboard.routes.js
 * @description Routes for CRM dashboard pages
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /crm
 * Main CRM dashboard
 */
router.get('/crm', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'index.html'));
});

/**
 * GET /crm/
 * Main CRM dashboard (with trailing slash)
 */
router.get('/crm/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'index.html'));
});

/**
 * GET /crm/leads
 * Leads listing page
 */
router.get('/crm/leads', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'leads.html'));
});

/**
 * GET /crm/pipeline
 * Pipeline Kanban page
 */
router.get('/crm/pipeline', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'pipeline.html'));
});

/**
 * GET /crm/accounts
 * Accounts listing page
 */
router.get('/crm/accounts', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'accounts.html'));
});

/**
 * GET /crm/contacts
 * Contacts listing page
 */
router.get('/crm/contacts', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'crm', 'contacts.html'));
});

export default router;
