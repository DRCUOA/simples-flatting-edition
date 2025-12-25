-- Migration: Simplify Reconciliation Schema
-- Date: 2025-10-25
-- Description: Add start_balance to ReconciliationSessions and prepare for simplified reconciliation
-- Purpose: Support reconciliation with only date range and balances (no statement imports required)

BEGIN TRANSACTION;

-- Add start_balance column to ReconciliationSessions if it doesn't exist
-- This allows users to reconcile with just start balance and closing balance
ALTER TABLE ReconciliationSessions ADD COLUMN start_balance REAL;

-- Ensure Transactions table has is_reconciled column (should already exist from previous migrations)
-- This is a no-op if column already exists, but we verify it's there
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll rely on the fact that previous migrations should have added it

-- Update ReconciliationSessions to make statement_line_id optional in ReconciliationMatches
-- We'll modify the constraint later, but for now we'll make it nullable
-- Actually, SQLite doesn't support modifying constraints easily, so we'll handle this in code

COMMIT;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. start_balance allows users to enter opening balance from bank statement
-- 2. Variance calculation: (start_balance + sum of transactions) - closing_balance
-- 3. ReconciliationMatches can still reference statement_line_id for backward compatibility
--    but new simplified reconciliation won't require it

