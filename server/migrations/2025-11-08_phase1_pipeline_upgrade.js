// Migration: Phase 1 Pipeline Upgrade (Idempotent Version)
// Date: 2025-11-08
// Description: Adds integrity validation, job status tracking, and error logging to StatementImports
// Purpose: Enable financial correctness guarantees and import lifecycle visibility
// Usage: node server/migrations/2025-11-08_phase1_pipeline_upgrade.js

const { getConnection } = require('../db/index');
const db = getConnection();

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

// Helper function to add column if it doesn't exist
async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  const exists = await columnExists(tableName, columnName);
  if (exists) {
    console.log(`Column ${columnName} already exists, skipping...`);
    return false;
  }
  
  return new Promise((resolve, reject) => {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    db.run(sql, [], function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`Added column ${columnName}`);
        resolve(true);
      }
    });
  });
}

async function runMigration() {
  console.log('Starting Phase 1 Pipeline Upgrade migration...');
  
  db.serialize(async () => {
    db.run('BEGIN TRANSACTION');
    
    try {
      // Add columns only if they don't exist
      await addColumnIfNotExists('StatementImports', 'opening_balance', 'REAL NULL');
      await addColumnIfNotExists('StatementImports', 'status', 'TEXT');
      await addColumnIfNotExists('StatementImports', 'integrity_status', 'TEXT');
      await addColumnIfNotExists('StatementImports', 'integrity_notes', 'TEXT NULL');
      await addColumnIfNotExists('StatementImports', 'error_log', 'TEXT');
      await addColumnIfNotExists('StatementImports', 'updated_at', 'DATETIME');
      
      // Create indexes (IF NOT EXISTS makes these safe)
      db.run(`
        CREATE INDEX IF NOT EXISTS ix_stmt_import_status 
        ON StatementImports(status)
      `);
      
      db.run(`
        CREATE INDEX IF NOT EXISTS ix_stmt_import_integrity 
        ON StatementImports(integrity_status)
      `);
      
      // Update existing imports to have default values
      db.run(`
        UPDATE StatementImports 
        SET status = COALESCE(status, 'completed'), 
            integrity_status = COALESCE(integrity_status, 'unknown'),
            updated_at = COALESCE(updated_at, created_at, datetime('now'))
        WHERE status IS NULL OR integrity_status IS NULL OR updated_at IS NULL
      `);
      
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error committing transaction:', err);
          db.run('ROLLBACK');
          process.exit(1);
        } else {
          console.log('Migration completed successfully!');
          process.exit(0);
        }
      });
      
    } catch (error) {
      console.error('Error during migration:', error);
      db.run('ROLLBACK');
      process.exit(1);
    }
  });
}

runMigration();


