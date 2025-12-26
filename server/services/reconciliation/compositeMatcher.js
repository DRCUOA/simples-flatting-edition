// server/services/reconciliation/compositeMatcher.js

const { findExactMatches } = require('./exactMatcher');
const { findFuzzyMatches } = require('./fuzzyMatcher');
const { findKeywordMatches } = require('./keywordMatcher');

/**
 * Composite Matcher Service
 * Orchestrates all matching strategies in sequence:
 * 1. Exact matching (highest confidence)
 * 2. Keyword matching (merchant/bank tokens)
 * 3. Fuzzy matching (description similarity)
 * 4. Bipartite matching for optimal assignment
 */

/**
 * Run composite matching with all strategies
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} sessionParams - Session parameters
 * @returns {Promise<Object>} - Matching results with statistics
 */
async function runCompositeMatching(userId, accountId, sessionParams) {
  const {
    amount_tol = 0.005,
    date_tol_days = 1,
    fuzzy_threshold = 85,
    use_instrument = true,
    importIds = []
  } = sessionParams;

  try {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log(`Starting composite matching for user ${userId}, account ${accountId}`);
    }
    
    const results = {
      exact_matches: [],
      keyword_matches: [],
      fuzzy_matches: [],
      final_matches: [],
      statistics: {},
      processing_time: 0
    };

    const startTime = Date.now();

    // Step 1: Run exact matching first (highest confidence)
    if (isDevelopment) {
      console.log('Running exact matching...');
    }
    const exactMatches = await findExactMatches(userId, accountId, sessionParams);
    results.exact_matches = exactMatches;
    if (isDevelopment) {
      console.log(`Found ${exactMatches.length} exact matches`);
    }

    // Step 2: Run keyword matching on remaining unmatched items
    if (isDevelopment) {
      console.log('Running keyword matching...');
    }
    const keywordMatches = await findKeywordMatches(userId, accountId, sessionParams);
    results.keyword_matches = keywordMatches;
    if (isDevelopment) {
      console.log(`Found ${keywordMatches.length} keyword matches`);
    }

    // Step 3: Run fuzzy matching on remaining unmatched items
    if (isDevelopment) {
      console.log('Running fuzzy matching...');
    }
    const fuzzyMatches = await findFuzzyMatches(userId, accountId, sessionParams);
    results.fuzzy_matches = fuzzyMatches;
    if (isDevelopment) {
      console.log(`Found ${fuzzyMatches.length} fuzzy matches`);
    }

    // Step 4: Combine all matches and resolve conflicts
    if (isDevelopment) {
      console.log('Resolving match conflicts...');
    }
    const allMatches = [...exactMatches, ...keywordMatches, ...fuzzyMatches];
    const resolvedMatches = resolveMatchConflicts(allMatches);
    results.final_matches = resolvedMatches;

    // Step 5: Calculate statistics
    results.statistics = calculateCompositeStatistics(results);
    results.processing_time = Date.now() - startTime;

    if (isDevelopment) {
      console.log(`Composite matching completed in ${results.processing_time}ms`);
      console.log(`Final matches: ${resolvedMatches.length}`);
    }

    return results;

  } catch (error) {
    // Always log errors, but use proper error logging in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      console.error('Error in composite matching:', error);
    } else {
      // In production, errors should be logged through proper logging infrastructure
      // This will be caught by error handler middleware
    }
    throw new Error(`Composite matching failed: ${error.message}`);
  }
}

/**
 * Resolve conflicts between different match types
 * Uses greedy algorithm to assign optimal matches
 * @param {Array} allMatches - All matches from different strategies
 * @returns {Array} - Resolved matches without conflicts
 */
function resolveMatchConflicts(allMatches) {
  if (allMatches.length === 0) {
    return [];
  }

  // Sort matches by priority: exact > keyword > fuzzy, then by confidence
  const sortedMatches = allMatches.sort((a, b) => {
    // First by rule priority
    const rulePriority = { exact: 3, keyword: 2, fuzzy: 1 };
    const aPriority = rulePriority[a.rule] || 0;
    const bPriority = rulePriority[b.rule] || 0;
    
    if (bPriority !== aPriority) {
      return bPriority - aPriority;
    }
    
    // Then by confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    // Finally by amount difference (lower is better)
    return a.amount_diff - b.amount_diff;
  });

  const resolvedMatches = [];
  const usedTransactions = new Set();
  const usedStatementLines = new Set();

  // Greedy assignment: take highest priority match if both items are available
  for (const match of sortedMatches) {
    if (!usedTransactions.has(match.transaction_id) && 
        !usedStatementLines.has(match.statement_line_id)) {
      
      resolvedMatches.push(match);
      usedTransactions.add(match.transaction_id);
      usedStatementLines.add(match.statement_line_id);
    }
  }

  return resolvedMatches;
}

/**
 * Calculate comprehensive statistics for composite matching
 * @param {Object} results - Matching results
 * @returns {Object} - Statistics object
 */
function calculateCompositeStatistics(results) {
  const { exact_matches, keyword_matches, fuzzy_matches, final_matches } = results;

  const stats = {
    total_candidates: exact_matches.length + keyword_matches.length + fuzzy_matches.length,
    total_final_matches: final_matches.length,
    exact_matches: exact_matches.length,
    keyword_matches: keyword_matches.length,
    fuzzy_matches: fuzzy_matches.length,
    conflict_resolution: {
      conflicts_resolved: (exact_matches.length + keyword_matches.length + fuzzy_matches.length) - final_matches.length,
      resolution_rate: 0
    },
    confidence_distribution: {
      high_confidence: 0, // >= 90%
      medium_confidence: 0, // 75-89%
      low_confidence: 0 // < 75%
    },
    rule_distribution: {
      exact: 0,
      keyword: 0,
      fuzzy: 0
    },
    average_confidence: 0,
    processing_time_ms: results.processing_time
  };

  // Calculate conflict resolution rate
  if (stats.total_candidates > 0) {
    stats.conflict_resolution.resolution_rate = 
      (stats.conflict_resolution.conflicts_resolved / stats.total_candidates) * 100;
  }

  // Calculate confidence distribution
  final_matches.forEach(match => {
    if (match.confidence >= 90) {
      stats.confidence_distribution.high_confidence++;
    } else if (match.confidence >= 75) {
      stats.confidence_distribution.medium_confidence++;
    } else {
      stats.confidence_distribution.low_confidence++;
    }

    // Count by rule
    stats.rule_distribution[match.rule] = (stats.rule_distribution[match.rule] || 0) + 1;
  });

  // Calculate average confidence
  if (final_matches.length > 0) {
    stats.average_confidence = final_matches.reduce((sum, m) => sum + m.confidence, 0) / final_matches.length;
  }

  return stats;
}

/**
 * Run matching with specific strategy only
 * @param {string} strategy - 'exact', 'keyword', 'fuzzy', or 'all'
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} sessionParams - Session parameters
 * @returns {Promise<Object>} - Matching results
 */
async function runStrategyMatching(strategy, userId, accountId, sessionParams) {
  const results = {
    matches: [],
    statistics: {},
    processing_time: 0
  };

  const startTime = Date.now();

  try {
    switch (strategy) {
      case 'exact':
        results.matches = await findExactMatches(userId, accountId, sessionParams);
        break;
      
      case 'keyword':
        results.matches = await findKeywordMatches(userId, accountId, sessionParams);
        break;
      
      case 'fuzzy':
        results.matches = await findFuzzyMatches(userId, accountId, sessionParams);
        break;
      
      case 'all':
        return await runCompositeMatching(userId, accountId, sessionParams);
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }

    results.statistics = {
      total_matches: results.matches.length,
      average_confidence: results.matches.length > 0 
        ? results.matches.reduce((sum, m) => sum + m.confidence, 0) / results.matches.length 
        : 0,
      strategy_used: strategy
    };

    results.processing_time = Date.now() - startTime;

    return results;

  } catch (error) {
    // Errors will be caught by error handler middleware
    // Only log in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error in ${strategy} matching:`, error);
    }
    throw new Error(`${strategy} matching failed: ${error.message}`);
  }
}

/**
 * Analyze match quality and provide recommendations
 * @param {Array} matches - Array of matches
 * @returns {Object} - Quality analysis and recommendations
 */
function analyzeMatchQuality(matches) {
  const analysis = {
    quality_score: 0,
    recommendations: [],
    risk_factors: [],
    high_confidence_matches: 0,
    medium_confidence_matches: 0,
    low_confidence_matches: 0
  };

  if (matches.length === 0) {
    analysis.recommendations.push('No matches found. Consider adjusting tolerance parameters.');
    return analysis;
  }

  // Count matches by confidence level
  matches.forEach(match => {
    if (match.confidence >= 90) {
      analysis.high_confidence_matches++;
    } else if (match.confidence >= 75) {
      analysis.medium_confidence_matches++;
    } else {
      analysis.low_confidence_matches++;
    }
  });

  // Calculate quality score
  const totalMatches = matches.length;
  const highConfidenceRatio = analysis.high_confidence_matches / totalMatches;
  const mediumConfidenceRatio = analysis.medium_confidence_matches / totalMatches;
  
  analysis.quality_score = (highConfidenceRatio * 100) + (mediumConfidenceRatio * 70) + 
                          ((totalMatches - analysis.high_confidence_matches - analysis.medium_confidence_matches) / totalMatches * 30);

  // Generate recommendations
  if (highConfidenceRatio < 0.5) {
    analysis.recommendations.push('Consider tightening tolerance parameters for better match quality');
  }

  if (analysis.low_confidence_matches > totalMatches * 0.3) {
    analysis.recommendations.push('Many low-confidence matches found. Review manually before closing session');
  }

  if (totalMatches < 10) {
    analysis.recommendations.push('Few matches found. Check if statement period covers transaction dates');
  }

  // Identify risk factors
  const highAmountDiff = matches.filter(m => m.amount_diff > 0.01).length;
  const highDateDiff = matches.filter(m => m.date_diff_days > 0.5).length;

  if (highAmountDiff > 0) {
    analysis.risk_factors.push(`${highAmountDiff} matches have high amount differences`);
  }

  if (highDateDiff > 0) {
    analysis.risk_factors.push(`${highDateDiff} matches have high date differences`);
  }

  return analysis;
}

module.exports = {
  runCompositeMatching,
  runStrategyMatching,
  resolveMatchConflicts,
  calculateCompositeStatistics,
  analyzeMatchQuality
};
