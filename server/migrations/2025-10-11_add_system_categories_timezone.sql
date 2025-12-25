-- Migration: Add System Categories and Timezone Preferences
-- Date: 2025-10-11
-- Description: Creates UNCAT system category for each user and adds timezone preferences
-- Supports proper uncategorised transaction handling and timezone-aware month boundaries

BEGIN TRANSACTION;

-- Create UNCAT system category for each existing user
-- Category ID format: UNCAT-{user_id}
INSERT INTO Categories (category_id, user_id, category_name, parent_category_id, budgeted_amount, updated_at)
SELECT 
    'UNCAT-' || user_id as category_id,
    user_id,
    'Uncategorised' as category_name,
    NULL as parent_category_id,
    0.0 as budgeted_amount,
    datetime('now') as updated_at
FROM Users
WHERE NOT EXISTS (
    SELECT 1 FROM Categories c 
    WHERE c.category_id = 'UNCAT-' || Users.user_id
);

-- Add timezone preference for all existing users
-- Default to Pacific/Auckland (New Zealand timezone)
INSERT OR IGNORE INTO UserPreferences (preference_id, user_id, preference_key, preference_value, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))) as preference_id,
    user_id,
    'user.timezone' as preference_key,
    'Pacific/Auckland' as preference_value,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM Users
WHERE NOT EXISTS (
    SELECT 1 FROM UserPreferences up 
    WHERE up.user_id = Users.user_id 
    AND up.preference_key = 'user.timezone'
);

-- Create index for efficient timezone lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_timezone 
ON UserPreferences(user_id, preference_key) 
WHERE preference_key = 'user.timezone';

COMMIT;

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM Categories WHERE category_name = 'Uncategorised') as uncat_categories_count,
    (SELECT COUNT(*) FROM UserPreferences WHERE preference_key = 'user.timezone') as timezone_prefs_count,
    (SELECT COUNT(*) FROM Users) as total_users;

