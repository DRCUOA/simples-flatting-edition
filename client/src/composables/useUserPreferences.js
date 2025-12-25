// client/src/composables/useUserPreferences.js

import { ref, computed } from 'vue';
import http from '../lib/http';
import { debounce } from '../utils/debounce';
import { useAuthStore } from '../stores/auth';

const preferences = ref({});
const loading = ref(false);
const error = ref(null);

// Pending batch updates
const pendingBatch = ref({});
const batchTimeout = ref(null);

export function useUserPreferences() {
  // Get the authenticated user's ID
  const getUserId = () => {
    const authStore = useAuthStore();
    return authStore.userId || authStore.user?.user_id;
  };

  // Get a specific preference
  const getPreference = async (key, defaultValue = null) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No authenticated user, skipping preference fetch');
      return defaultValue;
    }

    try {
      loading.value = true;
      error.value = null;
      
      const response = await http.get(`/user-preferences/${userId}/${key}`);
      const data = response.data;
      
      // Cache the preference locally
      if (data.preference !== null) {
        preferences.value[key] = data.preference;
      }
      
      return data.preference !== null ? data.preference : defaultValue;
    } catch (err) {
      console.error('Error getting preference:', err);
      error.value = err.message || 'Failed to get preference';
      return defaultValue;
    } finally {
      loading.value = false;
    }
  };

  // Set a preference (debounced and batched)
  const setPreference = async (key, value, immediate = false) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No authenticated user, skipping preference save');
      return false;
    }

    // Update local cache immediately (optimistic update)
    preferences.value[key] = value;
    
    if (immediate) {
      // Immediate mode: send right away
      try {
        loading.value = true;
        error.value = null;
        
        await http.post(`/user-preferences/${userId}/${key}`, {
          preferenceValue: value
        });
        
        return true;
      } catch (err) {
        console.error('Error setting preference:', err);
        error.value = err.message || 'Failed to set preference';
        return false;
      } finally {
        loading.value = false;
      }
    } else {
      // Batched mode: accumulate and send in batch
      pendingBatch.value[key] = value;
      
      // Clear existing timeout
      if (batchTimeout.value) {
        clearTimeout(batchTimeout.value);
      }
      
      // Set new timeout to flush batch
      batchTimeout.value = setTimeout(async () => {
        await flushBatch();
      }, 300); // 300ms debounce
      
      return true;
    }
  };

  // Flush pending batch updates
  const flushBatch = async () => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No authenticated user, skipping batch flush');
      return false;
    }

    const batch = { ...pendingBatch.value };
    const keys = Object.keys(batch);
    
    if (keys.length === 0) return true;
    
    try {
      loading.value = true;
      error.value = null;
      
      // Clear pending batch
      pendingBatch.value = {};
      
      // Send batch request
      await http.post(`/user-preferences/${userId}/batch`, {
        preferences: batch
      });
      
      return true;
    } catch (err) {
      console.error('Error saving preference batch:', err);
      error.value = err.message || 'Failed to save preferences';
      
      // Restore failed items to pending batch
      for (const key of keys) {
        pendingBatch.value[key] = batch[key];
      }
      
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Get all preferences
  const getAllPreferences = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const userId = getUserId();
      if (!userId) {
        console.warn('No authenticated user, skipping preferences fetch');
        return {};
      }
      
      const response = await http.get(`/user-preferences/${userId}`);
      const data = response.data;
      
      preferences.value = data.preferences;
      return data.preferences;
    } catch (err) {
      console.error('Error getting preferences:', err);
      error.value = err.message || 'Failed to get preferences';
      return {};
    } finally {
      loading.value = false;
    }
  };

  // Delete a preference
  const deletePreference = async (key) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('No authenticated user, skipping preference delete');
      return false;
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      await http.delete(`/user-preferences/${userId}/${key}`);
      
      delete preferences.value[key];
      return true;
    } catch (err) {
      console.error('Error deleting preference:', err);
      error.value = err.message || 'Failed to delete preference';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Specific preference getters/setters for category ordering
  const getCategoryOrder = async () => {
    return await getPreference('category_order', []);
  };

  const setCategoryOrder = async (order) => {
    return await setPreference('category_order', order);
  };

  const getExpandedCategories = async () => {
    return await getPreference('expanded_categories', []);
  };

  const setExpandedCategories = async (expanded) => {
    return await setPreference('expanded_categories', expanded);
  };

  return {
    // State
    preferences: computed(() => preferences.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // General methods
    getPreference,
    setPreference,
    getAllPreferences,
    deletePreference,
    flushBatch,
    
    // Specific methods for category ordering
    getCategoryOrder,
    setCategoryOrder,
    getExpandedCategories,
    setExpandedCategories,
  };
}
