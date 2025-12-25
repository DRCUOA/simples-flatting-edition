// server/services/statement-mappers/cardMapper.js

const { normalizeDescription, normalizeDate, generateDedupeHash } = require('../../utils/statementNormalizer');
const calculateSignedAmount = require('../../utils/calculateSignedAmount');

/**
 * Card Statement CSV Mapper
 * Parses "Card, Type, Amount, Details, TransactionDate, ProcessedDate" format
 */

/**
 * Map card CSV row to normalized statement line
 * @param {Object} row - CSV row data
 * @param {Object} account - Account configuration
 * @param {string} importId - Import ID
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Object} - Normalized statement line object
 */
function mapCardRow(row, account, importId, userId, accountId) {
  const { v4: uuidv4 } = require('uuid');
  
  // Extract fields (case-insensitive)
  const card = row.Card || row.card || '';
  const type = row.Type || row.type || '';
  const amount = parseFloat(row.Amount || row.amount || 0);
  const details = row.Details || row.details || '';
  const transactionDate = row.TransactionDate || row.transactiondate || row.transaction_date || '';
  const processedDate = row.ProcessedDate || row.processeddate || row.processed_date || '';

  // Parse and validate transaction date
  const dateResult = normalizeDate(transactionDate);
  if (!dateResult.parsed) {
    throw new Error(`Invalid transaction date format: ${dateResult.error} (${dateResult.original})`);
  }

  // Parse processed date (optional, used for date tolerance)
  let processedDateParsed = null;
  if (processedDate) {
    const processedResult = normalizeDate(processedDate);
    if (processedResult.parsed) {
      processedDateParsed = processedResult.parsed;
    }
  }

  // Normalize transaction type
  const transactionTypeNorm = normalizeTransactionType(type);

  // Create description
  const description = String(details).trim();
  const descriptionNorm = normalizeDescription(description);

  // Extract instrument ID (last 4 digits of card number)
  const instrumentId = extractInstrumentId(card);

  // Calculate signed amount using account configuration and transaction type
  const signedAmount = calculateSignedAmount(account, { 
    amount, 
    transaction_type: transactionTypeNorm 
  });

  // Generate dedupe hash (include instrument_id for card statements)
  const dedupeHash = generateDedupeHash({
    txn_date: dateResult.parsed,
    instrument_id: instrumentId,
    description_norm: descriptionNorm,
    signed_amount: signedAmount,
    transaction_type_norm: transactionTypeNorm
  });

  return {
    statement_line_id: uuidv4(),
    import_id: importId,
    user_id: userId,
    account_id: accountId,
    txn_date: dateResult.parsed,
    raw_amount: amount,
    signed_amount: signedAmount,
    transaction_type_norm: transactionTypeNorm,
    description: description,
    description_norm: descriptionNorm,
    bank_reference: null, // Card statements don't have bank reference
    bank_fitid: null, // Card statements don't have FITID
    instrument_id: instrumentId,
    processed_date: processedDateParsed,
    dedupe_hash: dedupeHash,
    norm_version: 'v1',
    raw_row_json: JSON.stringify(row),
    created_at: require('../../utils/dateUtils').getCurrentTimestamp()
  };
}

/**
 * Normalize transaction type for card statements
 * @param {string} type - Raw transaction type
 * @returns {string} - Normalized type ('C'|'D'|null)
 */
function normalizeTransactionType(type) {
  if (!type) return null;
  
  const typeUpper = String(type).trim().toUpperCase();
  
  // Credit indicators
  if (typeUpper === 'C' || typeUpper === 'CREDIT' || typeUpper.startsWith('C')) {
    return 'C';
  }
  
  // Debit indicators  
  if (typeUpper === 'D' || typeUpper === 'DEBIT' || typeUpper.startsWith('D')) {
    return 'D';
  }
  
  return null;
}

/**
 * Extract instrument ID from card number
 * @param {string} card - Card number or identifier
 * @returns {string} - Last 4 digits or null
 */
function extractInstrumentId(card) {
  if (!card) return null;
  
  const cardStr = String(card).trim();
  
  // Extract last 4 digits
  const match = cardStr.match(/(\d{4})$/);
  if (match) {
    return match[1];
  }
  
  // If it's already 4 digits, use as-is
  if (/^\d{4}$/.test(cardStr)) {
    return cardStr;
  }
  
  return null;
}

/**
 * Validate card CSV headers
 * @param {string[]} headers - CSV headers
 * @returns {Object} - { valid: boolean, missing: string[], extra: string[] }
 */
function validateHeaders(headers) {
  const requiredHeaders = ['Card', 'Type', 'Amount', 'Details', 'TransactionDate', 'ProcessedDate'];
  const headerSet = new Set(headers.map(h => h.trim()));
  
  const missing = requiredHeaders.filter(h => !headerSet.has(h));
  const extra = headers.filter(h => !requiredHeaders.includes(h.trim()));
  
  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}

/**
 * Get field mappings for card format
 * @returns {Object} - Field mappings
 */
function getFieldMappings() {
  return {
    card: 'Card',
    type: 'Type',
    amount: 'Amount',
    details: 'Details',
    transactionDate: 'TransactionDate',
    processedDate: 'ProcessedDate'
  };
}

/**
 * Get format description
 * @returns {string} - Format description
 */
function getFormatDescription() {
  return 'Credit/debit card statement with columns: Card, Type, Amount, Details, TransactionDate, ProcessedDate';
}

/**
 * Get sample data structure
 * @returns {Object} - Sample data structure
 */
function getSampleData() {
  return {
    Card: '****1234',
    Type: 'DEBIT',
    Amount: -25.50,
    Details: 'COFFEE SHOP',
    TransactionDate: '15/10/2025',
    ProcessedDate: '16/10/2025'
  };
}

module.exports = {
  mapCardRow,
  normalizeTransactionType,
  extractInstrumentId,
  validateHeaders,
  getFieldMappings,
  getFormatDescription,
  getSampleData
};
