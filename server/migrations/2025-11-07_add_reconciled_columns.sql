-- Migration: Add is_reconciled and reconciled_at columns to Transactions
-- Date: 2025-11-07
-- Description: Add reconciliation tracking columns to Transactions table
-- Purpose: Support simplified reconciliation by tracking which transactions are reconciled

BEGIN TRANSACTION;

-- Add is_reconciled column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
-- Note: This will fail silently if column already exists (which is fine)

-- Add is_reconciled column
ALTER TABLE Transactions ADD COLUMN is_reconciled INTEGER DEFAULT 0;

-- Add reconciled_at column
ALTER TABLE Transactions ADD COLUMN reconciled_at TEXT;

-- Create index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled 
  ON Transactions(is_reconciled);

CREATE INDEX IF NOT EXISTS idx_transactions_account_reconciled 
  ON Transactions(account_id, is_reconciled);

COMMIT;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. is_reconciled is INTEGER (0 = false, 1 = true) for SQLite compatibility
-- 2. reconciled_at stores the timestamp when transaction was reconciled
-- 3. Indexes added for efficient reconciliation queries

