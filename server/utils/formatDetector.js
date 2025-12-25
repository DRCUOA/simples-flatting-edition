// server/utils/formatDetector.js

/**
 * CSV Format Detector
 * Auto-detects statement format from CSV headers and sample data
 */

/**
 * Detect CSV format from headers
 * @param {string[]} headers - Array of CSV column headers
 * @returns {string} - Format type: 'bank-ledger' | 'card' | 'unknown'
 */
function detectFormat(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return 'unknown';
  }

  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Bank ledger format detection
  const bankLedgerIndicators = ['particulars', 'code', 'type', 'details', 'reference', 'amount', 'date'];
  const bankLedgerMatches = bankLedgerIndicators.filter(indicator => 
    headerSet.has(indicator.toLowerCase())
  );

  if (bankLedgerMatches.length >= 4) {
    return 'bank-ledger';
  }

  // Card statement format detection
  const cardIndicators = ['card', 'processeddate', 'transactiondate', 'type', 'amount', 'details'];
  const cardMatches = cardIndicators.filter(indicator => 
    headerSet.has(indicator.toLowerCase())
  );

  if (cardMatches.length >= 4) {
    return 'card';
  }

  return 'unknown';
}

/**
 * Get format-specific field mappings
 * @param {string} format - Format type
 * @returns {Object} - Field mappings for the format
 */
function getFormatMappings(format) {
  switch (format) {
    case 'bank-ledger':
      return {
        date: ['date', 'transaction_date', 'txn_date'],
        amount: ['amount', 'amt'],
        description: ['details', 'particulars', 'description', 'narrative'],
        type: ['type', 'transaction_type', 'dc'],
        reference: ['reference', 'ref', 'code'],
        particulars: ['particulars', 'details']
      };
    
    case 'card':
      return {
        date: ['transactiondate', 'transaction_date', 'date'],
        processedDate: ['processeddate', 'processed_date'],
        amount: ['amount', 'amt'],
        description: ['details', 'description', 'merchant'],
        type: ['type', 'transaction_type'],
        card: ['card', 'card_number', 'instrument']
      };
    
    default:
      return {};
  }
}

/**
 * Validate format detection with sample data
 * @param {string} format - Detected format
 * @param {Object[]} sampleRows - Sample CSV rows
 * @returns {Object} - { valid: boolean, confidence: number, issues: string[] }
 */
function validateFormat(format, sampleRows) {
  const issues = [];
  let confidence = 0;

  if (format === 'unknown') {
    return { valid: false, confidence: 0, issues: ['Format could not be determined'] };
  }

  if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
    return { valid: false, confidence: 0, issues: ['No sample data provided'] };
  }

  const mappings = getFormatMappings(format);
  const sampleRow = sampleRows[0];

  // Check required fields are present and have data
  const requiredFields = format === 'bank-ledger' 
    ? ['date', 'amount', 'description']
    : ['date', 'amount', 'description'];

  for (const field of requiredFields) {
    const fieldMappings = mappings[field];
    if (!fieldMappings) {
      issues.push(`Missing field mapping for ${field}`);
      continue;
    }

    const foundField = fieldMappings.find(f => sampleRow.hasOwnProperty(f));
    if (!foundField) {
      issues.push(`Required field ${field} not found in data`);
    } else if (!sampleRow[foundField] || String(sampleRow[foundField]).trim() === '') {
      issues.push(`Required field ${field} is empty in sample data`);
    } else {
      confidence += 20; // Each required field adds 20% confidence
    }
  }

  // Format-specific validations
  if (format === 'bank-ledger') {
    // Check for bank-specific fields
    if (sampleRow.particulars || sampleRow.code) {
      confidence += 10;
    }
  } else if (format === 'card') {
    // Check for card-specific fields
    if (sampleRow.card || sampleRow.processeddate) {
      confidence += 10;
    }
  }

  // Date format validation
  const dateField = mappings.date?.find(f => sampleRow.hasOwnProperty(f));
  if (dateField && sampleRow[dateField]) {
    const dateStr = String(sampleRow[dateField]).trim();
    if (dateStr.includes('/') || dateStr.includes('-')) {
      confidence += 10;
    } else {
      issues.push('Date format not recognized');
    }
  }

  // Amount validation
  const amountField = mappings.amount?.find(f => sampleRow.hasOwnProperty(f));
  if (amountField && sampleRow[amountField]) {
    const amount = parseFloat(sampleRow[amountField]);
    if (!isNaN(amount)) {
      confidence += 10;
    } else {
      issues.push('Amount field contains non-numeric data');
    }
  }

  return {
    valid: confidence >= 70 && issues.length === 0,
    confidence: Math.min(confidence, 100),
    issues
  };
}

/**
 * Get format display name
 * @param {string} format - Format type
 * @returns {string} - Human-readable format name
 */
function getFormatDisplayName(format) {
  switch (format) {
    case 'bank-ledger':
      return 'Bank Ledger CSV';
    case 'card':
      return 'Card Statement CSV';
    default:
      return 'Unknown Format';
  }
}

/**
 * Get format description
 * @param {string} format - Format type
 * @returns {string} - Format description
 */
function getFormatDescription(format) {
  switch (format) {
    case 'bank-ledger':
      return 'Bank account statement with columns: Type, Details, Particulars, Code, Reference, Amount, Date';
    case 'card':
      return 'Credit/debit card statement with columns: Card, Type, Amount, Details, TransactionDate, ProcessedDate';
    default:
      return 'Unknown format - please check your CSV file structure';
  }
}

module.exports = {
  detectFormat,
  getFormatMappings,
  validateFormat,
  getFormatDisplayName,
  getFormatDescription
};
