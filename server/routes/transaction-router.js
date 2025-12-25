const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction-controller');
const { secureCSVUpload, uploadLimiter } = require('../middleware/fileUpload');
const { authenticateToken } = require('../middleware/auth');

// All transaction routes require authentication
router.use(authenticateToken);

// CSV/OFX import routes with secure upload handling
router.post('/preview', uploadLimiter, secureCSVUpload, transactionController.previewCSV);
router.post('/upload', uploadLimiter, secureCSVUpload, transactionController.uploadTransactions);
router.post('/import', uploadLimiter, secureCSVUpload, transactionController.uploadTransactions); // Alternative endpoint name

// Transaction CRUD routes
router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);
router.post('/batch', transactionController.batchDeleteTransactions);
router.patch('/batch', transactionController.batchUpdateTransactions);

// Import history routes
router.get('/import/logs', transactionController.getImportLogs);

// Category suggestion route
router.get('/suggestions/category', transactionController.getCategorySuggestions);

// Category feedback route
router.post('/suggestions/feedback', transactionController.saveCategoryFeedback);

module.exports = router; 