// server/routes/reconciliation-router.js

const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliation-controller');
const { authenticateToken } = require('../middleware/auth');

// All reconciliation routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/recon/sessions
 * @desc Create a new reconciliation session
 * @access Private
 * @param {string} account_id - Account ID
 * @param {string} period_start - Period start date (YYYY-MM-DD)
 * @param {string} period_end - Period end date (YYYY-MM-DD)
 * @param {number} start_balance - Start balance (from bank statement)
 * @param {number} closing_balance - Closing balance (from bank statement)
 */
router.post('/sessions', reconciliationController.createSession);

/**
 * @route GET /api/recon/sessions
 * @desc Get all reconciliation sessions for user/account
 * @access Private
 * @param {string} [account_id] - Optional account ID filter
 */
router.get('/sessions', reconciliationController.getSessions);

/**
 * @route GET /api/recon/sessions/:id
 * @desc Get session details with matches
 * @access Private
 * @param {string} id - Session ID
 */
router.get('/sessions/:id', reconciliationController.getSession);

/**
 * @route PUT /api/recon/sessions/:id
 * @desc Update session parameters (only for draft/active sessions)
 * @access Private
 * @param {string} id - Session ID
 * @param {string} [period_start] - Period start date (YYYY-MM-DD)
 * @param {string} [period_end] - Period end date (YYYY-MM-DD)
 * @param {number} [start_balance] - Start balance (from bank statement)
 * @param {number} [closing_balance] - Closing balance (from bank statement)
 */
router.put('/sessions/:id', reconciliationController.updateSession);

/**
 * @route GET /api/recon/sessions/:id/summary
 * @desc Get session summary with counts and variance
 * @access Private
 * @param {string} id - Session ID
 */
router.get('/sessions/:id/summary', reconciliationController.getSessionSummary);

/**
 * @route GET /api/recon/sessions/:id/transactions
 * @desc Get all transactions for a session
 * @access Private
 * @param {string} id - Session ID
 */
router.get('/sessions/:id/transactions', reconciliationController.getSessionTransactions);

/**
 * @route GET /api/recon/sessions/:id/matches
 * @desc Get matches for a session with optional filters
 * @access Private
 * @param {string} id - Session ID
 * @param {string} [matched_by] - Matched by filter (auto, manual)
 * @param {number} [limit] - Limit results
 */
router.get('/sessions/:id/matches', reconciliationController.getSessionMatches);

/**
 * @route POST /api/recon/sessions/:id/close
 * @desc Close a session (freeze matches and compute final variance)
 * @access Private
 * @param {string} id - Session ID
 */
router.post('/sessions/:id/close', reconciliationController.closeSession);

/**
 * @route DELETE /api/recon/sessions/:id
 * @desc Delete a reconciliation session and unreconcile transactions
 * @access Private
 * @param {string} id - Session ID
 */
router.delete('/sessions/:id', reconciliationController.deleteSession);

/**
 * @route POST /api/recon/matches
 * @desc Create a manual match (reconcile a transaction)
 * @access Private
 * @param {string} session_id - Session ID
 * @param {string} transaction_id - Transaction ID
 */
router.post('/matches', reconciliationController.createMatch);

/**
 * @route DELETE /api/recon/matches/:id
 * @desc Delete a match (deactivate)
 * @access Private
 * @param {string} id - Match ID
 */
router.delete('/matches/:id', reconciliationController.deleteMatch);

/**
 * @route GET /api/recon/unmatched-transactions
 * @desc Get unmatched transactions for an account
 * @access Private
 * @param {string} account_id - Account ID
 * @param {string} [date_from] - Optional date filter (YYYY-MM-DD)
 * @param {string} [date_to] - Optional date filter (YYYY-MM-DD)
 * @param {string} [session_id] - Optional session ID to exclude transactions in this session
 * @param {string} [include_transfers] - Include transfer transactions (default: false)
 * @param {string} [include_non_posted] - Include non-posted transactions (default: false)
 */
router.get('/unmatched-transactions', reconciliationController.getUnmatchedTransactions);

/**
 * @route GET /api/recon/transactions/:id/details
 * @desc Get comprehensive transaction details with all related reconciliation data
 * @access Private
 * @param {string} id - Transaction ID
 */
router.get('/transactions/:id/details', reconciliationController.getTransactionDetails);

module.exports = router;
