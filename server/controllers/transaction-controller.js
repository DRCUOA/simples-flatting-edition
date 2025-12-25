const transactionDAO = require('../models/transaction_dao');
const accountDAO = require('../models/account_dao');
const { parse } = require('csv-parse');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const calculateSignedAmount = require('../utils/calculateSignedAmount');
const crypto = require('crypto');
const { validateAuthentication } = require('../utils/validators');
const { toISODate, createErrorResponse, createSuccessResponse } = require('../utils/transformers');
const { detectFileType } = require('../utils/fileTypeDetector');
const { parseOFX } = require('../utils/ofxParser');
const { mapOFXTransaction, ofxToPreviewRecords } = require('../utils/ofxTransactionMapper');
const { normalizeAppDate } = require('../utils/dateUtils');

// Minimal import flow logging helpers
const logCall = (fnName, argsObj) => {
  try { console.log(`[Import] call: ${fnName}`, argsObj || {}); } catch (_) {}
};
const logReturn = (fnName, resultObj) => {
  try { console.log(`[Import] return: ${fnName}`, resultObj || {}); } catch (_) {}
};

// Normalize/clean mappings sent from client
const normalizeMappings = (raw) => {
  const out = { ...raw };
  const toStr = (v) => (v == null ? '' : String(v).trim());
  if (Array.isArray(out.description)) {
    out.description = out.description.map(toStr).filter(Boolean);
  } else {
    out.description = toStr(out.description);
  }
  out.transaction_date = toStr(out.transaction_date);
  out.amount = toStr(out.amount);
  out.transaction_type = toStr(out.transaction_type);
  return out;
};

// Helper: Generate dedupe hash from mapped fields
const generateTransactionHash = (record, mappings) => {
  const transactionDate = record[mappings.transaction_date];
  const description = Array.isArray(mappings.description) 
    ? mappings.description.map(field => record[field]).join(' - ')
    : record[mappings.description];
  const amount = record[mappings.amount];
  const transactionType = record[mappings.transaction_type];

  const fields = [transactionDate, description, amount, transactionType].map(f => String(f || '').trim());
  const concatenated = fields.join('|');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
};

// Preview CSV or OFX
exports.previewCSV = async (req, res) => {
  try {
    logCall('previewCSV', {
      file: req.file && req.file.originalname,
      size: req.file && req.file.size,
      hasMappings: !!(req.body && req.body.mappings)
    });
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    
    // Auto-detect file type
    const fileType = await detectFileType(req.file.path, req.file.originalname);
    logCall('detectFileType', { fileType, filename: req.file.originalname });
    
    if (fileType === 'ofx') {
      // Handle OFX file preview
      return await previewOFX(req, res);
    }
    
    // Handle CSV file preview (existing logic)
    const mappings = req.body && req.body.mappings
      ? normalizeMappings(JSON.parse(req.body.mappings))
      : {};
    const hasDateMapping = Boolean(mappings.transaction_date);
    const canHash = Boolean(
      mappings.transaction_date && mappings.description && mappings.amount && mappings.transaction_type
    );
    if (Object.keys(mappings).length > 0) {
      logReturn('previewCSV.mappings', { fields: Object.keys(mappings) });
    }
    console.log('CSV File uploaded for preview');
    
    const fileStream = fs.createReadStream(req.file.path);
    
    const parser = parse({ 
      columns: (header) => header.map(column => column.trim()), 
      skip_empty_lines: true 
    });

    const records = [];
    const duplicates = [];
    const duplicateHashes = new Set();
    let totalRecords = 0;

    for await (const record of fileStream.pipe(parser)) {
      totalRecords++;
      if (hasDateMapping) {
        logCall('parseDate', { index: totalRecords, input: record[mappings.transaction_date] });
        const parsedDate = normalizeAppDate(record[mappings.transaction_date], 'bank-import');
        logReturn('parseDate', { index: totalRecords, parsed: parsedDate.parsed, error: parsedDate.error });
        if (!parsedDate.parsed) {
          // For preview, skip invalid date rows only when a mapping is provided
          continue;
        }
        record[mappings.transaction_date] = parsedDate.parsed;
      }

      if (canHash) {
        logCall('generateTransactionHash', { index: totalRecords });
        const dedupeHash = generateTransactionHash(record, mappings);
        logReturn('generateTransactionHash', { index: totalRecords, hash: String(dedupeHash).slice(0, 12) });

        // Check for duplicates in two ways:
        // 1) Legacy rows that used transaction_id == hash
        const existingLegacy = await transactionDAO.checkLegacyTransactionExists(dedupeHash).catch(() => false);

        // 2) New rows using UUID transaction_id with stored dedupe_hash per account
        let existingByDedupe = false;
        const accountIdForPreview = (req.body && req.body.account_id) ? String(req.body.account_id) : null;
        if (accountIdForPreview) {
          existingByDedupe = await transactionDAO.checkTransactionExistsByDedupeHash(accountIdForPreview, dedupeHash).catch(() => false);
        }

        if (existingLegacy || existingByDedupe) {
          duplicates.push({ hash: dedupeHash, record, line: totalRecords });
          duplicateHashes.add(dedupeHash);
        }
      }

      records.push(record);
    }

    fs.unlink(req.file.path, (err) => { if (err) { } });

    console.log(`Transaction Import (preview) complete: parsed=${records.length}, duplicates=${duplicates.length}`);
    logReturn('previewCSV', { totalRecords, duplicates: duplicateHashes.size, records: records.length });
    res.json({
      records,
      duplicates,
      totalRecords,
      duplicateCount: duplicateHashes.size
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => { if (err) { } });
    }
    res.status(500).json({ error: error.message });
  }
};

// Preview OFX file
async function previewOFX(req, res) {
  try {
    console.log('OFX File uploaded for preview');
    
    const accountIdForPreview = (req.body && req.body.account_id) ? String(req.body.account_id) : null;
    
    // Parse OFX file
    const ofxData = await parseOFX(req.file.path);
    
    // Convert OFX transactions to preview records
    const records = ofxToPreviewRecords(ofxData);
    
    // Check for duplicates using FITID or hash
    const duplicates = [];
    const duplicateHashes = new Set();
    
    if (accountIdForPreview && records.length > 0) {
      // Get account for mapping
      const account = await new Promise((resolve, reject) => {
        accountDAO.getAccountById(accountIdForPreview, (err, account) => {
          if (err) reject(err);
          else resolve(account);
        });
      });
      
      if (account) {
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          let dedupeHash = null;
          
          // Use FITID if available for better duplicate detection
          if (record.fitid) {
            dedupeHash = crypto.createHash('sha256')
              .update(`${accountIdForPreview}|${record.fitid}`)
              .digest('hex');
          } else {
            // Fallback to standard hash
            dedupeHash = crypto.createHash('sha256')
              .update(`${record.transaction_date}|${record.description}|${record.amount}|${record.transaction_type}`)
              .digest('hex');
          }
          
          // Check for duplicates
          const existingByDedupe = await transactionDAO.checkTransactionExistsByDedupeHash(accountIdForPreview, dedupeHash).catch(() => false);
          
          if (existingByDedupe) {
            duplicates.push({ hash: dedupeHash, record, line: i + 1 });
            duplicateHashes.add(dedupeHash);
          }
        }
      }
    }
    
    fs.unlink(req.file.path, (err) => { if (err) { } });
    
    console.log(`OFX Import (preview) complete: parsed=${records.length}, duplicates=${duplicates.length}`);
    res.json({
      records,
      duplicates,
      totalRecords: records.length,
      duplicateCount: duplicateHashes.size,
      fileType: 'ofx',
      accountInfo: ofxData.account,
      balances: ofxData.balances,
      statement: ofxData.statement
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => { if (err) { } });
    }
    throw error;
  }
}

// Upload Transactions
exports.uploadTransactions = async (req, res) => {
  try {
    logCall('uploadTransactions', {
      file: req.file && req.file.originalname,
      size: req.file && req.file.size,
      hasMappings: !!(req.body && req.body.mappings),
      account_id: req.body && req.body.account_id
    });
    if (!req.file || !req.body.account_id) {
      return res.status(400).json({ error: 'File and account ID are required' });
    }

    // Auto-detect file type
    const fileType = await detectFileType(req.file.path, req.file.originalname);
    logCall('detectFileType', { fileType, filename: req.file.originalname });
    
    const accountId = req.body.account_id;
    
    // Wrap the callback-based getAccountById in a Promise
    logCall('accountDAO.getAccountById', { accountId });
    const account = await new Promise((resolve, reject) => {
      accountDAO.getAccountById(accountId, (err, account) => {
        if (err) reject(err);
        else resolve(account);
      });
    });
    logReturn('accountDAO.getAccountById', account ? { account_id: account.account_id, positive_is_credit: account.positive_is_credit } : { notFound: true });

    if (!account) return res.status(404).json({ error: 'Account not found' });

    let categoryAssignments = {};
    if (req.body.categoryAssignments) {
      categoryAssignments = JSON.parse(req.body.categoryAssignments);
    }

    let transactionSplits = {};
    if (req.body.transactionSplits) {
      transactionSplits = JSON.parse(req.body.transactionSplits);
    }

    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const records = [];
    let totalRecords = 0;

    if (fileType === 'ofx') {
      // Handle OFX file import
      console.log('OFX File uploaded for import');
      
      // Parse OFX file
      const ofxData = await parseOFX(req.file.path);
      
      // Map OFX transactions to system format
      for (let i = 0; i < ofxData.transactions.length; i++) {
        const ofxTxn = ofxData.transactions[i];
        totalRecords++;
        
        try {
          const mappedTxn = mapOFXTransaction(ofxTxn, account, accountId, userId);
          const lineIndex = i;
          
          // Check if this transaction has a split
          const split = transactionSplits[lineIndex];
          if (split && split.categories && split.categories.length > 1) {
            // Process split transaction
            const baseImportId = uuidv4();
            const baseDescription = mappedTxn.description || '';
            
            // Create transactions for each split category
            split.categories.forEach((splitCat, splitIndex) => {
              const splitPercentage = splitCat.percentage || 0;
              const splitAmount = (mappedTxn.amount * splitPercentage) / 100;
              // Recalculate signed_amount for the split amount to ensure accuracy
              const splitSignedAmount = calculateSignedAmount(account, { amount: splitAmount, transaction_type: mappedTxn.transaction_type });
              
              const splitDescription = splitIndex === 0 
                ? baseDescription 
                : `${baseDescription} (Split ${splitIndex + 1}/${split.categories.length})`;
              
              records.push({
                ...mappedTxn,
                transaction_id: uuidv4(),
                description: splitDescription,
                amount: splitAmount,
                signed_amount: splitSignedAmount,
                category_id: splitCat.category_id || null,
                import_id: baseImportId,
                dedupe_hash: splitIndex === 0 ? mappedTxn.dedupe_hash : null,
                line: totalRecords,
                is_split: true,
                split_index: splitIndex,
                split_total: split.categories.length
              });
            });
          } else {
            // Normal transaction (no split)
            mappedTxn.category_id = categoryAssignments[lineIndex] || null;
            mappedTxn.line = totalRecords;
            records.push(mappedTxn);
          }
        } catch (error) {
          console.error(`Error mapping OFX transaction ${i + 1}:`, error.message);
          // Skip invalid transactions
          continue;
        }
      }
    } else {
      // Handle CSV file import (existing logic)
      const mappings = req.body && req.body.mappings
        ? normalizeMappings(JSON.parse(req.body.mappings))
        : null;
      // Reinstate strict explicit mapping requirement when provided: if mappings object is present but incomplete, reject
      if (mappings) {
        const required = ['transaction_date','description','amount','transaction_type'];
        const missing = required.filter(f => !mappings[f] || (Array.isArray(mappings[f]) && mappings[f].length === 0));
        if (missing.length > 0) {
          return res.status(400).json({ error: `Missing required field mappings: ${missing.join(', ')}` });
        }
      }
      console.log('CSV File uploaded for import');
      
      const fileStream = fs.createReadStream(req.file.path);
      const parser = parse({ 
        columns: (header) => header.map(column => column.trim()), 
        skip_empty_lines: true 
      });

      // Fallback candidates when no mappings provided
      const dateCandidates = ['transaction_date', 'date', 'Date'];
      const descCandidates = ['description', 'Details', 'Detail', 'narrative', 'memo', 'payee'];
      const amountCandidates = ['amount', 'Amount', 'Amt'];
      const typeCandidates = ['transaction_type', 'Type', 'DC'];

      // Helper function to normalize record keys (trim spaces) for robust access
      const normalizeRecord = (record) => {
        const normalized = {};
        for (const [key, value] of Object.entries(record)) {
          normalized[key.trim()] = value;
        }
        return normalized;
      };

      for await (const record of fileStream.pipe(parser)) {
        totalRecords++;
        
        // Normalize record keys to handle any edge cases
        const normalizedRecord = normalizeRecord(record);
        
        // Parse and validate the date
        const rawDate = mappings && mappings.transaction_date
          ? normalizedRecord[mappings.transaction_date]
          : (dateCandidates.find(k => normalizedRecord[k] != null) ? normalizedRecord[dateCandidates.find(k => normalizedRecord[k] != null)] : undefined);
        logCall('parseDate', { index: totalRecords, input: rawDate, mapping: mappings?.transaction_date, recordKeys: Object.keys(normalizedRecord) });
        const parsedDate = normalizeAppDate(rawDate, 'bank-import');
        logReturn('parseDate', { index: totalRecords, parsed: parsedDate.parsed, error: parsedDate.error });
        if (!parsedDate.parsed) {
          continue;
        }
        
        const canHash = Boolean(mappings && mappings.transaction_date && mappings.description && mappings.amount && mappings.transaction_type);
        let dedupeHash = null;
        if (canHash) {
          logCall('generateTransactionHash', { index: totalRecords });
          dedupeHash = generateTransactionHash(normalizedRecord, mappings);
          logReturn('generateTransactionHash', { index: totalRecords, hash: String(dedupeHash).slice(0, 12) });
        }
        const amount = mappings && mappings.amount
          ? parseFloat(normalizedRecord[mappings.amount])
          : parseFloat(amountCandidates.map(k => normalizedRecord[k]).find(v => v != null) || '0');
        let transactionType = mappings && mappings.transaction_type
          ? normalizedRecord[mappings.transaction_type]
          : (typeCandidates.map(k => normalizedRecord[k]).find(v => v != null) || null);
        if (!transactionType) transactionType = amount >= 0 ? 'C' : 'D';

        logCall('calculateSignedAmount', { index: totalRecords, account_id: account.account_id, amount, transaction_type: transactionType });
        const signedAmountComputed = calculateSignedAmount(account, { amount, transaction_type: transactionType });
        logReturn('calculateSignedAmount', { index: totalRecords, signed_amount: signedAmountComputed });

        const lineIndex = totalRecords - 1;
        const description = (mappings && Array.isArray(mappings.description))
          ? mappings.description.filter(Boolean).map(field => normalizedRecord[field]).filter(v => v != null && v !== '').join(' - ')
          : (mappings && mappings.description ? normalizedRecord[mappings.description] : (descCandidates.map(k => normalizedRecord[k]).find(v => v != null) || ''));

        // Check if this transaction has a split
        const split = transactionSplits[lineIndex];
        if (split && split.categories && split.categories.length > 1) {
          // Process split transaction
          const baseImportId = uuidv4();
          const baseDescription = description;
          
          // Create transactions for each split category
          split.categories.forEach((splitCat, splitIndex) => {
            const splitPercentage = splitCat.percentage || 0;
            const splitAmount = (amount * splitPercentage) / 100;
            // Recalculate signed_amount for the split amount to ensure accuracy
            const splitSignedAmount = calculateSignedAmount(account, { amount: splitAmount, transaction_type: transactionType });
            
            // For the first split, use the original transaction structure
            // For subsequent splits, create new transactions
            const splitDescription = splitIndex === 0 
              ? baseDescription 
              : `${baseDescription} (Split ${splitIndex + 1}/${split.categories.length})`;
            
            records.push({
              transaction_id: uuidv4(),
              account_id: accountId,
              user_id: userId,
              transaction_date: parsedDate.parsed,
              description: splitDescription,
              amount: splitAmount,
              transaction_type: transactionType,
              signed_amount: splitSignedAmount,
              category_id: splitCat.category_id || null,
              import_id: baseImportId,
              dedupe_hash: splitIndex === 0 ? dedupeHash : null, // Only first split gets dedupe hash
              line: totalRecords,
              is_split: true,
              split_index: splitIndex,
              split_total: split.categories.length
            });
          });
        } else {
          // Normal transaction (no split)
          records.push({
            transaction_id: uuidv4(),
            account_id: accountId,
            user_id: userId,
            transaction_date: parsedDate.parsed,
            description: description,
            amount,
            transaction_type: transactionType,
            signed_amount: signedAmountComputed,
            category_id: categoryAssignments[lineIndex] || null,
            import_id: uuidv4(),
            dedupe_hash: dedupeHash,
            line: totalRecords
          });
        }
      }
    }

    fs.unlink(req.file.path, (err) => { if (err) { } });

    if (records.length > 0) {
      logCall('transactionDAO.importTransactions', { count: records.length });
      // User-selected duplicates to import (lines). If absent, default: skip duplicates.
      let selectedIndices = [];
      try {
        if (req.body && req.body.selected_indices) {
          const parsed = JSON.parse(req.body.selected_indices);
          if (Array.isArray(parsed)) selectedIndices = parsed.map(Number).filter(n => Number.isFinite(n));
        }
      } catch (_) {}

      const accountId = req.body.account_id;
      const selectedSet = new Set(selectedIndices);
      const unique = [];
      let skippedDuplicates = 0;

      for (const rec of records) {
        if (rec.dedupe_hash) {
          const exists = await transactionDAO.checkTransactionExistsByDedupeHash(accountId, rec.dedupe_hash).catch(() => false);
          if (exists && !selectedSet.has(rec.line)) {
            skippedDuplicates++;
            continue; // skip unless user explicitly selected to import
          }
        }
        unique.push(rec);
      }

      const importResult = await transactionDAO.importTransactions(unique);
      logReturn('transactionDAO.importTransactions', importResult);
      // Attach duplicateCount to return via res below
      records.importResult = { ...importResult, duplicateCount: skippedDuplicates };
    }

    // If we computed an import result above, use it; else default counts
    const result = records.importResult || { importedCount: records.length, errorCount: 0, duplicateCount: 0 };
    logReturn('uploadTransactions', { importedCount: result.importedCount, duplicateCount: result.duplicateCount, totalRecords });
    console.log(`Transaction Import: imported=${result.importedCount}, skippedDuplicates=${result.duplicateCount}, account_id=${accountId}`);
    res.json({ importedCount: result.importedCount, duplicateCount: result.duplicateCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create Transaction
exports.createTransaction = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const transaction = req.body;
    const userId = req.user.user_id;
    
    const id = await transactionDAO.createTransaction(transaction, userId);
    return res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    const errorResponse = createErrorResponse('Failed to create transaction');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Update Transaction
exports.updateTransaction = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const transaction = req.body;
    const userId = req.user.user_id;

    // Update transaction directly (reconciliation checks removed with statement feature)
    await transactionDAO.updateTransaction(id, transaction, userId);
    return res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    if (error && typeof error.message === 'string') {
      if (error.message === 'Transaction not found' || error.message.includes('not found or access denied')) {
        return res.status(404).json({ error: 'Transaction not found or access denied' });
      }
      if (error.message.includes('SQLITE_CONSTRAINT') || error.message.includes('constraint')) {
        return res.status(409).json({ error: 'Update violates data constraints' });
      }
    }
    const errorResponse = createErrorResponse('Failed to update transaction');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Delete Transaction
exports.deleteTransaction = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // transactionDAO.deleteTransaction already handles balance recalculation
  // No need for manual balance adjustment - it uses recalculateAccountBalanceFromOldest
  transactionDAO.deleteTransaction(id, userId, (err) => {
    if (err) {
      if (err.message === 'Transaction not found') {
        return res.status(404).json({ error: 'Transaction not found or access denied' });
      }
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  });
};

// Batch Delete Transactions
exports.batchDeleteTransactions = (req, res) => {
  const { transactionIds, deleteMatches } = req.body;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ error: 'Invalid transaction IDs provided' });
  }

  // transactionDAO.batchDeleteTransactions already handles balance recalculation for all affected accounts
  // No need for manual balance adjustments - it uses recalculateAccountBalanceFromOldest
  transactionDAO.batchDeleteTransactions(transactionIds, userId, deleteMatches === true, (err) => {
    if (err) {
      console.error('Error in batchDeleteTransactions:', err);
      console.error('Error stack:', err.stack);
      
      // Special handling for reconciliation matches error
      if (err.message === 'RECONCILIATION_MATCHES_EXIST') {
        return res.status(409).json({ 
          error: 'Cannot delete transactions with reconciliation matches',
          code: 'RECONCILIATION_MATCHES_EXIST',
          requiresConfirmation: true
        });
      }
      
      return res.status(500).json({ error: err.message || 'Failed to delete transactions' });
    }

    res.json({ message: `${transactionIds.length} transaction(s) deleted successfully` });
  });
};

// Batch Update Transactions
exports.batchUpdateTransactions = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { transactionIds, updates } = req.body;
    const userId = req.user.user_id;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs are required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    // Validate that updates only contain allowed fields
    const allowedFields = ['category_id', 'description', 'posted_status', 'is_transfer'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        error: `Invalid update fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}` 
      });
    }

    const result = await transactionDAO.batchUpdateTransactions(transactionIds, updates, userId);
    return res.json({ 
      message: `${result.updatedCount} transaction(s) updated successfully`,
      updatedCount: result.updatedCount,
      affectedAccounts: result.affectedAccounts
    });
  } catch (error) {
    if (error && typeof error.message === 'string') {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({ error: error.message });
      }
    }
    const errorResponse = createErrorResponse('Failed to update transactions');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Get Transactions
exports.getTransactions = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { startDate, endDate } = req.query;
    const userId = req.user.user_id;
    
    // Format dates to YYYY-MM-DD for database query
    const formattedStartDate = startDate ? toISODate(startDate) : null;
    const formattedEndDate = endDate ? toISODate(endDate) : null;
    
    const transactions = await transactionDAO.getAllTransactions(userId, formattedStartDate, formattedEndDate);
    
    return res.json(transactions);
  } catch (error) {
    const errorResponse = createErrorResponse('Failed to fetch transactions');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Get Transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id } = req.params;
    const userId = req.user.user_id;
    
    const transaction = await transactionDAO.getTransactionById(id, userId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or access denied' });
    }
    
    return res.json(transaction);
  } catch (err) {
    const errorResponse = createErrorResponse('Failed to fetch transaction');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Get Import Logs
exports.getImportLogs = (req, res) => {
  transactionDAO.getImportLogs((err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch import logs' });
    }
    res.json(logs);
  });
};

// Get category suggestions based on transaction description/amount
exports.getCategorySuggestions = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { description, amount } = req.query;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const matches = await transactionDAO.findCategoryMatches(
      userId,
      description,
      amount || 0
    );

    return res.json({ suggestions: matches });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Save category matching feedback
exports.saveCategoryFeedback = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { description, amount, suggested_category_id, actual_category_id, confidence_score } = req.body;
    
    if (!description || !actual_category_id) {
      return res.status(400).json({ error: 'Description and actual_category_id are required' });
    }

    const feedbackDAO = require('../models/category_matching_feedback_dao');
    const accepted = suggested_category_id === actual_category_id;
    
    feedbackDAO.saveFeedback({
      user_id: userId,
      description,
      amount: amount || 0,
      suggested_category_id: suggested_category_id || null,
      actual_category_id,
      confidence_score: confidence_score || 0,
      accepted
    }, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save feedback' });
      }
      return res.json({ message: 'Feedback saved successfully', id: result.id });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};