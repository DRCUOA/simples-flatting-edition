BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "messages" (
	"id"	INTEGER,
	"message"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "Users" (
	"user_id"	TEXT,
	"username"	TEXT NOT NULL UNIQUE,
	"email"	TEXT NOT NULL UNIQUE,
	"password_hash"	TEXT NOT NULL,
	"created_at"	TEXT DEFAULT (datetime('now')),
	"last_login"	TEXT,
	"role"	TEXT DEFAULT 'user',
	PRIMARY KEY("user_id")
);
CREATE TABLE IF NOT EXISTS "Categories" (
	"category_id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"category_name"	TEXT NOT NULL,
	"parent_category_id"	TEXT,
	"budgeted_amount"	REAL DEFAULT 0.0,
	"updated_at"	TEXT,
	FOREIGN KEY("user_id") REFERENCES "Users"("user_id"),
	FOREIGN KEY("parent_category_id") REFERENCES "Categories"("category_id"),
	PRIMARY KEY("category_id")
);
CREATE TABLE IF NOT EXISTS "Transactions" (
	"transaction_id"	TEXT,
	"transaction_date"	TEXT NOT NULL,
	"description"	TEXT,
	"amount"	REAL NOT NULL,
	"signed_amount"	REAL,
	"category_id"	TEXT,
	"account_id"	TEXT NOT NULL,
	"transaction_type"	TEXT NOT NULL,
	"linked_transaction_id"	TEXT,
	"created_at"	TEXT DEFAULT (datetime('now')),
	"import_id"	TEXT NOT NULL DEFAULT 'default',
	"dedupe_hash"	TEXT,
	"is_reconciled"	BOOLEAN NOT NULL DEFAULT 0,
	"statement_id"	TEXT,
	"reconciled_at"	TEXT,
	"user_id"	TEXT,
	"is_transfer"	INTEGER DEFAULT 0,
	"posted_status"	TEXT DEFAULT 'posted',
	FOREIGN KEY("account_id") REFERENCES "Accounts"("account_id"),
	FOREIGN KEY("category_id") REFERENCES "Categories"("category_id"),
	FOREIGN KEY("linked_transaction_id") REFERENCES "Transactions"("transaction_id"),
	PRIMARY KEY("transaction_id")
);
CREATE TABLE IF NOT EXISTS "CSVImportLog" (
	"import_id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"import_date"	TEXT NOT NULL DEFAULT (datetime('now')),
	"file_name"	TEXT NOT NULL,
	"records_imported"	INTEGER NOT NULL,
	"notes"	TEXT,
	FOREIGN KEY("user_id") REFERENCES "Users"("user_id"),
	PRIMARY KEY("import_id")
);
CREATE TABLE IF NOT EXISTS "transaction_imports" (
	"id"	TEXT NOT NULL,
	"import_date"	TEXT NOT NULL,
	"status"	TEXT NOT NULL,
	"error_message"	TEXT,
	"created_at"	TEXT DEFAULT (datetime('now')),
	"user_id"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "account_field_mappings" (
	"mapping_id"	TEXT,
	"account_id"	TEXT NOT NULL,
	"field_name"	TEXT NOT NULL,
	"csv_header"	TEXT NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"user_id"	TEXT,
	FOREIGN KEY("account_id") REFERENCES "accounts"("account_id") ON DELETE CASCADE,
	PRIMARY KEY("mapping_id")
);
CREATE TABLE IF NOT EXISTS "Accounts" (
	"account_id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"account_name"	TEXT NOT NULL,
	"account_type"	TEXT NOT NULL,
	"current_balance"	REAL NOT NULL DEFAULT 0,
	"positive_is_credit"	INTEGER NOT NULL DEFAULT 1,
	"last_balance_update"	TEXT DEFAULT (datetime('now')),
	"created_at"	TEXT DEFAULT (datetime('now')),
	"account_class"	TEXT DEFAULT 'asset' CHECK("account_class" IN ('asset', 'liability', 'equity')),
	"is_system_account"	INTEGER DEFAULT 0,
	"equity_last_reconciled"	TEXT,
	"equity_reconciliation_note"	TEXT,
	PRIMARY KEY("account_id")
);
CREATE TABLE IF NOT EXISTS "category_keyword_rules" (
	"keyword"	TEXT NOT NULL,
	"category_id"	TEXT NOT NULL,
	"created_at"	TEXT DEFAULT (datetime('now')),
	FOREIGN KEY("category_id") REFERENCES "Categories"("category_id") ON DELETE CASCADE,
	PRIMARY KEY("keyword","category_id")
);
CREATE TABLE IF NOT EXISTS "category_suggestions" (
	"id"	INTEGER,
	"transaction_id"	TEXT NOT NULL UNIQUE,
	"description"	TEXT,
	"amount"	REAL,
	"suggested_category_id"	TEXT NOT NULL,
	"confidence_score"	REAL,
	"accepted"	BOOLEAN,
	"feedback_timestamp"	TEXT,
	FOREIGN KEY("suggested_category_id") REFERENCES "Categories"("category_id") ON DELETE CASCADE,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "UserPreferences" (
	"preference_id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"preference_key"	TEXT NOT NULL,
	"preference_value"	TEXT NOT NULL,
	"created_at"	TEXT DEFAULT (datetime('now')),
	"updated_at"	TEXT DEFAULT (datetime('now')),
	FOREIGN KEY("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE,
	PRIMARY KEY("preference_id"),
	UNIQUE("user_id","preference_key")
);
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "Transactions" (
	"transaction_date"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_account" ON "Transactions" (
	"account_id"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_category" ON "Transactions" (
	"category_id"
);
CREATE INDEX IF NOT EXISTS "idx_account_field_mappings_account_field" ON "account_field_mappings" (
	"account_id",
	"field_name"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_account_dedupe" ON "Transactions" (
	"account_id",
	"dedupe_hash"
);
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_key" ON "UserPreferences" (
	"user_id",
	"preference_key"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_reconciled" ON "Transactions" (
	"is_reconciled"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_statement" ON "Transactions" (
	"statement_id"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_account_reconciled" ON "Transactions" (
	"account_id",
	"is_reconciled"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_reconciliation_lookup" ON "Transactions" (
	"account_id",
	"transaction_date",
	"is_reconciled"
);
CREATE INDEX IF NOT EXISTS "idx_tx_user_id" ON "Transactions" (
	"user_id"
);
CREATE INDEX IF NOT EXISTS "idx_afm_user_id" ON "account_field_mappings" (
	"user_id"
);
CREATE INDEX IF NOT EXISTS "idx_tx_user_acct_date" ON "Transactions" (
	"user_id",
	"account_id",
	"transaction_date"
);
CREATE INDEX IF NOT EXISTS "idx_tx_user_cat_date" ON "Transactions" (
	"user_id",
	"category_id",
	"transaction_date"
);
CREATE INDEX IF NOT EXISTS "idx_categories_updated_at" ON "Categories" (
	"updated_at"	DESC
);
CREATE INDEX IF NOT EXISTS "idx_accounts_class" ON "Accounts" (
	"account_class",
	"user_id"
);
CREATE INDEX IF NOT EXISTS "idx_accounts_system" ON "Accounts" (
	"is_system_account",
	"user_id"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_is_transfer" ON "Transactions" (
	"is_transfer"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_posted_status" ON "Transactions" (
	"posted_status"
);
CREATE INDEX IF NOT EXISTS "idx_transactions_actuals_filter" ON "Transactions" (
	"user_id",
	"transaction_date",
	"posted_status",
	"is_transfer"
);
CREATE INDEX IF NOT EXISTS "idx_user_preferences_timezone" ON "UserPreferences" (
	"user_id",
	"preference_key"
) WHERE "preference_key" = 'user.timezone';
CREATE TRIGGER "set_reconciled_timestamp"
BEFORE UPDATE ON "Transactions"
WHEN NEW.is_reconciled = 1 AND OLD.is_reconciled = 0
BEGIN
    UPDATE "Transactions" 
    SET "reconciled_at" = datetime('now')
    WHERE "transaction_id" = NEW.transaction_id;
END;
CREATE TRIGGER "clear_reconciled_timestamp"
BEFORE UPDATE ON "Transactions"
WHEN NEW.is_reconciled = 0 AND OLD.is_reconciled = 1
BEGIN
    UPDATE "Transactions" 
    SET "reconciled_at" = NULL
    WHERE "transaction_id" = NEW.transaction_id;
END;
CREATE TRIGGER categories_updated_at
AFTER UPDATE ON Categories
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE Categories SET updated_at = datetime('now') WHERE category_id = NEW.category_id;
END;
COMMIT;
