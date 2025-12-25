// autoSearchKeywordRouter.js
const express = require('express');
const router = express.Router();
const categoryAssignmentController = require('../controllers/auto-search-keyword-controller.js');
const { authenticateToken } = require('../middleware/auth');

// All auto search keyword routes require authentication
router.use(authenticateToken);


router.post('/keywordsearch', categoryAssignmentController.searchKeywordsForCategory);

module.exports = router;