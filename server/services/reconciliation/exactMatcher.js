// server/services/reconciliation/exactMatcher.js

const statementDAO = require('../../models/statement_dao');

/**
 * Exact Matcher Service
 * Finds 1:1 exact matches between transactions and statement lines
 * Uses amount tolerance (±0.005) and date tolerance (±1 day)
 */

/**
 * Find exact matches for a reconciliation session
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} sessionParams - Session parameters
 * @param {number} sessionParams.amount_tol - Amount tolerance (default: 0.005)
 * @param {number} sessionParams.date_tol_days - Date tolerance in days (default: 1)
 * @param {Array} sessionParams.importIds - Array of import IDs to include
 * @returns {Promise<Array>} - Array of exact matches
 */
async function findExactMatches(userId, accountId, sessionParams) {
  const {
    amount_tol = 0.005,
    date_tol_days = 1,
    importIds = []
  } = sessionParams;

  try {
    // Get candidate pairs from the database
    const candidates = await statementDAO.getCandidatePairs(
      userId, 
      accountId, 
      amount_tol, 
      date_tol_days
    );

    // Filter candidates to only include specified imports if provided
    let filteredCandidates = candidates;
    if (importIds.length > 0) {
      filteredCandidates = candidates.filter(candidate => 
        importIds.includes(candidate.import_id)
      );
    }

    // Convert candidates to exact matches
    const exactMatches = filteredCandidates.map(candidate => ({
      transaction_id: candidate.transaction_id,
      statement_line_id: candidate.statement_line_id,
      confidence: 100, // Exact matches always have 100% confidence
      rule: 'exact',
      amount_diff: candidate.amount_diff,
      date_diff_days: Math.abs(
        require('../../utils/dateUtils').daysDifference(candidate.stmt_date, candidate.transaction_date) || 0
      )
    }));

    return exactMatches;

  } catch (error) {
    // Error will be caught by error handler middleware
    // Only log in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in exact matcher:', error);
    }
    throw new Error(`Exact matching failed: ${error.message}`);
  }
}

/**
 * Validate exact match criteria
 * @param {Object} candidate - Candidate pair
 * @param {Object} params - Matching parameters
 * @returns {boolean} - True if candidate meets exact match criteria
 */
function validateExactMatch(candidate, params) {
  const { amount_tol = 0.005, date_tol_days = 1 } = params;

  // Check amount tolerance
  if (candidate.amount_diff > amount_tol) {
    return false;
  }

  // Check date tolerance
  const { daysDifference } = require('../../utils/dateUtils');
  const dateDiff = Math.abs(
    daysDifference(candidate.stmt_date, candidate.transaction_date) || 0
  );
  if (dateDiff > date_tol_days) {
    return false;
  }

  // Check that both are posted transactions
  if (candidate.posted_status !== 'posted') {
    return false;
  }

  // Check that transaction is not a transfer
  if (candidate.is_transfer === 1) {
    return false;
  }

  return true;
}

/**
 * Check for duplicate matches (same transaction or statement line)
 * @param {Array} matches - Array of matches
 * @returns {Object} - Duplicate analysis
 */
function checkForDuplicates(matches) {
  const transactionIds = new Set();
  const statementLineIds = new Set();
  const duplicates = {
    transactions: [],
    statementLines: []
  };

  for (const match of matches) {
    if (transactionIds.has(match.transaction_id)) {
      duplicates.transactions.push(match.transaction_id);
    } else {
      transactionIds.add(match.transaction_id);
    }

    if (statementLineIds.has(match.statement_line_id)) {
      duplicates.statementLines.push(match.statement_line_id);
    } else {
      statementLineIds.add(match.statement_line_id);
    }
  }

  return {
    hasDuplicates: duplicates.transactions.length > 0 || duplicates.statementLines.length > 0,
    duplicates
  };
}

module.exports = {
  findExactMatches,
  validateExactMatch,
  checkForDuplicates
};
