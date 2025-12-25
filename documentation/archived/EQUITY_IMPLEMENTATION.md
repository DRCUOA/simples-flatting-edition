# Double-Entry Accounting & Equity Implementation

## Overview

This document describes the implementation of proper double-entry accounting principles in the financial management system. The implementation ensures that the fundamental accounting equation is maintained:

**Assets = Liabilities + Equity**

## Problem Statement

The original system was missing a vital concept: **each user's assets and liabilities need to match through double-entry accounting**. An **Equity account** is now maintained to represent the surplus or deficit balance across all other accounts, ensuring financial accuracy and completeness.

## Implementation Summary

### 1. Database Schema Changes

#### New Columns Added to `Accounts` Table
- `account_class` - Classifies accounts as 'asset', 'liability', or 'equity'
- `is_system_account` - Flag for auto-managed equity accounts
- `equity_last_reconciled` - Timestamp of last equity reconciliation
- `equity_reconciliation_note` - Notes about reconciliation

#### New Table: `EquityAdjustments`
Tracks all equity account adjustments with:
- Adjustment amount and reason
- Before/after balances
- Assets and liabilities totals at time of adjustment
- Timestamp and user tracking

#### New Views
1. **v_accounting_equation** - Real-time accounting equation status per user
   - Shows total assets, liabilities, equity
   - Calculates equity difference (imbalance)
   - Indicates if reconciliation needed

2. **v_account_balances_by_class** - Account summaries grouped by class
   - Aggregated balances per account class
   - Count, sum, average, min, max balances
   - Per-user breakdown

### 2. Backend Implementation

#### Services
**`/server/services/equity-service.js`** - Core equity management service
- `getOrCreateEquityAccount()` - Ensures each user has an equity account
- `calculateAccountingEquation()` - Computes the accounting equation
- `reconcileEquity()` - Balances the equity account
- `getEquityAdjustmentHistory()` - Retrieves adjustment history
- `auditAllUsers()` - Checks all users for balance issues
- `reconcileAllUsers()` - Batch reconciliation

#### Models
**`/server/models/account_dao.js`** - Extended with equity methods
- `getAccountsByClass()` - Retrieve accounts grouped by classification
- `getAccountingEquation()` - Get equation status for a user
- `getAccountsDetailedByClass()` - Detailed breakdown with grouping

#### Controllers
**`/server/controllers/equity-controller.js`** - API endpoints
- `GET /api/equity/equation` - Get accounting equation
- `GET /api/equity/accounts-by-class` - Get accounts by class
- `GET /api/equity/account` - Get/create equity account
- `POST /api/equity/reconcile` - Reconcile equity
- `GET /api/equity/history` - Get adjustment history
- `GET /api/equity/net-worth` - Get net worth summary
- `GET /api/equity/admin/audit` - Admin audit endpoint
- `POST /api/equity/admin/reconcile-all` - Admin bulk reconcile

#### Routes
**`/server/routes/equity-routes.js`** - Equity endpoint routing
- All routes require authentication
- Admin routes for system-wide operations

#### Utilities
**`/server/utils/equity-reconciliation.js`** - CLI utility script
```bash
# Audit all users
node server/utils/equity-reconciliation.js audit

# Reconcile all users
node server/utils/equity-reconciliation.js reconcile

# Check specific user
node server/utils/equity-reconciliation.js user <user_id>

# Reconcile specific user
node server/utils/equity-reconciliation.js reconcile-user <user_id>
```

### 3. Frontend Implementation

#### Store
**`/client/src/stores/equity.js`** - Pinia store for equity management
- State management for equation, accounts, history
- Actions for fetching and reconciling equity
- Getters for computed values

#### Views
**`/client/src/views/NetWorthView.vue`** - Net Worth dashboard
Features:
- Net worth summary card with total equity
- Accounting equation display (Assets = Liabilities + Equity)
- Balance status indicator (balanced/needs reconciliation)
- Account breakdown by class (assets, liabilities, equity)
- One-click reconciliation button
- Real-time balance calculations

#### Navigation
Added "Net Worth" to the Reports dropdown menu in both desktop and mobile views.

### 4. Account Classification

Accounts are now automatically classified based on type:

**Assets** (positive balances increase net worth)
- checking
- savings
- investment
- cash
- other

**Liabilities** (positive balances decrease net worth)
- credit
- loan
- mortgage

**Equity** (system-managed)
- equity (Owner's Equity - auto-created and maintained)

### 5. Automatic Equity Reconciliation

The system can automatically maintain the equity balance:

1. **Manual Reconciliation**: Users can click "Reconcile Now" in the UI
2. **Batch Reconciliation**: Admin can reconcile all users via API or CLI
3. **On-Demand**: API endpoints available for integration
4. **Audit Trail**: All adjustments are logged in `EquityAdjustments` table

## Usage Examples

### Check Accounting Equation Status
```bash
# Via CLI
node server/utils/equity-reconciliation.js audit

# Via API
GET /api/equity/equation
```

### Reconcile Equity Account
```bash
# Via CLI (all users)
node server/utils/equity-reconciliation.js reconcile

# Via CLI (single user)
node server/utils/equity-reconciliation.js reconcile-user <user_id>

# Via API
POST /api/equity/reconcile
{
  "reason": "Manual reconciliation"
}
```

### View Net Worth
1. Navigate to Reports → Net Worth
2. View the accounting equation breakdown
3. See all accounts grouped by classification
4. Monitor balance status

## Database Migration

The following migrations were applied:

1. **add_equity_account_support.sql** - Core schema changes
   - Added account_class column
   - Added is_system_account flag
   - Created EquityAdjustments table
   - Created accounting equation views
   - Added audit columns

2. **fix_account_classification.sql** - Corrected initial classifications
   - Classified existing accounts properly
   - Based on account_type field

## Verification

After implementation, the system was verified:

```bash
$ node server/utils/equity-reconciliation.js audit
✅ All users have balanced accounting equations!
   Assets = Liabilities + Equity
```

All 4 users in the system now have properly balanced equity accounts.

## Benefits

1. **Financial Accuracy** - Ensures the accounting equation always balances
2. **Complete Picture** - Shows true net worth (assets - liabilities)
3. **Audit Trail** - All equity adjustments are logged and traceable
4. **Transparency** - Users can see their complete financial position
5. **Compliance** - Follows proper accounting principles
6. **Automated** - System can maintain balance automatically

## Technical Details

### Equity Account Behavior
- Created automatically when first needed
- One per user (system-managed)
- Named "Owner's Equity"
- Balance = Total Assets - Total Liabilities
- Cannot be manually edited (system updates only)
- Marked with `is_system_account = 1`

### Rounding Tolerance
The system allows ±$0.01 difference to account for floating-point rounding errors.

### Performance
- Views are indexed for fast queries
- Equity calculations leverage SQLite aggregation
- Minimal overhead on existing operations

## Future Enhancements

Potential improvements:
1. Automatic reconciliation on account balance changes
2. Scheduled reconciliation job (cron)
3. Email notifications for significant equity changes
4. Historical equity tracking and charts
5. Support for multiple equity accounts (retained earnings, etc.)
6. Integration with tax reporting

## Maintenance

### Regular Tasks
1. Run periodic audits to ensure balance
2. Review EquityAdjustments history for anomalies
3. Monitor equity_difference in v_accounting_equation view

### Troubleshooting
If the accounting equation is out of balance:
1. Check for failed transactions
2. Review recent account modifications
3. Run reconciliation utility
4. Check EquityAdjustments log for history

## API Reference

### Get Accounting Equation
```http
GET /api/equity/equation
Authorization: Bearer <token>

Response:
{
  "userId": "string",
  "totalAssets": number,
  "totalLiabilities": number,
  "totalEquity": number,
  "calculatedEquity": number,
  "equityDifference": number,
  "isBalanced": boolean
}
```

### Reconcile Equity
```http
POST /api/equity/reconcile
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "reason": "string"
}

Response:
{
  "adjusted": boolean,
  "message": "string",
  "adjustmentAmount": number,
  "previousBalance": number,
  "newBalance": number,
  "equation": {...}
}
```

### Get Net Worth
```http
GET /api/equity/net-worth
Authorization: Bearer <token>

Response:
{
  "totalAssets": number,
  "totalLiabilities": number,
  "netWorth": number,
  "equityBalance": number,
  "isBalanced": boolean,
  "needsReconciliation": boolean
}
```

## Files Modified/Created

### Backend
- ✅ `/server/migrations/add_equity_account_support.sql`
- ✅ `/server/migrations/fix_account_classification.sql`
- ✅ `/server/services/equity-service.js`
- ✅ `/server/controllers/equity-controller.js`
- ✅ `/server/routes/equity-routes.js`
- ✅ `/server/models/account_dao.js` (modified)
- ✅ `/server/app.js` (modified - added equity routes)
- ✅ `/server/utils/equity-reconciliation.js`

### Frontend
- ✅ `/client/src/stores/equity.js`
- ✅ `/client/src/views/NetWorthView.vue`
- ✅ `/client/src/router/index.js` (modified)
- ✅ `/client/src/components/Navbar.vue` (modified)

### Documentation
- ✅ `/EQUITY_IMPLEMENTATION.md` (this file)

## Conclusion

The system now implements proper double-entry accounting with automatic equity tracking. Users can view their complete financial position and the system maintains the fundamental accounting equation at all times.

**The fundamental accounting principle is now enforced:**
```
Assets = Liabilities + Equity
```

