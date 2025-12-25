-- Migration: Add BalanceAdjustments Table
-- Date: 2025-01-XX
-- Description: Creates a table to track historic balance adjustments for accounts
--              Separate from opening balance setting - this is for corrections/adjustments

-- Create BalanceAdjustments table for tracking historic balance adjustments
CREATE TABLE IF NOT EXISTS BalanceAdjustments (
    adjustment_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    adjustment_amount REAL NOT NULL,
    adjustment_date TEXT NOT NULL,
    adjustment_reason TEXT,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    created_by_user_id TEXT,
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_account ON BalanceAdjustments (account_id, adjustment_date DESC);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user ON BalanceAdjustments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_date ON BalanceAdjustments (adjustment_date DESC);

