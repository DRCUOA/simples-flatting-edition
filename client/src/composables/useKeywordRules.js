import { ref } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3004/api';
const toast = useToast();

export function useKeywordRules() {
  const rules = ref([]);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Fetch all keyword rules for the current user
   */
  const fetchRules = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/keyword-rules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      rules.value = response.data || [];
      return rules.value;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch keyword rules';
      console.error('Error fetching keyword rules:', err);
      toast.error(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Create a new keyword rule
   * @param {Object} rule - Rule object with keyword and category_id
   */
  const createRule = async (rule) => {
    loading.value = true;
    error.value = null;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/keyword-rules`,
        {
          keyword: rule.keyword.trim(),
          category_id: rule.category_id
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      
      await fetchRules(); // Refresh the list
      toast.success('Keyword rule created successfully');
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to create keyword rule';
      console.error('Error creating keyword rule:', err);
      toast.error(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update an existing keyword rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updates - Updates object
   */
  const updateRule = async (ruleId, updates) => {
    loading.value = true;
    error.value = null;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/keyword-rules/${ruleId}`,
        updates,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      
      await fetchRules(); // Refresh the list
      toast.success('Keyword rule updated successfully');
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to update keyword rule';
      console.error('Error updating keyword rule:', err);
      toast.error(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete a keyword rule
   * @param {string} ruleId - Rule ID
   */
  const deleteRule = async (ruleId) => {
    loading.value = true;
    error.value = null;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/keyword-rules/${ruleId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      
      await fetchRules(); // Refresh the list
      toast.success('Keyword rule deleted successfully');
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to delete keyword rule';
      console.error('Error deleting keyword rule:', err);
      toast.error(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    deleteRule
  };
}

