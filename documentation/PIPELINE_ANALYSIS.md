# Data Pipeline Analysis: Current State vs. 7-Stage Architecture

## Executive Summary

This document analyzes the current implementation against the proposed 7-stage data pipeline architecture for statement/transaction imports. The analysis reveals that while the system has foundational pieces in place, several critical layers are missing or only partially implemented.

---

## Stage-by-Stage Assessment

### 1. Ingestion Layer – "Get It In, Don't Trust It"

**Status: P (Partially Implemented)**

**What Exists:**
- ✅ File upload via multer middleware (`server/routes/statement-router.js`, `server/routes/transaction-router.js`)
- ✅ `StatementImports` table with:
  - `import_id`, `user_id`, `account_id`
  - `source_filename`
  - `source_hash` (SHA-256 of file buffer) for deduplication
  - `statement_from`, `statement_to`, `closing_balance`
  - `created_at`
- ✅ Raw file buffer stored in memory during processing (`statement-controller.js:229`)
- ✅ Import record created before processing (`statement-controller.js:230-239`)

**What's Missing:**
- ❌ No `status` field on `StatementImports` table (no `pending`, `processing`, `failed`, `completed` tracking)
- ❌ No persistent storage of raw file (file buffer only used for hash, then deleted)
- ❌ No `raw_file_path` or `raw_file_blob` column to store actual file content
- ❌ File deleted immediately after processing (`statement-controller.js:270`, `transaction-controller.js:361`)
- ❌ No ability to reprocess from raw file later
- ❌ No `updated_at` field for status tracking

**Current Flow:**
```
Upload → Parse CSV → Create Import Record → Process → Delete File
```

**Required Flow:**
```
Upload → Store Raw File → Create Import Job (status='pending') → Set status='processing' → Process → Set status='completed'/'failed'
```

---

### 2. Parsing Layer – "Make It Structured, Still Not Trusted"

**Status: P (Partially Implemented)**

**What Exists:**
- ✅ CSV parsing via `csv-parse` library
- ✅ Format detection (`detectFormat`, `validateFormat` in `formatDetector.js`)
- ✅ Basic header validation (bank-ledger vs card formats)
- ✅ `StatementLines.raw_row_json` field stores full row as JSON
- ✅ Row-level error handling (try/catch in `statement-controller.js:246-263`)

**What's Missing:**
- ❌ No `statement_raw_row` table (no intermediate parsing layer)
- ❌ No `raw_row_number` tracking
- ❌ No `parse_status` field (`ok` vs `invalid`)
- ❌ No `parse_error` field for storing validation errors
- ❌ Parsing happens inline during import, not as separate stage
- ❌ Invalid rows are silently skipped (errorCount incremented but no record of why)
- ❌ No explicit "required columns present?" check before mapping

**Current Flow:**
```
Parse CSV → Map Row → Insert StatementLine (or skip on error)
```

**Required Flow:**
```
Parse CSV → Create statement_raw_row (parse_status='ok'/'invalid') → Store parse_error if invalid → Process only 'ok' rows
```

---

### 3. Normalisation & Enrichment – "Turn It Into a Transaction Candidate"

**Status: P (Partially Implemented)**

**What Exists:**
- ✅ Date normalization (`normalizeDate` in `statementNormalizer.js`)
- ✅ Description normalization (`normalizeDescription` in `statementNormalizer.js`)
- ✅ Signed amount calculation (`calculateSignedAmount` utility)
- ✅ Dedupe hash generation (`generateDedupeHash` in `statementNormalizer.js`)
- ✅ Transaction type normalization (for card statements)
- ✅ `StatementLines` table has normalized fields:
  - `txn_date` (ISO format)
  - `signed_amount`
  - `description_norm`
  - `transaction_type_norm`
  - `dedupe_hash`

**What's Missing:**
- ❌ No `transaction_candidate` table (normalization happens inline, writes directly to `StatementLines`)
- ❌ No `normalisation_status` field (`ok` vs `invalid`)
- ❌ No `normalisation_error` field
- ❌ No enrichment hooks (category suggestions, merchant name extraction)
- ❌ Invalid dates throw errors and skip row (no candidate record created)
- ❌ No explicit "candidate" stage before final persistence

**Current Flow:**
```
Map Row → Normalize → Insert StatementLine (or throw error)
```

**Required Flow:**
```
Map Row → Create transaction_candidate (normalisation_status='ok'/'invalid') → Enrich → Mark as 'ready_to_insert'
```

**Note:** The system does normalize data, but it's done inline during mapping rather than as a separate candidate stage.

---

### 4. Dedupe & Integrity – "Only One Truth Per Real Transaction"

**Status: P (Partially Implemented)**

**What Exists:**
- ✅ Dedupe hash generation (`generateDedupeHash`)
- ✅ Duplicate checking via `dedupe_hash` + `account_id` (`statementDAO.checkDuplicateHash`)
- ✅ Hash-based duplicate prevention at file level (`source_hash` on `StatementImports`)
- ✅ Preview endpoint shows duplicates before import (`statement-controller.js:106-115`)
- ✅ Duplicate skipping during import (`transaction-controller.js:379-393`)

**What's Missing:**
- ❌ No explicit `transaction_candidate.status` field (`duplicate`, `ready_to_insert`, `inserted`)
- ❌ No `existing_transaction_id` linking for duplicates
- ❌ **No statement-level integrity checking:**
  - No `integrity_status` field on `StatementImports` (`ok`, `mismatch`, `unknown`)
  - No `integrity_notes` field
  - No calculation: `opening_balance + sum(transactions) == closing_balance`
  - `closing_balance` stored but never validated
- ❌ No opening balance tracking (only `closing_balance` in `StatementImports`)
- ❌ No "needs review" flagging for mismatches

**Current Flow:**
```
Check dedupe_hash → Skip if duplicate → Insert StatementLine
```

**Required Flow:**
```
Check dedupe_hash → Mark candidate as 'duplicate'/'ready_to_insert' → After all candidates: Compute integrity → Store integrity_status → Insert only 'ready_to_insert'
```

**Critical Gap:** The system cannot answer: "Does `opening_balance + sum(transactions) == closing_balance`?" because:
1. No `opening_balance` stored (only `closing_balance`)
2. No integrity check performed
3. No mismatch detection

---

### 5. Persistence Layer – "Write to the Canonical Tables"

**Status: A (Already Implemented)**

**What Exists:**
- ✅ `StatementLines` table is the canonical storage for statement data
- ✅ Batch insert via `statementDAO.createStatementLines` (transaction-wrapped)
- ✅ `Transactions` table for user-entered transactions
- ✅ Foreign key relationships maintained
- ✅ `dedupe_hash` stored on both `StatementLines` and `Transactions`

**What's Missing:**
- ⚠️ No explicit `statement_import_job_id` on `Transactions` table (only on `StatementLines`)
- ⚠️ No candidate status tracking (no record of which candidates became transactions)

**Current Flow:**
```
Insert StatementLines → Done
```

**Note:** This stage is mostly complete, but the lack of a candidate layer means there's no audit trail of what was rejected vs. inserted.

---

### 6. Serving Layer – "Give the UI Exactly What It Needs"

**Status: P (Partially Implemented)**

**What Exists:**
- ✅ `GET /api/statements` - List imports (`statement-controller.js:372-390`)
- ✅ `GET /api/statements/:id` - Get import details (`statement-controller.js:310-331`)
- ✅ `GET /api/statements/:id/lines` - Get statement lines (`statement-controller.js:337-366`)
- ✅ `GET /api/transactions` - Get transactions with filters (`transaction-controller.js:569-597`)

**What's Missing:**
- ❌ No `GET /imports/:job_id/report` endpoint (no counts: total rows, invalid rows, duplicates, inserted)
- ❌ No `GET /imports/:job_id/raw-issues` endpoint (no way to see invalid/failed rows)
- ❌ No integrity warnings in API responses
- ❌ Import details don't include integrity status or error counts

**Current Flow:**
```
GET /statements/:id → Returns import + line_count + total_amount
```

**Required Flow:**
```
GET /imports/:job_id/report → Returns { totalRows, invalidRows, duplicates, inserted, integrityStatus, integrityNotes }
GET /imports/:job_id/raw-issues → Returns array of invalid rows with errors
```

---

### 7. Monitoring & Logging – "Know When It's Broken"

**Status: N (Not Implemented)**

**What Exists:**
- ✅ Basic console.log statements (`console.error`, `console.log`)
- ✅ Error counts tracked during import (`errorCount` variable)
- ✅ Import result returned to client (`insertedCount`, `errorCount`)

**What's Missing:**
- ❌ No `error_log` field on `StatementImports` table
- ❌ No structured logging per job (start/end times, row counts, failures)
- ❌ No mismatch flags stored
- ❌ No job dashboard or monitoring UI
- ❌ No alerting for failed imports
- ❌ No audit trail of what went wrong

**Current Flow:**
```
Import → Log to console → Return counts to client
```

**Required Flow:**
```
Import → Log start/end times → Store error_log → Track mismatch flags → Surface in UI
```

---

## Summary Table

| Stage | Status | Key Gaps |
|-------|--------|----------|
| **1. Ingestion** | **P** | No status tracking, no raw file persistence, file deleted immediately |
| **2. Parsing** | **P** | No `statement_raw_row` table, no parse_status/parse_error fields, inline parsing |
| **3. Normalisation** | **P** | No `transaction_candidate` table, no normalisation_status, inline normalization |
| **4. Dedupe & Integrity** | **P** | **CRITICAL: No statement-level integrity checking** (no opening_balance + sum check) |
| **5. Persistence** | **A** | Mostly complete, minor gaps in audit trail |
| **6. Serving** | **P** | Missing report endpoint, missing raw-issues endpoint, no integrity warnings |
| **7. Monitoring** | **N** | No structured logging, no error_log field, no job dashboard |

---

## Critical Issues Identified

### 1. **No Statement-Level Integrity Validation**
**Impact: HIGH**

The system cannot guarantee: `opening_balance + sum(transactions) == closing_balance`

**Why:**
- `StatementImports` only stores `closing_balance`, not `opening_balance`
- No integrity check performed after import
- No `integrity_status` or `integrity_notes` fields

**Required Fix:**
- Add `opening_balance` to `StatementImports`
- Add `integrity_status` (`ok`, `mismatch`, `unknown`)
- Add `integrity_notes` (text field)
- Compute: `computed_closing = opening_balance + sum(StatementLines.signed_amount)`
- Compare to `closing_balance` and store result

### 2. **No Raw File Persistence**
**Impact: MEDIUM**

Cannot reprocess imports or debug parsing issues.

**Why:**
- Raw file deleted immediately after processing
- Only `source_hash` stored (for deduplication), not file content

**Required Fix:**
- Add `raw_file_blob` column to `StatementImports` (or `raw_file_path` if filesystem storage)
- Keep file until import is complete and verified

### 3. **No Intermediate Parsing Layer**
**Impact: MEDIUM**

Cannot see which rows failed parsing or why.

**Why:**
- Parsing happens inline, errors are swallowed
- No `statement_raw_row` table with `parse_status` and `parse_error`

**Required Fix:**
- Create `statement_raw_row` table
- Store all rows with parse status before mapping

### 4. **No Candidate Layer**
**Impact: MEDIUM**

Cannot audit what was rejected vs. inserted.

**Why:**
- Normalization happens inline, writes directly to `StatementLines`
- No `transaction_candidate` table

**Required Fix:**
- Create `transaction_candidate` table
- Store normalized candidates before final insert

---

## Architecture Recommendations

### Immediate Priorities (Must Have)

1. **Add Statement Integrity Checking**
   - Add `opening_balance` to `StatementImports`
   - Add `integrity_status` and `integrity_notes`
   - Implement integrity check after import

2. **Add Status Tracking**
   - Add `status` field to `StatementImports` (`pending`, `processing`, `failed`, `completed`)
   - Add `updated_at` field
   - Update status throughout import process

3. **Add Raw File Persistence**
   - Add `raw_file_blob` column (or filesystem storage)
   - Keep file until import verified

### Short-Term (Should Have)

4. **Add Parsing Layer**
   - Create `statement_raw_row` table
   - Store parse status and errors

5. **Add Candidate Layer**
   - Create `transaction_candidate` table
   - Store normalization status

6. **Add Monitoring**
   - Add `error_log` field to `StatementImports`
   - Add report endpoints

### Long-Term (Nice to Have)

7. **Add Enrichment Hooks**
   - Category suggestions
   - Merchant name extraction

8. **Add Job Dashboard**
   - UI for viewing import history
   - Error analysis tools

---

## Migration Path

### Phase 1: Critical Fixes (Week 1)
- Add `opening_balance`, `integrity_status`, `integrity_notes` to `StatementImports`
- Implement integrity check in import flow
- Add `status` and `updated_at` fields

### Phase 2: Raw Storage (Week 2)
- Add `raw_file_blob` column
- Modify import flow to persist raw file
- Add cleanup job for old files

### Phase 3: Parsing Layer (Week 3-4)
- Create `statement_raw_row` table
- Refactor parsing to use intermediate table
- Add parse error tracking

### Phase 4: Candidate Layer (Week 5-6)
- Create `transaction_candidate` table
- Refactor normalization to use candidates
- Add candidate status tracking

### Phase 5: Monitoring & Reporting (Week 7-8)
- Add `error_log` field
- Create report endpoints
- Add monitoring UI

---

## Conclusion

The current implementation has a solid foundation with proper deduplication, normalization, and persistence. However, it lacks the layered architecture needed for robust error handling, auditability, and integrity validation. The most critical gap is the absence of statement-level integrity checking, which prevents the system from guaranteeing balance correctness.

**Recommended Next Steps:**
1. Implement statement integrity checking (Phase 1)
2. Add status tracking and raw file persistence (Phase 1-2)
3. Gradually introduce parsing and candidate layers (Phase 3-4)
4. Add monitoring and reporting (Phase 5)

This phased approach allows incremental improvements while maintaining system stability.

