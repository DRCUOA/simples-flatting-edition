-- Migration: Add core performance indexes for production workloads
-- Date: 2025-09-10
-- Description: Creates indexes on frequently queried columns to improve performance
-- for user-scoped data access patterns in the financial application.

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON Users(last_login);

-- Account table indexes  
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON Accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_account_name ON Accounts(user_id, account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON Accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_last_balance_update ON Accounts(last_balance_update);

-- Transaction table indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON Transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON Transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON Transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON Transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON Transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON Transactions(category_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON Transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON Transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_signed_amount ON Transactions(signed_amount);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON Transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled ON Transactions(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON Transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import ON Transactions(import_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dedupe_hash ON Transactions(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_description ON Transactions(description);

-- Category table indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON Categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_name ON Categories(user_id, category_name);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON Categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_budget_amount ON Categories(budgeted_amount);

-- Budget table indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON Budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_category ON Budgets(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON Budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period_start ON Budgets(period_start);
CREATE INDEX IF NOT EXISTS idx_budgets_period_end ON Budgets(period_end);
CREATE INDEX IF NOT EXISTS idx_budgets_period_range ON Budgets(period_start, period_end);

-- Statement table indexes
CREATE INDEX IF NOT EXISTS idx_statements_user_id ON Statements(user_id);
CREATE INDEX IF NOT EXISTS idx_statements_user_account ON Statements(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_statements_account ON Statements(account_id);
CREATE INDEX IF NOT EXISTS idx_statements_period_start ON Statements(period_start);
CREATE INDEX IF NOT EXISTS idx_statements_period_end ON Statements(period_end);
CREATE INDEX IF NOT EXISTS idx_statements_period_range ON Statements(period_start, period_end);

-- User Preferences table indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON UserPreferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON UserPreferences(preference_key);

-- Keyword Category Map table indexes  
CREATE INDEX IF NOT EXISTS idx_keyword_category_map_user_id ON KeywordCategoryMap(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_category_map_keyphrase ON KeywordCategoryMap(keyphrase);
CREATE INDEX IF NOT EXISTS idx_keyword_category_map_category ON KeywordCategoryMap(budget_category);

-- Account Field Mappings table indexes
CREATE INDEX IF NOT EXISTS idx_account_field_mappings_user_id ON AccountFieldMappings(user_id);
CREATE INDEX IF NOT EXISTS idx_account_field_mappings_account ON AccountFieldMappings(account_id);
CREATE INDEX IF NOT EXISTS idx_account_field_mappings_field ON AccountFieldMappings(field_name);

-- Transaction Import table indexes
CREATE INDEX IF NOT EXISTS idx_transaction_imports_user_id ON TransactionImports(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_imports_date ON TransactionImports(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_imports_status ON TransactionImports(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_amount ON Transactions(user_id, transaction_date DESC, signed_amount);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date ON Transactions(user_id, account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date ON Transactions(user_id, category_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON Budgets(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_statements_user_account_period ON Statements(user_id, account_id, period_start, period_end);

-- Performance monitoring
ANALYZE;

-- Verify indexes were created (for logging/verification)
SELECT 
  'Index creation completed' as status,
  COUNT(*) as total_indexes
FROM sqlite_master 
WHERE type = 'index' 
AND name LIKE 'idx_%';
