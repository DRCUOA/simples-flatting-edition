# Keyword Rules Implementation

## Overview

This implementation adds a complete keyword-to-category mapping system that allows users to create rules like "if description contains X, always suggest category Y". This provides a way to override the automatic suggestion system with explicit user-defined rules.

## Database Schema

The `category_keyword_rules` table stores keyword rules:

```sql
CREATE TABLE category_keyword_rules (
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
```

## API Endpoints

All endpoints require authentication and are user-scoped (users can only manage their own rules).

### GET `/api/keyword-rules`
Get all keyword rules for the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "user-uuid",
    "keyword": "06-0273-0680494",
    "category_id": "category-uuid",
    "category_name": "abcd",
    "created_at": "2025-12-20 10:00:00",
    "updated_at": "2025-12-20 10:00:00"
  }
]
```

### POST `/api/keyword-rules`
Create a new keyword rule.

**Request Body:**
```json
{
  "keyword": "06-0273-0680494",
  "category_id": "category-uuid"
}
```

**Response:**
```json
{
  "message": "Keyword rule created successfully",
  "id": 1,
  "changes": 1
}
```

### PUT `/api/keyword-rules/:id`
Update an existing keyword rule.

**Request Body:**
```json
{
  "keyword": "new-keyword",  // Optional
  "category_id": "new-category-uuid"  // Optional
}
```

### DELETE `/api/keyword-rules/:id`
Delete a keyword rule by ID.

### DELETE `/api/keyword-rules/by-keyword`
Delete a keyword rule by keyword and category.

**Request Body:**
```json
{
  "keyword": "06-0273-0680494",
  "category_id": "category-uuid"
}
```

## How It Works

### Suggestion Priority

When generating category suggestions, the system checks in this order:

1. **Keyword Rules** (Highest Priority - 99% confidence)
   - If a keyword rule matches, it returns immediately with high confidence
   - Uses substring matching: `description LIKE '%keyword%'`
   - Longest matching keyword wins if multiple rules match

2. **Historical Transaction Patterns**
   - Searches past transactions with similar descriptions
   - Applies recency and amount similarity weighting

3. **Feedback Weighting**
   - Uses user feedback to boost/penalty categories
   - Learned from past acceptances/rejections

### Example Usage

To create a rule that maps '06-0273-0680494' to category 'abcd':

```bash
# First, get the category_id for 'abcd'
curl -X GET "http://localhost:3004/api/categories" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.[] | select(.category_name == "abcd") | .category_id'

# Then create the keyword rule
curl -X POST "http://localhost:3004/api/keyword-rules" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "06-0273-0680494",
    "category_id": "category-uuid-from-above"
  }'
```

Now, any transaction with a description containing '06-0273-0680494' will automatically suggest the 'abcd' category with 99% confidence.

## Implementation Details

### Backend Files

- **Migration**: `server/migrations/2025-12-20_add_category_keyword_rules.sql`
- **DAO**: `server/models/keyword_rules_dao.js`
- **Controller**: `server/controllers/keyword-rules-controller.js`
- **Router**: `server/routes/keyword-rules-router.js`
- **Integration**: `server/models/transaction_dao.js` (findCategoryMatches function)

### Frontend Files

- **Composable**: `client/src/composables/useCategorySuggestions.js`
  - `loadKeywordRules()` - Loads rules from API
  - `findKeywordMatch()` - Checks local keyword rules (fallback)

### Matching Logic

- **Case-insensitive**: Keywords are stored and matched in lowercase
- **Substring matching**: Uses SQL `LIKE '%keyword%'` pattern
- **Longest match wins**: If multiple keywords match, the longest one is selected
- **User-scoped**: Each user's rules only apply to their own transactions

## Benefits

1. **Explicit Control**: Users can override automatic suggestions with explicit rules
2. **High Confidence**: Keyword rules return with 99% confidence, ensuring they appear first
3. **Fast Matching**: Keyword rules are checked first before expensive historical queries
4. **User Privacy**: Rules are user-scoped, ensuring data isolation
5. **Cascade Deletion**: If a category is deleted, associated keyword rules are automatically removed

## Future Enhancements

Potential improvements:
- Bulk import/export of keyword rules
- Rule priority/ordering
- Regular expression support for more flexible matching
- Rule testing/preview before saving
- Rule usage statistics

