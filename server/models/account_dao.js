
const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');
const { normalizeAppDate, compareDomainDates, getToday } = require('../utils/dateUtils');
const { parseMoney, addMoney, roundMoney } = require('../utils/money');

const db = getConnection();

/**
 * Account Data Access Object (DAO)
 * Provides CRUD operations and business logic for account management
 * @namespace accountDAO
 */
const accountDAO = {
  /**
   * Get all accounts for a specific user
   * @param {string} userId - The unique identifier of the user
   * @param {Function} callback - Callback function with signature (err, accounts)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Array<Object>} callback.accounts - Array of account objects
   * @returns {void}
   */
  getAllAccounts: (userId, callback) => {
    // Handle case where callback is passed as first parameter (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for account access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'SELECT * FROM Accounts WHERE user_id = ? ORDER BY account_name';
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  /**
   * Get account by ID (optionally user-scoped)
   * @param {string} accountId - The unique identifier of the account
   * @param {string|Function} userId - The user ID for scoping, or callback function for backward compatibility
   * @param {Function} [callback] - Callback function with signature (err, account)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object|null} callback.account - Account object or null if not found
   * @returns {void}
   */
  getAccountById: (accountId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility for internal use)
    if (typeof userId === 'function') {
      callback = userId;
      const sql = 'SELECT * FROM Accounts WHERE account_id = ?';
      db.get(sql, [accountId], (err, row) => {
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
    
    const sql = 'SELECT * FROM Accounts WHERE account_id = ? AND user_id = ?';
    db.get(sql, [accountId, userId], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  /**
   * Get accounts by user ID
   * @param {string} userId - The unique identifier of the user
   * @param {Function} callback - Callback function with signature (err, accounts)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Array<Object>} callback.accounts - Array of account objects
   * @returns {void}
   */
  getAccountsByUserId: (userId, callback) => {
    const sql = 'SELECT * FROM Accounts WHERE user_id = ? ORDER BY account_name';
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  /**
   * Determine account class based on account type
   * @param {string} accountType - The account type
   * @returns {string} - 'asset', 'liability', or 'equity'
   */
  determineAccountClass: (accountType) => {
    if (!accountType) return 'asset';
    
    const liabilityTypes = ['credit', 'loan', 'mortgage'];
    if (liabilityTypes.includes(accountType.toLowerCase())) {
      return 'liability';
    }
    
    if (accountType.toLowerCase() === 'equity') {
      return 'equity';
    }
    
    // Default to asset for: checking, savings, investment, cash, other
    return 'asset';
  },

  /**
   * Create a new account
   * @param {Object} account - Account object containing account details
   * @param {string} [account.account_id] - Optional account ID (will generate UUID if not provided)
   * @param {string} account.user_id - The user ID who owns this account
   * @param {string} account.account_name - Name of the account
   * @param {string} account.account_type - Type of account (e.g., 'checking', 'savings')
   * @param {number} account.current_balance - Current balance of the account
   * @param {boolean} account.positive_is_credit - Whether positive amounts represent credits
   * @param {string} [account.last_balance_update] - Optional timestamp of last balance update
   * @param {Function} callback - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing account_id
   * @returns {void}
   */
  createAccount: (account, callback) => {
    const accountId = account.account_id || uuidv4();
    const accountClass = account.account_class || accountDAO.determineAccountClass(account.account_type);
    
    // Opening balance = user-entered current_balance at account creation (NEVER changes)
    // Current balance will be recalculated as opening_balance + sum_of_transactions
    const openingBalance = account.current_balance || 0;
    
    const { getCurrentTimestamp } = require('../utils/dateUtils');
    const accountDate = account.last_balance_update || getCurrentTimestamp();
    
    const sql = `
      INSERT INTO Accounts (
        account_id, user_id, account_name, account_type, opening_balance, current_balance, positive_is_credit, last_balance_update, created_at, account_class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      accountId,
      account.user_id,
      account.account_name,
      account.account_type,
      openingBalance,  // Store opening balance separately
      openingBalance,  // Initially current_balance = opening_balance
      account.positive_is_credit ? 1 : 0,  // Explicitly convert boolean to integer
      accountDate,
      accountDate,  // Set created_at to same date as last_balance_update
      accountClass
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, { account_id: accountId });
    });
  },

  /**
   * Get sum of transactions after a specific date for an account and the date of the last transaction
   * @param {string} accountId - The unique identifier of the account
   * @param {string} balanceDate - The balance date (ISO string)
   * @param {Function} callback - Callback function with signature (err, sum, lastTransactionDate)
   * @returns {void}
   */
  getTransactionsSumAfterDate: (accountId, balanceDate, callback) => {
    if (!balanceDate) {
      return callback(null, 0, null);
    }
    
    // Normalize date to YYYY-MM-DD format using date utils
    const { normalizeAppDate } = require('../utils/dateUtils');
    const normalizedResult = normalizeAppDate(balanceDate, 'api-domain');
    if (!normalizedResult || !normalizedResult.parsed) {
      return callback(null, 0, null);
    }
    
    const normalizedDate = normalizedResult.parsed;
    
    const sql = `
      SELECT 
        COALESCE(SUM(signed_amount), 0) as total,
        MAX(transaction_date) as last_transaction_date
      FROM Transactions
      WHERE account_id = ? AND transaction_date > ?
    `;
    
    db.get(sql, [accountId, normalizedDate], (err, row) => {
      if (err) {
        callback(err);
      } else {
        const total = row ? parseMoney(row.total) || 0 : 0;
        const lastTransactionDate = row && row.last_transaction_date ? row.last_transaction_date : null;
        callback(null, total, lastTransactionDate);
      }
    });
  },

  /**
   * Check if balance date predates any transactions
   * @param {string} accountId - The unique identifier of the account
   * @param {string} balanceDate - The balance date (ISO string)
   * @param {Function} callback - Callback function with signature (err, predates)
   * @returns {void}
   * @deprecated Use hasTransactionsAfterDate instead - this only checks if balance date is before earliest transaction
   */
  balanceDatePredatesTransactions: (accountId, balanceDate, callback) => {
    if (!balanceDate) {
      return callback(null, false);
    }
    
    const sql = `
      SELECT MIN(transaction_date) as earliest_date
      FROM Transactions
      WHERE account_id = ?
    `;
    
    db.get(sql, [accountId], (err, row) => {
      if (err) {
        callback(err);
      } else {
        if (!row || !row.earliest_date) {
          // No transactions exist, so balance date doesn't predate anything
          callback(null, false);
        } else {
          // Compare dates (balanceDate should be before earliest transaction)
          // Normalize dates to YYYY-MM-DD format for comparison using date utils
          const balanceDateNormalized = normalizeAppDate(balanceDate, 'api-domain');
          const earliestDateNormalized = normalizeAppDate(row.earliest_date, 'db-domain');
          
          if (!balanceDateNormalized?.parsed || !earliestDateNormalized?.parsed) {
            return callback(null, false);
          }
          
          const balanceDateStr = balanceDateNormalized.parsed;
          const earliestDateStr = earliestDateNormalized.parsed;
          callback(null, balanceDateStr < earliestDateStr);
        }
      }
    });
  },

  /**
   * Check if there are transactions after the balance date
   * @param {string} accountId - The unique identifier of the account
   * @param {string} balanceDate - The balance date (ISO string)
   * @param {Function} callback - Callback function with signature (err, hasTransactionsAfter)
   * @returns {void}
   */
  hasTransactionsAfterDate: (accountId, balanceDate, callback) => {
    if (!balanceDate) {
      return callback(null, false);
    }
    
    // Normalize date to YYYY-MM-DD format using date utils
    const { normalizeAppDate } = require('../utils/dateUtils');
    const normalizedResult = normalizeAppDate(balanceDate, 'api-domain');
    if (!normalizedResult || !normalizedResult.parsed) {
      return callback(null, false);
    }
    
    const normalizedDate = normalizedResult.parsed;
    
    const sql = `
      SELECT COUNT(*) as count
      FROM Transactions
      WHERE account_id = ? AND transaction_date > ?
    `;
    
    db.get(sql, [accountId, normalizedDate], (err, row) => {
      if (err) {
        callback(err);
      } else {
        const hasTransactionsAfter = row && row.count > 0;
        callback(null, hasTransactionsAfter);
      }
    });
  },

  /**
   * Update an account (user-scoped)
   * @param {string} accountId - The unique identifier of the account to update
   * @param {Object} account - Account object containing updated details
   * @param {string} account.account_name - Updated name of the account
   * @param {string} account.account_type - Updated type of account
   * @param {number} account.current_balance - Updated current balance
   * @param {boolean} account.positive_is_credit - Whether positive amounts represent credits
   * @param {string} [account.last_balance_update] - Optional timestamp of last balance update
   * @param {string|Function} userId - The user ID for scoping, or callback function for backward compatibility
   * @param {Function} [callback] - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing changes count
   * @returns {void}
   */
  updateAccount: (accountId, account, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for account access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // Determine account class based on account type if not explicitly provided
    const accountClass = account.account_class || accountDAO.determineAccountClass(account.account_type);
    
    // Get existing account to verify it exists
    accountDAO.getAccountById(accountId, userId, (getErr, existingAccount) => {
      if (getErr) {
        return callback(getErr);
      }
      
      if (!existingAccount) {
        return callback(new Error('Account not found or access denied'));
      }
      
    // DISABLED: Balance recalculation from account updates
    // Opening balance should remain fixed - use Balance Adjustments for corrections
    // Only update non-balance fields when editing an account
    
    const sql = `
      UPDATE Accounts 
      SET account_name = ?, 
          account_type = ?,
          positive_is_credit = ?,
          account_class = ?,
          timeframe = ?
      WHERE account_id = ? AND user_id = ?
    `;
    
    const params = [
      account.account_name,
      account.account_type,
      account.positive_is_credit ? 1 : 0,
      accountClass,
      account.timeframe || null,
      accountId,
      userId
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, { changes: this.changes });
    });
    });
  },

  /**
   * Update last_imported_transaction_date for an account (monotonic: only if newer)
   * @param {string} accountId - The unique identifier of the account
   * @param {string} newestTransactionDate - Newest transaction date in YYYY-MM-DD format
   * @param {Function} callback - Callback function with signature (err, result)
   * @returns {void}
   */
  updateLastImportedTransactionDate: (accountId, newestTransactionDate, callback) => {
    if (!accountId || !newestTransactionDate) {
      return callback(new Error('Account ID and transaction date are required'));
    }

    // Normalize the date to YYYY-MM-DD
    const normalized = normalizeAppDate(newestTransactionDate, 'db-domain');
    if (!normalized.parsed) {
      return callback(new Error(`Invalid transaction date: ${normalized.error}`));
    }

    const normalizedDate = normalized.parsed;

    // Get existing last_imported_transaction_date to enforce monotonic update
    db.get('SELECT last_imported_transaction_date FROM Accounts WHERE account_id = ?', [accountId], (err, row) => {
      if (err) {
        return callback(err);
      }

      if (!row) {
        return callback(new Error('Account not found'));
      }

      const existingDate = row.last_imported_transaction_date;

      // Enforce monotonic: only update if new date > existing date
      if (existingDate) {
        const existingNormalized = normalizeAppDate(existingDate, 'db-domain');
        if (existingNormalized.parsed && compareDomainDates(normalizedDate, existingNormalized.parsed) <= 0) {
          // New date is not newer, skip update
          return callback(null, { changes: 0, skipped: true, reason: 'Date not newer than existing' });
        }
      }

      // Update last_imported_transaction_date
      const sql = `
        UPDATE Accounts 
        SET last_imported_transaction_date = ?
        WHERE account_id = ?
      `;

      db.run(sql, [normalizedDate, accountId], function(updateErr) {
        if (updateErr) {
          return callback(updateErr);
        }
        callback(null, { changes: this.changes, newDate: normalizedDate });
      });
    });
  },

  /**
   * Delete an account (user-scoped)
   * @param {string} accountId - The unique identifier of the account to delete
   * @param {string|Function} userId - The user ID for scoping, or callback function for backward compatibility
   * @param {Function} [callback] - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing changes count
   * @returns {void}
   * @throws {Error} If account has associated transactions
   */
  deleteAccount: (accountId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for account access'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // Enable foreign keys to ensure constraints are enforced
    db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
      if (pragmaErr) {
        // If pragma fails, continue anyway - foreign keys might already be enabled
      }
      
      // Check for all related records that would prevent deletion
      const checkSql = `
        SELECT 
          (SELECT COUNT(*) FROM Transactions WHERE account_id = ? AND user_id = ?) as transaction_count,
          (SELECT COUNT(*) FROM StatementImports WHERE account_id = ? AND user_id = ?) as statement_import_count,
          (SELECT COUNT(*) FROM StatementLines WHERE account_id = ? AND user_id = ?) as statement_line_count,
          (SELECT COUNT(*) FROM ReconciliationSessions WHERE account_id = ? AND user_id = ?) as reconciliation_count,
          (SELECT COUNT(*) FROM ReconciliationMatches WHERE account_id = ? AND user_id = ?) as reconciliation_match_count
      `;
      
      db.get(checkSql, [accountId, userId, accountId, userId, accountId, userId, accountId, userId, accountId, userId], (err, row) => {
        if (err) {
          callback(err);
          return;
        }
        
        // Check if any related records exist
        const hasTransactions = row.transaction_count > 0;
        const hasStatementImports = row.statement_import_count > 0;
        const hasStatementLines = row.statement_line_count > 0;
        const hasReconciliations = row.reconciliation_count > 0;
        const hasReconciliationMatches = row.reconciliation_match_count > 0;
        
        if (hasTransactions) {
          callback(new Error('Cannot delete account that has transactions. Please delete all transactions associated with this account first.'));
          return;
        }
        
        if (hasStatementImports || hasStatementLines) {
          callback(new Error('Cannot delete account that has statement imports or statement lines. Please delete all statement data associated with this account first.'));
          return;
        }
        
        if (hasReconciliations || hasReconciliationMatches) {
          callback(new Error('Cannot delete account that has reconciliation sessions or matches. Please delete all reconciliation data associated with this account first.'));
          return;
        }
        
        // Delete related records that have CASCADE (these will be auto-deleted, but we'll do it explicitly for clarity)
        // BalanceAdjustments and account_field_mappings have CASCADE, but we'll delete them explicitly
        // Delete BalanceAdjustments first
        db.run('DELETE FROM BalanceAdjustments WHERE account_id = ? AND user_id = ?', [accountId, userId], (err1) => {
          if (err1) {
            return callback(err1);
          }
          
          // Delete account_field_mappings
          db.run('DELETE FROM account_field_mappings WHERE account_id = ? AND user_id = ?', [accountId, userId], (err2) => {
            if (err2) {
              return callback(err2);
            }
            
            // Now delete the account
            const deleteSql = 'DELETE FROM Accounts WHERE account_id = ? AND user_id = ?';
            db.run(deleteSql, [accountId, userId], function(deleteErr) {
              if (deleteErr) {
                // Check if it's a foreign key constraint error
                if (deleteErr.message && (deleteErr.message.includes('FOREIGN KEY') || deleteErr.message.includes('constraint'))) {
                  callback(new Error('Cannot delete account due to foreign key constraints. Please ensure all related records (transactions, statements, reconciliations) are deleted first.'));
                } else {
                  callback(deleteErr);
                }
              } else {
                callback(null, { changes: this.changes });
              }
            });
          });
        });
      });
    });
  },

  /**
   * Update account balance by adding/subtracting an amount
   * @param {string} accountId - The unique identifier of the account
   * @param {number} amount - Amount to add to the current balance (can be negative)
   * @param {Function} callback - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing changes count
   * @returns {void}
   * @deprecated Use recalculateAccountBalanceFromOldest instead for accurate balance calculation
   */
  updateAccountBalance: (accountId, amount, callback) => {
    const sql = `
      UPDATE Accounts 
      SET current_balance = current_balance + ?, 
          last_balance_update = datetime('now')
      WHERE account_id = ?
    `;
    // Fetch current balance before update for logging
    db.get('SELECT current_balance FROM Accounts WHERE account_id = ?', [accountId], (preErr, row) => {
      const beforeBalance = row ? row.current_balance : null;
      db.run(sql, [amount, accountId], function(err) {
      if (err) {
        callback(err);
      } else {
          // Balance update completed
        callback(null, { changes: this.changes });
      }
      });
    });
  },

  /**
   * Update account balance based on opening balance + sum of all transactions
   * Simple calculation: current_balance = opening_balance + sum_of_all_transactions
   * Opening balance is the balance set at account creation - NEVER recalculated or changed
   * 
   * @param {string} accountId - The unique identifier of the account
   * @param {Function} callback - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing newBalance and changes count
   * @returns {void}
   */
  updateAccountBalanceFromTransactions: (accountId, callback) => {
    // Handle optional callback parameter
    if (typeof callback !== 'function') {
      callback = () => {};
    }

    // Get account opening balance
    const getAccountSql = `
      SELECT 
        opening_balance,
        current_balance
      FROM Accounts
      WHERE account_id = ?
    `;

    db.get(getAccountSql, [accountId], (accErr, accountRow) => {
      if (accErr) {
        return callback(accErr);
      }

      if (!accountRow) {
        return callback(new Error('Account not found'));
      }

      // Opening balance is stored separately - NEVER changes after account creation
      const openingBalance = parseMoney(accountRow.opening_balance ?? accountRow.current_balance ?? 0) || 0;

      // Get sum of all transactions
      const getTransactionsSql = `
        SELECT COALESCE(SUM(signed_amount), 0) as total
        FROM Transactions
        WHERE account_id = ?
      `;

      db.get(getTransactionsSql, [accountId], (txErr, txRow) => {
        if (txErr) {
          return callback(txErr);
        }

        const allTransactionsSum = parseMoney(txRow?.total || 0) || 0;

        // SIMPLE CALCULATION: current_balance = opening_balance + sum_of_all_transactions
        // Use precise decimal arithmetic to avoid rounding errors
        const newBalance = addMoney(openingBalance, allTransactionsSum);
        
        // Update ONLY current_balance - NEVER change opening_balance
        const updateSql = `
          UPDATE Accounts 
          SET current_balance = ?
          WHERE account_id = ?
        `;
        
        db.run(updateSql, [newBalance, accountId], function(updateErr) {
          if (updateErr) {
            return callback(updateErr);
          }
          
          callback(null, {
            changes: this.changes,
            newBalance: newBalance,
            openingBalance: openingBalance,
            transactionsSum: allTransactionsSum
          });
        });
      });
    });
  },


  /**
   * Get account balance for a specific period or overall
   * @param {string} accountId - The unique identifier of the account
   * @param {Object} [options={}] - Options for balance calculation
   * @param {string} [options.periodStart] - Start date for period balance (ISO string)
   * @param {string} [options.periodEnd] - End date for period balance (ISO string)
   * @param {Function} callback - Callback function with signature (err, balance)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.balance - Balance object containing account and balance information
   * @returns {void}
   */
  getAccountBalance: (accountId, options = {}, callback) => {
    // Handle callback as second parameter if options not provided
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    let sql;
    let params = [accountId];

    if (options.periodStart && options.periodEnd) {
      // Get balance for a custom period
      sql = `
        SELECT 
          a.account_id,
          a.account_name,
          a.current_balance,
          COALESCE(SUM(CASE WHEN t.transaction_date <= ? 
                           THEN t.signed_amount ELSE 0 END), 0) as period_balance,
          COALESCE(SUM(CASE WHEN t.transaction_date >= ? AND t.transaction_date <= ? 
                           THEN t.signed_amount ELSE 0 END), 0) as period_activity
        FROM Accounts a
        LEFT JOIN Transactions t ON a.account_id = t.account_id
        WHERE a.account_id = ?
        GROUP BY a.account_id, a.account_name, a.current_balance
      `;
      params = [options.periodEnd, options.periodStart, options.periodEnd, accountId];
    } else {
      // Get overall current balance (existing behavior)
      sql = `
        SELECT 
          a.account_id,
          a.account_name,
          a.current_balance,
          a.last_balance_update,
          COALESCE(SUM(t.signed_amount), 0) as calculated_balance,
          COUNT(t.transaction_id) as transaction_count
        FROM Accounts a
        LEFT JOIN Transactions t ON a.account_id = t.account_id
        WHERE a.account_id = ?
        GROUP BY a.account_id, a.account_name, a.current_balance, a.last_balance_update
      `;
    }

    db.get(sql, params, (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  /**
   * Process the balance recalculation queue
   * Processes all accounts in the queue that need balance recalculation
   * @param {Function} callback - Callback function with signature (err, result)
   * @param {Error|null} callback.err - Error object if operation fails
   * @param {Object} callback.result - Result object containing processed count
   * @returns {void}
   */
  processBalanceRecalcQueue: (callback) => {
    // Get all unprocessed accounts from the queue
    const getQueueSql = `
      SELECT DISTINCT account_id, MAX(transaction_date) as latest_transaction_date
      FROM account_balance_recalc_queue
      WHERE processed = 0
      GROUP BY account_id
    `;

    db.all(getQueueSql, [], (err, queueItems) => {
      if (err) {
        return callback(err);
      }

      if (!queueItems || queueItems.length === 0) {
        return callback(null, { processed: 0 });
      }

      let processedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process each account in the queue
      const processNext = (index) => {
        if (index >= queueItems.length) {
          // All done - mark all as processed
          const markProcessedSql = `
            UPDATE account_balance_recalc_queue
            SET processed = 1
            WHERE account_id IN (${queueItems.map(() => '?').join(',')})
          `;
          const accountIds = queueItems.map(item => item.account_id);
          
          db.run(markProcessedSql, accountIds, (markErr) => {
            if (markErr) {
              return callback(markErr);
            }
            callback(null, { 
              processed: processedCount, 
              errors: errorCount,
              errorDetails: errors.length > 0 ? errors : undefined
            });
          });
          return;
        }

        const item = queueItems[index];
        const accountId = item.account_id;
        const { getCurrentTimestamp } = require('../utils/dateUtils');
        const latestDate = item.latest_transaction_date || getCurrentTimestamp();

        // Update balance for this account: opening_balance + sum_of_transactions
        accountDAO.updateAccountBalanceFromTransactions(accountId, (recalcErr, result) => {
          if (recalcErr) {
            errorCount++;
            errors.push({ accountId, error: recalcErr.message });
          } else {
            processedCount++;
          }
          
          // Process next item
          processNext(index + 1);
        });
      };

      // Start processing
      processNext(0);
    });
  },

  /**
   * Process balance recalculation for a specific account from the queue
   * @param {string} accountId - The account ID to process
   * @param {Function} callback - Callback function with signature (err, result)
   * @returns {void}
   */
  processAccountFromQueue: (accountId, callback) => {
    // Get the latest transaction date for this account from the queue
    const getQueueItemSql = `
      SELECT MAX(transaction_date) as latest_transaction_date
      FROM account_balance_recalc_queue
      WHERE account_id = ? AND processed = 0
    `;

    db.get(getQueueItemSql, [accountId], (err, item) => {
      if (err) {
        return callback(err);
      }

      if (!item) {
        // Not in queue or already processed
        return callback(null, { processed: false });
      }

      const { getCurrentTimestamp } = require('../utils/dateUtils');
      const latestDate = item.latest_transaction_date || getCurrentTimestamp();

      // Update balance: opening_balance + sum_of_transactions
      accountDAO.updateAccountBalanceFromTransactions(accountId, (recalcErr, result) => {
        if (recalcErr) {
          return callback(recalcErr);
        }

        // Mark as processed
        const markProcessedSql = `
          UPDATE account_balance_recalc_queue
          SET processed = 1
          WHERE account_id = ?
        `;

        db.run(markProcessedSql, [accountId], (markErr) => {
          if (markErr) {
            return callback(markErr);
          }
          callback(null, { processed: true, result });
        });
      });
    });
  },

  /**
   * Get comprehensive account details including transactions, reconciliations, imports, etc.
   * @param {string} accountId - The account ID
   * @param {string} userId - The user ID
   * @param {Function} callback - Callback function
   */
  getAccountDetails: (accountId, userId, callback) => {
    if (!userId) {
      return callback(new Error('User ID is required'));
    }

    // First get the account
    accountDAO.getAccountById(accountId, userId, (err, account) => {
      if (err) {
        return callback(err);
      }
      if (!account) {
        return callback(null, null);
      }

      // Get all related data in parallel
      const results = {
        account: account,
        transactions: [],
        reconciliations: [],
        statementImports: [],
        transactionImports: [],
        balanceAdjustments: [],
        fieldMappings: []
      };

      let completed = 0;
      const total = 6;
      let hasError = false;

      const checkComplete = () => {
        completed++;
        if (completed === total && !hasError) {
          callback(null, results);
        }
      };

      const handleError = (err) => {
        if (!hasError) {
          hasError = true;
          callback(err);
        }
      };

      // 1. Get transactions
      const transactionsSql = `
        SELECT t.*, c.category_name
        FROM Transactions t
        LEFT JOIN Categories c ON t.category_id = c.category_id
        WHERE t.account_id = ? AND t.user_id = ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `;
      db.all(transactionsSql, [accountId, userId], (err, transactions) => {
        if (err) return handleError(err);
        results.transactions = transactions || [];
        checkComplete();
      });

      // 2. Get reconciliation sessions
      const reconciliationsSql = `
        SELECT 
          rs.*,
          COUNT(rm.match_id) as match_count,
          COALESCE(SUM(CASE WHEN rm.active = 1 THEN 1 ELSE 0 END), 0) as active_match_count
        FROM ReconciliationSessions rs
        LEFT JOIN ReconciliationMatches rm ON rs.session_id = rm.session_id
        WHERE rs.account_id = ? AND rs.user_id = ?
        GROUP BY rs.session_id
        ORDER BY rs.run_started DESC
      `;
      db.all(reconciliationsSql, [accountId, userId], (err, reconciliations) => {
        if (err) return handleError(err);
        results.reconciliations = reconciliations || [];
        checkComplete();
      });

      // 3. Get statement imports
      const statementImportsSql = `
        SELECT 
          si.*,
          COUNT(sl.statement_line_id) as line_count
        FROM StatementImports si
        LEFT JOIN StatementLines sl ON si.import_id = sl.import_id
        WHERE si.account_id = ? AND si.user_id = ?
        GROUP BY si.import_id
        ORDER BY si.created_at DESC
      `;
      db.all(statementImportsSql, [accountId, userId], (err, statementImports) => {
        if (err) return handleError(err);
        results.statementImports = statementImports || [];
        checkComplete();
      });

      // 4. Get transaction imports (from transaction_imports table)
      const transactionImportsSql = `
        SELECT DISTINCT ti.*
        FROM transaction_imports ti
        JOIN Transactions t ON t.import_id = ti.id
        WHERE t.account_id = ? AND t.user_id = ?
        ORDER BY ti.created_at DESC
      `;
      db.all(transactionImportsSql, [accountId, userId], (err, transactionImports) => {
        if (err) return handleError(err);
        results.transactionImports = transactionImports || [];
        checkComplete();
      });

      // 5. Get balance adjustments from BalanceAdjustments table
      accountDAO.getBalanceAdjustments(accountId, userId, (adjErr, adjustments) => {
        if (adjErr) {
          // If error, just skip balance adjustments
          results.balanceAdjustments = [];
          checkComplete();
        } else {
          results.balanceAdjustments = adjustments || [];
          checkComplete();
        }
      });

      // 6. Get account field mappings
      const accountFieldMappingDAO = require('./account_field_mapping_dao');
      accountFieldMappingDAO.getMappingsByAccountId(accountId, userId, (err, mappings) => {
        if (err) return handleError(err);
        results.fieldMappings = mappings || [];
        checkComplete();
      });
    });
  },

  /**
   * Create a balance adjustment record
   * @param {Object} adjustment - Adjustment object
   * @param {string} adjustment.adjustment_id - Unique adjustment ID
   * @param {string} adjustment.account_id - Account ID
   * @param {string} adjustment.user_id - User ID
   * @param {number} adjustment.adjustment_amount - Amount of adjustment
   * @param {string} adjustment.adjustment_date - Date of adjustment (YYYY-MM-DD)
   * @param {string} adjustment.adjustment_reason - Reason for adjustment
   * @param {number} adjustment.balance_before - Balance before adjustment
   * @param {number} adjustment.balance_after - Balance after adjustment
   * @param {Function} callback - Callback function with signature (err, result)
   * @returns {void}
   */
  createBalanceAdjustment: (adjustment, callback) => {
    const sql = `
      INSERT INTO BalanceAdjustments (
        adjustment_id, account_id, user_id, adjustment_amount, adjustment_date,
        adjustment_reason, balance_before, balance_after, created_at, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `;
    
    const params = [
      adjustment.adjustment_id,
      adjustment.account_id,
      adjustment.user_id,
      adjustment.adjustment_amount,
      adjustment.adjustment_date,
      adjustment.adjustment_reason || null,
      adjustment.balance_before,
      adjustment.balance_after,
      adjustment.created_by_user_id || adjustment.user_id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, { adjustment_id: adjustment.adjustment_id });
    });
  },

  /**
   * Get balance adjustments for an account
   * @param {string} accountId - Account ID
   * @param {string} userId - User ID for security
   * @param {Function} callback - Callback function with signature (err, adjustments)
   * @returns {void}
   */
  getBalanceAdjustments: (accountId, userId, callback) => {
    const sql = `
      SELECT *
      FROM BalanceAdjustments
      WHERE account_id = ? AND user_id = ?
      ORDER BY adjustment_date DESC, created_at DESC
    `;
    
    db.all(sql, [accountId, userId], (err, rows) => {
      if (err) {
        return callback(err);
      }
      callback(null, rows || []);
    });
  },

  /**
   * Delete a balance adjustment
   * @param {string} adjustmentId - Adjustment ID
   * @param {string} userId - User ID for security
   * @param {Function} callback - Callback function with signature (err, result)
   * @returns {void}
   */
  deleteBalanceAdjustment: (adjustmentId, userId, callback) => {
    // First get the adjustment to verify ownership and get account_id
    const getSql = `
      SELECT adjustment_id, account_id, adjustment_amount
      FROM BalanceAdjustments
      WHERE adjustment_id = ? AND user_id = ?
    `;
    
    db.get(getSql, [adjustmentId, userId], (err, adjustment) => {
      if (err) {
        return callback(err);
      }
      
      if (!adjustment) {
        return callback(new Error('Balance adjustment not found or access denied'));
      }
      
      // Delete the adjustment
      const deleteSql = `
        DELETE FROM BalanceAdjustments
        WHERE adjustment_id = ? AND user_id = ?
      `;
      
      db.run(deleteSql, [adjustmentId, userId], function(deleteErr) {
        if (deleteErr) {
          return callback(deleteErr);
        }
        
        // Update account balance by subtracting the adjustment amount
        // (reverse the adjustment)
        const reverseAmount = roundMoney(-parseMoney(adjustment.adjustment_amount) || 0);
        accountDAO.updateAccountBalance(adjustment.account_id, reverseAmount, (balanceErr) => {
          if (balanceErr) {
            // Log error but don't fail deletion - adjustment is already deleted
            console.error('Failed to reverse account balance after deleting adjustment:', balanceErr);
          }
          callback(null, { 
            changes: this.changes,
            adjustment_id: adjustmentId,
            reversed_amount: reverseAmount
          });
        });
      });
    });
  },


};

module.exports = accountDAO; 