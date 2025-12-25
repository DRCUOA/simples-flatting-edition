-- Migration: Fix v_budget_actuals view to use Budgets_legacy
-- Date: 2025-10-12
-- Description: After renaming Budgets to Budgets_legacy, update the view to reference the correct table

-- Drop the existing view
DROP VIEW IF EXISTS v_budget_actuals;

-- Recreate the view with Budgets_legacy
CREATE VIEW v_budget_actuals AS
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
FROM Budgets_legacy b
LEFT JOIN v_amounts_normalized v ON (
  b.user_id = v.user_id 
  AND b.category_id = v.category_id
  AND DATE(v.transaction_date) >= DATE(b.period_start)
  AND DATE(v.transaction_date) <= DATE(b.period_end)
)
GROUP BY b.budget_id, b.user_id, b.category_id, b.period_start, b.period_end, b.budgeted_amount;

