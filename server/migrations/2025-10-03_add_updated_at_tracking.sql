-- Migration: Add updated_at tracking for conditional GET support
-- Date: 2025-10-03
-- Description: Adds updated_at columns and triggers to support Last-Modified headers
-- for efficient HTTP caching

-- SQLite doesn't allow DEFAULT CURRENT_TIMESTAMP in ALTER TABLE
-- We add columns with NULL default, then backfill with current timestamp

-- Add updated_at to Budgets table (if not exists)
-- Check first if column exists to make migration idempotent
SELECT CASE 
  WHEN (SELECT COUNT(*) FROM pragma_table_info('Budgets') WHERE name = 'updated_at') = 0 
  THEN 'Adding updated_at to Budgets'
  ELSE 'Column updated_at already exists in Budgets'
END as budgets_check;

-- Add column only if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- If this fails with "duplicate column", it means the column already exists (safe to ignore)

-- For Budgets
ALTER TABLE Budgets ADD COLUMN updated_at TEXT;

-- For Categories
ALTER TABLE Categories ADD COLUMN updated_at TEXT;

-- Note: UserPreferences already has updated_at from previous migration

-- Backfill existing rows with current timestamp
UPDATE Budgets SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
UPDATE Categories SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Create triggers to auto-update updated_at on modifications

-- Budget update trigger
CREATE TRIGGER IF NOT EXISTS budgets_updated_at
AFTER UPDATE ON Budgets
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE Budgets SET updated_at = CURRENT_TIMESTAMP WHERE budget_id = NEW.budget_id;
END;

-- Category update trigger
CREATE TRIGGER IF NOT EXISTS categories_updated_at
AFTER UPDATE ON Categories
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE Categories SET updated_at = CURRENT_TIMESTAMP WHERE category_id = NEW.category_id;
END;

-- Add indexes on updated_at for efficient Last-Modified queries
CREATE INDEX IF NOT EXISTS idx_budgets_updated_at ON Budgets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON Categories(updated_at DESC);

-- Verify migration
SELECT 
  'Updated_at tracking added' as status,
  (SELECT COUNT(*) FROM pragma_table_info('Budgets') WHERE name = 'updated_at') as budgets_column_added,
  (SELECT COUNT(*) FROM pragma_table_info('Categories') WHERE name = 'updated_at') as categories_column_added;

