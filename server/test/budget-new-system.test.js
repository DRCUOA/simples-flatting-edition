/**
 * Test suite for new budget_category_month system
 * Tests: uniqueness, revision tracking, actuals, reporting
 */

const chai = require('chai');
const expect = chai.expect;
const budgetDAO = require('../models/budget_category_month_dao');
const actualsService = require('../services/actuals-service');
const reportingService = require('../services/budget-reporting-service');
const { getConnection } = require('../db/index');

const TEST_USER_ID = 'test-user-budget-system';
const TEST_MONTH = '2025-10';
const TEST_CATEGORY_1 = 'test-cat-groceries';
const TEST_CATEGORY_2 = 'test-cat-rent';

describe('New Budget System - budget_category_month', function() {
  this.timeout(5000);
  
  const db = getConnection();
  
  // Setup: Create test user and categories
  before(async function() {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create test user
        db.run(
          `INSERT OR IGNORE INTO Users (user_id, username, email, password_hash)
           VALUES (?, ?, ?, ?)`,
          [TEST_USER_ID, 'test-budget-user', 'test@budget.com', 'hash'],
          (err) => {
            if (err) console.log('User might already exist:', err.message);
          }
        );
        
        // Create test categories
        db.run(
          `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
           VALUES (?, ?, ?)`,
          [TEST_CATEGORY_1, TEST_USER_ID, 'Test Groceries'],
          (err) => {
            if (err) console.log('Category 1 might already exist:', err.message);
          }
        );
        
        db.run(
          `INSERT OR IGNORE INTO Categories (category_id, user_id, category_name)
           VALUES (?, ?, ?)`,
          [TEST_CATEGORY_2, TEST_USER_ID, 'Test Rent'],
          (err) => {
            if (err) console.log('Category 2 might already exist:', err.message);
            resolve();
          }
        );
      });
    });
  });
  
  // Cleanup
  after(async function() {
    return new Promise((resolve) => {
      db.serialize(() => {
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM Categories WHERE user_id = ?', [TEST_USER_ID]);
        db.run('DELETE FROM Users WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
  });
  
  describe('Budget DAO - Revision Tracking', function() {
    beforeEach(async function() {
      // Clean budgets before each test
      return new Promise((resolve) => {
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
    
    it('should create a new budget with revision 1', async function() {
      const result = await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      
      expect(result).to.have.property('id');
      expect(result.revision).to.equal(1);
    });
    
    it('should increment revision on update', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      const result = await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 65000);
      
      expect(result.revision).to.equal(2);
    });
    
    it('should maintain only one active record per user+month+category', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 65000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 70000);
      
      const active = await budgetDAO.getActiveForMonth(TEST_USER_ID, TEST_MONTH);
      const groceryBudget = active.find(b => b.category_id === TEST_CATEGORY_1);
      
      expect(groceryBudget).to.exist;
      expect(groceryBudget.amount_cents).to.equal(70000);
      expect(groceryBudget.revision).to.equal(3);
      
      // Check that only one active record exists
      return new Promise((resolve) => {
        db.all(
          `SELECT COUNT(*) as count FROM budget_category_month 
           WHERE user_id = ? AND month = ? AND category_id = ? AND active_flag = 1`,
          [TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1],
          (err, rows) => {
            expect(rows[0].count).to.equal(1);
            resolve();
          }
        );
      });
    });
    
    it('should return revision history', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 65000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 70000);
      
      const history = await budgetDAO.getActiveBudgetHistory(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1);
      
      expect(history).to.have.length(3);
      expect(history[0].revision).to.equal(3); // Latest first
      expect(history[0].amount_cents).to.equal(70000);
      expect(history[0].active_flag).to.equal(1);
      expect(history[1].active_flag).to.equal(0); // Older revisions inactive
    });
  });
  
  describe('Budget DAO - Month Total', function() {
    beforeEach(async function() {
      return new Promise((resolve) => {
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
    
    it('should calculate month total as sum of category budgets', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_2, 180000);
      
      const total = await budgetDAO.getMonthTotal(TEST_USER_ID, TEST_MONTH);
      
      expect(total).to.equal(240000); // 60000 + 180000
    });
    
    it('should update month total when category budget changes', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_2, 180000);
      
      let total = await budgetDAO.getMonthTotal(TEST_USER_ID, TEST_MONTH);
      expect(total).to.equal(240000);
      
      // Update one category
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 70000);
      
      total = await budgetDAO.getMonthTotal(TEST_USER_ID, TEST_MONTH);
      expect(total).to.equal(250000); // 70000 + 180000
    });
  });
  
  describe('Budget DAO - Bulk Operations', function() {
    beforeEach(async function() {
      return new Promise((resolve) => {
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
    
    it('should bulk set budgets atomically', async function() {
      const budgets = [
        { category_id: TEST_CATEGORY_1, amount_cents: 60000 },
        { category_id: TEST_CATEGORY_2, amount_cents: 180000 }
      ];
      
      const results = await budgetDAO.bulkSetForMonth(TEST_USER_ID, TEST_MONTH, budgets);
      
      expect(results).to.have.length(2);
      expect(results[0].revision).to.equal(1);
      expect(results[1].revision).to.equal(1);
      
      const total = await budgetDAO.getMonthTotal(TEST_USER_ID, TEST_MONTH);
      expect(total).to.equal(240000);
    });
  });
  
  describe('Actuals Service', function() {
    it('should get user timezone', async function() {
      const timezone = await actualsService.getUserTimezone(TEST_USER_ID);
      expect(timezone).to.be.a('string');
      // Should be Pacific/Auckland from our migration
      expect(timezone).to.equal('Pacific/Auckland');
    });
    
    it('should calculate month boundaries', function() {
      const boundaries = actualsService.getMonthBoundaries('2025-10', 'Pacific/Auckland');
      expect(boundaries.start).to.equal('2025-10-01');
      expect(boundaries.end).to.equal('2025-11-01');
    });
  });
  
  describe('Budget Reporting Service', function() {
    beforeEach(async function() {
      return new Promise((resolve) => {
        db.run('DELETE FROM budget_category_month WHERE user_id = ?', [TEST_USER_ID], () => resolve());
      });
    });
    
    it('should generate month report with categories', async function() {
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_1, 60000);
      await budgetDAO.setAmount(TEST_USER_ID, TEST_MONTH, TEST_CATEGORY_2, 180000);
      
      const report = await reportingService.getMonthReport(TEST_USER_ID, TEST_MONTH);
      
      expect(report).to.have.property('month', TEST_MONTH);
      expect(report).to.have.property('budgeted_total_month', 240000);
      expect(report).to.have.property('categories');
      expect(report.categories).to.have.length.at.least(2);
      expect(report).to.have.property('flags');
      expect(report.flags).to.have.property('is_reconciled');
      expect(report.flags).to.have.property('has_pending');
    });
    
    it('should calculate variance correctly', function() {
      // For expenses (negative actual), variance = budget - |actual|
      let variance = reportingService.calculateVariance(60000, -55000);
      expect(variance).to.equal(5000); // 60000 - 55000
      
      // For income (positive actual), variance = actual - budget
      variance = reportingService.calculateVariance(50000, 60000);
      expect(variance).to.equal(10000); // 60000 - 50000
    });
  });
});

