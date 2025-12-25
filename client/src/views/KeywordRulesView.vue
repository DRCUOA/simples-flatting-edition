<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Keyword Rules</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create rules to automatically assign categories based on transaction descriptions
            </p>
          </div>
          <button
            @click="openCreateModal"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Keyword Rule
          </button>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="mx-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700 dark:text-blue-300">
              <strong>How it works:</strong> When a transaction description contains your keyword, 
              the system will automatically suggest the assigned category with high confidence. 
              Keywords are matched case-insensitively and can appear anywhere in the description.
            </p>
          </div>
        </div>
      </div>

      <!-- Rules Table -->
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg mx-4">
        <!-- Loading State -->
        <div v-if="loading && rules.length === 0" class="px-6 py-12 text-center">
          <svg class="mx-auto h-8 w-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading keyword rules...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading && rules.length === 0" class="px-6 py-12 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No keyword rules</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new keyword rule to automatically categorize transactions.
          </p>
          <div class="mt-6">
            <button
              @click="openCreateModal"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Keyword Rule
            </button>
          </div>
        </div>

        <!-- Rules List -->
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="rule in rules"
            :key="rule.id"
            class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <svg class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{{ rule.keyword }}</span>
                      </p>
                      <span class="text-gray-400 dark:text-gray-500">→</span>
                      <p class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {{ rule.category_name || 'Unknown Category' }}
                      </p>
                    </div>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Created {{ formatDate(rule.created_at) }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2 ml-4">
                <button
                  @click="openEditModal(rule)"
                  class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  @click="confirmDelete(rule)"
                  class="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75" @click="closeModal"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {{ isEditing ? 'Edit Keyword Rule' : 'Create Keyword Rule' }}
                </h3>
                <div class="mt-4 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Keyword
                    </label>
                    <input
                      v-model="ruleForm.keyword"
                      type="text"
                      placeholder="e.g., 06-0273-0680494"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This keyword will be matched case-insensitively in transaction descriptions
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <select
                      v-model="ruleForm.category_id"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select a category</option>
                      <option v-for="category in categories" :key="category.category_id" :value="category.category_id">
                        {{ category.category_name }}
                      </option>
                    </select>
                  </div>
                  <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveRule"
              :disabled="!ruleForm.keyword || !ruleForm.category_id || loading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
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
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75" @click="showDeleteModal = false"></div>
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
                  Delete Keyword Rule
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete the rule for keyword 
                    <span class="font-mono font-medium">"{{ ruleToDelete?.keyword }}"</span>? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteRule"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useKeywordRules } from '../composables/useKeywordRules';
import { useCategoryStore } from '../stores/category';
import { formatTimestampLocaleDate } from '../utils/dateUtils';

const { rules, loading, error, fetchRules, createRule, updateRule, deleteRule: deleteRuleAPI } = useKeywordRules();
const categoryStore = useCategoryStore();

const showModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const ruleToDelete = ref(null);

const ruleForm = ref({
  id: null,
  keyword: '',
  category_id: ''
});

const categories = computed(() => categoryStore.categories || []);

onMounted(async () => {
  await Promise.all([
    fetchRules(),
    categoryStore.fetchCategories()
  ]);
});

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return formatTimestampLocaleDate(dateString);
};

const openCreateModal = () => {
  isEditing.value = false;
  ruleForm.value = {
    id: null,
    keyword: '',
    category_id: ''
  };
  error.value = null;
  showModal.value = true;
};

const openEditModal = (rule) => {
  isEditing.value = true;
  ruleForm.value = {
    id: rule.id,
    keyword: rule.keyword,
    category_id: rule.category_id
  };
  error.value = null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  ruleForm.value = {
    id: null,
    keyword: '',
    category_id: ''
  };
  error.value = null;
};

const saveRule = async () => {
  try {
    if (isEditing.value) {
      await updateRule(ruleForm.value.id, {
        keyword: ruleForm.value.keyword,
        category_id: ruleForm.value.category_id
      });
    } else {
      await createRule({
        keyword: ruleForm.value.keyword,
        category_id: ruleForm.value.category_id
      });
    }
    closeModal();
  } catch (err) {
    // Error is already handled in the composable
    console.error('Error saving rule:', err);
  }
};

const confirmDelete = (rule) => {
  ruleToDelete.value = rule;
  showDeleteModal.value = true;
};

const deleteRule = async () => {
  try {
    await deleteRuleAPI(ruleToDelete.value.id);
    showDeleteModal.value = false;
    ruleToDelete.value = null;
  } catch (err) {
    // Error is already handled in the composable
    console.error('Error deleting rule:', err);
  }
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

