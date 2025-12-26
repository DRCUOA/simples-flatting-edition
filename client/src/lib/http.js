/**
 * Centralized HTTP client with caching, conditional GET, and request deduplication
 * Single source of truth: backend API
 * Client caching: Pinia stores enhanced with SWR pattern
 * 
 * SECURITY NOTE: This http client is separate from the global axios instance
 * configured in main.js. It's used for specific API calls that need caching.
 */

import axios from 'axios';

// Configure base instance
// Prefer VITE_API_BASE_URL (new standard), fall back to VITE_API_URL (backward compatibility)
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3050/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token provider function - set by application during initialization
// This avoids circular dependencies with the auth store
let tokenProvider = null;

/**
 * Set the token provider function
 * This should be called once during app initialization with authStore.token
 */
export function setTokenProvider(providerFn) {
  tokenProvider = providerFn;
}

// In-memory cache for ETags and Last-Modified
const conditionalCache = new Map();

/**
 * Generate cache key from request config
 */
function getCacheKey(method, url, params) {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramStr}`;
}

/**
 * Get cached metadata for conditional requests
 */
function getCachedMeta(cacheKey) {
  return conditionalCache.get(cacheKey);
}

/**
 * Store metadata for future conditional requests
 */
function setCachedMeta(cacheKey, etag, lastModified, data) {
  conditionalCache.set(cacheKey, {
    etag,
    lastModified,
    data,
    timestamp: Date.now()
  });
}

/**
 * Request interceptor: Add conditional headers
 */
http.interceptors.request.use((config) => {
  // Add auth token if available - SECURITY FIX: Use in-memory token only
  // The tokenProvider function is set during app initialization
  const token = tokenProvider ? tokenProvider() : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add conditional headers for GET requests
  if (config.method === 'get' && !config.skipConditional) {
    const cacheKey = getCacheKey('GET', config.url, config.params);
    const cached = getCachedMeta(cacheKey);
    
    if (cached) {
      if (cached.etag) {
        config.headers['If-None-Match'] = cached.etag;
      }
      if (cached.lastModified) {
        config.headers['If-Modified-Since'] = cached.lastModified;
      }
      
      // Attach cached data for potential 304 response
      config._cachedData = cached.data;
      config._cacheKey = cacheKey;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Response interceptor: Handle 304, cache headers, map errors
 */
http.interceptors.response.use(
  (response) => {
    // Handle 304 Not Modified
    if (response.status === 304 && response.config._cachedData) {
      return {
        ...response,
        data: response.config._cachedData,
        status: 200,
        fromCache: true
      };
    }

    // Cache ETag and Last-Modified for successful GET requests
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = response.config._cacheKey || getCacheKey(
        'GET',
        response.config.url,
        response.config.params
      );
      
      const etag = response.headers['etag'];
      const lastModified = response.headers['last-modified'];
      
      if (etag || lastModified) {
        setCachedMeta(cacheKey, etag, lastModified, response.data);
      }
    }

    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Token refresh logic handled by main.js interceptor
      return Promise.reject(error);
    }

    // Map error to consistent format
    const mappedError = {
      message: error.response?.data?.error || error.message || 'Request failed',
      status: error.response?.status,
      data: error.response?.data,
      originalError: error
    };

    return Promise.reject(mappedError);
  }
);

/**
 * Clear conditional cache (e.g., on logout)
 */
export function clearHttpCache() {
  conditionalCache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(method, url, params) {
  const cacheKey = getCacheKey(method, url, params);
  conditionalCache.delete(cacheKey);
}

// Reconciliation API methods
export const reconciliationAPI = {
  // Sessions
  createSession: (sessionData) => http.post('/recon/sessions', sessionData),
  getSessions: (params = {}) => http.get('/recon/sessions', { params }),
  getSession: (sessionId) => http.get(`/recon/sessions/${sessionId}`),
  getSessionSummary: (sessionId) => http.get(`/recon/sessions/${sessionId}/summary`),
  getSessionTransactions: (sessionId) => http.get(`/recon/sessions/${sessionId}/transactions`),
  updateSession: (sessionId, updateData) => http.put(`/recon/sessions/${sessionId}`, updateData),
  closeSession: (sessionId) => http.post(`/recon/sessions/${sessionId}/close`),
  deleteSession: (sessionId) => http.delete(`/recon/sessions/${sessionId}`),
  
  // Matching
  createMatch: (matchData) => http.post('/recon/matches', matchData),
  deleteMatch: (matchId) => http.delete(`/recon/matches/${matchId}`),
  
  // Unmatched items
  getUnmatchedTransactions: (params = {}) => http.get('/recon/unmatched-transactions', { params }),
  
  // Transaction details
  getTransactionDetails: (transactionId) => http.get(`/recon/transactions/${transactionId}/details`),
  
  // Statements (kept for backward compatibility, but not used in simplified reconciliation)
  previewStatement: (formData) => http.post('/statements/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importStatement: (formData) => http.post('/statements/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStatements: (params = {}) => http.get('/statements', { params }),
  getStatement: (statementId) => http.get(`/statements/${statementId}`),
  getStatementLines: (statementId, params = {}) => http.get(`/statements/${statementId}/lines`, { params }),
  updateStatementName: (statementId, statementName) => http.patch(`/statements/${statementId}/name`, { statement_name: statementName }),
  deleteStatement: (statementId) => http.delete(`/statements/${statementId}`)
};

export default http;

