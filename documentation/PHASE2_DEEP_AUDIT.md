# Phase 2 Deep Audit: Additional Issues Found

**Date:** 2025-01-26  
**Status:** Issues Identified

## Critical Issues Found

### 1. Direct process.env Access (Not Using Centralized Config)

**Issue:** Multiple files still access `process.env` directly instead of using centralized `config/environment.js`

**Files Affected:**
- `server/middleware/auth.js` - JWT config (8 direct accesses)
- `server/models/user_dao.js` - BCRYPT_ROUNDS
- `server/middleware/security.js` - Rate limit config (3 direct accesses)
- `server/routes/auth-router.js` - NODE_ENV checks (5 instances)
- `server/middleware/logging.js` - NODE_ENV checks
- `server/middleware/errorHandler.js` - NODE_ENV checks
- `server/middleware/fileUpload.js` - MAX_FILE_SIZE_MB
- `server/app.js` - PORT, FRONTEND_URL, DEV_FULL

**Impact:** 
- Inconsistent defaults
- Hard to track environment variable usage
- Potential for configuration drift

**Fix:** Migrate to use `getEnvironmentConfig()` from centralized module

### 2. Console Statements in Production Code

**Issue:** Found 527 console statements across 46 files. Many are in scripts/tests (OK), but some are in production code paths.

**Production Code Issues:**
- `server/db/index.js` - console.error statements not gated (lines 167, 182, 198, 202, 219, 222, 297, 331)
- `server/middleware/auth.js` - console.warn not gated (line 41)
- `server/config/environment.js` - console statements in validation (OK for startup, but should be reviewed)

**Impact:** 
- Debug output in production logs
- Potential information leakage
- Log noise

**Fix:** Gate all production code console statements with environment checks

### 3. Database Connection Cleanup

**Issue:** `closeConnection()` returns a Promise but `app.js` graceful shutdown doesn't await it

**Impact:** 
- Database may not close cleanly during shutdown
- Potential data corruption risk

**Fix:** Await database close in graceful shutdown

### 4. SQL Injection Review

**Status:** ✅ SQL queries use parameterized queries correctly
- Found 4 instances of template literal SQL construction in `transaction_dao.js`
- All use proper placeholder arrays with `?` placeholders
- No direct string interpolation in SQL

**No action needed** - SQL injection protection is properly implemented

### 5. Environment Variable Defaults Inconsistency

**Issue:** Different defaults in different files:
- `auth.js`: TOKEN_TTL_MIN defaults to 60, but config defaults to 15
- `auth.js`: JWT_ISS/JWT_AUD have defaults, but config also has defaults
- `user_dao.js`: BCRYPT_ROUNDS defaults to 12, config defaults to 12 (OK)

**Impact:** 
- Confusion about which defaults apply
- Potential security issues if wrong defaults used

**Fix:** Use centralized config for all defaults

## Priority Fixes

### High Priority
1. Migrate auth.js to use centralized config
2. Gate console.error in db/index.js
3. Fix database cleanup in graceful shutdown
4. Gate console.warn in auth.js

### Medium Priority
5. Migrate security.js to use centralized config
6. Migrate user_dao.js to use centralized config
7. Review and standardize all environment variable defaults

### Low Priority
8. Migrate remaining files to centralized config (logging, errorHandler, fileUpload)

