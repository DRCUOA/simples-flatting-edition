# Pipeline Status: A/P/N Assessment

## Quick Reference

| Stage | Status | Notes |
|-------|--------|-------|
| **1. Ingestion** | **P** | File stored but no import_job status tracking, file deleted immediately |
| **2. Parsing** | **P** | CSV parsed inline, no statement_raw_row table, errors swallowed |
| **3. Normalisation** | **P** | Normalization happens but inline, no transaction_candidate table |
| **4. Dedupe & Integrity** | **P** | Hash-based dedupe works, **CRITICAL: no statement-level integrity check** |
| **5. Persistence** | **A** | StatementLines and Transactions tables work correctly |
| **6. Serving** | **P** | Basic endpoints exist, missing report and raw-issues endpoints |
| **7. Monitoring** | **N** | No structured logging, no error_log field, no job dashboard |

---

## Detailed Breakdown

### 1. Ingestion Layer: **P (Partially Implemented)**

**What works:**
- File upload via multer
- `StatementImports` table created with `import_id`, `user_id`, `account_id`, `source_filename`
- `source_hash` (SHA-256) for file-level deduplication
- Import record created before processing

**What's missing:**
- No `status` field (`pending`, `processing`, `failed`, `completed`)
- No persistent raw file storage (`raw_file_path` or `raw_file_blob`)
- File deleted immediately after processing (line 270 in statement-controller.js)
- No `updated_at` field
- Cannot reprocess from raw file later

---

### 2. Parsing Layer: **P (Partially Implemented)**

**What works:**
- CSV parsing via `csv-parse`
- Format detection (bank-ledger vs card)
- Header validation
- `StatementLines.raw_row_json` stores full row as JSON

**What's missing:**
- No `statement_raw_row` table (no intermediate parsing layer)
- No `raw_row_number` tracking
- No `parse_status` field (`ok` vs `invalid`)
- No `parse_error` field for validation errors
- Parsing happens inline during import
- Invalid rows silently skipped (errorCount incremented but no record of why)

---

### 3. Normalisation & Enrichment: **P (Partially Implemented)**

**What works:**
- Date normalization (`normalizeDate`)
- Description normalization (`normalizeDescription`)
- Signed amount calculation
- Dedupe hash generation
- Transaction type normalization
- `StatementLines` has normalized fields (`txn_date`, `signed_amount`, `description_norm`)

**What's missing:**
- No `transaction_candidate` table (normalization inline, writes directly to `StatementLines`)
- No `normalisation_status` field (`ok` vs `invalid`)
- No `normalisation_error` field
- No enrichment hooks (category suggestions, merchant name)
- Invalid dates throw errors and skip row (no candidate record)

---

### 4. Dedupe & Integrity: **P (Partially Implemented)**

**What works:**
- Dedupe hash generation (`generateDedupeHash`)
- Duplicate checking via `dedupe_hash` + `account_id`
- Hash-based duplicate prevention at file level (`source_hash`)
- Preview endpoint shows duplicates
- Duplicate skipping during import

**What's missing:**
- **CRITICAL: No statement-level integrity checking**
  - No `opening_balance` stored (only `closing_balance`)
  - No calculation: `opening_balance + sum(transactions) == closing_balance`
  - No `integrity_status` field (`ok`, `mismatch`, `unknown`)
  - No `integrity_notes` field
- No explicit candidate status (`duplicate`, `ready_to_insert`, `inserted`)
- No `existing_transaction_id` linking for duplicates

**The system cannot answer:** "Does `opening_balance + sum(transactions) == closing_balance`?"

---

### 5. Persistence Layer: **A (Already Implemented)**

**What works:**
- `StatementLines` table is canonical storage
- Batch insert via `statementDAO.createStatementLines` (transaction-wrapped)
- `Transactions` table for user-entered transactions
- Foreign key relationships maintained
- `dedupe_hash` stored on both tables

**Minor gaps:**
- No explicit `statement_import_job_id` on `Transactions` table (only on `StatementLines`)
- No candidate status tracking (no audit trail of rejected vs inserted)

---

### 6. Serving Layer: **P (Partially Implemented)**

**What works:**
- `GET /api/statements` - List imports
- `GET /api/statements/:id` - Get import details
- `GET /api/statements/:id/lines` - Get statement lines
- `GET /api/transactions` - Get transactions with filters

**What's missing:**
- No `GET /imports/:job_id/report` endpoint (no counts: total rows, invalid rows, duplicates, inserted)
- No `GET /imports/:job_id/raw-issues` endpoint (no way to see invalid/failed rows)
- No integrity warnings in API responses
- Import details don't include integrity status or detailed error counts

---

### 7. Monitoring & Logging: **N (Not Implemented)**

**What works:**
- Basic `console.log` statements
- Error counts tracked during import
- Import result returned to client

**What's missing:**
- No `error_log` field on `StatementImports` table
- No structured logging per job (start/end times, row counts, failures)
- No mismatch flags stored
- No job dashboard or monitoring UI
- No alerting for failed imports
- No audit trail of what went wrong

---

## Critical Gaps Summary

1. **No Statement Integrity Validation** - Cannot verify `opening_balance + sum(transactions) == closing_balance`
2. **No Raw File Persistence** - Cannot reprocess imports or debug parsing issues
3. **No Intermediate Parsing Layer** - Cannot see which rows failed or why
4. **No Candidate Layer** - Cannot audit what was rejected vs inserted
5. **No Monitoring** - No structured logging or error tracking

---

## Recommended Next Steps

1. **Phase 1 (Critical):** Add statement integrity checking + status tracking
2. **Phase 2:** Add raw file persistence
3. **Phase 3:** Add parsing layer (`statement_raw_row` table)
4. **Phase 4:** Add candidate layer (`transaction_candidate` table)
5. **Phase 5:** Add monitoring and reporting endpoints

See `PIPELINE_ANALYSIS.md` for detailed migration plan.

