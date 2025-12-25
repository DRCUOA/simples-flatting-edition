# Category View Mode Feature

## Overview
Replaced the "Category Depth" numeric input with a user-friendly "Header/Detail" toggle that provides two distinct viewing modes for category-based reports.

## Changes Made

### UI Changes (Frontend)

**File:** `/Users/Rich/simples/client/src/views/ReportsView.vue`

#### Replaced Control
- **Before:** Category Depth (numeric input, 1-N levels)
- **After:** Category View (dropdown selector)
  - **Header Mode** (default): Shows only parent categories with rolled-up totals
  - **Detail Mode**: Shows all categories (parents and children)

#### Visual Improvements
- Removed level-based indentation from tables
- All categories now display as single lines without hierarchy indicators
- Enhanced styling with consistent font weights and colors
- Better responsive design for the selector

### Backend Changes (Server)

**File:** `/Users/Rich/simples/server/controllers/reporting-controller.js`

#### 1. `getSpendByCategory` Endpoint

**Changes:**
- Replaced `depth` parameter with `mode` parameter
- Accepts `mode=header` or `mode=detail` (defaults to `header`)

**Header Mode:**
- Returns only parent categories (where `parent_category_id IS NULL`)
- Automatically rolls up child category totals to their parents
- Single consolidated line per parent category

**Detail Mode:**
- Returns all categories (parents and children)
- Shows individual transactions for each category
- Preserves parent-child relationships in data

#### 2. `getBudgetVsActual` Endpoint

**Changes:**
- Added `mode` parameter support
- Filters budgets based on view mode
- Implements smart transaction rollup for header mode

**Header Mode:**
- Only includes budgets for parent categories (`parent_category_id IS NULL`)
- Uses recursive SQL CTE to roll up child category actuals to parents
- Ensures budget vs actual comparisons are accurate with rolled-up totals

**Detail Mode:**
- Includes all category budgets
- Shows individual budget vs actual for each category

## Technical Implementation Details

### Recursive Category Rollup (Header Mode)

For Budget vs Actual in header mode, the system uses a recursive SQL Common Table Expression (CTE) to aggregate child category transactions up to their parent:

```sql
WITH RECURSIVE CategoryTree AS (
  -- Base case: parent categories
  SELECT category_id, parent_category_id, category_id as root_id
  FROM Categories
  WHERE parent_category_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT c.category_id, c.parent_category_id, ct.root_id
  FROM Categories c
  INNER JOIN CategoryTree ct ON c.parent_category_id = ct.category_id
)
SELECT 
  ct.root_id as category_id,
  SUM(...) as actual_spent,
  SUM(...) as actual_income
FROM transactions t
LEFT JOIN CategoryTree ct ON t.category_id = ct.category_id
WHERE ...
GROUP BY ct.root_id
```

This ensures that:
- Transactions tagged with child categories are attributed to their parent
- Budget vs actual comparisons are accurate
- No double-counting occurs

### Spend by Category Rollup

For Spend by Category, the system:
1. Fetches all categories with their transactions
2. Builds an in-memory tree structure
3. Recursively accumulates child totals to parents
4. Returns only parent nodes in header mode, or flattened list in detail mode

## User Experience

### Default Behavior
- **Header Mode** is the default view
- Shows a clean, consolidated view of parent categories
- Ideal for high-level budget overview
- Less clutter, easier to scan

### Detail Mode
- User can switch to see all subcategories
- Useful for drilling down into specific spending areas
- Shows the full category hierarchy flattened

### Example

Given this category structure:
```
Groceries (parent)
  ├─ Produce (child)
  ├─ Meat (child)
  └─ Dairy (child)
```

**Header Mode:**
```
Category       Budget    Actual    Variance
Groceries      $1,800    $2,725    -$925
```

**Detail Mode:**
```
Category       Budget    Actual    Variance
Groceries      $1,800    $2,725    -$925
Produce        $600      $900      -$300
Meat           $700      $1,000    -$300
Dairy          $500      $825      -$325
```

## Benefits

### 1. Simplified UX
- ✅ No need to understand what "depth" means
- ✅ Clear, semantic options: "Header" vs "Detail"
- ✅ Intuitive dropdown instead of numeric input

### 2. Better Data Presentation
- ✅ Single line per category (no duplicates)
- ✅ Proper rollup of child category data
- ✅ Clean, uncluttered tables

### 3. Performance
- ✅ Header mode loads faster (fewer rows)
- ✅ Efficient SQL with recursive CTEs
- ✅ No unnecessary data transfer

### 4. Consistency
- ✅ All three reports respect the view mode
- ✅ Consistent behavior across Monthly Summary, Spend by Category, and Budget vs Actual
- ✅ No edge cases with depth levels

## Migration Notes

### Breaking Changes
- The `depth` query parameter is **replaced** by `mode`
- Old API calls with `depth=1` should use `mode=header`
- Old API calls with `depth=2+` should use `mode=detail`

### Backward Compatibility
- If no `mode` is provided, defaults to `header`
- Existing frontend code will continue to work with updated endpoints

## Testing Checklist

- [x] Header mode shows only parent categories
- [x] Detail mode shows all categories
- [x] Rolled-up totals are accurate in header mode
- [x] No duplicate categories in either mode
- [x] Budget vs actual calculations are correct
- [x] Spend by category totals match transaction data
- [x] Monthly summary unaffected (no mode parameter)
- [x] Responsive design works on mobile
- [x] Dropdown is accessible (keyboard navigation)
- [x] Dark mode styling is correct

## API Documentation

### Updated Endpoints

#### `GET /api/reports/spend-by-category`

**Query Parameters:**
- `start` (required): Start date (YYYY-MM-DD)
- `end` (required): End date (YYYY-MM-DD)
- `mode` (optional): View mode - `header` or `detail` (default: `header`)

**Response (Header Mode):**
```json
[
  {
    "category_id": 1,
    "name": "Groceries",
    "spent": 2725.77,
    "income": 0,
    "net": -2725.77
  }
]
```

#### `GET /api/reports/budget-vs-actual`

**Query Parameters:**
- `start` (required): Start date (YYYY-MM-DD)
- `end` (required): End date (YYYY-MM-DD)
- `mode` (optional): View mode - `header` or `detail` (default: `header`)
- `categoryId` (optional): Filter by specific category

**Response (Header Mode):**
```json
[
  {
    "budget_id": 1,
    "category_id": 1,
    "name": "Groceries",
    "period_start": "2025-09-01",
    "period_end": "2025-10-31",
    "budgeted": 1800.00,
    "actual": 2725.77,
    "variance": -925.77,
    "burnRate": 1.5143
  }
]
```

## Files Modified

1. `/Users/Rich/simples/client/src/views/ReportsView.vue`
   - Replaced depth input with mode selector
   - Updated API calls to use mode parameter
   - Removed level-based indentation from rendering

2. `/Users/Rich/simples/server/controllers/reporting-controller.js`
   - Updated `getSpendByCategory` to use mode instead of depth
   - Updated `getBudgetVsActual` to filter by parent categories in header mode
   - Implemented recursive CTE for proper transaction rollup

## Date
October 5, 2025
