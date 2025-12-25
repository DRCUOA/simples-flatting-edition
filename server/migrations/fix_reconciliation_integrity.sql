-- Migration: Fix Reconciliation Data Integrity
-- Description: Clean up overlapping reconciliations and prevent future conflicts
-- Author: System Migration
-- Date: 2025-09-13

BEGIN TRANSACTION;

-- 1. Find and report overlapping reconciliations for review
CREATE TEMP TABLE overlapping_reconciliations AS
SELECT 
    t.transaction_id,
    t.transaction_date,
    t.description,
    t.statement_id as current_statement,
    s1.period_start as current_start,
    s1.period_end as current_end,
    GROUP_CONCAT(s2.statement_id) as overlapping_statements,
    GROUP_CONCAT(s2.period_start || ' to ' || s2.period_end) as overlapping_periods
FROM Transactions t
JOIN Statements s1 ON t.statement_id = s1.statement_id
JOIN Statements s2 ON s2.account_id = t.account_id 
    AND s2.statement_id != t.statement_id
    AND t.transaction_date >= s2.period_start 
    AND t.transaction_date <= s2.period_end
WHERE t.is_reconciled = 1
GROUP BY t.transaction_id, t.transaction_date, t.description, t.statement_id;

-- 2. Create a function to resolve conflicts by keeping the transaction with the EARLIEST statement period
-- This ensures consistent conflict resolution

-- 3. For transactions that fall into multiple statement periods, keep them with the EARLIEST period statement
-- Rule: Transaction stays with the statement that has the earliest period_start date

-- First, let's identify transactions that need to be moved
CREATE TEMP TABLE reconciliation_fixes AS
SELECT 
    t.transaction_id,
    t.statement_id as current_statement_id,
    t.transaction_date,
    s_current.period_start as current_period_start,
    s_earliest.statement_id as correct_statement_id,
    s_earliest.period_start as correct_period_start
FROM Transactions t
JOIN Statements s_current ON t.statement_id = s_current.statement_id
JOIN Statements s_earliest ON s_earliest.account_id = t.account_id
    AND t.transaction_date >= s_earliest.period_start 
    AND t.transaction_date <= s_earliest.period_end
WHERE t.is_reconciled = 1
    AND s_earliest.period_start < s_current.period_start; -- Earlier statement exists

-- 4. Apply the fixes - move transactions to their earliest valid statement
UPDATE Transactions 
SET statement_id = (
    SELECT correct_statement_id 
    FROM reconciliation_fixes 
    WHERE reconciliation_fixes.transaction_id = Transactions.transaction_id
)
WHERE transaction_id IN (
    SELECT transaction_id FROM reconciliation_fixes
);

-- 5. Log the changes made
SELECT 
    'Fixed ' || COUNT(*) || ' transaction reconciliation conflicts' as summary,
    'Moved transactions to earliest valid statement period' as resolution_method
FROM reconciliation_fixes;

-- 6. Add a constraint to prevent future overlapping statement periods for the same account
-- This will prevent the root cause of the problem

-- First, create an index to support the constraint check
CREATE INDEX IF NOT EXISTS idx_statements_account_period_check 
ON Statements(account_id, period_start, period_end);

-- 7. Create a trigger to prevent overlapping statement periods
CREATE TRIGGER IF NOT EXISTS prevent_overlapping_statement_periods
BEFORE INSERT ON Statements
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM Statements 
            WHERE account_id = NEW.account_id 
            AND statement_id != NEW.statement_id
            AND (
                (NEW.period_start >= period_start AND NEW.period_start <= period_end) OR
                (NEW.period_end >= period_start AND NEW.period_end <= period_end) OR
                (NEW.period_start <= period_start AND NEW.period_end >= period_end)
            )
        )
        THEN RAISE(ABORT, 'Statement periods cannot overlap for the same account')
    END;
END;

-- 8. Create a trigger to prevent overlapping statement periods on updates
CREATE TRIGGER IF NOT EXISTS prevent_overlapping_statement_periods_update
BEFORE UPDATE ON Statements
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM Statements 
            WHERE account_id = NEW.account_id 
            AND statement_id != NEW.statement_id
            AND (
                (NEW.period_start >= period_start AND NEW.period_start <= period_end) OR
                (NEW.period_end >= period_start AND NEW.period_end <= period_end) OR
                (NEW.period_start <= period_start AND NEW.period_end >= period_end)
            )
        )
        THEN RAISE(ABORT, 'Statement periods cannot overlap for the same account')
    END;
END;

-- 9. Verify the fix by checking remaining conflicts
SELECT 
    COUNT(*) as remaining_conflicts,
    'Should be 0 after fix' as expected_result
FROM (
    SELECT t.transaction_id
    FROM Transactions t
    JOIN Statements s1 ON t.statement_id = s1.statement_id
    JOIN Statements s2 ON s2.account_id = t.account_id 
        AND s2.statement_id != t.statement_id
        AND t.transaction_date >= s2.period_start 
        AND t.transaction_date <= s2.period_end
    WHERE t.is_reconciled = 1
);

COMMIT;
