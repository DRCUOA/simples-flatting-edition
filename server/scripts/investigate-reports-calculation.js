#!/usr/bin/env node

/**
 * Diagnostic script to investigate how Reports view calculates totals
 * 
 * Checks:
 * 1. How categories are grouped and root types determined
 * 2. Which transactions are included/excluded in the calculation
 * 3. Why net income differs from transaction totals
 * 
 * Usage: node investigate-reports-calculation.js <user_id> <start_date> <end_date>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const userId = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!userId || !startDate || !endDate) {
  console.error('Usage: node investigate-reports-calculation.js <user_id> <start_date> <end_date>');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log('\n=== REPORTS CALCULATION INVESTIGATION ===\n');
console.log(`User ID: ${userId}`);
console.log(`Date Range: ${startDate} to ${endDate}\n`);

// Query: Get transaction actuals grouped by category (same as Reports API)
const query1 = `
  SELECT 
    t.category_id,
    c.category_name,
    strftime('%Y-%m', t.transaction_date) as month,
    SUM(CASE WHEN t.signed_amount >= 0 THEN t.signed_amount ELSE 0 END) AS income,
    SUM(CASE WHEN t.signed_amount < 0 THEN ABS(t.signed_amount) ELSE 0 END) AS expense,
    SUM(t.signed_amount) AS net
  FROM transactions t
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.user_id = ?
    AND DATE(t.transaction_date) >= DATE(?)
    AND DATE(t.transaction_date) <= DATE(?)
    AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
    AND t.category_id IS NOT NULL
  GROUP BY t.category_id, month
  ORDER BY t.category_id, month
`;

// Query: Get root category hierarchy
const query2 = `
  WITH RECURSIVE CategoryRoots AS (
    SELECT 
      category_id,
      category_name,
      parent_category_id,
      category_id as root_id,
      category_name as root_name,
      0 as level
    FROM Categories
    WHERE user_id = ? AND parent_category_id IS NULL
    
    UNION ALL
    
    SELECT 
      c.category_id,
      c.category_name,
      c.parent_category_id,
      cr.root_id,
      cr.root_name,
      cr.level + 1
    FROM Categories c
    INNER JOIN CategoryRoots cr ON c.parent_category_id = cr.category_id
    WHERE c.user_id = ?
  )
  SELECT * FROM CategoryRoots
  ORDER BY root_id, level
`;

db.all(query1, [userId, startDate, endDate], (err, transactionRows) => {
  if (err) {
    console.error('Error querying transactions:', err);
    db.close();
    return;
  }
  
  db.all(query2, [userId, userId], (err, categoryRows) => {
    if (err) {
      console.error('Error querying categories:', err);
      db.close();
      return;
    }
    
    // Build category map
    const categoryMap = new Map();
    categoryRows.forEach(cat => {
      categoryMap.set(cat.category_id, cat);
    });
    
    // Group transactions by root category
    const rootTotals = new Map();
    
    transactionRows.forEach(row => {
      const category = categoryMap.get(row.category_id);
      if (!category) {
        console.log(`WARNING: Category ${row.category_id} not found in category hierarchy`);
        return;
      }
      
      const rootId = category.root_id;
      if (!rootTotals.has(rootId)) {
        rootTotals.set(rootId, {
          root_id: rootId,
          root_name: category.root_name,
          income: 0,
          expense: 0,
          net: 0
        });
      }
      
      const root = rootTotals.get(rootId);
      root.income += parseFloat(row.income) || 0;
      root.expense += parseFloat(row.expense) || 0;
      root.net += parseFloat(row.net) || 0;
    });
    
    // Determine root types (same logic as backend)
    const rootTypes = new Map();
    rootTotals.forEach((totals, rootId) => {
      const rootCategory = categoryRows.find(c => c.root_id === rootId && c.level === 0);
      if (rootCategory) {
        rootTypes.set(rootId, {
          root_id: rootId,
          root_name: rootCategory.root_name,
          root_type: totals.income > totals.expense ? 'income' : 'expense',
          income: totals.income,
          expense: totals.expense,
          net: totals.net
        });
      }
    });
    
    // Separate into income and expense
    const incomeRoots = [];
    const expenseRoots = [];
    
    rootTypes.forEach((root, rootId) => {
      if (root.root_type === 'income') {
        incomeRoots.push(root);
      } else {
        expenseRoots.push(root);
      }
    });
    
    // Calculate totals
    const totalIncome = incomeRoots.reduce((sum, r) => sum + r.income, 0);
    const totalExpense = expenseRoots.reduce((sum, r) => sum + r.expense, 0);
    const netIncome = totalIncome - totalExpense;
    
    console.log('=== ROOT CATEGORY BREAKDOWN ===\n');
    
    console.log('INCOME ROOTS:');
    incomeRoots.forEach(root => {
      console.log(`  ${root.root_name}: Income=$${root.income.toFixed(2)}, Expense=$${root.expense.toFixed(2)}, Net=$${root.net.toFixed(2)}`);
    });
    console.log(`Total Income: $${totalIncome.toFixed(2)}\n`);
    
    console.log('EXPENSE ROOTS:');
    expenseRoots.forEach(root => {
      console.log(`  ${root.root_name}: Income=$${root.income.toFixed(2)}, Expense=$${root.expense.toFixed(2)}, Net=$${root.net.toFixed(2)}`);
    });
    console.log(`Total Expense: $${totalExpense.toFixed(2)}\n`);
    
    console.log(`Net Income (Income - Expense): $${netIncome.toFixed(2)}\n`);
    
    // Compare with direct transaction totals
    const directQuery = `
      SELECT 
        ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) AS total_income,
        ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) AS total_expense,
        ROUND(SUM(signed_amount), 2) AS total_net
      FROM transactions t
      LEFT JOIN Categories c ON t.category_id = c.category_id
      WHERE t.user_id = ?
        AND DATE(t.transaction_date) >= DATE(?)
        AND DATE(t.transaction_date) <= DATE(?)
        AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
        AND t.category_id IS NOT NULL
    `;
    
    db.get(directQuery, [userId, startDate, endDate], (err, direct) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      
      console.log('=== DIRECT TRANSACTION TOTALS ===\n');
      console.log(`Total Income: $${direct.total_income.toFixed(2)}`);
      console.log(`Total Expense: $${direct.total_expense.toFixed(2)}`);
      console.log(`Total Net: $${direct.total_net.toFixed(2)}\n`);
      
      console.log('=== DISCREPANCY ANALYSIS ===\n');
      console.log(`Reports Income: $${totalIncome.toFixed(2)}`);
      console.log(`Direct Income: $${direct.total_income.toFixed(2)}`);
      console.log(`Difference: $${Math.abs(totalIncome - direct.total_income).toFixed(2)}\n`);
      
      console.log(`Reports Expense: $${totalExpense.toFixed(2)}`);
      console.log(`Direct Expense: $${direct.total_expense.toFixed(2)}`);
      console.log(`Difference: $${Math.abs(totalExpense - direct.total_expense).toFixed(2)}\n`);
      
      console.log(`Reports Net: $${netIncome.toFixed(2)}`);
      console.log(`Direct Net: $${direct.total_net.toFixed(2)}`);
      console.log(`Difference: $${Math.abs(netIncome - direct.total_net).toFixed(2)}\n`);
      
      db.close();
    });
  });
});


