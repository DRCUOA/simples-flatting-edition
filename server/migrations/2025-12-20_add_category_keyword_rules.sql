-- Migration: Add Category Keyword Rules Table
-- Date: 2025-12-20
-- Description: Creates category_keyword_rules table for user-defined keyword-to-category mappings
--              This allows users to create rules like "if description contains X, suggest category Y"

BEGIN TRANSACTION;

-- Create category_keyword_rules table
CREATE TABLE IF NOT EXISTS category_keyword_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, keyword, category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keyword_rules_user_id ON category_keyword_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_keyword ON category_keyword_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_category_id ON category_keyword_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_user_keyword ON category_keyword_rules(user_id, keyword);

COMMIT;

