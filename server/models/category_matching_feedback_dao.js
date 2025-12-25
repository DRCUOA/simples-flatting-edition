const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * Category Matching Feedback DAO
 * Stores and retrieves feedback on category suggestions to improve matching accuracy
 */
const categoryMatchingFeedbackDAO = {
  /**
   * Save feedback for a category suggestion
   * @param {Object} feedback - Feedback object
   * @param {string} feedback.user_id - User ID
   * @param {string} feedback.description - Transaction description
   * @param {number} feedback.amount - Transaction amount
   * @param {string} feedback.suggested_category_id - Category that was suggested
   * @param {string} feedback.actual_category_id - Category that was actually selected
   * @param {number} feedback.confidence_score - Confidence score of the suggestion
   * @param {boolean} feedback.accepted - Whether suggestion was accepted
   * @param {Function} callback - Callback function
   */
  saveFeedback: (feedback, callback) => {
    // Create table if it doesn't exist
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS category_matching_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        suggested_category_id TEXT,
        actual_category_id TEXT NOT NULL,
        confidence_score REAL,
        accepted INTEGER DEFAULT 0,
        feedback_timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (suggested_category_id) REFERENCES Categories(category_id) ON DELETE CASCADE,
        FOREIGN KEY (actual_category_id) REFERENCES Categories(category_id) ON DELETE CASCADE
      )
    `;
    
    db.run(createTableSql, [], (createErr) => {
      if (createErr) {
        return callback(createErr);
      }
      
      // Create index for faster lookups
      const createIndexSql = `
        CREATE INDEX IF NOT EXISTS idx_category_feedback_user_desc 
        ON category_matching_feedback(user_id, description, amount)
      `;
      
      db.run(createIndexSql, [], (indexErr) => {
        if (indexErr) {
          return callback(indexErr);
        }
        
        const sql = `
          INSERT INTO category_matching_feedback (
            user_id, description, amount, suggested_category_id, 
            actual_category_id, confidence_score, accepted
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          feedback.user_id,
          feedback.description.toLowerCase().trim(),
          Math.abs(feedback.amount || 0),
          feedback.suggested_category_id || null,
          feedback.actual_category_id,
          feedback.confidence_score || 0,
          feedback.accepted ? 1 : 0
        ];

        db.run(sql, params, function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { id: this.lastID });
          }
        });
      });
    });
  },

  /**
   * Get feedback for similar transactions
   * @param {string} userId - User ID
   * @param {string} description - Transaction description
   * @param {number} amount - Transaction amount
   * @param {Function} callback - Callback function
   */
  getFeedbackForSimilar: (userId, description, amount, callback) => {
    const descriptionLower = description.toLowerCase().trim();
    const amountAbs = Math.abs(parseFloat(amount) || 0);
    
    // Find feedback for similar descriptions and amounts
    const sql = `
      SELECT 
        suggested_category_id,
        actual_category_id,
        confidence_score,
        accepted,
        COUNT(*) as feedback_count,
        AVG(CASE WHEN accepted = 1 THEN 1.0 ELSE 0.0 END) as acceptance_rate
      FROM category_matching_feedback
      WHERE user_id = ?
        AND (
          LOWER(description) LIKE ? 
          OR LOWER(description) = ?
          OR ABS(amount - ?) < ?
        )
      GROUP BY suggested_category_id, actual_category_id
      ORDER BY feedback_count DESC, acceptance_rate DESC
      LIMIT 10
    `;
    
    const params = [
      userId,
      `%${descriptionLower.substring(0, Math.min(10, descriptionLower.length))}%`,
      descriptionLower,
      amountAbs,
      amountAbs * 0.1 + 1 // Within 10% of amount or $1
    ];

    db.all(sql, params, (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  /**
   * Get acceptance rate for a category suggestion pattern
   * @param {string} userId - User ID
   * @param {string} description - Transaction description pattern
   * @param {string} categoryId - Category ID
   * @param {Function} callback - Callback function
   */
  getAcceptanceRate: (userId, description, categoryId, callback) => {
    const descriptionLower = description.toLowerCase().trim();
    
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) as accepted_count,
        AVG(CASE WHEN accepted = 1 THEN 1.0 ELSE 0.0 END) as acceptance_rate
      FROM category_matching_feedback
      WHERE user_id = ?
        AND suggested_category_id = ?
        AND (
          LOWER(description) LIKE ?
          OR LOWER(description) = ?
        )
    `;
    
    const params = [
      userId,
      categoryId,
      `%${descriptionLower.substring(0, Math.min(10, descriptionLower.length))}%`,
      descriptionLower
    ];

    db.get(sql, params, (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row || { total: 0, accepted_count: 0, acceptance_rate: 0 });
      }
    });
  }
};

module.exports = categoryMatchingFeedbackDAO;

