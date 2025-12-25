-- Migration: Remove Unused Tables
-- Date: 2025-10-17
-- Description: Removes messages, category_keyword_rules, and category_suggestions tables
--              These tables are no longer used in the application

BEGIN TRANSACTION;

-- Drop unused tables
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS category_keyword_rules;
DROP TABLE IF EXISTS category_suggestions;

COMMIT;

