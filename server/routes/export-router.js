// server/routes/export-router.js

const express = require('express');
const router = express.Router();
const { Transform } = require('stream');
const { requireUser } = require('../middleware/auth');
const { exportLimiter } = require('../middleware/security');
const { securityLogger } = require('../middleware/logging');
const { getConnection } = require('../db/index');

const db = getConnection();

/**
 * CSV Transform stream for converting objects to CSV format
 */
class CSVTransform extends Transform {
  constructor(headers) {
    super({ objectMode: true });
    this.headers = headers;
    this.headerWritten = false;
  }

  _transform(chunk, encoding, callback) {
    if (!this.headerWritten) {
      this.push(this.headers.join(',') + '\n');
      this.headerWritten = true;
    }
    
    const values = this.headers.map(header => {
      const value = chunk[header] || '';
      // Escape CSV values that contain commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    
    this.push(values.join(',') + '\n');
    callback();
  }
}

/**
 * Validate export request parameters
 */
const validateExportRequest = (req, res, next) => {
  const { format, table } = req.query;
  
  // Validate format
  const allowedFormats = ['csv', 'json'];
  if (format && !allowedFormats.includes(format.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid format. Supported formats: csv, json',
      code: 'INVALID_FORMAT'
    });
  }
  
  // Validate table
  const allowedTables = ['accounts', 'transactions', 'categories', 'budgets', 'statements', 'all'];
  if (table && !allowedTables.includes(table.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid table. Supported tables: accounts, transactions, categories, budgets, statements, all',
      code: 'INVALID_TABLE'
    });
  }
  
  next();
};

/**
 * Execute user-scoped query with streaming
 */
const executeUserQuery = (sql, params, userId) => {
  return new Promise((resolve, reject) => {
    // Ensure userId is always included in parameters
    const userParams = [...params, userId];
    const userScopedSql = sql + (sql.includes('WHERE') ? ' AND user_id = ?' : ' WHERE user_id = ?');
    
    db.all(userScopedSql, userParams, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Get accounts data for user
 */
const getAccountsData = async (userId) => {
  const sql = `
    SELECT 
      account_id,
      account_name,
      account_type,
      current_balance,
      positive_is_credit,
      last_balance_update,
      created_at
    FROM Accounts
    ORDER BY account_name
  `;
  return executeUserQuery(sql, [], userId);
};

/**
 * Get transactions data for user
 */
const getTransactionsData = async (userId, startDate, endDate) => {
  let sql = `
    SELECT 
      t.transaction_id,
      t.transaction_date,
      t.description,
      t.amount,
      t.signed_amount,
      t.transaction_type,
      a.account_name,
      c.category_name,
      t.is_reconciled,
      t.created_at
    FROM Transactions t
    LEFT JOIN Accounts a ON t.account_id = a.account_id
    LEFT JOIN Categories c ON t.category_id = c.category_id
  `;
  
  const params = [];
  
  if (startDate) {
    sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' t.transaction_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' t.transaction_date <= ?';
    params.push(endDate);
  }
  
  sql += ' ORDER BY t.transaction_date DESC';
  
  return executeUserQuery(sql, params, userId);
};

/**
 * Get categories data for user
 */
const getCategoriesData = async (userId) => {
  const sql = `
    SELECT 
      c1.category_id,
      c1.category_name,
      c2.category_name as parent_category_name,
      c1.budgeted_amount,
      c1.created_at
    FROM Categories c1
    LEFT JOIN Categories c2 ON c1.parent_category_id = c2.category_id
    ORDER BY c1.category_name
  `;
  return executeUserQuery(sql, [], userId);
};

/**
 * Get budgets data for user
 */
const getBudgetsData = async (userId) => {
  const sql = `
    SELECT 
      b.budget_id,
      c.category_name,
      b.period_start,
      b.period_end,
      b.budgeted_amount
    FROM Budgets b
    LEFT JOIN Categories c ON b.category_id = c.category_id
    ORDER BY b.period_start DESC
  `;
  return executeUserQuery(sql, [], userId);
};

/**
 * Get statements data for user
 */
const getStatementsData = async (userId) => {
  const sql = `
    SELECT 
      s.statement_id,
      a.account_name,
      s.period_start,
      s.period_end,
      s.opening_balance,
      s.closing_balance,
      s.created_at
    FROM Statements s
    LEFT JOIN Accounts a ON s.account_id = a.account_id
    ORDER BY s.period_start DESC
  `;
  return executeUserQuery(sql, [], userId);
};

/**
 * GET /export
 * Export user data in CSV or JSON format
 */
router.get('/',
  exportLimiter,
  requireUser,
  validateExportRequest,
  async (req, res) => {
    try {
      const userId = req.user.user_id;
      const format = (req.query.format || 'csv').toLowerCase();
      const table = (req.query.table || 'all').toLowerCase();
      const { startDate, endDate } = req.query;
      
      securityLogger('EXPORT_REQUEST', {
        userId,
        format,
        table,
        startDate,
        endDate
      }, req);

      // Set appropriate headers
      const { getToday } = require('../utils/dateUtils');
      const timestamp = getToday();
      const filename = `${table}-export-${timestamp}.${format}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      } else {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      let exportData = {};

      // Collect data based on requested table(s)
      if (table === 'all' || table === 'accounts') {
        exportData.accounts = await getAccountsData(userId);
      }
      
      if (table === 'all' || table === 'transactions') {
        exportData.transactions = await getTransactionsData(userId, startDate, endDate);
      }
      
      if (table === 'all' || table === 'categories') {
        exportData.categories = await getCategoriesData(userId);
      }
      
      if (table === 'all' || table === 'budgets') {
        exportData.budgets = await getBudgetsData(userId);
      }
      
      if (table === 'all' || table === 'statements') {
        exportData.statements = await getStatementsData(userId);
      }

      if (format === 'json') {
        // JSON export
        const jsonResponse = {
          exportDate: require('../utils/dateUtils').getCurrentTimestamp(),
          userId: userId,
          dataRange: startDate && endDate ? { startDate, endDate } : null,
          data: table === 'all' ? exportData : exportData[table] || []
        };
        
        res.json(jsonResponse);
      } else {
        // CSV export
        if (table === 'all') {
          // For 'all', export transactions by default (most commonly requested)
          const data = exportData.transactions || [];
          if (data.length === 0) {
            return res.status(404).json({
              error: 'No data found for export',
              code: 'NO_DATA_FOUND'
            });
          }
          
          const headers = Object.keys(data[0]);
          const csvTransform = new CSVTransform(headers);
          
          res.write('\uFEFF'); // UTF-8 BOM for Excel compatibility
          
          for (const row of data) {
            csvTransform.write(row);
          }
          csvTransform.end();
          
          csvTransform.pipe(res, { end: true });
        } else {
          // Single table export
          const data = exportData[table] || [];
          if (data.length === 0) {
            return res.status(404).json({
              error: `No ${table} data found for export`,
              code: 'NO_DATA_FOUND'
            });
          }
          
          const headers = Object.keys(data[0]);
          const csvTransform = new CSVTransform(headers);
          
          res.write('\uFEFF'); // UTF-8 BOM for Excel compatibility
          
          for (const row of data) {
            csvTransform.write(row);
          }
          csvTransform.end();
          
          csvTransform.pipe(res, { end: true });
        }
      }

      securityLogger('EXPORT_SUCCESS', {
        userId,
        format,
        table,
        recordCount: Object.values(exportData).reduce((total, data) => total + (Array.isArray(data) ? data.length : 0), 0)
      }, req);

    } catch (error) {
      securityLogger('EXPORT_ERROR', {
        userId: req.user?.user_id,
        error: error.message
      }, req);
      
      console.error('Export error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Export failed',
          code: 'EXPORT_ERROR',
          correlationId: req.requestId
        });
      }
    }
  }
);

/**
 * GET /export/summary
 * Get export data summary (counts) for user
 */
router.get('/summary',
  requireUser,
  async (req, res) => {
    try {
      const userId = req.user.user_id;
      
      const summary = await Promise.all([
        executeUserQuery('SELECT COUNT(*) as count FROM Accounts', [], userId),
        executeUserQuery('SELECT COUNT(*) as count FROM Transactions', [], userId), 
        executeUserQuery('SELECT COUNT(*) as count FROM Categories', [], userId),
        executeUserQuery('SELECT COUNT(*) as count FROM Budgets', [], userId),
        executeUserQuery('SELECT COUNT(*) as count FROM Statements', [], userId)
      ]);

      res.json({
        success: true,
        summary: {
          accounts: summary[0][0].count,
          transactions: summary[1][0].count,
          categories: summary[2][0].count,
          budgets: summary[3][0].count,
          statements: summary[4][0].count
        }
      });
    } catch (error) {
      console.error('Export summary error:', error);
      res.status(500).json({
        error: 'Failed to get export summary',
        code: 'EXPORT_SUMMARY_ERROR'
      });
    }
  }
);

module.exports = router;
