// server/models/reconciliation_dao.js

const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');

const db = getConnection();

/**
 * Reconciliation Data Access Object
 * Handles CRUD operations for reconciliation sessions and matches
 */
const reconciliationDAO = {
  /**
   * Create a new reconciliation session
   * @param {Object} sessionData - Session data
   * @param {string} [sessionData.sessionId] - Optional session ID (allows controller to pre-generate)
   * @param {string} sessionData.userId - User ID
   * @param {string} sessionData.accountId - Account ID
   * @param {string} sessionData.periodStart - Period start date
   * @param {string} sessionData.periodEnd - Period end date
   * @param {number} sessionData.startBalance - Start balance (from bank statement)
   * @param {number} sessionData.closingBalance - Closing balance (from bank statement)
   * @param {Object} sessionData.params - Session parameters (optional)
   * @returns {Promise<string>} - Session ID
   */
  createSession: (sessionData) => {
    return new Promise((resolve, reject) => {
      const sessionId = sessionData.sessionId || uuidv4();
      const paramsJson = JSON.stringify(sessionData.params || {});

      const sql = `
        INSERT INTO ReconciliationSessions (
          session_id, user_id, account_id, period_start, period_end,
          start_balance, closing_balance, params_json, run_started
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        sessionId,
        sessionData.userId,
        sessionData.accountId,
        sessionData.periodStart,
        sessionData.periodEnd,
        sessionData.startBalance || null,
        sessionData.closingBalance,
        paramsJson,
        require('../utils/dateUtils').getCurrentTimestamp()
      ];

      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(sessionId);
        }
      });
    });
  },

  /**
   * Update session parameters (only for draft/active sessions)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @param {string} [updateData.periodStart] - Period start date
   * @param {string} [updateData.periodEnd] - Period end date
   * @param {number} [updateData.startBalance] - Start balance
   * @param {number} [updateData.closingBalance] - Closing balance
   * @param {Object} [updateData.params] - Session parameters (optional)
   * @returns {Promise<Object>} - Updated session data
   */
  updateSession: (sessionId, userId, updateData) => {
    return new Promise((resolve, reject) => {
      // First verify session exists, belongs to user, and is not closed
      const checkSql = `
        SELECT session_id, closed FROM ReconciliationSessions 
        WHERE session_id = ? AND user_id = ?
      `;
      
      db.get(checkSql, [sessionId, userId], (err, session) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!session) {
          reject(new Error('Session not found'));
          return;
        }
        
        if (session.closed) {
          reject(new Error('Cannot update closed reconciliation session'));
          return;
        }
        
        // Build update SQL dynamically based on provided fields
        const updates = [];
        const params = [];
        
        if (updateData.periodStart !== undefined) {
          updates.push('period_start = ?');
          params.push(updateData.periodStart);
        }
        
        if (updateData.periodEnd !== undefined) {
          updates.push('period_end = ?');
          params.push(updateData.periodEnd);
        }
        
        if (updateData.startBalance !== undefined) {
          updates.push('start_balance = ?');
          params.push(updateData.startBalance);
        }
        
        if (updateData.closingBalance !== undefined) {
          updates.push('closing_balance = ?');
          params.push(updateData.closingBalance);
        }
        
        if (updateData.params !== undefined) {
          updates.push('params_json = ?');
          params.push(JSON.stringify(updateData.params));
        }
        
        if (updates.length === 0) {
          // No updates provided, just return current session
          return reconciliationDAO.getSessionById(sessionId, userId)
            .then(resolve)
            .catch(reject);
        }
        
        // Add sessionId and userId to params for WHERE clause
        params.push(sessionId, userId);
        
        const updateSql = `
          UPDATE ReconciliationSessions 
          SET ${updates.join(', ')}
          WHERE session_id = ? AND user_id = ?
        `;
        
        db.run(updateSql, params, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            reject(new Error('Session not found or no changes made'));
            return;
          }
          
          // Return updated session
          reconciliationDAO.getSessionById(sessionId, userId)
            .then(resolve)
            .catch(reject);
        });
      });
    });
  },

  /**
   * Get session by ID with variance calculation
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Session data or null
   */
  getSessionById: (sessionId, userId) => {
    return new Promise((resolve, reject) => {
      // First get the session
      const sessionSql = `
        SELECT rs.*
        FROM ReconciliationSessions rs
        WHERE rs.session_id = ? AND rs.user_id = ?
      `;

      db.get(sessionSql, [sessionId, userId], (err, session) => {
        if (err) {
          reject(err);
        } else if (!session) {
          resolve(null);
        } else {
          // Get reconciled transactions for this session
          const transactionsSql = `
            SELECT COALESCE(SUM(t.signed_amount), 0) as reconciled_amount,
                   COUNT(t.transaction_id) as reconciled_count
            FROM ReconciliationMatches rm
            JOIN Transactions t ON rm.transaction_id = t.transaction_id
            WHERE rm.session_id = ? AND rm.active = 1
          `;

          db.get(transactionsSql, [sessionId], (err, txData) => {
            if (err) {
              reject(err);
              return;
            }

            // Calculate variance: (start_balance + sum of reconciled transactions) - closing_balance
            const startBalance = session.start_balance || 0;
            const reconciledAmount = txData?.reconciled_amount || 0;
            const calculatedBalance = startBalance + reconciledAmount;
            const variance = calculatedBalance - session.closing_balance;

            resolve({
              ...session,
              variance,
              reconciled_amount: reconciledAmount,
              reconciled_count: txData?.reconciled_count || 0,
              calculated_balance: calculatedBalance,
              is_balanced: Math.abs(variance) < 0.01 // Within 1 cent
            });
          });
        }
      });
    });
  },

  /**
   * Get all sessions for a user/account with enhanced details
   * @param {string} userId - User ID
   * @param {string} [accountId] - Optional account ID filter
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} - Array of sessions with details
   */
  getSessionsByUser: (userId, accountId = null, filters = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          rs.*,
          a.account_name,
          COUNT(rm.match_id) as match_count,
          COALESCE(SUM(rm.confidence), 0) as total_confidence,
          COALESCE(AVG(rm.confidence), 0) as avg_confidence,
          COUNT(CASE WHEN rm.matched_by = 'auto' THEN 1 END) as auto_matches,
          COUNT(CASE WHEN rm.matched_by = 'manual' THEN 1 END) as manual_matches,
          COALESCE(SUM(t.signed_amount), 0) as reconciled_amount,
          COUNT(DISTINCT rm.transaction_id) as reconciled_count
        FROM ReconciliationSessions rs
        LEFT JOIN Accounts a ON rs.account_id = a.account_id
        LEFT JOIN ReconciliationMatches rm ON rs.session_id = rm.session_id AND rm.active = 1
        LEFT JOIN Transactions t ON rm.transaction_id = t.transaction_id
        WHERE rs.user_id = ?
      `;

      const params = [userId];

      if (accountId) {
        sql += ' AND rs.account_id = ?';
        params.push(accountId);
      }

      // Apply filters - use string comparison (dates are YYYY-MM-DD format)
      if (filters.dateFrom) {
        sql += ' AND rs.run_started >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        sql += ' AND rs.run_started <= ?';
        params.push(filters.dateTo);
      }

      if (filters.closedOnly) {
        sql += ' AND rs.closed = 1';
      }

      sql += ' GROUP BY rs.session_id ORDER BY rs.run_started DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse params_json and calculate variance for each session
          const sessions = (rows || []).map(row => {
            const startBalance = row.start_balance || 0;
            const reconciledAmount = row.reconciled_amount || 0;
            const calculatedBalance = startBalance + reconciledAmount;
            const variance = calculatedBalance - (row.closing_balance || 0);
            
            return {
              ...row,
              params: row.params_json ? JSON.parse(row.params_json) : {},
              reconciled_amount: reconciledAmount,
              reconciled_count: row.reconciled_count || 0,
              calculated_balance: calculatedBalance,
              variance: variance,
              is_balanced: Math.abs(variance) < 0.01 // Within 1 cent
            };
          });
          resolve(sessions);
        }
      });
    });
  },

  /**
   * Create matches in batch (simplified: statement_line_id is optional)
   * @param {string} sessionId - Session ID
   * @param {Array} matches - Array of match objects (statement_line_id is optional)
   * @returns {Promise<Object>} - { insertedCount, errorCount }
   */
  createMatches: (sessionId, matches) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(matches) || matches.length === 0) {
        return resolve({ insertedCount: 0, errorCount: 0, matchIds: [] });
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let insertedCount = 0;
        let errorCount = 0;
        const matchIds = [];
        let completed = 0;
        const total = matches.length;

        const stmt = db.prepare(`
          INSERT INTO ReconciliationMatches (
            session_id, user_id, account_id, transaction_id, statement_line_id,
            confidence, rule, matched_by, active, matched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const assignTransactionToStatement = (match, done) => {
          const statementId = match.statement_id || null;
          if (!statementId) return done();

          // Ownership gate: only assign if unassigned or already assigned to this statement
          // Note: user_id check removed - account_id ownership is sufficient (handles legacy data)
          db.run(
            `UPDATE Transactions
             SET statement_id = ?
             WHERE transaction_id = ?
               AND (statement_id IS NULL OR statement_id = ?)`,
            [statementId, match.transaction_id, statementId],
            (err) => {
              if (err) {
                // Fail hard: match creation should be atomic with ownership assignment
                db.run('ROLLBACK');
                reject(err);
              } else {
                done();
              }
            }
          );
        };

        const checkComplete = () => {
          completed++;
          if (completed === total) {
            // Finalize the statement after all operations complete (synchronous)
            try {
              stmt.finalize();
            } catch (finalizeErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('Error finalizing statement:', finalizeErr);
              }
              db.run('ROLLBACK');
              reject(finalizeErr);
              return;
            }
            
            // Commit transaction after statement is finalized
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
              } else {
                resolve({ insertedCount, errorCount, matchIds });
              }
            });
          }
        };

        matches.forEach((match, index) => {
          stmt.run([
            sessionId,
            match.user_id,
            match.account_id,
            match.transaction_id,
            match.statement_line_id || null, // Allow NULL for simplified reconciliation
            match.confidence || 100,
            match.rule || 'manual',
            match.matched_by || 'manual',
            1, // active
            require('../utils/dateUtils').getCurrentTimestamp()
          ], function(err) {
            if (err) {
              // Handle unique constraint violation gracefully
              if (err.message && err.message.includes('UNIQUE constraint failed')) {
                // Match already exists, count as success (idempotent)
                insertedCount++;
                // Get the existing match_id
                db.get(
                  'SELECT match_id FROM ReconciliationMatches WHERE transaction_id = ? AND active = 1',
                  [match.transaction_id],
                  (err2, row) => {
                    if (!err2 && row) {
                      matchIds.push(row.match_id);
                    }
                    // Ensure ownership assignment even when match already existed
                    assignTransactionToStatement(match, checkComplete);
                  }
                );
              } else {
                errorCount++;
                if (process.env.NODE_ENV !== 'production') {
                  console.error(`Error inserting match ${index}:`, err.message);
                }
                checkComplete();
              }
            } else {
              insertedCount++;
              matchIds.push(this.lastID);
              // Assign transaction ownership to this statement/session
              assignTransactionToStatement(match, checkComplete);
            }
          });
        });
      });
    });
  },

  /**
   * Get matches for a session with optional filters (simplified: statement lines optional)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} - Array of matches with transaction details
   */
  getMatchesBySession: (sessionId, userId, filters = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          rm.*,
          t.transaction_date,
          t.description as tx_description,
          t.amount as tx_amount,
          t.signed_amount as tx_signed_amount,
          t.category_id,
          c.category_name,
          sl.txn_date as stmt_date,
          sl.description as stmt_description,
          sl.raw_amount as stmt_amount,
          sl.signed_amount as stmt_signed_amount,
          sl.instrument_id,
          sl.bank_reference,
          CASE 
            WHEN sl.statement_line_id IS NOT NULL 
            THEN ABS(t.signed_amount - sl.signed_amount)
            ELSE 0
          END as amount_diff,
          CASE 
            WHEN sl.statement_line_id IS NOT NULL 
            THEN ABS(julianday(t.transaction_date) - julianday(sl.txn_date))
            ELSE 0
          END as date_diff_days
        FROM ReconciliationMatches rm
        JOIN Transactions t ON rm.transaction_id = t.transaction_id
        LEFT JOIN StatementLines sl ON rm.statement_line_id = sl.statement_line_id
        LEFT JOIN Categories c ON t.category_id = c.category_id
        WHERE rm.session_id = ? AND rm.user_id = ? AND rm.active = 1
      `;

      const params = [sessionId, userId];

      // Apply filters
      if (filters.minConfidence) {
        sql += ' AND rm.confidence >= ?';
        params.push(filters.minConfidence);
      }

      if (filters.maxConfidence) {
        sql += ' AND rm.confidence <= ?';
        params.push(filters.maxConfidence);
      }

      if (filters.rule) {
        sql += ' AND rm.rule = ?';
        params.push(filters.rule);
      }

      if (filters.matchedBy) {
        sql += ' AND rm.matched_by = ?';
        params.push(filters.matchedBy);
      }

      if (filters.minAmount) {
        sql += ' AND ABS(t.signed_amount) >= ?';
        params.push(filters.minAmount);
      }

      if (filters.maxAmount) {
        sql += ' AND ABS(t.signed_amount) <= ?';
        params.push(filters.maxAmount);
      }

      sql += ' ORDER BY rm.matched_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Delete a match (deactivate)
   * @param {string} matchId - Match ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - { deleted: boolean }
   */
  deleteMatch: (matchId, userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Load match so we can clear statement ownership on the transaction
        db.get(
          `SELECT match_id, session_id, transaction_id
           FROM ReconciliationMatches
           WHERE match_id = ? AND user_id = ?`,
          [matchId, userId],
          (err, matchRow) => {
        if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            if (!matchRow) {
              db.run('ROLLBACK');
              return resolve({ deleted: false });
            }

            db.run(
              `UPDATE ReconciliationMatches
               SET active = 0
               WHERE match_id = ? AND user_id = ?`,
              [matchId, userId],
              function(err2) {
                if (err2) {
                  db.run('ROLLBACK');
                  return reject(err2);
                }
                const deleted = this.changes > 0;

                // Clear ownership only if this statement/session currently owns it
                // Note: user_id check removed - account_id ownership is sufficient
                db.run(
                  `UPDATE Transactions
                   SET statement_id = NULL
                   WHERE transaction_id = ?
                     AND statement_id = ?`,
                  [matchRow.transaction_id, matchRow.session_id],
                  (err3) => {
                    if (err3) {
                      db.run('ROLLBACK');
                      return reject(err3);
                    }

                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) return reject(commitErr);
                      resolve({ deleted, transaction_id: matchRow.transaction_id });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  },

  /**
   * Statement-centric candidate selection:
   * - Hard gate: transaction is unassigned OR assigned to this statement
   * - Soft date: posted_date (fallback transaction_date) is only an upper bound
   */
  getStatementCandidateTransactions: (userId, accountId, statementClosingDate, statementId) => {
    return new Promise((resolve, reject) => {
      // Statement-centric: filter by account_id only (user_id check happens at account level in controller)
      // This handles legacy data where transaction user_id may not match account owner
      // Also includes transactions assigned to non-existent/closed sessions (orphaned assignments)
      const sql = `
        SELECT 
          t.*,
          a.account_name,
          COALESCE(t.posted_date, t.transaction_date) AS posted_date_effective,
          CASE WHEN t.statement_id = ? THEN 1 ELSE 0 END AS is_assigned_to_this_statement,
          CASE WHEN t.statement_id IS NOT NULL AND rs.session_id IS NULL THEN 1 ELSE 0 END AS is_orphaned_assignment
        FROM Transactions t
        JOIN Accounts a ON t.account_id = a.account_id
        LEFT JOIN ReconciliationSessions rs ON t.statement_id = rs.session_id
        WHERE t.account_id = ?
          AND t.posted_status = 'posted'
          AND t.is_transfer = 0
          AND (
            t.statement_id IS NULL 
            OR t.statement_id = ?
            OR (t.statement_id IS NOT NULL AND rs.session_id IS NULL)
          )
          AND COALESCE(t.posted_date, t.transaction_date) <= ?
        ORDER BY COALESCE(t.posted_date, t.transaction_date) ASC, t.signed_amount ASC, t.created_at ASC
      `;

      db.all(sql, [statementId, accountId, statementId, statementClosingDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  /**
   * Get session summary with counts and variance (simplified calculation)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Session summary
   */
  getSessionSummary: (sessionId, userId) => {
    return new Promise((resolve, reject) => {
      // Get session first
      const sessionSql = `
        SELECT rs.*
        FROM ReconciliationSessions rs
        WHERE rs.session_id = ? AND rs.user_id = ?
      `;

      db.get(sessionSql, [sessionId, userId], (err, session) => {
        if (err) {
          reject(err);
        } else if (!session) {
          reject(new Error('Session not found'));
        } else {
          // Get match counts and reconciled transaction amounts
          const matchesSql = `
            SELECT 
              COUNT(rm.match_id) as total_matches,
              COUNT(CASE WHEN rm.matched_by = 'auto' THEN 1 END) as auto_matches,
              COUNT(CASE WHEN rm.matched_by = 'manual' THEN 1 END) as manual_matches,
              COALESCE(SUM(t.signed_amount), 0) as reconciled_amount,
              COUNT(t.transaction_id) as reconciled_count
            FROM ReconciliationMatches rm
            JOIN Transactions t ON rm.transaction_id = t.transaction_id
            WHERE rm.session_id = ? AND rm.active = 1
          `;

          db.get(matchesSql, [sessionId], (err, matchData) => {
            if (err) {
              reject(err);
              return;
            }

            // Calculate variance: (start_balance + sum of reconciled transactions) - closing_balance
            const startBalance = session.start_balance || 0;
            const reconciledAmount = matchData?.reconciled_amount || 0;
            const calculatedBalance = startBalance + reconciledAmount;
            const variance = calculatedBalance - session.closing_balance;

            resolve({
              ...session,
              total_matches: matchData?.total_matches || 0,
              auto_matches: matchData?.auto_matches || 0,
              manual_matches: matchData?.manual_matches || 0,
              reconciled_amount: reconciledAmount,
              reconciled_count: matchData?.reconciled_count || 0,
              calculated_balance: calculatedBalance,
              variance,
              is_balanced: Math.abs(variance) < 0.01 // Within 1 cent
            });
          });
        }
      });
    });
  },

  /**
   * Close a session (freeze matches, mark transactions as reconciled, compute final variance)
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Final session data
   */
  closeSession: (sessionId, userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get current summary
        reconciliationDAO.getSessionSummary(sessionId, userId)
          .then(summary => {
            // Update session as closed
            // Note: Reconciliation status is tracked via ReconciliationMatches table,
            // not via is_reconciled column (which was removed in simplified reconciliation)
            const updateSql = `
              UPDATE ReconciliationSessions 
              SET closed = 1, variance = ?
              WHERE session_id = ? AND user_id = ?
            `;

            db.run(updateSql, [summary.variance, sessionId, userId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
              } else {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    reject(commitErr);
                  } else {
                    resolve({
                      ...summary,
                      closed: true,
                      closed_at: require('../utils/dateUtils').getCurrentTimestamp()
                    });
                  }
                });
              }
            });
          })
          .catch(reject);
      });
    });
  },

  /**
   * Get unmatched transactions for an account (simplified: excludes already reconciled)
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {string} [dateFrom] - Optional date filter
   * @param {string} [dateTo] - Optional date filter
   * @param {Object} [options] - Optional filters
   * @param {boolean} [options.includeTransfers] - Include transfer transactions (default: false)
   * @param {boolean} [options.includeNonPosted] - Include non-posted transactions (default: false)
   * @param {string} [options.sessionId] - Optional session ID to exclude transactions already in this session
   * @returns {Promise<Array>} - Array of unmatched transactions
   */
  getUnmatchedTransactions: (userId, accountId, dateFrom = null, dateTo = null, options = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT t.*, a.account_name
        FROM Transactions t
        JOIN Accounts a ON t.account_id = a.account_id
        WHERE t.user_id = ? AND t.account_id = ?
      `;

      const params = [userId, accountId];

      // Hard gate: only unassigned transactions are eligible candidates
      sql += ` AND t.statement_id IS NULL`;

      // Exclude transactions already in this session if sessionId provided
      if (options.sessionId) {
        sql += ` AND t.transaction_id NOT IN (
          SELECT transaction_id
          FROM ReconciliationMatches
          WHERE session_id = ? AND active = 1
        )`;
        params.push(options.sessionId);
      } else {
        // Otherwise exclude any transaction that has an active match
        sql += ` AND t.transaction_id NOT IN (
          SELECT transaction_id
          FROM ReconciliationMatches
          WHERE active = 1
        )`;
      }

      // Filter by posted status (unless includeNonPosted is true)
      if (!options.includeNonPosted) {
        sql += ' AND t.posted_status = \'posted\'';
      }

      // Filter out transfers (unless includeTransfers is true)
      if (!options.includeTransfers) {
        sql += ' AND t.is_transfer = 0';
      }

      if (dateFrom) {
        sql += ' AND COALESCE(t.posted_date, t.transaction_date) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        sql += ' AND COALESCE(t.posted_date, t.transaction_date) <= ?';
        params.push(dateTo);
      }

      sql += ' ORDER BY COALESCE(t.posted_date, t.transaction_date) DESC';

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get all transactions for a session (within date range, regardless of reconciliation status)
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @param {string} [sessionId] - Optional session ID to mark which transactions are reconciled in this session
   * @returns {Promise<Array>} - Array of transactions with reconciliation status
   */
  getSessionTransactions: (userId, accountId, dateFrom, dateTo, sessionId = null) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          t.*,
          a.account_name,
          CASE 
            WHEN rm_current.match_id IS NOT NULL THEN 1
            ELSE 0
          END as is_reconciled_in_session,
          CASE 
            WHEN rm_other.match_id IS NOT NULL THEN 1
            ELSE 0
          END as is_reconciled_in_other_session,
          rm_other.session_id as other_session_id,
          rs_other.period_start as other_session_period_start,
          rs_other.period_end as other_session_period_end,
          rs_other.closed as other_session_closed
        FROM Transactions t
        JOIN Accounts a ON t.account_id = a.account_id
        LEFT JOIN ReconciliationMatches rm_current ON t.transaction_id = rm_current.transaction_id 
          AND rm_current.active = 1
      `;

      const params = [];

      if (sessionId) {
        sql += ' AND rm_current.session_id = ?';
        params.push(sessionId);
      }

      sql += `
        LEFT JOIN ReconciliationMatches rm_other ON t.transaction_id = rm_other.transaction_id 
          AND rm_other.active = 1
      `;

      if (sessionId) {
        sql += ' AND rm_other.session_id != ?';
        params.push(sessionId);
      }

      sql += `
        LEFT JOIN ReconciliationSessions rs_other ON rm_other.session_id = rs_other.session_id
        WHERE t.user_id = ? 
          AND t.account_id = ?
          AND COALESCE(t.posted_date, t.transaction_date) >= ?
          AND COALESCE(t.posted_date, t.transaction_date) <= ?
          AND t.posted_status = 'posted'
          AND t.is_transfer = 0
        ORDER BY COALESCE(t.posted_date, t.transaction_date) DESC, t.created_at DESC
      `;

      params.push(userId, accountId, dateFrom, dateTo);

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Delete a reconciliation session and update transaction reconciliation status
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Deletion result
   */
  deleteSession: (sessionId, userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Enable foreign keys for this transaction
        db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
          if (pragmaErr) {
            // If pragma fails, continue anyway - foreign keys might already be enabled
          }
          
          // Start transaction
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }

            // First, verify the session exists and belongs to the user
            db.get(
              'SELECT session_id, closed FROM ReconciliationSessions WHERE session_id = ? AND user_id = ?',
              [sessionId, userId],
              (err, session) => {
                if (err) {
                  db.run('ROLLBACK', () => reject(err));
                  return;
                }

                if (!session) {
                  db.run('ROLLBACK', () => resolve({ deleted: false, error: 'Session not found' }));
                  return;
                }

                // Get all transaction IDs that were reconciled in this session
                db.all(
                  `SELECT transaction_id 
                   FROM ReconciliationMatches 
                   WHERE session_id = ? AND active = 1`,
                  [sessionId],
                  (err, matches) => {
                    if (err) {
                      db.run('ROLLBACK', () => reject(err));
                      return;
                    }

                    const transactionIds = matches ? matches.map(m => m.transaction_id) : [];

                    // Delete all matches for this session
                    // Note: Reconciliation status is tracked via ReconciliationMatches table,
                    // not via is_reconciled column (which was removed in simplified reconciliation)
                    db.run(
                      'DELETE FROM ReconciliationMatches WHERE session_id = ?',
                      [sessionId],
                      function(err) {
                        if (err) {
                          db.run('ROLLBACK', () => reject(err));
                          return;
                        }

                        // Clear statement_id assignments for transactions assigned to this session
                        // This prevents orphaned assignments when the session is deleted
                        // Note: user_id check removed - account_id ownership is sufficient
                        db.run(
                          `UPDATE Transactions
                           SET statement_id = NULL
                           WHERE statement_id = ?`,
                          [sessionId],
                          function(err2) {
                            if (err2) {
                              db.run('ROLLBACK', () => reject(err2));
                              return;
                            }

                            const assignmentsCleared = this.changes || 0;

                            // Delete the session
                            db.run(
                              'DELETE FROM ReconciliationSessions WHERE session_id = ? AND user_id = ?',
                              [sessionId, userId],
                              function(err3) {
                                if (err3) {
                                  db.run('ROLLBACK', () => reject(err3));
                                } else {
                                  db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                      reject(commitErr);
                                    } else {
                                      resolve({
                                        deleted: true,
                                        session_id: sessionId,
                                        transactions_unreconciled: transactionIds.length,
                                        assignments_cleared: assignmentsCleared
                                      });
                                    }
                                  });
                                }
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    });
  },

  getUnmatchedStatementLines: (userId, accountId, importIds = []) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT sl.*, si.source_filename, si.bank_name
        FROM StatementLines sl
        JOIN StatementImports si ON sl.import_id = si.import_id
        LEFT JOIN ReconciliationMatches rm ON sl.statement_line_id = rm.statement_line_id AND rm.active = 1
        WHERE sl.user_id = ? AND sl.account_id = ?
        AND rm.statement_line_id IS NULL
      `;

      const params = [userId, accountId];

      if (importIds.length > 0) {
        const placeholders = importIds.map(() => '?').join(',');
        sql += ` AND sl.import_id IN (${placeholders})`;
        params.push(...importIds);
      }

      sql += ' ORDER BY sl.txn_date DESC';

      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get transaction with ownership validation for reconciliation
   * Checks transaction exists, belongs to user, and validates ownership
   * @param {string} transactionId - Transaction ID
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID for ownership check
   * @returns {Promise<Object|null>} - Transaction data with ownership info or null
   */
  getTransactionWithOwnershipCheck: (transactionId, userId, sessionId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT transaction_id, user_id, account_id, statement_id
        FROM Transactions
        WHERE transaction_id = ? AND user_id = ?
      `;
      
      db.get(sql, [transactionId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },

  /**
   * Check if transaction has active match in another session
   * @param {string} transactionId - Transaction ID
   * @param {string} sessionId - Current session ID to exclude
   * @returns {Promise<Object|null>} - Match data if exists, null otherwise
   */
  getActiveMatchInOtherSession: (transactionId, sessionId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT session_id
        FROM ReconciliationMatches
        WHERE transaction_id = ? AND active = 1 AND session_id != ?
        LIMIT 1
      `;
      
      db.get(sql, [transactionId, sessionId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },

  /**
   * Get comprehensive transaction details with all related reconciliation data
   * @param {string} transactionId - Transaction ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Complete transaction details object
   */
  getTransactionDetails: (transactionId, userId) => {
    return new Promise((resolve, reject) => {
      // Get transaction with all related data
      const transactionSql = `
        SELECT 
          t.*,
          a.account_name,
          a.account_type,
          a.positive_is_credit,
          c.category_name,
          c.parent_category_id,
          parent_cat.category_name as parent_category_name
        FROM Transactions t
        JOIN Accounts a ON t.account_id = a.account_id
        LEFT JOIN Categories c ON t.category_id = c.category_id
        LEFT JOIN Categories parent_cat ON c.parent_category_id = parent_cat.category_id
        WHERE t.transaction_id = ? AND a.user_id = ?
      `;
      
      db.get(transactionSql, [transactionId, userId], (err, transaction) => {
        if (err) {
          reject(err);
          return;
        }

        if (!transaction) {
          resolve(null);
          return;
        }

        // Get all reconciliation matches (active and inactive) for this transaction
        const matchesSql = `
          SELECT 
            rm.*,
            rs.period_start,
            rs.period_end,
            rs.start_balance,
            rs.closing_balance,
            rs.closed,
            rs.run_started,
            sl.txn_date as statement_line_date,
            sl.description as statement_line_description,
            sl.raw_amount as statement_line_amount,
            sl.signed_amount as statement_line_signed_amount
          FROM ReconciliationMatches rm
          LEFT JOIN ReconciliationSessions rs ON rm.session_id = rs.session_id
          LEFT JOIN StatementLines sl ON rm.statement_line_id = sl.statement_line_id
          WHERE rm.transaction_id = ?
          ORDER BY rm.matched_at DESC
        `;
        
        db.all(matchesSql, [transactionId], (err, matches) => {
          if (err) {
            reject(err);
            return;
          }

          // Get linked transaction if exists
          let linkedTransactionPromise = Promise.resolve(null);
          if (transaction.linked_transaction_id) {
            linkedTransactionPromise = new Promise((resolve, reject) => {
              const linkedSql = `
                SELECT 
                  t.*,
                  a.account_name
                FROM Transactions t
                JOIN Accounts a ON t.account_id = a.account_id
                WHERE t.transaction_id = ? AND a.user_id = ?
              `;
              
              db.get(linkedSql, [transaction.linked_transaction_id, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
              });
            });
          }

          // Get import record if exists
          let importRecordPromise = Promise.resolve(null);
          if (transaction.import_id && transaction.import_id !== 'default') {
            importRecordPromise = new Promise((resolve, reject) => {
              db.get(
                'SELECT * FROM transaction_imports WHERE id = ?',
                [transaction.import_id],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row || null);
                }
              );
            });
          }

          // Get statement information if transaction is assigned to a statement
          let statementInfoPromise = Promise.resolve(null);
          if (transaction.statement_id) {
            statementInfoPromise = new Promise((resolve, reject) => {
              // First try direct match (in case statement_id is actually an import_id for CSV imports)
              db.get(
                `SELECT 
                  import_id,
                  statement_name,
                  source_filename,
                  statement_from,
                  statement_to,
                  bank_name,
                  status,
                  integrity_status,
                  created_at
                FROM StatementImports
                WHERE import_id = ? AND user_id = ?`,
                [transaction.statement_id, userId],
                (err, row) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  if (row) {
                    // Found by direct import_id match (CSV import case)
                    resolve(row);
                    return;
                  }
                  
                  // Not found by import_id, so it's likely a session_id
                  // Look up the ReconciliationSession to get account and period info
                  db.get(
                    `SELECT account_id, period_start, period_end 
                     FROM ReconciliationSessions 
                     WHERE session_id = ? AND user_id = ?`,
                    [transaction.statement_id, userId],
                    (sessionErr, session) => {
                      if (sessionErr) {
                        reject(sessionErr);
                        return;
                      }
                      
                      if (!session) {
                        // Session not found - might be orphaned, try to find StatementImport by account and session ID pattern
                        db.get(
                          `SELECT 
                            import_id,
                            statement_name,
                            source_filename,
                            statement_from,
                            statement_to,
                            bank_name,
                            status,
                            integrity_status,
                            created_at
                          FROM StatementImports
                          WHERE account_id = ?
                            AND user_id = ?
                            AND source_filename LIKE ?
                          ORDER BY created_at DESC
                          LIMIT 1`,
                          [
                            transaction.account_id,
                            userId,
                            `%${transaction.statement_id.substring(0, 8)}%`
                          ],
                          (fallbackErr, fallbackRow) => {
                            if (fallbackErr) {
                              reject(fallbackErr);
                            } else {
                              resolve(fallbackRow || null);
                            }
                          }
                        );
                        return;
                      }
                      
                      // Find StatementImport for this session by matching account and period dates
                      // Try exact date match first, then fallback to session ID in filename
                      db.get(
                        `SELECT 
                          import_id,
                          statement_name,
                          source_filename,
                          statement_from,
                          statement_to,
                          bank_name,
                          status,
                          integrity_status,
                          created_at
                        FROM StatementImports
                        WHERE account_id = ?
                          AND user_id = ?
                          AND (
                            (statement_from = ? AND statement_to = ?)
                            OR source_filename LIKE ?
                          )
                          AND (source_filename LIKE '%Reconciliation Session%' OR source_filename LIKE ?)
                        ORDER BY 
                          CASE 
                            WHEN statement_from = ? AND statement_to = ? THEN 1
                            WHEN source_filename LIKE ? THEN 2
                            ELSE 3
                          END,
                          created_at DESC
                        LIMIT 1`,
                        [
                          session.account_id, 
                          userId,
                          session.period_start, 
                          session.period_end,
                          `%${transaction.statement_id.substring(0, 8)}%`,
                          `%${transaction.statement_id.substring(0, 8)}%`,
                          session.period_start,
                          session.period_end,
                          `%${transaction.statement_id.substring(0, 8)}%`
                        ],
                        (stmtErr, stmtRow) => {
                          if (stmtErr) {
                            reject(stmtErr);
                          } else if (stmtRow) {
                            resolve(stmtRow);
                          } else {
                            // If no exact match, try fallback: find any StatementImport for this account with session ID in filename
                            db.get(
                              `SELECT 
                                import_id,
                                statement_name,
                                source_filename,
                                statement_from,
                                statement_to,
                                bank_name,
                                status,
                                integrity_status,
                                created_at
                              FROM StatementImports
                              WHERE account_id = ?
                                AND user_id = ?
                                AND source_filename LIKE ?
                              ORDER BY created_at DESC
                              LIMIT 1`,
                              [
                                session.account_id,
                                userId,
                                `%${transaction.statement_id.substring(0, 8)}%`
                              ],
                              (fallbackErr, fallbackRow) => {
                                if (fallbackErr) {
                                  reject(fallbackErr);
                                } else {
                                  resolve(fallbackRow || null);
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  );
                }
              );
            });
          }

          // Wait for all async operations to complete
          Promise.all([linkedTransactionPromise, importRecordPromise, statementInfoPromise])
            .then(([linkedTransaction, importRecord, statementInfo]) => {
              resolve({
                transaction,
                reconciliation_matches: matches || [],
                linked_transaction: linkedTransaction,
                import_record: importRecord,
                statement_info: statementInfo,
                reconciliation_summary: {
                  total_matches: (matches || []).length,
                  active_matches: (matches || []).filter(m => m.active === 1).length,
                  inactive_matches: (matches || []).filter(m => m.active === 0).length,
                  assigned_to_statement: transaction.statement_id || null
                }
              });
            })
            .catch(reject);
        });
      });
    });
  }
};

module.exports = reconciliationDAO;
