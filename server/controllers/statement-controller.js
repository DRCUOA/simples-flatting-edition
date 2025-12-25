// server/controllers/statement-controller.js

const statementDAO = require('../models/statement_dao');
const { detectFormat, validateFormat } = require('../utils/formatDetector');
const { mapBankLedgerRow, validateHeaders: validateBankHeaders } = require('../services/statement-mappers/bankLedgerMapper');
const { mapCardRow, validateHeaders: validateCardHeaders } = require('../services/statement-mappers/cardMapper');
const accountDAO = require('../models/account_dao');
const { parse } = require('csv-parse');
const fs = require('fs');
const { validateAuthentication } = require('../utils/validators');

/**
 * Preview CSV file and detect format
 * POST /api/statements/preview
 */
exports.previewCSV = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const userId = req.user.user_id;
    const accountId = req.body.account_id;
    const formatOverride = req.query.format; // ?format=bank|card

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Verify account belongs to user
    const account = await new Promise((resolve, reject) => {
      accountDAO.getAccountById(accountId, userId, (err, account) => {
        if (err) reject(err);
        else resolve(account);
      });
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const fileStream = fs.createReadStream(req.file.path);
    const parser = parse({ columns: true, skip_empty_lines: true });

    const records = [];
    const duplicates = [];
    const duplicateHashes = new Set();
    let totalRecords = 0;

    // Parse CSV and collect records
    for await (const record of fileStream.pipe(parser)) {
      totalRecords++;
      records.push(record);
    }

    if (records.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'No data found in CSV file' });
    }

    // Detect format
    const headers = Object.keys(records[0]);
    const detectedFormat = formatOverride || detectFormat(headers);
    
    if (detectedFormat === 'unknown') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ 
        error: 'Unknown CSV format',
        headers,
        suggestion: 'Please specify format with ?format=bank or ?format=card'
      });
    }

    // Validate format with sample data
    const validation = validateFormat(detectedFormat, records.slice(0, 5));
    if (!validation.valid) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: 'Format validation failed',
        issues: validation.issues,
        confidence: validation.confidence
      });
    }

    // Process sample records and check for duplicates
    const sampleRecords = records.slice(0, 10); // First 10 records for preview
    const processedRecords = [];

    for (const record of sampleRecords) {
      try {
        let mappedRecord;
        
        if (detectedFormat === 'bank-ledger') {
          mappedRecord = mapBankLedgerRow(record, account, 'preview', userId, accountId);
        } else if (detectedFormat === 'card') {
          mappedRecord = mapCardRow(record, account, 'preview', userId, accountId);
        }

        if (mappedRecord) {
          // Check for duplicates
          const isDuplicate = await statementDAO.checkDuplicateHash(mappedRecord.dedupe_hash, accountId);
          if (isDuplicate) {
            duplicates.push({ 
              hash: mappedRecord.dedupe_hash, 
              record, 
              line: processedRecords.length + 1 
            });
            duplicateHashes.add(mappedRecord.dedupe_hash);
          }

          processedRecords.push({
            original: record,
            mapped: mappedRecord,
            isDuplicate
          });
        }
      } catch (error) {
        console.error('Error processing record:', error.message);
        // Continue processing other records
      }
    }

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({
      format: detectedFormat,
      validation,
      totalRecords,
      sampleRecords: processedRecords,
      duplicates,
      duplicateCount: duplicateHashes.size,
      headers,
      account: {
        account_id: account.account_id,
        account_name: account.account_name,
        positive_is_credit: account.positive_is_credit
      }
    });

  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('Preview CSV error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Import CSV file
 * POST /api/statements/import
 */
exports.importCSV = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const userId = req.user.user_id;
    const {
      account_id: accountId,
      bank_name,
      statement_from,
      statement_to,
      opening_balance,
      closing_balance,
      statement_name,
      format: formatOverride
    } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Require opening_balance for integrity checking
    // Allow zero values (0, '0', 0.0) but reject undefined, null, or empty string
    if (opening_balance === undefined || opening_balance === null || opening_balance === '') {
      return res.status(400).json({ 
        error: 'Opening balance is required for statement integrity validation',
        code: 'MISSING_OPENING_BALANCE'
      });
    }

    // Validate that opening_balance is a valid number (including zero)
    const openingBalanceNum = parseFloat(opening_balance);
    if (isNaN(openingBalanceNum)) {
      return res.status(400).json({ 
        error: 'Opening balance must be a valid number',
        code: 'INVALID_OPENING_BALANCE'
      });
    }

    // Validate closing_balance if provided
    let closingBalanceNum = null;
    if (closing_balance !== undefined && closing_balance !== null && closing_balance !== '') {
      closingBalanceNum = parseFloat(closing_balance);
      if (isNaN(closingBalanceNum)) {
        return res.status(400).json({ 
          error: 'Closing balance must be a valid number',
          code: 'INVALID_CLOSING_BALANCE'
        });
      }
    }

    // Verify account belongs to user
    const account = await new Promise((resolve, reject) => {
      accountDAO.getAccountById(accountId, userId, (err, account) => {
        if (err) reject(err);
        else resolve(account);
      });
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const fileStream = fs.createReadStream(req.file.path);
    const parser = parse({ columns: true, skip_empty_lines: true });

    const records = [];
    let totalRecords = 0;

    // Parse CSV
    for await (const record of fileStream.pipe(parser)) {
      totalRecords++;
      records.push(record);
    }

    if (records.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'No data found in CSV file' });
    }

    // Detect format
    const headers = Object.keys(records[0]);
    const detectedFormat = formatOverride || detectFormat(headers);
    
    if (detectedFormat === 'unknown') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ 
        error: 'Unknown CSV format',
        headers,
        suggestion: 'Please specify format with format=bank or format=card'
      });
    }

    // Create import record (status will be 'pending')
    const fileBuffer = fs.readFileSync(req.file.path);
    const importId = await statementDAO.createImport({
      userId,
      accountId,
      sourceFilename: req.file.originalname,
      fileBuffer,
      bankName: bank_name || null,
      statementFrom: statement_from || null,
      statementTo: statement_to || null,
      openingBalance: openingBalanceNum,
      closingBalance: closingBalanceNum,
      statementName: statement_name || null
    });

    // Set status to 'processing'
    await statementDAO.updateImportStatus(importId, 'processing');

    // Process records
    const statementLines = [];
    let processedCount = 0;
    let errorCount = 0;

    try {
      for (const record of records) {
        try {
          let mappedRecord;
          
          if (detectedFormat === 'bank-ledger') {
            mappedRecord = mapBankLedgerRow(record, account, importId, userId, accountId);
          } else if (detectedFormat === 'card') {
            mappedRecord = mapCardRow(record, account, importId, userId, accountId);
          }

          if (mappedRecord) {
            statementLines.push(mappedRecord);
            processedCount++;
          }
        } catch (error) {
          console.error('Error processing record:', error.message);
          errorCount++;
          // Append error to import error log
          await statementDAO.appendImportError(importId, `Row ${processedCount + errorCount}: ${error.message}`);
        }
      }

      // Insert statement lines
      const insertResult = await statementDAO.createStatementLines(statementLines);

      // Perform integrity check
      const sumOfAmounts = await statementDAO.sumSignedAmounts(importId);
      const computedClosing = openingBalanceNum + sumOfAmounts;

      let integrityStatus = 'unknown';
      let integrityNotes = null;

      if (closingBalanceNum !== null) {
        const difference = Math.abs(computedClosing - closingBalanceNum);
        if (difference < 0.01) {
          integrityStatus = 'ok';
          integrityNotes = 'Closing balance reconciled';
        } else {
          integrityStatus = 'mismatch';
          integrityNotes = `Mismatch: expected ${computedClosing.toFixed(2)}, got ${closingBalanceNum.toFixed(2)} (difference: ${difference.toFixed(2)})`;
        }
      } else {
        integrityNotes = `No closing balance provided. Computed closing: ${computedClosing.toFixed(2)}`;
      }

      // Update integrity status
      await statementDAO.updateImportIntegrity(importId, integrityStatus, integrityNotes);

      // Set status to 'completed'
      await statementDAO.updateImportStatus(importId, 'completed');

      // Clean up temp file
      fs.unlink(req.file.path, () => {});

      res.json({
        importId,
        format: detectedFormat,
        totalRecords,
        processedCount,
        insertedCount: insertResult.insertedCount,
        errorCount: insertResult.errorCount + errorCount,
        integrity_status: integrityStatus,
        integrity_notes: integrityNotes,
        opening_balance: openingBalanceNum,
        closing_balance: closingBalanceNum,
        computed_closing: computedClosing,
        account: {
          account_id: account.account_id,
          account_name: account.account_name
        }
      });

    } catch (error) {
      // Set status to 'failed' and log error
      await statementDAO.updateImportStatus(importId, 'failed');
      await statementDAO.appendImportError(importId, `Import failed: ${error.message}`);
      
      // Clean up temp file
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      
      throw error; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('Import CSV error:', error);
    
    // Handle duplicate import (before import record is created)
    if (error.message.includes('Duplicate import') || 
        error.code === 'SQLITE_CONSTRAINT' ||
        error.message.includes('UNIQUE constraint failed: StatementImports.source_hash')) {
      return res.status(409).json({ 
        error: 'This statement file has already been imported. To re-import, please delete the previous import first.',
        code: 'DUPLICATE_IMPORT',
        suggestion: 'View your import history and delete the old import if needed.'
      });
    }
    
    // If importId exists, it means we got past creation, so status should already be 'failed'
    // Otherwise, return generic error
    res.status(500).json({ 
      error: error.message,
      code: 'IMPORT_FAILED'
    });
  }
};

/**
 * Get import details
 * GET /api/statements/:id
 */
exports.getImport = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const userId = req.user.user_id;

    const importData = await statementDAO.getImportById(id, userId);
    if (!importData) {
      return res.status(404).json({ error: 'Import not found' });
    }

    res.json(importData);

  } catch (error) {
    console.error('Get import error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get statement lines for an import
 * GET /api/statements/:id/lines
 */
exports.getStatementLines = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const userId = req.user.user_id;
    const { limit = 100, offset = 0 } = req.query;

    const lines = await statementDAO.getStatementLines(id, userId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      lines,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: lines.length
      }
    });

  } catch (error) {
    console.error('Get statement lines error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all imports for user/account
 * GET /api/statements
 */
exports.getImports = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const { account_id } = req.query;

    const imports = await statementDAO.getImportsByUser(userId, account_id);

    res.json(imports);

  } catch (error) {
    console.error('Get imports error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update statement name
 * PATCH /api/statements/:id/name
 */
exports.updateStatementName = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const userId = req.user.user_id;
    const { statement_name } = req.body;

    if (!statement_name || statement_name.trim() === '') {
      return res.status(400).json({ error: 'Statement name is required' });
    }

    await statementDAO.updateStatementName(id, userId, statement_name);
    
    res.json({
      message: 'Statement name updated successfully',
      import_id: id,
      statement_name: statement_name.trim()
    });

  } catch (error) {
    console.error('Update statement name error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete import
 * DELETE /api/statements/:id
 */
exports.deleteImport = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const userId = req.user.user_id;

    const result = await statementDAO.deleteImport(id, userId);
    
    res.json({
      message: 'Import deleted successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Delete import error:', error);
    res.status(500).json({ error: error.message });
  }
};
