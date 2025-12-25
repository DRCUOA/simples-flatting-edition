-- Migration: Add Transaction Tracking Fields
-- Date: 2025-10-11
-- Description: Adds is_transfer and posted_status fields to Transactions table
-- Enables proper actuals filtering per budget reporting principles

BEGIN TRANSACTION;

-- Add is_transfer flag to identify transfer transactions
ALTER TABLE Transactions ADD COLUMN is_transfer INTEGER DEFAULT 0;

-- Add posted_status to track transaction lifecycle
-- Values: 'pending', 'cleared', 'posted'
ALTER TABLE Transactions ADD COLUMN posted_status TEXT DEFAULT 'posted';

-- Backfill is_transfer for existing transactions
-- Mark transactions with Internal-Transfers category as transfers
UPDATE Transactions
SET is_transfer = 1
WHERE category_id IN (
    SELECT category_id 
    FROM Categories 
    WHERE category_name = 'Internal-Transfers'
);

-- Backfill posted_status for all existing transactions
-- Default to 'posted' for existing data
UPDATE Transactions
SET posted_status = 'posted'
WHERE posted_status IS NULL;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_transactions_is_transfer 
ON Transactions(is_transfer);

CREATE INDEX IF NOT EXISTS idx_transactions_posted_status 
ON Transactions(posted_status);

-- Composite index for actuals queries (user + date + posted_status + is_transfer)
CREATE INDEX IF NOT EXISTS idx_transactions_actuals_filter 
ON Transactions(user_id, transaction_date, posted_status, is_transfer);

-- Check constraint to ensure posted_status has valid values
-- Note: SQLite doesn't enforce CHECK constraints in ALTER TABLE,
-- so we document the expected values here: 'pending', 'cleared', 'posted'

COMMIT;

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM pragma_table_info('Transactions') WHERE name = 'is_transfer') as is_transfer_exists,
    (SELECT COUNT(*) FROM pragma_table_info('Transactions') WHERE name = 'posted_status') as posted_status_exists,
    (SELECT COUNT(*) FROM Transactions WHERE is_transfer = 1) as transfers_count,
    (SELECT COUNT(*) FROM Transactions WHERE posted_status = 'posted') as posted_count;

