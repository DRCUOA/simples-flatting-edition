<template>
  <div class="space-y-6 responsive-padding">
    <!-- Page Header -->
    <div>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="responsive-title text-gray-900 dark:text-gray-100">Reports</h1>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">View monthly summaries, spending by category, and budget performance.</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="exportPDF"
            :disabled="exportingPDF"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ exportingPDF ? 'Generating PDF...' : 'Export PDF Report' }}
          </button>
          <router-link
            to="/reports/categories"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Category Report
          </router-link>
        </div>
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
        
        <div class="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
          <button 
            @click="refresh" 
            class="ui-button-primary text-sm focus-ring px-6 py-2.5 min-h-[44px]"
          >
            <svg class="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Reports
          </button>
        </div>
      </div>
    </div>

    <!-- Budget vs Actual - Actual Income and Expense by Month -->
    <div class="grid grid-cols-1 gap-6">
      <div class="ui-card p-0 overflow-hidden">
        <div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Actual Income and Expense by Month
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">Category</th>
                <th v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {{ formatMonth(month) }}
                </th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600">Grand Total</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <!-- Income Section -->
              <tr v-if="plStructure.income.length > 0" class="bg-green-50 dark:bg-green-900/20">
                <td :colspan="bvaMonths.length + 2" class="px-3 py-2 text-sm font-bold text-green-800 dark:text-green-200 sticky left-0 bg-green-50 dark:bg-green-900/20 z-10">
                  INCOME
                </td>
              </tr>
              <template v-for="root in plStructure.income" :key="root.root_id">
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-2 text-sm font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">
                    {{ root.root_name }}
                  </td>
                  <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                    <div :class="(getRootMonthValue(root, month, 'income') - getRootMonthValue(root, month, 'expense')) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatCurrency(getRootMonthValue(root, month, 'income') - getRootMonthValue(root, month, 'expense')) }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm text-right bg-gray-100 dark:bg-gray-600">
                    <div :class="(root.total_income - (root.total_expense || 0)) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatCurrency((root.total_income || 0) - (root.total_expense || 0)) }}
                    </div>
                  </td>
                </tr>
              </template>
              
              <!-- Income Section Total -->
              <tr v-if="plStructure.income.length > 0" class="bg-green-100 dark:bg-green-900/30 font-semibold border-t-2 border-green-300 dark:border-green-700">
                <td class="px-3 py-2 text-sm sticky left-0 bg-green-100 dark:bg-green-900/30 z-10">Total Income</td>
                <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                  <div class="text-green-700 dark:text-green-300 font-bold">
                    {{ formatCurrency(getSectionMonthTotal(plStructure.income, month, 'income')) }}
                  </div>
                </td>
                <td class="px-3 py-2 text-sm text-right bg-green-200 dark:bg-green-800">
                  <div class="text-green-700 dark:text-green-300 font-bold">
                    {{ formatCurrency(grandTotalIncome) }}
                  </div>
                </td>
              </tr>
              
              <!-- Expense Section -->
              <tr v-if="plStructure.expense.length > 0" class="bg-red-50 dark:bg-red-900/20">
                <td :colspan="bvaMonths.length + 2" class="px-3 py-2 text-sm font-bold text-red-800 dark:text-red-200 sticky left-0 bg-red-50 dark:bg-red-900/20 z-10">
                  EXPENSES
                </td>
              </tr>
              <template v-for="root in plStructure.expense" :key="root.root_id">
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-2 text-sm font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">
                    {{ root.root_name }}
                  </td>
                  <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                    <div :class="(getRootMonthValue(root, month, 'income') - getRootMonthValue(root, month, 'expense')) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatCurrency(getRootMonthValue(root, month, 'income') - getRootMonthValue(root, month, 'expense')) }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm text-right bg-gray-100 dark:bg-gray-600">
                    <div :class="((root.total_income || 0) - root.total_expense) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatCurrency((root.total_income || 0) - (root.total_expense || 0)) }}
                    </div>
                  </td>
                </tr>
              </template>
              
              <!-- Expense Section Total -->
              <tr v-if="plStructure.expense.length > 0" class="bg-red-100 dark:bg-red-900/30 font-semibold border-t-2 border-red-300 dark:border-red-700">
                <td class="px-3 py-2 text-sm sticky left-0 bg-red-100 dark:bg-red-900/30 z-10">Total Expenses</td>
                <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                  <div class="text-red-700 dark:text-red-300 font-bold">
                    {{ formatCurrency(getSectionMonthTotal(plStructure.expense, month, 'expense')) }}
                  </div>
                </td>
                <td class="px-3 py-2 text-sm text-right bg-red-200 dark:bg-red-800">
                  <div class="text-red-700 dark:text-red-300 font-bold">
                    {{ formatCurrency(grandTotalExpense) }}
                  </div>
                </td>
              </tr>
              
              <!-- Net Income Row -->
              <tr v-if="plStructure.income.length > 0 || plStructure.expense.length > 0" class="bg-blue-50 dark:bg-blue-900/20 font-bold border-t-2 border-blue-300 dark:border-blue-700">
                <td class="px-3 py-2 text-sm sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10">Net Income</td>
                <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                  <div :class="getAllRootsMonthTotal(month, 'income') - getAllRootsMonthTotal(month, 'expense') >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                    {{ formatCurrency(getAllRootsMonthTotal(month, 'income') - getAllRootsMonthTotal(month, 'expense')) }}
                  </div>
                </td>
                <td class="px-3 py-2 text-sm text-right bg-blue-100 dark:bg-blue-800">
                  <div :class="grandTotalIncome - grandTotalExpense >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                    {{ formatCurrency(grandTotalIncome - grandTotalExpense) }}
                  </div>
                </td>
              </tr>
              
              <!-- Transfers Section -->
              <template v-if="transferStructure.length > 0">
                <tr class="border-t-2 border-gray-300 dark:border-gray-600">
                  <td :colspan="bvaMonths.length + 2" class="px-3 py-2"></td>
                </tr>
                <tr class="bg-gray-50 dark:bg-gray-700/30">
                  <td :colspan="bvaMonths.length + 2" class="px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-700/30 z-10">
                    TRANSFERS
                  </td>
                </tr>
                <template v-for="transferRoot in transferStructure" :key="transferRoot.root_id">
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-3 py-2 text-sm font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">
                      {{ transferRoot.root_name }}
                    </td>
                    <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                      <div class="text-gray-600 dark:text-gray-400 font-medium">
                        {{ formatCurrency(getTransferRootMonthValue(transferRoot, month)) }}
                      </div>
                    </td>
                    <td class="px-3 py-2 text-sm text-right bg-gray-100 dark:bg-gray-600">
                      <div class="text-gray-600 dark:text-gray-400 font-medium">
                        {{ formatCurrency(transferRoot.total_income - transferRoot.total_expense) }}
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="transferStructure.length > 0" class="bg-gray-100 dark:bg-gray-700/50 font-semibold border-t border-gray-300 dark:border-gray-600">
                  <td class="px-3 py-2 text-sm sticky left-0 bg-gray-100 dark:bg-gray-700/50 z-10">Total Transfers</td>
                  <td v-for="month in bvaMonths" :key="month" class="px-3 py-2 text-sm text-right">
                    <div class="text-gray-700 dark:text-gray-300 font-bold">
                      {{ formatCurrency(getTransferSectionMonthTotal(month)) }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm text-right bg-gray-200 dark:bg-gray-600">
                    <div class="text-gray-700 dark:text-gray-300 font-bold">
                      {{ formatCurrency(grandTotalTransfers) }}
                    </div>
                  </td>
                </tr>
              </template>
              
              <tr v-if="plStructure.income.length === 0 && plStructure.expense.length === 0 && transferStructure.length === 0">
                <td :colspan="bvaMonths.length + 2" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Reports" 
      :components="[]"
      :script-blocks="[
        { name: 'http', type: 'api', functions: ['get', 'post'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import http from '../lib/http';
import ViewInfo from '../components/ViewInfo.vue';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../utils/dateUtils';
import { exportPDFReport } from '../utils/pdfExport';
import { useTransactionStore } from '../stores/transaction';
import { useCategoryStore } from '../stores/category';

const start = ref('');
const end = ref('');
const exportingPDF = ref(false);

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();

const bvaData = ref({ categories: [], transfers: [], months: [] });

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const bvaMonths = computed(() => bvaData.value.months || []);

// Build P&L structure: Income section, then Expense section
// Group by root parent, organized by root_type
// Only show top-level parents (roots) with their totals
const plStructure = computed(() => {
  const categories = bvaData.value.categories || [];
  const rootMap = new Map(); // Map of root_id -> root category
  
  // First pass: identify root parents and initialize them
  categories.forEach(cat => {
    if (!cat.root_id || !cat.root_name || !cat.root_type) return; // Skip invalid categories
    
    if (cat.level === 0 || !cat.parent_category_id) {
      if (!rootMap.has(cat.root_id)) {
        rootMap.set(cat.root_id, {
          root_id: cat.root_id,
          root_name: cat.root_name,
          root_type: cat.root_type,
          total_income: 0,
          total_expense: 0,
          months: {}
        });
      }
    }
  });
  
  // Second pass: aggregate all category totals into their root parents
  categories.forEach(cat => {
    if (!cat.root_id || !cat.root_name || !cat.root_type) return;
    
    const root = rootMap.get(cat.root_id);
    if (!root) return;
    
    // Add this category's totals to the root
    root.total_income += cat.total_income || 0;
    root.total_expense += cat.total_expense || 0;
    
    // Aggregate month values
    if (cat.months) {
      Object.keys(cat.months).forEach(month => {
        if (!root.months[month]) {
          root.months[month] = { income: 0, expense: 0 };
        }
        root.months[month].income += cat.months[month].income || 0;
        root.months[month].expense += cat.months[month].expense || 0;
      });
    }
  });
  
  // Separate into income and expense sections
  const incomeRoots = Array.from(rootMap.values())
    .filter(root => root.root_type === 'income')
    .sort((a, b) => a.root_name.localeCompare(b.root_name));
  
  const expenseRoots = Array.from(rootMap.values())
    .filter(root => root.root_type === 'expense')
    .sort((a, b) => a.root_name.localeCompare(b.root_name));
  
  return {
    income: incomeRoots,
    expense: expenseRoots
  };
});

// Get month value for a root category
const getRootMonthValue = (root, month, type) => {
  if (!root.months || !root.months[month]) return 0;
  return root.months[month][type] || 0;
};

// Get category month value (for transfers)
const getCategoryMonthValue = (category, month, type) => {
  if (!category.months || !category.months[month]) return 0;
  return category.months[month][type] || 0;
};

const getSectionMonthTotal = (section, month, type) => {
  return section.reduce((sum, root) => {
    return sum + getRootMonthValue(root, month, type);
  }, 0);
};

// Get month totals across ALL roots for a specific type (income or expense)
// This correctly sums all income transactions OR all expense transactions across all roots
const getAllRootsMonthTotal = (month, type) => {
  const incomeSectionTotal = getSectionMonthTotal(plStructure.value.income, month, type);
  const expenseSectionTotal = getSectionMonthTotal(plStructure.value.expense, month, type);
  // Sum income from both income and expense roots (or expense from both)
  // This gives total income OR total expense across all categories
  return incomeSectionTotal + expenseSectionTotal;
};

// Calculate grand totals correctly: sum ALL income and expense transactions across all roots
// Not just from income/expense root classifications, but actual transaction types
const grandTotalIncome = computed(() => {
  // Sum all income transactions from income roots
  const incomeFromIncomeRoots = plStructure.value.income.reduce((sum, root) => sum + (root.total_income || 0), 0);
  // Sum all income transactions from expense roots (they exist!)
  const incomeFromExpenseRoots = plStructure.value.expense.reduce((sum, root) => sum + (root.total_income || 0), 0);
  return incomeFromIncomeRoots + incomeFromExpenseRoots;
});

const grandTotalExpense = computed(() => {
  // Sum all expense transactions from expense roots
  const expenseFromExpenseRoots = plStructure.value.expense.reduce((sum, root) => sum + (root.total_expense || 0), 0);
  // Sum all expense transactions from income roots (they exist!)
  const expenseFromIncomeRoots = plStructure.value.income.reduce((sum, root) => sum + (root.total_expense || 0), 0);
  return expenseFromExpenseRoots + expenseFromIncomeRoots;
});

// Build transfer structure for display
const transferStructure = computed(() => {
  const transfers = bvaData.value.transfers || [];
  return transfers.map(transferRoot => {
    // Calculate month values from children (net: income - expense)
    const monthValues = {};
    bvaMonths.value.forEach(month => {
      let netTotal = 0;
      (transferRoot.children || []).forEach(child => {
        if (child.months && child.months[month]) {
          const income = child.months[month].income || 0;
          const expense = child.months[month].expense || 0;
          netTotal += income - expense;
        }
      });
      monthValues[month] = netTotal;
    });
    return {
      ...transferRoot,
      monthValues
    };
  });
});

const getTransferRootMonthValue = (transferRoot, month) => {
  if (!transferRoot.monthValues) return 0;
  return transferRoot.monthValues[month] || 0;
};

const getTransferSectionMonthTotal = (month) => {
  return transferStructure.value.reduce((sum, transferRoot) => {
    return sum + getTransferRootMonthValue(transferRoot, month);
  }, 0);
};

const grandTotalTransfers = computed(() => {
  return transferStructure.value.reduce((sum, transferRoot) => {
    return sum + (transferRoot.total_income - transferRoot.total_expense);
  }, 0);
});

const refresh = async () => {
  const params = {};
  if (start.value) params.start = start.value;
  if (end.value) params.end = end.value;

  const base = '/reports';
  const bRes = await http.get(`${base}/budget-vs-actual`, { params }).catch((err) => {
    console.error('Budget vs actual error:', err);
    return { data: { categories: [], transfers: [], months: [] } };
  });
  
  bvaData.value = bRes?.data || { categories: [], transfers: [], months: [] };
};

const exportPDF = async () => {
  if (!start.value || !end.value) {
    alert('Please select a date range before exporting.');
    return;
  }

  exportingPDF.value = true;
  try {
    await exportPDFReport({
      plStructure: plStructure.value,
      bvaCategories: bvaData.value.categories || [],
      grandTotalIncome: grandTotalIncome.value,
      grandTotalExpense: grandTotalExpense.value,
      startDate: start.value,
      endDate: end.value,
      months: bvaMonths.value,
      transactionStore,
      categoryStore
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. Please try again.');
  } finally {
    exportingPDF.value = false;
  }
};

onMounted(async () => {
  // Default: this month - use date utils
  start.value = getFirstDayOfMonth();
  end.value = getLastDayOfMonth();
  await refresh();
});
</script>


