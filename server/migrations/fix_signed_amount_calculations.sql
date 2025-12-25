BEGIN TRANSACTION;

-- Fix signed_amount calculations for existing transactions
-- This migration corrects the logic to properly handle Credit/Debit transaction types

-- Step 1: Recalculate signed_amount for transactions with explicit transaction_type
UPDATE transactions 
SET signed_amount = CASE 
  -- Credit transactions should always increase balance (positive)
  WHEN UPPER(TRIM(transaction_type)) IN ('C', 'CREDIT') OR UPPER(TRIM(transaction_type)) LIKE 'C%' THEN ABS(amount)
  -- Debit transactions should always decrease balance (negative)  
  WHEN UPPER(TRIM(transaction_type)) IN ('D', 'DEBIT') OR UPPER(TRIM(transaction_type)) LIKE 'D%' THEN -ABS(amount)
  -- For transactions without explicit type, use account configuration
  ELSE CASE 
    WHEN (SELECT positive_is_credit FROM accounts WHERE account_id = transactions.account_id) = 1 THEN amount
    ELSE -amount
  END
END
WHERE transaction_type IS NOT NULL AND TRIM(transaction_type) != '';

-- Step 2: Update transactions without transaction_type based on account settings
UPDATE transactions 
SET signed_amount = CASE 
  WHEN (SELECT positive_is_credit FROM accounts WHERE account_id = transactions.account_id) = 1 THEN amount
  ELSE -amount
END
WHERE transaction_type IS NULL OR TRIM(transaction_type) = '';

-- Step 3: Ensure no NULL signed_amounts remain
UPDATE transactions 
SET signed_amount = COALESCE(signed_amount, 0)
WHERE signed_amount IS NULL;

COMMIT;
