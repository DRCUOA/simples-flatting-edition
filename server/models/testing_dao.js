// In testing_dao.js
const { getConnection } = require('../db/index');
const db = getConnection();

const testingDao = {
  test: (req, res) => {
    const sql = `
      SELECT 
        t.*, 
        a.account_name,
        a.account_type,
        c.category_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.account_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      LIMIT 5
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ 
          error: 'Database query failed',
          details: err.message 
        });
      }
      
      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    });
  }
};

module.exports = testingDao;