-- Add positive_is_credit column to Accounts table
ALTER TABLE Accounts ADD COLUMN positive_is_credit BOOLEAN NOT NULL DEFAULT 1;

-- Update existing accounts to have positive_is_credit = 1 (credit) by default
UPDATE Accounts SET positive_is_credit = 1 WHERE positive_is_credit IS NULL; 