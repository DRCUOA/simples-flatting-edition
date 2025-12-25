<template>
  <div class="space-y-6 responsive-padding">
    <!-- Page Header -->
    <div>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="responsive-title text-gray-900 dark:text-gray-100">Category Report</h1>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">Profit and Loss report by category with monthly breakdown.</p>
        </div>
        <router-link
          to="/reports"
          class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Reports
        </router-link>
      </div>
    </div>

    <!-- Controls Section -->
    <div class="ui-card p-4">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Start Date
            </label>
            <input 
              type="date" 
              v-model="start" 
              class="ui-input text-sm focus-ring min-h-[44px]"
              aria-label="Report start date"
            />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              End Date
            </label>
            <input 
              type="date" 
              v-model="end" 
              class="ui-input text-sm focus-ring min-h-[44px]"
              aria-label="Report end date"
            />
          </div>
        </div>
        
        <div class="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex gap-2">
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
          </div>
          <button 
            @click="refresh" 
            class="ui-button-primary text-sm focus-ring px-6 py-2.5 min-h-[44px]"
          >
            <svg class="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Report
          </button>
        </div>
      </div>
    </div>

    <!-- Category Report Table -->
    <div class="ui-card p-0 overflow-hidden">
      <div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Category Profit & Loss by Month
        </h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                @click.stop="toggleSort('category_name')" 
                class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Category
                <span v-if="sortBy === 'category_name'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th 
                v-for="month in months" 
                :key="month" 
                @click.stop="toggleSort(`month_${month}`)"
                class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {{ formatMonth(month) }}
                <span v-if="sortBy === `month_${month}`" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th 
                @click.stop="toggleSort('grand_total')"
                class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                Grand Total
                <span v-if="sortBy === 'grand_total'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <!-- Income Section -->
            <tr v-if="incomeCategories.length > 0" class="bg-green-50 dark:bg-green-900/20">
              <td :colspan="months.length + 2" class="px-3 py-2 text-sm font-bold text-green-800 dark:text-green-200 sticky left-0 bg-green-50 dark:bg-green-900/20 z-10">
                INCOME
              </td>
            </tr>
            <CategoryRow 
              v-for="category in sortedIncomeCategories" 
              :key="`income-${category.category_id}`"
              :category="category" 
              :months="months"
              :expanded-ids="expandedIdsSet"
              :children-map="childrenMap"
              :level="0"
              :sort-by="sortBy"
              :sort-dir="sortDir"
              @toggle-expand="toggleExpand"
            />
            
            <!-- Income Section Total -->
            <tr v-if="incomeCategories.length > 0" class="bg-green-100 dark:bg-green-900/30 font-semibold border-t-2 border-green-300 dark:border-green-700">
              <td class="px-3 py-2 text-sm sticky left-0 bg-green-100 dark:bg-green-900/30 z-10">Total Income (Net)</td>
              <td v-for="month in months" :key="month" class="px-3 py-2 text-sm text-right">
                <div :class="getSectionMonthTotal(incomeCategories, month) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(getSectionMonthTotal(incomeCategories, month)) }}
                </div>
              </td>
              <td class="px-3 py-2 text-sm text-right bg-green-200 dark:bg-green-800">
                <div :class="incomeCategories.reduce((sum, cat) => sum + getCategoryWithDescendantsTotal(cat), 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(incomeCategories.reduce((sum, cat) => sum + getCategoryWithDescendantsTotal(cat), 0)) }}
                </div>
              </td>
            </tr>
            
            <!-- Expense Section -->
            <tr v-if="expenseCategories.length > 0" class="bg-red-50 dark:bg-red-900/20">
              <td :colspan="months.length + 2" class="px-3 py-2 text-sm font-bold text-red-800 dark:text-red-200 sticky left-0 bg-red-50 dark:bg-red-900/20 z-10">
                EXPENSES
              </td>
            </tr>
            <CategoryRow 
              v-for="category in sortedExpenseCategories" 
              :key="`expense-${category.category_id}`"
              :category="category" 
              :months="months"
              :expanded-ids="expandedIdsSet"
              :children-map="childrenMap"
              :level="0"
              :sort-by="sortBy"
              :sort-dir="sortDir"
              @toggle-expand="toggleExpand"
            />
            
            <!-- Expense Section Total -->
            <tr v-if="expenseCategories.length > 0" class="bg-red-100 dark:bg-red-900/30 font-semibold border-t-2 border-red-300 dark:border-red-700">
              <td class="px-3 py-2 text-sm sticky left-0 bg-red-100 dark:bg-red-900/30 z-10">Total Expenses (Net)</td>
              <td v-for="month in months" :key="month" class="px-3 py-2 text-sm text-right">
                <div :class="getSectionMonthTotal(expenseCategories, month) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(getSectionMonthTotal(expenseCategories, month)) }}
                </div>
              </td>
              <td class="px-3 py-2 text-sm text-right bg-red-200 dark:bg-red-800">
                <div :class="expenseCategories.reduce((sum, cat) => sum + getCategoryWithDescendantsTotal(cat), 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(expenseCategories.reduce((sum, cat) => sum + getCategoryWithDescendantsTotal(cat), 0)) }}
                </div>
              </td>
            </tr>
            
            <!-- Net Income Row -->
            <tr v-if="incomeCategories.length > 0 || expenseCategories.length > 0" class="bg-blue-50 dark:bg-blue-900/20 font-bold border-t-2 border-blue-300 dark:border-blue-700">
              <td class="px-3 py-2 text-sm sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10">Net Income</td>
              <td v-for="month in months" :key="month" class="px-3 py-2 text-sm text-right">
                <div :class="(getSectionMonthTotal(incomeCategories, month) + getSectionMonthTotal(expenseCategories, month)) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(getSectionMonthTotal(incomeCategories, month) + getSectionMonthTotal(expenseCategories, month)) }}
                </div>
              </td>
              <td class="px-3 py-2 text-sm text-right bg-blue-100 dark:bg-blue-800">
                <div :class="grandTotalNet >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  {{ formatCurrency(grandTotalNet) }}
                </div>
              </td>
            </tr>
            
            <tr v-if="incomeCategories.length === 0 && expenseCategories.length === 0">
              <td :colspan="months.length + 2" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                No data available for the selected date range
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import http from '../lib/http';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../utils/dateUtils';
import CategoryRow from '../components/CategoryReportRow.vue';

const start = ref('');
const end = ref('');
const reportData = ref({ categories: [], transfers: [], months: [] });
const expandedIdsSet = ref(new Set());
const sortBy = ref('category_name');
const sortDir = ref('asc');

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const months = computed(() => reportData.value.months || []);

// Build hierarchical structure from categories
const childrenMap = computed(() => {
  const map = new Map();
  const categories = reportData.value.categories || [];
  
  categories.forEach(cat => {
    const parentId = cat.parent_category_id || null;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId).push(cat);
  });
  
  // Sort children by name
  map.forEach((children) => {
    children.sort((a, b) => a.category_name.localeCompare(b.category_name));
  });
  
  return map;
});

// Get root categories (no parent) grouped by type
const incomeCategories = computed(() => {
  const map = childrenMap.value;
  const roots = map.get(null) || [];
  return roots.filter(cat => cat.root_type === 'income');
});

const expenseCategories = computed(() => {
  const map = childrenMap.value;
  const roots = map.get(null) || [];
  return roots.filter(cat => cat.root_type === 'expense');
});


// Helper to get sort value based on what's actually displayed
// This matches the logic in CategoryReportRow - uses own value if expanded, aggregated if collapsed
const getCategorySortValueForSort = (category, sortKey) => {
  // Access childrenMap and expandedIdsSet to ensure reactivity tracking
  const map = childrenMap.value;
  const expandedIds = expandedIdsSet.value;
  
  if (sortKey === 'category_name') {
    return (category.category_name || '').toLowerCase();
  }
  
  const hasChildren = (map.get(category.category_id) || []).length > 0;
  const isExpanded = expandedIds.has(category.category_id);
  
  // For numeric columns, use displayed value:
  // - If expanded or no children: use own value only
  // - If collapsed and has children: use aggregated value (own + descendants)
  if (sortKey === 'grand_total') {
    const ownTotal = getCategoryTotal(category);
    if (isExpanded || !hasChildren) {
      return ownTotal;
    }
    return getCategoryWithDescendantsTotal(category);
  }
  
  if (sortKey.startsWith('month_')) {
    const month = sortKey.replace('month_', '');
    const ownValue = getCategoryMonthValue(category, month);
    if (isExpanded || !hasChildren) {
      return ownValue;
    }
    return getCategoryWithDescendantsTotal(category, month);
  }
  
  return 0;
};

// Sorted income categories - explicitly track all dependencies
const sortedIncomeCategories = computed(() => {
  // Explicitly access ALL reactive values to ensure tracking
  const currentSortBy = sortBy.value;
  const currentSortDir = sortDir.value;
  const categories = incomeCategories.value;
  const map = childrenMap.value; // Access to ensure tracking
  const expandedIds = expandedIdsSet.value; // Access to ensure tracking
  
  // Create a new array to ensure reactivity
  const sorted = [...categories].sort((a, b) => {
    const aVal = getCategorySortValueForSort(a, currentSortBy);
    const bVal = getCategorySortValueForSort(b, currentSortBy);
    
    if (currentSortBy === 'category_name') {
      const comparison = aVal.localeCompare(bVal);
      return currentSortDir === 'asc' ? comparison : -comparison;
    }
    
    // Numeric comparison
    const diff = aVal - bVal;
    return currentSortDir === 'asc' ? diff : -diff;
  });
  
  return sorted;
});

// Sorted expense categories - explicitly track all dependencies
const sortedExpenseCategories = computed(() => {
  // Explicitly access ALL reactive values to ensure tracking
  const currentSortBy = sortBy.value;
  const currentSortDir = sortDir.value;
  const categories = expenseCategories.value;
  const map = childrenMap.value; // Access to ensure tracking
  const expandedIds = expandedIdsSet.value; // Access to ensure tracking
  
  // Create a new array to ensure reactivity
  const sorted = [...categories].sort((a, b) => {
    const aVal = getCategorySortValueForSort(a, currentSortBy);
    const bVal = getCategorySortValueForSort(b, currentSortBy);
    
    if (currentSortBy === 'category_name') {
      const comparison = aVal.localeCompare(bVal);
      return currentSortDir === 'asc' ? comparison : -comparison;
    }
    
    // Numeric comparison
    const diff = aVal - bVal;
    return currentSortDir === 'asc' ? diff : -diff;
  });
  
  return sorted;
});

// Get month value for a category (net: income - expense)
const getCategoryMonthValue = (category, month) => {
  if (!category.months || !category.months[month]) return 0;
  const income = category.months[month].income || 0;
  const expense = category.months[month].expense || 0;
  return income - expense; // Always return net
};

// Get total for a category (net: income - expense)
const getCategoryTotal = (category) => {
  const income = category.total_income || 0;
  const expense = category.total_expense || 0;
  return income - expense; // Always return net
};

// Recursively get total for a category including all descendants
const getCategoryWithDescendantsTotal = (category, month = null) => {
  let total = 0;
  if (month) {
    total = getCategoryMonthValue(category, month);
  } else {
    total = getCategoryTotal(category);
  }
  
  // Access childrenMap to get children - this ensures reactivity
  const map = childrenMap.value;
  const children = map.get(category.category_id) || [];
  children.forEach(child => {
    // Recursively include all descendants
    total += getCategoryWithDescendantsTotal(child, month);
  });
  
  return total;
};

// Get section total for a month (recursively including all descendants)
const getSectionMonthTotal = (categories, month) => {
  return categories.reduce((sum, category) => {
    return sum + getCategoryWithDescendantsTotal(category, month);
  }, 0);
};

// Calculate grand totals as net (income - expense) across all categories
const grandTotalNet = computed(() => {
  const allCategories = [...incomeCategories.value, ...expenseCategories.value];
  return allCategories.reduce((sum, category) => {
    return sum + getCategoryWithDescendantsTotal(category);
  }, 0);
});

// Keep these for backward compatibility but they should show net now
const grandTotalIncome = computed(() => {
  // Sum all income transactions across all categories
  const allCategories = [...incomeCategories.value, ...expenseCategories.value];
  return allCategories.reduce((sum, category) => {
    const income = category.total_income || 0;
    const children = childrenMap.value.get(category.category_id) || [];
    const childrenIncome = children.reduce((childSum, child) => {
      return childSum + (child.total_income || 0);
    }, 0);
    return sum + income + childrenIncome;
  }, 0);
});

const grandTotalExpense = computed(() => {
  // Sum all expense transactions across all categories
  const allCategories = [...incomeCategories.value, ...expenseCategories.value];
  return allCategories.reduce((sum, category) => {
    const expense = category.total_expense || 0;
    const children = childrenMap.value.get(category.category_id) || [];
    const childrenExpense = children.reduce((childSum, child) => {
      return childSum + (child.total_expense || 0);
    }, 0);
    return sum + expense + childrenExpense;
  }, 0);
});

const toggleExpand = (id) => {
  if (expandedIdsSet.value.has(id)) {
    expandedIdsSet.value.delete(id);
  } else {
    expandedIdsSet.value.add(id);
  }
  // Force reactivity by creating new Set
  expandedIdsSet.value = new Set(expandedIdsSet.value);
};

const expandAll = () => {
  const allIds = reportData.value.categories.map(c => c.category_id);
  expandedIdsSet.value = new Set(allIds);
};

const collapseAll = () => {
  expandedIdsSet.value = new Set();
};

const toggleSort = (key) => {
  if (sortBy.value === key) {
    // Toggle direction
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to ascending
    sortBy.value = key;
    sortDir.value = 'asc';
  }
};

const refresh = async () => {
  const params = {};
  if (start.value) params.start = start.value;
  if (end.value) params.end = end.value;

  const base = '/reports';
  const res = await http.get(`${base}/budget-vs-actual`, { params }).catch((err) => {
    console.error('Category report error:', err);
    return { data: { categories: [], transfers: [], months: [] } };
  });
  
  reportData.value = res?.data || { categories: [], transfers: [], months: [] };
};

onMounted(async () => {
  // Default: this month
  start.value = getFirstDayOfMonth();
  end.value = getLastDayOfMonth();
  await refresh();
});
</script>

