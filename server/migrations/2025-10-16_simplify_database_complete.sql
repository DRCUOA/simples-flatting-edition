-- Migration: Simplify Database - Remove Advanced Features (Complete Version)
-- Date: 2025-10-16
-- Description: Removes all tables and views related to removed features

BEGIN TRANSACTION;

-- Drop all views related to removed features
DROP VIEW IF EXISTS v_statement_actuals;
DROP VIEW IF EXISTS v_budget_actuals;
DROP VIEW IF EXISTS v_category_actuals;
DROP VIEW IF EXISTS v_account_actuals;
DROP VIEW IF EXISTS v_amounts_normalized;
DROP VIEW IF EXISTS v_accounting_equation;
DROP VIEW IF EXISTS v_account_balances_by_class;

-- Drop all tables related to removed features
DROP TABLE IF EXISTS Statements;
DROP TABLE IF EXISTS budget_category_month;
DROP TABLE IF EXISTS Budgets_legacy;
DROP TABLE IF EXISTS Budgets;
DROP TABLE IF EXISTS EquityAdjustments;

-- Drop views that were incorrectly listed as tables
DROP VIEW IF EXISTS reconciliation_summary;
DROP VIEW IF EXISTS statement_reconciliation_status;

-- Remove any equity accounts (cleanup data)
DELETE FROM Accounts WHERE account_type = 'equity';

COMMIT;
