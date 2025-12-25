-- Migration: Add Reconciliation Tables
-- Date: 2025-10-24
-- Description: Implements bank reconciliation system with statement imports and matching
-- Purpose: Link internal Transactions to external StatementLines without mutating historical data

BEGIN TRANSACTION;

-- ============================================================================
-- StatementImports: File metadata with hash-based deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS StatementImports (
  import_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  bank_name TEXT,
  statement_from TEXT NOT NULL,
  statement_to TEXT NOT NULL,
  closing_balance REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(account_id) REFERENCES Accounts(account_id),
  FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- Prevent duplicate imports via SHA-256 hash of raw file bytes
CREATE UNIQUE INDEX IF NOT EXISTS ux_stmt_import_source 
  ON StatementImports(source_hash);

CREATE INDEX IF NOT EXISTS ix_stmt_import_account 
  ON StatementImports(account_id, statement_from, statement_to);

-- ============================================================================
-- StatementLines: Normalized statement rows with comprehensive bank/card data
-- ============================================================================
CREATE TABLE IF NOT EXISTS StatementLines (
  statement_line_id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  txn_date TEXT NOT NULL,
  raw_amount REAL NOT NULL,
  signed_amount REAL NOT NULL,
  transaction_type_norm TEXT,              -- 'C'|'D'|NULL
  description TEXT,
  description_norm TEXT,
  bank_reference TEXT,
  bank_fitid TEXT,
  instrument_id TEXT,                      -- for card feeds (last 4 digits)
  processed_date TEXT,                     -- for card: secondary date hint
  dedupe_hash TEXT,
  norm_version TEXT DEFAULT 'v1',
  raw_row_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(import_id) REFERENCES StatementImports(import_id),
  FOREIGN KEY(account_id) REFERENCES Accounts(account_id),
  FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- Prevent duplicate FITID entries per account
CREATE UNIQUE INDEX IF NOT EXISTS ux_stmt_line_fitid
  ON StatementLines(user_id, account_id, bank_fitid) 
  WHERE bank_fitid IS NOT NULL;

-- Primary matching lookup: candidate generation
CREATE INDEX IF NOT EXISTS ix_stmt_match
  ON StatementLines(user_id, account_id, txn_date, signed_amount);

-- Card statement filtering
CREATE INDEX IF NOT EXISTS ix_stmt_instr
  ON StatementLines(account_id, instrument_id);

-- Deduplication lookup
CREATE INDEX IF NOT EXISTS ix_stmt_dedupe
  ON StatementLines(dedupe_hash);

-- ============================================================================
-- ReconciliationSessions: Session tracking with embedded period for variance
-- ============================================================================
CREATE TABLE IF NOT EXISTS ReconciliationSessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  closing_balance REAL,
  run_started TEXT DEFAULT (datetime('now')),
  params_json TEXT,                        -- Default: {"amount_tol":0.005,"date_tol_days":1,"fuzzy_threshold":85,"use_instrument":true}
  variance REAL,
  closed INTEGER DEFAULT 0,
  FOREIGN KEY(account_id) REFERENCES Accounts(account_id),
  FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS ix_recon_session_account 
  ON ReconciliationSessions(account_id, closed);

CREATE INDEX IF NOT EXISTS ix_recon_session_period 
  ON ReconciliationSessions(account_id, period_start, period_end);

-- ============================================================================
-- ReconciliationMatches: 1:1 links between transactions and statement lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS ReconciliationMatches (
  match_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  statement_line_id TEXT NOT NULL,
  confidence REAL NOT NULL,
  rule TEXT NOT NULL,
  matched_by TEXT NOT NULL CHECK (matched_by IN ('auto','manual')),
  active INTEGER NOT NULL DEFAULT 1,
  matched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(session_id) REFERENCES ReconciliationSessions(session_id),
  FOREIGN KEY(transaction_id) REFERENCES Transactions(transaction_id),
  FOREIGN KEY(statement_line_id) REFERENCES StatementLines(statement_line_id),
  FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- Enforce 1:1 matching: one active match per transaction
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_tx 
  ON ReconciliationMatches(transaction_id) 
  WHERE active=1;

-- Enforce 1:1 matching: one active match per statement line
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_stmt 
  ON ReconciliationMatches(statement_line_id) 
  WHERE active=1;

CREATE INDEX IF NOT EXISTS ix_recon_match_session 
  ON ReconciliationMatches(session_id, active);

CREATE INDEX IF NOT EXISTS ix_recon_match_account 
  ON ReconciliationMatches(account_id, active);

-- ============================================================================
-- Views: Expose reconciliation status and computed signed amounts
-- ============================================================================

-- V_TransactionsSigned: Expose computed effective_signed_amount for all transactions
CREATE VIEW IF NOT EXISTS V_TransactionsSigned AS
SELECT
  t.*,
  CASE
    WHEN UPPER(substr(t.transaction_type,1,1))='C' THEN abs(t.amount)
    WHEN UPPER(substr(t.transaction_type,1,1))='D' THEN -abs(t.amount)
    WHEN a.positive_is_credit=1 THEN t.amount
    ELSE -t.amount
  END AS effective_signed_amount
FROM Transactions t
JOIN Accounts a ON a.account_id=t.account_id;

-- V_TransactionsRecon: Show reconciliation status per transaction
CREATE VIEW IF NOT EXISTS V_TransactionsRecon AS
SELECT
  t.*,
  EXISTS(
    SELECT 1 
    FROM ReconciliationMatches m 
    WHERE m.transaction_id=t.transaction_id 
      AND m.active=1
  ) AS reconciled
FROM Transactions t;

-- ============================================================================
-- Performance Indexes on Transactions for matching
-- ============================================================================

-- Optimize candidate generation queries
CREATE INDEX IF NOT EXISTS ix_tx_for_match
  ON Transactions(user_id, account_id, transaction_date, signed_amount);

-- Filter by reconciliation-relevant flags
CREATE INDEX IF NOT EXISTS ix_tx_flags
  ON Transactions(account_id, is_transfer, posted_status);

COMMIT;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. source_hash uses SHA-256 of raw file bytes for idempotency
-- 2. dedupe_hash format differs by source:
--    - Bank ledger: SHA-256(txn_date|description_norm|signed_amount|transaction_type_norm)
--    - Card: SHA-256(txn_date|instrument_id|description_norm|signed_amount|transaction_type_norm)
-- 3. processed_date is card-specific; used as secondary date hint with reduced confidence
-- 4. Reconciliation NEVER modifies Accounts.current_balance
-- 5. All balance effects already captured via Transactions.signed_amount

