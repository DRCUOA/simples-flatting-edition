#!/usr/bin/env node

/**
 * Diagnostic script to investigate FlowView totals vs Transactions/Reports totals
 * 
 * Checks:
 * 1. How FlowView excludes transfers vs how Reports excludes transfers
 * 2. Whether totals match after exclusions
 * 3. Why Sankey might show different values
 * 
 * Usage: node investigate-flowview-totals.js <user_id> <start_date> <end_date>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const userId = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!userId || !startDate || !endDate) {
  console.error('Usage: node investigate-flowview-totals.js <user_id> <start_date> <end_date>');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log('\n=== FLOWVIEW TOTALS INVESTIGATION ===\n');
console.log(`User ID: ${userId}`);
console.log(`Date Range: ${startDate} to ${endDate}\n`);

// Query 1: Transactions View (ALL transactions, no exclusions)
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

// Query 2: FlowView Method (excludes is_transfer=1 AND transfer categories)
const query2 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.user_id = ?
    AND t.transaction_date >= ?
    AND t.transaction_date <= ?
    AND (t.is_transfer IS NULL OR t.is_transfer = 0)
    AND t.category_id IS NOT NULL
    AND (c.category_name IS NULL OR LOWER(c.category_name) NOT LIKE '%transfer%')
`;

// Query 3: Reports View Method (excludes Internal-Transfers category only)
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
    AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
    AND t.category_id IS NOT NULL
`;

// Query 4: Transfers excluded by FlowView
const query4 = `
  SELECT 
    COUNT(*) as count,
    ROUND(SUM(signed_amount), 2) as total_net,
    ROUND(SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END), 2) as total_income,
    ROUND(SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END), 2) as total_expense
  FROM transactions t
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.user_id = ?
    AND t.transaction_date >= ?
    AND t.transaction_date <= ?
    AND (
      (t.is_transfer = 1) 
      OR (c.category_name IS NOT NULL AND LOWER(c.category_name) LIKE '%transfer%')
    )
`;

// Query 5: Transfers excluded by Reports
const query5 = `
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
      else resolve({ name: 'FlowView Method (excludes is_transfer & transfer categories)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query3, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Reports View Method (excludes Internal-Transfers only)', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query4, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Transfers excluded by FlowView', data: row });
    });
  }),
  new Promise((resolve, reject) => {
    db.get(query5, [userId, startDate, endDate], (err, row) => {
      if (err) reject(err);
      else resolve({ name: 'Transfers excluded by Reports', data: row });
    });
  })
]).then(results => {
  console.log('RESULTS:\n');
  
  results.forEach(result => {
    const { name, data } = result;
    console.log(`--- ${name} ---`);
    console.log(`  Count: ${data.count || 0}`);
    console.log(`  Net Total: $${(data.total_net || 0).toFixed(2)}`);
    console.log(`  Income: $${(data.total_income || 0).toFixed(2)}`);
    console.log(`  Expense: $${(data.total_expense || 0).toFixed(2)}`);
    console.log('');
  });
  
  // Calculate discrepancies
  const transactionsView = results[0].data;
  const flowView = results[1].data;
  const reportsView = results[2].data;
  
  console.log('=== DISCREPANCY ANALYSIS ===\n');
  
  console.log('Net Income Comparison:');
  console.log(`  Transactions View: $${transactionsView.total_net.toFixed(2)}`);
  console.log(`  FlowView: $${flowView.total_net.toFixed(2)}`);
  console.log(`  Reports View: $${reportsView.total_net.toFixed(2)}`);
  console.log(`  FlowView difference: $${(flowView.total_net - transactionsView.total_net).toFixed(2)}`);
  console.log(`  Reports difference: $${(reportsView.total_net - transactionsView.total_net).toFixed(2)}\n`);
  
  console.log('Income Comparison:');
  console.log(`  Transactions View: $${transactionsView.total_income.toFixed(2)}`);
  console.log(`  FlowView: $${flowView.total_income.toFixed(2)}`);
  console.log(`  Reports View: $${reportsView.total_income.toFixed(2)}`);
  console.log(`  FlowView difference: $${(flowView.total_income - transactionsView.total_income).toFixed(2)}`);
  console.log(`  Reports difference: $${(reportsView.total_income - transactionsView.total_income).toFixed(2)}\n`);
  
  console.log('Expense Comparison:');
  console.log(`  Transactions View: $${transactionsView.total_expense.toFixed(2)}`);
  console.log(`  FlowView: $${flowView.total_expense.toFixed(2)}`);
  console.log(`  Reports View: $${reportsView.total_expense.toFixed(2)}`);
  console.log(`  FlowView difference: $${(flowView.total_expense - transactionsView.total_expense).toFixed(2)}`);
  console.log(`  Reports difference: $${(reportsView.total_expense - transactionsView.total_expense).toFixed(2)}\n`);
  
  const flowViewExcluded = results[3].data;
  const reportsExcluded = results[4].data;
  
  console.log('Transfers Excluded:');
  console.log(`  FlowView excluded: ${flowViewExcluded.count} transactions, Net: $${flowViewExcluded.total_net.toFixed(2)}`);
  console.log(`  Reports excluded: ${reportsExcluded.count} transactions, Net: $${reportsExcluded.total_net.toFixed(2)}\n`);
  
  db.close();
}).catch(err => {
  console.error('Error:', err);
  db.close();
  process.exit(1);
});


