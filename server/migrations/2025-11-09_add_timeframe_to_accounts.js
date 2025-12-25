// Migration: Add Timeframe to Accounts
// Date: 2025-11-09
// Description: Adds timeframe column to Accounts table for filtering accounts by short/mid/long term
// Usage: node server/migrations/2025-11-09_add_timeframe_to_accounts.js

const { getConnection } = require('../db/index');
const db = getConnection();
const fs = require('fs');
const path = require('path');

// Helper function to check if column exists
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const exists = rows.some(row => row.name === columnName);
      resolve(exists);
    });
  });
}

async function runMigration() {
  console.log('Starting Add Timeframe to Accounts migration...');
  
  try {
    // Check if column already exists
    const exists = await columnExists('Accounts', 'timeframe');
    if (exists) {
      console.log('✓ Column timeframe already exists, skipping...');
      return;
    }

    // Read and execute SQL migration
    const sqlPath = path.join(__dirname, '2025-11-09_add_timeframe_to_accounts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL statements
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Add timeframe column
      db.run(`ALTER TABLE Accounts ADD COLUMN timeframe TEXT CHECK (timeframe IN ('short', 'mid', 'long')) DEFAULT NULL`, (err) => {
        if (err) {
          console.error('Error adding timeframe column:', err);
          db.run('ROLLBACK');
          process.exit(1);
        } else {
          console.log('✓ Added timeframe column to Accounts table');
        }
      });
      
      // Create index
      db.run(`CREATE INDEX IF NOT EXISTS idx_accounts_timeframe ON Accounts(timeframe, user_id)`, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          db.run('ROLLBACK');
          process.exit(1);
        } else {
          console.log('✓ Created index idx_accounts_timeframe');
        }
      });
      
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error committing transaction:', err);
          db.run('ROLLBACK');
          process.exit(1);
        } else {
          console.log('✓ Migration completed successfully!');
          process.exit(0);
        }
      });
    });
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

