const express = require('express');
const router = express.Router();
const accountFieldMappingController = require('../controllers/account-field-mapping-controller');
const { authenticateToken } = require('../middleware/auth');

// All account field mapping routes require authentication
router.use(authenticateToken);

// Get all mappings for an account
router.get('/account/:accountId', accountFieldMappingController.getMappingsByAccountId);

// Get a specific mapping by ID
router.get('/:id', accountFieldMappingController.getMappingById);

// Create a new mapping
router.post('/', accountFieldMappingController.createMapping);

// Update an existing mapping
router.put('/:id', accountFieldMappingController.updateMapping);

// Delete a mapping
router.delete('/:id', accountFieldMappingController.deleteMapping);

// Delete all mappings for an account
router.delete('/account/:accountId', accountFieldMappingController.deleteMappingsByAccountId);

// Save multiple mappings for an account
router.post('/account/:accountId/batch', accountFieldMappingController.saveMappings);

module.exports = router; 