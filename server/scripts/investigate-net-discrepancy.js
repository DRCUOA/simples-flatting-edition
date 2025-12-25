#!/usr/bin/env node

/**
 * Diagnostic script to investigate discrepancy between Transactions view and Reports view
 * 
 * Compares:
 * 1. Transactions view: Sum of ALL transactions (including transfers, uncategorized)
 * 2. Reports view: Sum excluding 'Internal-Transfers' category and NULL category_id
 * 
 * Usage: node investigate-net-discrepancy.js <user_id> <start_date> <end_date>
 * Example: node investigate-net-discrepancy.js 0cec4052-738c-4d3c-afbb-3fcc91020ca5 2025-04-01 2025-11-30
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const userId = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!userId || !startDate || !endDate) {
  console.error('Usage: node investigate-net-discrepancy.js <user_id> <start_date> <end_date>');
  console.error('Example: node investigate-net-discrepancy.js 0cec4052-738c-4d3c-afbb-3fcc91020ca5 2025-04-01 2025-11-30');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log('\n=== NET DISCREPANCY INVESTIGATION ===\n');
console.log(`User ID: ${userId}`);
console.log(`Date Range: ${startDate} to ${endDate}\n`);

// Query 1: Transactions View Method (ALL transactions)
const query1 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  WHERE t.user_id = ?
    AND t.transaction_date >= ?
    AND t.transaction_date <= ?
`;

// Query 2: Reports View Method (excludes Internal-Transfers and NULL categories)
const query2 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.user_id = ?
    AND DATE(t.transaction_date) >= DATE(?)
    AND DATE(t.transaction_date) <= DATE(?)
    AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
    AND t.category_id IS NOT NULL
`;

// Query 3: Transactions excluded by Reports (Internal-Transfers)
const query3 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.user_id = ?
    AND DATE(t.transaction_date) >= DATE(?)
    AND DATE(t.transaction_date) <= DATE(?)
    AND c.category_name = 'Internal-Transfers'
`;

// Query 4: Transactions excluded by Reports (NULL category_id)
const query4 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  WHERE t.user_id = ?
    AND DATE(t.transaction_date) >= DATE(?)
    AND DATE(t.transaction_date) <= DATE(?)
    AND t.category_id IS NULL
`;

// Query 5: Date filtering difference check (DATE() vs string comparison)
const query5 = `
  SELECT 
    COUNT(*) as count_date_func,
    ROUND(SUM(signed_amount), 2) as total_net_date_func
  FROM transactions t
  WHERE t.user_id = ?
    AND DATE(t.transaction_date) >= DATE(?)
    AND DATE(t.transaction_date) <= DATE(?)
`;

const query6 = `
  SELECT 
    COUNT(*) as count_string_comp,
    ROUND(SUM(signed_amount), 2) as total_net_string_comp
  FROM transactions t
  WHERE t.user_id = ?
    AND t.transaction_date >= ?
    AND t.transaction_date <= ?
`;

Promise.all([
  new Promise((resolve, reject) => {
    db.get(query1, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Transactions View (ALL)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query2, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Reports View (excludes Internal-Transfers & NULL)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query3, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Internal-Transfers (excluded)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query4, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'NULL category_id (excluded)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query5, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Date filtering (DATE() function)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query6, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Date filtering (string comparison)', data: row });
    });
  })
]).then(results => {
  console.log('RESULTS:\n');
  
  results.forEach(result => {
    const { name, data } = result;
    console.log(`--- ${name} ---`);
    console.log(`  Count: ${data.count || data.count_date_func || data.count_string_comp || 0}`);
    console.log(`  Net Total: $${(data.total_net || data.total_net_date_func || data.total_net_string_comp || 0).toFixed(2)}`);
    if (data.total_income !== undefined) {
      console.log(`  Income: $${(data.total_income || 0).toFixed(2)}`);
      console.log(`  Expense: $${(data.total_expense || 0).toFixed(2)}`);
    }
    console.log('');
  });
  
  // Calculate discrepancy
  const transactionsView = results[0].data.total_net || 0;
  const reportsView = results[1].data.total_net || 0;
  const discrepancy = transactionsView - reportsView;
  
  console.log('=== DISCREPANCY ANALYSIS ===\n');
  console.log(`Transactions View Net: $${transactionsView.toFixed(2)}`);
  console.log(`Reports View Net: $${reportsView.toFixed(2)}`);
  console.log(`Discrepancy: $${discrepancy.toFixed(2)}\n`);
  
  const internalTransfers = results[2].data.total_net || 0;
  const nullCategory = results[3].data.total_net || 0;
  const excludedTotal = internalTransfers + nullCategory;
  
  console.log(`Excluded Internal-Transfers: $${internalTransfers.toFixed(2)}`);
  console.log(`Excluded NULL category_id: $${nullCategory.toFixed(2)}`);
  console.log(`Total Excluded: $${excludedTotal.toFixed(2)}\n`);
  
  // Date filtering comparison
  const dateFuncTotal = results[4].data.total_net_date_func || 0;
  const stringCompTotal = results[5].data.total_net_string_comp || 0;
  const dateFilterDiff = dateFuncTotal - stringCompTotal;
  
  console.log(`Date filtering (DATE()): $${dateFuncTotal.toFixed(2)}`);
  console.log(`Date filtering (string): $${stringCompTotal.toFixed(2)}`);
  console.log(`Date filter difference: $${dateFilterDiff.toFixed(2)}\n`);
  
  // Expected calculation
  const expectedReportsNet = transactionsView - excludedTotal;
  console.log(`Expected Reports Net (Transactions - Excluded): $${expectedReportsNet.toFixed(2)}`);
  console.log(`Actual Reports Net: $${reportsView.toFixed(2)}`);
  console.log(`Difference: $${Math.abs(expectedReportsNet - reportsView).toFixed(2)}\n`);
  
  db.close();
}).catch(err => {
  console.error('Error:', err);
  db.close();
  process.exit(1);
});


