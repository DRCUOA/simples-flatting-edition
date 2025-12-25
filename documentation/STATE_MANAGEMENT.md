# State Management - Single Source of Truth Pattern

**Version:** 2.0.0  
**Date:** October 16, 2025  
**Status:** Implemented ✅

## Overview

This document outlines the state management architecture for Simples v2.0, which strictly enforces the **Single Source of Truth** pattern. All data flows through Pinia stores, and all calculations, filtering, and aggregations are performed through store getters—never in components.

## Architecture Principles

###  1. Single Source of Truth

**Core Principle:** Every piece of data and every derived calculation must have exactly ONE canonical implementation.

**Data Flow:**
```
API → Store State → Store Getters → Components (Display Only)
```

**Anti-Patterns (❌ NEVER DO THIS):**
- Filtering transactions in components
- Calculating totals in computed properties
- Date range logic scattered across views
- Duplicate calculation implementations

**Correct Pattern (✅ ALWAYS DO THIS):**
- Store holds raw data arrays
- Store getters provide all derived data
- Components consume getters only
- Zero calculations in components

## Store Architecture

### Transaction Store (`client/src/stores/transaction.js`)

**Purpose:** Manages all transaction data and provides filtered/calculated views

**State:**
```javascript
{
  transactions: [],        // Raw transaction array from API
  loading: false,
  error: null,
  lastFetchTime: null,
  csvPreview: [],
  // ... CSV import related state
}
```

**Getters (14 total):**

#### Date Range Filtering
```javascript
getTransactionsByDateRange(startDate, endDate)
// Returns: Transaction[] filtered by date range
// Usage: transactionStore.getTransactionsByDateRange('2024-01-01', '2024-12-31')
```

#### Account Filtering
```javascript
getTransactionsByAccount(accountId, startDate?, endDate?)
// Returns: Transaction[] for specific account with optional date range
// Usage: transactionStore.getTransactionsByAccount(123, '2024-01-01', '2024-12-31')
```

#### Category Filtering
```javascript
getTransactionsByCategory(categoryId, startDate?, endDate?)
// Returns: Transaction[] for specific category with optional date range
// Usage: transactionStore.getTransactionsByCategory(456, null, null)
```

#### Income/Expense Calculations
```javascript
getIncomeTotalByDateRange(startDate, endDate)
// Returns: number (total income for date range)

getExpenseTotalByDateRange(startDate, endDate)
// Returns: number (absolute value of expenses for date range)

getTransactionTotalByDateRange(startDate, endDate)
// Returns: number (net total for date range)
```

#### Category Aggregations
```javascript
getCategoryTotals(startDate?, endDate?)
// Returns: { category_id, category_name, total, count }[]
// Usage: transactionStore.getCategoryTotals('2024-01-01', '2024-12-31')
```

#### Account Aggregations
```javascript
getAccountTotals(startDate?, endDate?)
// Returns: { account_id, account_name, total, count }[]
```

#### Utility Getters
```javascript
getRecentTransactions(limit = 10)
// Returns: Transaction[] sorted by date (most recent first)

getTransactionById(transactionId)
// Returns: Transaction | undefined

getTransactionsCount
// Returns: number (total count)

getTransactionsCountByDateRange(startDate, endDate)
// Returns: number (count for date range)
```

### Account Store (`client/src/stores/account.js`)

**Purpose:** Manages account data and provides balance calculations

**State:**
```javascript
{
  accounts: [],
  reconciliationSummary: [],
  loading: false,
  error: null
}
```

**Getters (10 total):**

#### Balance Calculations
```javascript
getTotalBalance
// Returns: number (sum of all account balances)

getAccountSummaries
// Returns: Account[] with formatted balance and additional fields
```

#### Lookups
```javascript
getAccountById(accountId)
// Returns: Account | undefined

getAccountName(accountId)
// Returns: string | null

accountExists(accountId)
// Returns: boolean
```

#### Filtering
```javascript
getAccountsByType(type)
// Returns: Account[] filtered by account_type

getActiveAccounts
// Returns: Account[] excluding closed accounts
```

#### Sorting
```javascript
getAccountsByBalance
// Returns: Account[] sorted by balance (descending)

getAccountsByName
// Returns: Account[] sorted alphabetically
```

#### Counts
```javascript
getAccountsCount
// Returns: number
```

### Category Store (`client/src/stores/category.js`)

**Purpose:** Manages category data and hierarchy

**State:**
```javascript
{
  categories: [],
  loading: false,
  error: null,
  lastFetch: null,
  cacheTimeout: 600000 // 10 minutes
}
```

**Getters (18 total):**

#### Hierarchy Navigation
```javascript
getParentCategories
// Returns: Category[] (top-level categories only)

getChildCategories(parentId)
// Returns: Category[] (children of specified parent)

getCategoryHierarchy
// Returns: Category[] with children nested
// Format: { ...category, children: Category[] }
```

#### Type Filtering
```javascript
getIncomeCategories
// Returns: Category[] where category_type === 'income'

getExpenseCategories
// Returns: Category[] where category_type === 'expense'

isIncomeCategory(categoryId)
// Returns: boolean

isExpenseCategory(categoryId)
// Returns: boolean
```

#### Lookups
```javascript
getCategoryById(categoryId)
// Returns: Category | undefined

getCategoryName(categoryId)
// Returns: string | null

getCategoryType(categoryId)
// Returns: 'income' | 'expense' | null

getCategoryPath(categoryId)
// Returns: string (e.g., "Parent > Child")

categoryExists(categoryId)
// Returns: boolean
```

#### Hierarchy Checks
```javascript
hasChildren(categoryId)
// Returns: boolean

getChildrenCount(categoryId)
// Returns: number
```

#### Sorting
```javascript
getCategoriesByName
// Returns: Category[] sorted alphabetically
```

#### Counts
```javascript
getCategoriesCount
// Returns: number (total)

getParentCategoriesCount
// Returns: number

getChildCategoriesCount
// Returns: number
```

## Usage Examples

### Dashboard View

**❌ OLD WAY (Before v2.0):**
```javascript
// WRONG: Local calculations in component
const totalIncome = computed(() => {
  return transactions.value
    .filter(t => parseFloat(t.signed_amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.signed_amount), 0);
});

const filteredTransactions = computed(() => {
  return transactions.value.filter(t => {
    const tDate = new Date(t.transaction_date);
    return tDate >= startDate.value && tDate <= endDate.value;
  });
});
```

**✅ NEW WAY (v2.0):**
```javascript
// CORRECT: Use store getters
const totalIncome = computed(() => {
  return transactionStore.getIncomeTotalByDateRange(
    startDate.value,
    endDate.value
  );
});

const filteredTransactions = computed(() => {
  return transactionStore.getTransactionsByDateRange(
    startDate.value,
    endDate.value
  );
});
```

### Reports View

**✅ CORRECT PATTERN:**
```javascript
// Reports view uses backend API endpoints for aggregated data
// This is acceptable as reports are complex aggregations
// that are more efficient to compute on the backend

const fetchReports = async () => {
  const response = await http.get('/api/reports/monthly-summary', {
    params: { start: startDate.value, end: endDate.value }
  });
  monthlyData.value = response.data;
};
```

### Category Totals

**❌ WRONG:**
```javascript
// WRONG: Calculating category totals in component
const categoryTotals = computed(() => {
  const map = {};
  transactions.value.forEach(t => {
    if (!map[t.category_id]) {
      map[t.category_id] = { total: 0, count: 0 };
    }
    map[t.category_id].total += parseFloat(t.signed_amount);
    map[t.category_id].count += 1;
  });
  return map;
});
```

**✅ CORRECT:**
```javascript
// CORRECT: Use store getter
const categoryTotals = computed(() => {
  return transactionStore.getCategoryTotals(
    startDate.value,
    endDate.value
  );
});
```

## Guidelines for Future Development

### Adding New Calculations

**When adding a new calculation:**

1. **Determine if it's derived data** - Can it be calculated from existing state?
2. **Add getter to appropriate store** - Transaction, Account, or Category
3. **Keep getter pure** - No side effects, same input = same output
4. **Document the getter** - Add to this file with usage examples
5. **Use in components** - Never duplicate the logic

**Example: Adding "Average Transaction Amount"**

```javascript
// 1. Add to transaction store getters
getAverageTransactionAmount: (state) => (startDate, endDate) => {
  const transactions = state.transactions.filter(t => {
    // ... date filtering logic
  });
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.signed_amount) || 0), 0);
  return total / transactions.length;
}

// 2. Use in component
const avgAmount = computed(() => {
  return transactionStore.getAverageTransactionAmount(startDate.value, endDate.value);
});
```

### Code Review Checklist

Before merging any PR, verify:

- [ ] No `.filter()` calls on transactions/accounts/categories in `.vue` files
- [ ] No `.reduce()` calls for calculations in components
- [ ] No `.map()` calls for deriving data in components
- [ ] All date range filtering uses store getters
- [ ] All aggregations use store getters
- [ ] No duplicate calculation logic across files
- [ ] New getters added to stores are documented here

### Testing State Management

**Test that calculations are consistent:**

```javascript
// In your test:
// 1. Set date range
startDate.value = '2024-01-01';
endDate.value = '2024-01-31';

// 2. Get income from store getter
const income1 = transactionStore.getIncomeTotalByDateRange(
  startDate.value,
  endDate.value
);

// 3. Change date range
endDate.value = '2024-02-01';

// 4. Get income again
const income2 = transactionStore.getIncomeTotalByDateRange(
  startDate.value,
  endDate.value
);

// 5. Verify different results (data changed)
expect(income1).not.toBe(income2);

// 6. Reset to original range
endDate.value = '2024-01-31';

// 7. Get income again
const income3 = transactionStore.getIncomeTotalByDateRange(
  startDate.value,
  endDate.value
);

// 8. Verify same as first result (single source of truth)
expect(income1).toBe(income3);
```

## Benefits of This Pattern

### 1. Consistency
- Same data everywhere
- No "dashboard shows X but reports show Y" bugs
- Single calculation implementation = single behavior

### 2. Maintainability
- Change calculation once, affects all views
- Easy to find where data comes from
- Clear separation of concerns

### 3. Testability
- Test getters in isolation
- Mock store in component tests
- Predictable data flow

### 4. Performance
- Getters are memoized by Vue
- No duplicate calculations
- Efficient caching strategies

### 5. Debugging
- Clear data flow path
- Single place to add logging
- Easy to trace data issues

## Common Pitfalls to Avoid

### 1. Filtering in Components
```javascript
// ❌ DON'T DO THIS
const filtered = computed(() => {
  return transactions.value.filter(t => t.amount > 100);
});

// ✅ DO THIS
// Add to store:
getTransactionsAboveAmount: (state) => (amount) => {
  return state.transactions.filter(t => parseFloat(t.amount) > amount);
}
```

### 2. Duplicate Date Logic
```javascript
// ❌ DON'T DO THIS
const dashboardTransactions = transactions.value.filter(t => {
  const date = new Date(t.transaction_date);
  return date >= start && date <= end;
});

// ✅ DO THIS
const dashboardTransactions = computed(() => {
  return transactionStore.getTransactionsByDateRange(start.value, end.value);
});
```

### 3. Calculations in Templates
```javascript
// ❌ DON'T DO THIS
<template>
  <div>{{ transactions.reduce((sum, t) => sum + t.amount, 0) }}</div>
</template>

// ✅ DO THIS
<template>
  <div>{{ totalAmount }}</div>
</template>
<script setup>
const totalAmount = computed(() => transactionStore.getTransactionTotalByDateRange(null, null));
</script>
```

## Migration Notes

If you're working with legacy code (pre-v2.0):

1. **Identify local calculations** - Search for `.filter()`, `.reduce()`, `.map()` on data arrays
2. **Check if getter exists** - Review this document for existing getters
3. **Add getter if needed** - Follow guidelines above
4. **Replace in component** - Use store getter instead
5. **Test thoroughly** - Verify same results as before
6. **Remove old code** - Delete local calculation logic

## Summary

**The Golden Rule:** If it's data or derived from data, it belongs in a store getter. Components are for display only.

**Remember:**
- ✅ Store getters provide ALL data and calculations
- ✅ Components consume getters ONLY
- ✅ ONE implementation per calculation
- ❌ NO filtering/calculations in components
- ❌ NO duplicate logic across files

This pattern ensures data consistency, maintainability, and a clean separation between data management and presentation logic.

