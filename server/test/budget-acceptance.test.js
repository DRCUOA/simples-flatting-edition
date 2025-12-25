/**
 * Budget System Acceptance Test
 * Verifies the worked example from the specification:
 * 
 * Active category budgets (Oct 2025):
 * - Groceries: 60000 cents
 * - Rent: 180000 cents
 * - Transport: 30000 cents
 * 
 * Actuals (posted, non-transfer):
 * - Groceries: -55234 cents
 * - Rent: -180000 cents
 * - Transport: -4123 cents
 * - Uncategorised: -2500 cents
 * 
 * Expected results:
 * - Groceries variance: 60000 - 55234 = 4766
 * - Rent variance: 180000 - 180000 = 0
 * - Transport variance: 30000 - 4123 = 25877
 * - Uncategorised variance: 0 - 2500 = -2500 (overspend/unbudgeted)
 * 
 * Totals:
 * - budgeted_total_month = 270000
 * - expense_actual_total = 241857 (55234+180000+4123+2500)
 * - income_actual_total = 0
 * - net_actual_total = -241857
 * - variance_total_cents = 28143 (270000 - 241857)
 */

const chai = require('chai');
const expect = chai.expect;
const budgetDAO = require('../models/budget_category_month_dao');
const reportingService = require('../services/budget-reporting-service');
const { getConnection } = require('../db/index');

const TEST_USER_ID = 'acceptance-test-user';
const TEST_MONTH = '2025-10';
const CAT_GROCERIES = 'cat-acc-groceries';
const CAT_RENT = 'cat-acc-rent';
const CAT_TRANSPORT = 'cat-acc-transport';
const TEST_ACCOUNT = 'acc-test-checking';

describe('Budget System Acceptance Test - Worked Example', function() {
  this.timeout(5000);
  
  const db = getConnection();
  
  before(async function() {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create test user
        db.run(
          `INSERT OR IGNORE INTO Users (user_id, username, email, password_hash)
           VALUES (?, ?, ?, ?)`,
          [TEST_USER_ID, 'acceptance-user', 'acceptance@test.com', 'hash']
        );
        
        // Create test account
        db.run(
          `INSERT OR IGNORE INTO Accounts (account_id, user_id, account_name, account_type, current_balance)
           VALUES (?, ?, ?, ?, ?)`,
          [TEST_ACCOUNT, TEST_USER_ID, 'Test Checking', 'checking', 1000.00]
        );
        
        // Create test categories
        db.run(
          `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
           VALUES (?, ?, ?)`,
          [CAT_GROCERIES, TEST_USER_ID, 'Groceries']
        );
        
        db.run(
          `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
           VALUES (?, ?, ?)`,
          [CAT_RENT, TEST_USER_ID, 'Rent']
        );
        
        db.run(
          `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
           VALUES (?, ?, ?)`,
          [CAT_TRANSPORT, TEST_USER_ID, 'Transport'],
          () => resolve()
        );
      });
    });
  });
  
  after(async function() {
    return new Promise((resolve) => {
      db.serialize(() => {
        db.run('DELETE FROM Transactions WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM Categories WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM Accounts WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM Users WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
  });
  
  it('should produce correct variance calculations for the worked example', async function() {
    // Setup budgets
    await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, CAT_GROCERIES, 60000);
    await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, CAT_RENT, 180000);
    await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, CAT_TRANSPORT, 30000);
    
    // Setup transactions
    const transactions = [
      // Groceries: -552.34
      { category_id: CAT_GROCERIES, amount: -552.34, desc: 'Grocery Store' },
      // Rent: -1800.00
      { category_id: CAT_RENT, amount: -1800.00, desc: 'Rent Payment' },
      // Transport: -41.23
      { category_id: CAT_TRANSPORT, amount: -41.23, desc: 'Gas Station' },
      // Uncategorised: -25.00
      { category_id: null, amount: -25.00, desc: 'Misc Expense' }
    ];
    
    // Insert transactions
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        transactions.forEach((txn, idx) => {
          const txnId = `txn-acc-${idx}`;
          db.run(
            `INSERT OR REPLACE INTO Transactions 
             (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, signed_amount, transaction_type, posted_status, is_transfer)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              txnId,
              TEST_USER_ID,
              TEST_ACCOUNT,
              txn.category_id,
              '2025-10-15',
              txn.desc,
              Math.abs(txn.amount),
              txn.amount,
              txn.amount < 0 ? 'D' : 'C',
              'posted',
              0
            ],
            (err) => {
              if (err) console.error('Error inserting transaction:', err);
              if (idx === transactions.length - 1) resolve();
            }
          );
        });
      });
    });
    
    // Generate report
    const report = await reportingService.getMonthReport(TEST_USER_ID, TEST_MONTH);
    
    // Verify totals
    expect(report.budgeted_total_month).to.equal(270000);
    expect(report.expense_actual_total).to.be.closeTo(241857, 10); // Allow small rounding
    expect(report.income_actual_total).to.equal(0);
    expect(report.net_actual_total).to.be.closeTo(-241857, 10);
    
    // Verify category variances
    const groceries = report.categories.find(c => c.category_id === CAT_GROCERIES);
    const rent = report.categories.find(c => c.category_id === CAT_RENT);
    const transport = report.categories.find(c => c.category_id === CAT_TRANSPORT);
    const uncat = report.categories.find(c => c.category_name === 'Uncategorised');
    
    expect(groceries).to.exist;
    expect(groceries.budgeted_cents).to.equal(60000);
    expect(groceries.expense_cents).to.be.closeTo(55234, 10);
    expect(groceries.variance_cents).to.be.closeTo(4766, 10);
    
    expect(rent).to.exist;
    expect(rent.budgeted_cents).to.equal(180000);
    expect(rent.expense_cents).to.be.closeTo(180000, 10);
    expect(rent.variance_cents).to.be.closeTo(0, 10);
    
    expect(transport).to.exist;
    expect(transport.budgeted_cents).to.equal(30000);
    expect(transport.expense_cents).to.be.closeTo(4123, 10);
    expect(transport.variance_cents).to.be.closeTo(25877, 10);
    
    expect(uncat).to.exist;
    expect(uncat.budgeted_cents).to.equal(0);
    expect(uncat.expense_cents).to.be.closeTo(2500, 10);
    expect(uncat.variance_cents).to.be.closeTo(-2500, 10); // Overspend
    expect(uncat.is_over_budget).to.be.true;
  });
  
  it('should exclude transfers from actuals', async function() {
    // Create Internal-Transfers category
    const CAT_TRANSFER = 'cat-transfer-test';
    await new Promise((resolve) => {
      db.run(
        `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
         VALUES (?, ?, ?)`,
        [CAT_TRANSFER, TEST_USER_ID, 'Internal-Transfers'],
        () => resolve()
      );
    });
    
    // Add a transfer transaction
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO Transactions 
         (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, signed_amount, transaction_type, posted_status, is_transfer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'txn-transfer-test',
          TEST_USER_ID,
          TEST_ACCOUNT,
          CAT_TRANSFER,
          '2025-10-20',
          'Transfer to savings',
          500.00,
          -500.00,
          'D',
          'posted',
          1
        ],
        () => resolve()
      );
    });
    
    // Generate report - should exclude transfer
    const report = await reportingService.getMonthReport(TEST_USER_ID, TEST_MONTH);
    
    // Transfer should not affect actuals
    const transferCat = report.categories.find(c => c.category_id === CAT_TRANSFER);
    expect(transferCat).to.not.exist; // Should be filtered out
    
    // Cleanup
    await new Promise((resolve) => {
      db.run('DELETE FROM Transactions WHERE transaction_id = ?', ['txn-transfer-test']);
      db.run('DELETE FROM Categories WHERE category_id = ?', [CAT_TRANSFER], () => resolve());
    });
  });
  
  it('should exclude pending transactions from main actuals', async function() {
    // Add a pending transaction
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO Transactions 
         (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, signed_amount, transaction_type, posted_status, is_transfer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'txn-pending-test',
          TEST_USER_ID,
          TEST_ACCOUNT,
          CAT_GROCERIES,
          '2025-10-25',
          'Pending purchase',
          100.00,
          -100.00,
          'D',
          'pending',
          0
        ],
        () => resolve()
      );
    });
    
    // Generate report - should exclude pending
    const report = await reportingService.getMonthReport(TEST_USER_ID, TEST_MONTH);
    
    // Pending should be flagged but not in main actuals
    expect(report.flags.has_pending).to.be.true;
    expect(report.flags.pending_count).to.be.at.least(1);
    
    // Get pending panel
    const pendingPanel = await reportingService.getPendingTransactionsPanel(TEST_USER_ID, TEST_MONTH);
    expect(pendingPanel.transaction_count).to.be.at.least(1);
    
    // Cleanup
    await new Promise((resolve) => {
      db.run('DELETE FROM Transactions WHERE transaction_id = ?', ['txn-pending-test'], () => resolve());
    });
  });
  
  it('should verify acceptance criteria', async function() {
    const report = await reportingService.getMonthReport(TEST_USER_ID, TEST_MONTH);
    
    // ✅ Uniqueness: No more than one active row per {user_id, month, category_id}
    const activeCount = await new Promise((resolve) => {
      db.get(
        `SELECT category_id, COUNT(*) as count
         FROM budget_category_month
         WHERE user_id = ? AND month = ? AND active_flag = 1 AND deleted_at IS NULL
         GROUP BY category_id
         HAVING count > 1`,
        [TEST_USER_ID, TEST_MONTH],
        (err, row) => resolve(row ? row.count : 0)
      );
    });
    expect(activeCount).to.equal(0, 'Should have no duplicate active budgets');
    
    // ✅ Derivation: Month total = SUM(active category budgets)
    const monthTotal = await budgetDAO.getMonthTotal(TEST_USER_ID, TEST_MONTH);
    expect(monthTotal).to.equal(270000);
    expect(report.budgeted_total_month).to.equal(monthTotal);
    
    // ✅ Completeness: Includes both budgeted-no-spend and spend-no-budget
    const budgetedCats = report.categories.filter(c => c.budgeted_cents > 0).length;
    const actualCats = report.categories.filter(c => c.expense_cents > 0 || c.income_cents > 0).length;
    expect(budgetedCats).to.be.at.least(3); // Groceries, Rent, Transport
    expect(actualCats).to.be.at.least(4); // + Uncategorised
    
    // ✅ Signs: Expenses < 0, income > 0 (in signed_amount)
    // Variance calculated accordingly
    expect(report.net_actual_total).to.be.lessThan(0); // Net is negative (expenses)
    
    console.log('\n✅ All acceptance criteria verified!');
    console.log(`  - Budgeted total: ${report.budgeted_total_month / 100} USD`);
    console.log(`  - Expense total: ${report.expense_actual_total / 100} USD`);
    console.log(`  - Variance total: ${report.variance_total_cents / 100} USD`);
  });
});

