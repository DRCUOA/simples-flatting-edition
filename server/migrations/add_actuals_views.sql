-- Migration: Add DB Actuals Views for FEATURE_STRICT_ACTUALS
-- Description: Creates read-only views for normalized amounts and actuals calculations
-- Date: 2025-09-14
-- Implements conservative, additive rollout of DB-truth actuals

BEGIN TRANSACTION;

-- View 1: v_amounts_normalized
-- Provides canonical_amount that matches calculateSignedAmount.js logic
CREATE VIEW IF NOT EXISTS v_amounts_normalized AS
SELECT 
  t.transaction_id,
  t.user_id,
  t.account_id,
  t.category_id,
  t.transaction_date,
  t.description,
  t.amount,
  t.signed_amount,
  t.transaction_type,
  a.positive_is_credit,
  -- canonical_amount logic matching calculateSignedAmount.js
  CASE 
    -- If signed_amount exists, use it (pre-computed)
    WHEN t.signed_amount IS NOT NULL THEN t.signed_amount
    -- Otherwise compute using same logic as calculateSignedAmount.js
    WHEN UPPER(TRIM(COALESCE(t.transaction_type, ''))) IN ('C', 'CREDIT') 
      OR UPPER(TRIM(COALESCE(t.transaction_type, ''))) LIKE 'C%' THEN ABS(t.amount)
    WHEN UPPER(TRIM(COALESCE(t.transaction_type, ''))) IN ('D', 'DEBIT') 
      OR UPPER(TRIM(COALESCE(t.transaction_type, ''))) LIKE 'D%' THEN -ABS(t.amount)
    -- Fallback: interpret sign based on account configuration
    WHEN a.positive_is_credit = 1 THEN t.amount
    ELSE -t.amount
  END AS canonical_amount,
  t.is_reconciled,
  t.statement_id
FROM Transactions t
INNER JOIN Accounts a ON t.account_id = a.account_id
WHERE t.user_id IS NOT NULL;

-- View 2: v_account_actuals 
-- Account-level sums and counts
CREATE VIEW IF NOT EXISTS v_account_actuals AS
SELECT 
  user_id,
  account_id,
  COUNT(*) AS transaction_count,
  SUM(canonical_amount) AS balance_sum,
  SUM(CASE WHEN canonical_amount >= 0 THEN canonical_amount ELSE 0 END) AS credit_sum,
  SUM(CASE WHEN canonical_amount < 0 THEN ABS(canonical_amount) ELSE 0 END) AS debit_sum,
  COUNT(CASE WHEN is_reconciled = 1 THEN 1 END) AS reconciled_count,
  SUM(CASE WHEN is_reconciled = 1 THEN canonical_amount ELSE 0 END) AS reconciled_sum
FROM v_amounts_normalized
GROUP BY user_id, account_id;

-- View 3: v_category_actuals
-- Category-level sums and counts  
CREATE VIEW IF NOT EXISTS v_category_actuals AS
SELECT 
  user_id,
  category_id,
  COUNT(*) AS transaction_count,
  SUM(canonical_amount) AS net_amount,
  SUM(CASE WHEN canonical_amount >= 0 THEN canonical_amount ELSE 0 END) AS income_amount,
  SUM(CASE WHEN canonical_amount < 0 THEN ABS(canonical_amount) ELSE 0 END) AS expense_amount
FROM v_amounts_normalized
WHERE category_id IS NOT NULL
GROUP BY user_id, category_id;

-- View 4: v_budget_actuals
-- Budget period actuals by joining with budget periods
CREATE VIEW IF NOT EXISTS v_budget_actuals AS
SELECT 
  b.budget_id,
  b.user_id,
  b.category_id,
  b.period_start,
  b.period_end,
  b.budgeted_amount,
  COALESCE(SUM(v.canonical_amount), 0) AS actual_amount,
  COALESCE(SUM(CASE WHEN v.canonical_amount >= 0 THEN v.canonical_amount ELSE 0 END), 0) AS actual_income,
  COALESCE(SUM(CASE WHEN v.canonical_amount < 0 THEN ABS(v.canonical_amount) ELSE 0 END), 0) AS actual_expense,
  COALESCE(COUNT(v.transaction_id), 0) AS transaction_count
FROM Budgets b
LEFT JOIN v_amounts_normalized v ON (
  b.user_id = v.user_id 
  AND b.category_id = v.category_id
  AND DATE(v.transaction_date) >= DATE(b.period_start)
  AND DATE(v.transaction_date) <= DATE(b.period_end)
)
GROUP BY b.budget_id, b.user_id, b.category_id, b.period_start, b.period_end, b.budgeted_amount;

-- View 5: v_statement_actuals  
-- Statement period actuals and reconciliation stats
CREATE VIEW IF NOT EXISTS v_statement_actuals AS
SELECT 
  s.statement_id,
  s.user_id,
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
LEFT JOIN v_amounts_normalized v ON (
  s.user_id = v.user_id
  AND s.account_id = v.account_id  
  AND DATE(v.transaction_date) >= DATE(s.period_start)
  AND DATE(v.transaction_date) <= DATE(s.period_end)
)
GROUP BY s.statement_id, s.user_id, s.account_id, s.period_start, s.period_end, s.opening_balance, s.closing_balance;

-- Optional performance indexes for actuals queries
-- Only add if performance monitoring shows they're needed
CREATE INDEX IF NOT EXISTS idx_tx_user_acct_date ON Transactions(user_id, account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat_date ON Transactions(user_id, category_id, transaction_date);

COMMIT;
