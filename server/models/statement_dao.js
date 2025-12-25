// server/models/statement_dao.js

const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const db = getConnection();

/**
 * Statement Data Access Object
 * Handles CRUD operations for StatementImports and StatementLines
 */
const statementDAO = {
  /**
   * Create a new statement import
   * @param {Object} importData - Import data
   * @param {string} importData.userId - User ID
   * @param {string} importData.accountId - Account ID
   * @param {string} importData.sourceFilename - Original filename
   * @param {Buffer} importData.fileBuffer - Raw file bytes
   * @param {string} importData.bankName - Bank name
   * @param {string} importData.statementFrom - Statement start date
   * @param {string} importData.statementTo - Statement end date
   * @param {number} importData.openingBalance - Opening balance (required for integrity checking)
   * @param {number} importData.closingBalance - Closing balance
   * @returns {Promise<string>} - Import ID
   */
  createImport: (importData) => {
    return new Promise((resolve, reject) => {
      const importId = uuidv4();
      const sourceHash = crypto.createHash('sha256').update(importData.fileBuffer).digest('hex');
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      const now = getCurrentTimestamp();
      
      // Generate statement_name if not provided
      let statementName = importData.statementName || importData.statement_name;
      if (!statementName || statementName.trim() === '') {
        // Default to source_filename or generate a name
        statementName = importData.sourceFilename || `Statement ${importId.substring(0, 8)}`;
      }
      
      const sql = `
        INSERT INTO StatementImports (
          import_id, user_id, account_id, source_filename, source_hash,
          bank_name, statement_from, statement_to, opening_balance, closing_balance,
          status, integrity_status, statement_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        importId,
        importData.userId,
        importData.accountId,
        importData.sourceFilename,
        sourceHash,
        importData.bankName || null,
        importData.statementFrom,
        importData.statementTo,
        importData.openingBalance != null ? parseFloat(importData.openingBalance) : null,
        importData.closingBalance != null ? parseFloat(importData.closingBalance) : null,
        'pending', // Initial status
        'unknown', // Initial integrity status
        statementName.trim(),
        now,
        now
      ];

      db.run(sql, params, function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: source_hash')) {
            reject(new Error('Duplicate import: This file has already been imported'));
          } else if (err.message.includes('UNIQUE constraint failed: statement_name')) {
            reject(new Error(`Statement name "${statementName}" already exists. Please choose a different name.`));
          } else {
            reject(err);
          }
        } else {
          resolve(importId);
        }
      });
    });
  },

  /**
   * Get import by ID
   * @param {string} importId - Import ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Import data or null
   */
  getImportById: (importId, userId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          si.*,
          COUNT(sl.statement_line_id) as line_count,
          COALESCE(SUM(sl.signed_amount), 0) as total_amount
        FROM StatementImports si
        LEFT JOIN StatementLines sl ON si.import_id = sl.import_id
        WHERE si.import_id = ? AND si.user_id = ?
        GROUP BY si.import_id
      `;
      
      db.get(sql, [importId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  },

  /**
   * Get all imports for a user/account
   * @param {string} userId - User ID
   * @param {string} [accountId] - Optional account ID filter
   * @returns {Promise<Array>} - Array of imports
   */
  getImportsByUser: (userId, accountId = null) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          si.*,
          COUNT(sl.statement_line_id) as line_count,
          COALESCE(SUM(sl.signed_amount), 0) as total_amount
        FROM StatementImports si
        LEFT JOIN StatementLines sl ON si.import_id = sl.import_id
        WHERE si.user_id = ?
      `;
      
      const params = [userId];
      
      if (accountId) {
        sql += ' AND si.account_id = ?';
        params.push(accountId);
      }
      
      sql += ' GROUP BY si.import_id ORDER BY si.created_at DESC';
      
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
   * Create statement lines in batch
   * @param {Array} statementLines - Array of statement line objects
   * @returns {Promise<Object>} - { insertedCount, errorCount }
   */
  createStatementLines: (statementLines) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(statementLines) || statementLines.length === 0) {
        return resolve({ insertedCount: 0, errorCount: 0 });
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let insertedCount = 0;
        let errorCount = 0;
        
        const stmt = db.prepare(`
          INSERT INTO StatementLines (
            statement_line_id, import_id, user_id, account_id, txn_date,
            raw_amount, signed_amount, transaction_type_norm, description,
            description_norm, bank_reference, bank_fitid, instrument_id,
            processed_date, dedupe_hash, norm_version, raw_row_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        statementLines.forEach((line, index) => {
          stmt.run([
            line.statement_line_id,
            line.import_id,
            line.user_id,
            line.account_id,
            line.txn_date,
            line.raw_amount,
            line.signed_amount,
            line.transaction_type_norm,
            line.description,
            line.description_norm,
            line.bank_reference,
            line.bank_fitid,
            line.instrument_id,
            line.processed_date,
            line.dedupe_hash,
            line.norm_version,
            line.raw_row_json,
            line.created_at
          ], function(err) {
            if (err) {
              errorCount++;
              console.error(`Error inserting statement line ${index}:`, err.message);
            } else {
              insertedCount++;
            }
          });
        });

        stmt.finalize();

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            resolve({ insertedCount, errorCount });
          }
        });
      });
    });
  },

  /**
   * Get statement lines for an import
   * @param {string} importId - Import ID
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<Array>} - Array of statement lines
   */
  getStatementLines: (importId, userId, options = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT sl.*, si.source_filename, si.bank_name
        FROM StatementLines sl
        JOIN StatementImports si ON sl.import_id = si.import_id
        WHERE sl.import_id = ? AND sl.user_id = ?
        ORDER BY sl.txn_date DESC, sl.created_at DESC
      `;
      
      const params = [importId, userId];
      
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
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
   * Check for duplicate hash
   * @param {string} dedupeHash - Dedupe hash to check
   * @param {string} accountId - Account ID
   * @returns {Promise<boolean>} - True if duplicate exists
   */
  checkDuplicateHash: (dedupeHash, accountId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 1 FROM StatementLines 
        WHERE dedupe_hash = ? AND account_id = ? 
        LIMIT 1
      `;
      
      db.get(sql, [dedupeHash, accountId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  },

  /**
   * Get unmatched statement lines for an account
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {Array} importIds - Array of import IDs to include
   * @returns {Promise<Array>} - Array of unmatched statement lines
   */
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
   * Get candidate pairs for matching
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID
   * @param {number} amountTol - Amount tolerance
   * @param {number} dateTolDays - Date tolerance in days
   * @returns {Promise<Array>} - Array of candidate pairs
   */
  getCandidatePairs: (userId, accountId, amountTol = 0.005, dateTolDays = 1) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          t.transaction_id,
          sl.statement_line_id,
          t.signed_amount as tx_amount,
          sl.signed_amount as stmt_amount,
          ABS(t.signed_amount - sl.signed_amount) as amount_diff,
          t.transaction_date,
          sl.txn_date as stmt_date,
          t.description as tx_desc,
          sl.description as stmt_desc,
          t.posted_status,
          t.is_transfer
        FROM Transactions t
        CROSS JOIN StatementLines sl
        LEFT JOIN ReconciliationMatches rm_tx ON t.transaction_id = rm_tx.transaction_id AND rm_tx.active = 1
        LEFT JOIN ReconciliationMatches rm_stmt ON sl.statement_line_id = rm_stmt.statement_line_id AND rm_stmt.active = 1
        WHERE t.user_id = ? AND t.account_id = ?
        AND sl.user_id = ? AND sl.account_id = ?
        AND t.posted_status = 'posted'
        AND t.is_transfer = 0
        AND rm_tx.transaction_id IS NULL
        AND rm_stmt.statement_line_id IS NULL
        AND ABS(t.signed_amount - sl.signed_amount) <= ?
        AND julianday(t.transaction_date) >= julianday(sl.txn_date) - ${dateTolDays} 
        AND julianday(t.transaction_date) <= julianday(sl.txn_date) + ${dateTolDays}
        ORDER BY amount_diff ASC, ABS(julianday(t.transaction_date) - julianday(sl.txn_date)) ASC
      `;
      
      db.all(sql, [userId, accountId, userId, accountId, amountTol], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Update import status
   * @param {string} importId - Import ID
   * @param {string} status - Status ('pending', 'processing', 'completed', 'failed')
   * @returns {Promise<void>}
   */
  updateImportStatus: (importId, status) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE StatementImports 
        SET status = ?, updated_at = ?
        WHERE import_id = ?
      `;
      
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      db.run(sql, [status, getCurrentTimestamp(), importId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Update import integrity status and notes
   * @param {string} importId - Import ID
   * @param {string} integrityStatus - Integrity status ('ok', 'mismatch', 'unknown')
   * @param {string} integrityNotes - Notes about integrity check
   * @returns {Promise<void>}
   */
  updateImportIntegrity: (importId, integrityStatus, integrityNotes = null) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE StatementImports 
        SET integrity_status = ?, integrity_notes = ?, updated_at = ?
        WHERE import_id = ?
      `;
      
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      db.run(sql, [integrityStatus, integrityNotes, getCurrentTimestamp(), importId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Update statement name
   * @param {string} importId - Import ID
   * @param {string} userId - User ID (for security check)
   * @param {string} statementName - New statement name
   * @returns {Promise<void>}
   */
  updateStatementName: (importId, userId, statementName) => {
    return new Promise((resolve, reject) => {
      if (!statementName || statementName.trim() === '') {
        return reject(new Error('Statement name cannot be empty'));
      }

      const sql = `
        UPDATE StatementImports 
        SET statement_name = ?, updated_at = ?
        WHERE import_id = ? AND user_id = ?
      `;
      
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      db.run(sql, [statementName.trim(), getCurrentTimestamp(), importId, userId], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: statement_name')) {
            reject(new Error(`Statement name "${statementName}" already exists. Please choose a different name.`));
          } else {
            reject(err);
          }
        } else {
          if (this.changes === 0) {
            reject(new Error('Statement not found or access denied'));
          } else {
            resolve();
          }
        }
      });
    });
  },

  /**
   * Append error message to import error log
   * @param {string} importId - Import ID
   * @param {string} errorMessage - Error message to append
   * @returns {Promise<void>}
   */
  appendImportError: (importId, errorMessage) => {
    return new Promise((resolve, reject) => {
      // Get current error log
      db.get('SELECT error_log FROM StatementImports WHERE import_id = ?', [importId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        const currentLog = row?.error_log || '';
        const { getCurrentTimestamp } = require('../utils/dateUtils');
        const timestamp = getCurrentTimestamp();
        const newEntry = `[${timestamp}] ${errorMessage}`;
        const updatedLog = currentLog ? `${currentLog}\n${newEntry}` : newEntry;
        
        const sql = `
          UPDATE StatementImports 
          SET error_log = ?, updated_at = ?
          WHERE import_id = ?
        `;
        
      db.run(sql, [updatedLog, getCurrentTimestamp(), importId], function(updateErr) {
          if (updateErr) {
            reject(updateErr);
          } else {
            resolve();
          }
        });
      });
    });
  },

  /**
   * Sum signed amounts for all statement lines in an import
   * @param {string} importId - Import ID
   * @returns {Promise<number>} - Sum of signed amounts
   */
  sumSignedAmounts: (importId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COALESCE(SUM(signed_amount), 0) as total
        FROM StatementLines
        WHERE import_id = ?
      `;
      
      db.get(sql, [importId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row?.total || 0);
        }
      });
    });
  },

  /**
   * Delete import and all associated lines
   * @param {string} importId - Import ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - { deletedCount }
   */
  deleteImport: (importId, userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // First, delete any reconciliation matches for statement lines from this import
        const deleteMatchesSQL = `
          DELETE FROM ReconciliationMatches 
          WHERE statement_line_id IN (
            SELECT statement_line_id FROM StatementLines 
            WHERE import_id = ? AND user_id = ?
          )
        `;
        
        db.run(deleteMatchesSQL, [importId, userId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          
          const matchCount = this.changes;
          
          // Delete statement lines (foreign key constraint)
          db.run('DELETE FROM StatementLines WHERE import_id = ? AND user_id = ?', [importId, userId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const lineCount = this.changes;
            
            // Delete import
            db.run('DELETE FROM StatementImports WHERE import_id = ? AND user_id = ?', [importId, userId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                } else {
                  resolve({ 
                    deletedCount: lineCount + this.changes,
                    matchesDeleted: matchCount,
                    linesDeleted: lineCount
                  });
                }
              });
            });
          });
        });
      });
    });
  }
};

module.exports = statementDAO;
