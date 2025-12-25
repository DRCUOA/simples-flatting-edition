const express = require('express');
const router = express.Router();
const keywordRulesController = require('../controllers/keyword-rules-controller');
const { authenticateToken } = require('../middleware/auth');

// All keyword rules routes require authentication
router.use(authenticateToken);

// Get all keyword rules for the authenticated user
router.get('/', keywordRulesController.getKeywordRules);

// Create a new keyword rule
router.post('/', keywordRulesController.createKeywordRule);

// Update a keyword rule
router.put('/:id', keywordRulesController.updateKeywordRule);

// Delete a keyword rule by ID
router.delete('/:id', keywordRulesController.deleteKeywordRule);

// Delete a keyword rule by keyword and category
router.delete('/by-keyword', keywordRulesController.deleteKeywordRuleByKeyword);

module.exports = router;

