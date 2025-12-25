// server/scripts/apply_migration.js
//
// Minimal migration runner for one-off schema changes that must be idempotent.
// This repo historically used manual `sqlite3 database.sqlite < migrations/...` commands,
// but some schema changes (like ADD COLUMN) need a "check first" flow to avoid noisy errors.

const path = require('path');
const fs = require('fs');
const { getConnection } = require('../db/index');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

async function hasColumn(db, tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
      if (err) return reject(err);
      const cols = new Set((rows || []).map(r => r.name));
      resolve(cols.has(columnName));
    });
  });
}

async function run() {
  const migration = getArg('--file') || getArg('-f');
  if (!migration) {
    console.error('Usage: node scripts/apply_migration.js --file <migration.sql>');
    process.exit(1);
  }

  const db = getConnection();
  const migrationPath = path.isAbsolute(migration)
    ? migration
    : path.resolve(__dirname, '..', migration);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Special-case: statement ownership migration (idempotent, avoids duplicate column errors)
  const filename = path.basename(migrationPath);
  if (filename === '2025-12-15_add_statement_ownership_to_transactions.sql') {
    const hasPostedDate = await hasColumn(db, 'Transactions', 'posted_date');
    const hasStatementId = await hasColumn(db, 'Transactions', 'statement_id');

    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION;', (e) => (e ? reject(e) : resolve())));

    if (!hasPostedDate) {
      await new Promise((resolve, reject) =>
        db.run('ALTER TABLE Transactions ADD COLUMN posted_date TEXT;', (e) => (e ? reject(e) : resolve()))
      );
    }

    if (!hasStatementId) {
      await new Promise((resolve, reject) =>
        db.run('ALTER TABLE Transactions ADD COLUMN statement_id TEXT;', (e) => (e ? reject(e) : resolve()))
      );
    }

    // Backfill posted_date if needed (safe even if column existed)
    await new Promise((resolve, reject) =>
      db.run(
        `UPDATE Transactions SET posted_date = transaction_date WHERE posted_date IS NULL;`,
        (e) => (e ? reject(e) : resolve())
      )
    );

    // Indexes are safe to (re)create
    await new Promise((resolve, reject) =>
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_transactions_statement_id ON Transactions(statement_id);`,
        (e) => (e ? reject(e) : resolve())
      )
    );
    await new Promise((resolve, reject) =>
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_transactions_account_statement_posted ON Transactions(account_id, statement_id, posted_date);`,
        (e) => (e ? reject(e) : resolve())
      )
    );

    await new Promise((resolve, reject) => db.run('COMMIT;', (e) => (e ? reject(e) : resolve())));
    console.log(`✓ Applied migration safely: ${filename}`);
    return;
  }

  // Fallback: raw SQL execution (best-effort). For complex cases, add another special-case above.
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
  console.log(`✓ Applied migration: ${filename}`);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});









