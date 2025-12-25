# Actuals API Fix - Wrong Port & Token Issue

**Date:** October 5, 2025  
**Severity:** 🔴 CRITICAL  
**Issue:** Actuals API calls going to wrong port with invalid token

---

## 🚨 Problem

### Symptoms
```
GET http://localhost:8085/api/reports/weekly-category-actuals?start=2025-09-30&end=2025-10-30 401 (Unauthorized)
Failed to fetch weekly category actuals: Error: Unauthorized
```

### Root Causes

**Issue #1: Wrong Port**
- Request going to `localhost:8085` (frontend dev server)
- Should go to `localhost:3050` (backend API server)
- Caused by using **relative URL** with native `fetch()` API

**Issue #2: Invalid Token**
- Code trying to get token from `localStorage.getItem('auth_token')`
- Tokens were moved to **memory-only storage** for security (see `AUTH_AND_RATE_LIMIT_FIXES.md`)
- Result: No valid authorization header sent

### Why This Happened

The `fetchWeeklyCategoryActuals` method in `actuals.js` was using:
1. **Raw `fetch()` API** instead of the configured `http` utility
2. **Relative URL** (`/api/reports/...`) which resolves to current origin
3. **localStorage** for token retrieval (outdated after security fix)

```javascript
// BEFORE (Broken)
const token = localStorage.getItem('auth_token'); // ❌ Token not here anymore
const resp = await fetch(`/api/reports/weekly-category-actuals?${params}`, {
  // ❌ Relative URL = current origin (port 8085)
  headers: {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // ❌ No token
  }
});
```

---

## ✅ Solution

Replaced raw `fetch()` with the `http` utility that:
1. ✅ Uses correct `baseURL` (http://localhost:3050)
2. ✅ Automatically includes auth token from memory
3. ✅ Handles token refresh automatically
4. ✅ Consistent with rest of the application

```javascript
// AFTER (Fixed)
import http from '../lib/http';

// Use http utility instead of raw fetch
const response = await http.get('/api/reports/weekly-category-actuals', {
  params: { start: from, end: to }
});
```

---

## 🔧 Changes Made

### File: `client/src/stores/actuals.js`

#### Change 1: Add http Import (Line 6)
```diff
import { defineStore } from 'pinia';
import axios from 'axios';
+ import http from '../lib/http';
```

#### Change 2: Replace fetch() with http.get() (Lines 123-129)
```diff
- const params = new URLSearchParams({ start: from, end: to });
- const token = localStorage.getItem('auth_token');
- const resp = await fetch(`/api/reports/weekly-category-actuals?${params}`, {
-   method: 'GET',
-   credentials: 'include',
-   headers: {
-     'Accept': 'application/json',
-     ...(token ? { 'Authorization': `Bearer ${token}` } : {})
-   }
- });
- if (resp.status === 401) {
-   throw new Error('Unauthorized');
- }
- if (!resp.ok) {
-   const msg = await resp.text();
-   throw new Error(msg || 'Failed to fetch weekly category actuals');
- }
- const data = await resp.json();
- this.weeklyCategoryActuals = Array.isArray(data) ? data : [];

+ // Use http utility instead of raw fetch to ensure correct baseURL and auth headers
+ const response = await http.get('/api/reports/weekly-category-actuals', {
+   params: { start: from, end: to }
+ });
+ this.weeklyCategoryActuals = Array.isArray(response.data) ? response.data : [];
```

---

## 📊 Comparison

### Before Fix

| Aspect | Value | Status |
|--------|-------|--------|
| **API Method** | `fetch()` | ❌ Raw API |
| **Base URL** | Relative (`/api/...`) | ❌ Wrong port (8085) |
| **Token Source** | `localStorage` | ❌ Empty/outdated |
| **Auth Header** | Missing/invalid | ❌ 401 errors |
| **Token Refresh** | Not handled | ❌ Manual retry needed |

### After Fix

| Aspect | Value | Status |
|--------|-------|--------|
| **API Method** | `http.get()` | ✅ Configured utility |
| **Base URL** | `http://localhost:3050` | ✅ Correct backend |
| **Token Source** | Memory (via interceptor) | ✅ Current token |
| **Auth Header** | Automatic | ✅ Always included |
| **Token Refresh** | Automatic | ✅ Handled by interceptor |

---

## 🔍 Why http Utility Is Better

The `http` utility (from `lib/http.js`) provides:

### 1. Correct Base URL
```javascript
// Configured in main.js and lib/http.js
axios.defaults.baseURL = 'http://localhost:3050'
```

### 2. Automatic Auth Headers
```javascript
// Axios interceptor in main.js
axios.interceptors.request.use((config) => {
  const token = authStore.token // ✅ From memory
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 3. Automatic Token Refresh
```javascript
// Axios interceptor handles 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      const newToken = await authStore.refreshToken()
      if (newToken) {
        // Retry with new token
        return axios(originalRequest)
      }
    }
  }
)
```

### 4. Consistent Error Handling
All API calls use the same error handling logic

---

## 🧪 Testing

### Verify the Fix

1. **Refresh the page**
2. **Navigate to Monthly Actuals view**
3. **Open DevTools → Network tab**
4. **Look for the API request:**
   ```
   ✅ GET http://localhost:3050/api/reports/weekly-category-actuals?start=...&end=...
   ✅ Status: 200 OK
   ✅ Authorization: Bearer <token>
   ```

### Expected Behavior

**Console:**
```
✅ No 401 errors
✅ No "Unauthorized" errors
✅ Data loads successfully
```

**Network Tab:**
```
Request URL: http://localhost:3050/api/reports/weekly-category-actuals
Status: 200 OK
Request Headers:
  Authorization: Bearer eyJhbGc...
  Origin: http://localhost:8085
```

---

## 🔒 Security Benefits

### Before (Insecure)
- ❌ Token stored in localStorage (XSS vulnerable)
- ❌ Manual token management (error-prone)
- ❌ No automatic token refresh

### After (Secure)
- ✅ Token in memory only (XSS protected)
- ✅ Automatic token injection (consistent)
- ✅ Automatic token refresh (seamless)

---

## 📝 Lessons Learned

### 1. Always Use Configured HTTP Client
```javascript
// ❌ DON'T
fetch('/api/endpoint')

// ✅ DO
http.get('/api/endpoint')
```

### 2. Never Use localStorage for Tokens
```javascript
// ❌ DON'T
const token = localStorage.getItem('auth_token')

// ✅ DO
// Let axios interceptors handle it automatically
```

### 3. Avoid Relative URLs for API Calls
```javascript
// ❌ DON'T (resolves to current origin)
fetch('/api/endpoint')

// ✅ DO (uses configured baseURL)
http.get('/api/endpoint')
```

---

## 🔍 Related Issues

This fix is part of a series of authentication and API fixes:

1. **AUTH_AND_RATE_LIMIT_FIXES.md** - Cookie path & rate limiting
2. **INITIALIZATION_ORDER_FIX.md** - Frontend initialization order
3. **RATE_LIMIT_HOTFIX.md** - NODE_ENV undefined issue
4. **ACTUALS_API_FIX.md** - This fix (wrong port & token)

---

## 🎯 Summary

### What Was Fixed
✅ API calls now go to correct backend port (3050)  
✅ Auth tokens automatically included from memory  
✅ Consistent with rest of application  
✅ Automatic token refresh works  

### Impact
- **Users:** Monthly actuals view loads correctly ✅
- **Developers:** Consistent API usage pattern ✅
- **Security:** No localStorage token access ✅

### Files Modified
- `client/src/stores/actuals.js` (2 changes)

---

## 🚀 Next Steps

### Audit Other Stores
Check if other stores have similar issues:

```bash
# Search for raw fetch() calls
grep -r "fetch(" client/src/stores/

# Search for localStorage token access
grep -r "localStorage.getItem.*token" client/src/
```

### Recommended Pattern
All API calls should use:
```javascript
import http from '../lib/http';

// GET request
const response = await http.get('/api/endpoint', { params: { ... } });

// POST request
const response = await http.post('/api/endpoint', { data: ... });

// PUT request
const response = await http.put('/api/endpoint/:id', { data: ... });

// DELETE request
const response = await http.delete('/api/endpoint/:id');
```

---

**Status:** ✅ FIXED  
**Severity:** 🔴 CRITICAL → ✅ RESOLVED  
**Breaking Changes:** None  
**Requires Restart:** No (hot reload)  
**Backward Compatible:** Yes
