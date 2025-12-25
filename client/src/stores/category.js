import { defineStore } from 'pinia';
import http from '../lib/http';
import { useToast } from 'vue-toastification';

const API_URL = '/categories';
const toast = useToast();

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    loading: false,
    error: null,
    lastFetch: null,
    cacheTimeout: 10 * 60 * 1000 // 10 minutes (categories change rarely)
  }),

  getters: {
    // Get category by ID
    getCategoryById: (state) => (categoryId) => {
      return state.categories.find(c => c.category_id === categoryId);
    },

    // Get parent categories (top-level)
    getParentCategories: (state) => {
      return state.categories.filter(c => !c.parent_category_id);
    },

    // Get child categories for a parent
    getChildCategories: (state) => (parentId) => {
      return state.categories.filter(c => c.parent_category_id === parentId);
    },

    // Get category hierarchy (parents with children)
    getCategoryHierarchy: (state) => {
      const parents = state.categories.filter(c => !c.parent_category_id);
      return parents.map(parent => ({
        ...parent,
        children: state.categories.filter(c => c.parent_category_id === parent.category_id)
      }));
    },

    // Get income categories
    getIncomeCategories: (state) => {
      return state.categories.filter(c => c.category_type === 'income');
    },

    // Get expense categories
    getExpenseCategories: (state) => {
      return state.categories.filter(c => c.category_type === 'expense');
    },

    // Get category name by ID (useful for display)
    getCategoryName: (state) => (categoryId) => {
      const category = state.categories.find(c => c.category_id === categoryId);
      return category ? category.category_name : null;
    },

    // Get category type by ID
    getCategoryType: (state) => (categoryId) => {
      const category = state.categories.find(c => c.category_id === categoryId);
      return category ? category.category_type : null;
    },

    // Check if category is income
    isIncomeCategory: (state) => (categoryId) => {
      const category = state.categories.find(c => c.category_id === categoryId);
      return category ? category.category_type === 'income' : false;
    },

    // Check if category is expense
    isExpenseCategory: (state) => (categoryId) => {
      const category = state.categories.find(c => c.category_id === categoryId);
      return category ? category.category_type === 'expense' : false;
    },

    // Get categories count
    getCategoriesCount: (state) => state.categories.length,

    // Get parent categories count
    getParentCategoriesCount: (state) => {
      return state.categories.filter(c => !c.parent_category_id).length;
    },

    // Get child categories count
    getChildCategoriesCount: (state) => {
      return state.categories.filter(c => c.parent_category_id).length;
    },

    // Check if category has children
    hasChildren: (state) => (categoryId) => {
      return state.categories.some(c => c.parent_category_id === categoryId);
    },

    // Get children count for a category
    getChildrenCount: (state) => (categoryId) => {
      return state.categories.filter(c => c.parent_category_id === categoryId).length;
    },

    // Get categories sorted by name
    getCategoriesByName: (state) => {
      return [...state.categories].sort((a, b) => {
        const nameA = (a.category_name || '').toLowerCase();
        const nameB = (b.category_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    },

    // Get full category path (parent > child)
    getCategoryPath: (state) => (categoryId) => {
      const category = state.categories.find(c => c.category_id === categoryId);
      if (!category) return null;
      
      if (category.parent_category_id) {
        const parent = state.categories.find(c => c.category_id === category.parent_category_id);
        return parent ? `${parent.category_name} > ${category.category_name}` : category.category_name;
      }
      
      return category.category_name;
    },

    // Check if category exists
    categoryExists: (state) => (categoryId) => {
      return state.categories.some(c => c.category_id === categoryId);
    }
  },

  actions: {
    async fetchCategories(forceRefresh = false) {
      // Check cache freshness
      if (!forceRefresh && this.lastFetch && (Date.now() - this.lastFetch) < this.cacheTimeout && this.categories.length > 0) {
        return this.categories;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await http.get(API_URL);
        this.categories = response.data;
        this.lastFetch = Date.now();
      } catch (error) {
        this.error = error.message || 'Failed to fetch categories';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getCategoryById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.get(`${API_URL}/${id}`);
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to fetch category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createCategory(category) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.post(API_URL, category);
        
        // Invalidate cache
        this.lastFetch = null;
        
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to create category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCategory(id, category) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.put(`${API_URL}/${id}`, category);
        
        // Invalidate cache
        this.lastFetch = null;
        
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to update category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteCategory(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.delete(`${API_URL}/${id}`);
        
        // Invalidate cache
        this.lastFetch = null;
        
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to delete category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async bulkCreateCategories(categories) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.post(`${API_URL}/bulk`, categories);
        toast.success(`${response.data.message}`);
        
        // Invalidate cache
        this.lastFetch = null;
        await this.fetchCategories(true); // Force refresh
        
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to create categories';
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Update category display order
    async updateCategoryOrder(categoryOrders) {
      this.loading = true;
      this.error = null;
      try {
        const response = await http.put(`${API_URL}/order`, categoryOrders);
        
        // Invalidate cache
        this.lastFetch = null;
        
        // Refresh categories to get updated order
        await this.fetchCategories(true);
        
        return response.data;
      } catch (error) {
        this.error = error.message || 'Failed to update category order';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Clear all category data (for logout)
    clearAllData() {
      this.categories = [];
      this.loading = false;
      this.error = null;
      this.lastFetch = null;
    }
  }
}); 