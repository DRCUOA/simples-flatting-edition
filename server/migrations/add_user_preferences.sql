-- Migration to add user preferences table
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "preference_id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "preference_key" TEXT NOT NULL,
    "preference_value" TEXT NOT NULL,
    "created_at" TEXT DEFAULT (datetime('now')),
    "updated_at" TEXT DEFAULT (datetime('now')),
    FOREIGN KEY("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE,
    UNIQUE("user_id", "preference_key")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_key" ON "UserPreferences" ("user_id", "preference_key");
