-- Migration: Simplify Database - Remove Advanced Features
-- Date: 2025-10-16
-- Description: Removes tables, views, and fields for budgets, statements, equity tracking,
--              and DB actuals system as part of codebase simplification

BEGIN TRANSACTION;

-- Drop actuals views
DROP VIEW IF EXISTS v_statement_actuals;
DROP VIEW IF EXISTS v_budget_actuals;
DROP VIEW IF EXISTS v_category_actuals;
DROP VIEW IF EXISTS v_account_actuals;
DROP VIEW IF EXISTS v_amounts_normalized;

-- Drop equity views
DROP VIEW IF EXISTS v_accounting_equation;

-- Drop tables for removed features
DROP TABLE IF EXISTS Statements;
DROP TABLE IF EXISTS budget_category_month;
DROP TABLE IF EXISTS Budgets_legacy;
DROP TABLE IF EXISTS Budgets;

-- Remove account complexity fields (equity tracking)
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- First, check if we need to migrate data

-- Create temporary table with simplified schema
CREATE TABLE IF NOT EXISTS Accounts_new (
    account_id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    current_balance DECIMAL(10,2) DEFAULT 0,
    positive_is_credit INTEGER NOT NULL DEFAULT 0,
    last_balance_update TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Copy data from old table to new table (excluding equity accounts and system accounts)
INSERT INTO Accounts_new (
    account_id, user_id, account_name, account_type, current_balance, 
    positive_is_credit, last_balance_update, created_at, updated_at
)
SELECT 
    account_id, user_id, account_name, account_type, current_balance,
    positive_is_credit, last_balance_update, created_at, updated_at
FROM Accounts
WHERE (account_type IS NULL OR account_type != 'equity')
    AND (is_system_account IS NULL OR is_system_account != 1);

-- Drop old table
DROP TABLE IF EXISTS Accounts;

-- Rename new table to original name
ALTER TABLE Accounts_new RENAME TO Accounts;

-- Recreate indexes for Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON Accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON Accounts(account_type);

-- Remove transaction reconciliation fields
-- Again, SQLite requires recreating the table

CREATE TABLE IF NOT EXISTS Transactions_new (
    transaction_id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    is_transfer INTEGER DEFAULT 0,
    notes TEXT,
    signed_amount DECIMAL(10,2),
    dedupe_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES Accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES Categories(category_id) ON DELETE SET NULL
);

-- Copy data from old table to new table
INSERT INTO Transactions_new (
    transaction_id, user_id, transaction_date, description, amount,
    transaction_type, account_id, category_id, is_transfer, notes,
    signed_amount, dedupe_hash, created_at, updated_at
)
SELECT 
    transaction_id, user_id, transaction_date, description, amount,
    transaction_type, account_id, category_id, is_transfer, notes,
    signed_amount, dedupe_hash, created_at, updated_at
FROM Transactions;

-- Drop old table
DROP TABLE IF EXISTS Transactions;

-- Rename new table to original name
ALTER TABLE Transactions_new RENAME TO Transactions;

-- Recreate indexes for Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON Transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON Transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON Transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON Transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dedupe_hash ON Transactions(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON Transactions(transaction_type);

COMMIT;

