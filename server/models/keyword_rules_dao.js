const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * Keyword Rules DAO
 * Manages user-defined keyword-to-category mapping rules
 */
const keywordRulesDAO = {
  /**
   * Create a keyword rule
   * @param {Object} rule - Rule object
   * @param {string} rule.user_id - User ID
   * @param {string} rule.keyword - Keyword to match
   * @param {string} rule.category_id - Category ID to assign
   * @param {Function} callback - Callback function
   */
  createRule: (rule, callback) => {
    // Ensure table exists (for backward compatibility)
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS category_keyword_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        category_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        UNIQUE(user_id, keyword, category_id)
      )
    `;

    db.run(createTableSql, [], (createErr) => {
      if (createErr) {
        return callback(createErr);
      }

      // Create indexes
      const createIndexes = [
        `CREATE INDEX IF NOT EXISTS idx_keyword_rules_user_id ON category_keyword_rules(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_keyword_rules_keyword ON category_keyword_rules(keyword)`,
        `CREATE INDEX IF NOT EXISTS idx_keyword_rules_category_id ON category_keyword_rules(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_keyword_rules_user_keyword ON category_keyword_rules(user_id, keyword)`
      ];

      let indexCount = 0;
      const createNextIndex = () => {
        if (indexCount >= createIndexes.length) {
          // All indexes created, now insert the rule
          const sql = `
            INSERT INTO category_keyword_rules (user_id, keyword, category_id, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, keyword, category_id) DO UPDATE SET
              updated_at = datetime('now')
          `;

          const params = [
            rule.user_id,
            rule.keyword.toLowerCase().trim(),
            rule.category_id
          ];

          db.run(sql, params, function(err) {
            if (err) {
              callback(err);
            } else {
              callback(null, { id: this.lastID, changes: this.changes });
            }
          });
          return;
        }

        db.run(createIndexes[indexCount], [], (indexErr) => {
          if (indexErr) {
            console.warn('Index creation warning:', indexErr.message);
          }
          indexCount++;
          createNextIndex();
        });
      };

      createNextIndex();
    });
  },

  /**
   * Get all keyword rules for a user
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   */
  getRulesByUserId: (userId, callback) => {
    const sql = `
      SELECT 
        kr.id,
        kr.user_id,
        kr.keyword,
        kr.category_id,
        c.category_name,
        kr.created_at,
        kr.updated_at
      FROM category_keyword_rules kr
      LEFT JOIN Categories c ON kr.category_id = c.category_id
      WHERE kr.user_id = ?
      ORDER BY kr.keyword ASC, kr.created_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  /**
   * Find matching category for a description using keyword rules
   * @param {string} userId - User ID
   * @param {string} description - Transaction description
   * @param {Function} callback - Callback function
   */
  findMatchingCategory: (userId, description, callback) => {
    if (!description || !description.trim()) {
      return callback(null, null);
    }

    const descriptionLower = description.toLowerCase().trim();

    // Find the longest matching keyword (most specific match wins)
    const sql = `
      SELECT 
        kr.keyword,
        kr.category_id,
        c.category_name
      FROM category_keyword_rules kr
      LEFT JOIN Categories c ON kr.category_id = c.category_id
      WHERE kr.user_id = ?
        AND ? LIKE '%' || kr.keyword || '%'
      ORDER BY LENGTH(kr.keyword) DESC
      LIMIT 1
    `;

    db.get(sql, [userId, descriptionLower], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row || null);
      }
    });
  },

  /**
   * Delete a keyword rule
   * @param {string} ruleId - Rule ID
   * @param {string} userId - User ID (for security)
   * @param {Function} callback - Callback function
   */
  deleteRule: (ruleId, userId, callback) => {
    const sql = `
      DELETE FROM category_keyword_rules
      WHERE id = ? AND user_id = ?
    `;

    db.run(sql, [ruleId, userId], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  },

  /**
   * Delete a keyword rule by keyword and category
   * @param {string} userId - User ID
   * @param {string} keyword - Keyword
   * @param {string} categoryId - Category ID
   * @param {Function} callback - Callback function
   */
  deleteRuleByKeywordAndCategory: (userId, keyword, categoryId, callback) => {
    const sql = `
      DELETE FROM category_keyword_rules
      WHERE user_id = ? AND keyword = ? AND category_id = ?
    `;

    db.run(sql, [userId, keyword.toLowerCase().trim(), categoryId], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  },

  /**
   * Update a keyword rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updates - Updates object
   * @param {string} updates.keyword - New keyword (optional)
   * @param {string} updates.category_id - New category ID (optional)
   * @param {string} userId - User ID (for security)
   * @param {Function} callback - Callback function
   */
  updateRule: (ruleId, updates, userId, callback) => {
    const updatesList = [];
    const params = [];

    if (updates.keyword !== undefined) {
      updatesList.push('keyword = ?');
      params.push(updates.keyword.toLowerCase().trim());
    }

    if (updates.category_id !== undefined) {
      updatesList.push('category_id = ?');
      params.push(updates.category_id);
    }

    if (updatesList.length === 0) {
      return callback(new Error('No updates provided'));
    }

    updatesList.push('updated_at = datetime(\'now\')');
    params.push(ruleId, userId);

    const sql = `
      UPDATE category_keyword_rules
      SET ${updatesList.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    db.run(sql, params, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }
};

module.exports = keywordRulesDAO;

