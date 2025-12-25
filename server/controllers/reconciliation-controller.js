// server/controllers/reconciliation-controller.js

const reconciliationDAO = require('../models/reconciliation_dao');
const statementDAO = require('../models/statement_dao');
const { validateAuthentication } = require('../utils/validators');
const { normalizeAppDate, compareDomainDates } = require('../utils/dateUtils');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new reconciliation session
 * POST /api/recon/sessions
 */
exports.createSession = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const {
      account_id,
      period_start,
      period_end,
      start_balance,
      closing_balance
    } = req.body;

    const userId = req.user.user_id;

    // Validate required fields
    if (!account_id || !period_start || !period_end || closing_balance === undefined || closing_balance === null || closing_balance === '') {
      return res.status(400).json({
        error: 'Account ID, period start, period end, and closing balance are required'
      });
    }

    // Require start_balance (opening_balance) for Phase 1 integrity checking
    // Allow zero values (0, '0', 0.0) but reject undefined, null, or empty string
    if (start_balance === undefined || start_balance === null || start_balance === '') {
      return res.status(400).json({
        error: 'Start balance (opening balance) is required for statement integrity validation',
        code: 'MISSING_START_BALANCE'
      });
    }

    // Validate that balances are valid numbers (including zero)
    const startBalanceNum = parseFloat(start_balance);
    const closingBalanceNum = parseFloat(closing_balance);
    
    if (isNaN(startBalanceNum)) {
      return res.status(400).json({
        error: 'Start balance must be a valid number',
        code: 'INVALID_START_BALANCE'
      });
    }
    
    if (isNaN(closingBalanceNum)) {
      return res.status(400).json({
        error: 'Closing balance must be a valid number',
        code: 'INVALID_CLOSING_BALANCE'
      });
    }

    // Normalize and validate date format
    const normalizedStart = normalizeAppDate(period_start, 'api-domain');
    const normalizedEnd = normalizeAppDate(period_end, 'api-domain');
    
    if (!normalizedStart.parsed || !normalizedEnd.parsed) {
      return res.status(400).json({
        error: `Period dates must be valid dates in YYYY-MM-DD format. Start: ${normalizedStart.error || 'invalid'}, End: ${normalizedEnd.error || 'invalid'}`
      });
    }

    // Validate that start date is before end date
    if (compareDomainDates(normalizedStart.parsed, normalizedEnd.parsed) >= 0) {
      return res.status(400).json({
        error: 'Period start date must be before period end date'
      });
    }
    
    // Use normalized dates
    const periodStartNormalized = normalizedStart.parsed;
    const periodEndNormalized = normalizedEnd.parsed;

    // Create session (pre-generate ID so we can treat session_id as statement_id)
    const sessionId = uuidv4();
    await reconciliationDAO.createSession({
      sessionId,
      userId,
      accountId: account_id,
      periodStart: periodStartNormalized,
      periodEnd: periodEndNormalized,
      startBalance: startBalanceNum,
      closingBalance: closingBalanceNum,
      // Statement-centric selection mode:
      // - statement_id == session_id (no new tables; minimal change)
      // - closing date is the only hard date bound for candidate selection
      params: {
        selection_mode: 'statement',
        statement_id: sessionId,
        statement_closing_date: periodEndNormalized
      }
    });

    // Statement-centric: candidate transactions are unassigned (statement_id IS NULL),
    // with posted_date (fallback transaction_date) used only as an upper bound.
    const transactions = await reconciliationDAO.getStatementCandidateTransactions(
      userId,
      account_id,
      periodEndNormalized,
      sessionId
    );

    // Create StatementImport record for Phase 1 integrity tracking
    // Use empty buffer since there's no CSV file (reconciliation-based import)
    let importId = null;
    let integrityStatus = 'unknown';
    let integrityNotes = 'Integrity is determined on completion (balance reconciliation), not by date coverage.';
    let computedClosing = null;

    try {
      // For reconciliation sessions, create a unique hash using session_id
      // This prevents UNIQUE constraint violations since all reconciliation sessions use empty buffers
      const reconciliationBuffer = Buffer.from(`reconciliation-session:${sessionId}`);
      // Generate statement name from session form or use default
      const statementName = req.body.statement_name || `Reconciliation Session ${sessionId.substring(0, 8)}`;
      
      importId = await statementDAO.createImport({
        userId,
        accountId: account_id,
        sourceFilename: `Reconciliation Session ${sessionId.substring(0, 8)}`,
        fileBuffer: reconciliationBuffer,
        bankName: null,
        statementFrom: periodStartNormalized,
        statementTo: periodEndNormalized,
        openingBalance: startBalanceNum,
        closingBalance: closingBalanceNum,
        statementName: statementName
      });

      // Set status to processing
      await statementDAO.updateImportStatus(importId, 'processing');

      // Set status to completed
      await statementDAO.updateImportIntegrity(importId, integrityStatus, integrityNotes);
      await statementDAO.updateImportStatus(importId, 'completed');
    } catch (importError) {
      // Log error but don't fail reconciliation session creation
      console.error('Failed to create StatementImport for reconciliation session:', importError);
      if (importId) {
        await statementDAO.appendImportError(importId, `Failed to complete integrity check: ${importError.message}`);
        await statementDAO.updateImportStatus(importId, 'failed');
      }
      // Continue with reconciliation session creation even if StatementImport fails
    }

    // Get the full session data
    const session = await reconciliationDAO.getSessionById(sessionId, userId);
    const matches = await reconciliationDAO.getMatchesBySession(sessionId, userId);

    res.status(201).json({
      session_id: sessionId,
      statement_import_id: importId,
      session: session,
      transactions: transactions || [],
      matches: matches || [],
      integrity_status: integrityStatus,
      integrity_notes: integrityNotes,
      computed_closing: computedClosing,
      message: 'Reconciliation session created successfully'
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Get session summary
 * GET /api/recon/sessions/:id/summary
 */
exports.getSessionSummary = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;

    const summary = await reconciliationDAO.getSessionSummary(sessionId, userId);
    res.json(summary);

  } catch (error) {
    console.error('Get session summary error:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get session details with matches and transactions
 * GET /api/recon/sessions/:id
 */
exports.getSession = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;

    const session = await reconciliationDAO.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const matches = await reconciliationDAO.getMatchesBySession(sessionId, userId);
    // Backward compatible session loading:
    // - Old sessions: date-range selection
    // - New sessions: statement-centric selection (unassigned + assigned-to-this-statement, up to closing date)
    let transactions = [];
    let sessionParams = {};
    try {
      sessionParams = session.params_json ? JSON.parse(session.params_json) : {};
    } catch (_) {
      sessionParams = {};
    }

    if (sessionParams && sessionParams.selection_mode === 'statement') {
      transactions = await reconciliationDAO.getStatementCandidateTransactions(
        userId,
        session.account_id,
        session.period_end,
        sessionId
      );
    } else {
      transactions = await reconciliationDAO.getSessionTransactions(
      userId,
      session.account_id,
      session.period_start,
      session.period_end,
      sessionId
    );
    }

    const summary = await reconciliationDAO.getSessionSummary(sessionId, userId);

    res.json({
      session,
      matches,
      transactions,
      summary
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all sessions for user/account with filters
 * GET /api/recon/sessions
 */
exports.getSessions = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const { 
      account_id, 
      date_from, 
      date_to, 
      closed_only, 
      limit 
    } = req.query;

    const filters = {
      dateFrom: date_from,
      dateTo: date_to,
      closedOnly: closed_only === 'true',
      limit: limit ? parseInt(limit) : undefined
    };

    const sessions = await reconciliationDAO.getSessionsByUser(userId, account_id, filters);
    res.json(sessions);

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update session parameters (only for draft/active sessions)
 * PUT /api/recon/sessions/:id
 */
exports.updateSession = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;
    const {
      period_start,
      period_end,
      start_balance,
      closing_balance
    } = req.body;

    // Validate that at least one field is provided
    if (period_start === undefined && period_end === undefined && 
        start_balance === undefined && closing_balance === undefined) {
      return res.status(400).json({
        error: 'At least one field must be provided for update'
      });
    }

    // Validate dates if provided
    if (period_start !== undefined || period_end !== undefined) {
      const { normalizeAppDate, compareDomainDates } = require('../utils/dateUtils');
      
      const startDate = period_start !== undefined 
        ? normalizeAppDate(period_start, 'api-domain')
        : null;
      const endDate = period_end !== undefined
        ? normalizeAppDate(period_end, 'api-domain')
        : null;

      if (period_start !== undefined && (!startDate.parsed)) {
        return res.status(400).json({
          error: `Period start date must be valid date in YYYY-MM-DD format: ${startDate.error || 'invalid'}`
        });
      }

      if (period_end !== undefined && (!endDate.parsed)) {
        return res.status(400).json({
          error: `Period end date must be valid date in YYYY-MM-DD format: ${endDate.error || 'invalid'}`
        });
      }

      // If both dates are provided, validate start < end
      if (period_start !== undefined && period_end !== undefined) {
        if (compareDomainDates(startDate.parsed, endDate.parsed) >= 0) {
          return res.status(400).json({
            error: 'Period start date must be before period end date'
          });
        }
      }
    }

    // Validate balances if provided
    if (start_balance !== undefined) {
      const startBalanceNum = parseFloat(start_balance);
      if (isNaN(startBalanceNum)) {
        return res.status(400).json({
          error: 'Start balance must be a valid number'
        });
      }
    }

    if (closing_balance !== undefined) {
      const closingBalanceNum = parseFloat(closing_balance);
      if (isNaN(closingBalanceNum)) {
        return res.status(400).json({
          error: 'Closing balance must be a valid number'
        });
      }
    }

    // Build update data
    const updateData = {};
    if (period_start !== undefined) {
      const { normalizeAppDate } = require('../utils/dateUtils');
      const normalized = normalizeAppDate(period_start, 'api-domain');
      updateData.periodStart = normalized.parsed;
    }
    if (period_end !== undefined) {
      const { normalizeAppDate } = require('../utils/dateUtils');
      const normalized = normalizeAppDate(period_end, 'api-domain');
      updateData.periodEnd = normalized.parsed;
    }
    if (start_balance !== undefined) {
      updateData.startBalance = parseFloat(start_balance);
    }
    if (closing_balance !== undefined) {
      updateData.closingBalance = parseFloat(closing_balance);
    }

    // Update session
    const updatedSession = await reconciliationDAO.updateSession(sessionId, userId, updateData);

    res.json({
      message: 'Session updated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('Update session error:', error);
    
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (error.message === 'Cannot update closed reconciliation session') {
      return res.status(409).json({ error: 'Cannot update closed reconciliation session' });
    }
    
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a manual match (reconcile a transaction)
 * POST /api/recon/matches
 */
exports.createMatch = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const {
      session_id,
      transaction_id
    } = req.body;

    const userId = req.user.user_id;

    // Validate required fields
    if (!session_id || !transaction_id) {
      return res.status(400).json({
        error: 'Session ID and transaction ID are required'
      });
    }

    // Get session details to verify it exists and belongs to user
    const session = await reconciliationDAO.getSessionById(session_id, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.closed) {
      return res.status(409).json({ error: 'Session is already closed' });
    }

    // Enforce single-statement ownership at the transaction level.
    // A transaction can only belong to one statement_id (statement == session in simplified mode).
    const txRow = await reconciliationDAO.getTransactionWithOwnershipCheck(transaction_id, userId, session_id);

    if (!txRow) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (txRow.account_id !== session.account_id) {
      return res.status(409).json({ error: 'Transaction does not belong to this account' });
    }

    if (txRow.statement_id && txRow.statement_id !== session_id) {
      return res.status(409).json({
        error: 'Transaction already assigned to another statement',
        message: 'Transaction already assigned to another statement',
        transaction_id,
        assigned_statement_id: txRow.statement_id
      });
    }

    // Check if match already exists for this transaction in this session
    const existingMatches = await reconciliationDAO.getMatchesBySession(session_id, userId);
    const existingMatch = existingMatches.find(m => m.transaction_id === transaction_id && m.active === 1);
    
    if (existingMatch) {
      // Match already exists, return success (idempotent)
      const updatedSession = await reconciliationDAO.getSessionById(session_id, userId);
      return res.status(200).json({
        message: 'Transaction already reconciled',
        session_id,
        transaction_id,
        variance: updatedSession.variance
      });
    }

    // Backward-compatible enforcement:
    // If legacy data has an active match but Transactions.statement_id hasn't been populated yet,
    // the DB unique constraint (one active match per transaction) would block inserts.
    // We detect this and surface it as statement-ownership conflict.
    const existingActiveMatch = await reconciliationDAO.getActiveMatchInOtherSession(transaction_id, session_id);

    if (existingActiveMatch) {
      return res.status(409).json({
        error: 'Transaction already assigned to another statement',
        message: 'Transaction already assigned to another statement',
        transaction_id,
        assigned_statement_id: existingActiveMatch.session_id
      });
    }

    // Create the match (simplified: no statement_line_id needed)
    const matchData = [{
      user_id: userId,
      account_id: session.account_id,
      transaction_id,
      statement_line_id: null, // Simplified reconciliation doesn't require statement lines
      statement_id: session_id, // Statement owns transaction; statement == session
      confidence: 100,
      rule: 'manual',
      matched_by: 'manual'
    }];

    const result = await reconciliationDAO.createMatches(session_id, matchData);

    if (result.errorCount > 0) {
      return res.status(500).json({ error: 'Failed to create match' });
    }

    // Get the created match ID
    const matchId = result.matchIds && result.matchIds.length > 0 ? result.matchIds[0] : null;

    // Reload session data to get updated variance
    const updatedSession = await reconciliationDAO.getSessionById(session_id, userId);

    res.status(201).json({
      message: 'Transaction reconciled successfully',
      session_id,
      transaction_id,
      match_id: matchId,
      variance: updatedSession.variance
    });

  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a match
 * DELETE /api/recon/matches/:id
 */
exports.deleteMatch = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: matchId } = req.params;
    const userId = req.user.user_id;

    const result = await reconciliationDAO.deleteMatch(matchId, userId);
    
    if (!result.deleted) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      message: 'Match deleted successfully',
      match_id: matchId
    });

  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Close a session
 * POST /api/recon/sessions/:id/close
 */
exports.closeSession = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;

    // Check if session exists and is not already closed
    const session = await reconciliationDAO.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.closed) {
      return res.status(409).json({ error: 'Session is already closed' });
    }

    // Balance is the source of truth: block close unless opening + reconciled == closing
    const summary = await reconciliationDAO.getSessionSummary(sessionId, userId);
    if (!summary.is_balanced) {
      return res.status(409).json({
        error: 'Cannot close reconciliation: balances do not reconcile',
        message: 'Cannot close reconciliation: balances do not reconcile',
        variance: summary.variance,
        calculated_balance: summary.calculated_balance,
        closing_balance: summary.closing_balance
      });
    }

    // Close the session (freeze variance)
    const finalSummary = await reconciliationDAO.closeSession(sessionId, userId);

    res.json({
      message: 'Session closed successfully',
      session_id: sessionId,
      final_summary: finalSummary
    });

  } catch (error) {
    console.error('Close session error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get unmatched transactions for an account
 * GET /api/recon/unmatched-transactions
 */
exports.getUnmatchedTransactions = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const { 
      account_id, 
      date_from, 
      date_to,
      include_transfers,
      include_non_posted 
    } = req.query;

    if (!account_id) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const options = {
      includeTransfers: include_transfers === 'true',
      includeNonPosted: include_non_posted === 'true'
    };

    const transactions = await reconciliationDAO.getUnmatchedTransactions(
      userId, 
      account_id, 
      date_from, 
      date_to,
      options
    );

    res.json(transactions);

  } catch (error) {
    console.error('Get unmatched transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Get matches for a session with filters
 * GET /api/recon/sessions/:id/matches
 */
exports.getSessionMatches = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;
    const {
      matched_by,
      limit
    } = req.query;

    const filters = {
      matchedBy: matched_by,
      limit: limit ? parseInt(limit) : undefined
    };

    const matches = await reconciliationDAO.getMatchesBySession(sessionId, userId, filters);

    res.json({
      session_id: sessionId,
      matches,
      count: matches.length
    });

  } catch (error) {
    console.error('Get session matches error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get unmatched transactions for an account
 * GET /api/recon/unmatched-transactions
 */
exports.getUnmatchedTransactions = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const { 
      account_id, 
      date_from, 
      date_to,
      include_transfers,
      include_non_posted,
      session_id
    } = req.query;

    if (!account_id) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const options = {
      includeTransfers: include_transfers === 'true',
      includeNonPosted: include_non_posted === 'true',
      sessionId: session_id || null
    };

    const transactions = await reconciliationDAO.getUnmatchedTransactions(
      userId, 
      account_id, 
      date_from, 
      date_to,
      options
    );

    res.json(transactions);

  } catch (error) {
    console.error('Get unmatched transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a reconciliation session
 * DELETE /api/recon/sessions/:id
 */
exports.deleteSession = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;

    const result = await reconciliationDAO.deleteSession(sessionId, userId);
    
    if (!result.deleted) {
      return res.status(404).json({ error: result.error || 'Session not found' });
    }

    res.json({
      message: 'Reconciliation session deleted successfully',
      session_id: sessionId,
      transactions_unreconciled: result.transactions_unreconciled
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get transactions for a session
 * GET /api/recon/sessions/:id/transactions
 */
exports.getSessionTransactions = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: sessionId } = req.params;
    const userId = req.user.user_id;

    const session = await reconciliationDAO.getSessionById(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transactions = await reconciliationDAO.getSessionTransactions(
      userId,
      session.account_id,
      session.period_start,
      session.period_end,
      sessionId
    );

    res.json({
      session_id: sessionId,
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Get session transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get comprehensive transaction details with all related reconciliation data
 * GET /api/recon/transactions/:id/details
 */
exports.getTransactionDetails = async (req, res) => {
  try {
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const { id: transactionId } = req.params;
    const userId = req.user.user_id;

    const details = await reconciliationDAO.getTransactionDetails(transactionId, userId);

    if (!details) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(details);

  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ error: error.message });
  }
};
