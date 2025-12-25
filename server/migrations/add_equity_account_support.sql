-- Migration: Add Equity Account Support and Double-Entry Accounting
-- Date: 2025-10-11
-- Description: Implements proper double-entry accounting with equity accounts to maintain
--              the fundamental accounting equation: Assets = Liabilities + Equity

-- Step 1: Add account_class field to classify accounts properly
ALTER TABLE Accounts ADD COLUMN account_class TEXT DEFAULT 'asset' CHECK (account_class IN ('asset', 'liability', 'equity'));

-- Step 2: Add is_system_account flag for auto-managed equity accounts
ALTER TABLE Accounts ADD COLUMN is_system_account INTEGER DEFAULT 0;

-- Step 3: Update existing accounts to have proper classifications based on their types
-- Assets: checking, savings, investment, cash (positive_is_credit = 0)
UPDATE Accounts 
SET account_class = 'asset' 
WHERE account_type IN ('checking', 'savings', 'investment', 'cash') 
   OR positive_is_credit = 0;

-- Liabilities: credit, loan, mortgage (positive_is_credit = 1)
UPDATE Accounts 
SET account_class = 'liability' 
WHERE account_type IN ('credit', 'loan', 'mortgage') 
   OR (positive_is_credit = 1 AND account_type != 'equity');

-- Step 4: Create index for account class queries
CREATE INDEX IF NOT EXISTS idx_accounts_class ON Accounts (account_class, user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_system ON Accounts (is_system_account, user_id);

-- Step 5: Create a view for the accounting equation per user
CREATE VIEW IF NOT EXISTS v_accounting_equation AS
SELECT 
    user_id,
    -- Assets (positive balances for asset accounts)
    COALESCE(SUM(CASE 
        WHEN account_class = 'asset' THEN current_balance 
        ELSE 0 
    END), 0) as total_assets,
    
    -- Liabilities (absolute value of balances for liability accounts)
    COALESCE(SUM(CASE 
        WHEN account_class = 'liability' THEN ABS(current_balance)
        ELSE 0 
    END), 0) as total_liabilities,
    
    -- Equity (current equity account balance)
    COALESCE(SUM(CASE 
        WHEN account_class = 'equity' THEN current_balance 
        ELSE 0 
    END), 0) as total_equity,
    
    -- Calculated equity (Assets - Liabilities)
    COALESCE(SUM(CASE 
        WHEN account_class = 'asset' THEN current_balance 
        ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
        WHEN account_class = 'liability' THEN ABS(current_balance)
        ELSE 0 
    END), 0) as calculated_equity,
    
    -- Difference (should be zero if equity is properly maintained)
    COALESCE(SUM(CASE 
        WHEN account_class = 'equity' THEN current_balance 
        ELSE 0 
    END), 0) - 
    (COALESCE(SUM(CASE 
        WHEN account_class = 'asset' THEN current_balance 
        ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
        WHEN account_class = 'liability' THEN ABS(current_balance)
        ELSE 0 
    END), 0)) as equity_difference
    
FROM Accounts
GROUP BY user_id;

-- Step 6: Create a helper view for account balances by class
CREATE VIEW IF NOT EXISTS v_account_balances_by_class AS
SELECT 
    user_id,
    account_class,
    account_type,
    COUNT(*) as account_count,
    SUM(current_balance) as total_balance,
    AVG(current_balance) as avg_balance,
    MIN(current_balance) as min_balance,
    MAX(current_balance) as max_balance
FROM Accounts
GROUP BY user_id, account_class, account_type;

-- Step 7: Add audit columns for equity tracking
ALTER TABLE Accounts ADD COLUMN equity_last_reconciled TEXT;
ALTER TABLE Accounts ADD COLUMN equity_reconciliation_note TEXT;

-- Step 8: Create a log table for equity adjustments
CREATE TABLE IF NOT EXISTS EquityAdjustments (
    adjustment_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    equity_account_id TEXT NOT NULL,
    adjustment_amount REAL NOT NULL,
    adjustment_reason TEXT,
    assets_total REAL,
    liabilities_total REAL,
    equity_before REAL,
    equity_after REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (equity_account_id) REFERENCES Accounts(account_id)
);

CREATE INDEX IF NOT EXISTS idx_equity_adjustments_user ON EquityAdjustments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equity_adjustments_account ON EquityAdjustments (equity_account_id);

-- Step 9: Add comments/metadata for documentation
-- This migration establishes the foundation for double-entry accounting
-- Future updates should maintain the equation: Assets = Liabilities + Equity
-- Equity accounts should be automatically reconciled when:
-- 1. New accounts are created
-- 2. Account balances change
-- 3. Transactions are posted
-- 4. Manual reconciliation is requested

