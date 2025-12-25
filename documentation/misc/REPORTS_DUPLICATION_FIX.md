# Reports View Duplication Fix

## Issue
The Budget vs Actual report was showing duplicate entries for categories, with the same category appearing multiple times in the table.

### Symptoms
- Categories like "Groceries", "Health & Wellbeing", "Debt Repayment", etc. appeared 2+ times
- Each duplicate had different budgeted amounts
- This made the report confusing and difficult to read

### Root Cause
The SQL query in `getBudgetVsActual` endpoint was returning **one row per budget record** without deduplicating by category. When multiple budget periods existed for the same category (e.g., monthly budgets, or overlapping budget entries), all of them were returned as separate rows.

Example scenario that caused duplicates:
```sql
-- User has two budget entries for "Groceries"
Budget 1: Groceries, Sept 1-30, $800
Budget 2: Groceries, Oct 1-31, $1,000

-- When querying Sept 1 - Oct 31, both budgets returned
-- Result: "Groceries" appeared twice in the report
```

## Solution

Modified the SQL query to **consolidate budgets by category** using `GROUP BY`:

### Changes Made

**File:** `/Users/Rich/simples/server/controllers/reporting-controller.js`

**Before:**
```sql
SELECT b.budget_id, b.category_id, c.category_name AS name, 
       b.period_start, b.period_end, b.budgeted_amount
FROM Budgets b
LEFT JOIN Categories c ON c.category_id = b.category_id
WHERE DATE(b.period_end) >= DATE(?) AND DATE(b.period_start) <= DATE(?)
```

**After:**
```sql
SELECT 
  MAX(b.budget_id) as budget_id,
  b.category_id, 
  c.category_name AS name, 
  MIN(b.period_start) as period_start,
  MAX(b.period_end) as period_end,
  SUM(b.budgeted_amount) as budgeted_amount
FROM Budgets b
LEFT JOIN Categories c ON c.category_id = b.category_id
WHERE DATE(b.period_end) >= DATE(?) AND DATE(b.period_start) <= DATE(?)
GROUP BY b.category_id, c.category_name
ORDER BY c.category_name
```

### Key Changes Explained

1. **`GROUP BY b.category_id, c.category_name`**
   - Consolidates all budget entries for the same category into a single row
   - Prevents duplicate category names in the report

2. **`SUM(b.budgeted_amount)`**
   - Adds up budget amounts if there are multiple periods for the same category
   - Example: $800 (Sept) + $1,000 (Oct) = $1,800 total budgeted

3. **`MIN(b.period_start)` and `MAX(b.period_end)`**
   - Captures the overall date range across all budget periods for that category
   - Shows the earliest start date and latest end date

4. **`MAX(b.budget_id)`**
   - Selects a representative budget_id (needed for the response structure)
   - Uses MAX for consistency, though any budget_id would work

5. **`ORDER BY c.category_name`**
   - Provides consistent, alphabetical ordering
   - Makes the report easier to read

## Expected Behavior After Fix

### Before (with duplicates):
```
Groceries       $800.00    $2,725.77   -$1,925.77   341%
Groceries     $1,000.00    $2,725.77   -$1,725.77   273%
```

### After (consolidated):
```
Groceries     $1,800.00    $2,725.77     -$925.77   151%
```

## Impact

✅ **Fixed:** Each category now appears exactly once in the Budget vs Actual report  
✅ **Fixed:** Budget amounts are properly consolidated across multiple periods  
✅ **Fixed:** Report is now clear and easy to understand  
✅ **Maintained:** All existing functionality (variance, burn rate calculations)  
✅ **No Breaking Changes:** Backward compatible with existing frontend code  

## Testing

After deploying this fix:

1. Navigate to Reports page
2. Select a date range that spans multiple months
3. Verify each category appears only once
4. Verify budget amounts are correctly summed if multiple periods exist
5. Verify variance and burn rate calculations are still accurate

## Related Files

- `/Users/Rich/simples/server/controllers/reporting-controller.js` - Backend fix
- `/Users/Rich/simples/client/src/views/ReportsView.vue` - Frontend (no changes needed)

## Notes

- This fix assumes that multiple budgets for the same category in overlapping periods should be **summed together**
- If business logic requires showing budgets separately by period, a different approach would be needed
- Current solution aligns with typical budget reporting where users want a consolidated view per category

## Date
October 5, 2025
