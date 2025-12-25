BEGIN TRANSACTION;

-- Add dedupe_hash column to Transactions if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN; this will fail if rerun.
ALTER TABLE Transactions ADD COLUMN dedupe_hash TEXT;

-- Create a helpful index to speed duplicate checks during preview by account and hash
CREATE INDEX IF NOT EXISTS idx_transactions_account_dedupe ON Transactions (account_id, dedupe_hash);

COMMIT;


