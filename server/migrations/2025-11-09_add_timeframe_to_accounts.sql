BEGIN TRANSACTION;

-- Add timeframe column to Accounts table
-- Values: 'short', 'mid', 'long', or NULL (for existing accounts)
ALTER TABLE Accounts ADD COLUMN timeframe TEXT CHECK (timeframe IN ('short', 'mid', 'long')) DEFAULT NULL;

-- Create index for timeframe filtering
CREATE INDEX IF NOT EXISTS idx_accounts_timeframe ON Accounts(timeframe, user_id);

COMMIT;

