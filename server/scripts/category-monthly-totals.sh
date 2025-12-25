#!/bin/bash

# Script to query SQLite database for category monthly transaction totals
# Output: JSON format for direct database verification and testing
# Usage: 
#   ./category-monthly-totals.sh [-d] [user_id] [start_date] [end_date]
#   ./category-monthly-totals.sh -d [start_date] [end_date]
# Options:
#   -d              Use default user ID (richard)
#   user_id:        Optional user_id filter (default: all users, unless -d is used)
#   start_date:     Optional start date filter in YYYY-MM-DD format (default: all dates)
#   end_date:       Optional end date filter in YYYY-MM-DD format (default: all dates)
# 
# Output Format:
#   JSON object with metadata and data array:
#   {
#     "metadata": {
#       "query_timestamp": "ISO 8601 timestamp",
#       "database_path": "path to database file",
#       "filters": { "user_id": "...", "start_date": "...", "end_date": "..." },
#       "query_source": "direct_database_query",
#       "data_integrity": "verified_direct_from_database"
#     },
#     "data": [
#       {
#         "category_id": "...",
#         "category_name": "...",
#         "parent_category_id": "...",
#         "user_id": "...",
#         "month": "YYYY-MM",
#         "transaction_count": 0,
#         "total_signed_amount": 0.00,
#         "income": 0.00,
#         "expense": 0.00
#       }
#     ]
#   }

# Default user ID for richard
DEFAULT_USER_ID="2179a18e-06e1-4af3-816e-6d26cc0ee3d7"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="${SCRIPT_DIR}/../database.sqlite"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH" >&2
    exit 1
fi

# Parse arguments
USE_DEFAULT=false
USER_ID=""
START_DATE=""
END_DATE=""

# Check for -d flag
if [ "$1" = "-d" ]; then
    USE_DEFAULT=true
    USER_ID="$DEFAULT_USER_ID"
    shift  # Remove -d from arguments
    # Remaining arguments are start_date and end_date
    START_DATE="${1:-}"
    END_DATE="${2:-}"
else
    # Use positional arguments (backward compatible)
    USER_ID="${1:-}"
    START_DATE="${2:-}"
    END_DATE="${3:-}"
fi

# Build WHERE clause conditions
WHERE_CLAUSES=()

if [ -n "$USER_ID" ]; then
    WHERE_CLAUSES+=("c.user_id = \"$USER_ID\"")
    WHERE_CLAUSES+=("t.user_id = \"$USER_ID\"")
fi

if [ -n "$START_DATE" ]; then
    WHERE_CLAUSES+=("DATE(t.transaction_date) >= DATE(\"$START_DATE\")")
fi

if [ -n "$END_DATE" ]; then
    WHERE_CLAUSES+=("DATE(t.transaction_date) <= DATE(\"$END_DATE\")")
fi

# Build WHERE clause string
WHERE_CLAUSE=""
if [ ${#WHERE_CLAUSES[@]} -gt 0 ]; then
    # Join array elements with " AND "
    FIRST=true
    for clause in "${WHERE_CLAUSES[@]}"; do
        if [ "$FIRST" = true ]; then
            WHERE_CLAUSE="WHERE $clause"
            FIRST=false
        else
            WHERE_CLAUSE="$WHERE_CLAUSE AND $clause"
        fi
    done
fi

# SQL Query to get all categories with their monthly transaction totals
# Identifies transfers by checking root category name
# Using ROUND() to ensure proper currency precision (2 decimal places)
SQL_QUERY="
WITH RECURSIVE CategoryRoots AS (
    -- Find ultimate root parent for each category
    SELECT 
        category_id,
        category_name,
        parent_category_id,
        category_id as root_id,
        category_name as root_name,
        0 as level
    FROM Categories
    WHERE parent_category_id IS NULL
    
    UNION ALL
    
    SELECT 
        c.category_id,
        c.category_name,
        c.parent_category_id,
        cr.root_id,
        cr.root_name,
        cr.level + 1
    FROM Categories c
    INNER JOIN CategoryRoots cr ON c.parent_category_id = cr.category_id
)
SELECT 
    c.category_id,
    c.category_name,
    c.parent_category_id,
    c.user_id,
    cr.root_id,
    cr.root_name,
    CASE 
        WHEN LOWER(cr.root_name) LIKE '%transfer%' THEN 1
        ELSE 0
    END as is_transfer,
    strftime('%Y-%m', t.transaction_date) AS month,
    COUNT(t.transaction_id) AS transaction_count,
    CAST(ROUND(SUM(t.signed_amount), 2) AS NUMERIC) AS total_signed_amount,
    CAST(ROUND(SUM(CASE WHEN t.signed_amount >= 0 THEN t.signed_amount ELSE 0 END), 2) AS NUMERIC) AS income,
    CAST(ROUND(SUM(CASE WHEN t.signed_amount < 0 THEN ABS(t.signed_amount) ELSE 0 END), 2) AS NUMERIC) AS expense
FROM Categories c
INNER JOIN Transactions t ON c.category_id = t.category_id
INNER JOIN CategoryRoots cr ON c.category_id = cr.category_id
$WHERE_CLAUSE
GROUP BY c.category_id, c.category_name, c.parent_category_id, c.user_id, cr.root_id, cr.root_name, month
ORDER BY c.category_name, month;
"

# Alternative query: Show ALL categories including those with zero transactions
# Uncomment the following lines and comment out the above SQL_QUERY to use this version
# SQL_QUERY="
# SELECT 
#     c.category_id,
#     c.category_name,
#     c.parent_category_id,
#     c.user_id,
#     strftime('%Y-%m', t.transaction_date) AS month,
#     COUNT(t.transaction_id) AS transaction_count,
#     COALESCE(SUM(t.signed_amount), 0) AS total_signed_amount,
#     COALESCE(SUM(CASE WHEN t.signed_amount >= 0 THEN t.signed_amount ELSE 0 END), 0) AS income,
#     COALESCE(SUM(CASE WHEN t.signed_amount < 0 THEN ABS(t.signed_amount) ELSE 0 END), 0) AS expense
# FROM Categories c
# LEFT JOIN Transactions t ON c.category_id = t.category_id
#     $WHERE_CLAUSE
# GROUP BY c.category_id, c.category_name, c.parent_category_id, c.user_id, month
# ORDER BY c.category_name, month;
# "

# Execute the query and output as JSON
# Use sqlite3's JSON mode to get clean JSON output
TEMP_OUTPUT=$(mktemp)
sqlite3 -json "$DB_PATH" "$SQL_QUERY" > "$TEMP_OUTPUT"

# Check if query was successful
if [ $? -ne 0 ]; then
    echo "Error: Query failed" >&2
    rm -f "$TEMP_OUTPUT"
    exit 1
fi

# Process the data to separate income, expense, and transfers, and verify totals
TEMP_PROCESSED=$(mktemp)
TEMP_PYTHON_SCRIPT=$(mktemp)

# Create Python script to process JSON
cat > "$TEMP_PYTHON_SCRIPT" << 'PYTHON_SCRIPT'
import json
import sys

input_file = sys.argv[1]
output_file = sys.argv[2]

try:
    # Read the raw data
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        if not content:
            all_data = []
        else:
            all_data = json.loads(content)
    
    if not isinstance(all_data, list):
        all_data = []
    
    # Separate into income, expense, and transfers
    income_data = []
    expense_data = []
    transfer_data = []
    
    for item in all_data:
        if item.get('is_transfer', 0) == 1:
            transfer_data.append(item)
        else:
            # Determine if income or expense based on totals
            # If income > expense, it's income category, otherwise expense
            if item.get('income', 0) > item.get('expense', 0):
                income_data.append(item)
            else:
                expense_data.append(item)
    
    # Calculate totals for each section
    income_total_income = sum(float(item.get('income', 0)) for item in income_data)
    income_total_expense = sum(float(item.get('expense', 0)) for item in income_data)
    income_total_signed = sum(float(item.get('total_signed_amount', 0)) for item in income_data)
    
    expense_total_income = sum(float(item.get('income', 0)) for item in expense_data)
    expense_total_expense = sum(float(item.get('expense', 0)) for item in expense_data)
    expense_total_signed = sum(float(item.get('total_signed_amount', 0)) for item in expense_data)
    
    transfer_total_signed = sum(float(item.get('total_signed_amount', 0)) for item in transfer_data)
    transfer_total_income = sum(float(item.get('income', 0)) for item in transfer_data)
    transfer_total_expense = sum(float(item.get('expense', 0)) for item in transfer_data)
    
    # Calculate grand totals
    total_all_signed = sum(float(item.get('total_signed_amount', 0)) for item in all_data)
    total_all_income = sum(float(item.get('income', 0)) for item in all_data)
    total_all_expense = sum(float(item.get('expense', 0)) for item in all_data)
    
    # Verify: total_signed_amount should equal income - expense for all categories
    # Expected: sum of all total_signed_amount = sum of all (income - expense)
    expected_total = total_all_income - total_all_expense
    
    # Also verify section totals
    income_expected = income_total_income - income_total_expense
    expense_expected = expense_total_income - expense_total_expense
    
    # Verify totals match (allow small floating point differences)
    verification_passed = abs(total_all_signed - expected_total) < 0.01
    income_verification_passed = abs(income_total_signed - income_expected) < 0.01
    expense_verification_passed = abs(expense_total_signed - expense_expected) < 0.01
    
    all_verifications_passed = verification_passed and income_verification_passed and expense_verification_passed
    
    # Build output structure
    output = {
        "income": {
            "data": income_data,
            "totals": {
                "total_income": round(income_total_income, 2),
                "total_expense": round(income_total_expense, 2),
                "total_signed_amount": round(income_total_signed, 2),
                "expected_signed_amount": round(income_expected, 2),
                "verification_passed": income_verification_passed
            }
        },
        "expense": {
            "data": expense_data,
            "totals": {
                "total_income": round(expense_total_income, 2),
                "total_expense": round(expense_total_expense, 2),
                "total_signed_amount": round(expense_total_signed, 2),
                "expected_signed_amount": round(expense_expected, 2),
                "verification_passed": expense_verification_passed
            }
        },
        "transfers": {
            "data": transfer_data,
            "totals": {
                "total_signed_amount": round(transfer_total_signed, 2),
                "total_income": round(transfer_total_income, 2),
                "total_expense": round(transfer_total_expense, 2),
                "net": round(transfer_total_income - transfer_total_expense, 2)
            }
        },
        "verification": {
            "total_all_signed_amount": round(total_all_signed, 2),
            "total_all_income": round(total_all_income, 2),
            "total_all_expense": round(total_all_expense, 2),
            "calculated_total": round(expected_total, 2),
            "difference": round(abs(total_all_signed - expected_total), 2),
            "passed": all_verifications_passed,
            "formula": "sum(total_signed_amount) = sum(income) - sum(expense)",
            "section_verifications": {
                "income_passed": income_verification_passed,
                "expense_passed": expense_verification_passed
            }
        }
    }
    
    # Write processed data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    # Exit with error code if verification failed
    sys.exit(0 if all_verifications_passed else 1)
    
except Exception as e:
    import traceback
    # On error, output error message and exit with error code
    error_output = {
        "error": str(e),
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc(),
        "raw_data_file": input_file
    }
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(error_output, f, indent=2)
    sys.exit(1)
PYTHON_SCRIPT

# Execute Python script
python3 "$TEMP_PYTHON_SCRIPT" "$TEMP_OUTPUT" "$TEMP_PROCESSED"

VERIFICATION_EXIT_CODE=$?

# Build metadata JSON and merge with processed data using jq
TEMP_METADATA=$(mktemp)
python3 -c "
import json
from datetime import datetime

metadata = {
    'query_timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'database_path': '$DB_PATH',
    'filters': {
        'user_id': '$USER_ID' if '$USER_ID' else None,
        'start_date': '$START_DATE' if '$START_DATE' else None,
        'end_date': '$END_DATE' if '$END_DATE' else None
    },
    'query_source': 'direct_database_query',
    'data_integrity': 'verified_direct_from_database'
}

with open('$TEMP_METADATA', 'w') as f:
    json.dump(metadata, f)
"

# Generate output filename with date and user ID
CURRENT_DATE=$(date +"%d%m%Y")
if [ -n "$USER_ID" ]; then
    OUTPUT_USER_ID="$USER_ID"
else
    OUTPUT_USER_ID="all"
fi
OUTPUT_FILE="categoryVerificationrunon_${CURRENT_DATE}_UserId_${OUTPUT_USER_ID}.json"

# Merge metadata with processed data using jq and capture output
TEMP_JSON_OUTPUT=$(mktemp)
if command -v jq >/dev/null 2>&1; then
    jq --slurpfile metadata "$TEMP_METADATA" --slurpfile processed "$TEMP_PROCESSED" -n '{metadata: $metadata[0], income: $processed[0].income, expense: $processed[0].expense, transfers: $processed[0].transfers, verification: $processed[0].verification}' > "$TEMP_JSON_OUTPUT"
else
    # Fallback: use Python for merging
    python3 -c "
import json

with open('$TEMP_METADATA', 'r') as f:
    metadata = json.load(f)

with open('$TEMP_PROCESSED', 'r') as f:
    processed = json.load(f)

output = {
    'metadata': metadata,
    'income': processed.get('income', {}),
    'expense': processed.get('expense', {}),
    'transfers': processed.get('transfers', {}),
    'verification': processed.get('verification', {})
}

with open('$TEMP_JSON_OUTPUT', 'w') as f:
    json.dump(output, f, indent=2)
"
fi

# Output to terminal
cat "$TEMP_JSON_OUTPUT"

# Save to file in the current working directory
cp "$TEMP_JSON_OUTPUT" "$OUTPUT_FILE"
echo "" >&2
echo "Output saved to: $OUTPUT_FILE" >&2

# Clean up
rm -f "$TEMP_METADATA" "$TEMP_JSON_OUTPUT"

# Check verification and output error if failed
if [ $VERIFICATION_EXIT_CODE -ne 0 ]; then
    echo "" >&2
    echo "ERROR: Verification failed! Totals do not match." >&2
    echo "Check the 'verification' section in the JSON output for details." >&2
fi

# Clean up temp files
rm -f "$TEMP_OUTPUT" "$TEMP_PROCESSED" "$TEMP_PYTHON_SCRIPT"

# Exit with error code if verification failed, but still output the data
exit $VERIFICATION_EXIT_CODE

