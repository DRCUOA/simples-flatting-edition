// server/services/statement-mappers/bankLedgerMapper.js

const { normalizeDescription, normalizeDate, generateDedupeHash } = require('../../utils/statementNormalizer');
const calculateSignedAmount = require('../../utils/calculateSignedAmount');

/**
 * Bank Ledger CSV Mapper
 * Parses "Type, Details, Particulars, Code, Reference, Amount, Date" format
 */

/**
 * Map bank ledger CSV row to normalized statement line
 * @param {Object} row - CSV row data
 * @param {Object} account - Account configuration
 * @param {string} importId - Import ID
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Object} - Normalized statement line object
 */
function mapBankLedgerRow(row, account, importId, userId, accountId) {
  const { v4: uuidv4 } = require('uuid');
  
  // Extract fields (case-insensitive)
  const type = row.Type || row.type || '';
  const details = row.Details || row.details || '';
  const particulars = row.Particulars || row.particulars || '';
  const code = row.Code || row.code || '';
  const reference = row.Reference || row.reference || '';
  const amount = parseFloat(row.Amount || row.amount || 0);
  const dateStr = row.Date || row.date || '';

  // Parse and validate date
  const dateResult = normalizeDate(dateStr);
  if (!dateResult.parsed) {
    throw new Error(`Invalid date format: ${dateResult.error} (${dateResult.original})`);
  }

  // Create description from multiple fields
  const descriptionParts = [type, details, particulars, code, reference]
    .filter(part => part && String(part).trim() !== '')
    .map(part => String(part).trim());
  
  const description = descriptionParts.join(' | ');
  const descriptionNorm = normalizeDescription(description);

  // Bank ledger doesn't have authoritative transaction type
  const transactionTypeNorm = null;

  // Calculate signed amount using account configuration
  const signedAmount = calculateSignedAmount(account, { 
    amount, 
    transaction_type: transactionTypeNorm 
  });

  // Generate dedupe hash (no instrument_id for bank ledger)
  const dedupeHash = generateDedupeHash({
    txn_date: dateResult.parsed,
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
    bank_reference: reference,
    bank_fitid: null, // Bank ledger doesn't have FITID
    instrument_id: null, // Bank ledger doesn't have instrument
    processed_date: null, // Bank ledger doesn't have processed date
    dedupe_hash: dedupeHash,
    norm_version: 'v1',
    raw_row_json: JSON.stringify(row),
    created_at: require('../../utils/dateUtils').getCurrentTimestamp()
  };
}

/**
 * Validate bank ledger CSV headers
 * @param {string[]} headers - CSV headers
 * @returns {Object} - { valid: boolean, missing: string[], extra: string[] }
 */
function validateHeaders(headers) {
  const requiredHeaders = ['Type', 'Details', 'Particulars', 'Code', 'Reference', 'Amount', 'Date'];
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
 * Get field mappings for bank ledger format
 * @returns {Object} - Field mappings
 */
function getFieldMappings() {
  return {
    type: 'Type',
    details: 'Details', 
    particulars: 'Particulars',
    code: 'Code',
    reference: 'Reference',
    amount: 'Amount',
    date: 'Date'
  };
}

/**
 * Get format description
 * @returns {string} - Format description
 */
function getFormatDescription() {
  return 'Bank account statement with columns: Type, Details, Particulars, Code, Reference, Amount, Date';
}

/**
 * Get sample data structure
 * @returns {Object} - Sample data structure
 */
function getSampleData() {
  return {
    Type: 'DEBIT',
    Details: 'ATM WITHDRAWAL',
    Particulars: '1234 MAIN ST',
    Code: 'ATM',
    Reference: '123456789',
    Amount: -50.00,
    Date: '15/10/2025'
  };
}

module.exports = {
  mapBankLedgerRow,
  validateHeaders,
  getFieldMappings,
  getFormatDescription,
  getSampleData
};
