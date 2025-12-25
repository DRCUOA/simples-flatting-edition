import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useTransactionStore } from './transaction';
import { useAccountStore } from './account';
import { useCategoryStore } from './category';
import { useMessageStore } from './messages';
import { useUiStore } from './ui';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  // SECURITY FIX: Keep token in memory only (not localStorage) to prevent XSS attacks
  // Access tokens are short-lived and refresh tokens are in httpOnly cookies
  const token = ref(null);
  const tokenExpiry = ref(null);
  const refreshTimer = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Computed properties
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const userName = computed(() => user.value?.username || '');
  const userEmail = computed(() => user.value?.email || '');

  // Actions
  const setToken = (newToken) => {
    token.value = newToken;
    // REMOVED: localStorage.setItem() - tokens are NOT stored in localStorage for security
    // This prevents XSS attacks from stealing JWT tokens
    
    if (newToken) {
      // Decode JWT to get expiry for automatic refresh scheduling
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        tokenExpiry.value = payload.exp * 1000; // Convert to milliseconds
        scheduleTokenRefresh();
      } catch (e) {
        console.warn('Failed to parse token expiry:', e);
        tokenExpiry.value = null;
      }
    } else {
      tokenExpiry.value = null;
      clearRefreshTimer();
    }
  };

  // Schedule automatic token refresh before expiry
  const scheduleTokenRefresh = () => {
    clearRefreshTimer();
    
    if (!tokenExpiry.value) return;
    
    const timeUntilExpiry = tokenExpiry.value - Date.now();
    const refreshTime = timeUntilExpiry - (60 * 1000); // Refresh 1 minute before expiry
    
    if (refreshTime > 0) {
      refreshTimer.value = setTimeout(() => {
        refreshToken().catch(err => {
          console.error('Auto-refresh failed:', err);
        });
      }, refreshTime);
    }
  };

  const clearRefreshTimer = () => {
    if (refreshTimer.value) {
      clearTimeout(refreshTimer.value);
      refreshTimer.value = null;
    }
  };

  const setUser = (userData) => {
    user.value = userData;
    // SECURITY NOTE: User data can be stored in localStorage as it's not sensitive
    // (no passwords, tokens, or private data). Only store non-sensitive profile info.
    if (userData) {
      const safeUserData = {
        user_id: userData.user_id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      };
      localStorage.setItem('auth_user', JSON.stringify(safeUserData));
    } else {
      localStorage.removeItem('auth_user');
    }
  };

  const setLoading = (loading) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage) => {
    error.value = errorMessage;
  };

  const clearError = () => {
    error.value = null;
  };

  const login = (userData, authToken) => {
    // Clear any existing data before setting new user data
    clearAllStoreData();
    setUser(userData);
    setToken(authToken);
    clearError();
  };

  const logout = () => {
    // Clear token refresh timer
    clearRefreshTimer();
    
    // Clear all store data FIRST to prevent data leakage between users
    clearAllStoreData();
    
    // Clear auth data
    setUser(null);
    setToken(null);
    clearError();
    
    // Clear any cached data in localStorage that might be user-specific
    // NOTE: We don't store auth tokens in localStorage anymore (security fix)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('auth_') || 
        key.startsWith('user_') || 
        key.startsWith('cache_') ||
        key.startsWith('pinia_') ||  // Pinia store persistence
        key.includes('_store') ||    // Any store-related keys
        key.includes('_data') ||     // Any data-related keys
        key.includes('_state')       // Any state-related keys
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage as well
    sessionStorage.clear();
  };

  // Clear all store data to prevent cross-user data leakage
  const clearAllStoreData = () => {
    try {
      // Clear all stores synchronously
      const transactionStore = useTransactionStore();
      transactionStore.clearAllData();
      
      const accountStore = useAccountStore();
      accountStore.clearAllData();
      
      const categoryStore = useCategoryStore();
      categoryStore.clearAllData();
      
      const messageStore = useMessageStore();
      messageStore.clearAllData();
      
      const uiStore = useUiStore();
      uiStore.clearAllData();
    } catch (error) {
      console.error('Error clearing stores:', error);
    }
  };

  const updateProfile = (userData) => {
    if (user.value) {
      user.value = { ...user.value, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(user.value));
    }
  };

  // Initialize from localStorage on app start
  // SECURITY FIX: We no longer store tokens in localStorage (XSS protection)
  // Only restore user profile data and attempt token refresh via httpOnly cookie
  const initializeAuth = async () => {
    const storedUser = localStorage.getItem('auth_user');

    // Clean up any old token storage from previous versions
    const oldTokenKeys = ['auth_token', '__Host-auth_token', 'token', 'jwt_token'];
    oldTokenKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.warn(`Removing insecure token storage: ${key}`);
        localStorage.removeItem(key);
      }
    });

    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        user.value = userData;
        
        // Attempt to refresh token using httpOnly cookie
        // This will restore the session if the refresh token is still valid
        const newToken = await refreshToken();
        
        if (!newToken) {
          // Refresh token expired or invalid, clear user data
          logout();
        } else {
        }
      } catch (e) {
        console.warn('Failed to initialize auth:', e);
        logout();
      }
    }
  };

  // Clear any auth-related data
  const clearAuth = () => {
    logout();
  };

  // Token refresh functionality
  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken && data.user) {
          setToken(data.accessToken);
          setUser(data.user);
          return data.accessToken;
        }
      }
      throw new Error('Token refresh failed');
    } catch (error) {
      console.warn('Token refresh failed:', error);
      logout();
      return null;
    }
  };

  // Force clear all data and reload page (nuclear option)
  const forceClearAllData = () => {
    
    // Clear all stores
    clearAllStoreData();
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear auth state
    setUser(null);
    setToken(null);
    clearError();
    
    // Force page reload to ensure clean state
    window.location.reload();
  };

  return {
    // State
    user,
    token,
    isLoading,
    error,

    // Computed
    isAuthenticated,
    isAdmin,
    userName,
    userEmail,

    // Actions
    setToken,
    setUser,
    setLoading,
    setError,
    clearError,
    login,
    logout,
    updateProfile,
    initializeAuth,
    clearAuth,
    refreshToken,
    clearAllStoreData,
    forceClearAllData
  };
});
