# Statements and Reconciliation Sessions Guide

## Overview

This guide explains the relationship between **Statements** (`StatementImports`) and **Reconciliation Sessions** (`ReconciliationSessions`), and how to use the new `statement_name` feature.

---

## Two Types of Reconciliation

Your system supports **two different reconciliation workflows**:

### 1. **CSV File Import** (Statement-Based Reconciliation)
**When:** You have a CSV file from your bank with statement lines

**What Happens:**
```
CSV File Upload
    ↓
StatementImport created (with statement_name)
    ↓
StatementLines created (one per CSV row)
    ↓
ReconciliationSession created (optional)
    ↓
ReconciliationMatches link Transactions ↔ StatementLines
```

**Tables Involved:**
- `StatementImports` - Metadata about the CSV file
- `StatementLines` - Individual transactions from CSV
- `ReconciliationSessions` - Optional session for matching
- `ReconciliationMatches` - Links Transactions to StatementLines

### 2. **Manual Reconciliation** (Session-Based Reconciliation)
**When:** You manually reconcile transactions against bank statement balances

**What Happens:**
```
Create Reconciliation Session
    ↓
StatementImport created (with statement_name) ← NEW!
    ↓
ReconciliationSession created
    ↓
Transactions marked as reconciled (no StatementLines)
    ↓
ReconciliationMatches created (statement_line_id = NULL)
```

**Tables Involved:**
- `StatementImports` - Metadata about the reconciliation period
- `ReconciliationSessions` - The actual reconciliation session
- `ReconciliationMatches` - Marks transactions as reconciled (no StatementLines)

---

## Key Concept: StatementImports Serve Dual Purpose

`StatementImports` is used for **both** workflows:

1. **CSV Import Workflow:** Tracks imported CSV files
   - Has `StatementLines` (the CSV rows)
   - Has `source_filename` (the CSV file name)
   - Has `statement_name` (user-friendly name)

2. **Manual Reconciliation Workflow:** Tracks reconciliation periods
   - No `StatementLines` (manual reconciliation)
   - Has `source_filename` (auto-generated: "Reconciliation Session...")
   - Has `statement_name` (user-friendly name) ← **NEW FEATURE**

---

## The New `statement_name` Feature

### What It Does
- Allows you to **tag/name** any StatementImport with a custom name
- **NOT NULL** - Every statement must have a name
- **UNIQUE** - No two statements can have the same name
- Helps organize and identify statements in the UI

### Where You See It

1. **Account Detail View** (`/accounts/:id`)
   - Go to "Statement Imports" tab
   - See statement names displayed prominently
   - Click the name or ✏️ icon to edit inline

2. **Reconciliation View** (`/reconciliation`)
   - When creating a reconciliation session, you can optionally provide `statement_name`
   - If not provided, defaults to: `"Reconciliation Session {session_id}"`

### How to Use It

#### For CSV Imports:
```javascript
// When importing CSV via API
POST /api/statements/import
{
  "account_id": "...",
  "statement_name": "January 2025 Bank Statement",  // ← Optional
  "statement_from": "2025-01-01",
  "statement_to": "2025-01-31",
  // ... other fields
}
```

#### For Manual Reconciliation:
```javascript
// When creating reconciliation session
POST /api/recon/sessions
{
  "account_id": "...",
  "statement_name": "Q1 2025 Reconciliation",  // ← Optional
  "period_start": "2025-01-01",
  "period_end": "2025-03-31",
  // ... other fields
}
```

#### Update Existing Statement Name:
```javascript
// Update any statement name
PATCH /api/statements/:id/name
{
  "statement_name": "Updated Name"
}
```

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌──────────────────┐
│ CSV Import    │                      │ Manual Recon     │
│ Workflow      │                      │ Workflow         │
└───────────────┘                      └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│ StatementImport       │              │ StatementImport       │
│ - statement_name ✓   │              │ - statement_name ✓   │
│ - source_filename    │              │ - source_filename    │
│ - statement_from     │              │ - statement_from     │
│ - statement_to       │              │ - statement_to       │
└──────────────────────┘              └──────────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│ StatementLines       │              │ ReconciliationSession│
│ (CSV rows)           │              │ - session_id        │
│                      │              │ - period_start      │
└──────────────────────┘              │ - period_end        │
        │                              │ - variance         │
        ▼                              └──────────────────────┘
┌──────────────────────┐                      │
│ ReconciliationSession│                      │
│ (optional)           │                      │
└──────────────────────┘                      │
        │                                     │
        └──────────────┬──────────────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ ReconciliationMatches│
              │ - Links Transactions │
              │   to StatementLines  │
              │   (or NULL for manual)│
              └──────────────────────┘
```

---

## Common Use Cases

### Use Case 1: Monthly Bank Statement Import
1. Bank sends CSV file: `january_statement.csv`
2. Import via UI or API
3. System creates:
   - `StatementImport` with `statement_name` = "January 2025 Statement"
   - `StatementLines` for each CSV row
4. Reconcile transactions against statement lines

### Use Case 2: Manual Quarterly Reconciliation
1. Go to Reconciliation view
2. Create new session:
   - Period: Jan 1 - Mar 31, 2025
   - Statement Name: "Q1 2025 Reconciliation"
3. System creates:
   - `StatementImport` with `statement_name` = "Q1 2025 Reconciliation"
   - `ReconciliationSession` for the period
4. Manually tick transactions that match your bank statement
5. Complete when balance reconciles

### Use Case 3: Rename Existing Statement
1. Go to Account Detail → Statement Imports tab
2. Click ✏️ icon next to statement name
3. Enter new name: "2025 Tax Year Reconciliation"
4. System updates `statement_name` (must be unique)

---

## Database Schema Summary

### StatementImports Table
```sql
CREATE TABLE StatementImports (
  import_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  statement_name TEXT NOT NULL UNIQUE,  -- ← NEW!
  source_filename TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  bank_name TEXT,
  statement_from TEXT NOT NULL,
  statement_to TEXT NOT NULL,
  opening_balance REAL,
  closing_balance REAL,
  status TEXT,
  integrity_status TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### ReconciliationSessions Table
```sql
CREATE TABLE ReconciliationSessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  start_balance REAL,
  closing_balance REAL,
  variance REAL,
  closed INTEGER DEFAULT 0,
  params_json TEXT,
  run_started TEXT
);
```

**Key Relationship:**
- `ReconciliationSessions` can optionally create a `StatementImport`
- `StatementImport.statement_name` helps identify what the reconciliation was for
- Both track similar metadata (dates, balances) but serve different purposes

---

## UI Locations

### Where to See Statement Names:

1. **Account Detail View** (`/accounts/:id`)
   - Tab: "Statement Imports"
   - Shows all `StatementImports` for the account
   - Displays `statement_name` prominently
   - Click to edit inline

2. **Reconciliation View** (`/reconciliation`)
   - When creating a session, you can optionally set `statement_name`
   - The created `StatementImport` will use this name

### Where Statement Names Are NOT Shown:

- Transaction lists (statements are metadata, not transactions)
- Reconciliation session lists (sessions have their own display)

---

## API Endpoints

### Create Statement (CSV Import)
```http
POST /api/statements/import
Content-Type: multipart/form-data

{
  "file": <CSV file>,
  "account_id": "...",
  "statement_name": "Optional Name",  // ← NEW!
  "statement_from": "2025-01-01",
  "statement_to": "2025-01-31",
  "opening_balance": 1000.00,
  "closing_balance": 1500.00
}
```

### Create Reconciliation Session
```http
POST /api/recon/sessions

{
  "account_id": "...",
  "statement_name": "Optional Name",  // ← NEW!
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "start_balance": 1000.00,
  "closing_balance": 1500.00
}
```

### Update Statement Name
```http
PATCH /api/statements/:id/name

{
  "statement_name": "New Name"
}
```

### Get Statements
```http
GET /api/statements?account_id=...

Response:
[
  {
    "import_id": "...",
    "statement_name": "January 2025 Statement",  // ← NEW!
    "source_filename": "january.csv",
    "statement_from": "2025-01-01",
    "statement_to": "2025-01-31",
    "status": "completed",
    ...
  }
]
```

---

## Best Practices

1. **Use Descriptive Names**
   - ✅ Good: "January 2025 Bank Statement"
   - ✅ Good: "Q1 2025 Reconciliation"
   - ❌ Bad: "Statement" (too generic, will conflict)

2. **Include Dates in Names**
   - Helps identify statements quickly
   - Example: "2025-01 Bank Statement"

3. **Be Consistent**
   - Use same naming pattern across statements
   - Example: Always use "YYYY-MM Description" format

4. **Unique Names Required**
   - System enforces uniqueness
   - If duplicate, you'll get a 409 Conflict error
   - Use suffixes if needed: "January 2025 (1)", "January 2025 (2)"

---

## Troubleshooting

### Error: "Statement name already exists"
- **Cause:** UNIQUE constraint violation
- **Solution:** Choose a different name or add a suffix

### Error: "Statement name cannot be empty"
- **Cause:** NOT NULL constraint
- **Solution:** Provide a non-empty name

### Statement name not showing in UI
- **Check:** Make sure you're looking at Account Detail → Statement Imports tab
- **Check:** Verify the migration ran successfully
- **Check:** Ensure `statement_name` column exists in database

---

## Summary

- **StatementImports** = Metadata about statements (CSV imports OR manual reconciliation periods)
- **ReconciliationSessions** = Actual reconciliation work sessions
- **statement_name** = User-friendly tag for organizing statements
- **Two workflows:** CSV import (with StatementLines) vs Manual reconciliation (without StatementLines)
- **Both create StatementImports** but for different purposes

The `statement_name` feature helps you organize and identify statements regardless of which workflow you use!







