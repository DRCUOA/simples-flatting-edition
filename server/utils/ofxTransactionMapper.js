// server/utils/ofxTransactionMapper.js

const { normalizeDescription } = require('./statementNormalizer');
const { parseOFXDate } = require('./ofxParser');
const { normalizeAppDate } = require('./dateUtils');
const crypto = require('crypto');

/**
 * Map OFX transaction to system transaction format
 * @param {Object} ofxTransaction - OFX transaction object
 * @param {Object} account - Account configuration
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Object} - Mapped transaction object
 */
function mapOFXTransaction(ofxTransaction, account, accountId, userId) {
  const { v4: uuidv4 } = require('uuid');
  
  // Extract transaction date
  const transactionDate = ofxTransaction.dtPosted || ofxTransaction.dtAvail;
  if (!transactionDate) {
    throw new Error('Transaction date is required');
  }
  
  // Parse date if it's in OFX format
  let parsedDate = typeof transactionDate === 'string' && transactionDate.length > 10
    ? parseOFXDate(transactionDate)
    : transactionDate;
  
  // Normalize through central date utility to ensure YYYY-MM-DD format
  if (parsedDate) {
    const normalized = normalizeAppDate(parsedDate, 'bank-import');
    if (normalized.parsed) {
      parsedDate = normalized.parsed;
    } else {
      throw new Error(`Invalid transaction date: ${transactionDate} (${normalized.error})`);
    }
  } else {
    throw new Error(`Invalid transaction date: ${transactionDate}`);
  }
  
  // Extract amount
  const rawAmount = parseFloat(ofxTransaction.trnAmt || 0);
  
  // Map transaction type
  const trnType = ofxTransaction.trnType || '';
  const transactionType = mapOFXTransactionType(trnType, rawAmount);
  
  // Calculate signed amount using account configuration
  const calculateSignedAmount = require('./calculateSignedAmount');
  const signedAmount = calculateSignedAmount(account, {
    amount: rawAmount,
    transaction_type: transactionType
  });
  
  // Build description from NAME and MEMO
  const descriptionParts = [];
  if (ofxTransaction.name) {
    descriptionParts.push(ofxTransaction.name.trim());
  }
  if (ofxTransaction.memo) {
    descriptionParts.push(ofxTransaction.memo.trim());
  }
  const description = descriptionParts.join(' - ') || 'Transaction';
  const descriptionNorm = normalizeDescription(description);
  
  // Generate dedupe hash using FITID if available, otherwise use standard fields
  let dedupeHash;
  if (ofxTransaction.fitId) {
    // Use FITID for more reliable duplicate detection
    dedupeHash = crypto.createHash('sha256')
      .update(`${accountId}|${ofxTransaction.fitId}`)
      .digest('hex');
  } else {
    // Fallback to standard hash
    dedupeHash = crypto.createHash('sha256')
      .update(`${parsedDate}|${descriptionNorm}|${signedAmount}|${transactionType}`)
      .digest('hex');
  }
  
  return {
    transaction_id: uuidv4(),
    account_id: accountId,
    user_id: userId,
    transaction_date: parsedDate,
    posted_date: parsedDate,
    description: description,
    amount: rawAmount,
    transaction_type: transactionType,
    signed_amount: signedAmount,
    dedupe_hash: dedupeHash,
    import_id: uuidv4() // Each transaction gets its own import_id (matching CSV import pattern)
    // Note: Additional OFX fields (FITID, check number, etc.) are used for deduplication
    // but not stored in the transactions table. FITID is incorporated into dedupe_hash.
  };
}

/**
 * Map OFX transaction type to system transaction type
 * @param {string} ofxType - OFX transaction type (CREDIT, DEBIT, etc.)
 * @param {number} amount - Transaction amount
 * @returns {string} - System transaction type
 */
function mapOFXTransactionType(ofxType, amount) {
  const typeUpper = (ofxType || '').toUpperCase();
  
  // OFX transaction types
  const typeMap = {
    'CREDIT': 'C',
    'DEBIT': 'D',
    'INT': 'C', // Interest is typically a credit
    'DIV': 'C', // Dividend is typically a credit
    'FEE': 'D', // Fee is typically a debit
    'SRVCHG': 'D', // Service charge is typically a debit
    'DEP': 'C', // Deposit is a credit
    'ATM': 'D', // ATM withdrawal is a debit
    'POS': 'D', // Point of sale is typically a debit
    'XFER': amount >= 0 ? 'C' : 'D', // Transfer depends on amount
    'PAYMENT': amount >= 0 ? 'C' : 'D', // Payment direction depends on amount sign
    'CHECK': 'D' // Check is typically a debit
  };
  
  if (typeMap[typeUpper]) {
    return typeMap[typeUpper];
  }
  
  // Default: use amount sign
  return amount >= 0 ? 'C' : 'D';
}

/**
 * Convert OFX parsed data to CSV-like records for preview
 * @param {Object} ofxData - Parsed OFX data
 * @returns {Array} - Array of record objects compatible with CSV preview format
 */
function ofxToPreviewRecords(ofxData) {
  if (!ofxData || !ofxData.transactions || !Array.isArray(ofxData.transactions)) {
    return [];
  }
  
  return ofxData.transactions.map((txn, index) => {
    const descriptionParts = [];
    if (txn.name) descriptionParts.push(txn.name);
    if (txn.memo) descriptionParts.push(txn.memo);
    
    return {
      transaction_date: txn.dtPosted || txn.dtAvail || '',
      description: descriptionParts.join(' - ') || 'Transaction',
      amount: txn.trnAmt || 0,
      transaction_type: mapOFXTransactionType(txn.trnType, txn.trnAmt || 0),
      fitid: txn.fitId || '',
      checknum: txn.checkNum || '',
      refnum: txn.refNum || '',
      trntype: txn.trnType || '',
      name: txn.name || '',
      memo: txn.memo || ''
    };
  });
}

module.exports = {
  mapOFXTransaction,
  mapOFXTransactionType,
  ofxToPreviewRecords
};

