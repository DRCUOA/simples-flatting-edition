// Reset Reconciliation and Statement Data Script
// Date: 2025-12-16
// Description: Resets all reconciliation and statement data to zero state
// Purpose: Clear all reconciliation sessions, matches, statements while preserving core data
// Usage: node server/scripts/reset_reconciliation_data.js

const { getConnection } = require('../db/index');
const db = getConnection();

function runOperation(sql, description) {
  return new Promise((resolve, reject) => {
    db.run(sql, [], function(err) {
      if (err) {
        console.error(`   ❌ Error: ${err.message}`);
        reject(err);
      } else {
        console.log(`   ✓ ${description}: ${this.changes} records`);
        resolve(this.changes);
      }
    });
  });
}

async function resetReconciliationData() {
  console.log('Starting reconciliation data reset...');
  console.log('This will delete all reconciliation sessions, matches, and statements.');
  console.log('Core data (transactions, accounts, categories, users) will be preserved.\n');

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Disable foreign key constraints temporarily
        await new Promise((resolve, reject) => {
          db.run('PRAGMA foreign_keys = OFF', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        db.run('BEGIN TRANSACTION', async (err) => {
          if (err) {
            await new Promise((resolve) => {
              db.run('PRAGMA foreign_keys = ON', () => resolve());
            });
            reject(err);
            return;
          }

          try {
            // 1. Delete all ReconciliationMatches (references sessions and statement lines)
            console.log('1. Deleting ReconciliationMatches...');
            await runOperation('DELETE FROM ReconciliationMatches', 'Deleted reconciliation matches');

            // 2. Delete all StatementLines (references StatementImports)
            console.log('2. Deleting StatementLines...');
            await runOperation('DELETE FROM StatementLines', 'Deleted statement lines');

            // 3. Delete all StatementImports
            console.log('3. Deleting StatementImports...');
            await runOperation('DELETE FROM StatementImports', 'Deleted statement imports');

            // 4. Delete all ReconciliationSessions
            console.log('4. Deleting ReconciliationSessions...');
            await runOperation('DELETE FROM ReconciliationSessions', 'Deleted reconciliation sessions');

            // 5. Reset statement_id in Transactions table
            console.log('5. Resetting transaction statement_id fields...');
            await runOperation(
              'UPDATE Transactions SET statement_id = NULL WHERE statement_id IS NOT NULL',
              'Reset transaction statement_id fields'
            );

            // Commit transaction
            await new Promise((resolve, reject) => {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  reject(commitErr);
                } else {
                  resolve();
                }
              });
            });

            // Re-enable foreign key constraints
            await new Promise((resolve, reject) => {
              db.run('PRAGMA foreign_keys = ON', (err) => {
                if (err) reject(err);
                else resolve();
              });
            });

            console.log('\n✅ Reset completed successfully!');
            console.log('All reconciliation and statement data has been cleared.');
            console.log('Table structures remain intact for future use.');
            resolve();

          } catch (error) {
            // Rollback on error
            await new Promise((resolve) => {
              db.run('ROLLBACK', () => resolve());
            });
            await new Promise((resolve) => {
              db.run('PRAGMA foreign_keys = ON', () => resolve());
            });
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Run the reset
resetReconciliationData()
  .then(() => {
    console.log('\n🎉 Database reset complete!');
    console.log('\nSummary:');
    console.log('  - All reconciliation sessions deleted');
    console.log('  - All reconciliation matches deleted');
    console.log('  - All statement imports deleted');
    console.log('  - All statement lines deleted');
    console.log('  - All transaction statement_id fields reset to NULL');
    console.log('\n✅ Core data preserved:');
    console.log('  - Transactions');
    console.log('  - Accounts');
    console.log('  - Categories');
    console.log('  - Users');
    console.log('  - All other core tables');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  });
