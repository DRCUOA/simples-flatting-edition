-- Migration: Migrate Legacy Budget Data
-- Date: 2025-10-11
-- Description: Migrates data from old Budgets table to new budget_category_month table
-- Converts decimal amounts to cents, extracts month from period_start, handles conflicts

BEGIN TRANSACTION;

-- Migrate legacy budget data to new budget_category_month table
-- For conflicts (multiple budgets for same user+month+category), take the latest by budget_id
INSERT INTO budget_category_month (
    user_id,
    month,
    category_id,
    amount_cents,
    revision,
    active_flag,
    created_at,
    updated_at,
    deleted_at
)
SELECT 
    b.user_id,
    strftime('%Y-%m', b.period_start) as month, -- Extract YYYY-MM from period_start
    b.category_id,
    CAST(ROUND(b.budgeted_amount * 100) AS INTEGER) as amount_cents, -- Convert dollars to cents
    1 as revision, -- Initial revision for migrated data
    1 as active_flag, -- All migrated budgets start as active
    COALESCE(b.updated_at, datetime('now')) as created_at,
    COALESCE(b.updated_at, datetime('now')) as updated_at,
    NULL as deleted_at -- No soft deletes in legacy data
FROM (
    -- Subquery to handle conflicts: take the latest budget_id per user+month+category
    SELECT 
        user_id,
        category_id,
        period_start,
        budgeted_amount,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, strftime('%Y-%m', period_start), category_id 
            ORDER BY budget_id DESC
        ) as rn
    FROM Budgets
) b
WHERE b.rn = 1 -- Only the latest budget for each user+month+category
AND b.category_id IS NOT NULL; -- Skip any invalid category references

-- Rename the old Budgets table to Budgets_legacy for rollback safety
ALTER TABLE Budgets RENAME TO Budgets_legacy;

-- Drop old indexes that referenced Budgets table (they auto-rename but we want clean state)
-- Note: Indexes are automatically renamed when table is renamed in SQLite
-- We document them here for reference:
-- idx_budgets_user_id -> idx_Budgets_legacy_user_id
-- idx_budgets_category -> idx_Budgets_legacy_category
-- etc.

COMMIT;

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM budget_category_month) as new_budget_records,
    (SELECT COUNT(*) FROM Budgets_legacy) as legacy_budget_records,
    (SELECT COUNT(DISTINCT user_id || '-' || month) FROM budget_category_month) as unique_user_months,
    (SELECT SUM(amount_cents) FROM budget_category_month) as total_cents_migrated;

