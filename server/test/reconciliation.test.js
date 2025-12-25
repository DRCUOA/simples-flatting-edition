const request = require('supertest');
const app = require('../app');
const { getConnection } = require('../db/index');
const reconciliationService = require('../services/reconciliationService');

describe('Reconciliation Service and API', () => {
  let db;
  let testAccountId;
  let testStatementId;
  let testTransactionId;

  beforeAll(async () => {
    db = getConnection();
    
    // Create test account
    testAccountId = 'test-account-' + Date.now();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Accounts (account_id, user_id, account_name, account_type, current_balance) VALUES (?, ?, ?, ?, ?)',
        [testAccountId, 'test-user', 'Test Account', 'checking', 1000],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test transaction
    testTransactionId = 'test-transaction-' + Date.now();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testTransactionId, testAccountId, 'test-user', '2025-01-01', 'Test Transaction', 100, 100],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Create test statement
    testStatementId = 'test-statement-' + Date.now();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO Statements (statement_id, account_id, user_id, period_start, period_end, opening_balance, closing_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testStatementId, testAccountId, 'test-user', '2025-01-01', '2025-01-31', 900, 1000],
        (err) => err ? reject(err) : resolve()
      );
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await new Promise((resolve) => {
      db.run('DELETE FROM Transactions WHERE transaction_id = ?', [testTransactionId], () => {
        db.run('DELETE FROM Statements WHERE statement_id = ?', [testStatementId], () => {
          db.run('DELETE FROM Accounts WHERE account_id = ?', [testAccountId], () => {
            resolve();
          });
        });
      });
    });
  });

  describe('Reconciliation Service', () => {
    test('should check if statement is not locked initially', (done) => {
      reconciliationService.isStatementLocked(testStatementId, (err, isLocked) => {
        expect(err).toBeNull();
        expect(isLocked).toBe(false);
        done();
      });
    });

    test('should check if transaction is not reconciled initially', (done) => {
      reconciliationService.isTransactionReconciled(testTransactionId, (err, reconciliationInfo) => {
        expect(err).toBeNull();
        expect(reconciliationInfo.isReconciled).toBe(false);
        expect(reconciliationInfo.statementId).toBeNull();
        done();
      });
    });

    test('should get reconciliation status', (done) => {
      reconciliationService.getReconciliationStatus(testStatementId, (err, status) => {
        expect(err).toBeNull();
        expect(status).toHaveProperty('total_transactions');
        expect(status).toHaveProperty('reconciled_transactions');
        expect(status).toHaveProperty('is_fully_reconciled');
        done();
      });
    });

    test('should not reconcile statement when transactions are unreconciled', (done) => {
      reconciliationService.reconcileStatement(testStatementId, (err, result) => {
        expect(err).not.toBeNull();
        expect(err.message).toContain('transactions remain unreconciled');
        done();
      });
    });

    test('should reconcile statement after all transactions are reconciled', (done) => {
      // First reconcile the transaction
      db.run(
        'UPDATE Transactions SET is_reconciled = 1, statement_id = ? WHERE transaction_id = ?',
        [testStatementId, testTransactionId],
        (err) => {
          expect(err).toBeNull();
          
          // Now reconcile the statement
          reconciliationService.reconcileStatement(testStatementId, (err, result) => {
            expect(err).toBeNull();
            expect(result.isLocked).toBe(true);
            expect(result.statementId).toBe(testStatementId);
            done();
          });
        }
      );
    });

    test('should not allow reconciling already locked statement', (done) => {
      reconciliationService.reconcileStatement(testStatementId, (err, result) => {
        expect(err).not.toBeNull();
        expect(err.message).toContain('already reconciled and locked');
        done();
      });
    });

    test('should check if statement is locked after reconciliation', (done) => {
      reconciliationService.isStatementLocked(testStatementId, (err, isLocked) => {
        expect(err).toBeNull();
        expect(isLocked).toBe(true);
        done();
      });
    });

    test('should delete statement and unreconcile transactions', (done) => {
      reconciliationService.deleteStatementAndUnreconcile(testStatementId, (err, result) => {
        expect(err).toBeNull();
        expect(result.deleted).toBe(true);
        expect(result.unreconciledCount).toBeGreaterThanOrEqual(0);
        
        // Verify transaction is unreconciled
        reconciliationService.isTransactionReconciled(testTransactionId, (err, reconciliationInfo) => {
          expect(err).toBeNull();
          expect(reconciliationInfo.isReconciled).toBe(false);
          expect(reconciliationInfo.statementId).toBeNull();
          done();
        });
      });
    });
  });

  describe('Statement Controller Guards', () => {
    let lockedStatementId;

    beforeEach(async () => {
      // Create a new statement for each test
      lockedStatementId = 'test-locked-statement-' + Date.now();
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO Statements (statement_id, account_id, user_id, period_start, period_end, opening_balance, closing_balance, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [lockedStatementId, testAccountId, 'test-user', '2025-02-01', '2025-02-28', 1000, 1100, 1],
          (err) => err ? reject(err) : resolve()
        );
      });
    });

    afterEach(async () => {
      // Clean up test statement
      await new Promise((resolve) => {
        db.run('DELETE FROM Statements WHERE statement_id = ?', [lockedStatementId], () => resolve());
      });
    });

    test('should prevent updating locked statement metadata', async () => {
      const response = await request(app)
        .put(`/api/statements/${lockedStatementId}`)
        .send({
          opening_balance: 1500
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Statement is locked');
    });

    test('should allow deleting locked statement', async () => {
      const response = await request(app)
        .delete(`/api/statements/${lockedStatementId}`);

      expect(response.status).toBe(200);
      expect(response.body.deleted).toBe(true);
    });
  });

  describe('Transaction Controller Guards', () => {
    let reconciledTransactionId;
    let testLockedStatementId;

    beforeEach(async () => {
      // Create a locked statement and reconciled transaction
      testLockedStatementId = 'test-locked-statement-' + Date.now();
      reconciledTransactionId = 'test-reconciled-transaction-' + Date.now();

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO Statements (statement_id, account_id, user_id, period_start, period_end, opening_balance, closing_balance, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [testLockedStatementId, testAccountId, 'test-user', '2025-03-01', '2025-03-31', 1000, 1100, 1],
          (err) => {
            if (err) return reject(err);
            
            db.run(
              'INSERT INTO Transactions (transaction_id, account_id, user_id, transaction_date, description, amount, signed_amount, is_reconciled, statement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [reconciledTransactionId, testAccountId, 'test-user', '2025-03-15', 'Test Reconciled Transaction', 100, 100, 1, testLockedStatementId],
              (err) => err ? reject(err) : resolve()
            );
          }
        );
      });
    });

    afterEach(async () => {
      // Clean up test data
      await new Promise((resolve) => {
        db.run('DELETE FROM Transactions WHERE transaction_id = ?', [reconciledTransactionId], () => {
          db.run('DELETE FROM Statements WHERE statement_id = ?', [testLockedStatementId], () => resolve());
        });
      });
    });

    test('should prevent updating reconciled transaction', async () => {
      const response = await request(app)
        .put(`/api/transactions/${reconciledTransactionId}`)
        .send({
          description: 'Updated description'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Transaction is reconciled and cannot be edited');
    });
  });

  describe('Integration Tests', () => {
    test('full reconciliation flow', async () => {
      // Create statement
      const createResponse = await request(app)
        .post('/api/statements')
        .send({
          account_id: testAccountId,
          period_start: '2025-04-01',
          period_end: '2025-04-30',
          opening_balance: 1000,
          closing_balance: 1200
        });

      expect(createResponse.status).toBe(201);
      const newStatementId = createResponse.body.statement_id;

      // Create transaction for the period
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .send({
          account_id: testAccountId,
          transaction_date: '2025-04-15',
          description: 'Integration test transaction',
          amount: 200,
          transaction_type: 'C'
        });

      expect(transactionResponse.status).toBe(201);
      const newTransactionId = transactionResponse.body.id;

      // Mark transaction as reconciled
      const reconcileResponse = await request(app)
        .put(`/api/statements/transactions/${newTransactionId}/reconcile`)
        .send({
          statement_id: newStatementId,
          is_reconciled: true
        });

      expect(reconcileResponse.status).toBe(200);

      // Finalize statement reconciliation
      const finalizeResponse = await request(app)
        .post(`/api/statements/${newStatementId}/reconcile`);

      expect(finalizeResponse.status).toBe(200);
      expect(finalizeResponse.body.isLocked).toBe(true);

      // Try to edit locked statement (should fail)
      const editResponse = await request(app)
        .put(`/api/statements/${newStatementId}`)
        .send({
          opening_balance: 1500
        });

      expect(editResponse.status).toBe(409);

      // Delete statement (should succeed and unreconcile transactions)
      const deleteResponse = await request(app)
        .delete(`/api/statements/${newStatementId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.deleted).toBe(true);

      // Clean up transaction
      await request(app).delete(`/api/transactions/${newTransactionId}`);
    });
  });
});
