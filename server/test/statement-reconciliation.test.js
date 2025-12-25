/**
 * Statement Reconciliation Service Tests
 * Comprehensive test suite for statement reconciliation validation
 */

const assert = require('assert');
const { getConnection } = require('../db/index');
const statementReconciliationService = require('../services/statementReconciliationService');
const { moneyEquals, CURRENCY_EPSILON } = require('../utils/money');

describe('Statement Reconciliation Service', () => {
  let db;
  let testUserId;
  let testAccountId;
  let testStatementIds = [];

  before(async () => {
    db = getConnection();
    testUserId = 'test-user-reconciliation-' + Date.now();
    testAccountId = 'test-account-reconciliation-' + Date.now();

    // Create test account (using simple user ID like existing tests)
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO Accounts (account_id, user_id, account_name, account_type, current_balance) VALUES (?, ?, ?, ?, ?)', 
        [testAccountId, testUserId, 'Test Account', 'checking', 1000], (err) => {
          if (err) reject(err);
          else resolve();
        });
    });
  });

  after(async () => {
    // Clean up test data
    if (testStatementIds.length > 0) {
      const placeholders = testStatementIds.map(() => '?').join(',');
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM Transactions WHERE statement_id IN (${placeholders})`, testStatementIds, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM Statements WHERE account_id = ?', [testAccountId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM Accounts WHERE account_id = ?', [testAccountId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  });

  describe('Money Utilities', () => {
    it('should compare money amounts with epsilon precision', () => {
      assert.strictEqual(moneyEquals(100.00, 100.005), true);
      assert.strictEqual(moneyEquals(100.00, 100.02), false);
      assert.strictEqual(moneyEquals(0.00, 0.005), true);
      assert.strictEqual(moneyEquals(0.00, 0.015), false);
    });

    it('should handle edge cases in money comparison', () => {
      assert.strictEqual(moneyEquals(NaN, NaN), false);
      assert.strictEqual(moneyEquals(Infinity, Infinity), true);
      assert.strictEqual(moneyEquals(null, null), false);
      assert.strictEqual(moneyEquals(undefined, undefined), false);
    });
  });

  describe('First Statement (No Previous)', () => {
    let firstStatementId;

    before(async () => {
      firstStatementId = 'test-statement-1-' + Date.now();
      testStatementIds.push(firstStatementId);

      // Create first statement
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [firstStatementId, testAccountId, '2024-01-01', '2024-01-31', 1000.00, 1200.00], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add some transactions
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, transaction_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['txn-1', testAccountId, testUserId, '2024-01-15', 'Test Transaction 1', 200.00, 200.00, 0, 'credit'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('should pass reconciliation for first statement with correct arithmetic', (done) => {
      statementReconciliationService.reconcileStatement(firstStatementId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.checks.openingMatchesPrev, true); // No previous statement
        assert.strictEqual(result.checks.arithmeticHolds, true);
        assert.strictEqual(result.deltas.openingVsPrev, 0);
        assert.strictEqual(result.deltas.arithmeticDiff, 0);
        assert.strictEqual(result.context.prevStatementId, null);
        done();
      });
    });
  });

  describe('Previous Statement Exists - Opening Mismatch', () => {
    let secondStatementId;

    before(async () => {
      secondStatementId = 'test-statement-2-' + Date.now();
      testStatementIds.push(secondStatementId);

      // Create second statement with opening balance that doesn't match previous closing
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [secondStatementId, testAccountId, '2024-02-01', '2024-02-29', 1100.00, 1300.00], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add transactions that would make arithmetic work if opening was correct
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, transaction_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['txn-2', testAccountId, testUserId, '2024-02-15', 'Test Transaction 2', 200.00, 200.00, 0, 'credit'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('should fail reconciliation due to opening balance mismatch', (done) => {
      statementReconciliationService.reconcileStatement(secondStatementId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.checks.openingMatchesPrev, false);
        assert.strictEqual(result.checks.arithmeticHolds, true); // Arithmetic would work with correct opening
        assert.strictEqual(result.deltas.openingVsPrev, -100.00); // 1100 - 1200 = -100
        assert.strictEqual(result.deltas.arithmeticDiff, 0);
        assert.strictEqual(result.context.prevStatementId, testStatementIds[0]);
        done();
      });
    });
  });

  describe('Opening Matches - Arithmetic Fails', () => {
    let thirdStatementId;

    before(async () => {
      thirdStatementId = 'test-statement-3-' + Date.now();
      testStatementIds.push(thirdStatementId);

      // Create third statement with correct opening balance but wrong closing
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [thirdStatementId, testAccountId, '2024-03-01', '2024-03-31', 1300.00, 1400.00], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add transactions that don't match the closing balance
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, transaction_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['txn-3', testAccountId, testUserId, '2024-03-15', 'Test Transaction 3', 50.00, 50.00, 0, 'credit'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('should fail reconciliation due to arithmetic equation failure', (done) => {
      statementReconciliationService.reconcileStatement(thirdStatementId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.checks.openingMatchesPrev, true); // Opening matches previous closing
        assert.strictEqual(result.checks.arithmeticHolds, false); // 1300 + 50 ≠ 1400
        assert.strictEqual(result.deltas.openingVsPrev, 0);
        assert.strictEqual(result.deltas.arithmeticDiff, -50.00); // 1350 - 1400 = -50
        assert.strictEqual(result.context.prevStatementId, testStatementIds[1]);
        done();
      });
    });
  });

  describe('Empty Transactions in Range', () => {
    let fourthStatementId;

    before(async () => {
      fourthStatementId = 'test-statement-4-' + Date.now();
      testStatementIds.push(fourthStatementId);

      // Create statement with no transactions in the period
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [fourthStatementId, testAccountId, '2024-04-01', '2024-04-30', 1400.00, 1400.00], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('should pass reconciliation with zero transactions', (done) => {
      statementReconciliationService.reconcileStatement(fourthStatementId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.checks.openingMatchesPrev, true);
        assert.strictEqual(result.checks.arithmeticHolds, true); // 1400 + 0 = 1400
        assert.strictEqual(result.deltas.openingVsPrev, 0);
        assert.strictEqual(result.deltas.arithmeticDiff, 0);
        done();
      });
    });
  });

  describe('Boundary Date Inclusivity', () => {
    let fifthStatementId;

    before(async () => {
      fifthStatementId = 'test-statement-5-' + Date.now();
      testStatementIds.push(fifthStatementId);

      // Create statement
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [fifthStatementId, testAccountId, '2024-05-01', '2024-05-31', 1400.00, 1500.00], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Add transactions exactly on start and end dates
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, transaction_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['txn-start', testAccountId, testUserId, '2024-05-01', 'Start Date Transaction', 50.00, 50.00, 0, 'credit'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, transaction_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['txn-end', testAccountId, testUserId, '2024-05-31', 'End Date Transaction', 50.00, 50.00, 0, 'credit'], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('should include transactions on boundary dates', (done) => {
      statementReconciliationService.reconcileStatement(fifthStatementId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.checks.openingMatchesPrev, true);
        assert.strictEqual(result.checks.arithmeticHolds, true); // 1400 + 50 + 50 = 1500
        assert.strictEqual(result.deltas.openingVsPrev, 0);
        assert.strictEqual(result.deltas.arithmeticDiff, 0);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return error for non-existent statement', (done) => {
      statementReconciliationService.reconcileStatement('non-existent-id', (err, result) => {
        assert(err);
        assert.strictEqual(err.message, 'Statement not found');
        done();
      });
    });

    it('should return error for missing statement ID', (done) => {
      statementReconciliationService.reconcileStatement(null, (err, result) => {
        assert(err);
        assert.strictEqual(err.message, 'Statement ID is required');
        done();
      });
    });
  });

  describe('Helper Functions', () => {
    it('should get previous statement correctly', (done) => {
      statementReconciliationService.getPreviousStatement(testAccountId, '2024-06-01', (err, statement) => {
        assert.ifError(err);
        assert(statement);
        assert.strictEqual(statement.statement_id, testStatementIds[4]); // Should get the last statement
        done();
      });
    });

    it('should get transaction sum correctly', (done) => {
      statementReconciliationService.getTransactionSum(testAccountId, '2024-05-01', '2024-05-31', (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result.transaction_sum, 100.00); // 50 + 50
        assert.strictEqual(result.transaction_count, 2);
        done();
      });
    });
  });
});
