const router = require('express').Router();
const c = require('../controllers/reporting-controller');
const { requireUser } = require('../middleware/auth');

// CRITICAL SECURITY FIX: All reporting endpoints now require authentication
// and filter by user_id to prevent cross-user data access
router.get('/monthly-summary', requireUser, c.getMonthlySummary);

// UPDATED: Now uses new budget_category_month system internally
// Accepts legacy date range parameters for backward compatibility
router.get('/budget-vs-actual', requireUser, c.getBudgetVsActual);

// DEPRECATED: Still uses legacy Budgets_legacy table
router.get('/weekly-category-actuals', requireUser, c.getWeeklyCategoryActuals);
router.get('/account-balances', requireUser, c.getAccountBalancesAsOf);

// RECOMMENDED: New budget reporting endpoints (month-based, production-ready)
// These use the budget_category_month system with proper revision tracking
router.get('/budget/month/:month/report', requireUser, c.getBudgetMonthReport);
router.get('/budget/month/:month/summary', requireUser, c.getBudgetMonthSummary);
router.get('/budget/month/:month/pending', requireUser, c.getPendingTransactions);

// Net balance history for charting
router.get('/net-balance-history', requireUser, c.getNetBalanceHistory);

module.exports = router;


