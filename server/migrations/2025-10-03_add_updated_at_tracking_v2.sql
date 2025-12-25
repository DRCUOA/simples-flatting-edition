-- Migration: Add updated_at tracking for conditional GET support (v2)
-- Date: 2025-10-03
-- Description: Adds updated_at columns and triggers to support Last-Modified headers
-- SQLite-compatible version with proper error handling

-- Note: SQLite doesn't allow DEFAULT CURRENT_TIMESTAMP in ALTER TABLE ADD COLUMN
-- We use TEXT type for timestamps (SQLite stores DATETIME as TEXT anyway)

BEGIN TRANSACTION;

-- Add updated_at to Budgets table (TEXT type, SQLite will store timestamps as ISO8601 strings)
-- If this fails with "duplicate column", the column already exists (safe)
ALTER TABLE Budgets ADD COLUMN updated_at TEXT;

-- Add updated_at to Categories table
ALTER TABLE Categories ADD COLUMN updated_at TEXT;

-- Backfill existing rows with current timestamp
UPDATE Budgets SET updated_at = datetime('now') WHERE updated_at IS NULL;
UPDATE Categories SET updated_at = datetime('now') WHERE updated_at IS NULL;

-- Drop existing triggers if they exist (to allow re-running migration)
DROP TRIGGER IF EXISTS budgets_updated_at;
DROP TRIGGER IF EXISTS categories_updated_at;

-- Create trigger to auto-update updated_at on Budgets modifications
CREATE TRIGGER budgets_updated_at
AFTER UPDATE ON Budgets
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE Budgets SET updated_at = datetime('now') WHERE budget_id = NEW.budget_id;
END;

-- Create trigger to auto-update updated_at on Categories modifications
CREATE TRIGGER categories_updated_at
AFTER UPDATE ON Categories
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE Categories SET updated_at = datetime('now') WHERE category_id = NEW.category_id;
END;

-- Add indexes on updated_at for efficient Last-Modified queries
CREATE INDEX IF NOT EXISTS idx_budgets_updated_at ON Budgets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON Categories(updated_at DESC);

COMMIT;

-- Verify migration
SELECT 
  'Migration completed successfully' as status,
  (SELECT COUNT(*) FROM pragma_table_info('Budgets') WHERE name = 'updated_at') as budgets_has_updated_at,
  (SELECT COUNT(*) FROM pragma_table_info('Categories') WHERE name = 'updated_at') as categories_has_updated_at,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='budgets_updated_at') as budgets_trigger_exists,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='categories_updated_at') as categories_trigger_exists,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_budgets_updated_at') as budgets_index_exists,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_categories_updated_at') as categories_index_exists;

