const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');

const db = getConnection();

// Check if display_order column exists (for backward compatibility)
let displayOrderColumnExists = null;
const checkDisplayOrderColumn = (callback) => {
  if (displayOrderColumnExists !== null) {
    return callback(null, displayOrderColumnExists);
  }
  db.all("PRAGMA table_info(Categories)", [], (err, rows) => {
    if (err) {
      return callback(err);
    }
    displayOrderColumnExists = rows.some(row => row.name === 'display_order');
    callback(null, displayOrderColumnExists);
  });
}; 

// Category DAO with CRUD operations
const categoryDAO = {
  // Get all categories for a specific user
  getAllCategories: (userId, callback) => {
    // Handle case where callback is passed as first parameter (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for category access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // Check if display_order column exists, then build appropriate query
    checkDisplayOrderColumn((checkErr, hasDisplayOrder) => {
      if (checkErr) {
        // If check fails, fall back to simple ordering
        const sql = 'SELECT * FROM Categories WHERE user_id = ? ORDER BY category_name';
        return db.all(sql, [userId], (err, rows) => {
          if (err) {
            callback(err);
          } else {
            callback(null, rows || []);
          }
        });
      }
      
      // Order by display_order first (if set), then by category_name for fallback
      const sql = hasDisplayOrder
        ? `
          SELECT * FROM Categories 
          WHERE user_id = ? 
          ORDER BY 
            COALESCE(display_order, 999999) ASC,
            category_name ASC
        `
        : 'SELECT * FROM Categories WHERE user_id = ? ORDER BY category_name';
      
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          callback(err);
        } else {
          callback(null, rows || []);
        }
      });
    });
  },

  // Get category by ID (user-scoped)
  getCategoryById: (categoryId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility for internal use)
    if (typeof userId === 'function') {
      callback = userId;
      const sql = 'SELECT * FROM Categories WHERE category_id = ?';
      db.get(sql, [categoryId], (err, row) => {
        if (err) {
          callback(err);
        } else {
          callback(null, row);
        }
      });
      return;
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'SELECT * FROM Categories WHERE category_id = ? AND user_id = ?';
    db.get(sql, [categoryId, userId], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  // Get categories by user ID
  getCategoriesByUserId: (userId, callback) => {
    // Check if display_order column exists, then build appropriate query
    checkDisplayOrderColumn((checkErr, hasDisplayOrder) => {
      if (checkErr) {
        // If check fails, fall back to simple ordering
        const sql = 'SELECT * FROM Categories WHERE user_id = ? ORDER BY category_name';
        return db.all(sql, [userId], (err, rows) => {
          if (err) {
            callback(err);
          } else {
            callback(null, rows || []);
          }
        });
      }
      
      // Order by display_order first (if set), then by category_name for fallback
      const sql = hasDisplayOrder
        ? `
          SELECT * FROM Categories 
          WHERE user_id = ? 
          ORDER BY 
            COALESCE(display_order, 999999) ASC,
            category_name ASC
        `
        : 'SELECT * FROM Categories WHERE user_id = ? ORDER BY category_name';
      
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          callback(err);
        } else {
          callback(null, rows || []);
        }
      });
    });
  },

  // Create a new category
  createCategory: (category, callback) => {
    const categoryId = category.category_id || uuidv4();
    
    // Check if display_order column exists
    checkDisplayOrderColumn((checkErr, hasDisplayOrder) => {
      if (checkErr) {
        // If check fails, use query without display_order
        const sql = `
          INSERT INTO Categories (
            category_id, user_id, category_name, parent_category_id, budgeted_amount
          ) VALUES (?, ?, ?, ?, ?)
        `;
        
        return db.run(sql, [
          categoryId,
          category.user_id,
          category.category_name,
          category.parent_category_id || null,
          category.budgeted_amount || 0.0
        ], function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { category_id: categoryId });
          }
        });
      }
      
      const sql = hasDisplayOrder
        ? `
          INSERT INTO Categories (
            category_id, user_id, category_name, parent_category_id, budgeted_amount, display_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
        : `
          INSERT INTO Categories (
            category_id, user_id, category_name, parent_category_id, budgeted_amount
          ) VALUES (?, ?, ?, ?, ?)
        `;
      
      const params = hasDisplayOrder
        ? [
            categoryId,
            category.user_id,
            category.category_name,
            category.parent_category_id || null,
            category.budgeted_amount || 0.0,
            category.display_order || null
          ]
        : [
            categoryId,
            category.user_id,
            category.category_name,
            category.parent_category_id || null,
            category.budgeted_amount || 0.0
          ];
      
      db.run(sql, params, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { category_id: categoryId });
        }
      });
    });
  },

  // Bulk create categories
  bulkCreateCategories: (categories, callback) => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return callback(new Error('No categories provided for bulk insert'));
    }

    // Check if display_order column exists first
    checkDisplayOrderColumn((checkErr, hasDisplayOrder) => {
      if (checkErr) {
        // If check fails, proceed without display_order
        hasDisplayOrder = false;
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let successCount = 0;
        let errorCount = 0;
        let createdCategories = [];

        const insertNext = (index) => {
          if (index >= categories.length) {
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                callback(err);
              } else {
                callback(null, { 
                  successCount, 
                  errorCount,
                  createdCategories 
                });
              }
            });
            return;
          }

          const category = categories[index];
          const categoryId = category.category_id || uuidv4();
          
          const sql = hasDisplayOrder
            ? `
              INSERT INTO Categories (
                category_id, user_id, category_name, parent_category_id, budgeted_amount, display_order
              ) VALUES (?, ?, ?, ?, ?, ?)
            `
            : `
              INSERT INTO Categories (
                category_id, user_id, category_name, parent_category_id, budgeted_amount
              ) VALUES (?, ?, ?, ?, ?)
            `;
          
          const params = hasDisplayOrder
            ? [
                categoryId,
                category.user_id,
                category.category_name,
                category.parent_category_id || null,
                category.budgeted_amount || 0.0,
                category.display_order || null
              ]
            : [
                categoryId,
                category.user_id,
                category.category_name,
                category.parent_category_id || null,
                category.budgeted_amount || 0.0
              ];
          
          db.run(sql, params, function(err) {
            if (err) {
              errorCount++;
            } else {
              successCount++;
              createdCategories.push({
                ...category,
                category_id: categoryId
              });
            }
            insertNext(index + 1);
          });
        };

        insertNext(0); // Start processing
      });
    });
  },

  // Update a category (user-scoped)
  updateCategory: (categoryId, category, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for category access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // Check if display_order column exists
    checkDisplayOrderColumn((checkErr, hasDisplayOrder) => {
      if (checkErr) {
        // If check fails, use query without display_order
        const sql = `
          UPDATE Categories 
          SET category_name = ?, parent_category_id = ?, budgeted_amount = ?
          WHERE category_id = ? AND user_id = ?
        `;
        
        return db.run(sql, [
          category.category_name,
          category.parent_category_id || null,
          category.budgeted_amount || 0.0,
          categoryId,
          userId
        ], function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { changes: this.changes });
          }
        });
      }
      
      const sql = hasDisplayOrder
        ? `
          UPDATE Categories 
          SET category_name = ?, parent_category_id = ?, budgeted_amount = ?, display_order = ?
          WHERE category_id = ? AND user_id = ?
        `
        : `
          UPDATE Categories 
          SET category_name = ?, parent_category_id = ?, budgeted_amount = ?
          WHERE category_id = ? AND user_id = ?
        `;
      
      const params = hasDisplayOrder
        ? [
            category.category_name,
            category.parent_category_id || null,
            category.budgeted_amount || 0.0,
            category.display_order !== undefined ? category.display_order : null,
            categoryId,
            userId
          ]
        : [
            category.category_name,
            category.parent_category_id || null,
            category.budgeted_amount || 0.0,
            categoryId,
            userId
          ];
      
      db.run(sql, params, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    });
  },

  // Delete a category (user-scoped)
  deleteCategory: (categoryId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for category access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // First check if there are any transactions using this category
    const checkSql = 'SELECT COUNT(*) as count FROM Transactions WHERE category_id = ? AND user_id = ?';
    db.get(checkSql, [categoryId, userId], (err, row) => {
      if (err) {
        callback(err);
        return;
      }
      
      if (row.count > 0) {
        callback(new Error('Cannot delete category that is used by transactions'));
        return;
      }
      
      // Check if there are any child categories
      const checkChildrenSql = 'SELECT COUNT(*) as count FROM Categories WHERE parent_category_id = ? AND user_id = ?';
      db.get(checkChildrenSql, [categoryId, userId], (err, row) => {
        if (err) {
          callback(err);
          return;
        }
        
        if (row.count > 0) {
          callback(new Error('Cannot delete category that has child categories'));
          return;
        }
        
        // If no transactions or child categories, proceed with deletion
        const deleteSql = 'DELETE FROM Categories WHERE category_id = ? AND user_id = ?';
        db.run(deleteSql, [categoryId, userId], function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { changes: this.changes });
          }
        });
      });
    });
  },

  // Bulk update category display order
  updateCategoryOrder: (userId, categoryOrders, callback) => {
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
      return callback(new Error('Category orders array is required'));
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      let updateCount = 0;
      let errorCount = 0;

      const updateNext = (index) => {
        if (index >= categoryOrders.length) {
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              callback(err);
            } else {
              callback(null, { updatedCount: updateCount, errorCount });
            }
          });
          return;
        }

        const order = categoryOrders[index];
        const sql = `
          UPDATE Categories 
          SET display_order = ?
          WHERE category_id = ? AND user_id = ?
        `;
        
        db.run(sql, [order.display_order, order.category_id, userId], function(err) {
          if (err) {
            errorCount++;
          } else {
            updateCount++;
          }
          updateNext(index + 1);
        });
      };

      updateNext(0);
    });
  }
};

module.exports = categoryDAO;
