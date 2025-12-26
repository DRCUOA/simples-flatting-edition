// server/routes/import-export-router.js

const express = require('express');
const router = express.Router();
const { requireUser } = require('../middleware/auth');
const { securityLogger } = require('../middleware/logging');
const importExportController = require('../controllers/import-export-controller');

/**
 * GET /api/import-export/export
 * Export all user data as JSON
 */
router.get('/export',
  requireUser,
  importExportController.exportData
);

/**
 * POST /api/import-export/import
 * Import user data from JSON
 */
router.post('/import',
  requireUser,
  importExportController.importData
);

/**
 * GET /api/import-export/summary
 * Get summary of user data (counts per table)
 */
router.get('/summary',
  requireUser,
  importExportController.getSummary
);

module.exports = router;

