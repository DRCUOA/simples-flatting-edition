/**
 * User Preferences Controller
 * Enhanced with batch operations to reduce N+1 queries
 */

const userPreferencesDAO = require('../models/user_preferences_dao');

/**
 * GET /api/user-preferences/:userId
 * Get all preferences for a user (batch operation)
 */
exports.getAllPreferences = (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  userPreferencesDAO.getAllPreferences(userId, (err, preferences) => {
    if (err) {
      console.error('Error fetching all preferences:', err);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    res.json({ preferences });
  });
};

/**
 * GET /api/user-preferences/:userId/:preferenceKey
 * Get a specific preference
 */
exports.getPreference = (req, res) => {
  const { userId, preferenceKey } = req.params;
  
  if (!userId || !preferenceKey) {
    return res.status(400).json({ error: 'User ID and preference key are required' });
  }

  userPreferencesDAO.getPreference(userId, preferenceKey, (err, preference) => {
    if (err) {
      console.error('Error fetching preference:', err);
      return res.status(500).json({ error: 'Failed to fetch preference' });
    }

    res.json({ preference });
  });
};

/**
 * POST /api/user-preferences/:userId/:preferenceKey
 * Set a specific preference
 */
exports.setPreference = (req, res) => {
  const { userId, preferenceKey } = req.params;
  const { preferenceValue } = req.body;
  
  if (!userId || !preferenceKey) {
    return res.status(400).json({ error: 'User ID and preference key are required' });
  }

  userPreferencesDAO.setPreference(userId, preferenceKey, preferenceValue, (err, result) => {
    if (err) {
      console.error('Error setting preference:', err);
      return res.status(500).json({ error: 'Failed to set preference' });
    }

    res.json({ 
      success: true,
      message: 'Preference saved successfully' 
    });
  });
};

/**
 * POST /api/user-preferences/:userId/batch
 * Set multiple preferences in one request (reduces N+1)
 */
exports.batchSetPreferences = (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!preferences || typeof preferences !== 'object') {
    return res.status(400).json({ error: 'preferences must be an object' });
  }

  userPreferencesDAO.batchSetPreferences(userId, preferences, (err, result) => {
    if (err) {
      console.error('Error in batch preference:', err);
      return res.status(500).json({ error: 'Failed to save preferences' });
    }

    res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} preferences saved successfully` 
    });
  });
};

/**
 * DELETE /api/user-preferences/:userId/:preferenceKey
 * Delete a specific preference
 */
exports.deletePreference = (req, res) => {
  const { userId, preferenceKey } = req.params;
  
  if (!userId || !preferenceKey) {
    return res.status(400).json({ error: 'User ID and preference key are required' });
  }

  userPreferencesDAO.deletePreference(userId, preferenceKey, (err, result) => {
    if (err) {
      console.error('Error deleting preference:', err);
      return res.status(500).json({ error: 'Failed to delete preference' });
    }

    res.json({ 
      success: true,
      deleted: result.deleted
    });
  });
};
