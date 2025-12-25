-- Drop the existing table
DROP TABLE IF EXISTS account_field_mappings;

-- Recreate the table without unique constraints on field_name
CREATE TABLE IF NOT EXISTS account_field_mappings (
    mapping_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    csv_header TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_account_field_mappings_account_field 
ON account_field_mappings(account_id, field_name); 