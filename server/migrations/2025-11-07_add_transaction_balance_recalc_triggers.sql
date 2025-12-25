-- Migration: Add triggers to recalculate account balances when transactions change
-- Description: Creates triggers on INSERT, UPDATE, DELETE of transactions table
--              to ensure account balances are recalculated from oldest opening balance
--              whenever ANY transaction is modified, including direct SQL updates

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create a table to queue accounts that need balance recalculation
-- This allows triggers to mark accounts for recalculation, which the application
-- can then process using the recalculateAccountBalanceFromOldest function
CREATE TABLE IF NOT EXISTS account_balance_recalc_queue (
  account_id TEXT NOT NULL,
  transaction_date TEXT,
  queued_at TEXT DEFAULT (datetime('now')),
  processed INTEGER DEFAULT 0,
  PRIMARY KEY (account_id)
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_recalc_queue_processed ON account_balance_recalc_queue(processed, queued_at);

-- Trigger: After INSERT on Transactions
-- Marks the account for balance recalculation
CREATE TRIGGER IF NOT EXISTS trigger_recalc_balance_on_insert
AFTER INSERT ON Transactions
BEGIN
  INSERT OR REPLACE INTO account_balance_recalc_queue (account_id, transaction_date, processed, queued_at)
  VALUES (NEW.account_id, NEW.transaction_date, 0, datetime('now'));
END;

-- Trigger: After UPDATE on Transactions
-- Marks both old and new accounts for balance recalculation (in case account_id changed)
-- Note: We queue both accounts; INSERT OR REPLACE handles duplicates efficiently
CREATE TRIGGER IF NOT EXISTS trigger_recalc_balance_on_update
AFTER UPDATE ON Transactions
BEGIN
  -- Mark new account for recalculation
  INSERT OR REPLACE INTO account_balance_recalc_queue (account_id, transaction_date, processed, queued_at)
  VALUES (NEW.account_id, NEW.transaction_date, 0, datetime('now'));
  
  -- Also mark old account (INSERT OR REPLACE handles case where account_id didn't change)
  INSERT OR REPLACE INTO account_balance_recalc_queue (account_id, transaction_date, processed, queued_at)
  VALUES (OLD.account_id, OLD.transaction_date, 0, datetime('now'));
END;

-- Trigger: After DELETE on Transactions
-- Marks the account for balance recalculation
CREATE TRIGGER IF NOT EXISTS trigger_recalc_balance_on_delete
AFTER DELETE ON Transactions
BEGIN
  INSERT OR REPLACE INTO account_balance_recalc_queue (account_id, transaction_date, processed, queued_at)
  VALUES (OLD.account_id, OLD.transaction_date, 0, datetime('now'));
END;

-- Note: The application code automatically processes the queue:
-- 1. Transaction operations (create/update/delete) call recalculateAccountBalanceFromOldest directly
-- 2. After recalculation, they mark the queue as processed (triggers will have queued it)
-- 3. For manual processing, use accountDAO.processBalanceRecalcQueue() or processAccountFromQueue()
-- 
-- This ensures that ANY change to the transactions table (including direct SQL) triggers balance recalculation

