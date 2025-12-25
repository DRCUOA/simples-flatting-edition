const keywordRulesDAO = require('../models/keyword_rules_dao');
const { validateAuthentication } = require('../utils/validators');

/**
 * Get all keyword rules for the authenticated user
 */
exports.getKeywordRules = (req, res) => {
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;

  keywordRulesDAO.getRulesByUserId(userId, (err, rules) => {
    if (err) {
      console.error('Error fetching keyword rules:', err);
      return res.status(500).json({ error: 'Failed to fetch keyword rules' });
    }
    res.json(rules);
  });
};

/**
 * Create a new keyword rule
 * Request body: { keyword: string, category_id: string }
 */
exports.createKeywordRule = (req, res) => {
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const { keyword, category_id } = req.body;

  // Validate required fields
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  if (!category_id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  keywordRulesDAO.createRule(
    {
      user_id: userId,
      keyword: keyword.trim(),
      category_id: category_id
    },
    (err, result) => {
      if (err) {
        console.error('Error creating keyword rule:', err);
        if (err.message && err.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ 
            error: 'A rule with this keyword and category already exists' 
          });
        }
        return res.status(500).json({ error: 'Failed to create keyword rule' });
      }

      res.status(201).json({
        message: 'Keyword rule created successfully',
        id: result.id,
        changes: result.changes
      });
    }
  );
};

/**
 * Delete a keyword rule by ID
 */
exports.deleteKeywordRule = (req, res) => {
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Rule ID is required' });
  }

  keywordRulesDAO.deleteRule(id, userId, (err, result) => {
    if (err) {
      console.error('Error deleting keyword rule:', err);
      return res.status(500).json({ error: 'Failed to delete keyword rule' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Keyword rule not found or access denied' });
    }

    res.json({ message: 'Keyword rule deleted successfully' });
  });
};

/**
 * Delete a keyword rule by keyword and category
 * Request body: { keyword: string, category_id: string }
 */
exports.deleteKeywordRuleByKeyword = (req, res) => {
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const { keyword, category_id } = req.body;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  if (!category_id) {
    return res.status(400).json({ error: 'Category ID is required' });
  }

  keywordRulesDAO.deleteRuleByKeywordAndCategory(
    userId,
    keyword.trim(),
    category_id,
    (err, result) => {
      if (err) {
        console.error('Error deleting keyword rule:', err);
        return res.status(500).json({ error: 'Failed to delete keyword rule' });
      }

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Keyword rule not found' });
      }

      res.json({ message: 'Keyword rule deleted successfully' });
    }
  );
};

/**
 * Update a keyword rule
 * Request body: { keyword?: string, category_id?: string }
 */
exports.updateKeywordRule = (req, res) => {
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const { id } = req.params;
  const updates = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Rule ID is required' });
  }

  keywordRulesDAO.updateRule(id, updates, userId, (err, result) => {
    if (err) {
      console.error('Error updating keyword rule:', err);
      return res.status(500).json({ error: 'Failed to update keyword rule' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Keyword rule not found or access denied' });
    }

    res.json({ message: 'Keyword rule updated successfully' });
  });
};

