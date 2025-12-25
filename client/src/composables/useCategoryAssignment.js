import { ref, computed } from 'vue';
import { useCategoryStore } from '../stores/category';

export function useCategoryAssignment() {
  const categoryStore = useCategoryStore();
  
  // State
  const categoryAssignments = ref({});
  const showCategoryError = ref(false);
  const categorySearch = ref('');
  
  // Computed
  const filteredCategories = computed(() => {
    let categories = categoryStore.categories;
    
    // Filter by search if provided
    if (categorySearch.value) {
      const search = categorySearch.value.toLowerCase();
      categories = categories.filter(category => 
        category.category_name.toLowerCase().includes(search)
      );
    }
    
    // Sort alphabetically by category name
    return [...categories].sort((a, b) => {
      const nameA = (a.category_name || '').toLowerCase();
      const nameB = (b.category_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });
  
  // Methods
  const assignCategory = (transactionId, categoryId) => {
    categoryAssignments.value[transactionId] = categoryId;
  };
  
  const validateCategoryAssignments = () => {
    showCategoryError.value = true;
    return Object.values(categoryAssignments.value).every(value => value);
  };
  
  const resetCategoryAssignments = () => {
    categoryAssignments.value = {};
    showCategoryError.value = false;
  };
  
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Not selected';
    const category = categoryStore.categories.find(c => c.category_id === categoryId);
    return category ? category.category_name : 'Unknown category';
  };
  
  return {
    // State
    categoryAssignments,
    showCategoryError,
    categorySearch,
    
    // Computed
    filteredCategories,
    
    // Methods
    assignCategory,
    validateCategoryAssignments,
    resetCategoryAssignments,
    getCategoryName
  };
} 