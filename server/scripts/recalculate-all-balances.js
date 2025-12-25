#!/usr/bin/env node
/**
 * Script to manually recalculate all account balances
 * This fixes any incorrect balances caused by the date normalization bug
 * 
 * Usage: node server/scripts/recalculate-all-balances.js [userId]
 * If userId is not provided, recalculates for all users
 */

const { getConnection } = require('../db/index');
const accountDAO = require('../models/account_dao');
const db = getConnection();

const userId = process.argv[2] || null;

console.log('Starting balance recalculation...');
if (userId) {
  console.log(`Recalculating for user: ${userId}`);
} else {
  console.log('Recalculating for all users');
}

// Get all accounts (optionally filtered by user)
let accountsSQL = `
  SELECT DISTINCT account_id, user_id, account_name
  FROM Accounts
`;
const params = [];

if (userId) {
  accountsSQL += ' WHERE user_id = ?';
  params.push(userId);
}

accountsSQL += ' ORDER BY user_id, account_name';

db.all(accountsSQL, params, (err, accounts) => {
  if (err) {
    console.error('Error fetching accounts:', err);
    process.exit(1);
  }

  if (!accounts || accounts.length === 0) {
    console.log('No accounts found');
    process.exit(0);
  }

  console.log(`Found ${accounts.length} account(s) to recalculate`);

  let completed = 0;
  let errors = 0;
  const errorDetails = [];

  accounts.forEach((account, index) => {
    accountDAO.updateAccountBalanceFromTransactions(account.account_id, (err, result) => {
      completed++;

      if (err) {
        errors++;
        errorDetails.push({
          account_id: account.account_id,
          account_name: account.account_name,
          user_id: account.user_id,
          error: err.message || String(err)
        });
        console.error(`❌ Failed: ${account.account_name} (${account.account_id}) - ${err.message || String(err)}`);
      } else {
        const oldBalance = result.oldBalance !== undefined ? result.oldBalance : 'unknown';
        const newBalance = result.newBalance || 0;
        const change = result.oldBalance !== undefined ? (newBalance - result.oldBalance).toFixed(2) : 'N/A';
        console.log(`✓ ${account.account_name}: ${newBalance.toFixed(2)} (change: ${change})`);
      }

      // When all accounts are processed
      if (completed === accounts.length) {
        console.log('\n=== Recalculation Complete ===');
        console.log(`Total accounts: ${accounts.length}`);
        console.log(`Successful: ${accounts.length - errors}`);
        console.log(`Failed: ${errors}`);

        if (errorDetails.length > 0) {
          console.log('\nErrors:');
          errorDetails.forEach(detail => {
            console.log(`  - ${detail.account_name} (${detail.account_id}): ${detail.error}`);
          });
        }

        process.exit(errors > 0 ? 1 : 0);
      }
    });
  });
});


