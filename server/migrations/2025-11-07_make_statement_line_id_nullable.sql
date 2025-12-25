-- Migration: Make statement_line_id nullable in ReconciliationMatches
-- Date: 2025-11-07
-- Description: Allow NULL statement_line_id for simplified reconciliation (transaction-only matching)
-- Purpose: Support reconciliation without requiring statement imports

BEGIN TRANSACTION;

-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
-- First, create a new table with nullable statement_line_id
CREATE TABLE IF NOT EXISTS ReconciliationMatches_new (
  match_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  statement_line_id TEXT,  -- Now nullable
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

-- Copy existing data
INSERT INTO ReconciliationMatches_new 
SELECT * FROM ReconciliationMatches;

-- Drop old table
DROP TABLE ReconciliationMatches;

-- Rename new table
ALTER TABLE ReconciliationMatches_new RENAME TO ReconciliationMatches;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_tx 
  ON ReconciliationMatches(transaction_id) 
  WHERE active=1;

-- Update unique index for statement_line_id to only apply when not NULL
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_stmt 
  ON ReconciliationMatches(statement_line_id) 
  WHERE active=1 AND statement_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_recon_match_session 
  ON ReconciliationMatches(session_id, active);

CREATE INDEX IF NOT EXISTS ix_recon_match_account 
  ON ReconciliationMatches(account_id, active);

COMMIT;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. statement_line_id is now nullable to support simplified reconciliation
-- 2. Unique constraint on statement_line_id only applies when it's not NULL
-- 3. This maintains backward compatibility with existing statement-based matches

