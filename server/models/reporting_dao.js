// server/models/reporting_dao.js

const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * Reporting Data Access Object
 * Handles all reporting queries for analytics and charts
 */
const reportingDAO = {
  /**
   * Get monthly summary (income, expense, net) for a date range
   * @param {string} userId - User ID
   * @param {string} start - Start date (YYYY-MM-DD)
   * @param {string} end - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of monthly summaries
   */
  getMonthlySummary: (userId, start, end) => {
    return new Promise((resolve, reject) => {
      const sql = `
        WITH base AS (
          SELECT 
            transaction_date AS d,
            substr(transaction_date, 1, 7) AS ym,
            signed_amount
          FROM transactions t
          LEFT JOIN Categories c ON t.category_id = c.category_id
          WHERE t.user_id = ?
            AND transaction_date >= ? 
            AND transaction_date <= ?
            AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
        ),
        monthly AS (
          SELECT 
            ym,
            SUM(CASE WHEN signed_amount >= 0 THEN signed_amount ELSE 0 END) AS income,
            SUM(CASE WHEN signed_amount < 0 THEN ABS(signed_amount) ELSE 0 END) AS expense,
            SUM(signed_amount) AS net
          FROM base
          GROUP BY ym
          ORDER BY ym
        )
        SELECT ym as month, COALESCE(income,0) as income, COALESCE(expense,0) as expense, COALESCE(net,0) as net
        FROM monthly
      `;
      
      db.all(sql, [userId, start, end], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get all categories with their root hierarchy
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of categories with root info
   */
  getAllCategoriesWithRoots: (userId) => {
    return new Promise((resolve, reject) => {
      const categorySql = `
        WITH RECURSIVE CategoryRoots AS (
          -- Find ultimate root parent for each category
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
        SELECT 
          cr.category_id,
          cr.category_name,
          cr.parent_category_id,
          cr.root_id,
          cr.root_name,
          cr.level,
          CASE 
            WHEN LOWER(cr.root_name) LIKE '%transfer%' THEN 1
            ELSE 0
          END as is_transfer
        FROM CategoryRoots cr
      `;
      
      db.all(categorySql, [userId, userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get transaction actuals (income/expense) by category and month
   * @param {string} userId - User ID
   * @param {string} start - Start date (YYYY-MM-DD)
   * @param {string} end - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of actuals by category and month
   */
  getTransactionActuals: (userId, start, end) => {
    return new Promise((resolve, reject) => {
      const actualsSql = `
        SELECT 
          t.category_id,
          strftime('%Y-%m', t.transaction_date) as month,
          SUM(CASE WHEN t.signed_amount >= 0 THEN t.signed_amount ELSE 0 END) AS income,
          SUM(CASE WHEN t.signed_amount < 0 THEN ABS(t.signed_amount) ELSE 0 END) AS expense
        FROM transactions t
        LEFT JOIN Categories c ON t.category_id = c.category_id
        WHERE t.user_id = ?
          AND DATE(t.transaction_date) >= DATE(?)
          AND DATE(t.transaction_date) <= DATE(?)
          AND (c.category_name IS NULL OR c.category_name != 'Internal-Transfers')
          AND t.category_id IS NOT NULL
        GROUP BY t.category_id, month
      `;
      
      db.all(actualsSql, [userId, start, end], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get account balances as of a specific date
   * @param {string} asOf - Date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of account balances
   */
  getAccountBalancesAsOf: (asOf) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.account_id, a.account_name,
          (
            a.current_balance - COALESCE((
              SELECT SUM(signed_amount) FROM transactions t
              WHERE t.account_id = a.account_id AND t.transaction_date > ?
            ), 0)
          ) AS balance_as_of
        FROM Accounts a
        ORDER BY a.account_name
      `;
      
      db.all(sql, [asOf], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get all accounts for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of accounts
   */
  getAccountsByUser: (userId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          account_id,
          account_name,
          account_class,
          opening_balance,
          current_balance
        FROM Accounts a
        WHERE a.user_id = ?
      `;
      
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get transactions for accounts in a date range
   * @param {string} userId - User ID
   * @param {Array<string>} accountIds - Array of account IDs
   * @param {string} startDate - Optional start date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of transactions
   */
  getTransactionsForAccounts: (userId, accountIds, startDate = null) => {
    return new Promise((resolve, reject) => {
      if (accountIds.length === 0) {
        return resolve([]);
      }
      
      let transactionsSQL = `
        SELECT 
          transaction_date as date,
          account_id,
          signed_amount
        FROM Transactions
        WHERE user_id = ? AND account_id IN (${accountIds.map(() => '?').join(',')})
      `;
      const params = [userId, ...accountIds];

      if (startDate) {
        transactionsSQL += ` AND transaction_date >= ?`;
        params.push(startDate);
      }

      transactionsSQL += ` ORDER BY transaction_date ASC, transaction_id ASC`;

      db.all(transactionsSQL, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get starting balances for accounts before a specific date
   * @param {string} userId - User ID
   * @param {Array<string>} accountIds - Array of account IDs
   * @param {string} beforeDate - Date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of account balances
   */
  getStartingBalances: (userId, accountIds, beforeDate) => {
    return new Promise((resolve, reject) => {
      if (accountIds.length === 0) {
        return resolve([]);
      }
      
      const sql = `
        SELECT 
          account_id,
          SUM(signed_amount) as total
        FROM Transactions
        WHERE user_id = ? 
          AND account_id IN (${accountIds.map(() => '?').join(',')})
          AND transaction_date < ?
        GROUP BY account_id
      `;
      
      const params = [userId, ...accountIds, beforeDate];
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Get all transactions sum for accounts (for verification)
   * @param {string} userId - User ID
   * @param {Array<string>} accountIds - Array of account IDs
   * @returns {Promise<Array>} - Array of account transaction sums
   */
  getAllTransactionsSum: (userId, accountIds) => {
    return new Promise((resolve, reject) => {
      if (accountIds.length === 0) {
        return resolve([]);
      }
      
      const sql = `
        SELECT 
          account_id,
          SUM(signed_amount) as total
        FROM Transactions
        WHERE user_id = ? 
          AND account_id IN (${accountIds.map(() => '?').join(',')})
        GROUP BY account_id
      `;
      
      const params = [userId, ...accountIds];
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
};

module.exports = reportingDAO;





