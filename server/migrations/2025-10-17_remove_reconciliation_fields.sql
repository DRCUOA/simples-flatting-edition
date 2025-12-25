-- Migration: Remove Reconciliation Fields
-- Date: 2025-10-17
-- Description: Removes reconciliation-related fields from Transactions and Accounts tables
--              as part of simplification plan

BEGIN TRANSACTION;

-- Drop reconciliation-related indexes first
DROP INDEX IF EXISTS idx_transactions_reconciled;
DROP INDEX IF EXISTS idx_transactions_statement;
DROP INDEX IF EXISTS idx_transactions_account_reconciled;
DROP INDEX IF EXISTS idx_transactions_reconciliation_lookup;

-- Drop reconciliation triggers
DROP TRIGGER IF EXISTS set_reconciled_timestamp;
DROP TRIGGER IF EXISTS clear_reconciled_timestamp;

-- Note: SQLite doesn't support DROP COLUMN, so we'll recreate tables without reconciliation fields
-- Create new Transactions table without reconciliation fields
CREATE TABLE Transactions_new (
    transaction_id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    signed_amount REAL,
    category_id TEXT,
    account_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    linked_transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    import_id TEXT NOT NULL DEFAULT 'default',
    dedupe_hash TEXT,
    user_id TEXT,
    is_transfer INTEGER DEFAULT 0,
    posted_status TEXT DEFAULT 'posted',
    FOREIGN KEY(account_id) REFERENCES Accounts(account_id),
    FOREIGN KEY(category_id) REFERENCES Categories(category_id),
    FOREIGN KEY(linked_transaction_id) REFERENCES Transactions(transaction_id)
);

-- Copy data from old table to new table (excluding reconciliation fields)
INSERT INTO Transactions_new 
SELECT transaction_id, transaction_date, description, amount, signed_amount, 
       category_id, account_id, transaction_type, linked_transaction_id, 
       created_at, import_id, dedupe_hash, user_id, is_transfer, posted_status
FROM Transactions;

-- Drop old table and rename new one
DROP TABLE Transactions;
ALTER TABLE Transactions_new RENAME TO Transactions;

-- Create new Accounts table without reconciliation fields
CREATE TABLE Accounts_new (
    account_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    current_balance REAL NOT NULL DEFAULT 0,
    positive_is_credit INTEGER NOT NULL DEFAULT 1,
    last_balance_update TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    account_class TEXT DEFAULT 'asset' CHECK(account_class IN ('asset', 'liability', 'equity')),
    is_system_account INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

-- Copy data from old table to new table (excluding reconciliation fields)
INSERT INTO Accounts_new 
SELECT account_id, user_id, account_name, account_type, current_balance, 
       positive_is_credit, last_balance_update, created_at, account_class, is_system_account
FROM Accounts;

-- Drop old table and rename new one
DROP TABLE Accounts;
ALTER TABLE Accounts_new RENAME TO Accounts;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON Transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON Transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON Transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_dedupe ON Transactions (account_id, dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_tx_user_id ON Transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_tx_user_acct_date ON Transactions (user_id, account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat_date ON Transactions (user_id, category_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_is_transfer ON Transactions (is_transfer);
CREATE INDEX IF NOT EXISTS idx_transactions_posted_status ON Transactions (posted_status);
CREATE INDEX IF NOT EXISTS idx_transactions_actuals_filter ON Transactions (user_id, transaction_date, posted_status, is_transfer);

CREATE INDEX IF NOT EXISTS idx_accounts_class ON Accounts (account_class, user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_system ON Accounts (is_system_account, user_id);

COMMIT;
