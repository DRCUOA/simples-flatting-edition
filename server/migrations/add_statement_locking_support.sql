-- Migration: Add Statement Locking Support
-- Description: Adds conservative locking support for reconciled statements and transactions
-- Author: System Migration
-- Date: 2025-09-13

BEGIN TRANSACTION;

-- Add new columns to support statement locking and transaction reconciliation tracking
-- These columns are all NULLable to avoid breaking existing data

-- Add is_locked column to Statements table (if it doesn't exist)
-- This tracks when a statement is fully reconciled and locked
ALTER TABLE Statements ADD COLUMN is_locked BOOLEAN DEFAULT 0;

-- Add reconciled_statement_id to Transactions table (if it doesn't exist)
-- This provides a clear reference to which statement a transaction is reconciled to
-- (reusing existing statement_id field as reconciled_statement_id conceptually)
-- The existing statement_id field already serves this purpose, so no new column needed

-- Create indexes for efficient locking queries (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_statements_locked ON Statements(is_locked);
CREATE INDEX IF NOT EXISTS idx_statements_account_locked ON Statements(account_id, is_locked);

-- Add a view to easily check statement reconciliation completeness
CREATE VIEW IF NOT EXISTS statement_reconciliation_status AS
SELECT 
    s.statement_id,
    s.account_id,
    s.period_start,
    s.period_end,
    s.is_locked,
    COUNT(t.transaction_id) as total_transactions,
    COUNT(CASE WHEN t.is_reconciled = 1 AND t.statement_id = s.statement_id THEN 1 END) as reconciled_transactions,
    COUNT(CASE WHEN t.is_reconciled = 0 OR t.statement_id IS NULL OR t.statement_id != s.statement_id THEN 1 END) as unreconciled_transactions,
    CASE 
        WHEN COUNT(t.transaction_id) = 0 THEN 1
        WHEN COUNT(t.transaction_id) = COUNT(CASE WHEN t.is_reconciled = 1 AND t.statement_id = s.statement_id THEN 1 END) THEN 1
        ELSE 0
    END as is_fully_reconciled
FROM Statements s
LEFT JOIN Transactions t ON s.account_id = t.account_id 
    AND t.transaction_date >= s.period_start 
    AND t.transaction_date <= s.period_end
GROUP BY s.statement_id, s.account_id, s.period_start, s.period_end, s.is_locked;

-- Add trigger to prevent editing locked statement metadata
CREATE TRIGGER IF NOT EXISTS prevent_locked_statement_edits
BEFORE UPDATE ON Statements
WHEN OLD.is_locked = 1
BEGIN
    SELECT CASE
        WHEN NEW.period_start != OLD.period_start OR 
             NEW.period_end != OLD.period_end OR 
             NEW.opening_balance != OLD.opening_balance OR 
             NEW.closing_balance != OLD.closing_balance OR
             NEW.account_id != OLD.account_id
        THEN RAISE(ABORT, 'Statement is locked (fully reconciled). Delete the statement to unreconcile its transactions before editing.')
    END;
END;

-- Add trigger to prevent editing reconciled transactions
CREATE TRIGGER IF NOT EXISTS prevent_reconciled_transaction_edits
BEFORE UPDATE ON Transactions
WHEN OLD.statement_id IS NOT NULL AND OLD.is_reconciled = 1
BEGIN
    -- Allow updates to reconciliation fields themselves, but not transaction data
    SELECT CASE
        WHEN (NEW.transaction_date != OLD.transaction_date OR 
              NEW.description != OLD.description OR 
              NEW.amount != OLD.amount OR 
              NEW.category_id != OLD.category_id OR
              NEW.account_id != OLD.account_id) AND
             OLD.statement_id IS NOT NULL AND 
             EXISTS (SELECT 1 FROM Statements WHERE statement_id = OLD.statement_id AND is_locked = 1)
        THEN RAISE(ABORT, 'Transaction is reconciled and cannot be edited. Delete its statement to unreconcile.')
    END;
END;

COMMIT;
