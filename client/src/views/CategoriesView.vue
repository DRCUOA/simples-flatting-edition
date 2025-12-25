<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your transaction categories
        </p>
      </div>

      <!-- Enhanced Action Bar -->
      <div class="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center space-x-2">
            <button
              @click="openCreateModal"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
            >
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </button>
            
            <button
              @click="expandAll"
              class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
              Expand All
            </button>
            
            <button
              @click="collapseAll"
              class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
              Collapse All
            </button>
            
            <router-link
              to="/keyword-rules"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Keyword Rules
            </router-link>
          </div>
        </div>
      </div>

      <!-- Categories Tree with Flight Strip Styling -->
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <!-- Empty state -->
          <div v-if="rootNodes.length === 0" class="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <p>No categories found. Create your first category to get started.</p>
          </div>
          
          <!-- Root level nodes (draggable) -->
          <draggable
            v-if="rootNodes.length > 0"
            :list="rootNodes"
            :item-key="(item) => item.category_id"
            :group="{ name: 'categories', pull: false, put: false }"
            :animation="200"
            handle=".drag-handle"
            @end="() => onDragEnd(null)"
            class="divide-y divide-gray-200 dark:divide-gray-700"
          >
            <template #item="{ element: node }">
              <CategoryTreeNode
                :key="node.category_id"
                :node="node"
                :expanded-ids="expandedIdsSet"
                :children-map="childrenByParent"
                :parent-id="null"
                :level="0"
                @toggle-expand="toggleExpand"
                @edit="openEditModal"
                @delete="confirmDelete"
                @drag-end="onDragEnd"
              />
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <!-- Create/Edit Category Modal -->
    <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {{ isEditing ? 'Edit Category' : 'Create Category' }}
                </h3>
                <div class="mt-4 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      v-model="categoryForm.category_name"
                      type="text"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Category</label>
                    <select
                      v-model="categoryForm.parent_category_id"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">None</option>
                      <option v-for="cat in availableParentCategories" :key="cat.category_id" :value="cat.category_id">
                        {{ cat.category_name }}
                      </option>
                    </select>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveCategory"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {{ isEditing ? 'Update' : 'Create' }}
            </button>
            <button
              @click="closeModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Delete Category
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete the category "{{ categoryToDelete?.category_name }}"? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteCategory"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
              @click="showDeleteModal = false"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Categories" 
      :components="[]"
      :script-blocks="[
        { name: 'useCategoryStore', type: 'store', functions: ['fetchCategories', 'createCategory', 'updateCategory', 'deleteCategory', 'updateCategoryOrder'] },
        { name: 'useUiStore', type: 'store', functions: [] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect, nextTick } from 'vue';
import { useCategoryStore } from '../stores/category';
import { useUiStore } from '../stores/ui';
import ViewInfo from '../components/ViewInfo.vue';
import CategoryTreeNode from '../components/CategoryTreeNode.vue';
import { useToast } from 'vue-toastification';
import draggable from 'vuedraggable';

const toast = useToast();
const categoryStore = useCategoryStore();
const uiStore = useUiStore();
const categories = ref([]);
const rootNodes = ref([]);

const expandedIdsSet = ref(new Set());
const showModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const categoryToDelete = ref(null);

const categoryForm = ref({
  category_id: '',
  category_name: '',
  parent_category_id: '',
  user_id: 'default-user'
});

// Available parent categories (excluding the current category when editing)
const availableParentCategories = computed(() => {
  if (!isEditing.value) {
    return categories.value;
  }
  return categories.value.filter(cat => cat.category_id !== categoryForm.value.category_id);
});

onMounted(async () => {
  await fetchCategories();
  updateRootNodes();
  
  // Expand all categories to the lowest level by default
  // Use nextTick to ensure DOM is ready and reactivity is set up
  await nextTick();
  expandAll();
});

const fetchCategories = async () => {
  try {
    await categoryStore.fetchCategories();
    categories.value = categoryStore.categories;
    updateRootNodes();
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

// Build parent -> children map with proper reactivity
const childrenByParent = computed(() => {
  const map = new Map();
  for (const c of categories.value) {
    const key = c.parent_category_id || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  // Sort children by display_order, then by name
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => {
      const orderA = a.display_order !== null && a.display_order !== undefined ? a.display_order : 999999;
      const orderB = b.display_order !== null && b.display_order !== undefined ? b.display_order : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.category_name).localeCompare(String(b.category_name));
    });
  }
  return map;
});

// Update root nodes when categories change
const updateRootNodes = () => {
  const rootChildren = childrenByParent.value.get(null) || [];
  rootNodes.value = rootChildren.map(node => {
    const nodeChildren = childrenByParent.value.get(node.category_id) || [];
    return {
      ...node,
      level: 0,
      childrenCount: nodeChildren.length
    };
  });
};

// Watch for changes and update root nodes automatically
watchEffect(() => {
  // Access categories to track it as a dependency
  categories.value;
  updateRootNodes();
});

// Handle drag end - update display_order
const onDragEnd = async (parentId) => {
  // Get the current list from the appropriate source
  const children = parentId === null 
    ? rootNodes.value 
    : (childrenByParent.value.get(parentId) || []);
  
  if (children.length === 0) return;
  
  // Update display_order for all children in this group
  const categoryOrders = children
    .filter(cat => cat && cat.category_id) // Ensure valid category objects
    .map((cat, index) => ({
      category_id: String(cat.category_id), // Ensure it's a string (UUID)
      display_order: Number(index + 1) // Ensure it's a number
    }));
  
  if (categoryOrders.length === 0) {
    console.warn('No valid categories to update order for');
    return;
  }
  
  try {
    await categoryStore.updateCategoryOrder(categoryOrders);
    toast.success('Category order updated');
    
    // Update local categories with new display_order
    for (const order of categoryOrders) {
      const cat = categories.value.find(c => c.category_id === order.category_id);
      if (cat) {
        cat.display_order = order.display_order;
      }
    }
    
    // Refresh root nodes if we dragged root level
    if (parentId === null) {
      updateRootNodes();
    }
  } catch (error) {
    console.error('Error updating category order:', error);
    toast.error('Failed to update category order');
    // Refresh to restore original order
    await fetchCategories();
  }
};

const expandAll = () => {
  const allIds = categories.value.map(c => c.category_id);
  // Create new Set to force reactivity (similar to toggleExpand)
  expandedIdsSet.value = new Set(allIds);
};

const collapseAll = () => {
  expandedIdsSet.value = new Set();
};

const openCreateModal = () => {
  isEditing.value = false;
  categoryForm.value = {
    category_id: '',
    category_name: '',
    parent_category_id: '',
    user_id: 'default-user'
  };
  showModal.value = true;
};

const openEditModal = (category) => {
  isEditing.value = true;
  categoryForm.value = {
    category_id: category.category_id,
    category_name: category.category_name,
    parent_category_id: category.parent_category_id || '',
    user_id: category.user_id
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveCategory = async () => {
  try {
    if (isEditing.value) {
      await categoryStore.updateCategory(categoryForm.value.category_id, categoryForm.value);
    } else {
      await categoryStore.createCategory(categoryForm.value);
    }
    await fetchCategories();
    closeModal();
  } catch (error) {
    console.error('Error saving category:', error);
  }
};

const confirmDelete = (category) => {
  categoryToDelete.value = category;
  showDeleteModal.value = true;
};

const deleteCategory = async () => {
  try {
    await categoryStore.deleteCategory(categoryToDelete.value.category_id);
    await fetchCategories();
    showDeleteModal.value = false;
  } catch (error) {
    console.error('Error deleting category:', error);
  }
};

// Simple expand/collapse
const toggleExpand = (id) => {
  if (expandedIdsSet.value.has(id)) {
    expandedIdsSet.value.delete(id);
  } else {
    expandedIdsSet.value.add(id);
  }
  // Force reactivity by creating new Set
  expandedIdsSet.value = new Set(expandedIdsSet.value);
};

</script>

<style scoped>
button {
  transition: color 0.15s ease-in-out;
}

button:focus-visible {
  outline: 2px solid theme('colors.indigo.500');
  outline-offset: 2px;
}
</style>
