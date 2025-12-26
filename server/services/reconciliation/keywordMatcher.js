// server/services/reconciliation/keywordMatcher.js

const statementDAO = require('../../models/statement_dao');

/**
 * Keyword Matcher Service
 * Matches transactions to statement lines based on merchant/bank token overlap
 * Extracts meaningful keywords and finds matches with 2+ token overlap
 */

/**
 * Find keyword matches for unmatched transactions and statement lines
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} sessionParams - Session parameters
 * @param {number} sessionParams.amount_tol - Amount tolerance (default: 0.005)
 * @param {number} sessionParams.date_tol_days - Date tolerance in days (default: 1)
 * @param {Array} sessionParams.importIds - Array of import IDs to include
 * @returns {Promise<Array>} - Array of keyword matches
 */
async function findKeywordMatches(userId, accountId, sessionParams) {
  const {
    amount_tol = 0.005,
    date_tol_days = 1,
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

    const matches = [];

    // For each transaction, find keyword matches
    for (const transaction of unmatchedTransactions) {
      const transactionKeywords = extractKeywords(transaction.description_norm || transaction.description || '');
      
      if (transactionKeywords.length < 2) {
        continue; // Need at least 2 keywords for meaningful matching
      }

      for (const statementLine of unmatchedStatementLines) {
        const statementKeywords = extractKeywords(statementLine.description_norm || statementLine.description || '');
        
        if (statementKeywords.length < 2) {
          continue;
        }

        // Calculate keyword overlap
        const overlap = calculateKeywordOverlap(transactionKeywords, statementKeywords);
        
        if (overlap.count >= 2) { // Require at least 2 overlapping keywords
          // Validate match criteria
          if (validateKeywordMatch(transaction, statementLine, {
            amount_tol,
            date_tol_days
          })) {
            const confidence = calculateKeywordConfidence(overlap, transactionKeywords, statementKeywords);
            
            matches.push({
              transaction_id: transaction.transaction_id,
              statement_line_id: statementLine.statement_line_id,
              confidence: Math.min(confidence, 95), // Cap at 95% for keyword matches
              rule: 'keyword',
              amount_diff: Math.abs(transaction.signed_amount - statementLine.signed_amount),
              date_diff_days: Math.abs(
                require('../../utils/dateUtils').daysDifference(statementLine.txn_date, transaction.transaction_date) || 0
              ),
              keyword_overlap: overlap.count,
              keyword_ratio: overlap.ratio,
              transaction_keywords: transactionKeywords,
              statement_keywords: statementKeywords,
              common_keywords: overlap.common,
              transaction_description: transaction.description,
              statement_description: statementLine.description
            });
          }
        }
      }
    }

    // Sort by confidence (descending) and keyword overlap
    return matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.keyword_overlap - a.keyword_overlap;
    });

  } catch (error) {
    // Error will be caught by error handler middleware
    // Only log in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in keyword matcher:', error);
    }
    throw new Error(`Keyword matching failed: ${error.message}`);
  }
}

/**
 * Extract meaningful keywords from description
 * @param {string} description - Description text
 * @returns {Array<string>} - Array of keywords
 */
function extractKeywords(description) {
  if (!description || typeof description !== 'string') {
    return [];
  }

  // Normalize and split into words
  const words = description
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .split(' ')
    .filter(word => word.length > 2); // Filter out short words

  // Remove common stop words
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'under', 'over', 'around', 'near',
    'far', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who',
    'which', 'that', 'this', 'these', 'those', 'a', 'an', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'
  ]);

  // Filter out stop words and duplicates
  const keywords = [...new Set(words.filter(word => !stopWords.has(word)))];

  return keywords;
}

/**
 * Calculate keyword overlap between two sets
 * @param {Array<string>} keywords1 - First set of keywords
 * @param {Array<string>} keywords2 - Second set of keywords
 * @returns {Object} - Overlap analysis
 */
function calculateKeywordOverlap(keywords1, keywords2) {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const common = keywords1.filter(keyword => set2.has(keyword));
  const count = common.length;
  const ratio = count / Math.max(keywords1.length, keywords2.length);

  return {
    common,
    count,
    ratio
  };
}

/**
 * Calculate confidence based on keyword overlap
 * @param {Object} overlap - Overlap analysis
 * @param {Array<string>} txKeywords - Transaction keywords
 * @param {Array<string>} stmtKeywords - Statement keywords
 * @returns {number} - Confidence score (0-100)
 */
function calculateKeywordConfidence(overlap, txKeywords, stmtKeywords) {
  const { count, ratio } = overlap;
  
  // Base confidence on overlap count and ratio
  let confidence = 0;
  
  // Count-based scoring
  if (count >= 5) {
    confidence += 40;
  } else if (count >= 4) {
    confidence += 35;
  } else if (count >= 3) {
    confidence += 30;
  } else if (count >= 2) {
    confidence += 25;
  }
  
  // Ratio-based scoring
  if (ratio >= 0.8) {
    confidence += 30;
  } else if (ratio >= 0.6) {
    confidence += 25;
  } else if (ratio >= 0.4) {
    confidence += 20;
  } else if (ratio >= 0.2) {
    confidence += 15;
  }
  
  // Bonus for exact keyword matches
  const exactMatches = overlap.common.filter(keyword => 
    txKeywords.includes(keyword) && stmtKeywords.includes(keyword)
  );
  if (exactMatches.length > 0) {
    confidence += Math.min(exactMatches.length * 5, 20);
  }
  
  return Math.min(confidence, 95);
}

/**
 * Validate keyword match criteria
 * @param {Object} transaction - Transaction object
 * @param {Object} statementLine - Statement line object
 * @param {Object} params - Matching parameters
 * @returns {boolean} - True if match is valid
 */
function validateKeywordMatch(transaction, statementLine, params) {
  const { amount_tol, date_tol_days } = params;

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
 * Get match statistics for keyword matching
 * @param {Array} matches - Array of keyword matches
 * @returns {Object} - Match statistics
 */
function getKeywordMatchStatistics(matches) {
  const stats = {
    total_matches: matches.length,
    keyword_matches: matches.filter(m => m.rule === 'keyword').length,
    average_confidence: 0,
    average_keyword_overlap: 0,
    high_overlap_matches: 0, // >= 4 keywords
    medium_overlap_matches: 0, // 2-3 keywords
    low_overlap_matches: 0 // < 2 keywords
  };

  if (matches.length > 0) {
    stats.average_confidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    stats.average_keyword_overlap = matches.reduce((sum, m) => sum + m.keyword_overlap, 0) / matches.length;
    
    matches.forEach(match => {
      if (match.keyword_overlap >= 4) {
        stats.high_overlap_matches++;
      } else if (match.keyword_overlap >= 2) {
        stats.medium_overlap_matches++;
      } else {
        stats.low_overlap_matches++;
      }
    });
  }

  return stats;
}

/**
 * Analyze keyword match quality
 * @param {Array} matches - Array of keyword matches
 * @returns {Object} - Quality analysis
 */
function analyzeKeywordMatchQuality(matches) {
  const analysis = {
    high_quality_matches: [],
    medium_quality_matches: [],
    low_quality_matches: []
  };

  matches.forEach(match => {
    const qualityScore = match.keyword_overlap * 20 + match.keyword_ratio * 30 + match.confidence * 0.5;
    
    if (qualityScore >= 80) {
      analysis.high_quality_matches.push(match);
    } else if (qualityScore >= 60) {
      analysis.medium_quality_matches.push(match);
    } else {
      analysis.low_quality_matches.push(match);
    }
  });

  return analysis;
}

module.exports = {
  findKeywordMatches,
  extractKeywords,
  calculateKeywordOverlap,
  calculateKeywordConfidence,
  validateKeywordMatch,
  getKeywordMatchStatistics,
  analyzeKeywordMatchQuality
};
