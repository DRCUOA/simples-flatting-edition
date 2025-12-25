const reportingDAO = require('../models/reporting_dao');
const { validateAuthentication, validateRequiredFields, validateDate } = require('../utils/validators');
const { toISODate, createErrorResponse, createSuccessResponse } = require('../utils/transformers');
const { parseMoney, addMoney, sumMoney, roundMoney } = require('../utils/money');
const { compareDomainDates } = require('../utils/dateUtils');

exports.getMonthlySummary = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const start = toISODate(req.query.start);
  const end = toISODate(req.query.end);
  const userId = req.user.user_id;
  
  // Validate required date parameters
  const dateValidation = validateRequiredFields({ start, end }, ['start', 'end']);
  if (!dateValidation.isValid) {
    return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' });
  }
  
  reportingDAO.getMonthlySummary(userId, start, end)
    .then(rows => {
      return res.json(rows || []);
    })
    .catch(err => {
      console.error('Error fetching monthly summary:', err);
      return res.status(500).json({ error: 'Failed to compute monthly summary' });
    });
};

// Get actual income and expense by category and month
exports.getBudgetVsActual = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const start = toISODate(req.query.start);
  const end = toISODate(req.query.end);
  const userId = req.user.user_id;
  
  // Validate required date parameters
  const dateValidation = validateRequiredFields({ start, end }, ['start', 'end']);
  if (!dateValidation.isValid) {
    return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' });
  }

  // First, get all categories with their root hierarchy (including transfers)
  reportingDAO.getAllCategoriesWithRoots(userId)
    .then(allCategories => {
      if (allCategories.length === 0) {
        return res.json({ categories: [], months: [] });
      }
      
      // Now get transaction actuals for the date range
      return reportingDAO.getTransactionActuals(userId, start, end)
        .then(rows => {
          // Build maps for quick lookup
      const categoryMap = new Map();
      const rootTotalsMap = new Map(); // Track totals per root
      const monthsSet = new Set();
      
      // Separate categories into regular and transfer categories
      const regularCategories = allCategories.filter(cat => !cat.is_transfer);
      const transferCategories = allCategories.filter(cat => cat.is_transfer);
      
      // Initialize regular categories
      regularCategories.forEach(cat => {
        categoryMap.set(cat.category_id, {
          category_id: cat.category_id,
          category_name: cat.category_name,
          parent_category_id: cat.parent_category_id,
          root_id: cat.root_id,
          root_name: cat.root_name,
          level: cat.level,
          total_income: 0,
          total_expense: 0,
          months: {}
        });
        
        // Initialize root totals
        if (!rootTotalsMap.has(cat.root_id)) {
          rootTotalsMap.set(cat.root_id, { income: 0, expense: 0 });
        }
      });
      
      // Initialize transfer categories
      const transferMap = new Map();
      transferCategories.forEach(cat => {
        transferMap.set(cat.category_id, {
          category_id: cat.category_id,
          category_name: cat.category_name,
          parent_category_id: cat.parent_category_id,
          root_id: cat.root_id,
          root_name: cat.root_name,
          level: cat.level,
          total_income: 0,
          total_expense: 0,
          months: {}
        });
        
        // Initialize root totals for transfers
        if (!rootTotalsMap.has(cat.root_id)) {
          rootTotalsMap.set(cat.root_id, { income: 0, expense: 0 });
        }
      });
      
      // Add monthly actuals from transactions
      rows.forEach(row => {
        if (row.month) {
          monthsSet.add(row.month);
        }
        
        // Check both regular and transfer categories
        const category = categoryMap.get(row.category_id) || transferMap.get(row.category_id);
        if (category) {
          const income = Number(row.income) || 0;
          const expense = Number(row.expense) || 0;
          
          if (row.month) {
            category.months[row.month] = {
              income: income,
              expense: expense
            };
          }
          
          category.total_income += income;
          category.total_expense += expense;
          
          // Update root totals
          const rootTotals = rootTotalsMap.get(category.root_id);
          if (rootTotals) {
            rootTotals.income += income;
            rootTotals.expense += expense;
          }
        }
      });
      
      // Determine root types based on totals (only for regular categories)
      const rootTypeMap = new Map();
      rootTotalsMap.forEach((totals, rootId) => {
        const rootCategory = regularCategories.find(c => c.root_id === rootId && c.level === 0);
        if (rootCategory) {
          rootTypeMap.set(rootId, {
            root_id: rootId,
            root_name: rootCategory.root_name,
            root_type: totals.income > totals.expense ? 'income' : 'expense'
          });
        }
      });
      
      // For roots with no transactions, default to expense
      regularCategories.forEach(cat => {
        if (cat.level === 0 && !rootTypeMap.has(cat.root_id)) {
          rootTypeMap.set(cat.root_id, {
            root_id: cat.root_id,
            root_name: cat.root_name,
            root_type: 'expense'
          });
        }
      });
      
      // Add root type and totals to each regular category
      const result = Array.from(categoryMap.values()).map(cat => {
        const rootInfo = rootTypeMap.get(cat.root_id);
        const rootTotals = rootTotalsMap.get(cat.root_id);
        return {
          ...cat,
          root_type: rootInfo ? rootInfo.root_type : 'expense',
          root_total_income: rootTotals ? rootTotals.income : 0,
          root_total_expense: rootTotals ? rootTotals.expense : 0
        };
      });
      
      // Build transfer roots structure - group by root_id
      const transferRootMap = new Map();
      
      // Initialize root entries
      transferCategories.forEach(cat => {
        if (cat.level === 0 || !cat.parent_category_id) {
          if (!transferRootMap.has(cat.root_id)) {
            transferRootMap.set(cat.root_id, {
              root_id: cat.root_id,
              root_name: cat.root_name,
              total_income: 0,
              total_expense: 0,
              children: []
            });
          }
        }
      });
      
      // Add all transfer categories to their roots
      transferCategories.forEach(cat => {
        const transferCategory = transferMap.get(cat.category_id);
        if (!transferCategory) return;
        
        const root = transferRootMap.get(cat.root_id);
        if (root) {
          // Add category to root's children
          root.children.push(transferCategory);
          
          // Update root totals
          root.total_income += transferCategory.total_income;
          root.total_expense += transferCategory.total_expense;
        }
      });
      
      const transfers = Array.from(transferRootMap.values()).sort((a, b) => 
        a.root_name.localeCompare(b.root_name)
      );
      
      // Get sorted months
      const months = Array.from(monthsSet).sort();
      
      
          return res.json({
            categories: result,
            transfers: transfers,
            months: months
          });
        })
        .catch(err => {
          console.error('Error fetching transaction actuals:', err);
          return res.status(500).json({ error: 'Failed to compute actuals' });
        });
    })
    .catch(catErr => {
      console.error('Error fetching categories:', catErr);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    });
};


// Weekly actuals feature removed with budget system
exports.getWeeklyCategoryActuals = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }
  // Weekly actuals feature has been removed in v2.0.0
  return res.json([]);
};

exports.getAccountBalancesAsOf = (req, res) => {
  const asOf = toISODate(req.query.asOf);
  if (!asOf) {
    const errorResponse = createErrorResponse('asOf is required (YYYY-MM-DD)', 400);
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
  
  reportingDAO.getAccountBalancesAsOf(asOf)
    .then(rows => {
      return res.json(rows || []);
    })
    .catch(err => {
      return res.status(500).json({ error: 'Failed to compute balances' });
    });
};

// Budget reporting endpoints removed with budget feature in v2.0.0
exports.getBudgetMonthReport = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }
  return res.json({ categories: [], summary: { total_budgeted_cents: 0, total_expense_cents: 0 } });
};

exports.getPendingTransactions = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }
  return res.json({ transactions: [], total: 0 });
};

exports.getBudgetMonthSummary = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }
  return res.json({ total_budgeted_cents: 0, total_expense_cents: 0, variance_cents: 0 });
};

/**
 * Get historical net balance data for charting
 * GET /reports/net-balance-history
 * Query params: period (1D, 1W, 1M, 1Y, 5Y, ALL)
 */
exports.getNetBalanceHistory = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const period = req.query.period || 'ALL'; // 1D, 1W, 1M, 1Y, 5Y, ALL
  const timeframe = req.query.timeframe || 'long'; // 'short', 'mid', 'long' (progressive filter)

  // Calculate date range based on period
  const { getToday, addDays } = require('../utils/dateUtils');
  const today = getToday();
  let startDate = null;
  
  switch (period) {
    case '1D':
      startDate = addDays(today, -1);
      break;
    case '1W':
      startDate = addDays(today, -7);
      break;
    case '1M':
      startDate = addDays(today, -30);
      break;
    case '1Y':
      startDate = addDays(today, -365);
      break;
    case '5Y':
      startDate = addDays(today, -1825);
      break;
    case 'ALL':
    default:
      startDate = null; // Get all data
      break;
  }

  // Determine allowed timeframes based on progressive filter
  // short = short only, mid = short + mid, long = short + mid + long
  let allowedTimeframes = [];
  if (timeframe === 'short') {
    allowedTimeframes = ['short'];
  } else if (timeframe === 'mid') {
    allowedTimeframes = ['short', 'mid'];
  } else if (timeframe === 'long') {
    allowedTimeframes = ['short', 'mid', 'long'];
  }

  // Get all accounts with their classifications, filtered by progressive timeframe
  // Note: timeframe column doesn't exist in Accounts table, so we skip timeframe filtering
  // All accounts are included regardless of timeframe setting

  reportingDAO.getAccountsByUser(userId)
    .then(accounts => {
      // Build account class map and calculate opening balances
    const accountClassMap = {};
    let openingAssets = 0;
    let openingLiabilities = 0;
    const accountBalances = {};

    accounts.forEach(acc => {
      accountClassMap[acc.account_id] = acc.account_class || 'asset';
      accountBalances[acc.account_id] = {
        opening: acc.opening_balance || 0,
        current: acc.current_balance || 0
      };
      
      // Ensure we only process accounts with valid account_class
      if (acc.account_class === 'asset') {
        // Assets should always be >= 0 (negative balances are overdrawn, treat as 0 for net worth)
        const balance = parseMoney(Math.max(0, acc.opening_balance || 0)) || 0;
        openingAssets = addMoney(openingAssets, balance);
      } else if (acc.account_class === 'liability') {
        // Liability balances are stored as negative values in DB (e.g., -1000 means you owe $1000)
        // Track actual balance (negative)
        const balance = parseMoney(acc.opening_balance || 0) || 0;
        openingLiabilities = addMoney(openingLiabilities, balance);
      }
      // Ignore equity accounts and any accounts without proper classification
    });

    // Net balance = Assets - |Liabilities|
    // Since liabilities are stored as negative, we can use: Assets + Liabilities
    // Example: Assets = 5000, Liabilities = -1000, Net = 5000 + (-1000) = 4000 ✓
    const openingNetBalance = addMoney(openingAssets, openingLiabilities);

    // Get transactions ordered by date, filtered by accounts (which may be filtered by timeframe)
    const accountIds = accounts.map(acc => acc.account_id);
    if (accountIds.length === 0) {
      // No accounts match the timeframe filter, return empty result
      return res.json({
        period,
        timeframe: timeframe,
        data: [],
        current: {
          netBalance: 0,
          assets: 0,
          liabilities: 0
        }
      });
    }
    
      // Find which accounts have transactions in the date range
      // Accounts without transactions in range should use current_balance, not opening_balance
      // Use string comparison for dates (both are YYYY-MM-DD format)
      // This avoids timezone issues with DATE() function

      reportingDAO.getTransactionsForAccounts(userId, accountIds, startDate)
        .then(transactions => {
          // Determine the opening balance date
      // When a period is selected, use startDate as the opening balance date (start of period)
      // When period is ALL, use the first transaction date
      let openingBalanceDate = null;
      let firstDate = null;
      
      if (transactions.length > 0) {
        firstDate = transactions[0].date;
        // If a period is selected, use startDate as the opening balance date
        // Otherwise (ALL period), use the first transaction date
        openingBalanceDate = startDate || firstDate;
      } else {
        // No transactions in the selected period
        // Only show a data point if period is ALL (no date filter)
        if (!startDate) {
          // ALL period with no transactions - show current balance only
          openingBalanceDate = today;
          firstDate = today;
        } else {
          // Period selected but no transactions - return empty data array
          // but still return current balance
          let finalAssets = 0;
          let finalLiabilities = 0;
          accounts.forEach(acc => {
            if (acc.account_class === 'asset') {
              const balance = parseMoney(acc.current_balance || 0) || 0;
              finalAssets = addMoney(finalAssets, Math.max(0, balance));
            } else if (acc.account_class === 'liability') {
              const balance = parseMoney(acc.current_balance || 0) || 0;
              finalLiabilities = addMoney(finalLiabilities, balance);
            }
          });
          const finalNetBalance = addMoney(finalAssets, finalLiabilities);
          
          return res.json({
            period,
            timeframe: timeframe,
            data: [],
            current: {
              netBalance: finalNetBalance,
              assets: finalAssets,
              liabilities: finalLiabilities
            }
          });
        }
      }
      
          // Now calculate the starting balance at openingBalanceDate
          // We need transactions BEFORE openingBalanceDate to calculate the balance correctly
          
          reportingDAO.getStartingBalances(userId, accountIds, openingBalanceDate)
            .then(startingBalances => {
              // Build map of account balances at openingBalanceDate
        const balanceAtOpeningDate = {};
        startingBalances.forEach(row => {
          balanceAtOpeningDate[row.account_id] = parseMoney(row.total || 0) || 0;
        });
        
        // Identify which accounts have transactions in the period (from openingBalanceDate onwards)
        const accountsWithTransactionsInPeriod = new Set(transactions.map(tx => tx.account_id));
        
        // Calculate starting balance:
        // - For accounts WITH transactions in period: opening_balance + transactions before openingBalanceDate
        // - For accounts WITHOUT transactions in period: use current_balance (they haven't changed)
        let startingAssets = 0;
        let startingLiabilities = 0;
        
        accounts.forEach(acc => {
          const hasTransactionsInPeriod = accountsWithTransactionsInPeriod.has(acc.account_id);
          
          let balanceAtOpening;
          if (hasTransactionsInPeriod) {
            // Account has transactions in period - calculate balance at openingBalanceDate
            const transactionsBeforeOpening = balanceAtOpeningDate[acc.account_id] || 0;
            balanceAtOpening = (acc.opening_balance || 0) + transactionsBeforeOpening;
          } else {
            // Account has NO transactions in period - use current_balance (unchanged)
            balanceAtOpening = acc.current_balance || 0;
          }
          
          if (acc.account_class === 'asset') {
            // Track actual balance (can be negative), but clamp to 0 for net worth calculation
            startingAssets = addMoney(startingAssets, balanceAtOpening); // Don't clamp here - track actual balance
          } else if (acc.account_class === 'liability') {
            startingLiabilities = addMoney(startingLiabilities, balanceAtOpening);
          }
        });
        
        const startingNetBalance = addMoney(startingAssets, startingLiabilities);
        
        // Group transactions by date
        const dateMap = new Map();
        let runningAssets = startingAssets;
        let runningLiabilities = startingLiabilities;
        let runningNetBalance = startingNetBalance;

        // Add opening balance point at the openingBalanceDate (start of period)
        // This represents the balance at the start of the selected period
        // For net worth, clamp assets to 0
        const netWorthAssetsStart = Math.max(0, runningAssets);
        const netWorthNetBalanceStart = netWorthAssetsStart + runningLiabilities;
        dateMap.set(openingBalanceDate, {
          date: openingBalanceDate,
          netBalance: netWorthNetBalanceStart,
          assets: Math.max(0, runningAssets), // Clamp to 0 for net worth display
          liabilities: runningLiabilities
        });

        // Process transactions chronologically (from openingBalanceDate onwards)
        // Only process transactions that are >= openingBalanceDate
        transactions.forEach(tx => {
          // Skip transactions before openingBalanceDate (shouldn't happen due to query filter, but be safe)
          if (startDate && compareDomainDates(tx.date, openingBalanceDate) < 0) {
            return;
          }
          
          const accountClass = accountClassMap[tx.account_id] || 'asset';
          const amount = parseMoney(tx.signed_amount) || 0;

          // Update running balances
          if (accountClass === 'asset') {
            // Track actual asset balance (can go negative for overdrawn accounts)
            // We'll apply Math.max(0, ...) only when calculating net worth for display
            runningAssets = addMoney(runningAssets, amount); // Allow negative balances
          } else if (accountClass === 'liability') {
            // For liabilities: positive signed_amount = charge (increases debt), negative = payment (decreases debt)
            // Liability balances are stored as negative, so we add the signed_amount directly
            runningLiabilities = addMoney(runningLiabilities, amount); // Track actual liability balance (negative)
          }
          // Ignore equity accounts and any accounts without proper classification

          // Recalculate net balance from running totals
          // Net balance = Assets + Liabilities (since liabilities are stored as negative)
          // For net worth calculation, clamp assets to 0 (overdrawn accounts don't contribute to net worth)
          const netWorthAssets = roundMoney(Math.max(0, runningAssets));
          runningNetBalance = addMoney(netWorthAssets, runningLiabilities);

          // Store or update the date entry
          // Store net worth (assets clamped to 0) for display
          if (!dateMap.has(tx.date)) {
            dateMap.set(tx.date, {
              date: tx.date,
              netBalance: runningNetBalance, // Net worth (assets clamped to 0)
              assets: Math.max(0, runningAssets), // Assets for display (clamped to 0 for net worth)
              liabilities: runningLiabilities
            });
          } else {
            // Update existing entry with latest values
            const entry = dateMap.get(tx.date);
            entry.netBalance = runningNetBalance;
            entry.assets = Math.max(0, runningAssets);
            entry.liabilities = runningLiabilities;
          }
        });

        // Convert to array and sort
        const result = Array.from(dateMap.values());
        result.sort((a, b) => a.date.localeCompare(b.date));

          // Verify calculation accuracy: After processing all transactions in the period,
          // the running balance should match: opening_balance + sum of ALL transactions (not just period transactions)
          // Calculate what the balance should be at the last transaction date
          
          reportingDAO.getAllTransactionsSum(userId, accountIds)
            .then(allTransactionsSum => {
              // Build map of total transactions per account
              const totalTransactionsMap = {};
              allTransactionsSum.forEach(row => {
                totalTransactionsMap[row.account_id] = parseMoney(row.total || 0) || 0;
              });
              
              // Calculate expected final balance: opening_balance + sum of all transactions
              let expectedFinalAssets = 0;
              let expectedFinalLiabilities = 0;
              
              accounts.forEach(acc => {
                const totalTransactions = totalTransactionsMap[acc.account_id] || 0;
                const openingBal = parseMoney(acc.opening_balance || 0) || 0;
                const expectedBalance = addMoney(openingBal, totalTransactions);
                
                if (acc.account_class === 'asset') {
                  expectedFinalAssets = addMoney(expectedFinalAssets, Math.max(0, expectedBalance));
                } else if (acc.account_class === 'liability') {
                  expectedFinalLiabilities = addMoney(expectedFinalLiabilities, expectedBalance);
                }
              });
              
              const expectedFinalNetBalance = addMoney(expectedFinalAssets, expectedFinalLiabilities);
              
              // Compare with database current_balance
              let dbFinalAssets = 0;
              let dbFinalLiabilities = 0;
              accounts.forEach(acc => {
                if (acc.account_class === 'asset') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  dbFinalAssets = addMoney(dbFinalAssets, Math.max(0, balance));
                } else if (acc.account_class === 'liability') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  dbFinalLiabilities = addMoney(dbFinalLiabilities, balance);
                }
              });
              const dbFinalNetBalance = addMoney(dbFinalAssets, dbFinalLiabilities);
              
              if (Math.abs(expectedFinalNetBalance - dbFinalNetBalance) > 0.01) {
                console.error(`[NetBalanceChart] ⚠️ BALANCE MISMATCH DETECTED!`);
                console.error(`  Expected: ${expectedFinalNetBalance.toFixed(2)}`);
                console.error(`  Database: ${dbFinalNetBalance.toFixed(2)}`);
                console.error(`  Difference: ${(expectedFinalNetBalance - dbFinalNetBalance).toFixed(2)}`);
                
                // Log account-by-account breakdown
                console.error(`[NetBalanceChart] Account breakdown:`);
                accounts.forEach(acc => {
                  const totalTransactions = totalTransactionsMap[acc.account_id] || 0;
                  const expectedBalance = (acc.opening_balance || 0) + totalTransactions;
                  const dbBalance = acc.current_balance || 0;
                  const diff = expectedBalance - dbBalance;
                  if (Math.abs(diff) > 0.01) {
                    console.error(`  ${acc.account_name || acc.account_id || 'Unknown'} (${acc.account_class}):`);
                    console.error(`    opening: ${acc.opening_balance || 0}`);
                    console.error(`    transactions sum: ${totalTransactions}`);
                    console.error(`    expected: ${expectedBalance}`);
                    console.error(`    database: ${dbBalance}`);
                    console.error(`    diff: ${diff}`);
                  }
                });
              }
              
              // Continue with rest of processing...
              const lastTransactionDate = transactions.length > 0 
                ? transactions[transactions.length - 1].date 
                : null;
          
              // Only add a point beyond the last transaction date if:
              // 1. Today equals the last transaction date (same day), OR
              // 2. We're rounding to end of month and today is within the same month as last transaction
              const lastEntry = result[result.length - 1];
              let shouldAddTodayPoint = false;
              let finalDate = null;
              
              if (lastTransactionDate) {
                // Check if today is the same as last transaction date
                if (today === lastTransactionDate) {
                  shouldAddTodayPoint = true;
                  finalDate = today;
                } else {
                  // Check if we should round to end of month
                  // Extract year-month from last transaction date (YYYY-MM-DD -> YYYY-MM)
                  const lastTransactionMonth = lastTransactionDate.substring(0, 7);
                  const todayMonth = today.substring(0, 7);
                  
                  // If today is in the same month as last transaction, round to end of month
                  if (todayMonth === lastTransactionMonth) {
                    const { getLastDayOfMonth } = require('../utils/dateUtils');
                    finalDate = getLastDayOfMonth(today);
                    shouldAddTodayPoint = true;
                  }
                  // Otherwise, don't add any point beyond last transaction date
                }
              } else {
                // No transactions - only add today if it's the opening balance date
                if (lastEntry && lastEntry.date === today) {
                  shouldAddTodayPoint = false; // Already included
                } else if (lastEntry) {
                  // Has opening balance but no transactions - don't extend beyond opening date
                  shouldAddTodayPoint = false;
                } else {
                  // No data at all - use today as fallback
                  shouldAddTodayPoint = true;
                  finalDate = today;
                }
              }
              
              // Always calculate final balance from current_balance of all accounts
              // This ensures the chart shows the same current balance regardless of period selected
              // Historical points show progression, but final point is always current balance
              let finalAssets = 0;
              let finalLiabilities = 0;
              
              accounts.forEach(acc => {
                if (acc.account_class === 'asset') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  finalAssets = addMoney(finalAssets, Math.max(0, balance));
                } else if (acc.account_class === 'liability') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  finalLiabilities = addMoney(finalLiabilities, balance);
                }
              });
              
              const finalNetBalance = addMoney(finalAssets, finalLiabilities);
              
              // Add final point only if conditions are met
              if (shouldAddTodayPoint && finalDate && (!lastEntry || lastEntry.date !== finalDate)) {
                // Use current balance from database - this is the true current balance
                result.push({
                  date: finalDate,
                  netBalance: finalNetBalance,
                  assets: finalAssets,
                  liabilities: finalLiabilities
                });
              }

              // Get final values for current summary - always use current balance, not running balance
              const finalEntry = result[result.length - 1];
              
              // Ensure the final entry reflects current balance (may need to update if last entry is from transactions)
              if (finalEntry && finalEntry.date === finalDate) {
                // Final entry is the current balance point we just added
                finalEntry.netBalance = finalNetBalance;
                finalEntry.assets = finalAssets;
                finalEntry.liabilities = finalLiabilities;
              }
              
              res.json({
                period,
                timeframe: timeframe,
                data: result,
                current: {
                  netBalance: finalNetBalance,
                  assets: finalAssets,
                  liabilities: finalLiabilities
                }
              });
            })
            .catch(verifyErr => {
              console.error('Error verifying balance:', verifyErr);
              // Continue anyway - verification failed but don't break the response
              // Use the result we already calculated
              const lastTransactionDate = transactions.length > 0 
                ? transactions[transactions.length - 1].date 
                : null;
              
              const lastEntry = result[result.length - 1];
              let shouldAddTodayPoint = false;
              let finalDate = null;
              
              if (lastTransactionDate) {
                if (today === lastTransactionDate) {
                  shouldAddTodayPoint = true;
                  finalDate = today;
                } else {
                  const lastTransactionMonth = lastTransactionDate.substring(0, 7);
                  const todayMonth = today.substring(0, 7);
                  
                  if (todayMonth === lastTransactionMonth) {
                    const { getLastDayOfMonth } = require('../utils/dateUtils');
                    finalDate = getLastDayOfMonth(today);
                    shouldAddTodayPoint = true;
                  }
                }
              } else {
                if (lastEntry && lastEntry.date === today) {
                  shouldAddTodayPoint = false;
                } else if (lastEntry) {
                  shouldAddTodayPoint = false;
                } else {
                  shouldAddTodayPoint = true;
                  finalDate = today;
                }
              }
              
              let finalAssets = 0;
              let finalLiabilities = 0;
              
              accounts.forEach(acc => {
                if (acc.account_class === 'asset') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  finalAssets = addMoney(finalAssets, Math.max(0, balance));
                } else if (acc.account_class === 'liability') {
                  const balance = parseMoney(acc.current_balance || 0) || 0;
                  finalLiabilities = addMoney(finalLiabilities, balance);
                }
              });
              
              const finalNetBalance = addMoney(finalAssets, finalLiabilities);
              
              if (shouldAddTodayPoint && finalDate && (!lastEntry || lastEntry.date !== finalDate)) {
                result.push({
                  date: finalDate,
                  netBalance: finalNetBalance,
                  assets: finalAssets,
                  liabilities: finalLiabilities
                });
              }

              const finalEntry = result[result.length - 1];
              
              if (finalEntry && finalEntry.date === finalDate) {
                finalEntry.netBalance = finalNetBalance;
                finalEntry.assets = finalAssets;
                finalEntry.liabilities = finalLiabilities;
              }
              
              res.json({
                period,
                timeframe: timeframe,
                data: result,
                current: {
                  netBalance: finalNetBalance,
                  assets: finalAssets,
                  liabilities: finalLiabilities
                }
              });
            });
        })
        .catch(startBalErr => {
          console.error('Error fetching starting balances:', startBalErr);
          return res.status(500).json({ error: 'Failed to compute net balance history' });
        });
      })
      .catch(err => {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Failed to compute net balance history' });
      });
    })
    .catch(err => {
      console.error('Error fetching accounts:', err);
      return res.status(500).json({ error: 'Failed to compute net balance history' });
    });
};
