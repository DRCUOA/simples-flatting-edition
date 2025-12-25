BEGIN TRANSACTION;

-- Add signed_amount column to Transactions if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN; this will fail if rerun.
-- It's intended to be run once via a migration script.
ALTER TABLE Transactions ADD COLUMN signed_amount REAL;

-- Backfill signed_amount based on Accounts.positive_is_credit and transaction_type
UPDATE Transactions
SET signed_amount = CASE 
  WHEN (SELECT positive_is_credit FROM Accounts WHERE account_id = Transactions.account_id) = 1 THEN 
    CASE WHEN transaction_type = 'C' THEN amount ELSE -amount END
  ELSE 
    CASE WHEN transaction_type = 'D' THEN amount ELSE -amount END
END;

-- Optional index to speed up aggregations on signed_amount
CREATE INDEX IF NOT EXISTS idx_transactions_signed_amount ON Transactions (signed_amount);

COMMIT;

