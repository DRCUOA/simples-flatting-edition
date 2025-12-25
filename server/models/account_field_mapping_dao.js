const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');

const db = getConnection();

// Helper function to promisify database operations
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Account Field Mapping DAO with CRUD operations
const accountFieldMappingDAO = {
  // Get all mappings for an account (user-scoped)
  getMappingsByAccountId: (accountId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      callback = userId;
      const sql = 'SELECT * FROM account_field_mappings WHERE account_id = ?';
      db.all(sql, [accountId], (err, rows) => {
        if (err) {
          callback(err);
        } else {
          callback(null, rows || []);
        }
      });
      return;
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'SELECT * FROM account_field_mappings WHERE account_id = ? AND user_id = ?';
    db.all(sql, [accountId, userId], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows || []);
      }
    });
  },

  // Get a specific mapping by ID (user-scoped)
  getMappingById: (mappingId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      callback = userId;
      const sql = 'SELECT * FROM account_field_mappings WHERE mapping_id = ?';
      db.get(sql, [mappingId], (err, row) => {
        if (err) {
          callback(err);
        } else {
          callback(null, row);
        }
      });
      return;
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'SELECT * FROM account_field_mappings WHERE mapping_id = ? AND user_id = ?';
    db.get(sql, [mappingId, userId], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  // Create a new mapping (user-scoped)
  createMapping: (mapping, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for mapping creation'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const mappingId = mapping.mapping_id || uuidv4();
    const sql = `
      INSERT INTO account_field_mappings (
        mapping_id, account_id, user_id, field_name, csv_header
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
      mappingId,
      mapping.account_id,
      userId,
      mapping.field_name,
      mapping.csv_header
    ], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { mapping_id: mappingId });
      }
    });
  },

  // Update an existing mapping (user-scoped)
  updateMapping: (mappingId, mapping, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for mapping update'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = `
      UPDATE account_field_mappings 
      SET csv_header = ?, updated_at = CURRENT_TIMESTAMP
      WHERE mapping_id = ? AND user_id = ?
    `;
    
    db.run(sql, [
      mapping.csv_header,
      mappingId,
      userId
    ], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  },

  // Delete a mapping (user-scoped)
  deleteMapping: (mappingId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for mapping deletion'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'DELETE FROM account_field_mappings WHERE mapping_id = ? AND user_id = ?';
    db.run(sql, [mappingId, userId], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  },

  // Delete all mappings for an account (user-scoped)
  deleteMappingsByAccountId: (accountId, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for mapping deletion'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    const sql = 'DELETE FROM account_field_mappings WHERE account_id = ? AND user_id = ?';
    db.run(sql, [accountId, userId], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  },

  // Save multiple mappings for an account (user-scoped)
  saveMappings: (accountId, mappings, userId, callback) => {
    // Handle case where userId is actually the callback (backward compatibility)
    if (typeof userId === 'function') {
      return userId(new Error('User ID is required for mapping save'));
    }
    
    if (!userId) {
      return callback(new Error('User ID is required'));
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // First, delete existing mappings for this account and user
      db.run('DELETE FROM account_field_mappings WHERE account_id = ? AND user_id = ?', [accountId, userId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return callback(err);
        }
        
        // Then insert all new mappings
        const stmt = db.prepare(`
          INSERT INTO account_field_mappings (
            mapping_id, account_id, user_id, field_name, csv_header
          ) VALUES (?, ?, ?, ?, ?)
        `);
        
        let error = null;
        mappings.forEach(mapping => {
          if (error) return;
          
          stmt.run(
            uuidv4(),
            accountId,
            userId,
            mapping.field_name,
            mapping.csv_header,
            (err) => {
              if (err) {
                error = err;
              }
            }
          );
        });
        
        stmt.finalize();
        
        if (error) {
          db.run('ROLLBACK');
          return callback(error);
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            return callback(err);
          }
          callback(null, { success: true });
        });
      });
    });
  }
};

module.exports = accountFieldMappingDAO; 