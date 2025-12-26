// server/db/index.js
// SQLite database connection with production-ready configuration

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Initialize database with production-ready PRAGMA settings
 * This is critical for concurrency and performance with 20+ simultaneous users
 */
const initializeDatabase = (database) => {
  return new Promise((resolve, reject) => {
    const pragmaSettings = [];

    // Minimal, forward-compatible schema guardrails (no separate migration runner required).
    // This keeps the server from crashing if a new column is introduced but migrations
    // haven't been applied yet.
    const ensureStatementOwnershipColumns = () => {
      return new Promise((resolveEnsure, rejectEnsure) => {
        // First check if the Transactions table exists
        database.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='Transactions';`, (tableErr, tableRow) => {
          if (tableErr) return rejectEnsure(tableErr);
          
          // If table doesn't exist, check if database needs initialization
          if (!tableRow) {
            // Check if database is empty (no tables at all)
            database.all(`SELECT name FROM sqlite_master WHERE type='table';`, (tablesErr, tables) => {
              if (tablesErr) {
                // Error checking tables - still resolve to allow server to start
                // Database operations will fail with proper error messages
                return resolveEnsure();
              }
              
              if (!tables || tables.length === 0) {
                // Database is completely empty - needs schema initialization
                const error = new Error('Database schema not initialized');
                console.error('\n' + '='.repeat(80));
                console.error('❌ DATABASE SCHEMA NOT INITIALIZED');
                console.error('='.repeat(80));
                console.error('\nThe database file exists but contains no tables.');
                console.error('Please initialize the database schema before starting the server:\n');
                console.error('  Option 1: Run the schema initialization script');
                console.error('    sqlite3 server/database.sqlite < server/db/current_schema/database_schema_simples.sqlite.sql\n');
                console.error('  Option 2: Use the migration script');
                console.error('    cd server && npm run migrate\n');
                console.error('='.repeat(80) + '\n');
                return rejectEnsure(error);
              }
              
              // Some tables exist but Transactions doesn't - might be partial schema
              // Only warn in development, but allow server to start
              if (process.env.NODE_ENV !== 'production') {
                console.warn('⚠️  Transactions table does not exist - skipping column addition. Run migrations if needed.');
              }
              return resolveEnsure(); // Resolve successfully - allow server to start
            });
            return; // Exit early, resolveEnsure/rejectEnsure will be called in callback
          }
          
          // Table exists, check columns
          database.all(`PRAGMA table_info(Transactions);`, (err, rows) => {
            if (err) return rejectEnsure(err);
            const cols = new Set((rows || []).map(r => r.name));

          const addColumn = (colName, colType) => new Promise((resCol, rejCol) => {
            database.run(`ALTER TABLE Transactions ADD COLUMN ${colName} ${colType};`, (e) => {
              // If column already exists, SQLite will error; treat as success
              if (e && !String(e.message || '').includes('duplicate column name')) return rejCol(e);
              resCol();
            });
          });

          const steps = [];
          if (!cols.has('posted_date')) steps.push(addColumn('posted_date', 'TEXT'));
          if (!cols.has('statement_id')) steps.push(addColumn('statement_id', 'TEXT'));

          Promise.all(steps)
            .then(() => {
              // Backfill posted_date from transaction_date where needed
              database.run(
                `UPDATE Transactions SET posted_date = transaction_date WHERE posted_date IS NULL;`,
                (e2) => {
                  if (e2) return rejectEnsure(e2);
                  resolveEnsure();
                }
              );
            })
            .catch(rejectEnsure);
          });
        });
      });
    };

    // CRITICAL: Enable WAL mode for concurrent reads/writes
    // Without WAL mode, SQLite uses exclusive locking which blocks all operations
    database.run('PRAGMA journal_mode = WAL;', (err) => {
      if (err) {
        console.error('❌ Failed to enable WAL mode:', err.message);
        return reject(new Error('Failed to enable WAL mode: ' + err.message));
      }
      // Only log success in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('✓ SQLite WAL mode enabled (supports concurrent reads/writes)');
      }
      pragmaSettings.push('WAL mode enabled');

      // Set synchronous mode for balance of performance/durability
      // NORMAL is safe with WAL mode and provides good performance
      database.run('PRAGMA synchronous = NORMAL;', (err) => {
        if (err) {
          console.warn('⚠️  Failed to set synchronous mode:', err.message);
        } else {
          pragmaSettings.push('Synchronous mode: NORMAL');
        }

        // Increase cache size for better performance
        // Negative value means KB (64MB cache)
        database.run('PRAGMA cache_size = -64000;', (err) => {
          if (err) {
            console.warn('⚠️  Failed to set cache size:', err.message);
          } else {
            // Only log success in development
            if (process.env.NODE_ENV !== 'production') {
              console.log('✓ Cache size set to 64MB');
            }
            pragmaSettings.push('Cache: 64MB');
          }

          // Set busy timeout for concurrent access
          // Wait up to 5 seconds if database is locked
          database.run('PRAGMA busy_timeout = 5000;', (err) => {
            if (err) {
              console.warn('⚠️  Failed to set busy timeout:', err.message);
            } else {
              // Only log success in development
              if (process.env.NODE_ENV !== 'production') {
                console.log('✓ Busy timeout set to 5000ms');
              }
              pragmaSettings.push('Busy timeout: 5000ms');
            }

            // Enable foreign key constraints (data integrity)
            database.run('PRAGMA foreign_keys = ON;', (err) => {
              if (err) {
                console.error('❌ Failed to enable foreign key constraints:', err.message);
                return reject(new Error('Failed to enable foreign keys: ' + err.message));
              }
              // Only log success in development
              if (process.env.NODE_ENV !== 'production') {
                console.log('✓ Foreign key constraints enabled');
              }
              pragmaSettings.push('Foreign keys: enabled');

              // Set temp store to memory for better performance
              database.run('PRAGMA temp_store = MEMORY;', (err) => {
                if (err) {
                  console.warn('⚠️  Failed to set temp store:', err.message);
                } else {
                  pragmaSettings.push('Temp store: MEMORY');
                }

                // Set mmap size for memory-mapped I/O (optional, helps with large databases)
                database.run('PRAGMA mmap_size = 268435456;', (err) => { // 256MB
                  if (err) {
                    console.warn('⚠️  Failed to set mmap size:', err.message);
                  } else {
                    pragmaSettings.push('Memory-mapped I/O: 256MB');
                  }

                  // Verify WAL mode was actually enabled
                  database.get('PRAGMA journal_mode;', (err, row) => {
                    if (err) {
                      console.error('❌ Failed to verify journal mode:', err.message);
                      return reject(err);
                    }
                    
                    if (row && row.journal_mode !== 'wal') {
                      const error = new Error(`WAL mode not active (current: ${row.journal_mode})`);
                      console.error('❌', error.message);
                      return reject(error);
                    }

                    // Only log success in development
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('✓ Database initialization complete');
                      console.log('  Configuration:', pragmaSettings.join(', '));
                    }
                    ensureStatementOwnershipColumns()
                      .then(resolve)
                      .catch((schemaErr) => {
                        console.error('❌ Failed to ensure schema columns:', schemaErr.message);
                        reject(schemaErr);
                      });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Get database connection (singleton pattern)
 * Automatically initializes on first call
 */
const getConnection = () => {
  if (!db) {
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    
    try {
      // Open database with specific flags
      db = new sqlite3.Database(
        dbPath,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
          if (err) {
            // Always log critical database connection errors
            console.error('❌ Failed to connect to database:', err.message);
            db = null;
            throw err;
          }
          
          // Only log success in development
          if (process.env.NODE_ENV !== 'production') {
            console.log('✓ Database connection established:', dbPath);
          }
          
          // Initialize database settings asynchronously
          if (!isInitialized && !initializationPromise) {
            initializationPromise = initializeDatabase(db)
              .then(() => {
                isInitialized = true;
                initializationPromise = null;
              })
              .catch((error) => {
                // Always log critical initialization errors
                console.error('❌ Database initialization failed:', error.message);
                // Close the connection if initialization fails
                if (db) {
                  db.close();
                  db = null;
                }
                isInitialized = false;
                initializationPromise = null;
                throw error;
              });
          }
        }
      );

      // Set up error handler for the connection
      db.on('error', (err) => {
        // Always log critical database errors
        console.error('❌ Database error:', err.message);
      });

    } catch (error) {
      // Always log critical connection exceptions
      console.error('❌ Exception creating database connection:', error.message);
      db = null;
      throw error;
    }
  }
  
  return db;
};

/**
 * Close database connection gracefully
 */
const closeConnection = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          // Always log critical close errors
          console.error('❌ Error closing database:', err.message);
          reject(err);
        } else {
          // Only log success in development
          if (process.env.NODE_ENV !== 'production') {
            console.log('✓ Database connection closed');
          }
          db = null;
          isInitialized = false;
          initializationPromise = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

/**
 * Health check for monitoring/readiness probes
 * Returns database status and performance metrics
 */
const checkHealth = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('Database not connected'));
    }

    const startTime = Date.now();
    
    db.get('SELECT 1 as health, sqlite_version() as version', (err, row) => {
      const responseTime = Date.now() - startTime;
      
      if (err) {
        reject({
          healthy: false,
          error: err.message,
          responseTime
        });
      } else {
        // Also check journal mode
        db.get('PRAGMA journal_mode;', (pragmaErr, pragmaRow) => {
          resolve({
            healthy: true,
            responseTime,
            sqliteVersion: row.version,
            journalMode: pragmaRow ? pragmaRow.journal_mode : 'unknown',
            initialized: isInitialized
          });
        });
      }
    });
  });
};

/**
 * Wait for database initialization to complete
 * Useful for ensuring database is ready before performing operations
 */
const waitForInitialization = () => {
  if (isInitialized) {
    return Promise.resolve();
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  return Promise.reject(new Error('Database not initialized'));
};

/**
 * Run a database query with automatic error logging
 * This is a convenience wrapper for common operations
 */
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const connection = getConnection();
    connection.run(sql, params, function(err) {
      if (err) {
        // Always log query errors, but only include SQL in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Query error:', err.message, '\n  SQL:', sql);
        } else {
          console.error('❌ Query error:', err.message);
        }
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
};

/**
 * Get a single row with automatic error logging
 */
const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const connection = getConnection();
    connection.get(sql, params, (err, row) => {
      if (err) {
        // Always log query errors, but only include SQL in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Query error:', err.message, '\n  SQL:', sql);
        } else {
          console.error('❌ Query error:', err.message);
        }
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

/**
 * Get all rows with automatic error logging
 */
const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const connection = getConnection();
    connection.all(sql, params, (err, rows) => {
      if (err) {
        // Always log query errors, but only include SQL in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Query error:', err.message, '\n  SQL:', sql);
        } else {
          console.error('❌ Query error:', err.message);
        }
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

module.exports = {
  getConnection,
  closeConnection,
  checkHealth,
  waitForInitialization,
  // Convenience methods
  runQuery,
  getOne,
  getAll
};