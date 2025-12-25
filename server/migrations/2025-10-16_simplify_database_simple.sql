-- Migration: Simplify Database - Remove Advanced Features (Simple Version)
-- Date: 2025-10-16
-- Description: Removes only tables and views that exist, without schema changes

BEGIN TRANSACTION;

-- Drop actuals views (if they exist)
DROP VIEW IF EXISTS v_statement_actuals;
DROP VIEW IF EXISTS v_budget_actuals;
DROP VIEW IF EXISTS v_category_actuals;
DROP VIEW IF EXISTS v_account_actuals;
DROP VIEW IF EXISTS v_amounts_normalized;

-- Drop equity views (if they exist)
DROP VIEW IF EXISTS v_accounting_equation;

-- Drop tables for removed features (if they exist)
DROP TABLE IF EXISTS Statements;
DROP TABLE IF EXISTS budget_category_month;
DROP TABLE IF EXISTS Budgets_legacy;
DROP TABLE IF EXISTS Budgets;

-- Remove any equity accounts (cleanup data)
DELETE FROM Accounts WHERE account_type = 'equity';

COMMIT;
