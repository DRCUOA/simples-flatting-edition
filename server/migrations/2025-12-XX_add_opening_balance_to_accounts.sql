-- Migration: Add opening_balance field to Accounts table
-- Date: 2025-12-XX
-- Description: Add separate opening_balance field that stores user-entered opening balance
--              This field is NEVER changed after account creation (unlike current_balance)

BEGIN TRANSACTION;

-- Add opening_balance column to Accounts table
ALTER TABLE Accounts ADD COLUMN opening_balance REAL DEFAULT 0;

-- For existing accounts, set opening_balance = current_balance
-- (This preserves existing data - opening balance was stored in current_balance)
UPDATE Accounts SET opening_balance = current_balance WHERE opening_balance IS NULL OR opening_balance = 0;

COMMIT;

