# Category Monthly Totals Script
# Queries SQLite database directly for category transaction totals by month
# Outputs JSON format for data integrity verification and testing

## Basic Usage

# Use default user ID (richard) - no date filters
./server/scripts/category-monthly-totals.sh -d

# Use default user ID with date range
./server/scripts/category-monthly-totals.sh -d "2024-01-01" "2024-12-31"

# Use default user ID with start date only
./server/scripts/category-monthly-totals.sh -d "2024-01-01"

# Original usage still works (backward compatible)
./server/scripts/category-monthly-totals.sh "user-id-here" "2024-01-01" "2024-12-31"

## Output Format

The script outputs JSON with the following structure:

```json
{
  "metadata": {
    "query_timestamp": "ISO 8601 timestamp",
    "database_path": "path to database",
    "filters": {
      "user_id": "...",
      "start_date": "...",
      "end_date": "..."
    },
    "query_source": "direct_database_query",
    "data_integrity": "verified_direct_from_database"
  },
  "income": {
    "data": [...],
    "totals": {
      "total_income": 0.00,
      "total_expense": 0.00,
      "total_signed_amount": 0.00,
      "expected_signed_amount": 0.00,
      "verification_passed": true
    }
  },
  "expense": {
    "data": [...],
    "totals": {...},
    "verification_passed": true
  },
  "transfers": {
    "data": [...],
    "totals": {
      "total_signed_amount": 0.00,
      "total_income": 0.00,
      "total_expense": 0.00,
      "net": 0.00
    }
  },
  "verification": {
    "total_all_signed_amount": 0.00,
    "total_all_income": 0.00,
    "total_all_expense": 0.00,
    "calculated_total": 0.00,
    "difference": 0.00,
    "passed": true,
    "formula": "sum(total_signed_amount) = sum(income) - sum(expense)",
    "section_verifications": {
      "income_passed": true,
      "expense_passed": true
    }
  }
}
```

## Key Features

1. **Direct Database Query**: Queries SQLite database directly, bypassing application code to ensure data integrity
2. **Separated Categories**: Automatically separates income, expense, and transfer categories
3. **Data Verification**: Verifies that totals match using the formula: `sum(total_signed_amount) = sum(income) - sum(expense)`
4. **Error Reporting**: If verification fails, outputs error to stderr but still produces JSON output
5. **Exit Codes**: Returns exit code 0 if verification passes, 1 if it fails (useful for automated testing)

## Examples

# Save output to file for testing
./server/scripts/category-monthly-totals.sh -d > category-totals.json

# Verify the output is valid JSON
./server/scripts/category-monthly-totals.sh -d | python3 -m json.tool > /dev/null && echo "Valid JSON"

# Check verification status
./server/scripts/category-monthly-totals.sh -d | python3 -c "import json, sys; d=json.load(sys.stdin); print('Passed' if d['verification']['passed'] else 'Failed')"

# Filter by date range for specific user
./server/scripts/category-monthly-totals.sh "user-id-here" "2024-01-01" "2024-12-31"