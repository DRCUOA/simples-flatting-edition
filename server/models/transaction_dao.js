const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');
const accountDAO = require('./account_dao');
const calculateSignedAmount = require('../utils/calculateSignedAmount');

const db = getConnection();

// In-memory CSV data storage
let csvData = {
  headers: [],
  records: []
};

// Transaction DAO
const { normalizeAppDate, compareDomainDates, maxDomainDate, getToday } = require('../utils/dateUtils');
const transactionDAO = {
  // CSV Data Management
  setCSVData: (headers, records) => {
    csvData = { headers, records };
  },

  clearCSVData: () => {
    csvData = { headers: [], records: [] };
  },

  getCSVData: () => csvData,

  // Transaction Import Operations
  createImportRecord: (importId, importDate, callback) => {
    const sql = 'INSERT INTO transaction_imports (id, import_date, status) VALUES (?, ?, ?)';
    db.run(sql, [importId, importDate, 'processing'], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { id: importId, import_date: importDate, status: 'processing' });
      }
    });
  },

  updateImportStatus: (importId, status, errorMessage, callback) => {
    const sql = errorMessage
      ? 'UPDATE transaction_imports SET status = ?, error_message = ? WHERE id = ?'
      : 'UPDATE transaction_imports SET status = ? WHERE id = ?';

    const params = errorMessage
      ? [status, errorMessage, importId]
      : [status, importId];

    db.run(sql, params, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { id: importId, status, error_message: errorMessage });
      }
    });
  },

  importTransactions: (records) => {
    return new Promise((resolve, reject) => {
      if (!records || !Array.isArray(records) || records.length === 0) {
        return reject(new Error('No records to import'));
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let importedCount = 0;
        let errorCount = 0;
        // Track duplicates within this import call to avoid race conditions where the same
        // transaction_id appears multiple times in the provided records (e.g., duplicate lines in CSV)
        const seenTransactionIds = new Set();
        // Track all account_ids that had transactions inserted, so we can recalculate balances at the end
        const affectedAccountIds = new Set();
        // Track the latest transaction date for each account for balance date calculation
        const accountLatestDates = new Map();

        const batchSize = 100;
        const batches = Math.ceil(records.length / batchSize);

        for (let i = 0; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, records.length);
          const batch = records.slice(start, end);

          batch.forEach(record => {
            // Skip duplicates within the current import batch
            if (seenTransactionIds.has(record.transaction_id)) {
              return; // do not attempt to insert or query DB for duplicates in the same batch
            }
            seenTransactionIds.add(record.transaction_id);
            db.get('SELECT transaction_id FROM transactions WHERE transaction_id = ?', [record.transaction_id], (err, row) => {
              if (err) {
                errorCount++;
                return;
              }

              if (row) {
                return;
              }

              // Ensure signed_amount present; compute if missing using account settings
              const ensureSignedAmountThenInsert = () => {
                const stmt = db.prepare(`
                INSERT OR IGNORE INTO transactions (
                  transaction_id, account_id, user_id,
                  transaction_date, posted_date,
                  description, amount, signed_amount, transaction_type, category_id,
                  import_id, created_at, dedupe_hash,
                  statement_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
              `);

                stmt.run(
                  record.transaction_id,
                  record.account_id,
                  record.user_id,
                  record.transaction_date,
                  record.posted_date || record.transaction_date,
                  record.description,
                  record.amount,
                  record.signed_amount,
                  record.transaction_type,
                  record.category_id,
                  record.import_id,
                  record.dedupe_hash || null,
                  record.statement_id || null,
                  function(err) {
                    if (err) {
                      errorCount++;
                      stmt.finalize();
                    } else {
                      // Only track account if a row was actually inserted (changes === 1)
                      if (this.changes && this.changes > 0) {
                        importedCount++;
                        // Track this account for recalculation
                        affectedAccountIds.add(record.account_id);
                        // Track latest transaction date for this account (domain date: YYYY-MM-DD)
                        const txDate = record.transaction_date || getToday();
                        const existingDate = accountLatestDates.get(record.account_id);
                        // Use domain date comparison (lexicographic for YYYY-MM-DD)
                        if (!existingDate || compareDomainDates(txDate, existingDate) > 0) {
                          accountLatestDates.set(record.account_id, txDate);
                        }
                      }
                      stmt.finalize();
                    }
                  }
                );
              };

              if (typeof record.signed_amount === 'number') {
                ensureSignedAmountThenInsert();
              } else {
                accountDAO.getAccountById(record.account_id, (accErr, account) => {
                if (accErr || !account) {
                    errorCount++;
                    return;
                  }
                  record.signed_amount = calculateSignedAmount(account, { amount: record.amount, transaction_type: record.transaction_type });
                  ensureSignedAmountThenInsert();
                });
              }
            });
          });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          // Recalculate balances for all affected accounts
          if (affectedAccountIds.size === 0) {
            return resolve({
              importedCount,
              errorCount
            });
          }

          // Recalculate each affected account
          // Note: Balance recalculation failures should not block the import
          let recalcCount = 0;
          const recalcErrors = [];
          const accountIdsArray = Array.from(affectedAccountIds);

          if (accountIdsArray.length === 0) {
            return resolve({
              importedCount,
              errorCount
            });
          }

          accountIdsArray.forEach((accountId) => {
            if (!accountId) {
              // Skip invalid account IDs
              recalcCount++;
              if (recalcCount === accountIdsArray.length) {
                resolve({
                  importedCount,
                  errorCount
                });
              }
              return;
            }

            const latestDate = accountLatestDates.get(accountId) || getToday();
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
              if (process.env.NODE_ENV !== 'production') {
                console.error(`Balance recalculation timeout for account ${accountId}`);
              }
              recalcCount++;
              if (recalcCount === accountIdsArray.length) {
                resolve({
                  importedCount,
                  errorCount
                });
              }
            }, 30000); // 30 second timeout

            // Update last_imported_transaction_date (monotonic: only if newer)
            accountDAO.updateLastImportedTransactionDate(accountId, latestDate, (dateErr) => {
              if (dateErr) {
                // Log error but don't fail the import
                if (process.env.NODE_ENV !== 'production') {
                  console.error(`Failed to update last_imported_transaction_date for account ${accountId}:`, dateErr);
                }
              }
              
              // Update balance: opening_balance + sum_of_transactions
              accountDAO.updateAccountBalanceFromTransactions(accountId, (balErr, result) => {
                clearTimeout(timeout);
                recalcCount++;
                if (balErr) {
                  // Log error but don't fail the import
                  if (process.env.NODE_ENV !== 'production') {
                    console.error(`Failed to recalculate balance for account ${accountId}:`, balErr);
                  }
                  recalcErrors.push({ accountId, error: balErr.message || String(balErr) });
                } else {
                  // Mark account as processed in queue (triggers will have queued it)
                  // Use a try-catch wrapper since the table might not exist if migration hasn't run
                  try {
                    db.run('UPDATE account_balance_recalc_queue SET processed = 1 WHERE account_id = ?', 
                      [accountId], (err) => {
                        // Ignore errors - queue processing is best effort and table might not exist yet
                        if (err) {
                          // Silently ignore - table might not exist if migration hasn't been run
                        }
                      });
                  } catch (e) {
                    // Ignore - table might not exist
                  }
                }

                // When all recalculations are done
                if (recalcCount === accountIdsArray.length) {
                  // Always resolve - balance recalculation errors are logged but don't fail the import
                  if (recalcErrors.length > 0) {
                    if (process.env.NODE_ENV !== 'production') {
                      console.warn(`Balance recalculation had ${recalcErrors.length} error(s) but import succeeded`);
                    }
                  }
                  resolve({
                    importedCount,
                    errorCount
                  });
                }
              });
            });
          });
        });
      });
    });
  },

  // Get import logs
  getImportLogs: (callback) => {
    const sql = `
      SELECT 
        i.*,
        COUNT(t.transaction_id) as records_imported,
        COALESCE(SUM(t.signed_amount), 0) as total_amount
      FROM transaction_imports i
      LEFT JOIN transactions t ON t.import_id = i.id
      GROUP BY i.id
      ORDER BY i.import_date DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  // Get all transactions for a specific user
  getAllTransactions: (userId, startDate, endDate) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        return reject(new Error('User ID is required'));
      }
      
      let sql = `
        WITH formatted AS (
        SELECT 
          t.*, 
          a.account_name, 
          a.account_type, 
          a.positive_is_credit,
          c.category_name,
          t.transaction_date AS trx_date,
          CASE 
            WHEN rm.match_id IS NOT NULL THEN 1
            ELSE 0
          END as has_reconciliation_match
        FROM transactions AS t
        LEFT JOIN accounts   AS a ON t.account_id  = a.account_id
        LEFT JOIN categories AS c ON t.category_id = c.category_id
        LEFT JOIN ReconciliationMatches rm ON t.transaction_id = rm.transaction_id 
          AND rm.user_id = t.user_id 
          AND rm.active = 1
        WHERE t.user_id = ?
        )
        SELECT *
        FROM formatted
        WHERE 1=1
      `;

      const params = [userId];

      // Use string comparison for dates (both are YYYY-MM-DD format)
      // This avoids timezone issues with DATE() function
      if (startDate) {
        sql += ` AND trx_date >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        sql += ` AND trx_date <= ?`;
        params.push(endDate);
      }

      sql += ` ORDER BY trx_date DESC`;

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  // Delete a transaction (user-scoped)
  deleteTransaction: (id, userId, callback) => {
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    // First get the transaction to know which account to recalculate
    const getSql = 'SELECT account_id, transaction_date FROM transactions WHERE transaction_id = ? AND user_id = ?';
    db.get(getSql, [id, userId], (getErr, transaction) => {
      if (getErr) {
        return callback(getErr);
      }
      
      if (!transaction) {
        return callback(new Error('Transaction not found'));
      }
      
      const accountId = transaction.account_id;
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      const transactionDate = transaction.transaction_date || getCurrentTimestamp();
      
      // Delete reconciliation matches first (foreign key constraint)
      db.run('DELETE FROM ReconciliationMatches WHERE transaction_id = ? AND user_id = ?', [id, userId], (matchesErr) => {
        if (matchesErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error deleting reconciliation matches:', matchesErr);
          }
          // Continue anyway - matches might not exist
        }
        
        // Delete the transaction
        const sql = 'DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?';
        db.run(sql, [id, userId], (err) => {
          if (err) {
            return callback(err);
          }
        
        // Update account balance: opening_balance + sum_of_transactions
        accountDAO.updateAccountBalanceFromTransactions(accountId, (balErr, result) => {
          if (balErr) {
            return callback(balErr);
          }
          // Mark account as processed in queue (triggers will have queued it)
          try {
            db.run('UPDATE account_balance_recalc_queue SET processed = 1 WHERE account_id = ?', 
              [accountId], (err) => {
                // Ignore errors - queue processing is best effort and table might not exist yet
                callback(null);
              });
          } catch (e) {
            // Ignore - table might not exist, callback anyway
            callback(null);
          }
        });
        });
      });
    });
  },

  // Batch delete transactions (user-scoped)
  batchDeleteTransactions: (transactionIds, userId, deleteMatches, callback) => {
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return callback(new Error('Invalid transaction IDs provided'));
    }

    try {
      const placeholders = transactionIds.map(() => '?').join(',');
      
      // Check for reconciliation matches first
      const checkMatchesSql = `SELECT COUNT(*) as count FROM ReconciliationMatches WHERE transaction_id IN (${placeholders}) AND user_id = ? AND active = 1`;
      db.get(checkMatchesSql, [...transactionIds, userId], (checkErr, matchResult) => {
        if (checkErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error checking reconciliation matches:', checkErr);
          }
          return callback(checkErr);
        }
        
        const hasMatches = matchResult && matchResult.count > 0;
        
        // If matches exist and user hasn't confirmed deletion, return error
        if (hasMatches && !deleteMatches) {
          return callback(new Error('RECONCILIATION_MATCHES_EXIST'));
        }
        
        // If matches exist and user confirmed, delete them first
        if (hasMatches && deleteMatches) {
          const deleteMatchesSql = `DELETE FROM ReconciliationMatches WHERE transaction_id IN (${placeholders}) AND user_id = ?`;
          db.run(deleteMatchesSql, [...transactionIds, userId], (matchesErr) => {
            if (matchesErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('Error deleting reconciliation matches:', matchesErr);
              }
              return callback(matchesErr);
            }
            proceedWithDelete();
          });
        } else {
          proceedWithDelete();
        }
        
        function proceedWithDelete() {
          // First get the transactions to know which accounts to recalculate
          const getSql = `SELECT DISTINCT account_id, MAX(transaction_date) as latest_date FROM transactions WHERE transaction_id IN (${placeholders}) AND user_id = ? GROUP BY account_id`;
          
          db.all(getSql, [...transactionIds, userId], (getErr, transactions) => {
            if (getErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('Error fetching transactions for batch delete:', getErr);
              }
              return callback(getErr);
            }
            
            // Delete the transactions
            const deleteSql = `DELETE FROM transactions WHERE transaction_id IN (${placeholders}) AND user_id = ?`;
            db.run(deleteSql, [...transactionIds, userId], function(err) {
              if (err) {
                if (process.env.NODE_ENV !== 'production') {
                  console.error('Error deleting transactions:', err);
                }
                return callback(err);
              }
          
          // Capture the number of deleted rows before entering nested callbacks
          const deletedCount = this.changes;
          
          // Recalculate balances for all affected accounts
          if (!transactions || transactions.length === 0) {
            return callback(null, { deletedCount });
          }
          
          let recalcCount = 0;
          const recalcErrors = [];
          const { getCurrentTimestamp } = require('../utils/dateUtils');
          const defaultTimestamp = getCurrentTimestamp();
          
          transactions.forEach((transaction) => {
            const accountId = transaction.account_id;
            if (!accountId) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('Transaction missing account_id:', transaction);
              }
              recalcCount++;
              if (recalcCount === transactions.length) {
                callback(null, { deletedCount });
              }
              return;
            }
            
            accountDAO.updateAccountBalanceFromTransactions(accountId, (balErr, result) => {
              recalcCount++;
              if (balErr) {
                if (process.env.NODE_ENV !== 'production') {
                  console.error(`Error recalculating balance for account ${accountId}:`, balErr);
                }
                recalcErrors.push({ accountId, error: balErr });
              } else {
                // Mark account as processed in queue (triggers will have queued it)
                try {
                  db.run('UPDATE account_balance_recalc_queue SET processed = 1 WHERE account_id = ?', 
                    [accountId], (err) => {
                      // Ignore errors - queue processing is best effort and table might not exist yet
                    });
                } catch (e) {
                  // Ignore - table might not exist
                }
              }
              
              // When all recalculations are done
              if (recalcCount === transactions.length) {
                if (recalcErrors.length > 0) {
                  const errorMsg = `Failed to recalculate balances: ${recalcErrors.map(e => e.accountId + ': ' + (e.error?.message || String(e.error))).join(', ')}`;
                  if (process.env.NODE_ENV !== 'production') {
                    console.error('Balance recalculation errors:', recalcErrors);
                  }
                  return callback(new Error(errorMsg));
                }
                callback(null, { deletedCount });
              }
            });
          });
            });
          });
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unexpected error in batchDeleteTransactions:', error);
      }
      return callback(error);
    }
  },

  // Create a new transaction
  createTransaction: (transaction, userId) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        return reject(new Error('User ID is required'));
      }
      
      const transactionId = transaction.transaction_id || uuidv4();

      // Verify account belongs to user first
      accountDAO.getAccountById(transaction.account_id, (accErr, account) => {
        if (accErr) return reject(accErr);
        if (!account) return reject(new Error('Account not found'));
        if (account.user_id !== userId) {
          return reject(new Error('Access denied: Account does not belong to user'));
        }

        const insert = (signedAmount) => {
          const sql = `
            INSERT INTO transactions (
              transaction_id, transaction_date, description, amount, 
              signed_amount, account_id, user_id, category_id, transaction_type, import_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const params = [
            transactionId,
            transaction.transaction_date,
            transaction.description || '',
            transaction.amount,
            signedAmount,
            transaction.account_id,
            userId,
            transaction.category_id || null,
            transaction.transaction_type,
            transaction.import_id || 'default',
            transaction.created_at || require('../utils/dateUtils').getCurrentTimestamp()
          ];

          db.run(sql, params, function(err) {
            if (err) {
              reject(err);
            } else {
              // Update account balance: opening_balance + sum_of_transactions
              accountDAO.updateAccountBalanceFromTransactions(transaction.account_id, (balErr, result) => {
                if (balErr) return reject(balErr);
                // Mark account as processed in queue (triggers will have queued it)
                try {
                  db.run('UPDATE account_balance_recalc_queue SET processed = 1 WHERE account_id = ?', 
                    [transaction.account_id], (err) => {
                      // Ignore errors - queue processing is best effort and table might not exist yet
                      resolve(transactionId);
                    });
                } catch (e) {
                  // Ignore - table might not exist, resolve anyway
                  resolve(transactionId);
                }
              });
            }
          });
        };

        if (typeof transaction.signed_amount === 'number') {
          insert(transaction.signed_amount);
        } else {
          const signedAmount = calculateSignedAmount(account, transaction);
          insert(signedAmount);
        }
      });
    });
  },

  // Get transaction by ID for a specific user
  getTransactionById: (id, userId) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        return reject(new Error('User ID is required'));
      }
      
      const sql = 'SELECT * FROM transactions WHERE transaction_id = ? AND user_id = ?';
        db.get(sql, [id, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },

  // Update transaction
  updateTransaction: (id, transaction, userId) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        return reject(new Error('User ID is required'));
      }
      
      // First, fetch existing transaction to calculate balance delta and detect account change
      const selectSql = 'SELECT * FROM transactions WHERE transaction_id = ? AND user_id = ?';
        db.get(selectSql, [id, userId], (selErr, existing) => {
        if (selErr) {
          return reject(selErr);
        }
        if (!existing) {
          return reject(new Error('Transaction not found or access denied'));
        }

        // Helper to perform update and balance adjustments
        const performUpdate = (newSignedAmount) => {
          // Normalize transaction_date to YYYY-MM-DD format (domain date)
          let normalizedDate = existing.transaction_date;
          if (transaction.transaction_date) {
            const normalized = normalizeAppDate(transaction.transaction_date, 'api-domain');
            if (normalized.parsed) {
              normalizedDate = normalized.parsed;
            } else {
              // Fallback: try to use as-is if it's already YYYY-MM-DD
              normalizedDate = transaction.transaction_date;
            }
          }
          
          const sql = `
            UPDATE transactions
            SET transaction_date = ?, description = ?, amount = ?, signed_amount = ?,
                account_id = ?, category_id = ?, transaction_type = ?, import_id = ?, created_at = ?
            WHERE transaction_id = ? AND user_id = ?
          `;
          const params = [
            normalizedDate,
            transaction.description != null ? transaction.description : existing.description,
            transaction.amount != null ? transaction.amount : existing.amount,
            newSignedAmount,
            transaction.account_id || existing.account_id,
            transaction.category_id != null ? transaction.category_id : existing.category_id,
            transaction.transaction_type || existing.transaction_type,
            transaction.import_id || existing.import_id,
            existing.created_at,
            id,
            userId
          ];

            db.run(sql, params, function(updErr) {
            if (updErr) {
              return reject(updErr);
            }

            const changes = this.changes;

            // Recalculate account balances from oldest opening balance
            const oldAccountId = existing.account_id;
            const newAccountId = transaction.account_id || existing.account_id;
            const transactionDate = transaction.transaction_date || existing.transaction_date;
            
            // Recalculate both accounts if account changed, otherwise just the one account
            const accountsToRecalculate = oldAccountId === newAccountId 
              ? [newAccountId] 
              : [oldAccountId, newAccountId];
            
            let recalcCount = 0;
            const recalcErrors = [];
            
            accountsToRecalculate.forEach((accountId, index) => {
              accountDAO.updateAccountBalanceFromTransactions(accountId, (balErr, result) => {
                recalcCount++;
                if (balErr) {
                  recalcErrors.push({ accountId, error: balErr });
                } else {
                  // Mark account as processed in queue (triggers will have queued it)
                  db.run('UPDATE account_balance_recalc_queue SET processed = 1 WHERE account_id = ?', 
                    [accountId], () => {
                      // Ignore errors - queue processing is best effort
                    });
                }
                
                // When all recalculations are done
                if (recalcCount === accountsToRecalculate.length) {
                  if (recalcErrors.length > 0) {
                    return reject(new Error(`Failed to recalculate balances: ${recalcErrors.map(e => e.error.message).join(', ')}`));
                  }
                  resolve({ changes: changes });
                }
              });
            });
          });
        };

        if (typeof transaction.signed_amount === 'number') {
          performUpdate(transaction.signed_amount);
        } else {
          const targetAccountId = transaction.account_id || existing.account_id;
          if (!targetAccountId) {
            return reject(new Error('Account ID is required'));
          }
          accountDAO.getAccountById(targetAccountId, (accErr, account) => {
            if (accErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[updateTransaction] Error fetching account:', accErr);
              }
              return reject(accErr);
            }
            if (!account) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[updateTransaction] Account not found:', targetAccountId);
              }
              return reject(new Error('Account not found'));
            }
            const basis = {
              amount: transaction.amount != null ? transaction.amount : existing.amount,
              transaction_type: transaction.transaction_type || existing.transaction_type
            };
            if (!basis.amount || !basis.transaction_type) {
              return reject(new Error('Amount and transaction_type are required'));
            }
            const newSigned = calculateSignedAmount(account, basis);
            performUpdate(newSigned);
          });
        }
      });
    });
  },

  // Find category matches based on transaction description and amount patterns
  // Now includes feedback weighting for improved accuracy
  // Priority: 1. Keyword rules (exact matches), 2. Historical patterns, 3. Feedback weighting
  findCategoryMatches: (userId, description, amount) => {
    return new Promise((resolve, reject) => {
      if (!userId || !description) {
        return resolve([]);
      }

      const descriptionLower = description.toLowerCase().trim();
      const amountAbs = Math.abs(parseFloat(amount) || 0);

      // First, check for keyword rules (highest priority)
      const keywordRulesDAO = require('./keyword_rules_dao');
      keywordRulesDAO.findMatchingCategory(userId, description, (keywordErr, keywordMatch) => {
        if (keywordErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error checking keyword rules:', keywordErr);
          }
          // Continue with historical matching if keyword check fails
        }

        // If keyword rule matches, return it with high confidence
        if (keywordMatch && keywordMatch.category_id) {
          return resolve([{
            category_id: keywordMatch.category_id,
            category_name: keywordMatch.category_name,
            match_count: 1,
            confidence: 0.99, // Very high confidence for explicit rules
            amount_diff: 0,
            source: 'keyword_rule',
            keyword: keywordMatch.keyword
          }]);
        }

        // No keyword match found, continue with historical transaction matching
        // Extract key words from description (remove common words and improve extraction)
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'debit', 'credit', 'card', 'payment', 'purchase', 'transaction'];
      const words = descriptionLower
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 2 && !commonWords.includes(w))
        .slice(0, 5); // Limit to top 5 words to avoid too many LIKE conditions
      
      // Build query to find similar transactions
      // Strategy: Look for transactions with similar descriptions and amounts
      // Improved: Use better matching with word order consideration
      let sql = `
        SELECT 
          t.category_id,
          c.category_name,
          COUNT(*) as match_count,
          AVG(ABS(ABS(t.signed_amount) - ?)) as amount_diff,
          GROUP_CONCAT(DISTINCT t.description) as sample_descriptions,
          -- Calculate recency weight (more recent transactions weighted higher)
          AVG(CASE 
            WHEN julianday('now') - julianday(t.transaction_date) < 30 THEN 1.2
            WHEN julianday('now') - julianday(t.transaction_date) < 90 THEN 1.0
            WHEN julianday('now') - julianday(t.transaction_date) < 180 THEN 0.8
            ELSE 0.6
          END) as recency_weight,
          -- Calculate amount similarity (closer amounts = higher weight)
          AVG(CASE 
            WHEN ABS(ABS(t.signed_amount) - ?) < 1 THEN 1.2
            WHEN ABS(ABS(t.signed_amount) - ?) < 5 THEN 1.0
            WHEN ABS(ABS(t.signed_amount) - ?) < 10 THEN 0.8
            ELSE 0.6
          END) as amount_weight
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = ? 
          AND t.category_id IS NOT NULL
          AND (
      `;
      
      const params = [amountAbs, amountAbs, amountAbs, amountAbs, userId];
      
      // Add LIKE conditions for each significant word
      const likeConditions = [];
      words.forEach((word, index) => {
        likeConditions.push(`LOWER(t.description) LIKE ?`);
        params.push(`%${word}%`);
      });
      
      // Also try exact description match
      likeConditions.push(`LOWER(t.description) = ?`);
      params.push(descriptionLower);
      
      // Also try partial description match (first 10 chars)
      if (descriptionLower.length > 10) {
        likeConditions.push(`LOWER(t.description) LIKE ?`);
        params.push(`${descriptionLower.substring(0, 10)}%`);
      }
      
      sql += likeConditions.join(' OR ');
      sql += `
          )
        GROUP BY t.category_id, c.category_name
        HAVING match_count > 0
        ORDER BY match_count DESC, amount_diff ASC
        LIMIT 10
      `;
      
      db.all(sql, params, async (err, rows) => {
        if (err) {
          return reject(err);
        }
        
        // Load feedback to weight the results
        const feedbackDAO = require('./category_matching_feedback_dao');
        const feedbackResults = await new Promise((resolveFeedback) => {
          feedbackDAO.getFeedbackForSimilar(userId, description, amount, (fbErr, feedback) => {
            if (fbErr) {
              resolveFeedback([]);
            } else {
              resolveFeedback(feedback || []);
            }
          });
        });
        
        // Create feedback lookup map
        const feedbackMap = {};
        feedbackResults.forEach(fb => {
          // Map for accepted suggestions (suggested == actual)
          if (fb.suggested_category_id === fb.actual_category_id) {
            const key = `accepted_${fb.actual_category_id}`;
            if (!feedbackMap[key]) {
              feedbackMap[key] = {
                acceptance_rate: fb.acceptance_rate || 0,
                feedback_count: fb.feedback_count || 0
              };
            }
          } else {
            // Map for rejected suggestions (suggested != actual)
            const rejectKey = `rejected_${fb.suggested_category_id}`;
            if (!feedbackMap[rejectKey]) {
              feedbackMap[rejectKey] = {
                acceptance_rate: fb.acceptance_rate || 0,
                feedback_count: fb.feedback_count || 0
              };
            }
            // Also track what category was actually selected instead
            const altKey = `alternative_${fb.actual_category_id}`;
            if (!feedbackMap[altKey]) {
              feedbackMap[altKey] = {
                acceptance_rate: 1.0, // This category was chosen instead
                feedback_count: fb.feedback_count || 0
              };
            }
          }
        });
        
        // Calculate confidence scores with feedback weighting
        const totalMatches = rows.reduce((sum, row) => sum + row.match_count, 0);
        const results = rows.map(row => {
          let baseConfidence = totalMatches > 0 
            ? Math.min(0.95, row.match_count / Math.max(1, totalMatches / 2))
            : 0.5;
          
          // Apply recency weighting
          baseConfidence *= (row.recency_weight || 1.0);
          
          // Apply amount similarity weighting
          baseConfidence *= (row.amount_weight || 1.0);
          
          // Apply feedback weighting if available
          const acceptedKey = `accepted_${row.category_id}`;
          const rejectedKey = `rejected_${row.category_id}`;
          const alternativeKey = `alternative_${row.category_id}`;
          
          if (feedbackMap[acceptedKey]) {
            // This category was frequently accepted - boost confidence
            const acceptanceRate = feedbackMap[acceptedKey].acceptance_rate;
            const feedbackCount = feedbackMap[acceptedKey].feedback_count;
            const feedbackWeight = Math.min(1.0, feedbackCount / 5);
            const boost = 1.0 + (acceptanceRate * 0.3); // Up to 30% boost
            baseConfidence = baseConfidence * (1 - feedbackWeight) + (baseConfidence * boost * feedbackWeight);
          } else if (feedbackMap[rejectedKey]) {
            // This category was frequently rejected - reduce confidence
            const rejectionRate = 1 - (feedbackMap[rejectedKey].acceptance_rate || 0);
            const feedbackCount = feedbackMap[rejectedKey].feedback_count;
            const feedbackWeight = Math.min(1.0, feedbackCount / 3);
            baseConfidence *= (1 - (rejectionRate * 0.5 * feedbackWeight)); // Up to 50% reduction
          }
          
          // Boost if this was an alternative choice
          if (feedbackMap[alternativeKey]) {
            const altCount = feedbackMap[alternativeKey].feedback_count;
            const altWeight = Math.min(0.2, altCount / 10); // Small boost up to 20%
            baseConfidence *= (1 + altWeight);
          }
          
          return {
            category_id: row.category_id,
            category_name: row.category_name,
            match_count: row.match_count,
            confidence: Math.min(0.95, Math.max(0.1, baseConfidence)), // Clamp between 0.1 and 0.95
            amount_diff: row.amount_diff,
            sample_descriptions: row.sample_descriptions,
            recency_weight: row.recency_weight,
            amount_weight: row.amount_weight
          };
        });
        
        // Sort by confidence and return top results
        resolve(results.sort((a, b) => b.confidence - a.confidence).slice(0, 5));
      }); // End of db.all
      }); // End of keywordRulesDAO callback
    }); // End of Promise
  },

  // Batch update transactions (e.g., assign category to multiple transactions)
  batchUpdateTransactions: (transactionIds, updates, userId, callback) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        return reject(new Error('User ID is required'));
      }

      if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return reject(new Error('Transaction IDs are required'));
      }

      if (!updates || typeof updates !== 'object') {
        return reject(new Error('Updates object is required'));
      }

      // Track affected accounts for balance recalculation
      const affectedAccountIds = new Set();

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Build UPDATE SQL based on provided fields
        const updateFields = [];
        const updateValues = [];
        
        if (updates.category_id !== undefined) {
          updateFields.push('category_id = ?');
          updateValues.push(updates.category_id || null);
        }
        if (updates.description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(updates.description);
        }
        if (updates.posted_status !== undefined) {
          updateFields.push('posted_status = ?');
          updateValues.push(updates.posted_status);
        }
        if (updates.is_transfer !== undefined) {
          updateFields.push('is_transfer = ?');
          updateValues.push(updates.is_transfer ? 1 : 0);
        }

        if (updateFields.length === 0) {
          db.run('ROLLBACK');
          return reject(new Error('No valid fields to update'));
        }

        // Create placeholders for transaction IDs
        const idPlaceholders = transactionIds.map(() => '?').join(',');
        
        // First, get affected account IDs before updating
        const getAccountsSql = `
          SELECT DISTINCT account_id
          FROM transactions
          WHERE transaction_id IN (${idPlaceholders}) AND user_id = ?
        `;

        db.all(getAccountsSql, [...transactionIds, userId], (accErr, accountRows) => {
          if (accErr) {
            db.run('ROLLBACK');
            return reject(accErr);
          }

          accountRows.forEach(row => {
            if (row.account_id) {
              affectedAccountIds.add(row.account_id);
            }
          });

          // Perform the batch update
          const sql = `
            UPDATE transactions
            SET ${updateFields.join(', ')}
            WHERE transaction_id IN (${idPlaceholders}) AND user_id = ?
          `;

          db.run(sql, [...updateValues, ...transactionIds, userId], function(updateErr) {
            if (updateErr) {
              db.run('ROLLBACK');
              return reject(updateErr);
            }

            const updatedCount = this.changes;

            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return reject(commitErr);
              }

              // Recalculate balances for affected accounts
              if (affectedAccountIds.size === 0) {
                return resolve({ updatedCount, affectedAccounts: 0 });
              }

              let recalcCount = 0;
              const recalcErrors = [];

              affectedAccountIds.forEach((accountId) => {
                accountDAO.updateAccountBalanceFromTransactions(accountId, (balErr) => {
                  recalcCount++;
                  if (balErr) {
                    recalcErrors.push({ accountId, error: balErr });
                  }

                  if (recalcCount === affectedAccountIds.size) {
                    if (recalcErrors.length > 0) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('Some balance recalculations failed:', recalcErrors);
                      }
                    }
                    resolve({ 
                      updatedCount, 
                      affectedAccounts: affectedAccountIds.size,
                      recalcErrors: recalcErrors.length > 0 ? recalcErrors : undefined
                    });
                  }
                });
              });
            });
          });
        });
      });
    });
  },

  /**
   * Check if legacy transaction exists (by transaction_id == hash)
   * Used for backward compatibility with old data
   * @param {string} dedupeHash - Dedupe hash
   * @returns {Promise<boolean>} - True if exists
   */
  checkLegacyTransactionExists: (dedupeHash) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT transaction_id FROM transactions WHERE transaction_id = ?';
      db.get(sql, [dedupeHash], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  },

  /**
   * Check if transaction exists by dedupe hash for an account
   * @param {string} accountId - Account ID
   * @param {string} dedupeHash - Dedupe hash
   * @returns {Promise<boolean>} - True if exists
   */
  checkTransactionExistsByDedupeHash: (accountId, dedupeHash) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT 1 FROM transactions WHERE account_id = ? AND dedupe_hash = ? LIMIT 1';
      db.get(sql, [accountId, dedupeHash], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

};

module.exports = transactionDAO;