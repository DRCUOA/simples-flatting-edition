// Migration: Add Statement Name Field
// Date: 2025-12-16
// Description: Adds statement_name column to StatementImports with NOT NULL and UNIQUE constraints
// Purpose: Allow users to tag/name statements for better organization
// Usage: node server/migrations/2025-12-16_add_statement_name.js

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

// Helper function to check if index exists
function indexExists(indexName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [indexName], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.length > 0);
    });
  });
}

async function runMigration() {
  console.log('Starting Statement Name migration...');
  
  try {
    const columnExistsResult = await columnExists('StatementImports', 'statement_name');
    
    if (columnExistsResult) {
      console.log('Column statement_name already exists, checking index...');
      
      // Check if index exists
      const indexName = 'ux_stmt_import_statement_name';
      const indexExistsResult = await indexExists(indexName);
      
      if (!indexExistsResult) {
        console.log('Column exists but UNIQUE index is missing, creating index...');
        await new Promise((resolve, reject) => {
          db.run(
            `CREATE UNIQUE INDEX ${indexName} ON StatementImports(statement_name)`,
            [],
            function(err) {
              if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                  console.error('ERROR: Cannot create UNIQUE index due to duplicate statement names');
                  console.error('Please resolve duplicates before running migration');
                  reject(err);
                } else {
                  reject(err);
                }
              } else {
                console.log('UNIQUE index created successfully');
                resolve();
              }
            }
          );
        });
      } else {
        console.log('Migration already applied!');
      }
      
      process.exit(0);
      return;
    }

    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Step 1: Add column with DEFAULT value (allows NOT NULL)
    console.log('Adding statement_name column...');
    await new Promise((resolve, reject) => {
      db.run(
        `ALTER TABLE StatementImports ADD COLUMN statement_name TEXT NOT NULL DEFAULT ''`,
        [],
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log('Column added successfully');
            resolve();
          }
        }
      );
    });

    // Step 2: Backfill existing rows with unique values based on source_filename and import_id
    console.log('Backfilling existing statement names...');
    await new Promise((resolve, reject) => {
      db.all(
        `SELECT import_id, source_filename, created_at FROM StatementImports WHERE statement_name = '' OR statement_name IS NULL`,
        [],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows.length === 0) {
            console.log('No rows to backfill');
            resolve();
            return;
          }

          // Track used names to ensure uniqueness
          const usedNames = new Set();
          
          // Generate unique names for each row
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Use source_filename as base, append import_id suffix to ensure uniqueness
            const baseName = (row.source_filename || 'Statement').trim();
            let uniqueName = `${baseName} (${row.import_id.substring(0, 8)})`;
            
            // Ensure uniqueness - if name already used, append counter
            let counter = 0;
            while (usedNames.has(uniqueName)) {
              counter++;
              uniqueName = `${baseName} (${row.import_id.substring(0, 8)}-${counter})`;
            }
            usedNames.add(uniqueName);
            
            await new Promise((resolveUpdate, rejectUpdate) => {
              db.run(
                `UPDATE StatementImports SET statement_name = ? WHERE import_id = ?`,
                [uniqueName, row.import_id],
                function(updateErr) {
                  if (updateErr) {
                    rejectUpdate(updateErr);
                  } else {
                    resolveUpdate();
                  }
                }
              );
            });
          }
          
          console.log(`Backfilled ${rows.length} statement names`);
          
          // Verify no duplicates exist before creating index
          db.all(
            `SELECT statement_name, COUNT(*) as count 
             FROM StatementImports 
             WHERE statement_name IS NOT NULL AND statement_name != ''
             GROUP BY statement_name 
             HAVING COUNT(*) > 1`,
            [],
            (verifyErr, duplicates) => {
              if (verifyErr) {
                reject(verifyErr);
                return;
              }
              
              if (duplicates && duplicates.length > 0) {
                console.error('ERROR: Found duplicate statement names:', duplicates);
                reject(new Error(`Cannot create UNIQUE index: ${duplicates.length} duplicate statement names found`));
                return;
              }
              
              console.log('Verified: No duplicate statement names found');
              resolve();
            }
          );
        }
      );
    });

    // Step 3: Create UNIQUE index
    const indexName = 'ux_stmt_import_statement_name';
    const indexExistsResult = await indexExists(indexName);
    
    if (!indexExistsResult) {
      console.log('Creating UNIQUE index on statement_name...');
      await new Promise((resolve, reject) => {
        db.run(
          `CREATE UNIQUE INDEX ${indexName} ON StatementImports(statement_name)`,
          [],
          function(err) {
            if (err) {
              reject(err);
            } else {
              console.log('UNIQUE index created successfully');
              resolve();
            }
          }
        );
      });
    } else {
      console.log('UNIQUE index already exists, skipping...');
    }

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Migration completed successfully!');
          resolve();
        }
      });
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error during migration:', error);
    db.run('ROLLBACK', () => {
      process.exit(1);
    });
  }
}

runMigration();

