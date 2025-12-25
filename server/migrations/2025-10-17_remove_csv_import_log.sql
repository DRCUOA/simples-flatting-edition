-- Migration: Remove CSVImportLog Table
-- Date: 2025-10-17
-- Description: Removes the unused CSVImportLog table
--              This table was replaced by transaction_imports and is no longer in use

BEGIN TRANSACTION;

-- Drop unused table
DROP TABLE IF EXISTS CSVImportLog;

COMMIT;

