const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const keywordCategoryMapDAO = {
  // Find matching category for a description
  findMatchingCategory: async (description) => {
    return new Promise((resolve, reject) => {
      // Search for the longest matching keyphrase in the description
      const query = `
      SELECT 
        c.category_id,
        c.category_name
      FROM 
        keyword_category_map AS kcm
      JOIN 
        categories AS c
      ON 
        kcm.budget_category = c.category_name
      WHERE 
        ? LIKE '%' || kcm.keyphrase || '%'
      ORDER BY 
        LENGTH(kcm.keyphrase) DESC
      LIMIT 
        1;`;
        
        db.get(query, [description], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    },

  // Get all keyphrase mappings
  getAllMappings: async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT keyphrase, budget_category
        FROM keyword_category_map
        ORDER BY LENGTH(keyphrase) DESC
      `;
      
      db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

module.exports = keywordCategoryMapDAO; 