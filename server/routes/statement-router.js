// server/routes/statement-router.js

const express = require('express');
const multer = require('multer');
const statementController = require('../controllers/statement-controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/statements/preview
 * @desc Preview CSV file and detect format
 * @access Private
 * @param {File} file - CSV file to preview
 * @param {string} account_id - Account ID
 * @param {string} [format] - Format override (bank|card)
 */
router.post('/preview', upload.single('file'), statementController.previewCSV);

/**
 * @route POST /api/statements/import
 * @desc Import CSV file as statement
 * @access Private
 * @param {File} file - CSV file to import
 * @param {string} account_id - Account ID
 * @param {string} [bank_name] - Bank name
 * @param {string} [statement_from] - Statement start date
 * @param {string} [statement_to] - Statement end date
 * @param {number} [closing_balance] - Closing balance
 * @param {string} [format] - Format override (bank|card)
 */
router.post('/import', upload.single('file'), statementController.importCSV);

/**
 * @route GET /api/statements
 * @desc Get all imports for user/account
 * @access Private
 * @param {string} [account_id] - Optional account ID filter
 */
router.get('/', statementController.getImports);

/**
 * @route GET /api/statements/:id
 * @desc Get import details
 * @access Private
 * @param {string} id - Import ID
 */
router.get('/:id', statementController.getImport);

/**
 * @route GET /api/statements/:id/lines
 * @desc Get statement lines for an import
 * @access Private
 * @param {string} id - Import ID
 * @param {number} [limit=100] - Limit results
 * @param {number} [offset=0] - Offset for pagination
 */
router.get('/:id/lines', statementController.getStatementLines);

/**
 * @route PATCH /api/statements/:id/name
 * @desc Update statement name
 * @access Private
 * @param {string} id - Import ID
 * @param {string} statement_name - New statement name
 */
router.patch('/:id/name', statementController.updateStatementName);

/**
 * @route DELETE /api/statements/:id
 * @desc Delete import and all associated lines
 * @access Private
 * @param {string} id - Import ID
 */
router.delete('/:id', statementController.deleteImport);

module.exports = router;
