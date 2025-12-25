-- Migration: Fix Account Classification
-- Date: 2025-10-11
-- Description: Corrects the account_class assignments based on account_type

-- Reset all accounts and classify correctly
-- Assets: checking, savings, investment, cash, other (what you own)
UPDATE Accounts 
SET account_class = 'asset' 
WHERE account_type IN ('checking', 'savings', 'investment', 'cash', 'other');

-- Liabilities: credit, loan, mortgage (what you owe)
UPDATE Accounts 
SET account_class = 'liability' 
WHERE account_type IN ('credit', 'loan', 'mortgage');

-- Equity: equity type accounts (will be created as needed - system managed)
UPDATE Accounts 
SET account_class = 'equity' 
WHERE account_type = 'equity';

