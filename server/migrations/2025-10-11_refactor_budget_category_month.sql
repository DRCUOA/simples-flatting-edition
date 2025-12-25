-- Migration: Refactor Budget System - Create budget_category_month Table
-- Date: 2025-10-11
-- Description: Creates new budget_category_month table with immutable revision tracking
-- Implements category-first budget principle with append-only updates

BEGIN TRANSACTION;

-- Create the new budget_category_month table
CREATE TABLE IF NOT EXISTS budget_category_month (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    category_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL, -- Money stored as integer cents
    revision INTEGER NOT NULL DEFAULT 1,
    active_flag INTEGER NOT NULL DEFAULT 1, -- 1=active, 0=superseded
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, -- Soft delete timestamp
    
    FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT
);

-- Unique constraint: Each revision must be unique per user+month+category
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_cat_month_revision 
ON budget_category_month(user_id, month, category_id, revision);

-- Partial unique index: Only one active record per user+month+category
-- SQLite supports partial indexes with WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_cat_month_active 
ON budget_category_month(user_id, month, category_id) 
WHERE active_flag = 1 AND deleted_at IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_budget_cat_month_user_month 
ON budget_category_month(user_id, month, active_flag);

CREATE INDEX IF NOT EXISTS idx_budget_cat_month_category 
ON budget_category_month(category_id, month);

CREATE INDEX IF NOT EXISTS idx_budget_cat_month_user_month_active 
ON budget_category_month(user_id, month) 
WHERE active_flag = 1 AND deleted_at IS NULL;

-- Trigger to auto-update updated_at on modifications
CREATE TRIGGER IF NOT EXISTS budget_cat_month_updated_at
AFTER UPDATE ON budget_category_month
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
    UPDATE budget_category_month 
    SET updated_at = datetime('now') 
    WHERE id = NEW.id;
END;

COMMIT;

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='budget_category_month') as table_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_budget_cat_month_active') as active_index_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='budget_cat_month_updated_at') as trigger_exists;

