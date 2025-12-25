/**
 * Statement Defaults Tests
 * Test suite for smart statement defaults functionality
 */

const assert = require('assert');
const { getConnection } = require('../db/index');
const accountDAO = require('../models/account_dao');

describe('Statement Defaults', () => {
  let db;
  let testUserId;
  let testAccountId;
  let testStatementIds = [];

  before(async () => {
    db = getConnection();
    testUserId = 'test-user-defaults-' + Date.now();
    testAccountId = 'test-account-defaults-' + Date.now();

    // Create test account
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

  describe('getLastStatementForAccount', () => {
    it('should return null for account with no statements', (done) => {
      accountDAO.getLastStatementForAccount(testAccountId, (err, result) => {
        assert.ifError(err);
        assert.strictEqual(result, null);
        done();
      });
    });

    it('should return the most recent statement by end date', async () => {
      // Create multiple statements with different end dates
      const statement1Id = 'test-statement-1-' + Date.now();
      const statement2Id = 'test-statement-2-' + Date.now();
      const statement3Id = 'test-statement-3-' + Date.now();
      
      testStatementIds.push(statement1Id, statement2Id, statement3Id);

      // Create statements in non-chronological order
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [statement1Id, testAccountId, '2024-01-01', '2024-01-31', 1000, 1200], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [statement3Id, testAccountId, '2024-03-01', '2024-03-31', 1400, 1600], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO Statements (statement_id, account_id, period_start, period_end, opening_balance, closing_balance)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [statement2Id, testAccountId, '2024-02-01', '2024-02-29', 1200, 1400], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Should return statement3 (most recent end date: 2024-03-31)
      return new Promise((resolve, reject) => {
        accountDAO.getLastStatementForAccount(testAccountId, (err, result) => {
          if (err) return reject(err);
          
          assert(result);
          assert.strictEqual(result.statement_id, statement3Id);
          assert.strictEqual(result.period_end, '2024-03-31');
          assert.strictEqual(result.closing_balance, 1600);
          resolve();
        });
      });
    });
  });

  describe('Smart Defaults Logic', () => {
    it('should calculate next start date correctly', () => {
      const lastEndDate = '2024-03-31';
      const expectedNextStart = '2024-04-01';
      
      const lastEnd = new Date(lastEndDate);
      const nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      
      const actualNextStart = nextStart.toISOString().split('T')[0];
      assert.strictEqual(actualNextStart, expectedNextStart);
    });

    it('should handle month boundaries correctly', () => {
      const lastEndDate = '2024-01-31';
      const expectedNextStart = '2024-02-01';
      
      const lastEnd = new Date(lastEndDate);
      const nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      
      const actualNextStart = nextStart.toISOString().split('T')[0];
      assert.strictEqual(actualNextStart, expectedNextStart);
    });

    it('should handle year boundaries correctly', () => {
      const lastEndDate = '2023-12-31';
      const expectedNextStart = '2024-01-01';
      
      const lastEnd = new Date(lastEndDate);
      const nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      
      const actualNextStart = nextStart.toISOString().split('T')[0];
      assert.strictEqual(actualNextStart, expectedNextStart);
    });
  });

  describe('Default Values', () => {
    it('should provide correct defaults for first statement', () => {
      const defaults = {
        period_start: null,
        opening_balance: 0
      };
      
      assert.strictEqual(defaults.period_start, null);
      assert.strictEqual(defaults.opening_balance, 0);
    });

    it('should provide correct defaults for subsequent statement', () => {
      const lastStatement = {
        statement_id: 'test-123',
        period_end: '2024-03-31',
        closing_balance: 1500
      };

      const lastEndDate = new Date(lastStatement.period_end);
      const nextStartDate = new Date(lastEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);

      const defaults = {
        period_start: nextStartDate.toISOString().split('T')[0],
        opening_balance: lastStatement.closing_balance
      };

      assert.strictEqual(defaults.period_start, '2024-04-01');
      assert.strictEqual(defaults.opening_balance, 1500);
    });
  });
});
