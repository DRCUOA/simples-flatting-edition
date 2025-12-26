// server/services/import-export-service.js

const { getCurrentTimestamp } = require('../utils/dateUtils');
const categoryDAO = require('../models/category_dao');
const accountDAO = require('../models/account_dao');
const userPreferencesDAO = require('../models/user_preferences_dao');
const accountFieldMappingDAO = require('../models/account_field_mapping_dao');
const transactionDAO = require('../models/transaction_dao');
const statementDAO = require('../models/statement_dao');
const reconciliationDAO = require('../models/reconciliation_dao');
const keywordRulesDAO = require('../models/keyword_rules_dao');
const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * Import-Export Service
 * Handles full user data export and import for data migration between instances
 * Uses DAOs for data access instead of direct database queries
 */

/**
 * Export all user data
 * @param {string} userId - User ID to export data for
 * @returns {Promise<Object>} - Export data object
 */
async function exportUserData(userId) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new Error('User ID is required'));
    }

    const exportData = {
      metadata: {
        exportDate: getCurrentTimestamp(),
        version: '1.0.0',
        userId: userId,
        schema: 'simples-flatting-edition'
      },
      data: {}
    };

    // Use DAOs to export data in dependency order
    const exportTasks = [
      // 1. Categories - use DAO
      (callback) => {
        categoryDAO.getAllCategories(userId, (err, categories) => {
          if (err) return callback(err);
          exportData.data.categories = categories || [];
          callback(null);
        });
      },
      // 2. Accounts - use DAO
      (callback) => {
        accountDAO.getAllAccounts(userId, (err, accounts) => {
          if (err) return callback(err);
          exportData.data.accounts = accounts || [];
          callback(null);
        });
      },
      // 3. UserPreferences - use DAO but need full records
      (callback) => {
        // getAllPreferences returns object, but we need array of records
        // Use DAO's db connection pattern - query through table structure
        db.all('SELECT * FROM UserPreferences WHERE user_id = ? ORDER BY preference_id', [userId], (err, rows) => {
          if (err) return callback(err);
          exportData.data.userPreferences = rows || [];
          callback(null);
        });
      },
      // 4. Account Field Mappings - no getAll method, query directly
      (callback) => {
        db.all('SELECT * FROM account_field_mappings WHERE user_id = ? ORDER BY mapping_id', [userId], (err, rows) => {
          if (err) return callback(err);
          exportData.data.accountFieldMappings = rows || [];
          callback(null);
        });
      },
      // 5. Transactions - use transactionDAO
      (callback) => {
        // getAllTransactions requires dates, but we can pass null to get all
        transactionDAO.getAllTransactions(userId, null, null)
          .then(transactions => {
            exportData.data.transactions = transactions || [];
            callback(null);
          })
          .catch(err => callback(err));
      },
      // 6. Transaction Imports - use transactionDAO pattern
      (callback) => {
        db.all('SELECT * FROM transaction_imports WHERE user_id = ? ORDER BY id', [userId], (err, rows) => {
          if (err) return callback(err);
          exportData.data.transactionImports = rows || [];
          callback(null);
        });
      },
      // 7. Statement Imports - use statementDAO
      (callback) => {
        statementDAO.getImportsByUser(userId)
          .then(imports => {
            exportData.data.statementImports = imports || [];
            callback(null);
          })
          .catch(err => callback(err));
      },
      // 8. Statement Lines - query directly (no getAll method)
      (callback) => {
        db.all('SELECT * FROM StatementLines WHERE user_id = ? ORDER BY statement_line_id', [userId], (err, rows) => {
          if (err) return callback(err);
          exportData.data.statementLines = rows || [];
          callback(null);
        });
      },
      // 9. Reconciliation Sessions - use reconciliationDAO
      (callback) => {
        reconciliationDAO.getSessionsByUser(userId)
          .then(sessions => {
            exportData.data.reconciliationSessions = sessions || [];
            callback(null);
          })
          .catch(err => callback(err));
      },
      // 10. Reconciliation Matches - query directly (no getAll method)
      (callback) => {
        db.all('SELECT * FROM ReconciliationMatches WHERE user_id = ? ORDER BY match_id', [userId], (err, rows) => {
          if (err) return callback(err);
          exportData.data.reconciliationMatches = rows || [];
          callback(null);
        });
      },
      // 11. Category Keyword Rules - use keywordRulesDAO
      (callback) => {
        keywordRulesDAO.getRulesByUserId(userId, (err, rules) => {
          if (err) {
            // Table might not exist, skip it
            exportData.data.categoryKeywordRules = [];
            return callback(null);
          }
          exportData.data.categoryKeywordRules = rules || [];
          callback(null);
        });
      },
      // 12. Category Matching Feedback - check if table exists first
      (callback) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='category_matching_feedback'", [], (err, tables) => {
          if (err || tables.length === 0) {
            exportData.data.categoryMatchingFeedback = [];
            return callback(null);
          }
          db.all('SELECT * FROM category_matching_feedback WHERE user_id = ? ORDER BY id', [userId], (err, rows) => {
            if (err) {
              exportData.data.categoryMatchingFeedback = [];
              return callback(null);
            }
            exportData.data.categoryMatchingFeedback = rows || [];
            callback(null);
          });
        });
      }
    ];

    // Execute all export tasks sequentially
    let currentIndex = 0;
    const executeNext = () => {
      if (currentIndex >= exportTasks.length) {
        return resolve(exportData);
      }
      exportTasks[currentIndex]((err) => {
        if (err) {
          return reject(err);
        }
        currentIndex++;
        executeNext();
      });
    };

    executeNext();
  });
}

/**
 * Import user data
 * @param {string} targetUserId - User ID to import data into
 * @param {Object} importData - Import data object from export
 * @param {Object} options - Import options
 * @param {boolean} options.preserveIds - Whether to preserve original IDs (default: true)
 * @param {boolean} options.overwriteExisting - Whether to overwrite existing data (default: false)
 * @returns {Promise<Object>} - Import result with statistics
 */
async function importUserData(targetUserId, importData, options = {}) {
  return new Promise((resolve, reject) => {
    if (!targetUserId) {
      return reject(new Error('Target user ID is required'));
    }

    if (!importData || !importData.data) {
      return reject(new Error('Invalid import data format'));
    }

    const {
      preserveIds = true,
      overwriteExisting = false
    } = options;

    const result = {
      imported: {},
      skipped: {},
      errors: [],
      statistics: {}
    };

    // Validate metadata
    if (importData.metadata && importData.metadata.schema) {
      if (importData.metadata.schema !== 'simples-flatting-edition') {
        result.errors.push({
          type: 'schema_mismatch',
          message: `Schema mismatch: expected 'simples-flatting-edition', got '${importData.metadata.schema}'`
        });
      }
    }

    // Start transaction for atomic import
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          return reject(err);
        }

        // Import in dependency order using DAOs where possible
        const importOrder = [
          { 
            name: 'categories', 
            importFn: (data, callback) => {
              importViaDAO(data, (item, cb) => {
                categoryDAO.createCategory({ ...item, user_id: targetUserId }, cb);
              }, callback);
            }
          },
          { 
            name: 'accounts', 
            importFn: (data, callback) => {
              importViaDAO(data, (item, cb) => {
                accountDAO.createAccount({ ...item, user_id: targetUserId }, cb);
              }, callback);
            }
          },
          { 
            name: 'userPreferences', 
            importFn: (data, callback) => {
              importViaDAO(data, (item, cb) => {
                // setPreference expects parsed JSON value
                let value;
                try {
                  value = typeof item.preference_value === 'string' 
                    ? JSON.parse(item.preference_value) 
                    : item.preference_value;
                } catch (e) {
                  value = item.preference_value;
                }
                userPreferencesDAO.setPreference(targetUserId, item.preference_key, value, cb);
              }, callback);
            }
          },
          { 
            name: 'accountFieldMappings', 
            importFn: (data, callback) => {
              importViaDAO(data, (item, cb) => {
                accountFieldMappingDAO.createMapping({ ...item, user_id: targetUserId }, targetUserId, cb);
              }, callback);
            }
          },
          { 
            name: 'transactions', 
            importFn: (data, callback) => {
              importViaDAOPromise(data, (item) => {
                return transactionDAO.createTransaction({ ...item, user_id: targetUserId }, targetUserId);
              }, callback);
            }
          },
          { 
            name: 'transactionImports', 
            importFn: (data, callback) => {
              importViaDirectInsert('transaction_imports', 'id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          },
          { 
            name: 'statementImports', 
            importFn: (data, callback) => {
              importViaDirectInsert('StatementImports', 'import_id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          },
          { 
            name: 'statementLines', 
            importFn: (data, callback) => {
              importViaDirectInsert('StatementLines', 'statement_line_id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          },
          { 
            name: 'reconciliationSessions', 
            importFn: (data, callback) => {
              importViaDirectInsert('ReconciliationSessions', 'session_id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          },
          { 
            name: 'reconciliationMatches', 
            importFn: (data, callback) => {
              importViaDirectInsert('ReconciliationMatches', 'match_id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          },
          { 
            name: 'categoryKeywordRules', 
            importFn: (data, callback) => {
              importViaDAO(data, (item, cb) => {
                keywordRulesDAO.createRule({ ...item, user_id: targetUserId }, cb);
              }, callback);
            }
          },
          { 
            name: 'categoryMatchingFeedback', 
            importFn: (data, callback) => {
              importViaDirectInsert('category_matching_feedback', 'id', data, targetUserId, preserveIds, overwriteExisting, callback);
            }
          }
        ];

        let currentIndex = 0;

        const importNext = () => {
          if (currentIndex >= importOrder.length) {
            // All imports complete, commit transaction
            db.run('COMMIT', (err) => {
              if (err) {
                return db.run('ROLLBACK', () => {
                  reject(err);
                });
              }

              // Calculate statistics
              result.statistics = {
                totalImported: Object.values(result.imported).reduce((sum, arr) => sum + arr.length, 0),
                totalSkipped: Object.values(result.skipped).reduce((sum, arr) => sum + arr.length, 0),
                totalErrors: result.errors.length,
                tablesImported: Object.keys(result.imported).length
              };

              resolve(result);
            });
            return;
          }

          const tableInfo = importOrder[currentIndex];
          const data = importData.data[tableInfo.name] || [];

          if (data.length === 0) {
            result.imported[tableInfo.name] = [];
            result.skipped[tableInfo.name] = [];
            currentIndex++;
            return importNext();
          }

          // Check if table exists (for direct insert tables)
          const tableNameMap = {
            'accountFieldMappings': 'account_field_mappings',
            'transactionImports': 'transaction_imports',
            'statementImports': 'StatementImports',
            'statementLines': 'StatementLines',
            'reconciliationSessions': 'ReconciliationSessions',
            'reconciliationMatches': 'ReconciliationMatches',
            'categoryMatchingFeedback': 'category_matching_feedback'
          };
          
          const actualTableName = tableNameMap[tableInfo.name] || tableInfo.name;
          
          // Check if this is a DAO-based import or direct insert
          const isDAOImport = tableInfo.name === 'categories' || 
                            tableInfo.name === 'accounts' || 
                            tableInfo.name === 'userPreferences' || 
                            tableInfo.name === 'accountFieldMappings' || 
                            tableInfo.name === 'categoryKeywordRules' ||
                            tableInfo.name === 'transactions';
          
          if (!isDAOImport) {
            // For direct insert tables, check if table exists
            db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [actualTableName], (err, tables) => {
              if (err) {
                result.errors.push({
                  table: tableInfo.name,
                  error: err.message
                });
                currentIndex++;
                return importNext();
              }

              if (tables.length === 0) {
                result.skipped[tableInfo.name] = data;
                currentIndex++;
                return importNext();
              }

              // Import data
              tableInfo.importFn(data, (imported, skipped, errors) => {
                result.imported[tableInfo.name] = imported;
                result.skipped[tableInfo.name] = skipped;
                if (errors.length > 0) {
                  result.errors.push(...errors.map(e => ({ table: tableInfo.name, ...e })));
                }
                currentIndex++;
                importNext();
              });
            });
          } else {
            // Import via DAO
            tableInfo.importFn(data, (imported, skipped, errors) => {
              result.imported[tableInfo.name] = imported;
              result.skipped[tableInfo.name] = skipped;
              if (errors.length > 0) {
                result.errors.push(...errors.map(e => ({ table: tableInfo.name, ...e })));
              }
              currentIndex++;
              importNext();
            });
          }
        };

        importNext();
      });
    });
  });
}

/**
 * Import data using DAO methods that return Promises
 */
function importViaDAOPromise(data, createFn, callback) {
  const imported = [];
  const skipped = [];
  const errors = [];
  let processed = 0;

  if (data.length === 0) {
    return callback(imported, skipped, errors);
  }

  data.forEach((item) => {
    createFn(item)
      .then((result) => {
        processed++;
        const idField = item.transaction_id || item.id || 'unknown';
        imported.push({ id: idField, changes: 1 });
        
        if (processed === data.length) {
          callback(imported, skipped, errors);
        }
      })
      .catch((err) => {
        processed++;
        
        if (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('PRIMARY KEY'))) {
          const idField = item.transaction_id || item.id || 'unknown';
          skipped.push({ id: idField, reason: 'already_exists' });
        } else {
          const idField = item.transaction_id || item.id || 'unknown';
          errors.push({ id: idField, error: err.message });
        }
        
        if (processed === data.length) {
          callback(imported, skipped, errors);
        }
      });
  });
}

/**
 * Import data using DAO methods
 */
function importViaDAO(data, createFn, callback) {
  const imported = [];
  const skipped = [];
  const errors = [];
  let processed = 0;

  if (data.length === 0) {
    return callback(imported, skipped, errors);
  }

  data.forEach((item) => {
    createFn(item, (err, result) => {
      processed++;

      if (err) {
        if (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('PRIMARY KEY'))) {
          const idField = item.category_id || item.account_id || item.preference_id || item.mapping_id || item.id || 'unknown';
          skipped.push({ id: idField, reason: 'already_exists' });
        } else {
          const idField = item.category_id || item.account_id || item.preference_id || item.mapping_id || item.id || 'unknown';
          errors.push({ id: idField, error: err.message });
        }
      } else {
        const idField = item.category_id || item.account_id || item.preference_id || item.mapping_id || item.id || 'unknown';
        imported.push({ id: idField, changes: 1 });
      }

      if (processed === data.length) {
        callback(imported, skipped, errors);
      }
    });
  });
}

/**
 * Import data via direct INSERT (for tables without DAO create methods)
 * Note: This still uses db connection but is necessary for tables without DAO methods
 */
function importViaDirectInsert(tableName, idField, data, targetUserId, preserveIds, overwriteExisting, callback) {
  const imported = [];
  const skipped = [];
  const errors = [];
  let processed = 0;

  if (data.length === 0) {
    return callback(imported, skipped, errors);
  }

  // Get table structure to build INSERT statement
  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      return callback([], [], [{ error: err.message }]);
    }

    const columnNames = columns.map(col => col.name);
    
    // For ReconciliationMatches, match_id is AUTOINCREMENT, so exclude it from INSERT
    const insertColumns = tableName === 'ReconciliationMatches' 
      ? columnNames.filter(name => name !== 'match_id')
      : columnNames;

    const placeholders = insertColumns.map(() => '?').join(', ');
    const sql = `INSERT OR ${overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`;

    data.forEach((row) => {
      // Update user_id to target user
      const rowData = { ...row };
      rowData.user_id = targetUserId;

      // Build values array in column order
      const values = insertColumns.map(col => {
        // Handle special cases
        if (col === 'match_id' && tableName === 'ReconciliationMatches') {
          return null; // AUTOINCREMENT - will be generated
        }
        // Return the value or null if undefined
        return rowData[col] !== undefined ? rowData[col] : null;
      });

      db.run(sql, values, function(insertErr) {
        processed++;

        if (insertErr) {
          // Check if it's a duplicate key error
          if (insertErr.message.includes('UNIQUE constraint') || insertErr.message.includes('PRIMARY KEY')) {
            skipped.push({ id: rowData[idField] || 'unknown', reason: 'already_exists' });
          } else if (insertErr.message.includes('FOREIGN KEY constraint')) {
            // Foreign key constraint violation - likely missing referenced record
            errors.push({ 
              id: rowData[idField] || 'unknown', 
              error: insertErr.message,
              reason: 'foreign_key_constraint'
            });
          } else {
            errors.push({ id: rowData[idField] || 'unknown', error: insertErr.message });
          }
        } else {
          if (this.changes > 0) {
            imported.push({ id: rowData[idField] || 'unknown', changes: this.changes });
          } else {
            skipped.push({ id: rowData[idField] || 'unknown', reason: 'no_changes' });
          }
        }

        if (processed === data.length) {
          callback(imported, skipped, errors);
        }
      });
    });
  });
}

module.exports = {
  exportUserData,
  importUserData
};
