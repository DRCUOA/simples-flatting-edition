// server/services/reconciliation/fuzzyMatcher.js

const { Searcher } = require('fast-fuzzy');
const statementDAO = require('../../models/statement_dao');

/**
 * Fuzzy Matcher Service
 * Uses token-based description matching with fast-fuzzy library
 * Matches transactions to statement lines based on description similarity
 */

/**
 * Find fuzzy matches for unmatched transactions and statement lines
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} sessionParams - Session parameters
 * @param {number} sessionParams.amount_tol - Amount tolerance (default: 0.005)
 * @param {number} sessionParams.date_tol_days - Date tolerance in days (default: 1)
 * @param {number} sessionParams.fuzzy_threshold - Minimum similarity threshold (default: 85)
 * @param {Array} sessionParams.importIds - Array of import IDs to include
 * @returns {Promise<Array>} - Array of fuzzy matches
 */
async function findFuzzyMatches(userId, accountId, sessionParams) {
  const {
    amount_tol = 0.005,
    date_tol_days = 1,
    fuzzy_threshold = 85,
    importIds = []
  } = sessionParams;

  try {
    // Get unmatched transactions and statement lines
    const [unmatchedTransactions, unmatchedStatementLines] = await Promise.all([
      getUnmatchedTransactions(userId, accountId),
      getUnmatchedStatementLines(userId, accountId, importIds)
    ]);

    if (unmatchedTransactions.length === 0 || unmatchedStatementLines.length === 0) {
      return [];
    }

    // Create fuzzy searcher for statement line descriptions
    const statementDescriptions = unmatchedStatementLines.map(line => ({
      id: line.statement_line_id,
      text: line.description_norm || line.description || '',
      line: line
    }));

    const searcher = new Searcher(statementDescriptions, {
      keySelector: (item) => item.text,
      threshold: fuzzy_threshold / 100, // Convert percentage to decimal
      normalizeWhitespace: true,
      ignoreCase: true
    });

    const matches = [];

    // For each unmatched transaction, find fuzzy matches
    for (const transaction of unmatchedTransactions) {
      const transactionText = transaction.description_norm || transaction.description || '';
      
      if (!transactionText.trim()) {
        continue; // Skip transactions with no description
      }

      // Search for fuzzy matches
      const searchResults = searcher.search(transactionText);
      
      for (const result of searchResults) {
        const statementLine = result.item.line;
        
        // Validate match criteria
        if (validateFuzzyMatch(transaction, statementLine, {
          amount_tol,
          date_tol_days,
          fuzzy_threshold
        })) {
          const confidence = Math.round(result.score * 100);
          
          matches.push({
            transaction_id: transaction.transaction_id,
            statement_line_id: statementLine.statement_line_id,
            confidence: Math.min(confidence, 90), // Cap at 90% for fuzzy matches
            rule: 'fuzzy',
            amount_diff: Math.abs(transaction.signed_amount - statementLine.signed_amount),
            date_diff_days: Math.abs(
              require('../../utils/dateUtils').daysDifference(statementLine.txn_date, transaction.transaction_date) || 0
            ),
            similarity_score: confidence,
            transaction_description: transaction.description,
            statement_description: statementLine.description
          });
        }
      }
    }

    // Sort by confidence (descending) and similarity score
    return matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.similarity_score - a.similarity_score;
    });

  } catch (error) {
    console.error('Error in fuzzy matcher:', error);
    throw new Error(`Fuzzy matching failed: ${error.message}`);
  }
}

/**
 * Validate fuzzy match criteria
 * @param {Object} transaction - Transaction object
 * @param {Object} statementLine - Statement line object
 * @param {Object} params - Matching parameters
 * @returns {boolean} - True if match is valid
 */
function validateFuzzyMatch(transaction, statementLine, params) {
  const { amount_tol, date_tol_days, fuzzy_threshold } = params;

  // Check amount tolerance
  const amountDiff = Math.abs(transaction.signed_amount - statementLine.signed_amount);
  if (amountDiff > amount_tol) {
    return false;
  }

  // Check date tolerance
  const dateDiff = Math.abs(
    require('../../utils/dateUtils').daysDifference(statementLine.txn_date, transaction.transaction_date) || 0
  );
  if (dateDiff > date_tol_days) {
    return false;
  }

  // Check that signs match (both positive or both negative)
  if ((transaction.signed_amount > 0) !== (statementLine.signed_amount > 0)) {
    return false;
  }

  // Check that transaction is posted and not a transfer
  if (transaction.posted_status !== 'posted' || transaction.is_transfer === 1) {
    return false;
  }

  return true;
}

/**
 * Get unmatched transactions for an account
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Array>} - Array of unmatched transactions
 */
async function getUnmatchedTransactions(userId, accountId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT t.*, a.account_name
      FROM Transactions t
      JOIN Accounts a ON t.account_id = a.account_id
      LEFT JOIN ReconciliationMatches rm ON t.transaction_id = rm.transaction_id AND rm.active = 1
      WHERE t.user_id = ? AND t.account_id = ?
      AND t.posted_status = 'posted'
      AND t.is_transfer = 0
      AND rm.transaction_id IS NULL
      ORDER BY t.transaction_date DESC
    `;

    const db = require('../../db/index').getConnection();
    db.all(sql, [userId, accountId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get unmatched statement lines for an account
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Array} importIds - Optional import ID filter
 * @returns {Promise<Array>} - Array of unmatched statement lines
 */
async function getUnmatchedStatementLines(userId, accountId, importIds = []) {
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

    const db = require('../../db/index').getConnection();
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get match statistics for fuzzy matching
 * @param {Array} matches - Array of fuzzy matches
 * @returns {Object} - Match statistics
 */
function getFuzzyMatchStatistics(matches) {
  const stats = {
    total_matches: matches.length,
    fuzzy_matches: matches.filter(m => m.rule === 'fuzzy').length,
    average_confidence: 0,
    average_similarity: 0,
    high_confidence_matches: 0, // >= 85%
    medium_confidence_matches: 0, // 75-84%
    low_confidence_matches: 0 // < 75%
  };

  if (matches.length > 0) {
    stats.average_confidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    stats.average_similarity = matches.reduce((sum, m) => sum + m.similarity_score, 0) / matches.length;
    
    matches.forEach(match => {
      if (match.confidence >= 85) {
        stats.high_confidence_matches++;
      } else if (match.confidence >= 75) {
        stats.medium_confidence_matches++;
      } else {
        stats.low_confidence_matches++;
      }
    });
  }

  return stats;
}

/**
 * Filter matches by confidence threshold
 * @param {Array} matches - Array of matches
 * @param {number} minConfidence - Minimum confidence threshold
 * @returns {Array} - Filtered matches
 */
function filterByConfidence(matches, minConfidence = 75) {
  return matches.filter(match => match.confidence >= minConfidence);
}

/**
 * Check for potential false positives in fuzzy matches
 * @param {Array} matches - Array of fuzzy matches
 * @returns {Object} - False positive analysis
 */
function analyzeFalsePositives(matches) {
  const analysis = {
    potential_false_positives: [],
    high_risk_matches: [],
    safe_matches: []
  };

  matches.forEach(match => {
    const riskFactors = [];

    // High amount difference
    if (match.amount_diff > 0.01) {
      riskFactors.push('high_amount_diff');
    }

    // High date difference
    if (match.date_diff_days > 0.5) {
      riskFactors.push('high_date_diff');
    }

    // Low similarity score
    if (match.similarity_score < 80) {
      riskFactors.push('low_similarity');
    }

    // Very different description lengths
    const txDescLength = (match.transaction_description || '').length;
    const stmtDescLength = (match.statement_description || '').length;
    const lengthRatio = Math.min(txDescLength, stmtDescLength) / Math.max(txDescLength, stmtDescLength);
    if (lengthRatio < 0.3) {
      riskFactors.push('very_different_lengths');
    }

    if (riskFactors.length >= 2) {
      analysis.potential_false_positives.push({
        ...match,
        risk_factors: riskFactors
      });
    } else if (riskFactors.length === 1) {
      analysis.high_risk_matches.push({
        ...match,
        risk_factors: riskFactors
      });
    } else {
      analysis.safe_matches.push(match);
    }
  });

  return analysis;
}

module.exports = {
  findFuzzyMatches,
  validateFuzzyMatch,
  getFuzzyMatchStatistics,
  filterByConfidence,
  analyzeFalsePositives
};
