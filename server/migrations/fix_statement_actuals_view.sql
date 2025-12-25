-- Migration: Fix v_statement_actuals view
-- Description: Fixes the v_statement_actuals view to get user_id from Accounts table instead of Statements table
-- Date: 2025-09-21
-- Issue: Statements table doesn't have user_id column, causing SQLITE_ERROR

BEGIN TRANSACTION;

-- Drop the existing view
DROP VIEW IF EXISTS v_statement_actuals;

-- Recreate the view with correct user_id reference from Accounts table
CREATE VIEW IF NOT EXISTS v_statement_actuals AS
SELECT 
  s.statement_id,
  a.user_id,
  s.account_id,
  s.period_start,
  s.period_end,
  s.opening_balance,
  s.closing_balance,
  COALESCE(SUM(v.canonical_amount), 0) AS calculated_movement,
  COALESCE(COUNT(v.transaction_id), 0) AS total_transactions,
  COALESCE(COUNT(CASE WHEN v.is_reconciled = 1 THEN 1 END), 0) AS reconciled_transactions,
  COALESCE(SUM(CASE WHEN v.is_reconciled = 1 THEN v.canonical_amount ELSE 0 END), 0) AS reconciled_amount,
  COALESCE(SUM(CASE WHEN v.is_reconciled = 0 THEN v.canonical_amount ELSE 0 END), 0) AS unreconciled_amount,
  -- Reconciliation percentage
  CASE 
    WHEN COUNT(v.transaction_id) > 0 
    THEN ROUND(CAST(COUNT(CASE WHEN v.is_reconciled = 1 THEN 1 END) AS FLOAT) / COUNT(v.transaction_id) * 100, 2)
    ELSE 0 
  END AS reconciliation_percentage
FROM Statements s
INNER JOIN Accounts a ON s.account_id = a.account_id
LEFT JOIN v_amounts_normalized v ON (
  a.user_id = v.user_id
  AND s.account_id = v.account_id  
  AND DATE(v.transaction_date) >= DATE(s.period_start)
  AND DATE(v.transaction_date) <= DATE(s.period_end)
)
GROUP BY s.statement_id, a.user_id, s.account_id, s.period_start, s.period_end, s.opening_balance, s.closing_balance;

COMMIT;
