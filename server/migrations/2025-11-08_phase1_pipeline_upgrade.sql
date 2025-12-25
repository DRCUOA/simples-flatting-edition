-- Migration: Phase 1 Pipeline Upgrade (SQL Version)
-- Date: 2025-11-08
-- Description: Adds integrity validation, job status tracking, and error logging to StatementImports
-- Purpose: Enable financial correctness guarantees and import lifecycle visibility
-- 
-- IMPORTANT: This SQL file will fail if columns already exist.
-- Use the Node.js version (2025-11-08_phase1_pipeline_upgrade.js) instead for idempotent execution.
-- 
-- To check which columns exist before running:
-- SELECT name FROM pragma_table_info('StatementImports') 
-- WHERE name IN ('opening_balance', 'status', 'integrity_status', 'integrity_notes', 'error_log', 'updated_at');
--
-- If columns already exist, comment out the corresponding ALTER TABLE lines below.

BEGIN TRANSACTION;

-- Add opening_balance column (required for integrity checking)
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN opening_balance REAL NULL;

-- Add status column for import lifecycle tracking
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN status TEXT;

-- Add integrity_status column for balance validation results
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN integrity_status TEXT;

-- Add integrity_notes column for mismatch details
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN integrity_notes TEXT NULL;

-- Add error_log column for debugging and traceability
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN error_log TEXT;

-- Add updated_at column for status change tracking
-- Comment out this line if column already exists
ALTER TABLE StatementImports ADD COLUMN updated_at DATETIME;

-- Create indexes (these use IF NOT EXISTS, so they're safe to re-run)
CREATE INDEX IF NOT EXISTS ix_stmt_import_status 
  ON StatementImports(status);

CREATE INDEX IF NOT EXISTS ix_stmt_import_integrity 
  ON StatementImports(integrity_status);

-- Update existing imports to have default values
-- Set status, integrity_status, and updated_at for existing rows
UPDATE StatementImports 
SET status = COALESCE(status, 'completed'), 
    integrity_status = COALESCE(integrity_status, 'unknown'),
    updated_at = COALESCE(updated_at, created_at, datetime('now'))
WHERE status IS NULL OR integrity_status IS NULL OR updated_at IS NULL;

COMMIT;
