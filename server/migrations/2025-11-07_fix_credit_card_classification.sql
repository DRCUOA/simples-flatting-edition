-- Migration: Fix Credit Card Account Classification
-- Date: 2025-11-07
-- Description: Corrects account_class for credit card accounts that were incorrectly set to 'asset'

-- Update credit card accounts to be classified as liabilities
UPDATE Accounts 
SET account_class = 'liability' 
WHERE account_type = 'credit' AND account_class != 'liability';

-- Update loan accounts to be classified as liabilities
UPDATE Accounts 
SET account_class = 'liability' 
WHERE account_type = 'loan' AND account_class != 'liability';

-- Update mortgage accounts to be classified as liabilities
UPDATE Accounts 
SET account_class = 'liability' 
WHERE account_type = 'mortgage' AND account_class != 'liability';

-- Ensure asset accounts are correctly classified
UPDATE Accounts 
SET account_class = 'asset' 
WHERE account_type IN ('checking', 'savings', 'investment', 'cash', 'other') 
  AND account_class != 'asset';

-- Ensure equity accounts are correctly classified
UPDATE Accounts 
SET account_class = 'equity' 
WHERE account_type = 'equity' AND account_class != 'equity';

