-- Migration: Add last_imported_transaction_date to Accounts table
-- Description: Separates the concept of "latest transaction date imported" from "balance reconciled to date"
--              This prevents importing older transactions from corrupting balance_as_of_date

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Add last_imported_transaction_date column (domain date: YYYY-MM-DD format)
ALTER TABLE Accounts ADD COLUMN last_imported_transaction_date TEXT;

-- Initialize last_imported_transaction_date from existing transaction data
-- Set it to the maximum transaction_date for each account
UPDATE Accounts
SET last_imported_transaction_date = (
  SELECT MAX(transaction_date)
  FROM Transactions
  WHERE Transactions.account_id = Accounts.account_id
)
WHERE EXISTS (
  SELECT 1
  FROM Transactions
  WHERE Transactions.account_id = Accounts.account_id
);

-- For accounts with no transactions, set to NULL (will be updated on first import)
-- This is already handled by the UPDATE above (only updates where transactions exist)

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_accounts_last_imported_tx_date 
ON Accounts(last_imported_transaction_date);

COMMIT;

