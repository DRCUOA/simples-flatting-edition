// server/routes/user-preferences-router.js

const express = require('express');
const router = express.Router();
const userPreferencesController = require('../controllers/user-preferences-controller');
const { authenticateToken } = require('../middleware/auth');
const etag = require('../middleware/etag');

// All user preferences routes require authentication
router.use(authenticateToken);

// Batch set preferences (before single preference routes to avoid route conflicts)
router.post('/:userId/batch', userPreferencesController.batchSetPreferences);

// Get all preferences for a user (with ETag support)
router.get('/:userId', etag(), userPreferencesController.getAllPreferences);

// Get a specific preference (with ETag support)
router.get('/:userId/:preferenceKey', etag(), userPreferencesController.getPreference);

// Set a preference
router.post('/:userId/:preferenceKey', userPreferencesController.setPreference);

// Delete a specific preference
router.delete('/:userId/:preferenceKey', userPreferencesController.deletePreference);

module.exports = router;
