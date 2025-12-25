-- Add user_id constraints for strict data partitioning (FIXED VERSION)
-- This migration adds user_id to tables that are missing it and ensures proper foreign key constraints

-- 1. Add user_id to Transactions table for direct user filtering
-- First, add the column as nullable
ALTER TABLE Transactions ADD COLUMN user_id TEXT;

-- Populate user_id from the account relationship
UPDATE Transactions 
SET user_id = (
  SELECT a.user_id 
  FROM Accounts a 
  WHERE a.account_id = Transactions.account_id
);

-- 2. Add user_id to account_field_mappings table
-- Add user_id column (nullable first)
ALTER TABLE account_field_mappings ADD COLUMN user_id TEXT;

-- Populate user_id from account relationship
UPDATE account_field_mappings 
SET user_id = (
  SELECT a.user_id 
  FROM Accounts a 
  WHERE a.account_id = account_field_mappings.account_id
);

-- 3. Add user_id to transaction_imports table
ALTER TABLE transaction_imports ADD COLUMN user_id TEXT;

-- 4. Add user_id to keyword_category_map table
ALTER TABLE keyword_category_map ADD COLUMN user_id TEXT;

-- 5. Create Statements table if it doesn't exist (referenced in transactions)
CREATE TABLE IF NOT EXISTS Statements (
  statement_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  closing_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(account_id) REFERENCES Accounts(account_id),
  FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- 6. Add role column to Users table if it doesn't exist
ALTER TABLE Users ADD COLUMN role TEXT DEFAULT 'user';

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_tx_user_id" ON "Transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_afm_user_id" ON "account_field_mappings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_statements_account_id" ON "Statements" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_statements_user_id" ON "Statements" ("user_id");
