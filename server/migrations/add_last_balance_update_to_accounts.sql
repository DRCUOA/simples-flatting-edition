-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create a new table with the desired schema
CREATE TABLE Accounts_new (
  account_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  current_balance REAL NOT NULL DEFAULT 0,
  positive_is_credit INTEGER NOT NULL DEFAULT 1,
  last_balance_update TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Copy data from the old table to the new table
INSERT INTO Accounts_new 
SELECT 
  account_id,
  user_id,
  account_name,
  account_type,
  current_balance,
  positive_is_credit,
  datetime('now'),
  created_at
FROM Accounts;

-- Drop the old table
DROP TABLE Accounts;

-- Rename the new table to the original name
ALTER TABLE Accounts_new RENAME TO Accounts;

-- Update existing accounts to have last_balance_update set to created_at
UPDATE Accounts SET last_balance_update = created_at WHERE last_balance_update IS NULL; 