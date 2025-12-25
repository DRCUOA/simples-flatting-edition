const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit-controller');
const { authenticateToken } = require('../middleware/auth');

// All audit routes require authentication
router.use(authenticateToken);

// Get audit logs
router.get('/logs', auditController.getAuditLogs);

// Get audit statistics
router.get('/stats', auditController.getAuditStats);

// Delete audit log entry
router.delete('/logs/:type/:id', auditController.deleteAuditLog);

// Get category verification files list
router.get('/category-verification-files', auditController.getCategoryVerificationFiles);

// Get category verification file content
router.get('/category-verification-files/:filename', auditController.getCategoryVerificationFile);

// Generate new category verification file
router.post('/category-verification-files/generate', auditController.generateCategoryVerificationFile);

module.exports = router;

