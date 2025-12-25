-- Migration: Add display_order field to Categories table
-- Date: 2025-11-21
-- Description: Adds display_order field to allow custom ordering of categories within their parent

BEGIN TRANSACTION;

-- Add display_order column (defaults to NULL, which means use alphabetical ordering)
ALTER TABLE Categories ADD COLUMN display_order INTEGER DEFAULT NULL;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_categories_display_order 
ON Categories(user_id, parent_category_id, display_order);

-- Initialize display_order for existing categories based on current alphabetical order
-- This ensures existing categories have a consistent order
UPDATE Categories 
SET display_order = (
  SELECT COUNT(*) 
  FROM Categories c2 
  WHERE c2.user_id = Categories.user_id 
    AND (c2.parent_category_id = Categories.parent_category_id OR (c2.parent_category_id IS NULL AND Categories.parent_category_id IS NULL))
    AND (
      c2.category_name < Categories.category_name 
      OR (c2.category_name = Categories.category_name AND c2.category_id < Categories.category_id)
    )
) + 1
WHERE display_order IS NULL;

COMMIT;

