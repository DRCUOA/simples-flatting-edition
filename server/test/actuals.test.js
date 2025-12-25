// server/test/actuals.test.js
// Tests for DB-truth actuals with signing parity and cross-view equality

const request = require('supertest');
const app = require('../app');
const { getConnection } = require('../db/index');
const calculateSignedAmount = require('../utils/calculateSignedAmount');

const db = getConnection();

describe('Actuals API Tests', () => {
  let testUserId;
  let testAccountId;
  let testCategoryId;
  let testBudgetId;
  let testStatementId;

  beforeAll(async () => {
    // Create test data
    testUserId = 'test-user-' + Date.now();
    testAccountId = 'test-account-' + Date.now();
    testCategoryId = 'test-category-' + Date.now();
    testBudgetId = 'test-budget-' + Date.now();
    testStatementId = 'test-statement-' + Date.now();

    // Create test user
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Users (user_id, username, email, password_hash) VALUES (?, ?, ?, ?)',
        [testUserId, 'testuser', 'test@example.com', 'hash'],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test account
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Accounts (account_id, user_id, account_name, account_type, current_balance, positive_is_credit) VALUES (?, ?, ?, ?, ?, ?)',
        [testAccountId, testUserId, 'Test Account', 'checking', 1000.00, 1],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test category
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Categories (category_id, user_id, category_name) VALUES (?, ?, ?)',
        [testCategoryId, testUserId, 'Test Category'],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test budget
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Budgets (budget_id, user_id, category_id, period_start, period_end, budgeted_amount) VALUES (?, ?, ?, ?, ?, ?)',
        [testBudgetId, testUserId, testCategoryId, '2025-01-01', '2025-01-31', 500.00],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test statement
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Statements (statement_id, user_id, account_id, period_start, period_end, opening_balance, closing_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testStatementId, testUserId, testAccountId, '2025-01-01', '2025-01-31', 1000.00, 950.00],
        (err) => err ? reject(err) : resolve()
      );
    });
  });

  afterAll(async () => {
    // Clean up test data
    await new Promise((resolve) => {
      db.serialize(() => {
        db.run('DELETE FROM Transactions WHERE user_id = ?', [testUserId]);
        db.run('DELETE FROM Statements WHERE user_id = ?', [testUserId]);
        db.run('DELETE FROM Budgets WHERE user_id = ?', [testUserId]);
        db.run('DELETE FROM Categories WHERE user_id = ?', [testUserId]);
        db.run('DELETE FROM Accounts WHERE user_id = ?', [testUserId]);
        db.run('DELETE FROM Users WHERE user_id = ?', [testUserId], resolve);
      });
    });
  });

  describe('Signing Parity Tests', () => {
    const testCases = [
      // positive_is_credit = 1 (normal bank account)
      { positive_is_credit: 1, transaction_type: 'C', amount: 100, expected: 100 },
      { positive_is_credit: 1, transaction_type: 'CREDIT', amount: 100, expected: 100 },
      { positive_is_credit: 1, transaction_type: 'D', amount: 100, expected: -100 },
      { positive_is_credit: 1, transaction_type: 'DEBIT', amount: 100, expected: -100 },
      { positive_is_credit: 1, transaction_type: '', amount: 100, expected: 100 },
      { positive_is_credit: 1, transaction_type: '', amount: -100, expected: -100 },
      
      // positive_is_credit = 0 (credit card account)
      { positive_is_credit: 0, transaction_type: 'C', amount: 100, expected: 100 },
      { positive_is_credit: 0, transaction_type: 'CREDIT', amount: 100, expected: 100 },
      { positive_is_credit: 0, transaction_type: 'D', amount: 100, expected: -100 },
      { positive_is_credit: 0, transaction_type: 'DEBIT', amount: 100, expected: -100 },
      { positive_is_credit: 0, transaction_type: '', amount: 100, expected: -100 },
      { positive_is_credit: 0, transaction_type: '', amount: -100, expected: 100 },
    ];

    testCases.forEach(({ positive_is_credit, transaction_type, amount, expected }, index) => {
      test(`Signing parity case ${index + 1}: positive_is_credit=${positive_is_credit}, type=${transaction_type || 'empty'}, amount=${amount}`, async () => {
        // Test JS signing
        const account = { positive_is_credit };
        const transaction = { amount, transaction_type };
        const jsResult = calculateSignedAmount(account, transaction);
        
        expect(jsResult).toBe(expected);
        
        // Create transaction and test SQL signing via view
        const transactionId = 'test-txn-' + Date.now() + '-' + index;
        
        // Create account with specific positive_is_credit setting
        const tempAccountId = 'temp-account-' + Date.now() + '-' + index;
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Accounts (account_id, user_id, account_name, account_type, current_balance, positive_is_credit) VALUES (?, ?, ?, ?, ?, ?)',
            [tempAccountId, testUserId, 'Temp Account', 'checking', 0, positive_is_credit],
            (err) => err ? reject(err) : resolve()
          );
        });
        
        // Insert transaction
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Transactions (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [transactionId, testUserId, tempAccountId, testCategoryId, '2025-01-15', 'Test Transaction', amount, transaction_type],
            (err) => err ? reject(err) : resolve()
          );
        });
        
        // Query SQL signing result from view
        const sqlResult = await new Promise((resolve, reject) => {
          db.get(
            'SELECT canonical_amount FROM v_amounts_normalized WHERE transaction_id = ?',
            [transactionId],
            (err, row) => err ? reject(err) : resolve(row?.canonical_amount)
          );
        });
        
        expect(sqlResult).toBe(expected);
        expect(jsResult).toBe(sqlResult); // JS and SQL must match
        
        // Clean up
        await new Promise((resolve) => {
          db.serialize(() => {
            db.run('DELETE FROM Transactions WHERE transaction_id = ?', [transactionId]);
            db.run('DELETE FROM Accounts WHERE account_id = ?', [tempAccountId], resolve);
          });
        });
      });
    });
  });

  describe('API Endpoint Tests', () => {
    beforeEach(async () => {
      // Create test transactions
      const transactions = [
        { id: 'txn-1', date: '2025-01-10', amount: 100, type: 'C', description: 'Credit 1' },
        { id: 'txn-2', date: '2025-01-15', amount: 30, type: 'D', description: 'Debit 1' },
        { id: 'txn-3', date: '2025-01-20', amount: 20, type: 'D', description: 'Debit 2' }
      ];

      for (const txn of transactions) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Transactions (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [txn.id, testUserId, testAccountId, testCategoryId, txn.date, txn.description, txn.amount, txn.type],
            (err) => err ? reject(err) : resolve()
          );
        });
      }
    });

    afterEach(async () => {
      // Clean up test transactions
      await new Promise((resolve) => {
        db.run('DELETE FROM Transactions WHERE user_id = ? AND transaction_id LIKE ?', [testUserId, 'txn-%'], resolve);
      });
    });

    test('Account actuals - legacy mode', async () => {
      const response = await request(app)
        .get('/api/actuals/accounts')
        .query({ mode: 'legacy' })
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('legacy');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Account actuals - strict mode', async () => {
      const response = await request(app)
        .get('/api/actuals/accounts')
        .query({ mode: 'strict' })
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('strict');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Category actuals', async () => {
      const response = await request(app)
        .get('/api/actuals/categories')
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Budget actuals', async () => {
      const response = await request(app)
        .get('/api/actuals/budgets')
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Statement actuals', async () => {
      const response = await request(app)
        .get('/api/actuals/statements')
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Feature flags endpoint', async () => {
      const response = await request(app)
        .get('/api/actuals/feature-flags');

      expect(response.status).toBe(200);
      expect(typeof response.body.strictActuals).toBe('boolean');
    });
  });

  describe('Cross-View Equality Tests', () => {
    test('Account and category totals should be consistent', async () => {
      // Insert test data: +100, -30, -20 => net +50
      const testData = [
        { id: 'eq-1', amount: 100, type: 'C' },
        { id: 'eq-2', amount: 30, type: 'D' },
        { id: 'eq-3', amount: 20, type: 'D' }
      ];

      for (const txn of testData) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO Transactions (transaction_id, user_id, account_id, category_id, transaction_date, description, amount, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [txn.id, testUserId, testAccountId, testCategoryId, '2025-01-15', 'Test', txn.amount, txn.type],
            (err) => err ? reject(err) : resolve()
          );
        });
      }

      // Get account actuals (strict mode)
      const accountResponse = await request(app)
        .get('/api/actuals/accounts')
        .query({ mode: 'strict' })
        .set('x-user-id', testUserId);

      // Get category actuals
      const categoryResponse = await request(app)
        .get('/api/actuals/categories')
        .set('x-user-id', testUserId);

      expect(accountResponse.status).toBe(200);
      expect(categoryResponse.status).toBe(200);

      const accountActual = accountResponse.body.data.find(a => a.account_id === testAccountId);
      const categoryActual = categoryResponse.body.data.find(c => c.category_id === testCategoryId);

      expect(accountActual).toBeDefined();
      expect(categoryActual).toBeDefined();

      // Expected: +100 (credit) - 30 (debit) - 20 (debit) = +50
      expect(accountActual.balance_sum).toBe(50);
      expect(categoryActual.net_amount).toBe(50);

      // Account and category totals should match
      expect(accountActual.balance_sum).toBe(categoryActual.net_amount);

      // Clean up
      await new Promise((resolve) => {
        db.run('DELETE FROM Transactions WHERE user_id = ? AND transaction_id LIKE ?', [testUserId, 'eq-%'], resolve);
      });
    });
  });

  describe('Performance Tests', () => {
    test('Actuals endpoints should respond within 150ms', async () => {
      const endpoints = [
        '/api/actuals/accounts',
        '/api/actuals/categories',
        '/api/actuals/budgets',
        '/api/actuals/statements'
      ];

      for (const endpoint of endpoints) {
        const start = Date.now();
        
        const response = await request(app)
          .get(endpoint)
          .set('x-user-id', testUserId);

        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(150); // p50 < 150ms requirement
      }
    });
  });
});

