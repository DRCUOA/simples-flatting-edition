# Phase 1 Data Pipeline Upgrade Plan

## Objective
Strengthen the Simples data pipeline by adding integrity validation, job status tracking, and minimal auditability—without requiring a full architectural refactor.

This is the minimum viable upgrade required for the pipeline to become reliable, verifiable, and financially trustworthy.

---

# 1. Extend `StatementImports` Table

Add the following fields:

```sql
ALTER TABLE StatementImports
  ADD COLUMN opening_balance REAL NULL,
  ADD COLUMN integrity_status TEXT CHECK (integrity_status IN ('ok','mismatch','unknown')) DEFAULT 'unknown',
  ADD COLUMN integrity_notes TEXT NULL,
  ADD COLUMN status TEXT CHECK (status IN ('pending','processing','completed','failed')) DEFAULT 'pending',
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

**Purpose:**  
- Enables balance integrity checks  
- Allows lifecycle state tracking  
- Records notes about reconciliation correctness  

---

# 2. Modify Import Flow – Add Status Transitions

Implement job lifecycle transitions:

```
pending → processing → completed
              ↳ failed
```

Example (pseudo-code):

```js
await statementDAO.updateImportStatus(importId, 'processing');

try {
    const result = await processCsvRows(...);

    await statementDAO.updateImportIntegrity(
        importId,
        result.integrityStatus,
        result.integrityNotes
    );

    await statementDAO.updateImportStatus(importId, 'completed');

} catch (err) {
    await statementDAO.updateImportStatus(importId, 'failed');
    await statementDAO.appendImportError(importId, err.message);
    throw err;
}
```

**Purpose:**  
- Adds resilience  
- Provides visibility  
- Prevents silent failures  

---

# 3. Require `opening_balance` at Import Time

Two acceptable approaches:

### Option A (Preferred)
Prompt user to enter the opening balance manually.

### Option B (Fast to implement)
Extract opening balance from the first row’s `balance_after`.

**Purpose:**  
This is mandatory for computing correct closing balance reconciliation.

---

# 4. Implement Statement Integrity Check

After row normalization and dedupe, compute:

```js
const sum = await statementDAO.sumSignedAmounts(importId);
const computedClosing = opening_balance + sum;
const matches = Math.abs(computedClosing - closing_balance) < 0.01;
```

Return:

```json
{
  "integrity_status": "ok" | "mismatch",
  "integrity_notes": "Closing balance reconciled" | "Mismatch: expected X, got Y"
}
```

**Purpose:**  
Guarantees financial correctness and data trustworthiness.

---

# 5. Add Minimal Error Logging

Add error log column:

```sql
ALTER TABLE StatementImports
  ADD COLUMN error_log TEXT DEFAULT '';
```

Append errors during processing:

```js
await statementDAO.appendImportError(importId, message);
```

**Purpose:**  
Improves debugging and traceability without adding full monitoring.

---

# 6. Enrich Existing API Responses

Modify:

- `GET /api/statements`
- `GET /api/statements/:id`

Return new fields:

```json
{
  "status": "processing",
  "integrity_status": "mismatch",
  "integrity_notes": "Mismatch: expected 1295.66, got 1297.02"
}
```

**Purpose:**  
- Enables UI-level reconciliation warnings  
- Adds visibility to the user without new endpoints  

---

# Summary of Phase 1 Deliverables

| Component | Deliverable |
|----------|-------------|
| Database | New fields: `opening_balance`, `status`, `integrity_status`, `integrity_notes`, `error_log`, `updated_at` |
| Controllers | Status lifecycle, error handling, integrity checking |
| DAO | Methods for updating status, integrity, and error logs |
| API | Enriched JSON responses with integrity metadata |

---

# Why Phase 1 Matters

This upgrade provides:

- Financial integrity  
- Auditability  
- Clear import lifecycle  
- User-visible warnings  
- A stable foundation for future pipeline layers  

Without Phase 1, the system cannot guarantee correctness or scale.

---

# Next Step

Choose which implementation you want first:

- SQL migration  
- DAO modifications  
- Controller patches  
- Integrity-check service  
- Updated API response DTO/serialiser  
- UI changes  

I’ll produce the full production-quality code.
