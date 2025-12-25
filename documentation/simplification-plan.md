# Simplify Codebase to Core Features

**Version Control Descriptor:** "Simplify codebase by removing advanced features (budgets, statement reconciliation, double-entry accounting, DB actuals system, admin tools, charts/visualization) while retaining core financial tracking with CSV import, advanced security, and mobile responsiveness. Enforce single source of truth and DRY/functional programming patterns."

## Overview

This refactor removes complexity by eliminating advanced accounting and visualization features while maintaining essential personal finance tracking with CSV import, security features, and mobile support. **Critical focus on single source of truth for all data and calculations, plus DRY principles and functional programming.**

## Features to Remove

1. **Budgeting System** - Complex budget planning, monthly breakdowns, budget vs actual
2. **Statement Reconciliation** - Bank statement matching, locking, reconciliation tracking
3. **Double-Entry Accounting & Equity** - Accounting equation, equity accounts, net worth tracking
4. **DB Actuals System** - Feature flags, SQL views, strict calculations
5. **Database Administration** - Admin interface, user management (admin-only features)
6. **Charts & Data Visualization** - Chart.js integration, pie charts, bar charts, doughnut charts
7. **Category Suggestions** - ML-based category assignment engine

## Features to Keep

**Core:** Authentication, Accounts, Transactions, Categories, Dashboard, Reports

**Advanced:** CSV Import, User Preferences (including dark mode), Advanced Security (rate limiting, logging, monitoring), Mobile Responsiveness

## Architecture Principles

### 1. Single Source of Truth

**Critical Requirement:** All data must flow from a single canonical source through Pinia stores. No duplicate calculations, no scattered filters, no ad-hoc data transformations in components.

**Data Flow Pattern:**

1. **API Layer** → Raw data from backend
2. **Store Layer** → Single canonical source, normalized data
3. **Getter Layer** → All derived data, filters, calculations
4. **Component Layer** → Display only, no calculations

**Anti-Patterns to Avoid:**

- ❌ Filtering transactions in multiple components
- ❌ Calculating totals in computed properties
- ❌ Date range logic scattered across views
- ❌ Category summaries computed in components
- ❌ Account balances recalculated per view

**Correct Pattern:**

- ✅ Store holds raw transactions array
- ✅ Store getters provide filtered views (by date, by category, by account)
- ✅ Store getters provide calculated totals (account balances, category sums)
- ✅ Components consume store getters only
- ✅ All date range filtering uses store getters
- ✅ All aggregations use store getters

### 2. DRY (Don't Repeat Yourself) and Functional Programming

**Critical Requirement:** Code must be DRY with single-purpose functions. Business logic in backend controllers must be clear, simple, and functional.

**Function Design:**

- **Single Responsibility:** Each function performs ONE operation only
- **Pure Functions:** Prefer pure functions (same input = same output, no side effects)
- **Composability:** Small functions that can be composed together
- **No Code Duplication:** Extract common logic into reusable utility functions

**Backend Controller Pattern:**

```javascript
// ❌ BAD: Multiple responsibilities, unclear logic
async createTransaction(req, res) {
  const data = req.body;
  if (!data.amount) return res.status(400).json({ error: 'Missing amount' });
  if (!data.account_id) return res.status(400).json({ error: 'Missing account' });
  const account = await db.get('SELECT * FROM Accounts WHERE account_id = ?', data.account_id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const transaction = await db.run('INSERT INTO Transactions...', data);
  const newBalance = calculateBalance(account, data);
  await db.run('UPDATE Accounts SET balance = ?', newBalance);
  res.json({ transaction, account: { ...account, balance: newBalance } });
}

// ✅ GOOD: Single operation, clear flow, delegates to services
async createTransaction(req, res) {
  const transactionData = req.body;
  const transaction = await transactionService.create(transactionData);
  res.json(transaction);
}
```

**Backend Service Pattern:**

- **Controllers:** Handle HTTP concerns (request/response) - thin layer (5-15 lines max)
- **Services:** Handle business logic - orchestrate operations
- **DAOs:** Handle data access - database queries only
- **Utilities:** Handle pure transformations - no side effects

**Anti-Patterns to Avoid:**

- ❌ Duplicate validation logic across controllers
- ❌ Mixing data access with business logic
- ❌ Long functions with multiple responsibilities (>20 lines)
- ❌ Copy-pasted code blocks
- ❌ Business logic in routes or middleware

**Correct Pattern:**

- ✅ Extract validation into reusable validator functions
- ✅ Keep controllers thin (delegate to services)
- ✅ Move complex logic to service layer
- ✅ Create utility functions for common transformations
- ✅ Use functional composition for data pipelines

**Utility Function Examples:**

```javascript
// Single-purpose utility functions
const formatDate = (date) => date.toISOString().split('T')[0];
const parseAmount = (amount) => parseFloat(amount) || 0;
const validateRequired = (fields, data) => fields.every(f => data[f]);
const groupBy = (arr, key) => arr.reduce((acc, item) => {
  (acc[item[key]] = acc[item[key]] || []).push(item);
  return acc;
}, {});
```

## Implementation Steps

### Phase 0: Pre-Flight Dependency Analysis

**Audit Files for Dependencies on Removed Features**:

- Search all remaining views for imports of: `budget.js`, `equity.js`, `statement.js`, `actuals.js`, `changeTracking.js`
- Identify views requiring refactoring vs deletion:
  - **DELETE**: BudgetsView, BudgetReportView, StatementsView, NetWorthView, MonthlyActualsView, DatabaseAdmin, UserManagementView, ChartsView
  - **REFACTOR**: DashboardView (uses budgetStore, equityStore, actualsStore), TransactionsView (uses actualsStore), CategoriesView (uses budgetStore, actualsStore)
- Document all `account_class` and `is_system_account` field usage before database changes

**Audit Backend for DRY Violations**:

- Identify duplicate validation logic across controllers
- Find copy-pasted code blocks
- Document functions longer than 20 lines
- Identify business logic in controllers (should be in services)

**Verify User Router Purpose**:

- Check if `/profile` route depends on `user-router.js`
- Determine if user-router has profile endpoints vs only admin endpoints
- Decision: Keep profile endpoints, remove admin endpoints OR keep entire router for profile

### Phase 1: Backend Cleanup

**Remove API Routes** (server/app.js and server/routes/main-router.js):

- In `app.js` line 252: Remove `app.use('/api/equity', equityRouter)`
- In `main-router.js` line 17: Remove `router.use('/test', testRouter)`
- In `main-router.js` line 38: Remove `router.use('/budgets', budgetRouter)`
- In `main-router.js` line 47: Remove `router.use('/statements', statementRouter)`
- In `main-router.js` line 50: Remove `router.use('/actuals', actualsRouter)`
- In `main-router.js` line 35: Check user-router - remove if admin-only, keep if has profile endpoints

**Delete Backend Files**:

- `server/controllers/equity-controller.js`
- `server/controllers/actuals-controller.js`
- `server/controllers/budget-controller.js`
- `server/controllers/statement-controller.js`
- `server/controllers/testing-controller.js`
- `server/controllers/user-controller.js` (verify not needed for /profile first)
- `server/models/budget_dao.js`
- `server/models/budget_category_month_dao.js`
- `server/services/equity-service.js`
- `server/services/actuals-service.js`
- `server/services/budget-reporting-service.js`
- `server/services/reconciliationService.js`
- `server/services/statementReconciliationService.js`
- `server/routes/equity-routes.js`
- `server/routes/actuals-router.js`
- `server/routes/budget-router.js`
- `server/routes/statement-router.js`
- `server/routes/user-router.js` (if admin-only)
- `server/routes/test-router.js`
- `server/utils/equity-reconciliation.js`
- `server/utils/featureFlags.js`

**Keep Security Files**:

- `server/middleware/auth.js` - Authentication
- `server/middleware/security.js` - Security headers, rate limiting
- `server/middleware/logging.js` - Request logging
- `server/middleware/errorHandler.js` - Error handling
- All security-related middleware and utilities

**Refactor Remaining Controllers for DRY/Functional Principles**:

- **transaction-controller.js**: Ensure thin controllers, delegate to services
- **account-controller.js**: Extract validation to utilities, keep controllers simple
- **category-controller.js**: Move business logic to services if needed
- **reporting-controller.js**: Remove budget-related endpoints, simplify remaining logic

**Extract Common Utilities**:

- Create `server/utils/validators.js` for common validation functions
- Create `server/utils/transformers.js` for data transformation functions
- Consolidate duplicate date parsing/formatting logic

### Phase 2: Database Simplification

**Create Migration Script** (`server/migrations/simplify_database.sql`):

```sql
-- Drop actuals views
DROP VIEW IF EXISTS v_statement_actuals;
DROP VIEW IF EXISTS v_budget_actuals;
DROP VIEW IF EXISTS v_category_actuals;
DROP VIEW IF EXISTS v_account_actuals;
DROP VIEW IF EXISTS v_amounts_normalized;

-- Drop equity views
DROP VIEW IF EXISTS v_accounting_equation;

-- Drop tables
DROP TABLE IF EXISTS Statements;
DROP TABLE IF EXISTS budget_category_month;
DROP TABLE IF EXISTS Budgets_legacy;
DROP TABLE IF EXISTS Budgets;

-- Remove account complexity fields
ALTER TABLE Accounts DROP COLUMN IF EXISTS account_class;
ALTER TABLE Accounts DROP COLUMN IF EXISTS is_system_account;

-- Remove transaction reconciliation fields
ALTER TABLE Transactions DROP COLUMN IF EXISTS is_reconciled;
ALTER TABLE Transactions DROP COLUMN IF EXISTS statement_id;
ALTER TABLE Transactions DROP COLUMN IF EXISTS reconciled_at;

-- Remove any equity accounts (cleanup data)
DELETE FROM Accounts WHERE account_type = 'equity' OR is_system_account = 1;
```

**Test Migration**:

- Run on development database first
- Verify no data loss for core tables: Accounts, Transactions, Categories, Users
- Verify foreign key constraints don't break

### Phase 3: Frontend Cleanup - Deletions

**Remove Views** (delete these files):

- `client/src/views/BudgetsView.vue`
- `client/src/views/BudgetReportView.vue`
- `client/src/views/StatementsView.vue`
- `client/src/views/NetWorthView.vue`
- `client/src/views/MonthlyActualsView.vue`
- `client/src/views/DatabaseAdmin.vue`
- `client/src/views/UserManagementView.vue`
- `client/src/views/ChartsView.vue`

**Remove Stores** (delete these files):

- `client/src/stores/actuals.js`
- `client/src/stores/budget.js`
- `client/src/stores/equity.js`
- `client/src/stores/statement.js`
- `client/src/stores/changeTracking.js`

**Remove Composables** (delete these files):

- `client/src/composables/useBudgetCategoryMonth.js`
- `client/src/composables/useBudgetQuery.js`
- `client/src/composables/useStatementDefaults.js`
- `client/src/composables/useStatementReconciliation.js`
- `client/src/composables/useChangeTracking.js`
- `client/src/composables/useNavigationGuard.js` (if only for budgets)

**Keep Composables**:

- `useAuth.js` - Authentication
- `useCSVPreview.js` - CSV import
- `useFieldMapping.js` - CSV import
- `useTransactionImport.js` - CSV import
- `useCategoryAssignment.js` - Category management
- `useCategorySuggestions.js` - Basic category suggestions
- `useTheme.js` - Dark mode
- `useToast.js` - Notifications
- `useUserPreferences.js` - User preferences
- `useResizableTable.js` - UI functionality

**Update Router** (`client/src/router/index.js`):

- Remove route imports: ChartsView, BudgetsView, BudgetReportView, StatementsView, MonthlyActualsView, NetWorthView, DatabaseAdmin, UserManagementView
- Remove routes: `/budgets`, `/budget-report`, `/statements`, `/weekly-actuals`, `/net-worth`, `/admin`, `/users`, `/charts`
- Keep routes: `/`, `/login`, `/register`, `/profile`, `/accounts`, `/transactions`, `/import`, `/categories`, `/reports`

### Phase 3b: Frontend Cleanup - Refactoring

**Refactor DashboardView.vue** (client/src/views/DashboardView.vue):

Critical changes needed:

1. Remove imports (lines 300, 302, 304, 310, 312, 314):

   - Remove `import { useBudgetStore } from '../stores/budget'`
   - Remove `import { useActualsStore } from '../stores/actuals'`
   - Remove `import { useEquityStore } from '../stores/equity'`

2. Remove fetchData calls (lines 417-418, 425-433):

   - Remove `budgetStore.fetchBudgets()`
   - Remove `equityStore.fetchAll()`
   - Remove `actualsStore.initializeFeatureFlags()` and related actuals fetching

3. Remove equity account filtering (lines 501-503):

   - Change: `.filter(a => a.account_class !== 'equity' && !a.is_system_account)`
   - To: No filtering needed (these fields won't exist)

4. Remove DB actuals conditional logic (lines 518-561):

   - Remove all `if (actualsStore.strictActualsEnabled)` branches
   - Keep only direct calculation logic
   - Simplify `totalBalance`, `totalIncome`, `totalExpenses` to use store getters

5. Simplify fetchData function to only:
   ```javascript
   await Promise.all([
     accountStore.fetchAccounts(),
     categoryStore.fetchCategories(),
     transactionStore.fetchTransactions()
   ]);
   ```


**Refactor TransactionsView.vue** (client/src/views/TransactionsView.vue):

- Remove import on line 292: `import { useActualsStore } from '../stores/actuals'`
- Remove any actualsStore usage
- Ensure all filtering uses transactionStore getters

**Refactor CategoriesView.vue** (client/src/views/CategoriesView.vue):

- Remove imports on lines 206-207:
  - `import { useBudgetStore } from '../stores/budget'`
  - `import { useActualsStore } from '../stores/actuals'`
- Remove any budgetStore and actualsStore usage
- Ensure category calculations come from categoryStore getters only

**Update Navigation** (`client/src/components/Navbar.vue`):

- Remove "Management" dropdown (lines 39-77: Budgets, Statements)
- Remove "Reports" dropdown (lines 79-125: Net Worth, Charts, Weekly Actuals)
- Promote "Reports" to main navigation as simple link (no dropdown)
- Remove `/charts` route from line 111-115, 319-324
- Update `isReportsActive` computed to only check for 'reports' route (line 387)
- Final navigation: Dashboard | Transactions | Accounts | Categories | Reports | Import
- **Ensure mobile responsiveness maintained** for navigation menu

### Phase 4: Enforce Single Source of Truth Pattern

**Enhance Transaction Store** (`client/src/stores/transaction.js`):

Add comprehensive getters (single-purpose, functional):

```javascript
getters: {
  // Get transactions by date range
  getTransactionsByDateRange: (state) => (startDate, endDate) => {
    return state.transactions.filter(t => {
      const tDate = new Date(t.transaction_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return (!start || tDate >= start) && (!end || tDate <= end);
    });
  },
  
  // Get transactions by account
  getTransactionsByAccount: (state) => (accountId, startDate = null, endDate = null) => {
    let filtered = state.transactions.filter(t => t.account_id === accountId);
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      filtered = filtered.filter(t => {
        const tDate = new Date(t.transaction_date);
        return (!start || tDate >= start) && (!end || tDate <= end);
      });
    }
    return filtered;
  },
  
  // Get transactions by category
  getTransactionsByCategory: (state) => (categoryId, startDate = null, endDate = null) => {
    let filtered = state.transactions.filter(t => t.category_id === categoryId);
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      filtered = filtered.filter(t => {
        const tDate = new Date(t.transaction_date);
        return (!start || tDate >= start) && (!end || tDate <= end);
      });
    }
    return filtered;
  },
  
  // Get total for date range
  getTransactionTotalByDateRange: (state) => (startDate, endDate) => {
    const filtered = state.transactions.filter(t => {
      const tDate = new Date(t.transaction_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return (!start || tDate >= start) && (!end || tDate <= end);
    });
    return filtered.reduce((sum, t) => sum + (parseFloat(t.signed_amount) || 0), 0);
  },
  
  // Get category totals for date range
  getCategoryTotals: (state) => (startDate = null, endDate = null) => {
    const filtered = startDate || endDate
      ? state.transactions.filter(t => {
          const tDate = new Date(t.transaction_date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          return (!start || tDate >= start) && (!end || tDate <= end);
        })
      : state.transactions;
    
    const categoryMap = {};
    filtered.forEach(t => {
      const catId = t.category_id;
      if (!catId) return;
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          category_id: catId,
          category_name: t.category_name,
          total: 0,
          count: 0
        };
      }
      categoryMap[catId].total += parseFloat(t.signed_amount) || 0;
      categoryMap[catId].count += 1;
    });
    
    return Object.values(categoryMap);
  },
  
  // Get recent transactions
  getRecentTransactions: (state) => (limit = 10) => {
    return [...state.transactions]
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      .slice(0, limit);
  }
}
```

**Enhance Account Store** (`client/src/stores/account.js`):

Add getters for derived data (pure functions):

```javascript
getters: {
  // Get total balance across all accounts
  getTotalBalance: (state) => {
    return state.accounts.reduce((sum, account) => {
      return sum + (parseFloat(account.current_balance) || 0);
    }, 0);
  },
  
  // Get account by ID
  getAccountById: (state) => (accountId) => {
    return state.accounts.find(a => a.account_id === accountId);
  },
  
  // Get accounts by type
  getAccountsByType: (state) => (type) => {
    return state.accounts.filter(a => a.account_type === type);
  },
  
  // Get formatted account summaries for dashboard
  getAccountSummaries: (state) => {
    return state.accounts.map(account => ({
      ...account,
      openingBalance: parseFloat(account.current_balance) || 0,
      closingBalance: parseFloat(account.current_balance) || 0,
      movement: 0
    }));
  }
}
```

**Enhance Category Store** (`client/src/stores/category.js`):

Add getters (single-purpose functions):

```javascript
getters: {
  // Get category by ID
  getCategoryById: (state) => (categoryId) => {
    return state.categories.find(c => c.category_id === categoryId);
  },
  
  // Get parent categories
  getParentCategories: (state) => {
    return state.categories.filter(c => !c.parent_category_id);
  },
  
  // Get child categories
  getChildCategories: (state) => (parentId) => {
    return state.categories.filter(c => c.parent_category_id === parentId);
  },
  
  // Get category hierarchy
  getCategoryHierarchy: (state) => {
    const parents = state.categories.filter(c => !c.parent_category_id);
    return parents.map(parent => ({
      ...parent,
      children: state.categories.filter(c => c.parent_category_id === parent.category_id)
    }));
  }
}
```

**Update Dashboard to Use Store Getters**:

- Replace `accountSummaries` computed (line 487) with `accountStore.getAccountSummaries`
- Replace `totalBalance` computed (line 518) with `accountStore.getTotalBalance`
- Replace `filteredTransactions` with `transactionStore.getTransactionsByDateRange(startDate, endDate)`
- Replace all `.reduce()` calculations with store getters

**Update Reports View to Use Store Getters**:

- Replace all local filtering with `transactionStore.getTransactionsByDateRange(start, end)`
- Replace category totals calculation with `transactionStore.getCategoryTotals(start, end)`
- Remove all `.filter()` and `.reduce()` calls on transactions
- Ensure date range logic only exists in store getters

**Update Transactions View to Use Store Getters**:

- Replace local filtering with store getters
- Search functionality should filter through `transactionStore.getTransactionsByDateRange`
- No local `.filter()` calls

**Create Documentation** (`documentation/STATE_MANAGEMENT.md`):

- Document single source of truth pattern
- List all store getters and their purposes
- Provide examples of correct vs incorrect usage
- Guidelines for future development

**Create Documentation** (`documentation/DRY_FUNCTIONAL_PATTERNS.md`):

- Document DRY principles and functional programming approach
- Provide controller/service/DAO layer examples
- Show single-purpose function examples
- Guidelines for maintaining codebase simplicity

### Phase 5: Dependencies & Package Cleanup

**Update client/package.json**:

- Remove: `"chart.js": "^4.5.0"`
- Remove: `"vue-chartjs": "^5.3.2"`
- Keep all other dependencies (axios, pinia, vue, vue-router, vue-toastification, csv-parse, uuid)
- Keep security-related packages
- Keep responsive design utilities (Tailwind CSS)

**Run package cleanup**:

```bash
cd client
npm uninstall chart.js vue-chartjs
npm install
```

### Phase 6: Review Mobile Responsiveness

- Verify Tailwind responsive classes maintained in remaining views
- Check mobile menu functionality in Navbar after dropdown removals
- Test touch interactions for transaction/account management
- Ensure form inputs have proper mobile sizing (`min-h-[44px]`)
- Verify responsive tables in Reports and Transactions views

### Phase 7: Documentation Updates

**Update README.md**:

- Remove from "Key Features" section:
  - Budgeting System (#5)
  - Statement Reconciliation (#12)
  - Double-Entry Accounting & Equity (#11)
  - DB Actuals System (#13)
  - Database Administration (#10)
  - Data Visualization (#7)
  - Category Suggestions ML (#9)
- Keep features: Account Management, Transaction Management, CSV Import, Category Management, Reporting, User Preferences, Security
- Add section on "Architecture: Single Source of Truth and DRY/Functional Principles"
- Simplify quick start guide
- Update version from 1.0.13 to 2.0.0

**Update package.json** (root):

- Update description: "Simplified Financial Management System for Household Budgets"
- Update version to 2.0.0

**Archive Documentation**:

- Create `documentation/archived/` directory
- Move to archived:
  - BUDGET_*.md files
  - EQUITY_IMPLEMENTATION.md
  - RECONCILIATION_UX.md
  - QUICK_START_EQUITY.md
  - QUICK_START_NEW_BUDGET.md
  - STATEMENT_LOCKING_IMPLEMENTATION.md
  - Any budget/equity/statement related docs

### Phase 8: Testing & Validation

**Single Source of Truth Validation**:

- Search all `.vue` files for `.filter(` on transactions - should only be in stores
- Search all `.vue` files for `.reduce(` on transactions - should only be in stores
- Search all `.vue` files for `.map(` on transactions for calculations - should only be in stores
- Verify no duplicate date range filtering logic
- Verify category totals only computed in store getters

**DRY/Functional Pattern Validation**:

- Audit backend controllers - should be thin (5-15 lines)
- Search for duplicate validation code
- Check function lengths - flag any >20 lines
- Verify business logic is in services, not controllers
- Confirm pure utility functions have no side effects

**Manual Testing Checklist**:

1. Login/logout functionality
2. Account CRUD operations
3. Transaction CRUD operations
4. CSV import complete flow
5. Category CRUD operations
6. Reports with date ranges (verify uses store getters)
7. Dashboard displays correct data (verify uses store getters)
8. Transaction filtering (verify uses store getters)
9. Dark mode toggle
10. User preferences persistence
11. Mobile responsiveness on 320px, 375px, 768px viewports
12. Rate limiting active (test with multiple rapid requests)
13. Security headers present (check browser dev tools)

**Data Consistency Testing**:

- Change date range in reports → verify data updates correctly
- Add transaction → verify dashboard and reports update
- Edit transaction → verify all views reflect changes
- Delete transaction → verify all views update
- Import CSV → verify all summaries update consistently
- Check account balances match across dashboard and accounts view
- Verify category totals consistent across all views

**Security Testing**:

- Verify rate limiting active (make 100+ requests in 15 min)
- Check authentication flows (login, logout, token refresh)
- Test CORS configuration
- Verify security headers in response (CSP, X-Frame-Options, etc.)
- Check logging functionality (verify logs written to files)

**Cleanup Verification**:

- No broken imports (run build to verify)
- No orphaned API calls to `/api/equity`, `/api/budgets`, `/api/statements`, `/api/actuals`
- Database has no references to dropped tables
- All navigation links work
- No Chart.js references remain
- No budget/equity/statement store imports remain

## Risk Mitigation

1. **Backup database** before running migrations (`cp server/database.sqlite server/database.sqlite.backup`)
2. **Test in development** environment first
3. **Document removed features** for potential future restoration
4. **Verify no data loss** for core features (accounts, transactions, categories)
5. **Check for dependencies** - ensure removed features don't break remaining features
6. **Test security features** - ensure rate limiting and logging still work
7. **Test mobile views** - verify responsive design maintained
8. **Audit for calculation duplication** - ensure single source of truth maintained
9. **Review refactored code** - ensure DRY and functional principles followed

## Success Criteria

- ✅ Application runs without errors
- ✅ All core features functional (accounts, transactions, categories, reports)
- ✅ CSV import works correctly
- ✅ No chart/visualization references in UI or code
- ✅ No budget/equity/statement references in UI or code
- ✅ Mobile responsiveness maintained across all views
- ✅ Security features (rate limiting, logging) remain active
- ✅ Reduced codebase complexity by ~40%
- ✅ Database schema simplified (8 tables/views removed)
- ✅ Navigation streamlined (5 routes removed)
- ✅ Touch targets properly sized for mobile
- ✅ Responsive layouts work on all screen sizes
- ✅ **All data calculations flow from store getters only**
- ✅ **No duplicate filtering or calculation logic in components**
- ✅ **Date range filtering uses single implementation**
- ✅ **Account balances consistent across all views**
- ✅ **Category totals consistent across all views**
- ✅ **Backend controllers are thin (5-15 lines max)**
- ✅ **No duplicate code blocks or validation logic**
- ✅ **Business logic in services, not controllers**
- ✅ **Utility functions are single-purpose and pure**
- ✅ **No functions longer than 20 lines in critical paths**