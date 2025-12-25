# Migration Fix Notes

## Issue
The original migration (`2025-10-03_add_updated_at_tracking.sql`) failed with SQLite errors:
- `Cannot add a column with non-constant default` - SQLite doesn't support `DEFAULT CURRENT_TIMESTAMP` in `ALTER TABLE ADD COLUMN`
- Parse errors due to failed column additions

## Solution
Created `2025-10-03_add_updated_at_tracking_v2.sql` with SQLite-compatible approach:

### Key Changes:
1. **Used TEXT type** instead of DATETIME (SQLite stores timestamps as TEXT anyway)
2. **Removed DEFAULT clause** from ALTER TABLE (not supported)
3. **Backfilled values** using UPDATE after adding columns
4. **Used `datetime('now')`** instead of `CURRENT_TIMESTAMP` for consistency
5. **Wrapped in transaction** for atomicity
6. **Added verification query** to confirm success

### Migration Successfully Applied ✅

**Verification Results:**
- ✅ `budgets_has_updated_at`: 1
- ✅ `categories_has_updated_at`: 1  
- ✅ `budgets_trigger_exists`: 1
- ✅ `categories_trigger_exists`: 1
- ✅ `budgets_index_exists`: 1
- ✅ `categories_index_exists`: 1

**Sample Data:**
```sql
-- Budgets now have updated_at
a3fda053-6a34-46d9-b35d-fa485a50c679|2025-07-01|2025-10-03 02:04:39

-- Categories now have updated_at  
4ac37e74-8dac-4651-aa26-a18fc2930599|Income|2025-10-03 02:04:39
```

**Triggers Working:**
Both `budgets_updated_at` and `categories_updated_at` triggers are active and will auto-update timestamps on any UPDATE operation.

## Files to Use

- ❌ **DO NOT USE:** `2025-10-03_add_updated_at_tracking.sql` (broken)
- ✅ **USE:** `2025-10-03_add_updated_at_tracking_v2.sql` (working)

## Rollback (if needed)

```sql
-- To rollback (not recommended after data is in use):
BEGIN TRANSACTION;

DROP TRIGGER IF EXISTS budgets_updated_at;
DROP TRIGGER IF EXISTS categories_updated_at;
DROP INDEX IF EXISTS idx_budgets_updated_at;
DROP INDEX IF EXISTS idx_categories_updated_at;

-- Note: SQLite doesn't support DROP COLUMN, so columns will remain
-- They can be safely ignored if rollback is needed

COMMIT;
```

## Next Steps

The optimization is now fully ready:
1. ✅ Database migration applied
2. ✅ ETag middleware in place
3. ✅ HTTP client with conditional GET
4. ✅ Batch preferences API
5. ✅ Stores updated with caching

**Ready to test!** Check browser DevTools Network tab for:
- 304 Not Modified responses
- ETag headers
- Reduced request counts
- Batch preference POSTs

