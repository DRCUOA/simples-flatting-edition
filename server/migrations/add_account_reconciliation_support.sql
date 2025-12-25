-- Migration: Add Account Reconciliation Support
-- Description: Creates Statements table for reconciliation periods and adds reconciliation fields to Transactions
-- Author: System Migration
-- Date: 2024

BEGIN TRANSACTION;

-- Create Statements table for account reconciliation periods
CREATE TABLE IF NOT EXISTS "Statements" (
    "statement_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "opening_balance" DECIMAL(10,2) NOT NULL,
    "closing_balance" DECIMAL(10,2) NOT NULL,
    "created_at" TEXT DEFAULT (datetime('now')),
    "updated_at" TEXT DEFAULT (datetime('now')),
    PRIMARY KEY("statement_id"),
    FOREIGN KEY("account_id") REFERENCES "Accounts"("account_id") ON DELETE CASCADE,
    -- Ensure no overlapping periods for the same account
    UNIQUE("account_id", "period_start", "period_end")
);

-- Create indexes for efficient reconciliation queries
CREATE INDEX IF NOT EXISTS "idx_statements_account" ON "Statements" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_statements_period" ON "Statements" ("period_start", "period_end");
CREATE INDEX IF NOT EXISTS "idx_statements_account_period" ON "Statements" ("account_id", "period_start", "period_end");

-- Add reconciliation fields to Transactions table
-- Check if columns already exist before adding them
ALTER TABLE "Transactions" ADD COLUMN "is_reconciled" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Transactions" ADD COLUMN "statement_id" TEXT;
ALTER TABLE "Transactions" ADD COLUMN "reconciled_at" TEXT;

-- Create indexes for transaction reconciliation (after columns are added)
CREATE INDEX IF NOT EXISTS "idx_transactions_reconciled" ON "Transactions" ("is_reconciled");
CREATE INDEX IF NOT EXISTS "idx_transactions_statement" ON "Transactions" ("statement_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_account_reconciled" ON "Transactions" ("account_id", "is_reconciled");
CREATE INDEX IF NOT EXISTS "idx_transactions_reconciliation_lookup" ON "Transactions" ("account_id", "transaction_date", "is_reconciled");

-- Create trigger to validate statement_id foreign key relationship
CREATE TRIGGER IF NOT EXISTS "validate_transaction_statement_fk"
BEFORE INSERT ON "Transactions"
WHEN NEW.statement_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM "Statements" WHERE "statement_id" = NEW.statement_id) = 0
        THEN RAISE(ABORT, 'Foreign key constraint failed: statement_id does not exist')
    END;
END;

-- Create trigger to validate statement_id foreign key relationship on updates
CREATE TRIGGER IF NOT EXISTS "validate_transaction_statement_fk_update"
BEFORE UPDATE ON "Transactions"
WHEN NEW.statement_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM "Statements" WHERE "statement_id" = NEW.statement_id) = 0
        THEN RAISE(ABORT, 'Foreign key constraint failed: statement_id does not exist')
    END;
END;

-- Create trigger to automatically set reconciled_at timestamp
CREATE TRIGGER IF NOT EXISTS "set_reconciled_timestamp"
BEFORE UPDATE ON "Transactions"
WHEN NEW.is_reconciled = 1 AND OLD.is_reconciled = 0
BEGIN
    UPDATE "Transactions" 
    SET "reconciled_at" = datetime('now')
    WHERE "transaction_id" = NEW.transaction_id;
END;

-- Create trigger to clear reconciled_at when unreconciling
CREATE TRIGGER IF NOT EXISTS "clear_reconciled_timestamp"
BEFORE UPDATE ON "Transactions"
WHEN NEW.is_reconciled = 0 AND OLD.is_reconciled = 1
BEGIN
    UPDATE "Transactions" 
    SET "reconciled_at" = NULL
    WHERE "transaction_id" = NEW.transaction_id;
END;

-- Create trigger to update statement updated_at timestamp
CREATE TRIGGER IF NOT EXISTS "update_statement_timestamp"
BEFORE UPDATE ON "Statements"
BEGIN
    UPDATE "Statements" 
    SET "updated_at" = datetime('now')
    WHERE "statement_id" = NEW.statement_id;
END;

-- Create trigger to validate period dates
CREATE TRIGGER IF NOT EXISTS "validate_statement_period"
BEFORE INSERT ON "Statements"
BEGIN
    SELECT CASE
        WHEN NEW.period_start >= NEW.period_end
        THEN RAISE(ABORT, 'Statement period_start must be before period_end')
    END;
END;

-- Create trigger to validate period dates on updates
CREATE TRIGGER IF NOT EXISTS "validate_statement_period_update"
BEFORE UPDATE ON "Statements"
BEGIN
    SELECT CASE
        WHEN NEW.period_start >= NEW.period_end
        THEN RAISE(ABORT, 'Statement period_start must be before period_end')
    END;
END;

-- Create view for reconciliation summary by account
CREATE VIEW IF NOT EXISTS "reconciliation_summary" AS
SELECT 
    a.account_id,
    a.account_name,
    COUNT(s.statement_id) as total_statements,
    MAX(s.period_end) as last_reconciled_date,
    COALESCE(SUM(CASE WHEN t.is_reconciled = 0 THEN 1 ELSE 0 END), 0) as unreconciled_transactions,
    COALESCE(SUM(CASE WHEN t.is_reconciled = 1 THEN 1 ELSE 0 END), 0) as reconciled_transactions
FROM "Accounts" a
LEFT JOIN "Statements" s ON a.account_id = s.account_id
LEFT JOIN "Transactions" t ON a.account_id = t.account_id
GROUP BY a.account_id, a.account_name;

COMMIT;
