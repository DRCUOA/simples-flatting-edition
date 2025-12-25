// server/utils/statementNormalizer.js

const { normalizeAppDate } = require('./dateUtils');

/**
 * Statement Description Normalizer
 * Normalizes bank/card statement descriptions for consistent matching
 */

/**
 * Normalize a description string for matching
 * @param {string} description - Raw description from statement
 * @returns {string} - Normalized description
 */
function normalizeDescription(description) {
  if (!description || typeof description !== 'string') {
    return '';
  }

  return description
    .toLowerCase()
    .trim()
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove common punctuation and special characters
    .replace(/[^\w\s]/g, '')
    // Remove common bank/transaction boilerplate
    .replace(/\b(transfer|payment|withdrawal|deposit|fee|charge|interest|refund)\b/g, '')
    // Remove common merchant suffixes
    .replace(/\b(inc|ltd|llc|corp|company|co|pl|pty)\b/g, '')
    // Remove common prefixes
    .replace(/\b(pos|atm|eftpos|card|debit|credit)\b/g, '')
    // Remove numbers that are likely reference numbers
    .replace(/\b\d{4,}\b/g, '')
    // Final cleanup
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract merchant keywords from normalized description
 * @param {string} normalizedDesc - Normalized description
 * @returns {string[]} - Array of merchant keywords
 */
function extractMerchantKeywords(normalizedDesc) {
  if (!normalizedDesc) return [];
  
  return normalizedDesc
    .split(' ')
    .filter(word => word.length > 2) // Only words longer than 2 chars
    .filter(word => !isCommonWord(word)) // Remove common words
    .slice(0, 5); // Limit to 5 keywords max
}

/**
 * Check if a word is a common word that should be filtered out
 * @param {string} word - Word to check
 * @returns {boolean} - True if common word
 */
function isCommonWord(word) {
  const commonWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'to', 'of', 'in', 'on', 'at',
    'by', 'or', 'but', 'if', 'when', 'where', 'how', 'why', 'what',
    'new', 'old', 'big', 'small', 'good', 'bad', 'best', 'worst',
    'first', 'last', 'next', 'previous', 'other', 'same', 'different',
    'more', 'less', 'most', 'least', 'many', 'few', 'some', 'all',
    'any', 'each', 'every', 'both', 'either', 'neither', 'none'
  ]);
  
  return commonWords.has(word.toLowerCase());
}

/**
 * Generate a normalized hash for deduplication
 * @param {Object} lineData - Statement line data
 * @param {string} lineData.txn_date - Transaction date
 * @param {string} lineData.description_norm - Normalized description
 * @param {number} lineData.signed_amount - Signed amount
 * @param {string} lineData.transaction_type_norm - Transaction type
 * @param {string} [lineData.instrument_id] - Instrument ID (for card statements)
 * @returns {string} - SHA-256 hash
 */
function generateDedupeHash(lineData) {
  const crypto = require('crypto');
  
  const { txn_date, description_norm, signed_amount, transaction_type_norm, instrument_id } = lineData;
  
  // For card statements, include instrument_id in hash
  const hashInput = instrument_id 
    ? `${txn_date}|${instrument_id}|${description_norm}|${signed_amount}|${transaction_type_norm}`
    : `${txn_date}|${description_norm}|${signed_amount}|${transaction_type_norm}`;
  
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Parse and normalize a date string
 * @param {string} dateStr - Date string in various formats
 * @returns {Object} - { parsed: string|null, error: string|null, original: string }
 */
function normalizeDate(dateStr) {
  // Use central date utility for bank import format
  return normalizeAppDate(dateStr, 'bank-import');
}

module.exports = {
  normalizeDescription,
  extractMerchantKeywords,
  generateDedupeHash,
  normalizeDate
};
