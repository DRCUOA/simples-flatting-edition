// server/models/audit_dao.js

const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * Audit Data Access Object
 * Provides access to audit logs and activity history
 */
const auditDAO = {
  /**
   * Get comprehensive audit logs for a user
   * Combines data from multiple sources: balance adjustments, statement imports,
   * transaction imports, reconciliation sessions, account creation, etc.
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date filter (YYYY-MM-DD)
   * @param {string} options.endDate - End date filter (YYYY-MM-DD)
   * @param {string} options.type - Filter by type (balance_adjustment, statement_import, transaction_import, reconciliation, account_created)
   * @param {string} options.accountId - Filter by account ID
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Offset for pagination
   * @param {Function} callback - Callback function with signature (err, logs)
   * @returns {void}
   */
  getAuditLogs: (userId, options, callback) => {
    const {
      startDate = null,
      endDate = null,
      type = null,
      accountId = null,
      limit = 100,
      offset = 0
    } = options || {};

    const logs = [];
    let completed = 0;
    const totalQueries = 6; // Updated to include category verification files
    
    const checkComplete = () => {
      completed++;
      if (completed >= totalQueries) {
        // Sort all logs by date (most recent first)
        // Compare ISO timestamp strings directly (lexicographic comparison works for ISO format)
        logs.sort((a, b) => {
          const dateA = a.timestamp || a.created_at || '0000-00-00T00:00:00.000Z';
          const dateB = b.timestamp || b.created_at || '0000-00-00T00:00:00.000Z';
          return dateB.localeCompare(dateA);
        });
        
        // Apply filters
        let filteredLogs = logs;
        
        if (type) {
          filteredLogs = filteredLogs.filter(log => log.type === type);
        }
        
        if (accountId) {
          filteredLogs = filteredLogs.filter(log => log.account_id === accountId);
        }
        
        if (startDate) {
          filteredLogs = filteredLogs.filter(log => {
            const logDate = log.timestamp || log.created_at;
            return logDate >= startDate;
          });
        }
        
        if (endDate) {
          filteredLogs = filteredLogs.filter(log => {
            const logDate = log.timestamp || log.created_at;
            return logDate <= endDate + ' 23:59:59';
          });
        }
        
        // Apply pagination
        const paginatedLogs = filteredLogs.slice(offset, offset + limit);
        
        callback(null, {
          logs: paginatedLogs,
          total: filteredLogs.length,
          limit,
          offset
        });
      }
    };

    // 1. Get Balance Adjustments
    let balanceAdjustmentsSql = `
      SELECT 
        adjustment_id as id,
        account_id,
        user_id,
        adjustment_amount as amount,
        adjustment_date as date,
        adjustment_reason as description,
        balance_before,
        balance_after,
        created_at as timestamp,
        'balance_adjustment' as type,
        'Balance Adjustment' as type_label
      FROM BalanceAdjustments
      WHERE user_id = ?
    `;
    const balanceParams = [userId];
    
    if (accountId) {
      balanceAdjustmentsSql += ' AND account_id = ?';
      balanceParams.push(accountId);
    }
    
    balanceAdjustmentsSql += ' ORDER BY created_at DESC';
    
    db.all(balanceAdjustmentsSql, balanceParams, (err, rows) => {
      if (!err && rows) {
        logs.push(...rows);
      }
      checkComplete();
    });

    // 2. Get Statement Imports
    let statementImportsSql = `
      SELECT 
        import_id as id,
        account_id,
        user_id,
        source_filename as description,
        bank_name,
        statement_from,
        statement_to,
        closing_balance as amount,
        status,
        integrity_status,
        created_at as timestamp,
        'statement_import' as type,
        'Statement Import' as type_label
      FROM StatementImports
      WHERE user_id = ?
    `;
    const statementParams = [userId];
    
    if (accountId) {
      statementImportsSql += ' AND account_id = ?';
      statementParams.push(accountId);
    }
    
    statementImportsSql += ' ORDER BY created_at DESC';
    
    db.all(statementImportsSql, statementParams, (err, rows) => {
      if (!err && rows) {
        logs.push(...rows);
      }
      checkComplete();
    });

    // 3. Get Transaction Imports
    let transactionImportsSql = `
      SELECT DISTINCT
        ti.id,
        t.account_id,
        ti.user_id,
        ti.import_date as date,
        ti.status as description,
        ti.created_at as timestamp,
        'transaction_import' as type,
        'Transaction Import' as type_label
      FROM transaction_imports ti
      JOIN Transactions t ON t.import_id = ti.id
      WHERE ti.user_id = ?
    `;
    const transactionParams = [userId];
    
    if (accountId) {
      transactionImportsSql += ' AND t.account_id = ?';
      transactionParams.push(accountId);
    }
    
    transactionImportsSql += ' ORDER BY ti.created_at DESC';
    
    db.all(transactionImportsSql, transactionParams, (err, rows) => {
      if (!err && rows) {
        logs.push(...rows);
      }
      checkComplete();
    });

    // 4. Get Reconciliation Sessions
    let reconciliationSql = `
      SELECT 
        session_id as id,
        account_id,
        user_id,
        period_start,
        period_end,
        closing_balance as amount,
        variance,
        closed,
        run_started as timestamp,
        'reconciliation' as type,
        'Reconciliation Session' as type_label
      FROM ReconciliationSessions
      WHERE user_id = ?
    `;
    const reconParams = [userId];
    
    if (accountId) {
      reconciliationSql += ' AND account_id = ?';
      reconParams.push(accountId);
    }
    
    reconciliationSql += ' ORDER BY run_started DESC';
    
    db.all(reconciliationSql, reconParams, (err, rows) => {
      if (!err && rows) {
        logs.push(...rows);
      }
      checkComplete();
    });

    // 5. Get Account Creation Events
    let accountSql = `
      SELECT 
        account_id as id,
        account_id,
        user_id,
        account_name as description,
        account_type,
        current_balance as amount,
        created_at as timestamp,
        'account_created' as type,
        'Account Created' as type_label
      FROM Accounts
      WHERE user_id = ?
    `;
    const accountParams = [userId];
    
    if (accountId) {
      accountSql += ' AND account_id = ?';
      accountParams.push(accountId);
    }
    
    accountSql += ' ORDER BY created_at DESC';
    
    db.all(accountSql, accountParams, (err, rows) => {
      if (!err && rows) {
        logs.push(...rows);
      }
      checkComplete();
    });

    // 6. Get Category Verification Files (from file system)
    const fs = require('fs').promises;
    const path = require('path');
    (async () => {
      try {
        const projectRoot = path.resolve(__dirname, '../..');
        const files = await fs.readdir(projectRoot);
        const verificationFiles = files.filter(file => 
          file.startsWith('categoryVerificationrunon_') && file.endsWith('.json')
        );

        // Read metadata from each file
        const verificationLogs = await Promise.all(
          verificationFiles.map(async (filename) => {
            try {
              const filePath = path.join(projectRoot, filename);
              const fileContent = await fs.readFile(filePath, 'utf-8');
              const jsonData = JSON.parse(fileContent);
              const stats = await fs.stat(filePath);

              // Parse filename: categoryVerificationrunon_DDMMYYYY_UserId_userId.json
              const match = filename.match(/categoryVerificationrunon_(\d{8})_UserId_(.+)\.json/);
              const dateStr = match ? match[1] : '';
              const userId = match ? match[2] : '';
              
              // Parse date DDMMYYYY
              let parsedDate = null;
              if (dateStr && dateStr.length === 8) {
                const day = dateStr.substring(0, 2);
                const month = dateStr.substring(2, 4);
                const year = dateStr.substring(4, 8);
                parsedDate = `${year}-${month}-${day}`;
              }

              const metadata = jsonData.metadata || {};
              const verification = jsonData.verification || {};
              
              return {
                id: filename,
                account_id: null,
                user_id: metadata.filters?.user_id || userId || 'all',
                amount: verification.total_all_signed_amount || null,
                description: `Category Verification File: ${filename}`,
                timestamp: metadata.query_timestamp || stats.mtime.toISOString(),
                created_at: metadata.query_timestamp || stats.mtime.toISOString(),
                type: 'category_verification_file',
                type_label: 'Category Verification File',
                status: verification.passed ? 'passed' : 'failed',
                filename: filename,
                metadata: metadata,
                verification: verification
              };
            } catch (err) {
              console.error(`Error reading verification file ${filename}:`, err);
              return null;
            }
          })
        );

        // Filter by user_id if needed
        const filteredVerificationLogs = verificationLogs
          .filter(log => log !== null)
          .filter(log => {
            if (userId && log.user_id !== userId && log.user_id !== 'all') {
              return false;
            }
            return true;
          });

        logs.push(...filteredVerificationLogs);
      } catch (err) {
        console.error('Error reading category verification files:', err);
      }
      checkComplete();
    })();
  },

  /**
   * Get audit log statistics for a user
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function with signature (err, stats)
   * @returns {void}
   */
  getAuditStats: (userId, callback) => {
    const stats = {};
    let completed = 0;
    const totalQueries = 6; // Updated to include category verification files

    const checkComplete = () => {
      completed++;
      if (completed === totalQueries) {
        callback(null, stats);
      }
    };

    // Count balance adjustments
    db.get('SELECT COUNT(*) as count FROM BalanceAdjustments WHERE user_id = ?', [userId], (err, row) => {
      if (!err) {
        stats.balance_adjustments = row?.count || 0;
      }
      checkComplete();
    });

    // Count statement imports
    db.get('SELECT COUNT(*) as count FROM StatementImports WHERE user_id = ?', [userId], (err, row) => {
      if (!err) {
        stats.statement_imports = row?.count || 0;
      }
      checkComplete();
    });

    // Count transaction imports
    db.get('SELECT COUNT(DISTINCT id) as count FROM transaction_imports WHERE user_id = ?', [userId], (err, row) => {
      if (!err) {
        stats.transaction_imports = row?.count || 0;
      }
      checkComplete();
    });

    // Count reconciliation sessions
    db.get('SELECT COUNT(*) as count FROM ReconciliationSessions WHERE user_id = ?', [userId], (err, row) => {
      if (!err) {
        stats.reconciliations = row?.count || 0;
      }
      checkComplete();
    });

    // Count accounts
    db.get('SELECT COUNT(*) as count FROM Accounts WHERE user_id = ?', [userId], (err, row) => {
      if (!err) {
        stats.accounts = row?.count || 0;
      }
      checkComplete();
    });

    // Count category verification files (async file system operation)
    const fs = require('fs').promises;
    const path = require('path');
    (async () => {
      try {
        const projectRoot = path.resolve(__dirname, '../..');
        const files = await fs.readdir(projectRoot);
        const verificationFiles = files.filter(file => 
          file.startsWith('categoryVerificationrunon_') && file.endsWith('.json')
        );
        stats.category_verification_files = verificationFiles.length;
      } catch (err) {
        console.error('Error counting category verification files:', err);
        stats.category_verification_files = 0;
      }
      checkComplete();
    })();
  },

  /**
   * Delete an audit log entry by type and ID
   * @param {string} type - Type of audit log (balance_adjustment, statement_import, transaction_import, reconciliation)
   * @param {string} id - ID of the entry to delete
   * @param {string} userId - User ID for security
   * @param {Function} callback - Callback function with signature (err, result)
   * @returns {void}
   */
  deleteAuditLog: (type, id, userId, callback) => {
    const accountDAO = require('./account_dao');
    const statementDAO = require('./statement_dao');
    const reconciliationDAO = require('./reconciliation_dao');
    const transactionDAO = require('./transaction_dao');

    switch (type) {
      case 'balance_adjustment':
        accountDAO.deleteBalanceAdjustment(id, userId, callback);
        break;
      
      case 'statement_import':
        statementDAO.deleteImport(id, userId)
          .then(result => callback(null, result))
          .catch(err => callback(err));
        break;
      
      case 'transaction_import':
        // First verify the import exists and belongs to the user
        const verifyImportSql = `
          SELECT id FROM transaction_imports 
          WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `;
        
        db.get(verifyImportSql, [id, userId], (verifyErr, importRow) => {
          if (verifyErr) {
            return callback(verifyErr);
          }
          
          if (!importRow) {
            return callback(new Error('Transaction import not found or access denied'));
          }
          
          // Get account IDs affected by transactions from this import
          const getAccountsSql = `
            SELECT DISTINCT account_id 
            FROM Transactions 
            WHERE import_id = ? AND user_id = ?
          `;
          
          db.all(getAccountsSql, [id, userId], (err, accounts) => {
            if (err) {
              return callback(err);
            }
            
            // Delete all transactions from this import
            const deleteTransactionsSql = `
              DELETE FROM Transactions 
              WHERE import_id = ? AND user_id = ?
            `;
            
            db.run(deleteTransactionsSql, [id, userId], function(deleteErr) {
              if (deleteErr) {
                return callback(deleteErr);
              }
              
              const transactionCount = this.changes;
              const accountIds = accounts.map(a => a.account_id);
              
              // Recalculate balances for affected accounts
              let recalcCount = 0;
              const recalcErrors = [];
              
              if (accountIds.length === 0) {
                // No accounts affected, just delete the import record
                db.run('DELETE FROM transaction_imports WHERE id = ?', [id], function(importErr) {
                  if (importErr) {
                    return callback(importErr);
                  }
                  callback(null, {
                    deleted: true,
                    transactions_deleted: transactionCount,
                    import_id: id
                  });
                });
                return;
              }
              
              accountIds.forEach((accountId) => {
                accountDAO.updateAccountBalanceFromTransactions(accountId, (recalcErr) => {
                  recalcCount++;
                  if (recalcErr) {
                    recalcErrors.push({ accountId, error: recalcErr });
                  }
                  
                  if (recalcCount === accountIds.length) {
                    // Delete the import record
                    db.run('DELETE FROM transaction_imports WHERE id = ?', [id], function(importErr) {
                      if (importErr) {
                        return callback(importErr);
                      }
                      
                      if (recalcErrors.length > 0) {
                        console.error('Some balance recalculations failed:', recalcErrors);
                      }
                      
                      callback(null, {
                        deleted: true,
                        transactions_deleted: transactionCount,
                        accounts_recalculated: accountIds.length - recalcErrors.length,
                        import_id: id
                      });
                    });
                  }
                });
              });
            });
          });
        });
        break;
      
      case 'reconciliation':
        reconciliationDAO.deleteSession(id, userId)
          .then(result => callback(null, result))
          .catch(err => callback(err));
        break;
      
      case 'category_verification_file':
        // Delete verification file from file system
        const fs = require('fs').promises;
        const path = require('path');
        (async () => {
          try {
            // Security: ensure filename doesn't contain path traversal
            if (id.includes('..') || id.includes('/') || id.includes('\\')) {
              return callback(new Error('Invalid filename'));
            }

            // Ensure it's a category verification file
            if (!id.startsWith('categoryVerificationrunon_') || !id.endsWith('.json')) {
              return callback(new Error('Invalid file type'));
            }

            const projectRoot = path.resolve(__dirname, '../..');
            const filePath = path.join(projectRoot, id);

            // Check if file exists
            try {
              await fs.access(filePath);
            } catch (err) {
              return callback(new Error('Verification file not found'));
            }

            // Delete the file
            await fs.unlink(filePath);

            callback(null, {
              deleted: true,
              filename: id
            });
          } catch (err) {
            callback(err);
          }
        })();
        break;
      
      case 'account_created':
        // Account creation events shouldn't be deletable - they're just log entries
        callback(new Error('Account creation events cannot be deleted'));
        break;
      
      default:
        callback(new Error(`Unknown audit log type: ${type}`));
    }
  }
};

module.exports = auditDAO;

