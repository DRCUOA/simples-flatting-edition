// server/models/user_preferences_dao.js

const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');

const db = getConnection();

// Helper function to safely parse JSON, handling cases where value might not be valid JSON
const safeJsonParse = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    // If parsing fails, return the value as-is (might be a plain string)
    return value;
  }
};

const userPreferencesDAO = {
  // Get a specific preference for a user
  getPreference: (userId, preferenceKey, callback) => {
    const sql = 'SELECT preference_value FROM UserPreferences WHERE user_id = ? AND preference_key = ?';
    db.get(sql, [userId, preferenceKey], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row ? safeJsonParse(row.preference_value) : null);
      }
    });
  },

  // Set a preference for a user (upsert)
  setPreference: (userId, preferenceKey, preferenceValue, callback) => {
    const preferenceId = uuidv4();
    const valueString = JSON.stringify(preferenceValue);
    
    const sql = `
      INSERT OR REPLACE INTO UserPreferences 
      (preference_id, user_id, preference_key, preference_value, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    db.run(sql, [preferenceId, userId, preferenceKey, valueString], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { preference_id: preferenceId });
      }
    });
  },

  // Get all preferences for a user
  getAllPreferences: (userId, callback) => {
    const sql = 'SELECT preference_key, preference_value FROM UserPreferences WHERE user_id = ?';
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        const preferences = {};
        rows.forEach(row => {
          preferences[row.preference_key] = safeJsonParse(row.preference_value);
        });
        callback(null, preferences);
      }
    });
  },

  // Delete a specific preference
  deletePreference: (userId, preferenceKey, callback) => {
    const sql = 'DELETE FROM UserPreferences WHERE user_id = ? AND preference_key = ?';
    db.run(sql, [userId, preferenceKey], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { deleted: this.changes > 0 });
      }
    });
  },

  // Delete all preferences for a user
  deleteAllPreferences: (userId, callback) => {
    const sql = 'DELETE FROM UserPreferences WHERE user_id = ?';
    db.run(sql, [userId], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { deleted: this.changes });
      }
    });
  },

  /**
   * Batch set multiple preferences in one transaction
   * @param {string} userId - User ID
   * @param {Object} preferences - Key-value pairs of preferences
   * @param {Function} callback - Callback function with signature (err, result)
   */
  batchSetPreferences: (userId, preferences, callback) => {
    const entries = Object.entries(preferences);
    
    if (entries.length === 0) {
      return callback(null, { success: true, count: 0 });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const sql = `
        INSERT INTO UserPreferences (user_id, preference_key, preference_value)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, preference_key) DO UPDATE SET
          preference_value = excluded.preference_value,
          updated_at = CURRENT_TIMESTAMP
      `;

      let completed = 0;
      let hasError = false;

      entries.forEach(([key, value]) => {
        const valueStr = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);

        db.run(sql, [userId, key, valueStr], (err) => {
          if (err && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            return callback(err);
          }

          completed++;
          
          if (completed === entries.length && !hasError) {
            db.run('COMMIT', (err) => {
              if (err) {
                return callback(err);
              }

              callback(null, { 
                success: true, 
                count: entries.length
              });
            });
          }
        });
      });
    });
  }
};

module.exports = userPreferencesDAO;
